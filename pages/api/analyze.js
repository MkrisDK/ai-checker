import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Optimer promptet for hurtigere analyse
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      temperature: 0.1, // Lavere temperatur for mere konsistente svar
      messages: [{
        role: "user",
        content: `You are a precise AI text detector. Analyze this text and respond ONLY with a JSON object containing:
        - Overall AI probability (0-100)
        - Word count and character count
        - Text segments marked as AI or human with high confidence areas highlighted
        
        Format the response exactly like this, with no additional text:
        {
          "aiProbability": <0-100>,
          "wordCount": <number>,
          "characters": <number>,
          "segments": [
            {
              "text": "<segment>",
              "isAI": <true/false>,
              "confidence": "High|Medium|Low"
            }
          ]
        }

        Text: ${text}`
      }]
    });

    // Parse og valider resultatet
    const analysis = JSON.parse(response.content[0].text.trim());
    
    if (!analysis || typeof analysis.aiProbability !== 'number') {
      throw new Error('Invalid analysis format received');
    }

    return res.status(200).json(analysis);
    
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed. Please try again.',
      details: error.message 
    });
  }
}
