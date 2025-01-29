import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function analyzeSentence(sentence) {
  let aiScore = 0;
  
  // 1. Sætningsstruktur
  const words = sentence.trim().split(' ');
  
  // Tjek for komplet sætningsstruktur (subjekt + verbum)
  const hasCompleteStructure = 
    words.length > 3 && 
    words[0].charAt(0) === words[0].charAt(0).toUpperCase() &&
    (sentence.endsWith('.') || sentence.endsWith('?') || sentence.endsWith('!'));
    
  if (hasCompleteStructure) aiScore += 30;

  // 2. Kommatering
  const commas = sentence.match(/,/g) || [];
  const expectedCommas = sentence.length / 40;
  if (Math.abs(commas.length - expectedCommas) < 1) {
    aiScore += 20;
  }

  // 3. Forklarende detaljer
  const hasExplanation = 
    sentence.includes(' for at ') ||
    sentence.includes(' hvilket ') ||
    sentence.includes(' eftersom ') ||
    sentence.includes(' således ');
    
  if (hasExplanation) aiScore += 25;

  // 4. Formelt sprog
  const formalWords = [
    'analysere', 'implementere', 'vurdere', 'konkludere',
    'følgelig', 'dermed', 'hermed', 'hvorved'
  ];
  
  const hasFormalLanguage = formalWords.some(word => 
    sentence.toLowerCase().includes(word)
  );
  
  if (hasFormalLanguage) aiScore += 25;

  return Math.min(100, aiScore);
}

function detectAIPatterns(text) {
  let aiScore = 100;
  
  // Split teksten
  const lines = text.split('\n');
  const cleanLines = lines.filter(l => l.trim());
  
  // 1. Liste-detektion
  const listPatterns = [
    /^[0-9]+\./,  // Nummererede lister
    /^[-•*]/,     // Bullet points
    /^[A-Z][a-z]+ [0-9]+:/, // Format som "Step 1:"
  ];
  
  let listCount = 0;
  cleanLines.forEach(line => {
    if (listPatterns.some(pattern => pattern.test(line.trim()))) {
      listCount++;
    }
  });
  
  const listRatio = listCount / cleanLines.length;
  if (listRatio > 0.3) aiScore += 20;
  
  // 2. Tomme linjer mellem punkter
  let emptyLinePattern = 0;
  for (let i = 1; i < lines.length - 1; i++) {
    if (!lines[i].trim() && 
        lines[i-1].trim() && 
        lines[i+1].trim()) {
      emptyLinePattern++;
    }
  }
  
  if (emptyLinePattern > 2) aiScore += 15;
  
  // 3. Tjek for indledende sætninger før lister
  const hasIntroBeforeList = cleanLines.some((line, i) => {
    const nextLine = cleanLines[i + 1];
    return line.endsWith(':') && 
           nextLine && 
           listPatterns.some(pattern => pattern.test(nextLine.trim()));
  });
  
  if (hasIntroBeforeList) aiScore += 15;
  
  // 4. Spørgsmål i slutningen
  const lastLines = cleanLines.slice(-2);
  const hasQuestionAtEnd = lastLines.some(line => 
    line.trim().endsWith('?')
  );
  
  if (hasQuestionAtEnd) aiScore += 10;
  
  // 5. Systematisk afsnitsopbygning
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  const hasConsistentParagraphs = paragraphs.every(p => 
    p.split('.').length >= 2 && 
    p.split('.').length <= 4
  );
  
  if (hasConsistentParagraphs) aiScore += 20;
  
  return Math.min(100, aiScore);
}

function analyzeText(text) {
  // 1. Strukturel analyse
  const structuralScore = detectAIPatterns(text);
  
  // 2. Sætningsbaseret analyse
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const sentenceScores = sentences.map(analyzeSentence);
  const averageSentenceScore = sentenceScores.reduce((a, b) => a + b, 0) / sentences.length;
  
  // 3. Kombiner scores med vægtning
  const combinedScore = Math.round(
    (structuralScore * 0.6) +
    (averageSentenceScore * 0.4)
  );

  // Identificer segmenter
  const segments = sentences.map((sentence, index) => ({
    text: sentence.trim(),
    isAI: sentenceScores[index] > 70,
    confidence: sentenceScores[index] > 85 ? "High" : 
                sentenceScores[index] > 70 ? "Medium" : "Low"
  }));

  // Beregn fordelinger
  const humanWritten = 100 - combinedScore;
  const aiRefined = Math.round(humanWritten * 0.4);
  const pureHuman = humanWritten - aiRefined;

  return {
    aiProbability: combinedScore,
    segments,
    metrics: {
      structuralScore,
      averageSentenceScore,
      aiGenerated: combinedScore,
      humanWrittenAndAiRefined: aiRefined,
      humanWritten: pureHuman
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

    const analysis = analyzeText(text);
    
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
