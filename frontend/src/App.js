/**
 * Dual-AI Detective Game - Main React Component
 * 
 * This component implements the frontend for the world's first dual-AI detective game.
 * Features include:
 * - Dynamic character discovery through AI conversation analysis
 * - Real-time visual scene generation from testimony
 * - Dual-AI integration (OpenAI + Claude) for storytelling and logic
 * - Complete save/load game state management
 * - Auto-refresh system for visual content updates
 * 
 * Author: AI-Generated (Claude-3.5-Sonnet) with human guidance
 * License: Proprietary
 */

import React, { useState, useEffect } from 'react';
import './App.css';

// Component imports
import CharacterInteraction from './components/CharacterInteraction';
import EvidenceBoard from './components/EvidenceBoard';
import { NotificationContainer } from './components/Notifications';
import EvidenceBoard from './components/EvidenceBoard';
import VisualGalleryModal from './components/VisualGalleryModal';

// Backend URL from environment variables with fallback for development
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

/**
 * Utility function for handling API responses with better error handling
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} - Parsed JSON response
 */
const handleApiResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.text();
      if (errorData) {
        errorMessage = errorData;
      }
    } catch (e) {
      // If we can't parse error, use default message
    }
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  
  // Defensive validation - ensure response has expected structure
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response format from server');
  }
  
  return data;
};

/**
 * Utility function to safely get nested object properties
 * @param {Object} obj - Object to access
 * @param {string} path - Dot notation path (e.g., 'user.profile.name')
 * @param {*} defaultValue - Default value if path doesn't exist
 * @returns {*} - Value at path or default value
 */
const safeGet = (obj, path, defaultValue = null) => {
  try {
    return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

function App() {
  // Core game state
  const [currentCase, setCurrentCase] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Investigation state
  const [activeCharacter, setActiveCharacter] = useState(null);
  const [question, setQuestion] = useState('');
  const [conversations, setConversations] = useState({});
  const [selectedEvidence, setSelectedEvidence] = useState([]);
  const [theory, setTheory] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [investigationNotes, setInvestigationNotes] = useState('');
  
  // UI state
  const [gameState, setGameState] = useState('menu'); // menu, playing, analysis
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  
  // Revolutionary features state
  const [newCharacterNotifications, setNewCharacterNotifications] = useState([]); // Dynamic character discovery
  const [visualSceneNotifications, setVisualSceneNotifications] = useState([]); // AI visual generation
  const [showVisualGallery, setShowVisualGallery] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState(new Set());
  
  // Save/load game state
  const [savedGames, setSavedGames] = useState([]);

  // Load saved games from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('detective_saved_games');
    if (saved) {
      try {
        const parsedSaves = JSON.parse(saved);
        setSavedGames(parsedSaves);
      } catch (error) {
        console.error('Error parsing saved games:', error);
        localStorage.removeItem('detective_saved_games'); // Clear corrupted data
      }
    }
  }, []);

  // Save current game state
  const saveGame = (saveName) => {
    if (!currentCase) {
      alert('No active case to save!');
      return;
    }

    try {
      const gameData = {
        id: Date.now().toString(),
        name: saveName || `Case: ${currentCase.title}`,
        timestamp: new Date().toLocaleString(),
        currentCase,
        sessionId,
        conversations,
        investigationNotes,
        selectedEvidence,
        theory,
        analysis,
        gameState
      };

      const updatedSaves = [...savedGames, gameData];
      
      // Update localStorage first
      localStorage.setItem('detective_saved_games', JSON.stringify(updatedSaves));
      
      // Then update state
      setSavedGames(updatedSaves);
      
      alert(`✅ Game saved successfully as: ${gameData.name}`);
      setShowSaveLoad(false);
      
      console.log('Game saved:', gameData.name);
      console.log('Total saves:', updatedSaves.length);
    } catch (error) {
      console.error('Error saving game:', error);
      alert('❌ Failed to save game. Please try again.');
    }
  };

  // Load a saved game
  const loadGame = (saveData) => {
    try {
      setCurrentCase(saveData.currentCase);
      setSessionId(saveData.sessionId);
      setConversations(saveData.conversations || {});
      setInvestigationNotes(saveData.investigationNotes || '');
      setSelectedEvidence(saveData.selectedEvidence || []);
      setTheory(saveData.theory || '');
      setAnalysis(saveData.analysis || '');
      setGameState(saveData.gameState || 'playing');
      setShowSaveLoad(false);
      
      alert(`✅ Loaded: ${saveData.name}`);
      console.log('Game loaded:', saveData.name);
    } catch (error) {
      console.error('Error loading game:', error);
      alert('❌ Failed to load game. Please try again.');
    }
  };

  // Function to refresh case data and check for new images
  const refreshCaseData = async () => {
    if (!currentCase?.id) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/cases/${currentCase.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const updatedCase = data.case;
        
        // Check if crime scene image was added
        if (!currentCase.crime_scene_image_url && updatedCase.crime_scene_image_url) {
          console.log('Crime scene image now available:', updatedCase.crime_scene_image_url);
          setCurrentCase(prev => ({
            ...prev,
            crime_scene_image_url: updatedCase.crime_scene_image_url
          }));
        }
        
        // Check if new visual scenes were added
        const currentScenesCount = (currentCase.visual_scenes || []).length;
        const updatedScenesCount = (updatedCase.visual_scenes || []).length;
        
        if (updatedScenesCount > currentScenesCount) {
          console.log('New visual scenes detected:', updatedScenesCount - currentScenesCount);
          setCurrentCase(prev => ({
            ...prev,
            visual_scenes: updatedCase.visual_scenes || []
          }));
        }
      }
    } catch (error) {
      console.error('Error refreshing case data:', error);
    }
  };

  // Auto-refresh case data when there's no crime scene image
  useEffect(() => {
    if (currentCase?.id && !currentCase.crime_scene_image_url) {
      console.log('Starting auto-refresh for crime scene image...');
      const interval = setInterval(refreshCaseData, 10000); // Check every 10 seconds
      
      // Stop checking after 2 minutes
      const timeout = setTimeout(() => {
        clearInterval(interval);
        console.log('Stopped auto-refresh for crime scene image');
      }, 120000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [currentCase?.id, currentCase?.crime_scene_image_url]);

  // Delete a saved game
  const deleteSave = (saveId) => {
    if (window.confirm('Are you sure you want to delete this saved game?')) {
      try {
        const updatedSaves = savedGames.filter(save => save.id !== saveId);
        localStorage.setItem('detective_saved_games', JSON.stringify(updatedSaves));
        setSavedGames(updatedSaves);
        console.log('Game deleted, remaining saves:', updatedSaves.length);
      } catch (error) {
        console.error('Error deleting save:', error);
        alert('❌ Failed to delete save. Please try again.');
      }
    }
  };

  const generateNewCase = async () => {
    setLoading(true);
    console.log('Starting case generation...');
    console.log('Backend URL:', BACKEND_URL);
    
    try {
      console.log('Making API call to:', `${BACKEND_URL}/api/generate-case`);
      
      const response = await fetch(`${BACKEND_URL}/api/generate-case`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response received:', response.status, response.statusText);
      
      // Use improved error handling
      const data = await handleApiResponse(response);
      console.log('Case data received:', data);
      
      // Defensive validation of case data
      const caseData = safeGet(data, 'case');
      const sessionId = safeGet(data, 'session_id');
      
      if (!caseData || !caseData.id) {
        throw new Error('Invalid case data received from server');
      }
      
      console.log('Setting case state...');
      setCurrentCase(caseData);
      setSessionId(sessionId);
      setGameState('playing');
      setConversations({});
      setSelectedEvidence([]);
      setTheory('');
      setAnalysis('');
      setInvestigationNotes('');
      setShowContextPanel(false);
      
      console.log('Case generation completed successfully!');
      
    } catch (error) {
      console.error('Error generating case:', error);
      alert(`Failed to generate new case: ${error.message}`);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const questionCharacter = async () => {
    if (!question.trim() || !activeCharacter) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/question-character`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          case_id: currentCase.id,
          character_id: activeCharacter.id,
          question: question.trim()
        }),
      });
      
      // Use improved error handling
      const data = await handleApiResponse(response);
      
      // Defensive validation
      const characterName = safeGet(data, 'character_name') || activeCharacter.name;
      const response_text = safeGet(data, 'response', 'No response received');
      
      // Add to conversations
      const charId = activeCharacter.id;
      setConversations(prev => ({
        ...prev,
        [charId]: [
          ...(prev[charId] || []),
          {
            question: question.trim(),
            response: response_text,
            timestamp: new Date().toLocaleTimeString()
          }
        ]
      }));
      
      // Handle dynamic character discovery with improved validation
      const newCharactersDiscovered = safeGet(data, 'new_characters_discovered', []);
      if (Array.isArray(newCharactersDiscovered) && newCharactersDiscovered.length > 0) {
        // Update the current case with new characters
        setCurrentCase(prev => ({
          ...prev,
          characters: [...prev.characters, ...newCharactersDiscovered.map(discovery => safeGet(discovery, 'character')).filter(Boolean)]
        }));
        
        // Show notifications for new characters
        const notifications = newCharactersDiscovered.map(discovery => ({
          id: Date.now() + Math.random(),
          character: safeGet(discovery, 'character'),
          discoveredThrough: safeGet(discovery, 'discovered_through', 'Unknown'),
          context: safeGet(discovery, 'context', ''),
          timestamp: Date.now()
        })).filter(notif => notif.character);
        
        setNewCharacterNotifications(prev => [...prev, ...notifications]);
        
        // Auto-dismiss notifications after 10 seconds
        setTimeout(() => {
          setNewCharacterNotifications(prev => 
            prev.filter(notification => 
              !notifications.some(newNotif => newNotif.id === notification.id)
            )
          );
        }, 10000);
      }
      
      // Handle visual scene generation with improved validation
      const visualSceneGenerated = safeGet(data, 'visual_scene_generated');
      if (visualSceneGenerated) {
        // Update current case with new visual scene
        setCurrentCase(prev => ({
          ...prev,
          visual_scenes: [...(prev.visual_scenes || []), visualSceneGenerated]
        }));
        
        // Show visual scene notification
        const sceneNotification = {
          id: Date.now() + Math.random(),
          scene: visualSceneGenerated,
          character: characterName,
          timestamp: Date.now()
        };
        
        setVisualSceneNotifications(prev => [...prev, sceneNotification]);
        
        // Auto-dismiss after 8 seconds
        setTimeout(() => {
          setVisualSceneNotifications(prev => 
            prev.filter(n => n.id !== sceneNotification.id)
          );
        }, 8000);
      }
      
      setQuestion('');
    } catch (error) {
      console.error('Error questioning character:', error);
      alert(`Failed to question character: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const analyzeEvidence = async () => {
    if (!theory.trim() || selectedEvidence.length === 0) {
      alert('Please select evidence and provide a theory to analyze.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze-evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          case_id: currentCase.id,
          evidence_ids: selectedEvidence,
          theory: theory.trim()
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze evidence');
      }
      
      const data = await response.json();
      setAnalysis(data.analysis);
      setGameState('analysis');
    } catch (error) {
      console.error('Error analyzing evidence:', error);
      alert('Failed to analyze evidence. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleEvidenceSelection = (evidenceId) => {
    setSelectedEvidence(prev => 
      prev.includes(evidenceId) 
        ? prev.filter(id => id !== evidenceId)
        : [...prev, evidenceId]
    );
  };

  if (gameState === 'menu' || !currentCase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Hero Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1652985808809-08b53267628b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwyfHxub2lyJTIwZGV0ZWN0aXZlfGVufDB8fHx8MTc0ODU5MDIxOHww&ixlib=rb-4.1.0&q=85)'
          }}
        />
        <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4 tracking-wide gradient-text">
              🕵️ DUAL-AI DETECTIVE
            </h1>
            <p className="text-xl text-blue-200 mb-8 max-w-3xl mx-auto">
              Experience the world's first detective game powered by TWO AI systems working together. 
              OpenAI creates the story, Claude analyzes the logic. Every case is unique.
            </p>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 max-w-4xl mx-auto mb-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">🚀 Revolutionary Features</h2>
              <div className="grid md:grid-cols-2 gap-6 text-left">
                <div className="bg-blue-500/20 rounded-lg p-4 hover-glow">
                  <h3 className="text-lg font-semibold text-blue-300 mb-2">🎭 Storyteller AI (OpenAI)</h3>
                  <p className="text-blue-100">Creates rich narratives, develops characters, and brings suspects to life in natural conversations</p>
                </div>
                <div className="bg-purple-500/20 rounded-lg p-4 hover-glow">
                  <h3 className="text-lg font-semibold text-purple-300 mb-2">🧠 Logic AI (Claude)</h3>
                  <p className="text-purple-100">Analyzes evidence, detects contradictions, and provides logical deduction assistance</p>
                </div>
                <div className="bg-green-500/20 rounded-lg p-4 hover-glow">
                  <h3 className="text-lg font-semibold text-green-300 mb-2">🎲 Dynamic Cases</h3>
                  <p className="text-green-100">Every mystery is procedurally generated with unique characters, evidence, and solutions</p>
                </div>
                <div className="bg-orange-500/20 rounded-lg p-4 hover-glow">
                  <h3 className="text-lg font-semibold text-orange-300 mb-2">💬 Natural Investigation</h3>
                  <p className="text-orange-100">Ask suspects anything using natural language - no limited dialogue trees</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={generateNewCase}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 btn-primary shadow-lg relative overflow-hidden"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="loading-spinner mr-3"></div>
                  🔮 Dual-AI Creating Your Mystery...
                </span>
              ) : '🎯 Start New Investigation'}
            </button>
            
            <div className="flex gap-4 mt-6 justify-center">
              <button
                onClick={() => setShowSaveLoad(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                💾 Load Saved Game
              </button>
            </div>
            
            {loading && (
              <div className="mt-6 bg-blue-500/20 backdrop-blur-md rounded-lg p-6 border border-blue-400/30">
                <div className="text-center">
                  <div className="loading-spinner mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">🤖 Dual-AI System Working...</h3>
                  <div className="space-y-2 text-blue-200">
                    <p>🎭 <strong>Storyteller AI (OpenAI)</strong> is crafting your unique mystery...</p>
                    <p>🧠 <strong>Logic AI (Claude)</strong> is ensuring all clues connect perfectly...</p>
                    <p className="text-sm text-blue-300 mt-3">This may take 10-30 seconds for the best experience</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-12 text-center">
              <h3 className="text-lg font-semibold text-white mb-4">🎮 What Makes This Special?</h3>
              <div className="flex justify-center space-x-8 text-sm">
                <div className="ai-badge storyteller">
                  <span>🎭</span> Storyteller AI
                </div>
                <div className="text-white">+</div>
                <div className="ai-badge logic">
                  <span>🧠</span> Logic AI
                </div>
                <div className="text-white">=</div>
                <div className="text-yellow-300 font-bold">Revolutionary Experience</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Save/Load Modal for Homepage */}
        {showSaveLoad && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
                💾 Load Saved Games
              </h2>
              
              {/* Load Saved Games */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-blue-300 mb-3">Your Saved Investigations</h3>
                {savedGames.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-lg mb-4">No saved games found.</p>
                    <p className="text-gray-500 text-sm">Start a new investigation and save your progress to see saved games here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedGames.map((save) => (
                      <div key={save.id} className="bg-blue-500/20 rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-semibold">{save.name}</h4>
                          <p className="text-gray-300 text-sm">Saved: {save.timestamp}</p>
                          <p className="text-blue-300 text-xs">
                            Progress: {Object.keys(save.conversations).length} conversations, 
                            {save.investigationNotes.length} chars in notes
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => loadGame(save)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded transition-colors text-sm"
                          >
                            📂 Load
                          </button>
                          <button
                            onClick={() => deleteSave(save.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded transition-colors text-sm"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Close Modal */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowSaveLoad(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  ❌ Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'analysis') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8 min-h-screen">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
              🧠 Logic AI Analysis
            </h2>
            
            <div className="bg-purple-500/20 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-purple-300 mb-3">Your Theory:</h3>
              <p className="text-white bg-black/20 rounded p-3">{theory}</p>
            </div>
            
            <div className="bg-blue-500/20 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-blue-300 mb-3">Claude's Analysis:</h3>
              <div className="text-white whitespace-pre-wrap bg-black/20 rounded p-4">
                {analysis}
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => setGameState('playing')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                ← Continue Investigation
              </button>
              <button
                onClick={() => setGameState('menu')}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                🏠 New Case
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      <div className="container mx-auto px-4 py-8 min-h-screen">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{currentCase.title}</h1>
          <p className="text-orange-200 text-lg">{currentCase.setting}</p>
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => setGameState('menu')}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              🏠 New Case
            </button>
            <button
              onClick={() => setShowSaveLoad(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              💾 Save/Load Game
            </button>
            <button
              onClick={() => setShowVisualGallery(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              🎬 Visual Gallery ({(currentCase.visual_scenes || []).length})
            </button>
            <button
              onClick={() => setShowContextPanel(!showContextPanel)}
              className={`font-bold py-2 px-4 rounded-lg transition-colors ${
                showContextPanel 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {showContextPanel ? '📋 Hide Detective Info' : '📋 Show Detective Info'}
            </button>
          </div>
        </div>

        {/* Context Panel - Shows all case info for reference while questioning */}
        {showContextPanel && (
          <div className="mb-8 bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-600">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              📋 Detective Reference Panel
            </h2>
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Quick Suspect Reference */}
              <div>
                <h3 className="text-lg font-semibold text-blue-300 mb-3">👥 All Suspects</h3>
                <div className="space-y-2 text-sm">
                  {currentCase.characters.map((char) => (
                    <div key={char.id} className="bg-blue-500/10 rounded p-2">
                      <strong className="text-blue-300">{char.name}</strong>: {char.description}
                      {char.motive && <div className="text-red-300">Motive: {char.motive}</div>}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Quick Evidence Reference */}
              <div>
                <h3 className="text-lg font-semibold text-green-300 mb-3">🔍 All Evidence</h3>
                <div className="space-y-2 text-sm">
                  {currentCase.evidence.map((ev) => (
                    <div key={ev.id} className="bg-green-500/10 rounded p-2">
                      <strong className="text-green-300">{ev.name}</strong>: {ev.description}
                      <div className="text-gray-300">Found: {ev.location_found}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Crime Scene & Characters */}
          <div className="lg:col-span-2 space-y-6">
            {/* Notifications Container */}
            <NotificationContainer
              visualNotifications={visualSceneNotifications}
              characterNotifications={newCharacterNotifications}
              onDismissVisual={(id) => setVisualSceneNotifications(prev => prev.filter(n => n.id !== id))}
              onDismissCharacter={(id) => setNewCharacterNotifications(prev => prev.filter(n => n.id !== id))}
            />

            {/* Crime Scene */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                🕵️ Crime Scene
              </h2>
              {currentCase.crime_scene_image_url && (
                <div className="mb-4">
                  <img 
                    src={currentCase.crime_scene_image_url} 
                    alt="Crime Scene"
                    className="w-full h-64 object-cover rounded-lg border-2 border-red-400/50"
                    onLoad={() => console.log('Crime scene image loaded successfully')}
                    onError={(e) => console.error('Crime scene image failed to load:', e.target.src)}
                  />
                </div>
              )}
              {!currentCase.crime_scene_image_url && (
                <div className="mb-4 bg-blue-500/20 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-blue-300 text-sm">🎨 Crime scene image is being generated by AI... This may take 30-60 seconds.</p>
                      <p className="text-blue-200 text-xs mt-2">The page will automatically update when ready, or you can refresh manually.</p>
                    </div>
                    <button
                      onClick={refreshCaseData}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      🔄 Check Now
                    </button>
                  </div>
                </div>
              )}
              <div className="bg-red-500/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-300 mb-2">Victim: {currentCase.victim_name}</h3>
                <p className="text-white">{currentCase.crime_scene_description}</p>
              </div>
            </div>

            {/* Characters */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                👥 Suspects & Persons of Interest
                <span className="ml-3 text-sm bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                  {currentCase.characters.length} Total
                </span>
              </h2>
              <div className="grid gap-4">
                {currentCase.characters.map((character) => (
                  <CharacterInteraction
                    key={character.id}
                    character={character}
                    conversations={conversations}
                    question={question}
                    setQuestion={setQuestion}
                    onQuestionSubmit={questionCharacter}
                    loading={loading}
                    isActive={activeCharacter?.id === character.id}
                    onClick={() => setActiveCharacter(character)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Evidence & Analysis Panel */}
          <div className="space-y-6">
            {/* Detective Notebook */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                📝 Detective Notebook
              </h2>
              <p className="text-gray-300 text-sm mb-3">
                Keep track of your findings, suspicions, and connections. This is your private notepad.
              </p>
              <textarea
                value={investigationNotes}
                onChange={(e) => setInvestigationNotes(e.target.value)}
                placeholder="Write your investigation notes here...
Example:
- Lady Margaret seemed nervous when asked about the insurance
- Dr. Harrison had access to the poison
- The butler was acting suspicious..."
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white placeholder-gray-400 text-sm h-40 resize-none"
              />
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-400">
                  {investigationNotes.length} characters
                </span>
                <button
                  onClick={() => setInvestigationNotes('')}
                  className="text-xs text-red-300 hover:text-red-400 transition-colors"
                >
                  Clear Notes
                </button>
              </div>
            </div>

            {/* Evidence */}
            <EvidenceBoard
              evidence={currentCase.evidence}
              selectedEvidence={selectedEvidence}
              onToggleEvidence={toggleEvidenceSelection}
            />

            {/* Theory Analysis */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">🧠 Final Theory Analysis</h2>
              <p className="text-gray-300 text-sm mb-3">
                When you're ready to test a complete theory, describe who did it and why. Claude will analyze the logic.
              </p>
              
              {selectedEvidence.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-blue-300 mb-2">Selected Evidence:</h3>
                  <div className="text-xs text-blue-200 bg-blue-500/10 rounded p-2">
                    {selectedEvidence.map(id => {
                      const evidence = currentCase.evidence.find(e => e.id === id);
                      return evidence ? evidence.name : '';
                    }).join(', ')}
                  </div>
                </div>
              )}
              
              <textarea
                value={theory}
                onChange={(e) => setTheory(e.target.value)}
                placeholder="My theory is that [suspect name] committed the murder because...

Include:
- Who did it
- How they did it  
- Why they did it
- How the evidence supports this"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 text-sm h-32 mb-4"
              />
              
              <button
                onClick={analyzeEvidence}
                disabled={loading || !theory.trim() || selectedEvidence.length === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? '🧠 Claude is Analyzing...' : '🔍 Analyze Theory with Logic AI'}
              </button>
              
              <p className="text-xs text-gray-400 mt-2">
                💡 Tip: Select evidence and write a complete theory for best analysis results
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Save/Load Modal */}
      {showSaveLoad && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
              💾 Save & Load Games
            </h2>
            
            {/* Save Current Game */}
            {currentCase && (
              <div className="mb-6 bg-green-500/20 rounded-lg p-4">
                <h3 className="text-xl font-semibold text-green-300 mb-3">Save Current Investigation</h3>
                <p className="text-gray-300 text-sm mb-3">Current case: {currentCase.title}</p>
                <button
                  onClick={() => {
                    const defaultName = `${currentCase.title} - ${new Date().toLocaleDateString()}`;
                    const saveName = window.prompt('Enter a name for this save:', defaultName);
                    if (saveName && saveName.trim()) {
                      saveGame(saveName.trim());
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  💾 Save Current Progress
                </button>
              </div>
            )}
            
            {/* Load Saved Games */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-blue-300 mb-3">Load Saved Games</h3>
              {savedGames.length === 0 ? (
                <p className="text-gray-400 text-sm">No saved games found.</p>
              ) : (
                <div className="space-y-3">
                  {savedGames.map((save) => (
                    <div key={save.id} className="bg-blue-500/20 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <h4 className="text-white font-semibold">{save.name}</h4>
                        <p className="text-gray-300 text-sm">Saved: {save.timestamp}</p>
                        <p className="text-blue-300 text-xs">
                          Progress: {Object.keys(save.conversations).length} conversations, 
                          {save.investigationNotes.length} chars in notes
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadGame(save)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded transition-colors text-sm"
                        >
                          📂 Load
                        </button>
                        <button
                          onClick={() => deleteSave(save.id)}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded transition-colors text-sm"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Close Modal */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowSaveLoad(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                ❌ Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Visual Gallery Modal */}
      <VisualGalleryModal
        isOpen={showVisualGallery}
        onClose={() => setShowVisualGallery(false)}
        currentCase={currentCase}
      />
    </div>
  );
}

export default App;