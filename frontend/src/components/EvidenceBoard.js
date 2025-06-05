/**
 * Evidence Board Component
 * 
 * Handles evidence display and selection.
 * Extracted from main App.js for better maintainability.
 */

import React from 'react';

const EvidenceItem = ({ evidence, isSelected, onToggle }) => (
  <div 
    className={`bg-blue-500/20 rounded-lg p-3 cursor-pointer transition-all ${
      isSelected ? 'ring-2 ring-blue-400 bg-blue-500/30' : 'hover:bg-blue-500/30'
    }`}
    onClick={() => onToggle(evidence.id)}
    role="button"
    tabIndex={0}
    onKeyPress={(e) => e.key === 'Enter' && onToggle(evidence.id)}
  >
    <div className="flex justify-between items-start mb-1">
      <h3 className="text-md font-semibold text-blue-300">{evidence.name}</h3>
      {isSelected && (
        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">SELECTED</span>
      )}
    </div>
    <p className="text-white text-sm mb-1">{evidence.description}</p>
    <p className="text-blue-200 text-xs"><strong>Found:</strong> {evidence.location_found}</p>
    <p className="text-blue-200 text-xs"><strong>Significance:</strong> {evidence.significance}</p>
    {evidence.is_key_evidence && (
      <span className="inline-block mt-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded">
        KEY EVIDENCE
      </span>
    )}
  </div>
);

const EvidenceBoard = ({ evidence = [], selectedEvidence = [], onToggleEvidence }) => {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">🔍 Evidence Board</h2>
        <div className="text-center py-8">
          <p className="text-gray-400">No evidence available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-4">🔍 Evidence Board</h2>
      <p className="text-gray-300 text-sm mb-3">
        Click evidence to add to your theory analysis. Selected items will be highlighted.
      </p>
      <div className="space-y-3">
        {evidence.map((evidenceItem) => (
          <EvidenceItem
            key={evidenceItem.id}
            evidence={evidenceItem}
            isSelected={selectedEvidence.includes(evidenceItem.id)}
            onToggle={onToggleEvidence}
          />
        ))}
      </div>
    </div>
  );
};

export default EvidenceBoard;