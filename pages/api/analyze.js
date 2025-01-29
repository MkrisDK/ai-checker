import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Hovedfunktion til tekstanalyse
async function analyzeText(text) {
  // Udfør alle analyser
  const tokenAnalysis = analyzeTokenFlow(text);
  const sentenceAnalysis = analyzeSentencePatterns(text);
  const conceptAnalysis = analyzeConceptFlow(text);
  const structuralAnalysis = analyzeStructuralConsistency(text);

  // Kombiner scores med vægtning
  const combinedScore = calculateCombinedScore({
    tokenScore: tokenAnalysis.totalScore,
    sentenceScore: sentenceAnalysis.totalScore,
    conceptScore: conceptAnalysis.totalScore,
    structuralScore: structuralAnalysis.totalScore
  });

  return {
    aiProbability: combinedScore,
    metrics: {
      tokenFlow: tokenAnalysis.metrics,
      sentencePatterns: sentenceAnalysis.metrics,
      conceptFlow: conceptAnalysis.metrics,
      structural: structuralAnalysis.metrics
    }
  };
}

function calculateCombinedScore(scores) {
  return Math.round(
    (scores.tokenScore * 0.25) +
    (scores.sentenceScore * 0.25) +
    (scores.conceptScore * 0.25) +
    (scores.structuralScore * 0.25)
  );
}
// Token Flow Analysis
function analyzeTokenFlow(text) {
  const tokens = text.split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  let patterns = {
    transitionTokens: 0,
    sentenceStarts: [],
    tokenGroupings: [],
    conceptProgression: new Map()
  };

  // Analyser token sekvenser med 3-gram metode
  for (let i = 0; i < tokens.length - 2; i++) {
    const trigram = tokens.slice(i, i + 3);
    patterns.tokenGroupings.push(getTokenPattern(trigram));
  }

  // Identificer token sekvenser
  let sequenceScore = 0;
  for (let i = 1; i < patterns.tokenGroupings.length; i++) {
    const current = patterns.tokenGroupings[i];
    const previous = patterns.tokenGroupings[i-1];
    
    // AI har tendens til at have meget regelmæssige mønstre
    if (arePatternsSimilar(current, previous)) {
      sequenceScore += 1;
    }
  }

  // Analyser sætningstarter
  sentences.forEach(sentence => {
    const firstTokens = sentence.trim().split(/\s+/).slice(0, 2);
    patterns.sentenceStarts.push(getStartPattern(firstTokens));
  });

  // Beregn start-mønstre konsistens
  let startPatternScore = 0;
  for (let i = 1; i < patterns.sentenceStarts.length; i++) {
    if (areStartPatternsSimilar(
      patterns.sentenceStarts[i],
      patterns.sentenceStarts[i-1]
    )) {
      startPatternScore += 1;
    }
  }

  // Normaliser scores
  const totalScore = calculateTokenFlowScore(
    sequenceScore, 
    startPatternScore, 
    patterns
  );

  return {
    totalScore,
    metrics: {
      sequenceConsistency: sequenceScore,
      startPatternConsistency: startPatternScore,
      tokenPatterns: patterns
    }
  };
}

// Sentence Pattern Analysis
function analyzeSentencePatterns(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  let patterns = {
    construction: [],    
    complexity: [],      
    connections: [],     
    progression: []      
  };

  // Analyser hver sætning
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const words = sentence.trim().split(/\s+/);
    
    // Grundlæggende sætningskonstruktion
    const construction = {
      clauseCount: countClauses(sentence),
      mainVerbPosition: findMainVerbPosition(words),
      subjectPosition: findSubjectPosition(words),
      modifierPositions: findModifierPositions(words)
    };
    patterns.construction.push(construction);

    // Sætningskompleksitet
    const complexity = analyzeComplexity(sentence);
    patterns.complexity.push(complexity);

    // Forbindelser mellem sætninger
    if (i < sentences.length - 1) {
      patterns.connections.push(
        analyzeSentenceConnection(sentence, sentences[i + 1])
      );
    }

    // Informationsprogression
    patterns.progression.push(
      analyzeProgression(sentence, i > 0 ? sentences[i-1] : null)
    );
  }

  // Beregn mønsterscore
  return calculateSentencePatternScore(patterns);
}

function analyzeComplexity(sentence) {
  return {
    subordinateClauses: countSubordinateClauses(sentence),
    coordinatingConjunctions: countCoordinatingConjunctions(sentence),
    phraseNesting: calculatePhraseNesting(sentence),
    modifierDepth: calculateModifierDepth(sentence)
  };
}

function analyzeSentenceConnection(current, next) {
  return {
    sharedTerms: findSharedTerms(current, next),
    logicalFlow: analyzeLogicalFlow(current, next),
    transitionType: determineTransitionType(current, next)
  };
}

function analyzeProgression(current, previous) {
  return {
    newInformation: identifyNewInformation(current, previous),
    informationDensity: calculateInformationDensity(current),
    topicContinuity: previous ? analyzeTopicContinuity(current, previous) : null
  };
}
function analyzeConceptFlow(text) {
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  
  // Sporing af koncepter gennem teksten
  let conceptTracker = {
    concepts: new Map(),          // Alle identificerede koncepter
    activeStack: [],             // Aktive koncepter i nuværende kontekst
    relationMap: new Map(),      // Relationer mellem koncepter
    developmentPatterns: []      // Hvordan koncepter udvikles
  };

  // Første gennemgang: Identificer alle koncepter og deres første forekomst
  sentences.forEach((sentence, index) => {
    const concepts = extractConcepts(sentence);
    concepts.forEach(concept => {
      if (!conceptTracker.concepts.has(concept.term)) {
        conceptTracker.concepts.set(concept.term, {
          introduced: index,
          occurrences: [index],
          contexts: [getConceptContext(sentence, concept)],
          development: [],
          related: new Set()
        });
      } else {
        const conceptInfo = conceptTracker.concepts.get(concept.term);
        conceptInfo.occurrences.push(index);
        conceptInfo.contexts.push(getConceptContext(sentence, concept));
      }
    });
  });

  // Anden gennemgang: Analysér konceptudvikling og relationer
  sentences.forEach((sentence, index) => {
    const activeConcepts = findActiveConcepts(sentence, conceptTracker.concepts);
    
    // Opdater active stack
    conceptTracker.activeStack = updateActiveStack(
      conceptTracker.activeStack,
      activeConcepts,
      index
    );

    // Analysér udvikling af hvert aktivt koncept
    activeConcepts.forEach(concept => {
      const development = analyzeConceptDevelopment(
        concept,
        sentence,
        index,
        conceptTracker
      );
      conceptTracker.developmentPatterns.push(development);
    });

    // Find relationer mellem aktive koncepter
    if (activeConcepts.length > 1) {
      const relations = findConceptRelations(
        activeConcepts,
        sentence,
        conceptTracker
      );
      relations.forEach(relation => {
        updateRelationMap(conceptTracker.relationMap, relation);
      });
    }
  });

  // Analysér det overordnede konceptflow
  const flowPatterns = analyzeFlowPatterns(conceptTracker);
  
  return calculateConceptScore(flowPatterns, conceptTracker);
}

function getConceptContext(sentence, concept) {
  return {
    role: determineConceptRole(sentence, concept),
    emphasis: calculateConceptEmphasis(sentence, concept),
    modifiers: findConceptModifiers(sentence, concept),
    relationToMain: determineRelationToMainIdea(sentence, concept)
  };
}

function updateActiveStack(currentStack, newConcepts, index) {
  // Fjern inaktive koncepter
  const updatedStack = currentStack.filter(concept => 
    concept.lastMentioned >= index - 3
  );
  
  // Tilføj nye koncepter
  newConcepts.forEach(concept => {
    if (!updatedStack.find(c => c.term === concept.term)) {
      updatedStack.push({
        ...concept,
        lastMentioned: index
      });
    }
  });
  
  return updatedStack;
}

function analyzeConceptDevelopment(concept, sentence, index, tracker) {
  const history = tracker.concepts.get(concept.term);
  const previousMentions = history.occurrences.filter(i => i < index);
  
  return {
    concept: concept.term,
    developmentType: determineDevelopmentType(
      concept,
      sentence,
      previousMentions,
      tracker
    ),
    complexity: calculateDevelopmentComplexity(
      concept,
      sentence,
      history
    ),
    patternType: identifyDevelopmentPattern(history)
  };
}

function calculateConceptScore(flowPatterns, tracker) {
  const scores = {
    introductionScore: evaluateConceptIntroductions(tracker),
    developmentScore: evaluateConceptDevelopment(flowPatterns),
    relationScore: evaluateConceptRelations(tracker.relationMap),
    consistencyScore: evaluatePatternConsistency(flowPatterns)
  };

  // Vægt og kombiner scores
  const totalScore = (
    (scores.introductionScore * 0.25) +
    (scores.developmentScore * 0.30) +
    (scores.relationScore * 0.25) +
    (scores.consistencyScore * 0.20)
  ) * 100;

  return {
    totalScore: Math.round(totalScore),
    metrics: scores
  };
}
function analyzeStructuralConsistency(text) {
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  
  let structuralAnalysis = {
    paragraphPatterns: analyzeParagraphStructure(paragraphs),
    informationFlow: analyzeInformationFlow(sentences),
    documentStructure: analyzeDocumentStructure(text),
    consistencyMetrics: {}
  };

  return calculateStructuralScore(structuralAnalysis);
}

function analyzeParagraphStructure(paragraphs) {
  let patterns = [];
  
  paragraphs.forEach((paragraph, index) => {
    const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim());
    
    patterns.push({
      // Analysér opbygning af hvert afsnit
      introSentence: analyzeIntroSentence(sentences[0]),
      bodySentences: analyzeBodySentences(sentences.slice(1, -1)),
      concludingSentence: analyzeConcludingSentence(sentences[sentences.length - 1]),
      
      // Analysér interne mønstre
      sentenceProgression: analyzeSentenceProgression(sentences),
      conceptFlow: analyzeConceptFlowInParagraph(sentences),
      
      // Sammenlign med tidligere afsnit hvis det findes
      relationToPrevious: index > 0 ? 
        analyzeParagraphRelation(paragraph, paragraphs[index - 1]) : 
        null
    });
  });

  return patterns;
}

function analyzeInformationFlow(sentences) {
  let flow = {
    progressionPatterns: [],
    logicalConnections: [],
    informationDensity: []
  };

  sentences.forEach((sentence, index) => {
    // Analysér informationsprogression
    flow.progressionPatterns.push(
      analyzeInformationProgression(sentence, index > 0 ? sentences[index - 1] : null)
    );
    
    // Find logiske forbindelser
    if (index > 0) {
      flow.logicalConnections.push(
        findLogicalConnections(sentence, sentences[index - 1])
      );
    }
    
    // Mål informationstæthed
    flow.informationDensity.push(
      measureInformationDensity(sentence)
    );
  });

  return flow;
}
// Global struktur analyse
function analyzeGlobalStructure(text) {
    // Del teksten op i strukturelle komponenter
    const components = {
        introduction: getIntroductionSection(text),
        mainContent: getMainContent(text),
        conclusion: getConclusionSection(text)
    };

    return {
        // Tjek for AI's typiske "setup-elaboration-conclusion" mønster
        hasTypicalAIStructure: checkForAIStructurePattern(components),
        
        // Mål konsistens i detaljeniveau gennem teksten
        depthConsistency: measureDepthConsistency(components.mainContent),
        
        // Tjek for systematisk progression
        progressionPattern: analyzeProgressionPattern(components)
    };
}

function checkForAIStructurePattern(components) {
    let score = 0;
    
    // AI har tendens til at have en tydelig introduktion
    if (components.introduction && 
        components.introduction.split(' ').length / components.mainContent.split(' ').length < 0.2) {
        score += 30;
    }
    
    // AI har tendens til at have meget systematisk hovedindhold
    if (hasSystematicStructure(components.mainContent)) {
        score += 40;
    }
    
    // AI har tendens til at opsummere eller konkludere
    if (components.conclusion && 
        hasTypicalAIConclusion(components.conclusion)) {
        score += 30;
    }
    
    return score;
}

function hasSystematicStructure(content) {
    const paragraphs = content.split('\n\n');
    let systematicScore = 0;
    
    // Tjek for ensartet længde mellem afsnit
    const lengths = paragraphs.map(p => p.length);
    const avgLength = lengths.reduce((a, b) => a + b) / lengths.length;
    const lengthVariance = lengths.map(l => Math.abs(l - avgLength) / avgLength);
    
    if (Math.max(...lengthVariance) < 0.3) {
        systematicScore += 20; // AI har meget konsistent afsnitslængde
    }
    
    // Tjek for systematisk opbygning indenfor afsnit
    const hasSystematicParagraphs = paragraphs.every(paragraph => {
        const sentences = paragraph.split(/[.!?]+/);
        return (
            sentences.length >= 2 && // AI laver sjældent enkeltsætningsafsnit
            sentences[0].length < sentences[1].length && // AI starter ofte med kort intro
            sentences[sentences.length - 1].length < avgLength // AI slutter ofte med kortere sætning
        );
    });
    
    if (hasSystematicParagraphs) {
        systematicScore += 20;
    }
    
    return systematicScore > 30;
}

// Logiske forbindelser analyse
function findLogicalConnections(sentence, previousSentence) {
    return {
        // Tjek for AI's typiske overgangsmønstre
        transitionType: identifyTransitionType(sentence, previousSentence),
        
        // Mål graden af logisk forbindelse
        connectionStrength: measureConnectionStrength(sentence, previousSentence),
        
        // Identificer genbrugte koncepter
        conceptContinuity: analyzeConceptContinuity(sentence, previousSentence),
        
        // Find argumentationsstrukturen
        argumentationPattern: findArgumentationPattern(sentence, previousSentence)
    };
}

function identifyTransitionType(sentence, previousSentence) {
    // AI har meget tydelige overgangsmønstre
    const transitionPatterns = [
        {type: 'elaboration', markers: ['furthermore', 'moreover', 'additionally']},
        {type: 'contrast', markers: ['however', 'on the other hand', 'conversely']},
        {type: 'causation', markers: ['therefore', 'thus', 'consequently']},
        {type: 'example', markers: ['for example', 'for instance', 'such as']},
        {type: 'summary', markers: ['in conclusion', 'overall', 'to summarize']}
    ];
    
    for (const pattern of transitionPatterns) {
        if (pattern.markers.some(marker => 
            sentence.toLowerCase().includes(marker))) {
            return pattern.type;
        }
    }
    
    return 'natural'; // Mennesker har ofte mere naturlige overgange
}

function measureConnectionStrength(sentence, previousSentence) {
    let score = 0;
    
    // Del sætninger op i ord
    const currentWords = new Set(sentence.toLowerCase().split(/\W+/));
    const previousWords = new Set(previousSentence.toLowerCase().split(/\W+/));
    
    // Find fælles ord (minus stopord)
    const commonWords = [...currentWords].filter(word => 
        previousWords.has(word) && !isStopWord(word)
    );
    
    // AI har tendens til at genbruge flere nøgleord
    score += (commonWords.length / currentWords.size) * 50;
    
    // AI har tendens til at have meget eksplicitte forbindelser
    if (hasExplicitConnection(sentence, previousSentence)) {
        score += 50;
    }
    
    return score;
}

function analyzeConceptContinuity(sentence, previousSentence) {
    // Find hovedkoncepter i hver sætning
    const currentConcepts = extractMainConcepts(sentence);
    const previousConcepts = extractMainConcepts(previousSentence);
    
    // AI har tendens til at være meget systematisk i konceptudvikling
    return {
        continuedConcepts: currentConcepts.filter(c => 
            previousConcepts.includes(c)
        ),
        newConcepts: currentConcepts.filter(c => 
            !previousConcepts.includes(c)
        ),
        droppedConcepts: previousConcepts.filter(c => 
            !currentConcepts.includes(c)
        )
    };
}

function findArgumentationPattern(sentence, previousSentence) {
    // AI følger ofte meget tydelige argumentationsmønstre
    const patterns = {
        claim: identifyClaim(sentence),
        evidence: findEvidence(sentence, previousSentence),
        reasoning: identifyReasoning(sentence, previousSentence),
        rebuttal: findRebuttal(sentence, previousSentence)
    };
    
    // Beregn hvor "AI-agtig" argumentationen er
    return {
        pattern: patterns,
        aiProbability: calculateArgumentationAIProbability(patterns)
    };
}

function calculateArgumentationAIProbability(patterns) {
    let score = 0;
    
    // AI har meget tydelige påstande
    if (patterns.claim.confidence > 0.8) score += 25;
    
    // AI bruger meget struktureret evidens
    if (patterns.evidence.isStructured) score += 25;
    
    // AI har meget eksplicit ræsonnement
    if (patterns.reasoning.isExplicit) score += 25;
    
    // AI håndterer modargumenter meget systematisk
    if (patterns.rebuttal.isSystematic) score += 25;
    
    return score;
}
function analyzeDocumentStructure(text) {
  return {
    // Overordnet struktur
    globalStructure: analyzeGlobalStructure(text),
    
    // Formattering og layout
    formattingPatterns: analyzeFormattingPatterns(text),
    
    // Hierarki og organisering
    hierarchyLevels: analyzeHierarchyLevels(text)
  };
}

// Main API endpoint handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Udfør alle analyser
    const tokenAnalysis = analyzeTokenFlow(text);
    const sentenceAnalysis = analyzeSentencePatterns(text);
    const conceptAnalysis = analyzeConceptFlow(text);
    const structuralAnalysis = analyzeStructuralConsistency(text);

    // Kombiner alle scores med vægtning
    const aiScore = (
      tokenAnalysis.totalScore * 0.25 +
      sentenceAnalysis.totalScore * 0.25 +
      conceptAnalysis.totalScore * 0.25 +
      structuralAnalysis.totalScore * 0.25
    );

    // Beregn fordelinger
    const humanScore = 100 - aiScore;
    const aiRefined = Math.round(humanScore * 0.4);
    const pureHuman = humanScore - aiRefined;

    // Identificer segmenter
    const segments = text.split(/[.!?]+/)
      .filter(s => s.trim())
      .map(segment => {
        const segmentAnalysis = {
          tokenScore: analyzeTokenFlow(segment).totalScore,
          sentenceScore: analyzeSentencePatterns(segment).totalScore,
          conceptScore: analyzeConceptFlow(segment).totalScore,
          structuralScore: analyzeStructuralConsistency(segment).totalScore
        };
        
        const segmentAiScore = (
          segmentAnalysis.tokenScore * 0.25 +
          segmentAnalysis.sentenceScore * 0.25 +
          segmentAnalysis.conceptScore * 0.25 +
          segmentAnalysis.structuralScore * 0.25
        );

        return {
          text: segment.trim(),
          isAI: segmentAiScore > 70,
          confidence: 
            segmentAiScore > 85 ? "High" :
            segmentAiScore > 70 ? "Medium" : "Low"
        };
      });

    return res.status(200).json({
      aiProbability: Math.round(aiScore),
      wordCount: text.split(/\s+/).length,
      characters: text.length,
      segments,
      metrics: {
        tokenFlow: tokenAnalysis.metrics,
        sentencePatterns: sentenceAnalysis.metrics,
        conceptFlow: conceptAnalysis.metrics,
        structural: structuralAnalysis.metrics,
        aiGenerated: Math.round(aiScore),
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
