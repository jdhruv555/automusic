'use client';
import React, { useState, useCallback } from 'react';
import {
  startMic,
  stopMic,
  setGainLevel,
  setDelayTime,
  setFilterType,
  setFilterFrequency,
  setPitch,
} from './audioEngine';
import { startRecording, stopRecording, cleanup, isRecording } from './recorder';
import SignalChain from './SignalChain';

interface TranscriptionResponse {
  transcription?: string;
  text?: string;
  success?: boolean;
  error?: string;
}

export default function TalkButton() {
  const [isTalking, setIsTalking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gain, setGain] = useState(1.0);
  const [delay, setDelay] = useState(0.2);
  const [filterType, setType] = useState<'lowpass' | 'highpass'>('lowpass');
  const [cutoff, setCutoff] = useState(20000);
  const [pitch, setPitchValue] = useState(1.0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const handleStartRecording = useCallback(async () => {
    try {
      setError('');
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Start audio engine
      await startMic();
      
      // Start recording
      await startRecording(stream);
      
      setIsTalking(true);
      console.log('🎤 Recording started');
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording. Please check microphone permissions.');
      cleanup();
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (!isRecording()) {
      console.warn('No active recording to stop');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      // Stop recording and get audio blob
      const audioBlob = await stopRecording();
      
      // Stop audio engine
      stopMic();
      setIsTalking(false);

      console.log(`🎵 Recording stopped. Blob size: ${audioBlob.size} bytes`);

      if (audioBlob.size === 0) {
        setError('No audio recorded. Please try again.');
        return;
      }

      // Prepare form data for transcription
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      console.log('📤 Sending to transcription API...');

      // Send to transcription API
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status} ${response.statusText}`);
      }

      const data: TranscriptionResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const transcriptionText = data.transcription || data.text || '';
      
      if (transcriptionText) {
        setTranscript(transcriptionText);
        console.log('📄 Transcription:', transcriptionText);
      } else {
        setError('No transcription received. Please try speaking more clearly.');
      }

    } catch (error) {
      console.error('Transcription error:', error);
      setError(error instanceof Error ? error.message : 'Transcription failed');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleClick = useCallback(async () => {
    if (isProcessing) return; // Prevent clicks during processing

    if (isTalking) {
      await handleStopRecording();
    } else {
      await handleStartRecording();
    }
  }, [isTalking, isProcessing, handleStartRecording, handleStopRecording]);

  const handleGainChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setGain(value);
    setGainLevel(value);
  }, []);

  const handleDelayChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setDelay(value);
    setDelayTime(value);
  }, []);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as 'lowpass' | 'highpass';
    setType(type);
    setFilterType(type);
  }, []);

  const handleCutoffChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setCutoff(value);
    setFilterFrequency(value);
  }, []);

  const handlePitchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setPitchValue(value);
    setPitch(value);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setError('');
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 min-h-screen">
      <div className="flex flex-col items-center space-y-6">
        <button
          onClick={handleClick}
          disabled={isProcessing}
          className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            isProcessing
              ? 'bg-yellow-500 hover:bg-yellow-600 shadow-lg shadow-yellow-500/20'
              : isTalking 
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20' 
              : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20'
          } text-white`}
        >
          {isProcessing ? '⏳ Processing...' : isTalking ? '🛑 Stop Recording' : '🎤 Start Recording'}
        </button>

        <SignalChain isActive={isTalking} />

        {/* Error Display */}
        {error && (
          <div className="w-full max-w-2xl bg-red-900 border border-red-700 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-red-400 mr-2">⚠️</span>
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          </div>
        )}

        {isTalking && (
          <div className="w-full max-w-2xl bg-gray-800 rounded-lg p-6 space-y-6">
            <h3 className="text-lg font-semibold text-white mb-4">Audio Controls</h3>

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

        {/* Transcript Output */}
        {!isTalking && transcript && (
          <div className="w-full max-w-2xl mt-6 bg-gray-800 rounded-lg p-4 text-white">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-semibold">Transcription:</h3>
              <button
                onClick={clearTranscript}
                className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded border border-gray-600 hover:border-gray-500"
              >
                Clear
              </button>
            </div>
            <p className="text-sm text-gray-200 whitespace-pre-wrap">{transcript}</p>
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