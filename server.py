from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import logging
import re
import base64
import cv2
import numpy as np
from deepface import DeepFace

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message', '').strip()
    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    try:
        # Generate explanation
        explanation = generate_explanation(user_message)
        
        # Generate MCQs based on the explanation
        mcq_questions = generate_mcqs(explanation)
        
        return jsonify({
            "response": explanation,
            "mcq_questions": mcq_questions
        })

    except Exception as e:
        logging.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/analyze_emotion', methods=['POST'])
def analyze_emotion():
    try:
        if 'image' not in request.json:
            return jsonify({"error": "No image provided"}), 400
            
        image_data = request.json['image']
        if not image_data.startswith('data:image/'):
            return jsonify({"error": "Invalid image format"}), 400

        # Process image
        header, encoded = image_data.split(",", 1)
        binary_data = base64.b64decode(encoded)
        image_array = np.frombuffer(binary_data, dtype=np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        # Analyze emotion
        results = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)
        if isinstance(results, list):
            results = results[0]
            
        return jsonify({
            "dominant_emotion": results.get('dominant_emotion', 'neutral'),
            "emotions": results.get('emotion', {})
        })

    except Exception as e:
        logging.error(f"Error in emotion analysis: {str(e)}")
        return jsonify({"error": "Failed to analyze emotion"}), 500

def generate_explanation(prompt):
    """Generate explanation using Ollama"""
    try:
        process = subprocess.Popen(
            ["ollama", "run", "deepseek-coder:6.7b"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8'
        )

        formatted_prompt = f"""
        Provide a clear explanation for the following Python concept/question:
        {prompt}

        Guidelines:
        1. Use simple language
        2. Include code examples in triple backticks with language specified
        3. Break complex concepts into steps
        4. Keep it concise (3-5 sentences max)
        """

        stdout, stderr = process.communicate(formatted_prompt)
        
        if process.returncode != 0:
            raise Exception(f"Ollama error: {stderr}")

        return clean_response(stdout.strip())
        
    except Exception as e:
        logging.error(f"Explanation generation failed: {str(e)}")
        return f"I couldn't generate an explanation. Please try asking differently."

def generate_mcqs(content):
    """Generate multiple choice questions"""
    try:
        process = subprocess.Popen(
            ["ollama", "run", "deepseek-coder:6.7b"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8'
        )

        prompt = f"""
        Based on this content:
        {content[:1000]}

        Generate exactly 2 multiple-choice questions about Python programming following this STRICT format:

        Q: [Question text]
        A: [Option A]
        B: [Option B]
        C: [Option C]
        D: [Option D]
        CORRECT: [A/B/C/D]
        HINT: [Brief hint]

        Rules:
        1. Each question must test conceptual understanding
        2. Options should be plausible but only one correct
        3. Questions should be based on the provided content
        4. Format exactly as shown above
        """

        stdout, stderr = process.communicate(prompt)
        
        if process.returncode != 0:
            raise Exception(f"MCQ generation error: {stderr}")

        return parse_mcqs(stdout.strip())
        
    except Exception as e:
        logging.error(f"MCQ generation failed: {str(e)}")
        return generate_fallback_mcqs(content)

def parse_mcqs(raw_text):
    """Parse generated MCQs into structured format"""
    questions = []
    current = {}
    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
    
    for line in lines:
        if line.startswith('Q:'):
            if current:
                validate_and_add_question(current, questions)
                current = {}
            current['question'] = line[2:].strip()
            current['options'] = {}
            current['topic'] = detect_topic(line[2:])
        elif line.startswith(('A:', 'B:', 'C:', 'D:')):
            key = line[0]
            current['options'][key] = line[2:].strip()
        elif line.startswith('CORRECT:'):
            current['correct'] = line.split(':')[1].strip().upper()[0]
        elif line.startswith('HINT:'):
            current['hint'] = line.split(':', 1)[1].strip()
    
    if current:
        validate_and_add_question(current, questions)
    
    return questions[:2]  # Return max 2 questions

def validate_and_add_question(q, questions):
    """Validate question structure before adding"""
    required = ['question', 'options', 'correct', 'hint']
    if all(k in q for k in required) and len(q['options']) == 4:
        questions.append({
            'question': q['question'],
            'options': q['options'],
            'correct': q['correct'],
            'hint': q['hint'],
            'topic': q.get('topic', 'general')
        })

def generate_fallback_mcqs(content):
    """Fallback MCQ generation"""
    topic = detect_topic(content)
    return [{
        'question': f"What is the main concept being explained?",
        'options': {
            'A': 'Syntax rules',
            'B': 'Core functionality',
            'C': 'Performance optimization',
            'D': 'Error handling'
        },
        'correct': 'B',
        'hint': 'Focus on the primary purpose explained',
        'topic': topic
    }]

def detect_topic(text):
    """Detect Python topic from text"""
    topics = {
        'variables': ['variable', 'assign', '='],
        'functions': ['function', 'def', 'return', 'parameter'],
        'loops': ['loop', 'for', 'while', 'iterate'],
        'classes': ['class', 'object', 'method', 'self'],
        'datatypes': ['list', 'dict', 'tuple', 'set', 'str', 'int'],
        'conditionals': ['if', 'else', 'elif', 'conditional']
    }
    
    text_lower = text.lower()
    for topic, keywords in topics.items():
        if any(kw in text_lower for kw in keywords):
            return topic
    return 'general'

def clean_response(text):
    """Clean up generated response"""
    # Ensure proper code blocks
    text = re.sub(r'```(\w*)', r'\n```\1', text)
    text = re.sub(r'```', r'```\n', text)
    
    # Remove any incomplete code blocks
    if text.count('```') % 2 != 0:
        text = text.rsplit('```', 1)[0]
    
    return text.strip()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)