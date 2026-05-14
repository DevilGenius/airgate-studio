import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cssVar } from '@doudou-start/airgate-theme';
import { StudioProvider, useStudio } from './StudioContext';
import { ImageModule } from './image/ImageModule';
import { GalleryView } from './GalleryView';
import { studioStyles as ss, studioCSS } from './studioStyles';

// ── QuickInput (floating command bar) ────────────────────────────────────────

function QuickInput() {
  const { t } = useTranslation();
  const { isGenerating, generate, selectedModelId, imageSize } = useStudio();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = text.trim().length > 0 && !isGenerating;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;
    void generate(trimmed);
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={ss.quickInput} className="studio-quick-input">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={quickStyles.meta}>
          {selectedModelId && (
            <span style={quickStyles.metaBadge}>{selectedModelId}</span>
          )}
          {imageSize && imageSize !== 'auto' && (
            <span style={quickStyles.metaBadge}>{imageSize}</span>
          )}
          <span style={quickStyles.metaHint}>
            {t('playground.studio_quick_hint', { defaultValue: 'Enter 发送 · Shift+Enter 换行' })}
          </span>
        </div>
        <textarea
          ref={textareaRef}
          style={ss.quickInputTextarea}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('playground.studio_quick_placeholder', { defaultValue: '快速生成一张图片...' })}
          rows={1}
          disabled={isGenerating}
        />
      </div>
      <button
        type="button"
        style={{
          ...ss.quickInputSendBtn,
          ...(canSend ? {} : quickStyles.sendBtnDisabled),
        }}
        className={canSend ? 'studio-send-btn' : ''}
        onClick={handleSend}
        disabled={!canSend}
        title={t('playground.studio_generate', { defaultValue: '生成' })}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}

const backBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  color: cssVar('textSecondary'),
  cursor: 'pointer',
  textDecoration: 'none',
  flexShrink: 0,
  transition: 'color 0.15s, background 0.15s',
};

const quickStyles: Record<string, CSSProperties> = {
  meta: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    fontSize: 10,
    color: cssVar('textTertiary'),
  },
  metaBadge: {
    padding: '2px 7px',
    borderRadius: 5,
    background: cssVar('bgHover'),
    fontSize: 10,
    color: cssVar('textSecondary'),
    fontFamily: cssVar('fontMono'),
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  metaHint: {
    opacity: 0.6,
    fontFamily: cssVar('fontMono'),
    letterSpacing: '0.02em',
  },
  sendBtnDisabled: {
    background: cssVar('bgHover'),
    color: cssVar('textTertiary'),
    cursor: 'not-allowed',
    boxShadow: 'none',
    opacity: 0.4,
  },
};

// ── Mobile styles ────────────────────────────────────────────────────────────

const mobileStyles: Record<string, CSSProperties> = {
  layout: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: cssVar('bgDeep'),
    color: cssVar('text'),
    fontFamily: cssVar('fontSans'),
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 14px',
    background: cssVar('glass'),
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: `1px solid ${cssVar('glassBorder')}`,
    overflowX: 'auto',
    flexShrink: 0,
  },
  topBarPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '7px 14px',
    border: 'none',
    borderRadius: 10,
    background: 'transparent',
    color: cssVar('textSecondary'),
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'inherit',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.18s',
  },
  topBarPillActive: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '7px 14px',
    border: 'none',
    borderRadius: 10,
    background: cssVar('primarySubtle'),
    color: cssVar('text'),
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'inherit',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.18s',
  },
  topBarPillDisabled: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '7px 14px',
    border: 'none',
    borderRadius: 10,
    background: 'transparent',
    color: cssVar('textTertiary'),
    cursor: 'not-allowed',
    fontSize: 12,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    opacity: 0.35,
  },
  panelSection: {
    padding: '14px',
    borderBottom: `1px solid ${cssVar('borderSubtle')}`,
    background: cssVar('glass'),
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    overflowY: 'auto',
    maxHeight: 340,
    flexShrink: 0,
  },
  panelToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: cssVar('bg'),
    borderBottom: `1px solid ${cssVar('borderSubtle')}`,
    cursor: 'pointer',
    border: 'none',
    width: '100%',
    color: cssVar('textSecondary'),
    fontSize: 11,
    fontFamily: cssVar('fontMono'),
    fontWeight: 700,
    flexShrink: 0,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  galleryArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  },
};

// ── Desktop sidebar styles ──────────────────────────────────────────────────

const desktopSidebar: Record<string, CSSProperties> = {
  mediaTypeGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '4px 12px 8px',
  },
  mediaTypeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    padding: '9px 12px',
    border: 'none',
    borderRadius: 10,
    background: 'transparent',
    color: cssVar('textSecondary'),
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  mediaTypeBtnActive: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    padding: '9px 12px',
    border: 'none',
    borderRadius: 10,
    background: cssVar('primarySubtle'),
    color: cssVar('text'),
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'inherit',
    fontWeight: 600,
    textAlign: 'left',
    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${cssVar('primary')} 15%, transparent)`,
  },
  mediaTypeBtnDisabled: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    padding: '9px 12px',
    border: 'none',
    borderRadius: 10,
    background: 'transparent',
    color: cssVar('textTertiary'),
    cursor: 'not-allowed',
    fontSize: 13,
    fontFamily: 'inherit',
    textAlign: 'left',
    opacity: 0.35,
  },
  comingSoonBadge: {
    marginLeft: 'auto',
    fontSize: 9,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 5,
    background: cssVar('bgHover'),
    color: cssVar('textTertiary'),
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontFamily: cssVar('fontMono'),
  },
  sidebarScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 4px 20px',
  },
};

// ── StudioLayout ─────────────────────────────────────────────────────────────

function StudioLayout() {
  const { t } = useTranslation();
  const { mediaType, setMediaType } = useStudio();

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [panelExpanded, setPanelExpanded] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isMobile) {
    return (
      <div style={mobileStyles.layout}>
        <style>{studioCSS}</style>

        <div style={mobileStyles.topBar}>
          <a href="/" style={backBtnStyle} title="返回控制台">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
          </a>
          <button
            type="button"
            style={mediaType === 'image' ? mobileStyles.topBarPillActive : mobileStyles.topBarPill}
            onClick={() => setMediaType('image')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
            {t('playground.studio_media_image', { defaultValue: '图片' })}
          </button>
          <button type="button" style={mobileStyles.topBarPillDisabled} disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
            {t('playground.studio_media_video', { defaultValue: '视频' })}
          </button>
          <button type="button" style={mobileStyles.topBarPillDisabled} disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            {t('playground.studio_media_music', { defaultValue: '音乐' })}
          </button>
        </div>

        <button
          type="button"
          style={mobileStyles.panelToggle}
          onClick={() => setPanelExpanded(!panelExpanded)}
        >
          <span>{t('playground.studio_settings', { defaultValue: '设置面板' })}</span>
          <span style={{ fontSize: 10, transition: 'transform 0.25s', transform: panelExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            &#9662;
          </span>
        </button>

        {panelExpanded && (
          <div style={mobileStyles.panelSection}>
            {mediaType === 'image' && <ImageModule />}
          </div>
        )}

        <div style={mobileStyles.galleryArea}>
          <GalleryView />
          <QuickInput />
        </div>
      </div>
    );
  }

  return (
    <div style={ss.layout}>
      <style>{studioCSS}</style>

      {/* Left: gallery */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        <GalleryView />
        <QuickInput />
      </div>

      {/* Right: sidebar */}
      <div style={ss.sidebar} className="studio-sidebar">
        <div style={ss.sidebarHeader}>
          <a href="/" style={backBtnStyle} title="返回控制台">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
          </a>
          <span>{t('playground.studio_title', { defaultValue: '创作中心' })}</span>
        </div>

        <div style={desktopSidebar.sidebarScroll} className="studio-sidebar">
          {/* Media type selector */}
          <div style={desktopSidebar.mediaTypeGroup}>
            <button
              type="button"
              style={mediaType === 'image' ? desktopSidebar.mediaTypeBtnActive : desktopSidebar.mediaTypeBtn}
              className="studio-media-btn"
              onClick={() => setMediaType('image')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
              </svg>
              {t('playground.studio_media_image', { defaultValue: '图片' })}
            </button>
            <button type="button" style={desktopSidebar.mediaTypeBtnDisabled} disabled>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
              {t('playground.studio_media_video', { defaultValue: '视频' })}
              <span style={desktopSidebar.comingSoonBadge}>{t('playground.studio_coming_soon', { defaultValue: '即将推出' })}</span>
            </button>
            <button type="button" style={desktopSidebar.mediaTypeBtnDisabled} disabled>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
              </svg>
              {t('playground.studio_media_music', { defaultValue: '音乐' })}
              <span style={desktopSidebar.comingSoonBadge}>{t('playground.studio_coming_soon', { defaultValue: '即将推出' })}</span>
            </button>
          </div>

          <div style={ss.sectionDivider} />

          {/* Mode-specific panel */}
          {mediaType === 'image' && <ImageModule />}
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
