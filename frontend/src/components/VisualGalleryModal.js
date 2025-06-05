/**
 * Visual Gallery Modal Component
 * 
 * Displays crime scene images and testimony visual scenes.
 * Extracted from main App.js for better maintainability.
 */

import React from 'react';

const SceneCard = ({ scene }) => (
  <div className="bg-purple-500/20 rounded-lg p-4">
    <img 
      src={scene.image_url} 
      alt={scene.title}
      className="w-full h-48 object-cover rounded-lg border-2 border-purple-400/50 mb-3"
      onError={(e) => {
        e.target.src = '/placeholder-image.png'; // Fallback image
        e.target.alt = 'Image failed to load';
      }}
    />
    <h4 className="text-purple-300 font-semibold mb-2">{scene.title}</h4>
    <p className="text-white text-sm mb-2">{scene.description}</p>
    {scene.character_involved && (
      <p className="text-purple-200 text-xs">
        <strong>Testimony by:</strong> {scene.character_involved}
      </p>
    )}
    <p className="text-gray-400 text-xs mt-2">
      Generated: {new Date(scene.timestamp).toLocaleString()}
    </p>
  </div>
);

const VisualGalleryModal = ({ isOpen, onClose, currentCase }) => {
  if (!isOpen) return null;

  const crimeSceneImageUrl = currentCase?.crime_scene_image_url;
  const visualScenes = currentCase?.visual_scenes || [];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
          🎬 Visual Investigation Gallery
        </h2>
        
        {/* Crime Scene Image */}
        {crimeSceneImageUrl && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-red-300 mb-3">🏛️ Crime Scene</h3>
            <div className="bg-red-500/20 rounded-lg p-4">
              <img 
                src={crimeSceneImageUrl} 
                alt="Crime Scene"
                className="w-full max-h-80 object-cover rounded-lg border-2 border-red-400/50 mb-3"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div style={{display: 'none'}} className="text-red-300 text-center py-4">
                Crime scene image failed to load
              </div>
              <p className="text-white text-sm">{currentCase?.crime_scene_description}</p>
            </div>
          </div>
        )}
        
        {/* Testimony Visual Scenes */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-purple-300 mb-3">
            📸 Testimony Scenes ({visualScenes.length})
          </h3>
          {visualScenes.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visualScenes.map((scene) => (
                <SceneCard key={scene.id} scene={scene} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg mb-4">No testimony scenes generated yet.</p>
              <p className="text-gray-500 text-sm">
                Ask suspects descriptive questions like "What did you see?" to generate visual scenes from their testimony.
              </p>
            </div>
          )}
        </div>
        
        {/* Close Modal */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            ❌ Close Gallery
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisualGalleryModal;