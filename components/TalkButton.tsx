'use client';
import React, { useState } from 'react';
import {
  startMic,
  stopMic,
  setGainLevel,
  setDelayTime,
  setFilterType,
  setFilterFrequency,
  setPitch,
} from './audioEngine';
import SignalChain from './SignalChain';

export default function TalkButton() {
  const [isTalking, setIsTalking] = useState(false);
  const [gain, setGain] = useState(1.0);
  const [delay, setDelay] = useState(0.2);
  const [filterType, setType] = useState<'lowpass' | 'highpass'>('lowpass');
  const [cutoff, setCutoff] = useState(20000);
  const [pitch, setPitchValue] = useState(1.0);

  const handleClick = async () => {
    if (isTalking) {
      stopMic();
      setIsTalking(false);
    } else {
      try {
        await startMic();
        setIsTalking(true);
      } catch (err) {
        alert('Mic access denied');
        console.error(err);
      }
    }
  };

  const handleGainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setGain(value);
    setGainLevel(value);
  };

  const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setDelay(value);
    setDelayTime(value);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as 'lowpass' | 'highpass';
    setType(type);
    setFilterType(type);
  };

  const handleCutoffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setCutoff(value);
    setFilterFrequency(value);
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setPitchValue(value);
    setPitch(value); // Use the improved setPitch function
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 min-h-screen">
      <div className="flex flex-col items-center space-y-6">
        
        {/* Main Talk Button */}
        <button
          onClick={handleClick}
          className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
            isTalking 
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20' 
              : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20'
          } text-white`}
        >
          {isTalking ? '🛑 Stop Recording' : '🎤 Start Recording'}
        </button>

        {/* Signal Chain Visualization */}
        <SignalChain isActive={isTalking} />

        {/* Audio Controls */}
        {isTalking && (
          <div className="w-full max-w-2xl bg-gray-800 rounded-lg p-6 space-y-6">
            <h3 className="text-lg font-semibold text-white mb-4">Audio Controls</h3>
            
            {/* Gain Control */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Gain: {gain.toFixed(2)}x
              </label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.01"
                value={gain}
                onChange={handleGainChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Delay Control */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Delay: {delay.toFixed(2)}s
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={delay}
                onChange={handleDelayChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Filter Type
                </label>
                <select 
                  value={filterType} 
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="lowpass">Low-pass</option>
                  <option value="highpass">High-pass</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Filter Frequency: {cutoff.toLocaleString()} Hz
                </label>
                <input
                  type="range"
                  min="100"
                  max="20000"
                  step="10"
                  value={cutoff}
                  onChange={handleCutoffChange}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>

            {/* Pitch Control */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Pitch: {pitch.toFixed(2)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.01"
                value={pitch}
                onChange={handlePitchChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0.5x (Lower)</span>
                <span>1.0x (Normal)</span>
                <span>2.0x (Higher)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          background: #00f2ff;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          background: #00f2ff;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}