/**
 * LanguageTool API Service
 * Provides free grammar and spelling checks using the public LanguageTool API.
 * This is a "free for lifetime" alternative to paid AI services.
 */

export interface LTMatch {
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: { value: string }[];
  rule: { id: string; description: string };
}

interface LTResponse {
  matches: LTMatch[];
}

export async function checkGrammarMatches(text: string): Promise<LTMatch[]> {
  if (!text.trim()) return [];

  try {
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', 'en-US');
    params.append('level', 'picky');

    const response = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`LanguageTool API error: ${response.statusText}`);
    }

    const data: LTResponse = await response.json();
    return data.matches || [];
  } catch (error) {
    console.error("LanguageTool correction failed:", error);
    return [];
  }
}

export async function correctGrammarLT(text: string): Promise<string> {
  if (!text.trim()) return text;

  try {
    const matches = await checkGrammarMatches(text);
    let correctedText = text;
    const sortedMatches = [...matches].sort((a, b) => b.offset - a.offset);

    for (const match of sortedMatches) {
      if (match.replacements && match.replacements.length > 0) {
        const bestReplacement = match.replacements[0].value;
        correctedText = 
          correctedText.substring(0, match.offset) + 
          bestReplacement + 
          correctedText.substring(match.offset + match.length);
      }
    }

    return correctedText;
  } catch (error) {
    console.error("LanguageTool correction failed:", error);
    return text;
  }
}
