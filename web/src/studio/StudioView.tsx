import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type DragEvent, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cssVar } from '@doudou-start/airgate-theme';
import { StudioProvider, useStudio } from './StudioContext';
import { GalleryView } from './GalleryView';
import { studioStyles as ss, studioCSS } from './studioStyles';
import { SizeSelector } from './SizeSelector';
import { MODEL_REGISTRY } from './modelConfig';
import type { ImageMode } from './types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ── ComposerBar ─────────────────────────────────────────────────────────────

const MODES: Array<{ mode: ImageMode; label: string }> = [
  { mode: 'text2img', label: '文生图' },
  { mode: 'img2img', label: '图生图' },
  { mode: 'inpaint', label: '局部绘图' },
  { mode: 'batch', label: '批量' },
];

const COUNT_OPTIONS = [1, 2, 3, 4];

function ComposerBar() {
  const { t } = useTranslation();
  const {
    imageMode, setImageMode,
    currentModel, selectedModelId, setSelectedModelId,
    imageSize, setImageSize,
    isGenerating, generate,
    referenceImage, setReferenceImage,
  } = useStudio();

  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(1);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const needsSource = imageMode === 'img2img' || imageMode === 'inpaint';
  const activeSource = sourceImage ?? referenceImage;
  const canSend = prompt.trim().length > 0 && !isGenerating && (!needsSource || activeSource !== null);

  const handleSend = () => {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;

    if (imageMode === 'batch') {
      const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (const line of lines) {
        void generate(line, { count: 1 });
      }
    } else if (imageMode === 'text2img') {
      for (let i = 0; i < count; i++) {
        void generate(trimmed, { count: 1 });
      }
    } else {
      void generate(trimmed, { sourceImage: activeSource ?? undefined });
    }
    setPrompt('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setSourceImage(dataUrl);
    } catch { /* ignore */ }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const placeholders: Record<ImageMode, string> = {
    text2img: '描述你想生成的图片...',
    img2img: '描述你想要的变化...',
    inpaint: '描述要修改的区域...',
    batch: '每行一个提示词，批量生成...',
  };

  return (
    <div style={c.card} className="studio-quick-input">
      {/* Mode tabs */}
      <div style={c.tabs}>
        {MODES.map(m => (
          <button
            key={m.mode}
            type="button"
            style={imageMode === m.mode ? c.tabActive : c.tab}
            className="studio-mode-tab"
            onClick={() => setImageMode(m.mode)}
          >
            {t(`playground.studio_mode_${m.mode}`, { defaultValue: m.label })}
          </button>
        ))}
      </div>

      {/* Source image area (img2img / inpaint) */}
      {needsSource && (
        <div style={c.sourceRow}>
          {activeSource ? (
            <div style={c.sourceThumb}>
              <img src={activeSource} alt="source" style={c.sourceImg} />
              <button
                type="button"
                style={c.sourceRemove}
                onClick={() => { setSourceImage(null); setReferenceImage(null); }}
              >×</button>
            </div>
          ) : (
            <div
              style={isDragging ? { ...c.sourceUpload, borderColor: cssVar('primary'), background: cssVar('primarySubtle') } : c.sourceUpload}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}>
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
              </svg>
              <span>{t('playground.studio_upload_short', { defaultValue: '上传参考图' })}</span>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileInput} />
        </div>
      )}

      {/* Prompt textarea */}
      <textarea
        ref={textareaRef}
        style={c.textarea}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('playground.studio_quick_placeholder', { defaultValue: placeholders[imageMode] })}
        rows={imageMode === 'batch' ? 4 : 2}
        disabled={isGenerating}
      />

      {/* Toolbar row */}
      <div style={c.toolbar}>
        <div style={c.toolbarLeft}>
          <span style={c.modelBadge}>
            <span style={c.modelDot} />
            {currentModel.name}
          </span>
          <div style={c.sizePicker}>
            <SizeSelector value={imageSize} sizes={currentModel.sizes} onChange={setImageSize} upward compact />
          </div>
          {imageMode === 'text2img' && (
            <div style={c.countGroup}>
              {COUNT_OPTIONS.map(n => (
                <button
                  key={n}
                  type="button"
                  style={count === n ? c.countBtnActive : c.countBtn}
                  onClick={() => setCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          {imageMode === 'batch' && (
            <span style={c.batchHint}>
              {prompt.split('\n').filter(l => l.trim()).length || 0} 条
            </span>
          )}
        </div>
        <button
          type="button"
          style={{
            ...c.sendBtn,
            ...(canSend ? {} : c.sendBtnDisabled),
          }}
          className={canSend ? 'studio-send-btn' : ''}
          onClick={handleSend}
          disabled={!canSend}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── ComposerBar styles ──────────────────────────────────────────────────────

const c: Record<string, CSSProperties> = {
  card: {
    width: '100%',
    maxWidth: 720,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    padding: '6px 6px 10px',
    borderRadius: 20,
    background: cssVar('bgElevated'),
    border: `1px solid ${cssVar('glassBorder')}`,
    boxShadow: '0 8px 48px rgba(0, 0, 0, 0.4), 0 2px 12px rgba(0, 0, 0, 0.2)',
    transition: 'box-shadow 0.3s',
  },
  tabs: {
    display: 'flex',
    gap: 2,
    padding: '4px 8px',
  },
  tab: {
    padding: '5px 12px',
    border: 'none',
    borderRadius: 8,
    background: 'transparent',
    color: cssVar('textTertiary'),
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'inherit',
    fontWeight: 500,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    padding: '5px 12px',
    border: 'none',
    borderRadius: 8,
    background: cssVar('bgHover'),
    color: cssVar('text'),
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'inherit',
    fontWeight: 700,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sourceRow: {
    padding: '6px 12px',
  },
  sourceThumb: {
    position: 'relative',
    display: 'inline-flex',
    borderRadius: 10,
    overflow: 'hidden',
    border: `1px solid ${cssVar('borderSubtle')}`,
  },
  sourceImg: {
    width: 80,
    height: 60,
    objectFit: 'cover',
    display: 'block',
  },
  sourceRemove: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    border: 'none',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    padding: 0,
    lineHeight: 1,
  },
  sourceUpload: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 10,
    border: `1.5px dashed ${cssVar('borderSubtle')}`,
    background: 'transparent',
    color: cssVar('textTertiary'),
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  textarea: {
    width: '100%',
    minHeight: 40,
    maxHeight: 160,
    padding: '8px 14px',
    border: 'none',
    background: 'transparent',
    color: cssVar('text'),
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    lineHeight: 1.6,
    boxSizing: 'border-box',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '2px 8px 0',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  modelBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    borderRadius: 7,
    background: cssVar('bgHover'),
    color: cssVar('textSecondary'),
    fontSize: 11,
    fontFamily: cssVar('fontMono'),
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  modelDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#4ade80',
    flexShrink: 0,
    boxShadow: '0 0 5px rgba(74, 222, 128, 0.4)',
  },
  sizePicker: {
    flexShrink: 0,
    width: 180,
  },
  countGroup: {
    display: 'flex',
    gap: 2,
    flexShrink: 0,
  },
  countBtn: {
    width: 26,
    height: 26,
    border: `1px solid ${cssVar('borderSubtle')}`,
    borderRadius: 6,
    background: 'transparent',
    color: cssVar('textSecondary'),
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    transition: 'all 0.15s',
    padding: 0,
  },
  countBtnActive: {
    width: 26,
    height: 26,
    border: `1px solid color-mix(in oklab, ${cssVar('primary')} 40%, transparent)`,
    borderRadius: 6,
    background: cssVar('primarySubtle'),
    color: cssVar('text'),
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'inherit',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    transition: 'all 0.15s',
    padding: 0,
  },
  batchHint: {
    fontSize: 11,
    color: cssVar('textTertiary'),
    fontFamily: cssVar('fontMono'),
    whiteSpace: 'nowrap',
  },
  sendBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    border: 'none',
    borderRadius: 10,
    background: cssVar('primary'),
    color: cssVar('primaryForeground'),
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
    transition: 'all 0.2s',
    boxShadow: `0 0 12px ${cssVar('primaryGlow')}`,
  },
  sendBtnDisabled: {
    background: cssVar('bgHover'),
    color: cssVar('textTertiary'),
    cursor: 'not-allowed',
    boxShadow: 'none',
    opacity: 0.4,
  },
};

// ── Landing ─────────────────────────────────────────────────────────────────

const landing: Record<string, CSSProperties> = {
  wrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: cssVar('bgDeep'),
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: '40px 32px 0',
    userSelect: 'none',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 70%, transparent 100%)',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.04)',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: cssVar('text'),
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 13,
    color: cssVar('textTertiary'),
    opacity: 0.5,
  },
  bottom: {
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'center',
    padding: '24px 24px 32px',
  },
};

// ── Gallery mode ────────────────────────────────────────────────────────────

const galleryLayout: Record<string, CSSProperties> = {
  wrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: cssVar('bgDeep'),
    overflow: 'hidden',
    position: 'relative',
  },
  composerWrap: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    display: 'flex',
    justifyContent: 'center',
    zIndex: 10,
  },
};

// ── Back button ─────────────────────────────────────────────────────────────

const backBtnStyle: CSSProperties = {
  position: 'absolute',
  top: 14,
  left: 14,
  zIndex: 5,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 10,
  border: `1px solid ${cssVar('glassBorder')}`,
  background: cssVar('glass'),
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  color: cssVar('textSecondary'),
  cursor: 'pointer',
  textDecoration: 'none',
  transition: 'all 0.15s',
};

// ── StudioLayout ────────────────────────────────────────────────────────────

function StudioLayout() {
  const { gallery, tasks } = useStudio();

  const visibleTasks = tasks.filter(tk => tk.status !== 'completed');
  const isEmpty = gallery.length === 0 && visibleTasks.length === 0;

  if (isEmpty) {
    return (
      <div style={{ ...ss.layout, flexDirection: 'column' }}>
        <style>{studioCSS}</style>
        <a href="/" style={backBtnStyle} title="返回控制台">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </a>
        <div style={landing.center}>
          <div style={landing.iconWrap}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <div style={landing.title}>创作中心</div>
          <div style={landing.subtitle}>输入提示词，AI 为你生成图片</div>
        </div>
        <div style={landing.bottom}>
          <ComposerBar />
        </div>
      </div>
    );
  }

  return (
    <div style={ss.layout}>
      <style>{studioCSS}</style>
      <a href="/" style={backBtnStyle} title="返回控制台">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
        </svg>
      </a>
      <div style={galleryLayout.wrapper}>
        <GalleryView />
        <div style={galleryLayout.composerWrap}>
          <ComposerBar />
        </div>
      </div>
    </div>
  );
}

// ── StudioView (entry point) ────────────────────────────────────────────────

export function StudioView() {
  return (
    <StudioProvider>
      <StudioLayout />
    </StudioProvider>
  );
}
