import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
        content: `You are an expert at detecting AI-generated text. Analyze the following text for signs of AI authorship.

Key indicators of AI-generated text include:
- Consistent writing style throughout without natural variations
- Overly formal or structured language
- Perfect grammar and punctuation
- Repetitive phrases or patterns
- Lack of unique personal experiences or perspectives
- Generic or templated responses
- Overly detailed explanations
- Systematic and methodical approaches to topics

Analyze the text carefully considering these factors and return a JSON response with:
- aiProbability: A number between 0-100 indicating likelihood of AI authorship
- wordCount: Total number of words
- characters: Total number of characters
- segments: Array of text segments with their analysis

Format exactly as: {"aiProbability": number, "wordCount": number, "characters": number, "segments": [{"text": "string", "isAI": boolean, "confidence": "High|Medium|Low"}]}

Provide ONLY the JSON response, no other text.

Text to analyze: ${sanitizeText(text)}`
      }]
    });

    try {
      const cleaned = response.content[0].text.trim();
      const analysis = JSON.parse(cleaned);
      
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
