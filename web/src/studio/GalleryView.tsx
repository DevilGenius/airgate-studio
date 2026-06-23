import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStudio } from './StudioContext';
import type { GalleryItem, StudioGenerationTask } from './types';
import { downloadImage } from '../utils';

function useNearViewport(rootMargin = '600px', estimatedHeight = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const heightRef = useRef<number>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
        } else {
          if (el.offsetHeight > 0) heightRef.current = el.offsetHeight;
          setNear(false);
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  // Real measurement wins; estimate is only a fallback so the off-screen slot
  // has a reservable height before the card has rendered once.
  const placeholderHeight = heightRef.current || estimatedHeight;
  return { ref, near, placeholderHeight };
}

function confirm(message: string): Promise<boolean> {
  const ag = (window as unknown as { airgate?: { confirm: (msg: string) => Promise<boolean> } }).airgate;
  if (ag?.confirm) return ag.confirm(message);
  return Promise.resolve(window.confirm(message));
}

// Core's runtime asset handler accepts ?w=256/?w=512 to serve a JPEG
// thumbnail. Anything served from a different origin (S3, CDN) ignores the
// param and returns the original — harmless but no benefit, so we only emit
// srcset when the asset is local.
function isLocalRuntimeAsset(url: string): boolean {
  return url.startsWith('/assets-runtime/');
}

function buildThumbSrcSet(url: string): string | undefined {
  if (!isLocalRuntimeAsset(url)) return undefined;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}w=256 256w, ${url}${sep}w=512 512w, ${url} 1024w`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatRemainingTime(ms: number): string {
  const safeMs = Math.max(0, ms);
  const days = Math.floor(safeMs / MS_PER_DAY);
  if (days >= 1) return `${days} 天`;
  if (safeMs >= 60 * 60 * 1000) {
    return `${Math.ceil(safeMs / (60 * 60 * 1000))} 小时`;
  }
  const minutes = Math.max(1, Math.ceil(safeMs / 60000));
  return `${minutes} 分钟`;
}

function getExpiryNotice(createdAt: string, retentionDays: number | null): { tone: 'warning' | 'danger'; remainingLabel: string } | null {
  if (!retentionDays || retentionDays <= 0) return null;
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return null;
  const expiresAt = createdAtMs + retentionDays * MS_PER_DAY;
  const remainingMs = expiresAt - Date.now();
  if (remainingMs <= 0) {
    return { tone: 'danger', remainingLabel: '' };
  }
  if (remainingMs <= MS_PER_DAY) {
    return { tone: 'warning', remainingLabel: formatRemainingTime(remainingMs) };
  }
  return null;
}

// Parse "1024x1024" → 1, "1024x768" → 0.75. Returns undefined if unparseable
// so callers can fall back to letting the image define its own aspect ratio.
function parseAspectRatio(size: string | undefined): number | undefined {
  if (!size) return undefined;
  const m = /^(\d+)x(\d+)$/.exec(size);
  if (!m) return undefined;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) return undefined;
  return w / h;
}

function useCopyOnClick(text: string | undefined | null) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const copy = useCallback(async (e: React.MouseEvent) => {
    if (!text) return;
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for non-secure contexts where Clipboard API is unavailable.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return { copied, copy };
}

export const __galleryViewTestUtils = {
  isLocalRuntimeAsset,
  buildThumbSrcSet,
  formatCreatedAt,
  formatRemainingTime,
  getExpiryNotice,
  parseAspectRatio,
};

// ── TaskCard ────────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: StudioGenerationTask }) {
  const { t } = useTranslation();
  const { deleteTask, generate, setSelectedModelId, setImageSize, setImageMode } = useStudio();
  const { copied, copy } = useCopyOnClick(task.prompt);

  const statusLabel = task.status === 'queued'
    ? t('playground.studio_task_queued', { defaultValue: '队列中...' })
    : task.status === 'failed'
      ? t('playground.studio_task_failed', { defaultValue: '生成失败' })
      : t('playground.studio_task_processing', { defaultValue: '生成中...' });

  const handleRetry = () => {
    if (!task.prompt) return;
    deleteTask(task.id);
    if (task.model) setSelectedModelId(task.model);
    if (task.size) setImageSize(task.size);
    setImageMode(task.mode);
    setTimeout(() => generate(task.prompt, { mode: task.mode }), 0);
  };

  const handleDelete = async () => {
    if (!await confirm(t('playground.studio_confirm_delete_task', { defaultValue: '确定要删除这个任务吗？' }))) return;
    deleteTask(task.id);
  };

  return (
    <div>
      {task.status === 'failed' ? (
        <div>!</div>
      ) : (
        <div />
      )}
      <div>{statusLabel}</div>
      {task.status === 'failed' && task.error && (
        <div>{task.error}</div>
      )}
      {task.prompt && (
        <div
          onClick={copy}
          title={copied ? '已复制到剪贴板' : '点击复制提示词'}
        >
          {copied ? '✓ 已复制' : task.prompt}
        </div>
      )}
      {task.status === 'failed' && (
        <div>
          <button
            type="button"
            onClick={handleRetry}
          >
            {t('playground.studio_retry', { defaultValue: '重试' })}
          </button>
          <button
            type="button"
            onClick={handleDelete}
          >
            {t('playground.studio_delete', { defaultValue: '删除' })}
          </button>
        </div>
      )}
    </div>
  );
}

// ── GalleryCard ─────────────────────────────────────────────────────────────

const GALLERY_COL_WIDTH = 200;
const GALLERY_OVERLAY_HEIGHT = 104;

function GalleryCard({ item, index }: { item: GalleryItem; index: number }) {
  const { t } = useTranslation();
  const { setPreviewItem, deleteGalleryItem, useAsReference, regenerate, generatedAssetRetentionDays } = useStudio();
  const { copied, copy } = useCopyOnClick(item.prompt);
  const aspectRatio = parseAspectRatio(item.size);
  const createdAtLabel = formatCreatedAt(item.createdAt);
  const expiryNotice = getExpiryNotice(item.createdAt, generatedAssetRetentionDays);
  const estimatedHeight = aspectRatio
    ? Math.round(GALLERY_COL_WIDTH / aspectRatio) + GALLERY_OVERLAY_HEIGHT
    : 0;
  const { ref, near, placeholderHeight } = useNearViewport('800px', estimatedHeight);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    void downloadImage(item.url, item.alt);
  };

  const handleRegenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!await confirm(t('playground.studio_confirm_regenerate', { defaultValue: '确定要重新生成吗？将消耗一次生成额度。' }))) return;
    regenerate(item);
  };

  const handleUseAsReference = (e: React.MouseEvent) => {
    e.stopPropagation();
    useAsReference(item);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!await confirm(t('playground.studio_confirm_delete', { defaultValue: '确定要删除这张图片吗？' }))) return;
    deleteGalleryItem(item.id);
  };

  if (!near && placeholderHeight > 0) {
    return (
      <div
        ref={ref}
      />
    );
  }

  return (
    <div
      ref={ref}
    >
      <img
        src={item.url}
        srcSet={buildThumbSrcSet(item.url)}
        sizes="(max-width: 1023px) 50vw, 200px"
        alt={item.alt || item.prompt}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        onClick={() => setPreviewItem(item)}
      />
      <div>
        <div>
          {item.size && (
            <span>{item.size}</span>
          )}
              <span>
                {t('playground.studio_created_at', { defaultValue: '创建于' })}
                {' '}
                {createdAtLabel}
              </span>
          {expiryNotice && (
            <span
              >
                {expiryNotice.tone === 'danger'
                ? t('playground.studio_asset_expired', { defaultValue: '已过期，请立即保存' })
                : t('playground.studio_asset_expiring', { defaultValue: '还有 {{time}} 过期，请尽快保存', time: expiryNotice.remainingLabel })}
              </span>
          )}
        </div>
        <div>
          {item.prompt && (
            <div
              onClick={copy}
              title={copied ? '已复制到剪贴板' : '点击复制提示词'}
            >
              {copied ? '✓ 已复制' : item.prompt}
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={handleDownload}
            title={t('playground.studio_download', { defaultValue: '下载' })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            title={t('playground.studio_regenerate', { defaultValue: '重试' })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleUseAsReference}
            title={t('playground.studio_use_as_reference', { defaultValue: '参考图' })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5" />
              <path d="M21 3l-7 7" />
              <path d="M8 21H3v-5" />
              <path d="M3 21l7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            title={t('playground.studio_delete', { defaultValue: '删除' })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PreviewOverlay ──────────────────────────────────────────────────────────

function PreviewOverlay() {
  const { previewItem, setPreviewItem } = useStudio();
  const [hiResReady, setHiResReady] = useState(false);

  useEffect(() => {
    if (!previewItem) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewItem(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [previewItem, setPreviewItem]);

  // Preload the original off-DOM. When ready, swap the displayed src from the
  // 512-wide thumb (often already cached by the gallery grid) to the full-res
  // image. Reset on every previewItem change so navigation between items
  // re-shows the placeholder until the new hi-res arrives.
  useEffect(() => {
    setHiResReady(false);
    if (!previewItem) return;
    if (!isLocalRuntimeAsset(previewItem.url)) {
      setHiResReady(true);
      return;
    }
    const img = new window.Image();
    let cancelled = false;
    img.onload = () => { if (!cancelled) setHiResReady(true); };
    img.onerror = () => { if (!cancelled) setHiResReady(true); };
    img.src = previewItem.url;
    return () => { cancelled = true; };
  }, [previewItem]);

  if (!previewItem) return null;

  const useProgressive = isLocalRuntimeAsset(previewItem.url) && !hiResReady;
  const displaySrc = useProgressive
    ? `${previewItem.url}${previewItem.url.includes('?') ? '&' : '?'}w=512`
    : previewItem.url;

  return (
    <div onClick={() => setPreviewItem(null)}>
      <button
        type="button"
        onClick={() => setPreviewItem(null)}
      >
        ×
      </button>
      <img
        src={displaySrc}
        alt={previewItem.alt || previewItem.prompt}
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

// ── EmptyState ──────────────────────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div>
      <div>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
      <div>{t('playground.studio_gallery_empty', { defaultValue: '还没有生成的图片' })}</div>
      <div>
        {t('playground.studio_gallery_empty_hint', { defaultValue: '在下方输入框输入提示词，开始创作' })}
      </div>
      <div>
        <div>
          <span>Enter</span>
          <span>{t('playground.studio_shortcut_send', { defaultValue: '发送' })}</span>
        </div>
        <div>
          <span>Shift</span>
          <span>+</span>
          <span>Enter</span>
          <span>{t('playground.studio_shortcut_newline', { defaultValue: '换行' })}</span>
        </div>
      </div>
    </div>
  );
}

// ── GalleryView ─────────────────────────────────────────────────────────────

export function GalleryView() {
  const { gallery, tasks, previewItem, hasMore, loadingMore, loadMore } = useStudio();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) {
      loadMore();
    }
  }, [loadMore, loadingMore, hasMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const visibleTasks = tasks.filter(t => t.status !== 'completed');
  const isEmpty = gallery.length === 0 && visibleTasks.length === 0;

  return (
    <div ref={scrollRef}>
      {previewItem && <PreviewOverlay />}

      {isEmpty ? (
        <EmptyState />
      ) : (
        <div>
          {visibleTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
          {gallery.map((item, i) => (
            <GalleryCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
      {loadingMore && (
        <div>加载中...</div>
      )}
    </div>
  );
}
