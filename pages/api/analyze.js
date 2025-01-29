import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Analyser sprogmønstre
function analyzeLanguagePatterns(text) {
  // Split tekst i sætninger
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Beregn gennemsnitlig sætningslængde og variation
  const lengths = sentences.map(s => s.split(' ').length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + Math.pow(b - avgLength, 2), 0) / lengths.length;
  
  // Store variationer er typisk menneskelige
  const lengthScore = Math.min(variance / 10, 1); // Normaliseret 0-1
  
  return {
    variationScore: lengthScore,
    avgSentenceLength: avgLength
  };
}

// Analyser personlige markører
function analyzePersonalMarkers(text) {
  const personalMarkers = [
    'jeg', 'vi', 'vores', 'min', 'mit', 'mine',
    'faktisk', 'ærligt', 'måske', 'nok', 'vel',
    ':)', ':(', ';)', '...', '!'
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  const markerCount = personalMarkers.reduce((count, marker) => 
    count + words.filter(w => w.includes(marker)).length, 0);
  
  return markerCount / words.length; // Normaliseret ratio
}

// Analyser forretningssprog
function analyzeBusinessLanguage(text) {
  const businessTerms = [
    'seo', 'optimeret', 'løsning', 'platform', 'leads', 
    'kommerci', 'implementer', 'analyse', 'data',
    'marked', 'strategi', 'udvikling', 'process'
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  const termCount = businessTerms.reduce((count, term) => 
    count + words.filter(w => w.includes(term)).length, 0);
  
  return termCount / words.length;
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

    // Udfør detaljerede analyser
    const patterns = analyzeLanguagePatterns(text);
    const personalScore = analyzePersonalMarkers(text);
    const businessScore = analyzeBusinessLanguage(text);

    // Vægtning af forskellige faktorer
    const naturalness = patterns.variationScore * 0.4 + personalScore * 0.6;
    const contextScore = businessScore * 0.5 + (patterns.avgSentenceLength < 20 ? 0.5 : 0);

    // Bed Claude om en mere fokuseret analyse
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      temperature: 0.1,
      messages: [{
        role: "user",
        content: `Du er en ekspert i at analysere dansk forretningskommunikation. 
        Vurder denne tekst for tegn på AI-generering. 
        Se specifikt efter:
        - Naturlig dansk sætningsstruktur
        - Forretningsspecifikt sprog
        - Kontekstrelevante detaljer
        - Personlig tone
        - Naturlige skrivemarkører (smileys, udråbstegn, etc.)
        
        Returner KUN et tal mellem 0-100 der indikerer sandsynligheden for AI-generering.
        
        Tekst: ${text}`
      }]
    });

    const claudeScore = parseInt(response.content[0].text.trim());

    // Kombiner scores med vægtning
    const aiProbability = Math.round(
      (naturalness * 0.4 + 
      contextScore * 0.3 + 
      (claudeScore/100) * 0.3) * 100
    );

    // Identificer og marker segmenter
    const segments = text.split(/[.!?]+/)
      .filter(s => s.trim().length > 0)
      .map(segment => {
        const segmentPersonalScore = analyzePersonalMarkers(segment);
        const segmentPatterns = analyzeLanguagePatterns(segment);
        
        return {
          text: segment.trim(),
          isAI: segmentPersonalScore < 0.1 && segmentPatterns.variationScore < 0.3,
          confidence: segmentPersonalScore < 0.05 ? "High" : "Medium"
        };
      });

    return res.status(200).json({
      aiProbability,
      wordCount: text.split(/\s+/).length,
      characters: text.length,
      segments,
      metrics: {
        naturalness: Math.round(naturalness * 100),
        contextRelevance: Math.round(contextScore * 100),
        claudeScore,
        personalMarkers: Math.round(personalScore * 100),
        businessContext: Math.round(businessScore * 100)
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
