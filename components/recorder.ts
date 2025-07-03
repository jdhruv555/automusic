// recorder.ts
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let currentStream: MediaStream | null = null;

export function startRecording(stream: MediaStream): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      recordedChunks = [];
      currentStream = stream;

      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        console.warn('audio/webm not supported, trying audio/mp4');
        if (!MediaRecorder.isTypeSupported('audio/mp4')) {
          console.warn('audio/mp4 not supported, using default');
        }
      }

      // Create MediaRecorder with fallback MIME types
      const options = MediaRecorder.isTypeSupported('audio/webm') 
        ? { mimeType: 'audio/webm' }
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? { mimeType: 'audio/mp4' }
        : {};

      mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        reject(new Error('Recording failed'));
      };

      mediaRecorder.onstart = () => {
        console.log('Recording started');
        resolve();
      };

      // Start recording with 1 second chunks
      mediaRecorder.start(1000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      reject(error);
    }
  });
}

export function stopRecording(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) {
      console.warn('No active recorder to stop');
      return resolve(new Blob([], { type: 'audio/webm' }));
    }

    const currentState = mediaRecorder.state;
    
    if (currentState === 'inactive') {
      console.warn('Recorder already inactive');
      const blob = new Blob(recordedChunks, { 
        type: mediaRecorder.mimeType || 'audio/webm' 
      });
      return resolve(blob);
    }

    mediaRecorder.onstop = () => {
      try {
        const mimeType = mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(recordedChunks, { type: mimeType });
        
        console.log(`Recording stopped. Blob size: ${blob.size} bytes, type: ${blob.type}`);
        
        // Clean up
        cleanup();
        resolve(blob);
      } catch (error) {
        console.error('Error creating blob:', error);
        cleanup();
        reject(error);
      }
    };

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder stop error:', event);
      cleanup();
      reject(new Error('Failed to stop recording'));
    };

    try {
      mediaRecorder.stop();
    } catch (error) {
      console.error('Error stopping recorder:', error);
      cleanup();
      reject(error);
    }
  });
}

export function cleanup() {
  // Stop all tracks in the stream
  if (currentStream) {
    currentStream.getTracks().forEach(track => {
      track.stop();
    });
    currentStream = null;
  }

  // Reset recorder
  if (mediaRecorder) {
    mediaRecorder = null;
  }

  // Clear recorded chunks
  recordedChunks = [];
}

export function isRecording(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === 'recording';
}

export function getRecordingState(): string {
  return mediaRecorder?.state || 'inactive';
}