import { type CSSProperties, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cssVar } from '@doudou-start/airgate-theme';
import { useStudio } from './StudioContext';
import type { GalleryItem, StudioGenerationTask } from './types';
import { studioStyles as ss } from './studioStyles';
import { downloadImage } from '../utils';

// ── TaskCard ────────────────────────────────────────────────────────────────

const taskCardStyles: Record<string, CSSProperties> = {
  card: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    marginBottom: 14,
    breakInside: 'avoid',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  } as CSSProperties,
  spinner: {
    width: 32,
    height: 32,
    border: '2px solid rgba(255, 255, 255, 0.08)',
    borderTopColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  failedIcon: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '2px solid rgba(248, 113, 113, 0.4)',
    color: '#f87171',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 700,
    flexShrink: 0,
  },
  prompt: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    lineHeight: 1.45,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.3)',
    fontFamily: cssVar('fontMono'),
  },
  deleteBtn: {
    marginTop: 4,
    padding: '4px 12px',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    borderRadius: 6,
    background: 'transparent',
    color: '#f87171',
    fontSize: 10,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
};

function TaskCard({ task }: { task: StudioGenerationTask }) {
  const { t } = useTranslation();
  const { deleteTask } = useStudio();

  const statusLabel = task.status === 'queued'
    ? t('playground.studio_task_queued', { defaultValue: '队列中...' })
    : task.status === 'failed'
      ? t('playground.studio_task_failed', { defaultValue: '生成失败' })
      : t('playground.studio_task_processing', { defaultValue: '生成中...' });

  const handleDelete = () => {
    if (!window.confirm(t('playground.studio_confirm_delete_task', { defaultValue: '确定要删除这个任务吗？' }))) return;
    deleteTask(task.id);
  };

  return (
    <div style={taskCardStyles.card}>
      {task.status === 'failed' ? (
        <div style={taskCardStyles.failedIcon}>!</div>
      ) : (
        <div style={taskCardStyles.spinner} />
      )}
      <div style={taskCardStyles.statusLabel}>{statusLabel}</div>
      {task.status === 'failed' && task.error && (
        <div style={taskCardStyles.prompt}>{task.error}</div>
      )}
      {task.prompt && task.status !== 'failed' && (
        <div style={taskCardStyles.prompt}>{task.prompt}</div>
      )}
      {task.status === 'failed' && (
        <button
          type="button"
          style={taskCardStyles.deleteBtn}
          className="studio-gallery-action"
          onClick={handleDelete}
        >
          {t('playground.studio_delete', { defaultValue: '删除' })}
        </button>
      )}
    </div>
  );
}

// ── GalleryCard ─────────────────────────────────────────────────────────────

function GalleryCard({ item, index }: { item: GalleryItem; index: number }) {
  const { t } = useTranslation();
  const { setPreviewItem, deleteGalleryItem, useAsReference, regenerate } = useStudio();

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    void downloadImage(item.url, item.alt);
  };

  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('playground.studio_confirm_regenerate', { defaultValue: '确定要重新生成吗？将消耗一次生成额度。' }))) return;
    regenerate(item);
  };

  const handleUseAsReference = (e: React.MouseEvent) => {
    e.stopPropagation();
    useAsReference(item);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('playground.studio_confirm_delete', { defaultValue: '确定要删除这张图片吗？' }))) return;
    deleteGalleryItem(item.id);
  };

  return (
    <div
      style={{ ...ss.galleryCard, animationDelay: `${Math.min(index * 50, 300)}ms` }}
      className="studio-gallery-card"
    >
      <img
        src={item.url}
        alt={item.alt || item.prompt}
        style={ss.galleryCardImg}
        loading="lazy"
        onClick={() => setPreviewItem(item)}
      />
      <div style={ss.galleryCardOverlay}>
        {item.prompt && (
          <div style={ss.galleryCardPrompt}>{item.prompt}</div>
        )}
        <div style={ss.galleryCardActions}>
          <button
            type="button"
            style={ss.galleryCardActionBtn}
            className="studio-gallery-action"
            onClick={handleDownload}
            title={t('playground.studio_download', { defaultValue: '下载' })}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 3 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t('playground.studio_download', { defaultValue: '下载' })}
          </button>
          <button
            type="button"
            style={ss.galleryCardActionBtn}
            className="studio-gallery-action"
            onClick={handleRegenerate}
            title={t('playground.studio_regenerate', { defaultValue: '重试' })}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 3 }}>
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            {t('playground.studio_regenerate', { defaultValue: '重试' })}
          </button>
          <button
            type="button"
            style={ss.galleryCardActionBtn}
            className="studio-gallery-action"
            onClick={handleUseAsReference}
            title={t('playground.studio_use_as_reference', { defaultValue: '参考图' })}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 3 }}>
              <path d="M16 3h5v5" />
              <path d="M21 3l-7 7" />
              <path d="M8 21H3v-5" />
              <path d="M3 21l7-7" />
            </svg>
            {t('playground.studio_use_as_reference', { defaultValue: '参考图' })}
          </button>
          <button
            type="button"
            style={ss.galleryCardActionBtn}
            className="studio-gallery-action"
            onClick={handleDelete}
            title={t('playground.studio_delete', { defaultValue: '删除' })}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 3 }}>
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            {t('playground.studio_delete', { defaultValue: '删除' })}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PreviewOverlay ──────────────────────────────────────────────────────────

function PreviewOverlay() {
  const { previewItem, setPreviewItem } = useStudio();

  useEffect(() => {
    if (!previewItem) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewItem(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [previewItem, setPreviewItem]);

  if (!previewItem) return null;

  return (
    <div style={ss.previewOverlay} onClick={() => setPreviewItem(null)}>
      <button
        type="button"
        style={ss.previewCloseBtn}
        className="studio-preview-close"
        onClick={() => setPreviewItem(null)}
      >
        ×
      </button>
      <img
        src={previewItem.url}
        alt={previewItem.alt || previewItem.prompt}
        style={ss.previewOverlayImg}
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

// ── EmptyState ──────────────────────────────────────────────────────────────

const emptyStyles: Record<string, CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    height: '100%',
    minHeight: 400,
    userSelect: 'none',
    paddingBottom: 80,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 32,
    background: `radial-gradient(circle at 40% 35%, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 70%, transparent 100%)`,
    border: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: cssVar('textSecondary'),
    letterSpacing: '-0.01em',
  },
  hint: {
    fontSize: 13,
    marginTop: 2,
    color: cssVar('textTertiary'),
    opacity: 0.5,
    fontFamily: cssVar('fontMono'),
    letterSpacing: '0.02em',
  },
  shortcutRow: {
    display: 'flex',
    gap: 16,
    marginTop: 8,
  },
  shortcutItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: cssVar('textTertiary'),
    opacity: 0.4,
    fontFamily: cssVar('fontMono'),
  },
  kbd: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    height: 20,
    padding: '0 5px',
    borderRadius: 5,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontSize: 10,
    fontWeight: 600,
    fontFamily: cssVar('fontMono'),
    color: cssVar('textTertiary'),
  },
};

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div style={emptyStyles.wrapper}>
      <div style={emptyStyles.iconWrap}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
      <div style={emptyStyles.title}>{t('playground.studio_gallery_empty', { defaultValue: '还没有生成的图片' })}</div>
      <div style={emptyStyles.hint}>
        {t('playground.studio_gallery_empty_hint', { defaultValue: '在下方输入框输入提示词，开始创作' })}
      </div>
      <div style={emptyStyles.shortcutRow}>
        <div style={emptyStyles.shortcutItem}>
          <span style={emptyStyles.kbd}>Enter</span>
          <span>{t('playground.studio_shortcut_send', { defaultValue: '发送' })}</span>
        </div>
        <div style={emptyStyles.shortcutItem}>
          <span style={emptyStyles.kbd}>Shift</span>
          <span>+</span>
          <span style={emptyStyles.kbd}>Enter</span>
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
    <div ref={scrollRef} style={ss.gallery} className="studio-gallery">
      {previewItem && <PreviewOverlay />}

      {isEmpty ? (
        <EmptyState />
      ) : (
        <div style={ss.galleryGrid}>
          {visibleTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
          {gallery.map((item, i) => (
            <GalleryCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
      {loadingMore && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: cssVar('textTertiary'), fontSize: 12 }}>加载中...</div>
      )}
    </div>
  );
}
