import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../../api';
import type { GenerationTask, ModelInfo, PlatformInfo, UserInfo } from '../../api';
import type { GalleryItem, StudioGenerationTask, ImageMode, MediaType } from './types';

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 120;

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseMarkdownImages(text: string): Array<{ url: string; alt: string }> {
  const regex = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
  const results: Array<{ url: string; alt: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    results.push({ alt: match[1], url: match[2] });
  }
  return results;
}

function modelOptionValue(m: ModelInfo): string {
  return m.platform ? `${m.platform}::${m.id}` : m.id;
}

function splitModelValue(value: string): { platform: string; modelId: string } {
  const idx = value.indexOf('::');
  if (idx === -1) return { platform: '', modelId: value };
  return { platform: value.slice(0, idx), modelId: value.slice(idx + 2) };
}

function operationToImageMode(operation: string): ImageMode {
  if (operation === 'inpaint') return 'inpaint';
  if (operation === 'edit') return 'img2img';
  return 'text2img';
}

function modeToOperation(mode: ImageMode): 'generate' | 'edit' | 'inpaint' {
  if (mode === 'inpaint') return 'inpaint';
  if (mode === 'img2img') return 'edit';
  return 'generate';
}

function taskSize(task: GenerationTask): string | undefined {
  const value = task.parameters?.size;
  return typeof value === 'string' ? value : undefined;
}

async function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function imageUrlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function createMaskDataUrl(
  sourceUrl: string,
  region: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const img = new window.Image();
  img.src = sourceUrl;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('Failed to load source image for mask'));
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create canvas context');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(region.x, region.y, region.width, region.height);
  return canvas.toDataURL('image/png');
}

async function pollGenerationTask(
  taskId: number,
  signal: AbortSignal,
  maxAttempts = POLL_MAX_ATTEMPTS,
): Promise<GenerationTask> {
  let networkErrors = 0;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    let task: GenerationTask | null = null;
    try {
      task = await api.getGenerationTask(taskId);
      networkErrors = 0;
    } catch (err) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      networkErrors++;
      if (networkErrors > 30) throw err;
    }
    if (task) {
      if (task.status === 'completed') return task;
      if (task.status === 'failed') {
        throw new Error(task.error_message || 'Image generation task failed');
      }
    }
    await delay(POLL_INTERVAL_MS, signal);
  }
  throw new Error('Image generation timed out after waiting too long');
}

// ── Context type ──────────────────────────────────────────────────────────────

export interface StudioContextValue {
  // Media type
  mediaType: MediaType;
  setMediaType: (type: MediaType) => void;

  // Image mode
  imageMode: ImageMode;
  setImageMode: (mode: ImageMode) => void;

  // Models & platforms
  platforms: PlatformInfo[];
  models: ModelInfo[];
  imageModels: ModelInfo[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  selectedPlatform: string;
  selectedModelId: string;
  imageSize: string;
  setImageSize: (size: string) => void;
  userInfo: UserInfo | null;

  // Reference image (for img2img / inpaint)
  referenceImage: string | null;
  setReferenceImage: (url: string | null) => void;

  // Generation
  isGenerating: boolean;
  tasks: StudioGenerationTask[];
  generate: (
    prompt: string,
    options?: {
      sourceImage?: string;
      maskRegion?: { x: number; y: number; width: number; height: number };
      count?: number;
      prompts?: string[];
    },
  ) => void;
  cancelGeneration: () => void;

  // Gallery
  gallery: GalleryItem[];
  previewItem: GalleryItem | null;
  setPreviewItem: (item: GalleryItem | null) => void;
  deleteGalleryItem: (id: string) => void;
  useAsReference: (item: GalleryItem) => void;

}

// ── Context + hook ────────────────────────────────────────────────────────────

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used within StudioProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function StudioProvider({ children }: { children: ReactNode }) {
  // Media type & mode
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [imageMode, setImageMode] = useState<ImageMode>('text2img');

  // Models & platforms
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Reference image
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  // Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [tasks, setTasks] = useState<StudioGenerationTask[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Gallery
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);

  const platformsPromiseRef = useRef<Promise<void> | null>(null);
  const recoveryPromiseRef = useRef<Promise<void> | null>(null);

  // models 已由服务端按 capability=image_generation 过滤，无需二次过滤
  const imageModels = models;

  // Derived: selected platform + modelId
  const { platform: selectedPlatform, modelId: selectedModelId } = splitModelValue(selectedModel);

  // ── Initialization ────────────────────────────────────────────────────────

  const recoverTasks = useCallback(async (signal: AbortSignal) => {
    try {
      const allTasks = await api.listGenerationTasks();
      if (signal.aborted) return;

      const completed = allTasks.filter(t => t.status === 'completed' && t.result_content);
      const recoveredGallery: GalleryItem[] = [];
      for (const t of completed) {
        const images = parseMarkdownImages(t.result_content || '');
        for (const img of images) {
          recoveredGallery.push({
            id: uid(),
            url: img.url,
            alt: img.alt,
            prompt: t.prompt,
            model: t.model,
            mode: operationToImageMode(t.operation),
            size: taskSize(t),
            createdAt: t.completed_at || t.updated_at,
          });
        }
      }
      setGallery(recoveredGallery);

      const failed = allTasks.filter(t => t.status === 'failed');
      const inFlight = allTasks.filter(
        t => t.status === 'pending' || t.status === 'processing',
      );

      setTasks([
        ...failed.map(t => ({
          id: `r-${t.id}`,
          prompt: t.prompt,
          mode: operationToImageMode(t.operation),
          status: 'failed' as const,
          error: t.error_message || 'Image generation task failed',
          createdAt: t.created_at,
        })),
        ...inFlight.map(t => ({
          id: `r-${t.id}`,
          prompt: t.prompt,
          mode: operationToImageMode(t.operation),
          status: 'processing' as const,
          createdAt: t.created_at,
        })),
      ]);
      if (inFlight.length === 0) return;

      setIsGenerating(true);
      activeCountRef.current = inFlight.length;
      for (const t of inFlight) {
        const taskUiId = `r-${t.id}`;
        pollGenerationTask(t.id, signal)
          .then(done => {
            if (signal.aborted) return;
            const imgs = parseMarkdownImages(done.result_content || '');
            setGallery(prev => [
              ...imgs.map(img => ({
                id: uid(),
                url: img.url,
                alt: img.alt,
                prompt: t.prompt,
                model: t.model,
                mode: operationToImageMode(t.operation),
                size: taskSize(t),
                createdAt: done.completed_at || new Date().toISOString(),
              })),
              ...prev,
            ]);
            setTasks(prev =>
              prev.map(gt =>
                gt.id === taskUiId ? { ...gt, status: 'completed' } : gt,
              ),
            );
          })
          .catch(err => {
            if (signal.aborted) return;
            const msg = err instanceof Error ? err.message : 'Recovery failed';
            setTasks(prev =>
              prev.map(gt =>
                gt.id === taskUiId
                  ? { ...gt, status: 'failed', error: msg }
                  : gt,
              ),
            );
          })
          .finally(() => {
            if (signal.aborted) return;
            activeCountRef.current -= 1;
            if (activeCountRef.current <= 0) {
              activeCountRef.current = 0;
              setIsGenerating(false);
            }
          });
      }
    } catch {
      // task recovery is non-fatal
    }
  }, []);

  useEffect(() => {
    if (!platformsPromiseRef.current) {
      platformsPromiseRef.current = api.listPlatforms().then(async nextPlatforms => {
        setPlatforms(nextPlatforms);
        const modelLists = await Promise.all(
          nextPlatforms.map(p => api.listModels(p.name, 'image_generation').catch(() => [] as ModelInfo[])),
        );
        const allModels = modelLists.flat();
        setModels(allModels);
        if (allModels.length > 0) {
          setSelectedModel(modelOptionValue(allModels[0]));
        }
      }).catch(() => {});
    }

    if (!recoveryPromiseRef.current) {
      const controller = new AbortController();
      recoveryPromiseRef.current = recoverTasks(controller.signal);
    }
  }, [recoverTasks]);

  // ── Generation ────────────────────────────────────────────────────────────

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const activeCountRef = useRef(0);

  const generate = useCallback(
    (
      prompt: string,
      options?: {
        sourceImage?: string;
        maskRegion?: { x: number; y: number; width: number; height: number };
        count?: number;
        prompts?: string[];
      },
    ) => {
      if (!prompt.trim()) return;

      const controller = new AbortController();
      const signal = controller.signal;

      const taskId = uid();
      const now = new Date().toISOString();
      const mode = imageMode;

      const task: StudioGenerationTask = {
        id: taskId,
        prompt,
        mode,
        status: 'queued',
        createdAt: now,
      };

      setTasks(prev => [task, ...prev]);
      activeCountRef.current += 1;
      setIsGenerating(true);

      const updateTask = (patch: Partial<StudioGenerationTask>) => {
        setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...patch } : t)));
      };

      const runTask = async () => {
      try {
        updateTask({ status: 'processing' });

        if (mode === 'batch') {
          const prompts = options?.prompts?.length
            ? options.prompts
            : Array.from({ length: options?.count ?? 4 }, () => prompt);

          const batchTasks = prompts.map(async (p) => {
            const created = await api.createGenerationTask({
              kind: 'image',
              operation: 'generate',
              platform: selectedPlatform,
              model: selectedModelId,
              prompt: p,
              parameters: imageSize ? { size: imageSize } : undefined,
            });
            const completed = await pollGenerationTask(created.id, signal);
            return parseMarkdownImages(completed.result_content || '').map(img => ({ ...img, prompt: p }));
          });

          const settled = await Promise.allSettled(batchTasks);

          const allItems: GalleryItem[] = [];
          for (const outcome of settled) {
            if (outcome.status === 'fulfilled') {
              for (const img of outcome.value) {
                allItems.push({
                  id: uid(),
                  url: img.url,
                  alt: img.alt,
                  prompt: img.prompt,
                  model: selectedModelId,
                  mode,
                  size: imageSize,
                  createdAt: new Date().toISOString(),
                });
              }
            }
          }

          if (allItems.length === 0) throw new Error('Batch generation: all tasks failed');

          setGallery(prev => [...allItems, ...prev]);
          updateTask({ status: 'completed', result: allItems });

        } else {
          // text2img / img2img / inpaint — 统一走 task 系统
          const taskData: Parameters<typeof api.createGenerationTask>[0] = {
            kind: 'image',
            operation: modeToOperation(mode),
            platform: selectedPlatform,
            model: selectedModelId,
            prompt,
            parameters: imageSize ? { size: imageSize } : undefined,
          };

          if (mode === 'img2img' || mode === 'inpaint') {
            const sourceUrl = options?.sourceImage ?? referenceImage ?? '';
            if (!sourceUrl && mode === 'inpaint') throw new Error('Inpaint requires a source image');
            if (sourceUrl) {
              taskData.inputs = [{ type: 'image', role: 'source', url: await imageUrlToDataUrl(sourceUrl) }];
            }
          }

          if (mode === 'inpaint' && options?.maskRegion) {
            const sourceUrl = options?.sourceImage ?? referenceImage ?? '';
            taskData.mask = { type: 'image', role: 'mask', url: await createMaskDataUrl(sourceUrl, options.maskRegion) };
          }

          const created = await api.createGenerationTask(taskData);
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
          const completed = await pollGenerationTask(created.id, signal);
          const images = parseMarkdownImages(completed.result_content || '');

          const galleryItems: GalleryItem[] = images.map(img => ({
            id: uid(),
            url: img.url,
            alt: img.alt,
            prompt,
            model: selectedModelId,
            mode,
            size: imageSize,
            createdAt: new Date().toISOString(),
            sourceUrl: (mode === 'img2img' || mode === 'inpaint')
              ? (options?.sourceImage ?? referenceImage ?? undefined)
              : undefined,
          }));

          setGallery(prev => [...galleryItems, ...prev]);
          updateTask({ status: 'completed', result: galleryItems });
        }
      } catch (err) {
        if (signal.aborted) {
          updateTask({ status: 'failed', error: 'Generation cancelled' });
        } else {
          const msg = err instanceof Error ? err.message : 'Generation failed';
          updateTask({ status: 'failed', error: msg });
        }
      } finally {
        activeCountRef.current -= 1;
        if (activeCountRef.current <= 0) {
          activeCountRef.current = 0;
          setIsGenerating(false);
        }
      }
      };

      void runTask();
    },
    [
      imageMode,
      imageSize,
      referenceImage,
      selectedPlatform,
      selectedModelId,
    ],
  );

  // ── Gallery helpers ───────────────────────────────────────────────────────

  const deleteGalleryItem = useCallback((id: string) => {
    setGallery(prev => prev.filter(item => item.id !== id));
  }, []);

  const useAsReference = useCallback((item: GalleryItem) => {
    setReferenceImage(item.url);
    setImageMode('img2img');
  }, []);

  // ── Context value ─────────────────────────────────────────────────────────

  const value: StudioContextValue = {
    mediaType,
    setMediaType,
    imageMode,
    setImageMode,
    platforms,
    models,
    imageModels,
    selectedModel,
    setSelectedModel,
    selectedPlatform,
    selectedModelId,
    imageSize,
    setImageSize,
    userInfo,
    referenceImage,
    setReferenceImage,
    isGenerating,
    tasks,
    generate,
    cancelGeneration,
    gallery,
    previewItem,
    setPreviewItem,
    deleteGalleryItem,
    useAsReference,
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}
