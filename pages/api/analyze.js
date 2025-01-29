import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function analyzeAIPatterns(text) {
  // 1. Tjek for struktureret opbygning
  const hasStructuredIntro = text.split('\n')[0].length < 50 && 
    text.split('\n')[0].includes('Hej') || 
    text.split('\n')[0].includes('Kære') ||
    text.split('\n')[0].includes('Goddag');
  
  // 2. Tjek for konsistent formattering
  const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
  const formattingConsistency = paragraphs.every(p => 
    p.endsWith('.') || p.endsWith('!') || p.endsWith('?') || p.endsWith(':')
  );

  // 3. Tjek for perfekt grammatik (mangel på almindelige fejl)
  const commonDanishErrors = [
    'ihvertfald', 'idag', 'igår', 'imorgen', 'forøvrigt',
    'tilgengæld', 'ihverttilfælde', 'sådan set', 'helst ville'
  ];
  const hasCommonErrors = commonDanishErrors.some(error => 
    text.toLowerCase().includes(error)
  );

  // 4. Tjek for konsistent brug af punktummer og kommaer
  const sentences = text.split('.');
  const avgSentenceLength = sentences.reduce((acc, s) => 
    acc + s.trim().split(' ').length, 0) / sentences.length;
  const sentenceLengthConsistency = sentences.every(s => 
    Math.abs(s.trim().split(' ').length - avgSentenceLength) < 5
  );

  // 5. Tjek for logisk progression (brug af overgangsord)
  const transitionWords = [
    'derfor', 'således', 'følgelig', 'dermed', 'heraf', 
    'derved', 'hvoraf', 'først', 'dernæst', 'endelig'
  ];
  const hasTransitionWords = transitionWords.some(word => 
    text.toLowerCase().includes(word)
  );

  // 6. Tjek for gentagelser i sætningsstruktur
  const sentenceStarts = sentences.map(s => 
    s.trim().split(' ').slice(0, 3).join(' ')
  );
  const uniqueStartRatio = new Set(sentenceStarts).size / sentenceStarts.length;

  // Vægt hver faktor
  const factors = {
    structuredIntro: hasStructuredIntro ? 0.8 : 0.2,
    formattingConsistency: formattingConsistency ? 0.9 : 0.3,
    perfectGrammar: !hasCommonErrors ? 0.85 : 0.2,
    consistentSentences: sentenceLengthConsistency ? 0.9 : 0.3,
    usesTransitions: hasTransitionWords ? 0.7 : 0.4,
    sentenceVariation: uniqueStartRatio < 0.7 ? 0.8 : 0.3
  };

  // Beregn samlet AI-sandsynlighed
  const weights = {
    structuredIntro: 0.1,
    formattingConsistency: 0.2,
    perfectGrammar: 0.2,
    consistentSentences: 0.2,
    usesTransitions: 0.15,
    sentenceVariation: 0.15
  };

  let aiProbability = Object.keys(factors).reduce((total, factor) => 
    total + (factors[factor] * weights[factor]), 0) * 100;

  // Identificer segmenter der ligner AI-genereret tekst
  const segments = text.split(/[.!?]+/).map(segment => {
    const segmentScore = analyzeSegment(segment.trim());
    return {
      text: segment.trim(),
      isAI: segmentScore > 0.7,
      confidence: segmentScore > 0.8 ? "High" : segmentScore > 0.6 ? "Medium" : "Low"
    };
  }).filter(s => s.text.length > 0);

  return {
    aiProbability: Math.round(aiProbability),
    segments,
    metrics: {
      structuredIntro: hasStructuredIntro,
      formattingConsistency,
      perfectGrammar: !hasCommonErrors,
      sentenceLengthConsistency,
      transitionWordUse: hasTransitionWords,
      uniqueStartRatio
    }
  };
}

function analyzeSegment(segment) {
  if (!segment) return 0;
  
  let score = 0;
  
  // Tjek for AI-lignende mønstre i segmentet
  if (segment.length > 20) {
    // Perfekt kommatering
    score += (segment.match(/,/g) || []).length > 1 ? 0.2 : 0;
    
    // Formelle vendinger
    score += /derfor|således|følgelig|hermed|endvidere/.test(segment) ? 0.2 : 0;
    
    // Kompleks sætningsstruktur
    score += segment.includes(' som ') && segment.includes(' der ') ? 0.2 : 0;
    
    // Mangel på talesprog
    score += /øh|hmm|altså|ligesom|bare|jo/.test(segment) ? -0.2 : 0.2;
    
    // Konsistent brug af tegnsætning
    score += /[.!?]/.test(segment) ? 0.2 : 0;
  }
  
  return Math.max(0, Math.min(1, score));
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

    const analysis = analyzeAIPatterns(text);
    
    return res.status(200).json({
      aiProbability: analysis.aiProbability,
      wordCount: text.split(/\s+/).length,
      characters: text.length,
      segments: analysis.segments,
      metrics: analysis.metrics
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed. Please try again.',
      details: error.message 
    });
  }
}
