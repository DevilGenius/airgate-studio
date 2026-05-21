export type MediaType = 'image' | 'video' | 'music';

export type ImageMode = 'text2img' | 'img2img' | 'inpaint' | 'batch';

export interface GalleryItem {
  id: string;
  taskId?: number; // core task ID for API operations
  url: string;
  alt: string;
  prompt: string;
  model: string;
  mode: ImageMode;
  size?: string;
  createdAt: string;
  sourceUrl?: string; // for img2img/inpaint, the reference image
}

export interface StudioGenerationTask {
  id: string;
  prompt: string;
  mode: ImageMode;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: GalleryItem[];
  remoteTaskIds?: number[];
  error?: string;
  createdAt: string;
  platform?: string;
  model?: string;
  size?: string;
}
