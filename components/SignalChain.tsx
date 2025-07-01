'use client';
import React, { useEffect, useState, useCallback } from 'react';
import MicVisualizer from './MicVisualizer';
import { audioContext, micStream } from './audioEngine';

interface SignalChainProps {
  isActive: boolean; // Pass this from parent component
}

export default function SignalChain({ isActive }: SignalChainProps) {
  const [currentAudioContext, setCurrentAudioContext] = useState<AudioContext | null>(null);
  const [currentMicStream, setCurrentMicStream] = useState<AudioNode | null>(null);
  const [signalStrength, setSignalStrength] = useState(0);

  // Poll for audio context and mic stream changes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAudioContext(audioContext);
      setCurrentMicStream(micStream);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Monitor signal strength
  useEffect(() => {
    if (!currentAudioContext || !currentMicStream) return;

    const analyser = currentAudioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    
    // Connect to analyser without affecting main audio chain
    currentMicStream.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const measureSignal = () => {
      analyser.getByteTimeDomainData(dataArray);
      
      // Calculate RMS (Root Mean Square) for signal strength
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      setSignalStrength(rms);
    };

    const intervalId = setInterval(measureSignal, 100);

    return () => {
      clearInterval(intervalId);
      analyser.disconnect();
    };
  }, [currentAudioContext, currentMicStream]);

  const getNodeStyle = useCallback((isSignalActive: boolean) => {
    return `
      px-3 py-2 rounded-lg border-2 transition-all duration-200 min-w-[80px] text-center
      ${isSignalActive && signalStrength > 0.01 
        ? 'border-cyan-400 bg-cyan-900/20 shadow-lg shadow-cyan-400/20' 
        : 'border-gray-600 bg-gray-800'
      }
    `;
  }, [signalStrength]);

  const nodes = [
    { id: 'mic', label: '🎤 Mic', emoji: '🎤' },
    { id: 'gain', label: '🔊 Gain', emoji: '🔊' },
    { id: 'reverb', label: '🎛️ Reverb', emoji: '🎛️' },
    { id: 'delay', label: '⏱️ Delay', emoji: '⏱️' },
    { id: 'filter', label: '🎚️ Filter', emoji: '🎚️' },
    { id: 'pitch', label: '🎵 Pitch', emoji: '🎵' },
    { id: 'output', label: '📢 Output', emoji: '📢' },
  ];

  return (
    <div className="w-full p-4 bg-gray-900 rounded-lg">
      <h2 className="text-lg font-semibold mb-4 text-white">Audio Signal Chain</h2>
      
      {/* Visualizer */}
      <MicVisualizer 
        audioContext={currentAudioContext} 
        sourceNode={currentMicStream} 
      />
      
      {/* Signal strength indicator */}
      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-1">Signal Strength</div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-cyan-400 h-2 rounded-full transition-all duration-100"
            style={{ width: `${Math.min(signalStrength * 100 * 5, 100)}%` }}
          />
        </div>
      </div>

      {/* Signal Chain Visualization */}
      <div className="space-y-4">
        <div className="text-sm text-gray-400 mb-2">Audio Processing Chain</div>
        
        {/* Desktop view - horizontal */}
        <div className="hidden md:flex items-center justify-between space-x-2">
          {nodes.map((node, index) => (
            <React.Fragment key={node.id}>
              <div className={getNodeStyle(isActive)}>
                <div className="text-lg mb-1">{node.emoji}</div>
                <div className="text-xs text-gray-300">{node.label.split(' ')[1]}</div>
              </div>
              {index < nodes.length - 1 && (
                <div className="flex-1 h-0.5 bg-gray-600 relative">
                  {isActive && signalStrength > 0.01 && (
                    <div className="absolute inset-0 bg-cyan-400 rounded animate-pulse" />
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Mobile view - vertical */}
        <div className="md:hidden space-y-2">
          {nodes.map((node, index) => (
            <React.Fragment key={node.id}>
              <div className={`${getNodeStyle(isActive)} flex items-center space-x-3`}>
                <span className="text-lg">{node.emoji}</span>
                <span className="text-sm">{node.label}</span>
              </div>
              {index < nodes.length - 1 && (
                <div className="w-0.5 h-4 bg-gray-600 ml-6 relative">
                  {isActive && signalStrength > 0.01 && (
                    <div className="absolute inset-0 bg-cyan-400 rounded animate-pulse" />
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="mt-4 text-sm text-gray-400">
        Status: {isActive ? (
          <span className="text-green-400">🟢 Active</span>
        ) : (
          <span className="text-red-400">🔴 Inactive</span>
        )}
      </div>
    </div>
  );
}