// pages/api/transcribe.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import type { File } from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not found in environment variables');
    return res.status(500).json({ 
      error: 'OpenAI API key not configured. Please check your environment variables.' 
    });
  }

  if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.error('Invalid OPENAI_API_KEY format');
    return res.status(500).json({ 
      error: 'Invalid OpenAI API key format. Key should start with "sk-"' 
    });
  }

  const form = new IncomingForm({ 
    multiples: false,
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024, // 25MB limit
  });

  try {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err);
        return res.status(500).json({ error: 'File upload failed' });
      }

      // Handle both single file and array of files
      const file = files.file
        ? (Array.isArray(files.file) ? files.file[0] : files.file)
        : undefined;
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      try {
        // Create FormData for OpenAI API
        const formData = new FormData();
        
        // Read file and create blob
        const fileBuffer = fs.readFileSync(file.filepath);
        const blob = new Blob([fileBuffer], { type: file.mimetype || 'audio/webm' });
        
        formData.append('file', blob, file.originalFilename || 'audio.webm');
        formData.append('model', 'whisper-1');

        console.log('Sending request to OpenAI API...');
        const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: formData,
        });

        console.log('OpenAI API response status:', openaiRes.status);

        if (!openaiRes.ok) {
          const errorText = await openaiRes.text();
          console.error('OpenAI API error:', {
            status: openaiRes.status,
            statusText: openaiRes.statusText,
            error: errorText
          });

          // Handle specific error cases
          if (openaiRes.status === 401) {
            return res.status(500).json({ 
              error: 'OpenAI API authentication failed. Please check your API key.',
              details: 'Invalid or missing API key'
            });
          } else if (openaiRes.status === 429) {
            return res.status(429).json({ 
              error: 'Rate limit exceeded. Please try again later.',
              details: errorText
            });
          } else if (openaiRes.status === 413) {
            return res.status(413).json({ 
              error: 'File too large. Please try a shorter recording.',
              details: errorText
            });
          }

          return res.status(openaiRes.status).json({ 
            error: 'Transcription failed',
            details: errorText 
          });
        }

        const data = await openaiRes.json();
        
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
}