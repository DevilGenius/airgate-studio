import type { ChatMessageContent, ModelInfo } from '../api';
import type { BlobUrlRegistry, EditImage, EditSelectionRect, ImageEditAnnotation, ImageSizeSettings, PendingImage, PreviewImage } from './types';
import {
  BASE64_DATA_URL_RE, DATA_IMAGE_RE, GPT_IMAGE_MAX_PIXELS, GPT_IMAGE_MAX_SIDE,
  GPT_IMAGE_MIN_PIXELS, IMAGE_EDIT_ANNOTATION_RE, IMAGE_MARKDOWN_ITEM_RE,
  IMAGE_MARKDOWN_RE, IMAGE_SIZE_AUTO,
  MAX_IMAGE_BYTES, MIN_SELECTION_SIZE,
  DEFAULT_MODEL_ID, ACTIVE_CONVERSATION_STORAGE_KEY, SELECTED_MODEL_STORAGE_KEY,
} from './constants';

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function dataUrlToBlob(dataUrl: string): Blob | null {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) return null;
  const meta = dataUrl.slice(5, commaIdx);
  const mimeMatch = /^([^;]+)/.exec(meta);
  const mime = mimeMatch?.[1] || 'application/octet-stream';
  const b64 = dataUrl.slice(commaIdx + 1);
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

export function replaceBase64WithBlobUrls(content: string, registry: BlobUrlRegistry): string {
  if (!content || !content.includes('data:image/')) return content;
  return content.replace(BASE64_DATA_URL_RE, (dataUrl) => {
    const blob = dataUrlToBlob(dataUrl);
    if (!blob) return dataUrl;
    const url = URL.createObjectURL(blob);
    registry.set(url, dataUrl);
    return url;
  });
}

export function replaceBlobUrlsWithBase64(content: string, registry: BlobUrlRegistry): string {
  if (!content || !content.includes('blob:')) return content;
  return content.replace(/blob:[^\s)"']+/g, (url) => registry.get(url) || url);
}

export function revokeBlobRegistry(registry: BlobUrlRegistry) {
  registry.forEach((_, url) => URL.revokeObjectURL(url));
  registry.clear();
}

export function selectionRectFromPoints(start: { x: number; y: number }, end: { x: number; y: number }): EditSelectionRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function isUsableSelection(rect: EditSelectionRect | null) {
  return Boolean(rect && rect.width >= MIN_SELECTION_SIZE && rect.height >= MIN_SELECTION_SIZE);
}

export function resolveImageSize(settings: ImageSizeSettings) {
  return settings.value === IMAGE_SIZE_AUTO ? undefined : settings.value;
}

export function roundToImageSizeMultiple(value: number, mode: 'ceil' | 'floor' | 'round') {
  const scaled = value / 16;
  const rounded = mode === 'ceil' ? Math.ceil(scaled) : mode === 'floor' ? Math.floor(scaled) : Math.round(scaled);
  return Math.max(16, rounded * 16);
}

export function isValidGPTImageSize(width: number, height: number) {
  if (width <= 0 || height <= 0 || width > GPT_IMAGE_MAX_SIDE || height > GPT_IMAGE_MAX_SIDE) return false;
  if (width % 16 !== 0 || height % 16 !== 0) return false;
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  const pixels = width * height;
  return longSide <= shortSide * 3 && pixels >= GPT_IMAGE_MIN_PIXELS && pixels <= GPT_IMAGE_MAX_PIXELS;
}

export function sourceAlignedImageSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return undefined;
  const aspect = width / height;
  if (aspect > 3 || aspect < 1 / 3) return undefined;

  let targetPixels = clampNumber(width * height, GPT_IMAGE_MIN_PIXELS, GPT_IMAGE_MAX_PIXELS);
  let nextWidth = 0;
  let nextHeight = 0;

  for (let i = 0; i < 8; i++) {
    const rawHeight = Math.sqrt(targetPixels / aspect);
    const rawWidth = rawHeight * aspect;
    nextWidth = Math.min(GPT_IMAGE_MAX_SIDE, roundToImageSizeMultiple(rawWidth, i === 0 ? 'round' : 'ceil'));
    nextHeight = Math.min(GPT_IMAGE_MAX_SIDE, roundToImageSizeMultiple(rawHeight, i === 0 ? 'round' : 'ceil'));

    if (isValidGPTImageSize(nextWidth, nextHeight)) return `${nextWidth}x${nextHeight}`;
    const pixels = nextWidth * nextHeight;
    if (pixels < GPT_IMAGE_MIN_PIXELS) {
      targetPixels = GPT_IMAGE_MIN_PIXELS * 1.02;
      continue;
    }
    if (pixels > GPT_IMAGE_MAX_PIXELS || nextWidth >= GPT_IMAGE_MAX_SIDE || nextHeight >= GPT_IMAGE_MAX_SIDE) {
      targetPixels = GPT_IMAGE_MAX_PIXELS * 0.98;
      continue;
    }
    break;
  }

  return isValidGPTImageSize(nextWidth, nextHeight) ? `${nextWidth}x${nextHeight}` : undefined;
}

export function imageSizeSummary(settings: ImageSizeSettings) {
  return settings.value === IMAGE_SIZE_AUTO ? 'Auto' : settings.value;
}

export function stripImageEditAnnotations(content: string) {
  return content.replace(IMAGE_EDIT_ANNOTATION_RE, '');
}

export function stripImageMarkdown(content: string) {
  return stripImageEditAnnotations(content).replace(IMAGE_MARKDOWN_RE, '[Image generated]').trim() || '[Image generated]';
}

export function stripImagePlannerNoise(content: string) {
  return stripImageEditAnnotations(content)
    .replace(IMAGE_MARKDOWN_RE, '')
    .replace(/^\s*\[Image generated\]\s*$/gmi, '')
    .trim();
}

export function copyableMessageText(content: string) {
  return stripImageEditAnnotations(content).replace(IMAGE_MARKDOWN_RE, '[Image]').trim() || '[Image]';
}

export function encodeImageEditAnnotation(annotation: ImageEditAnnotation) {
  return `<!--airgate:image-edit:${btoa(encodeURIComponent(JSON.stringify(annotation)))}-->`;
}

export function parseImageEditAnnotations(content: string): ImageEditAnnotation[] {
  const annotations: ImageEditAnnotation[] = [];
  let match: RegExpExecArray | null;
  IMAGE_EDIT_ANNOTATION_RE.lastIndex = 0;

  while ((match = IMAGE_EDIT_ANNOTATION_RE.exec(content)) !== null) {
    try {
      const value = JSON.parse(decodeURIComponent(atob(match[1])));
      if (
        value &&
        Number.isInteger(value.imageIndex) &&
        value.rect &&
        [value.rect.x, value.rect.y, value.rect.width, value.rect.height].every(item => typeof item === 'number')
      ) {
        annotations.push(value as ImageEditAnnotation);
      }
    } catch { /* ignore malformed annotation */ }
  }

  IMAGE_EDIT_ANNOTATION_RE.lastIndex = 0;
  return annotations;
}

export function generatedImages(content: string): PreviewImage[] {
  const images: PreviewImage[] = [];
  let match: RegExpExecArray | null;
  IMAGE_MARKDOWN_ITEM_RE.lastIndex = 0;

  while ((match = IMAGE_MARKDOWN_ITEM_RE.exec(content)) !== null) {
    images.push({ alt: match[1], url: match[2] });
  }

  IMAGE_MARKDOWN_ITEM_RE.lastIndex = 0;
  return images;
}

export function hasCopyableMessageText(content: string) {
  return stripImageEditAnnotations(content).replace(IMAGE_MARKDOWN_RE, '').trim().length > 0;
}

export function escapeMarkdownAlt(text: string) {
  return text.replace(/[\]\\]/g, '');
}

export function imageExtensionFromUrl(url: string) {
  const dataMatch = url.match(DATA_IMAGE_RE);
  if (dataMatch) return dataMatch[1].toLowerCase() === 'jpeg' ? 'jpg' : dataMatch[1].toLowerCase();

  try {
    const pathname = new URL(url).pathname;
    const extMatch = pathname.match(/\.([a-z0-9]{2,5})$/i);
    return extMatch ? extMatch[1].toLowerCase() : 'png';
  } catch {
    return 'png';
  }
}

export function imageFilename(alt: string, url: string) {
  const base = (alt || 'generated-image')
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .trim()
    .slice(0, 80) || 'generated-image';
  return `${base}.${imageExtensionFromUrl(url)}`;
}

export function clickDownload(href: string, filename: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.rel = 'noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadImage(url: string, alt: string) {
  const filename = imageFilename(alt, url);
  if (DATA_IMAGE_RE.test(url)) {
    clickDownload(url, filename);
    return;
  }

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const objectUrl = URL.createObjectURL(await resp.blob());
    try {
      clickDownload(objectUrl, filename);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    clickDownload(url, filename);
  }
}

export async function copyText(text: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('copy failed');
}

export function fileToDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('Failed to create mask'));
    }, 'image/png');
  });
}

export function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = src;
  });
}

export function messageContentWithImages(text: string, images: PendingImage[], annotations: ImageEditAnnotation[] = []) {
  const body = text.trim();
  const imageMarkdown = images.map(image => `![${escapeMarkdownAlt(image.name)}](${image.url})`).join('\n');
  const annotationMarkdown = annotations.map(encodeImageEditAnnotation).join('\n');
  return [body, imageMarkdown, annotationMarkdown].filter(Boolean).join('\n\n');
}

export async function imagesFromFiles(files: File[]) {
  const images = files.filter(file => file.type.startsWith('image/'));
  if (images.some(file => file.size > MAX_IMAGE_BYTES)) {
    throw new Error('Images must be 10MB or smaller');
  }

  return Promise.all(images.map(async file => ({
    id: `${file.name}-${file.lastModified}-${file.size}`,
    name: file.name || 'pasted-image',
    url: await fileToDataURL(file),
    file,
  })));
}

export async function editImageFromFile(file: File): Promise<EditImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Select an image file');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Images must be 10MB or smaller');
  }
  return {
    id: `${file.name}-${file.lastModified}-${file.size}`,
    name: file.name || 'source-image',
    url: await fileToDataURL(file),
    file,
  };
}

export async function editImageFromUrl(url: string, alt: string): Promise<EditImage> {
  let resp: Response;
  try {
    resp = await fetch(url, url.startsWith('data:') ? undefined : { credentials: 'omit' });
  } catch {
    throw new Error('Failed to fetch image — it may be hosted on a server that blocks cross-origin reads.');
  }
  if (!resp.ok) throw new Error(`Failed to fetch image (HTTP ${resp.status})`);
  const blob = await resp.blob();
  const type = blob.type && blob.type.startsWith('image/') ? blob.type : `image/${imageExtensionFromUrl(url) === 'jpg' ? 'jpeg' : imageExtensionFromUrl(url)}`;
  const filename = imageFilename(alt || 'generated-image', url);
  const file = new File([blob], filename, { type });
  return editImageFromFile(file);
}

export function titleFromMessageContent(content: string) {
  const title = stripImageEditAnnotations(content).replace(IMAGE_MARKDOWN_RE, '[Image]').trim() || '[Image]';
  return title.slice(0, 30) + (title.length > 30 ? '...' : '');
}

export function toChatMessageContent(role: string, content: string): ChatMessageContent {
  const cleanContent = stripImageEditAnnotations(content);
  if (role !== 'user') return stripImageMarkdown(cleanContent);

  const parts: Exclude<ChatMessageContent, string> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  IMAGE_MARKDOWN_RE.lastIndex = 0;

  while ((match = IMAGE_MARKDOWN_RE.exec(cleanContent)) !== null) {
    const text = cleanContent.slice(lastIndex, match.index).trim();
    if (text) parts.push({ type: 'text', text });
    parts.push({ type: 'image_url', image_url: { url: match[1] } });
    lastIndex = match.index + match[0].length;
  }

  const tail = cleanContent.slice(lastIndex).trim();
  if (tail) parts.push({ type: 'text', text: tail });

  return parts.length ? parts : cleanContent;
}

const IMAGE_ID_RE = /\bimage\b/i;

export function isImageModel(model?: ModelInfo) {
  if (!model) return false;
  if (model.image_only) return true;
  if (model.capabilities?.includes('image_generation')) return true;
  // 兼容尚未填充 capabilities 的旧版网关插件
  if (!model.capabilities?.length && IMAGE_ID_RE.test(model.id)) return true;
  return false;
}

export function supportsReasoning(model?: ModelInfo) {
  if (!model || isImageModel(model)) return false;
  if (model.capabilities?.includes('reasoning') || model.capabilities?.includes('thinking')) return true;
  // 兼容尚未填充 capabilities 的旧版网关插件
  if (!model.capabilities?.length) return true;
  return false;
}

export function modelOptionValue(model: ModelInfo) {
  return `${encodeURIComponent(model.platform || '')}:${encodeURIComponent(model.id)}`;
}

export function normalizeModelName(value?: string) {
  return (value || '').toLowerCase().replace(/[-_\s]/g, '');
}

export function defaultModelOptionValue(models: ModelInfo[]) {
  const chatModels = models.filter(m => !isImageModel(m));
  const pool = chatModels.length ? chatModels : models;
  const target = normalizeModelName(DEFAULT_MODEL_ID);
  const preferred = pool.find(model => normalizeModelName(model.id) === target || normalizeModelName(model.name) === target);
  return preferred ? modelOptionValue(preferred) : (pool[0] ? modelOptionValue(pool[0]) : '');
}

export function readLocalStorageValue(key: string) {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

export function writeLocalStorageValue(key: string, value: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private mode or locked-down browsers.
  }
}

export function getStoredActiveConversationId() {
  const raw = readLocalStorageValue(ACTIVE_CONVERSATION_STORAGE_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function getStoredSelectedModel() {
  return readLocalStorageValue(SELECTED_MODEL_STORAGE_KEY);
}

export function isSafeLinkUrl(url: string) {
  return /^(https?:|mailto:|#)/i.test(url);
}

export function isSafeImageUrl(url: string) {
  return /^(data:image\/(?:png|jpeg|jpg|webp|gif);base64,|https?:|blob:|\/assets-runtime\/|\/api\/v1\/ext-user\/airgate-playground\/assets\/)/i.test(url);
}
