/**
 * Character Interaction Component
 * 
 * Handles questioning suspects and displaying conversation history.
 * Extracted from main App.js for better maintainability.
 */

import React from 'react';

const CharacterInteraction = ({ 
  character, 
  conversations, 
  question, 
  setQuestion, 
  onQuestionSubmit, 
  loading,
  isActive,
  onClick 
}) => {
  if (!character) return null;

  const characterConversations = conversations[character.id] || [];
  const isNewCharacter = character.is_dynamic;

  return (
    <div 
      className={`bg-orange-500/20 rounded-lg p-4 cursor-pointer transition-all ${
        isActive ? 'ring-2 ring-orange-400 bg-orange-500/30' : 'hover:bg-orange-500/30'
      } ${isNewCharacter ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-orange-300">{character.name}</h3>
        {isNewCharacter && (
          <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded font-bold">
            NEW LEAD
          </span>
        )}
      </div>
      
      <p className="text-white text-sm mb-2">{character.description}</p>
      <p className="text-orange-200 text-xs"><strong>Background:</strong> {character.background}</p>
      <p className="text-orange-200 text-xs"><strong>Alibi:</strong> {character.alibi}</p>
      {character.motive && (
        <p className="text-red-300 text-xs mt-2"><strong>Possible Motive:</strong> {character.motive}</p>
      )}
      
      {/* Question Interface - appears only for selected character */}
      {isActive && (
        <div className="mt-4 bg-black/30 rounded-lg p-4 border border-orange-400/30">
          <h4 className="text-md font-semibold text-white mb-3 flex items-center">
            💬 Question {character.name}
          </h4>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything... (e.g., 'Where were you at 9pm?' or 'What did you think of the victim?')"
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 text-sm"
              onKeyPress={(e) => e.key === 'Enter' && !loading && question.trim() && onQuestionSubmit()}
              disabled={loading}
            />
            <button
              onClick={onQuestionSubmit}
              disabled={loading || !question.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {loading ? '💭' : 'Ask'}
            </button>
          </div>
          
          {/* Show conversation history for this character */}
          {characterConversations.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-orange-300">Conversation:</h5>
              {characterConversations.map((conv, idx) => (
                <div key={idx} className="bg-black/40 rounded p-3 text-sm">
                  <p className="text-yellow-300 mb-1"><strong>You:</strong> {conv.question}</p>
                  <p className="text-white"><strong>{character.name}:</strong> {conv.response}</p>
                  <p className="text-gray-400 text-xs mt-1">{conv.timestamp}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CharacterInteraction;