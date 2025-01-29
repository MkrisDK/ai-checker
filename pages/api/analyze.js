import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function analyzeGenerationPatterns(text) {
  // Del teksten op i forskellige niveauer
  const chunks = text.split(/[.!?]+/).filter(c => c.trim());
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  
  let aiScore = 0;
  
  // 1. Chunk/Token Analyse
  let chunkConsistencyScore = 0;
  const chunkLengths = chunks.map(chunk => chunk.trim().split(' ').length);
  
  for (let i = 1; i < chunkLengths.length; i++) {
    const lengthDiff = Math.abs(chunkLengths[i] - chunkLengths[i-1]);
    if (lengthDiff < 3) {
      chunkConsistencyScore += 1;
    }
  }
  
  const chunkConsistencyRatio = chunkConsistencyScore / (chunks.length - 1);
  aiScore += chunkConsistencyRatio * 30; // Max 30 points for chunk consistency

  // 2. Informationsflow Analyse
  let flowConsistencyScore = 0;
  
  for (let i = 1; i < paragraphs.length; i++) {
    const prevWords = new Set(paragraphs[i-1].toLowerCase().split(/\W+/));
    const currentWords = new Set(paragraphs[i].toLowerCase().split(/\W+/));
    
    // Find overlap i nøgleord mellem afsnit
    const overlap = [...currentWords].filter(word => 
      word.length > 3 && prevWords.has(word)
    ).length;
    
    if (overlap >= 3) {
      flowConsistencyScore += 1;
    }
  }
  
  const flowConsistencyRatio = flowConsistencyScore / (paragraphs.length - 1 || 1);
  aiScore += flowConsistencyRatio * 30; // Max 30 points for flow consistency

  // 3. Sætningskonstruktion Analyse
  let constructionConsistencyScore = 0;
  
  for (let i = 1; i < sentences.length; i++) {
    const currentPattern = getConstructionPattern(sentences[i]);
    const prevPattern = getConstructionPattern(sentences[i-1]);
    
    if (patternsAreSimilar(currentPattern, prevPattern)) {
      constructionConsistencyScore += 1;
    }
  }
  
  const constructionRatio = constructionConsistencyScore / (sentences.length - 1);
  aiScore += constructionRatio * 40; // Max 40 points for construction consistency

  return {
    aiScore: Math.min(100, Math.round(aiScore)),
    metrics: {
      chunkConsistency: Math.round(chunkConsistencyRatio * 100),
      flowConsistency: Math.round(flowConsistencyRatio * 100),
      constructionConsistency: Math.round(constructionRatio * 100)
    }
  };
}

// Hjælpefunktioner for sætningsanalyse
function getConstructionPattern(sentence) {
  const words = sentence.trim().split(/\s+/);
  return {
    length: words.length,
    firstWordType: getWordType(words[0]),
    lastWordType: getWordType(words[words.length - 1]),
    commaCount: (sentence.match(/,/g) || []).length
  };
}

function getWordType(word) {
  if (!word) return 'unknown';
  if (word.match(/^[A-Z]/)) return 'capitalize';
  if (word.match(/^[a-z]/)) return 'lowercase';
  return 'other';
}

function patternsAreSimilar(pattern1, pattern2) {
  return Math.abs(pattern1.length - pattern2.length) < 3 &&
         pattern1.firstWordType === pattern2.firstWordType &&
         Math.abs(pattern1.commaCount - pattern2.commaCount) < 2;
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

    const analysis = analyzeGenerationPatterns(text);
    
    // Identificer segmenter baseret på konsistens
    const segments = text.split(/[.!?]+/)
      .filter(s => s.trim())
      .map(segment => {
        const segmentAnalysis = analyzeGenerationPatterns(segment);
        return {
          text: segment.trim(),
          isAI: segmentAnalysis.aiScore > 70,
          confidence: 
            segmentAnalysis.aiScore > 85 ? "High" :
            segmentAnalysis.aiScore > 70 ? "Medium" : "Low"
        };
      });

    // Beregn menneske/AI fordeling
    const humanScore = 100 - analysis.aiScore;
    const aiRefined = Math.round(humanScore * 0.4);
    const pureHuman = humanScore - aiRefined;

    return res.status(200).json({
      aiProbability: analysis.aiScore,
      wordCount: text.split(/\s+/).length,
      characters: text.length,
      segments,
      metrics: {
        ...analysis.metrics,
        aiGenerated: analysis.aiScore,
        humanWrittenAndAiRefined: aiRefined,
        humanWritten: pureHuman
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
