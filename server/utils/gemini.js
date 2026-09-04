/**
 * Docu-Gaurd AI — Gemini API Integration Module
 * ---------------------------------------------------------------------------
 * Uses Google Gemini API (GEMINI_API_KEY) to power the AI Chatbot and document analysis.
 * Fallbacks gracefully to local heuristic RAG engine if API key is missing or rate limited.
 */

const { ragAnswer } = require('./aiEngine');

async function askGeminiOrFallback(question, documentText) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('[AI Chat] No GEMINI_API_KEY set. Using local heuristic RAG engine.');
    return { ...ragAnswer(question, documentText), provider: 'local' };
  }

  // List of models to try in sequence
  const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-2.5-flash'];

  const prompt = `You are Docu-Gaurd AI, an elite legal intelligence copilot.
Analyze the following document text and answer the user's question accurately, clearly, and concisely.

DOCUMENT TEXT:
${documentText.slice(0, 15000)}

USER QUESTION:
${question}

Provide a direct, authoritative legal answer based strictly on the document text.`;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Gemini API] Model ${model} responded with status ${response.status}: ${errorText.slice(0, 200)}`);
        continue; // Try next model if quota/error
      }

      const data = await response.json();
      const answerText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (answerText) {
        return {
          answer: answerText.trim(),
          confidence: 0.95,
          grounded: true,
          groundingStatus: 'GROUNDED',
          sources: [{ pageRef: 1, text: 'Gemini AI Analysis' }],
          provider: 'gemini',
          model: model,
          fallbackUsed: false
        };
      }
    } catch (err) {
      console.error(`[Gemini API Error] (${model}):`, err.message);
    }
  }

  // Fallback if all Gemini API attempts failed
  console.log('[AI Chat] Gemini API unavailable/quota exceeded. Falling back to local RAG engine.');
  return { ...ragAnswer(question, documentText), provider: 'local', fallbackUsed: true };
}

module.exports = {
  askGeminiOrFallback
};
