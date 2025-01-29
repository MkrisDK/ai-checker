import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function detectAIPatterns(text) {
  let aiScore = 100; // Start med antagelsen om at det er AI
  const patterns = {};

  // Split tekst i komponenter
  const paragraphs = text.split('\n').filter(p => p.trim());
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const words = text.split(/\s+/);

  // 1. Struktur og formattering
  const paragraphLengths = paragraphs.map(p => p.length);
  const variance = calculateVariance(paragraphLengths);
  patterns.structureVariance = variance;
  
  if (variance > 50) {
    aiScore -= 20; // Uregelmæssig struktur er menneskeligt
    patterns.hasIrregularStructure = true;
  }

  // 2. Sætningsmønstre
  let patternBreaks = 0;
  sentences.forEach((sentence, i) => {
    if (i > 0) {
      // Sammenlign start og slut af sætninger
      const currentStart = sentence.trim().split(' ')[0].toLowerCase();
      const previousStart = sentences[i-1].trim().split(' ')[0].toLowerCase();
      
      if (currentStart !== previousStart) {
        patternBreaks++;
      }
    }
  });
  
  patterns.patternBreaks = patternBreaks;
  aiScore -= patternBreaks * 3; // Flere brud = mere menneskeligt

  // 3. Afstande og formattering
  let formattingBreaks = 0;
  paragraphs.forEach((p, i) => {
    if (i > 0) {
      const lengthRatio = p.length / paragraphs[i-1].length;
      if (lengthRatio < 0.5 || lengthRatio > 2) {
        formattingBreaks++;
      }
    }
  });
  
  patterns.formattingBreaks = formattingBreaks;
  aiScore -= formattingBreaks * 5;

  // 4. Sætningslængde variation
  const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
  const sentenceVariance = calculateVariance(sentenceLengths);
  patterns.sentenceVariance = sentenceVariance;
  
  if (sentenceVariance > 10) {
    aiScore -= 15; // Store variationer i sætningslængde er menneskeligt
  }

  // 5. Konsistent tegnsætning
  const punctuationPattern = sentences.map(s => 
    (s.match(/[,;:]/) || []).length
  );
  const punctuationVariance = calculateVariance(punctuationPattern);
  patterns.punctuationVariance = punctuationVariance;
  
  if (punctuationVariance > 2) {
    aiScore -= 15; // Inkonsistent tegnsætning er menneskeligt
  }

  // Normalisér scoren
  aiScore = Math.max(0, Math.min(100, aiScore));

  return {
    aiScore,
    patterns,
    metrics: {
      structureVariance: variance,
      patternBreaks,
      formattingBreaks,
      sentenceVariance,
      punctuationVariance
    }
  };
}

function calculateVariance(numbers) {
  const avg = numbers.reduce((a, b) => a + b) / numbers.length;
  return Math.sqrt(
    numbers.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / numbers.length
  );
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

    // Hovedanalyse
    const analysis = detectAIPatterns(text);
    
    // Segment analyse
    const segments = text.split(/[.!?]+/)
      .filter(s => s.trim())
      .map(segment => {
        const segmentAnalysis = detectAIPatterns(segment);
        return {
          text: segment.trim(),
          isAI: segmentAnalysis.aiScore > 70, // Højere tærskel for segmenter
          confidence: 
            segmentAnalysis.aiScore > 85 ? "High" :
            segmentAnalysis.aiScore > 70 ? "Medium" : "Low"
        };
      });

    // Beregn human-written og AI-refined procenter
    const humanWritten = 100 - analysis.aiScore;
    const aiRefined = Math.round(humanWritten * 0.4); // 40% af den menneskelige del
    const pureHuman = humanWritten - aiRefined;

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
