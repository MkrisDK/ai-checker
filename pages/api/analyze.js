import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function analyzeGenerationPatterns(text) {
  // Grundlæggende tekstanalyse
  const paragraphs = text.split('\n').filter(p => p.trim());
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  
  let aiScore = 0;
  let patterns = {};

  // 1. Konsistens i afsnit
  const paragraphLengths = paragraphs.map(p => p.length);
  const avgParagraphLength = paragraphLengths.reduce((a,b) => a + b) / paragraphLengths.length;
  const paragraphVariance = paragraphLengths.map(l => Math.abs(l - avgParagraphLength));
  const isParagraphLengthConsistent = Math.max(...paragraphVariance) < avgParagraphLength * 0.3;
  
  patterns.paragraphConsistency = isParagraphLengthConsistent;
  if (isParagraphLengthConsistent) aiScore += 20;

  // 2. Sætningsstruktur
  const sentenceLengths = sentences.map(s => s.trim().split(' ').length);
  const avgSentenceLength = sentenceLengths.reduce((a,b) => a + b) / sentenceLengths.length;
  const sentenceVariance = sentenceLengths.map(l => Math.abs(l - avgSentenceLength));
  const isSentenceLengthConsistent = Math.max(...sentenceVariance) < 5;
  
  patterns.sentenceConsistency = isSentenceLengthConsistent;
  if (isSentenceLengthConsistent) aiScore += 20;

  // 3. Flow og progression
  let flowScore = 0;
  for (let i = 1; i < sentences.length; i++) {
    const current = sentences[i];
    const previous = sentences[i-1];
    
    const currentWords = new Set(current.toLowerCase().split(' '));
    const previousWords = new Set(previous.toLowerCase().split(' '));
    const overlap = [...currentWords].filter(word => previousWords.has(word)).length;
    
    if (overlap > 2) flowScore++;
  }
  
  const hasLogicalFlow = flowScore / sentences.length > 0.3;
  patterns.logicalFlow = hasLogicalFlow;
  if (hasLogicalFlow) aiScore += 20;

  // 4. Strukturmønstre i afsnit
  let structureScore = 0;
  paragraphs.forEach(p => {
    const paragraphSentences = p.split(/[.!?]+/).filter(s => s.trim());
    if (paragraphSentences.length >= 2) {
      // Tjek for intro-konklusion mønster
      if (paragraphSentences[0].length < paragraphSentences[1].length && 
          paragraphSentences[paragraphSentences.length-1].length < paragraphSentences[paragraphSentences.length-2].length) {
        structureScore++;
      }
    }
  });
  
  const hasConsistentStructure = structureScore / paragraphs.length > 0.5;
  patterns.consistentStructure = hasConsistentStructure;
  if (hasConsistentStructure) aiScore += 20;

  // 5. Variation i ordvalg
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words).size;
  const repetitionRatio = uniqueWords / words.length;
  const hasHighWordVariation = repetitionRatio > 0.7;
  
  patterns.highWordVariation = hasHighWordVariation;
  if (hasHighWordVariation) aiScore += 20;

  // Normalisér den endelige score
  aiScore = Math.min(100, Math.max(0, aiScore));

  return {
    aiScore,
    patterns,
    metrics: {
      paragraphConsistency: isParagraphLengthConsistent ? "High" : "Low",
      sentenceConsistency: isSentenceLengthConsistent ? "High" : "Low",
      flowCoherence: hasLogicalFlow ? "High" : "Low",
      structureConsistency: hasConsistentStructure ? "High" : "Low",
      vocabularyVariation: hasHighWordVariation ? "High" : "Low"
    }
  };
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

    // Analysér mønstre
    const analysis = analyzeGenerationPatterns(text);
    
    // Del teksten op i segmenter baseret på mønstre
    const segments = text.split(/[.!?]+/)
      .filter(s => s.trim())
      .map(segment => {
        const segmentAnalysis = analyzeGenerationPatterns(segment);
        return {
          text: segment.trim(),
          isAI: segmentAnalysis.aiScore > 50,
          confidence: segmentAnalysis.aiScore > 75 ? "High" : 
                     segmentAnalysis.aiScore > 50 ? "Medium" : "Low"
        };
      });

    return res.status(200).json({
      aiProbability: analysis.aiScore,
      wordCount: text.split(/\s+/).length,
      characters: text.length,
      segments,
      metrics: analysis.metrics,
      patterns: analysis.patterns
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed. Please try again.',
      details: error.message 
    });
  }
}
