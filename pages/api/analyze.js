import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Helper funktion til at sanitize tekst for JSON
function sanitizeText(text) {
  return text
    .replace(/[\n\r]/g, ' ')
    .replace(/"/g, '\\"')
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      temperature: 0.1,
      messages: [{
        role: "user",
        content: `You are a precise AI text detector. Return a JSON response in this exact format: {"aiProbability": number, "wordCount": number, "characters": number, "segments": [{"text": "string", "isAI": boolean, "confidence": "High|Medium|Low"}]}. Analyze this text and return ONLY valid JSON with no additional text or formatting. Text to analyze: ${sanitizeText(text)}`
      }]
    });

    // Log raw response for debugging
    console.log('Raw response:', response.content[0].text);

    try {
      const cleaned = response.content[0].text.trim();
      const analysis = JSON.parse(cleaned);
      
      // Validate required fields
      if (typeof analysis.aiProbability !== 'number' || !Array.isArray(analysis.segments)) {
        throw new Error('Invalid response format');
      }

      return res.status(200).json(analysis);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Failed to parse:', response.content[0].text);
      return res.status(500).json({ 
        error: 'Failed to parse analysis results',
        details: parseError.message
      });
    }
    
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed. Please try again.',
      details: error.message 
    });
  }
}
