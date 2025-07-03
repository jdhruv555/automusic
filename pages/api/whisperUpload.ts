// pages/api/whisperUpload.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import type { File } from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Required for file uploads
  },
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const form = formidable({
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024, // 25MB limit
  });

  try {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err);
        return res.status(500).json({ error: 'Upload error' });
      }

      // Handle the audio file - check multiple possible field names
      let file: File | undefined;
      
      if (files.audio) {
        file = Array.isArray(files.audio) ? files.audio[0] : files.audio;
      } else if (files.file) {
        file = Array.isArray(files.file) ? files.file[0] : files.file;
      }

      if (!file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
      }

      try {
        // Create FormData for OpenAI API
        const formData = new FormData();
        
        // Read file and create blob
        const fileBuffer = fs.readFileSync(file.filepath);
        const blob = new Blob([fileBuffer], { 
          type: file.mimetype || 'audio/webm' 
        });
        
        formData.append('file', blob, file.originalFilename || 'speech.webm');
        formData.append('model', 'whisper-1');
        
        // Optional: Add response format
        formData.append('response_format', 'json');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenAI API error:', response.status, errorText);
          return res.status(response.status).json({ 
            error: 'Transcription failed',
            details: errorText 
          });
        }

        const data = await response.json();
        
        // Clean up uploaded file
        fs.unlinkSync(file.filepath);
        
        res.status(200).json({ 
          transcription: data.text,
          success: true 
        });

      } catch (apiError) {
        console.error('API call error:', apiError);
        // Clean up uploaded file on error
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
        res.status(500).json({ error: 'Transcription API call failed' });
      }
    });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;