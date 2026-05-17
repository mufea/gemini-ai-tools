
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'image' | 'video' | 'music' | 'speech' | 'document' | 'vision' | 'edit';
  isPremium: boolean;
  costNote?: string;
}

export const GEMINI_MODELS: ModelInfo[] = [
  // Text Models
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    description: 'Ultra-fast and efficient for daily text tasks and summaries.',
    type: 'text',
    isPremium: false,
    costNote: 'Free usage within quota limits.'
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    description: 'Advanced reasoning, coding, and expert-level problem solving.',
    type: 'text',
    isPremium: true,
    costNote: 'Premium: Consumes 1 credit per 1k tokens. Included in Basic+ plans.'
  },
  // Image Models
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    description: 'Standard quality image generation. Fast and free.',
    type: 'image',
    isPremium: false,
    costNote: 'Free usage within quota limits.'
  },
  {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Gemini 3.1 Flash Image',
    description: 'High-fidelity image generation with excellent prompt adherence.',
    type: 'image',
    isPremium: true,
    costNote: 'Premium: Consumes 1 credit per image. Included in Pro/Elite plans.'
  },
  // Video Models
  {
    id: 'veo-3.1-lite-generate-preview',
    name: 'Veo 3.1 Lite',
    description: 'Quick video generation for general use.',
    type: 'video',
    isPremium: true,
    costNote: 'Premium: Consumes 5 credits per 5s video. Included in Elite plan.'
  },
  {
    id: 'veo-3.1-generate-preview',
    name: 'Veo 3.1 Pro',
    description: 'High-fidelity video generation with advanced features.',
    type: 'video',
    isPremium: true,
    costNote: 'Premium: Consumes 10 credits per 5s video. Included in Elite plan.'
  },
  // Music Models
  {
    id: 'lyria-3-clip-preview',
    name: 'Lyria 3 Clip',
    description: 'Short music clips up to 30 seconds.',
    type: 'music',
    isPremium: true,
    costNote: 'Premium: Consumes 3 credits per clip. Included in Elite plan.'
  },
  {
    id: 'lyria-3-pro-preview',
    name: 'Lyria 3 Pro',
    description: 'Full-length music tracks with high quality.',
    type: 'music',
    isPremium: true,
    costNote: 'Premium: Consumes 8 credits per track. Included in Elite plan.'
  },
  // Speech Models
  {
    id: 'gemini-3.1-flash-tts-preview',
    name: 'Gemini 3.1 TTS',
    description: 'High-quality text-to-speech with multiple natural voices.',
    type: 'speech',
    isPremium: true,
    costNote: 'Premium: Consumes 1 credit per 1000 characters. Included in Elite plan.'
  },
  // Document Models
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash (Docs)',
    description: 'Fast document analysis and summary.',
    type: 'document',
    isPremium: false,
    costNote: 'Free usage within quota limits.'
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Docs)',
    description: 'Deep document reasoning and complex extraction.',
    type: 'document',
    isPremium: true,
    costNote: 'Premium: Consumes 1 credit per 1k tokens. Included in Basic+ plans.'
  },
  // Vision Models
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Vision',
    description: 'Advanced visual understanding and image analysis.',
    type: 'vision',
    isPremium: true,
    costNote: 'Premium: Consumes 2 credits per image. Included in Medium+ plans.'
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash (Vision)',
    description: 'Fast image description and object detection.',
    type: 'vision',
    isPremium: false,
    costNote: 'Free usage within quota limits.'
  },
  // Edit Models
  {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Gemini 3.1 Flash Image Edit',
    description: 'Professional image editing and inpainting.',
    type: 'edit',
    isPremium: true,
    costNote: 'Premium: Consumes 2 credits per edit. Included in Elite plan.'
  }
];
