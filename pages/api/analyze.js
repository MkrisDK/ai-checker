import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Beregn perplexity score
function calculatePerplexity(text) {
  const words = text.toLowerCase().split(/\s+/);
  let transitions = new Map();
  let wordCounts = new Map();
  
  // Tæl ordovergange
  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i];
    const next = words[i + 1];
    const key = `${current}|${next}`;
    
    transitions.set(key, (transitions.get(key) || 0) + 1);
    wordCounts.set(current, (wordCounts.get(current) || 0) + 1);
  }
  
  // Beregn perplexity
  let logProb = 0;
  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i];
    const next = words[i + 1];
    const key = `${current}|${next}`;
    
    const transitionCount = transitions.get(key) || 0;
    const wordCount = wordCounts.get(current) || 0;
    
    const probability = transitionCount / wordCount;
    logProb += Math.log2(probability || 1e-10);
  }
  
  return Math.pow(2, -logProb / (words.length - 1));
}

// Beregn entropy
function calculateEntropy(text) {
  const charFreq = new Map();
  const length = text.length;
  
  // Tæl tegn
  for (const char of text) {
    charFreq.set(char, (charFreq.get(char) || 0) + 1);
  }
  
  // Beregn entropy
  let entropy = 0;
  for (const count of charFreq.values()) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
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

    // Beregn statistiske målinger
    const perplexity = calculatePerplexity(text);
    const entropy = calculateEntropy(text);
    
    // Typiske værdier baseret på analyse af menneskeligt vs. AI-genereret tekst
    const humanPerplexityRange = { min: 50, max: 150 };
    const humanEntropyRange = { min: 4, max: 5 };
    
    // Beregn baseline sandsynlighed baseret på statistiske målinger
    const perplexityScore = Math.min(100, Math.max(0, 
      100 * (1 - (perplexity - humanPerplexityRange.min) / (humanPerplexityRange.max - humanPerplexityRange.min))
    ));
    
    const entropyScore = Math.min(100, Math.max(0,
      100 * (1 - (entropy - humanEntropyRange.min) / (humanEntropyRange.max - humanEntropyRange.min))
    ));

    // Spørg Claude for en kvalitativ vurdering
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      temperature: 0.1,
      messages: [{
        role: "user",
        content: `Analyze this text for AI authorship markers. Consider:
        - Language complexity and variation
        - Personal elements and context
        - Structural patterns
        - Natural inconsistencies
        
        Return only a number between 0-100 representing AI probability, where 100 means definitely AI.
        
        Text: ${text}`
      }]
    });

    // Parse Claude's vurdering
    const claudeScore = parseInt(response.content[0].text.trim());
    
    // Kombiner scores med vægtning
    const combinedScore = Math.round(
      (perplexityScore * 0.3) + 
      (entropyScore * 0.3) + 
      (claudeScore * 0.4)
    );

    // Identificer segmenter med høj AI-sandsynlighed
    const segments = text.split(/[.!?]+/).map(segment => ({
      text: segment.trim(),
      isAI: calculatePerplexity(segment) < humanPerplexityRange.min,
      confidence: "High"
    })).filter(segment => segment.text.length > 0);

    return res.status(200).json({
      aiProbability: combinedScore,
      wordCount: text.split(/\s+/).length,
      characters: text.length,
      segments,
      metrics: {
        perplexity,
        entropy,
        perplexityScore,
        entropyScore,
        claudeScore
      }
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed. Please try again.',
      details: error.message 
    });
  }
}
