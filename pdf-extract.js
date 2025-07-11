document.addEventListener('DOMContentLoaded', function () {
    // Check if pdf.js is loaded
    if (!window.pdfjsLib) {
        alert("pdf.js library not loaded! Please check your script includes.");
        return;
    }

    const pdfInput = document.getElementById('pdfInput');
    const extractBtn = document.getElementById('extractPdfBtn');

    if (!pdfInput || !extractBtn) {
        console.error("PDF extraction elements not found in DOM.");
        return;
    }

    extractBtn.addEventListener('click', async function () {
        const file = pdfInput.files[0];
        if (!file) {
            // Optionally, you can use addMessage here too
            alert("Please select a PDF file first.");
            return;
        }

        // Show a loading message in chat
        if (typeof addMessage === "function") {
            addMessage("Extracting key points from PDF... Please wait.", false);
        }

        try {
            const arrayBuffer = await file.arrayBuffer();

            if (window.pdfjsLib.GlobalWorkerOptions) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }

            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const txt = await page.getTextContent();
                fullText += txt.items.map(item => item.str).join(' ') + '\n';
            }

            // Extract key points (simple heuristic)
            const sentences = fullText
                .split(/[\.\n]/)
                .map(s => s.trim())
                .filter(s => s.length > 40);
            const keyPoints = sentences.slice(0, 10);

            if (keyPoints.length === 0) {
                if (typeof addMessage === "function") {
                    addMessage("No key points detected in this PDF. Try another file.", false);
                }
                return;
            }

            // Format key points as a message
            const message = `<strong>Key Points extracted from PDF:</strong><ul>${keyPoints.map(pt => `<li>${pt}</li>`).join('')}</ul>`;

            // Display in chat area as a bot message
            if (typeof addMessage === "function") {
                addMessage(message, false); // false = bot message
            } else {
                alert("Key Points:\n" + keyPoints.join('\n'));
            }
        } catch (err) {
            if (typeof addMessage === "function") {
                addMessage("Failed to extract PDF. Please try another file.", false);
            } else {
                alert("Failed to extract PDF.");
            }
            console.error(err);
        }
    });
});



document.addEventListener('DOMContentLoaded', function () {
    if (!window.pdfjsLib) {
        alert("pdf.js library not loaded! Please check your script includes.");
        return;
    }

    const pdfInput = document.getElementById('pdfInput');
    const extractBtn = document.getElementById('extractPdfBtn');

    if (!pdfInput || !extractBtn) {
        console.error("PDF extraction elements not found in DOM.");
        return;
    }

    extractBtn.addEventListener('click', async function () {
        const file = pdfInput.files[0];
        if (!file) {
            if (typeof addMessage === "function") {
                addMessage("Please select a PDF file first.", false);
            }
            return;
        }

        if (typeof addMessage === "function") {
            addMessage("Extracting and summarizing key points from PDF... Please wait.", false);
        }

        try {
            const arrayBuffer = await file.arrayBuffer();

            if (window.pdfjsLib.GlobalWorkerOptions) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }

            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const txt = await page.getTextContent();
                fullText += txt.items.map(item => item.str).join(' ') + ' ';
            }

            // Simple extractive summarization
            const summaryPoints = summarizeText(fullText, 5);

            if (summaryPoints.length === 0) {
                if (typeof addMessage === "function") {
                    addMessage("Could not generate summary from this PDF. Try another file.", false);
                }
                return;
            }

            const message = `<strong>Summary - Top ${summaryPoints.length} Key Points:</strong><ul>${summaryPoints.map(pt => `<li>${pt}</li>`).join('')}</ul>`;

            if (typeof addMessage === "function") {
                addMessage(message, false);
            }
        } catch (err) {
            if (typeof addMessage === "function") {
                addMessage("Failed to process PDF. Please try another file.", false);
            }
            console.error(err);
        }
    });

    // Simple extractive summarization function
    function summarizeText(text, maxSentences = 5) {
        // Split text into sentences
        const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];

        // Build word frequency map (excluding common stopwords)
        const stopwords = new Set([
            "the", "is", "in", "and", "to", "a", "of", "that", "it", "on", "for", "with", "as", "was", "but", "be", "by", "are", "this", "which", "or", "an", "at", "from"
        ]);

        const wordFreq = {};
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        words.forEach(word => {
            if (!stopwords.has(word)) {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        });

        // Score each sentence by sum of word frequencies
        const sentenceScores = sentences.map(sentence => {
            const sentenceWords = sentence.toLowerCase().match(/\b\w+\b/g) || [];
            let score = 0;
            sentenceWords.forEach(word => {
                if (wordFreq[word]) score += wordFreq[word];
            });
            return { sentence: sentence.trim(), score };
        });

        // Sort sentences by score descending
        sentenceScores.sort((a, b) => b.score - a.score);

        // Return top maxSentences sentences
        return sentenceScores.slice(0, maxSentences).map(s => s.sentence);
    }
});
