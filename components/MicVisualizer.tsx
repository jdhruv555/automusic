import { useEffect, useRef } from 'react';

interface MicVisualizerProps {
  audioContext: AudioContext | null;
  sourceNode: AudioNode | null;
}

export default function MicVisualizer({ audioContext, sourceNode }: MicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationIdRef = useRef<number>();

  useEffect(() => {
    if (!audioContext || !sourceNode || !canvasRef.current) return;

    // Create analyser node
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    
    // Connect source to analyser (analyser doesn't affect the main audio chain)
    sourceNode.connect(analyser);
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      if (!analyserRef.current || !ctx || !canvas) return;

      animationIdRef.current = requestAnimationFrame(draw);
      
      // Get time domain data for waveform
      analyserRef.current.getByteTimeDomainData(dataArray);
      
      // Clear canvas
      ctx.fillStyle = 'rgb(10, 10, 10)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00f2ff';
      ctx.beginPath();
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();
      
      // Draw center line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }

    draw();

    // Cleanup function
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
    };
  }, [audioContext, sourceNode]);

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium mb-2 text-gray-300">Audio Waveform</h3>
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={80} 
        className="rounded border border-gray-600 bg-black w-full" 
      />
    </div>
  );
}