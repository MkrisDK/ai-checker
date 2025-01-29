// pages/index.js
import { useState } from 'react';

const MAX_WORDS = 2500;

export default function Home() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const wordCount = text.trim().split(/\s+/).length;

  const handleSubmit = async () => {
    if (wordCount > MAX_WORDS) {
      setResult({ error: `Please limit text to ${MAX_WORDS} words` });
      return;
    }

    if (wordCount < 50) {
      setResult({ error: "Please enter at least 50 words for accurate analysis" });
      return;
    }

    try {
      setIsAnalyzing(true);
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <span className="text-2xl font-bold">AI Detector</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-6">
              AI Text Detector
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Check if text was written by AI or human
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <textarea
              className="w-full h-48 p-6 text-lg text-gray-900 border-b focus:outline-none resize-none"
              placeholder={`Enter your text here... (50-${MAX_WORDS} words)`}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="p-4 flex justify-between items-center">
              <span className={`text-gray-500 ${wordCount > MAX_WORDS ? 'text-red-500' : ''}`}>
                {wordCount} / {MAX_WORDS} Words
              </span>
              <button
                onClick={handleSubmit}
                disabled={isAnalyzing || wordCount > MAX_WORDS || wordCount < 50}
                className={`px-8 py-3 rounded-full text-white transition-colors ${
                  isAnalyzing || wordCount > MAX_WORDS || wordCount < 50
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Text'}
              </button>
            </div>
          </div>

          {result?.error && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg">
              {result.error}
            </div>
          )}

          {result && !result.error && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column - Text Analysis */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="space-y-4">
                  {text.split('\n').map((paragraph, idx) => (
                    <p 
                      key={idx} 
                      className={`p-2 rounded ${
                        result.aiProbability > 75 ? 'bg-orange-100' : 'bg-green-100'
                      }`}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  {result.wordCount} Words | {result.characters} Characters
                </div>
              </div>

              {/* Right Column - Probability Breakdown */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="text-center mb-8">
                  <h2 className="text-6xl font-bold text-gray-900">
                    {result.aiProbability}%
                  </h2>
                  <p className="text-gray-600 mt-2">of text is likely AI</p>
                </div>

                {/* Probability Bar */}
                <div className="h-48 relative mb-8">
                  <div className="absolute inset-0 flex">
                    <div
                      className="bg-orange-400"
                      style={{ width: `${result.aiProbability}%` }}
                    />
                    <div
                      className="bg-gray-200"
                      style={{ width: `${100 - result.aiProbability}%` }}
                    />
                  </div>
                  <div className="absolute bottom-0 w-full flex justify-between text-sm text-gray-600">
                    <span>AI</span>
                    <span>Human</span>
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>AI-generated</span>
                    <span className="font-semibold">{result.aiProbability}%</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Human-written & AI-refined</span>
                    <span>{Math.floor((100 - result.aiProbability) * 0.4)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Human-written</span>
                    <span>{Math.floor((100 - result.aiProbability) * 0.6)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
