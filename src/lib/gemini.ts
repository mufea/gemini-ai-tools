import { GoogleGenAI, Modality, GenerateContentResponse, EditMode, RawReferenceImage, MaskReferenceImage, MaskReferenceMode } from "@google/genai";
import mammoth from 'mammoth';

export type GenerationType = 'text' | 'image' | 'video' | 'music' | 'speech' | 'document' | 'vision' | 'edit';

export interface GenerationResult {
  id?: string;
  type: GenerationType;
  content: string; // text, base64 image, video url, or audio url
  mimeType?: string;
  lyrics?: string; // for music
  timestamp: number;
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
  isMinimized?: boolean;
  isPublic?: boolean;
  authorName?: string;
  authorPhoto?: string;
  projectId?: string | null;
}

const getApiKey = (providedKey?: string) => {
  const key = providedKey?.trim();
  if (key && key.length > 0) return key;
  return process.env.OWNER_GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
};

export async function generateText(prompt: string, model: string = "gemini-3-flash-preview", apiKey?: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
  });
  return response.text || "No response generated.";
}

export async function generateSpeech(prompt: string, voice: string = 'Kore', model: string = "gemini-3.1-flash-tts-preview", apiKey?: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  const response = await ai.models.generateContent({
    model: model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Speech generation failed.");

  const binary = atob(base64Audio);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Convert raw PCM to WAV
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + bytes.length, true); // file length
  view.setUint32(8, 0x57415645, false); // "WAVE"
  
  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // length of fmt chunk
  view.setUint16(20, 1, true); // format (1 = PCM)
  view.setUint16(22, 1, true); // channels (1 = mono)
  view.setUint32(24, 24000, true); // sample rate
  view.setUint32(28, 24000 * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  
  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, bytes.length, true); // data length

  const wavBlob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
  return URL.createObjectURL(wavBlob);
}

export async function generateImage(
  prompt: string, 
  model: string = 'gemini-3.1-flash-image-preview', 
  apiKey?: string, 
  style: string = 'none',
  aspectRatio: string = '1:1',
  imageSize: string = '1K'
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  
  const styledPrompt = style !== 'none' ? `A ${style} style image of: ${prompt}` : prompt;

  if (model.startsWith('imagen-')) {
    const response = await ai.models.generateImages({
      model: model,
      prompt: styledPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio as any,
      },
    });
    const base64EncodeString = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64EncodeString}`;
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [{ text: styledPrompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: imageSize as any
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate image.");
}

export async function generateVideo(
  prompt: string, 
  apiKey: string, 
  model: string = 'veo-3.1-lite-generate-preview', 
  duration: number = 5,
  resolution: string = '720p',
  aspectRatio: string = '16:9'
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  
  // Initial generation
  let operation = await ai.models.generateVideos({
    model: model,
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: resolution as any,
      aspectRatio: aspectRatio as any
    }
  });

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  let video = operation.response?.generatedVideos?.[0]?.video;
  if (!video) throw new Error("Video generation failed.");

  // Extend if duration > 5
  // Note: Each extension adds ~5-7s. 
  const extensionsNeeded = duration > 10 ? 2 : (duration > 5 ? 1 : 0);
  
  for (let i = 0; i < extensionsNeeded; i++) {
    operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview', // Use the high-quality model for extensions
      prompt: 'continue the scene naturally',
      video: video,
      config: {
        numberOfVideos: 1,
        resolution: resolution as any,
        aspectRatio: aspectRatio as any
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    
    video = operation.response?.generatedVideos?.[0]?.video;
    if (!video) throw new Error("Video extension failed.");
  }

  const downloadLink = video.uri;
  if (!downloadLink) throw new Error("Video download link not found.");

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: { 'x-goog-api-key': apiKey },
  });
  
  if (!response.ok) throw new Error(`Failed to download video: ${response.statusText}`);
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function generateMusic(
  prompt: string, 
  apiKey: string, 
  model: string = "lyria-3-clip-preview",
  duration: number = 30,
  genre: string = ""
): Promise<{ url: string, lyrics: string }> {
  const ai = new GoogleGenAI({ apiKey });
  
  const fullPrompt = genre 
    ? `Generate a ${duration} second ${genre} track: ${prompt}`
    : `Generate a ${duration} second track: ${prompt}`;

  const response = await ai.models.generateContentStream({
    model: model,
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
    }
  });

  let audioBase64 = "";
  let lyrics = "";
  let mimeType = "audio/wav";

  for await (const chunk of response) {
    const parts = chunk.candidates?.[0]?.content?.parts;
    if (!parts) continue;
    for (const part of parts) {
      if (part.inlineData?.data) {
        if (!audioBase64 && part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType;
        }
        audioBase64 += part.inlineData.data;
      }
      if (part.text) {
        lyrics += part.text;
      }
    }
  }

  if (!audioBase64) throw new Error("Music generation failed.");

  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return { url: URL.createObjectURL(blob), lyrics };
}

export async function analyzeDocument(file: File, prompt: string, model: string = "gemini-3-flash-preview", apiKey?: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  
  // Handle DOCX
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            { text: `Document Content: \n\n${text}\n\nUser Question: ${prompt || "Analyze this document and provide a summary."}` }
          ]
        }
      });
      return response.text || "No analysis generated.";
    } catch (error: any) {
      throw new Error(`Failed to parse DOCX: ${error.message}`);
    }
  }

  // Handle TXT
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    const text = await file.text();
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { text: `Document Content: \n\n${text}\n\nUser Question: ${prompt || "Analyze this document and provide a summary."}` }
        ]
      }
    });
    return response.text || "No analysis generated.";
  }

  // Handle PDF (Native support in Gemini 1.5+)
  if (file.type === 'application/pdf') {
    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
      });
    };

    const base64Data = await fileToBase64(file);

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { text: prompt || "Analyze this document and provide a summary." },
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data
            }
          }
        ]
      }
    });

    return response.text || "No analysis generated.";
  }

  throw new Error(`Unsupported file type: ${file.type}. Please upload PDF, DOCX, or TXT.`);
}

export async function analyzeImage(file: File, prompt: string, model: string = "gemini-3-flash-preview", apiKey?: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const base64Data = await fileToBase64(file);

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { text: prompt || "What is in this image?" },
        {
          inlineData: {
            mimeType: file.type,
            data: base64Data
          }
        }
      ]
    }
  });

  return response.text || "No analysis generated.";
}

export async function editImage(
  prompt: string,
  image: File,
  mask?: File,
  model: string = 'gemini-3.1-flash-image-preview',
  apiKey?: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getApiKey(apiKey) });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const imageBase64 = await fileToBase64(image);
  let maskBase64 = '';
  if (mask) {
    maskBase64 = await fileToBase64(mask);
  }

  // Step 1: Analyze the image and generate a detailed prompt for a new image
  // using Gemini 2.0 Flash (which is multimodal and supports vision)
  const analysisPrompt = mask 
    ? `I have an image and a mask. I want to perform inpainting. 
       The user wants to change the area covered by the mask to: "${prompt}".
       Please describe the entire resulting image in great detail, maintaining the style, composition, and lighting of the original image, but incorporating the requested change in the masked area. 
       Output ONLY the detailed descriptive prompt for an image generator.`
    : `I have an image. I want to perform an image-to-image transformation.
       The user wants to modify the image based on this instruction: "${prompt}".
       Please describe the resulting image in great detail, keeping the core elements of the original image but applying the requested changes.
       Output ONLY the detailed descriptive prompt for an image generator.`;

  const parts: any[] = [
    { text: analysisPrompt },
    {
      inlineData: {
        mimeType: image.type,
        data: imageBase64
      }
    }
  ];

  if (mask) {
    parts.push({
      inlineData: {
        mimeType: mask.type,
        data: maskBase64
      }
    });
  }

  const analysisResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts }]
  });

  const detailedPrompt = analysisResponse.text || prompt;

  // Step 2: Generate the new image using the selected image model
  const response = await ai.models.generateContent({
    model: model.includes('image-preview') ? model : 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [{ text: detailedPrompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: '1:1', // Default for edit
        imageSize: '1K'
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated.");
}
