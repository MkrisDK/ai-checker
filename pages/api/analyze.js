import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  // Log request details
  console.log('=== API Request Received ===');
  console.log('Method:', req.method);

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    console.log('Calling Claude API...');
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      temperature: 0.3,
      messages: [{
        role: "user",
        content: `Analyze this text and determine if it was written by AI or a human. Respond with ONLY a JSON object in this exact format (no other text):
        {
          "aiProbability": <number between 0-100>,
          "detectedLanguage": "<language name>",
          "confidence": "<Low|Medium|High>",
          "segments": [
            {
              "text": "<segment text>",
              "aiProbability": <number between 0-100>,
              "explanation": "<why this segment appears AI/human generated>"
            }
          ],
          "reasonings": ["<reason 1>", "<reason 2>", "<reason 3>"]
        }
        
        Text to analyze: ${text}`
      }]
    });

    console.log('Received response from Claude');
    
    let analysis;
    try {
      analysis = JSON.parse(response.content[0].text.trim());
    } catch (error) {
      console.error('Failed to parse Claude response:', error);
      return res.status(500).json({ error: 'Failed to parse analysis results' });
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
