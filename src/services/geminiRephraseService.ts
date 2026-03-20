/**
 * Gemini AI Rephrase Service
 * Uses Google's Gemini API (free tier) to professionally rephrase text
 * while preserving the original meaning and markdown formatting.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!API_KEY || API_KEY === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
    }
    genAI = new GoogleGenerativeAI(API_KEY);
  }
  return genAI;
}

const REPHRASE_PROMPT = `You are a professional text editor. Rephrase and improve the following text to make it more clear, professional, and well-structured.

Rules:
1. Fix all grammar, spelling, and punctuation errors
2. Improve sentence structure and flow
3. Keep the original meaning intact — do NOT add new information
4. Preserve ALL markdown formatting exactly (headings #, bullet points -, numbered lists 1., checkboxes - [ ], blockquotes >, bold **, italic *)
5. Capitalize sentence beginnings properly
6. Convert informal/rough notes into clean, professional language
7. Return ONLY the rephrased text, nothing else — no explanations, no quotes, no code blocks

Text to rephrase:
`;

export async function rephraseWithGemini(text: string): Promise<string> {
  if (!text.trim()) return text;

  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });

    const result = await model.generateContent(REPHRASE_PROMPT + text);
    const response = result.response;
    const rephrased = response.text().trim();

    // Safety: if Gemini returns empty or something drastically different in length, fall back
    if (!rephrased || rephrased.length < text.length * 0.3) {
      console.warn('Gemini rephrase returned suspicious result, falling back to original.');
      return text;
    }

    return rephrased;
  } catch (error) {
    console.error('Gemini rephrase failed:', error);
    return text; // Graceful fallback: return original text unchanged
  }
}
