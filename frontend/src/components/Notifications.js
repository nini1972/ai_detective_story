/**
 * Notification Components
 * 
 * Handles different types of notifications in the game.
 * Extracted from main App.js for better maintainability.
 */

import React from 'react';

export const VisualSceneNotification = ({ notification, onDismiss }) => (
  <div className="bg-purple-500/20 border-l-4 border-purple-500 rounded-lg p-4 animate-fadeInUp">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-purple-300 mb-2 flex items-center">
          🎬 Visual Scene Generated!
        </h3>
        <p className="text-white mb-2">
          <strong>{notification.character}</strong> described a scene that has been visualized
        </p>
        <div className="flex gap-4 items-center">
          <img 
            src={notification.scene.image_url} 
            alt={notification.scene.title}
            className="w-24 h-18 object-cover rounded border-2 border-purple-400"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div>
            <p className="text-purple-200 text-sm italic">"{notification.scene.description}"</p>
            <p className="text-gray-300 text-sm mt-1">Added to Visual Gallery</p>
          </div>
        </div>
      </div>
      <button
        onClick={() => onDismiss(notification.id)}
        className="text-purple-400 hover:text-purple-300 text-xl ml-4"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  </div>
);

export const CharacterDiscoveryNotification = ({ notification, onDismiss }) => (
  <div className="bg-yellow-500/20 border-l-4 border-yellow-500 rounded-lg p-4 animate-fadeInUp">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-lg font-semibold text-yellow-300 mb-2 flex items-center">
          🔍 New Lead Discovered!
        </h3>
        <p className="text-white mb-2">
          <strong>{notification.discoveredThrough}</strong> mentioned: <strong>{notification.character.name}</strong>
        </p>
        <p className="text-yellow-200 text-sm italic">"{notification.context}"</p>
        <p className="text-gray-300 text-sm mt-2">
          {notification.character.name} is now available for questioning below.
        </p>
      </div>
      <button
        onClick={() => onDismiss(notification.id)}
        className="text-yellow-400 hover:text-yellow-300 text-xl"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  </div>
);

export const NotificationContainer = ({ 
  visualNotifications, 
  characterNotifications, 
  onDismissVisual, 
  onDismissCharacter 
}) => {
  if (visualNotifications.length === 0 && characterNotifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3" role="alert" aria-live="polite">
      {visualNotifications.map((notification) => (
        <VisualSceneNotification
          key={notification.id}
          notification={notification}
          onDismiss={onDismissVisual}
        />
      ))}
      {characterNotifications.map((notification) => (
        <CharacterDiscoveryNotification
          key={notification.id}
          notification={notification}
          onDismiss={onDismissCharacter}
        />
      ))}
    </div>
  );
};