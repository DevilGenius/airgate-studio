import type { CSSProperties } from 'react';
import { cssVar } from '@doudou-start/airgate-theme';

export const studioStyles: Record<string, CSSProperties> = {
  // ── Layout ────────────────────────────────────────────────────────────────

  layout: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100vh',
    background: cssVar('bgDeep'),
    color: cssVar('text'),
    fontFamily: cssVar('fontSans'),
    position: 'relative',
  },

  // ── Sidebar ───────────────────────────────────────────────────────────────

  sidebar: {
    width: 320,
    minWidth: 320,
    maxWidth: 320,
    height: '100%',
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    background: cssVar('glass'),
    backdropFilter: 'blur(24px) saturate(1.2)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
    borderLeft: `1px solid ${cssVar('glassBorder')}`,
    overflowY: 'auto',
    overflowX: 'hidden',
    flexShrink: 0,
    boxShadow: `-1px 0 32px rgba(0, 0, 0, 0.3)`,
  },

  sidebarHeader: {
    padding: '14px 14px 6px 14px',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: cssVar('textTertiary'),
    fontFamily: cssVar('fontMono'),
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },

  // ── Media type selector ───────────────────────────────────────────────────

  mediaTypeRow: {
    display: 'flex',
    gap: 6,
    padding: '8px 16px 16px',
  },

  mediaTypeBtn: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    padding: '0 12px',
    border: `1px solid ${cssVar('borderSubtle')}`,
    borderRadius: 10,
    background: 'transparent',
    color: cssVar('textSecondary'),
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    whiteSpace: 'nowrap',
  },

  mediaTypeBtnActive: {
    background: cssVar('primarySubtle'),
    borderColor: `color-mix(in oklab, ${cssVar('primary')} 30%, transparent)`,
    color: cssVar('text'),
    fontWeight: 600,
    boxShadow: `0 0 16px ${cssVar('primaryGlow')}`,
  },

  mediaTypeBtnDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },

  // ── Mode tabs (text2img / img2img / inpaint / batch) ──────────────────────

  modeTabRow: {
    display: 'flex',
    gap: 2,
    padding: '0 16px 14px',
    flexWrap: 'wrap',
  },

  modeTab: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    padding: '0 14px',
    border: 'none',
    borderRadius: 8,
    background: 'transparent',
    color: cssVar('textTertiary'),
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
    whiteSpace: 'nowrap',
  },

  modeTabActive: {
    background: cssVar('bgHover'),
    color: cssVar('text'),
    fontWeight: 700,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
  },

  // ── Panel body ────────────────────────────────────────────────────────────

  panelBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: '4px 16px 80px',
    overflowY: 'auto',
    overflowX: 'hidden',
  },

  // ── Shared form controls ──────────────────────────────────────────────────

  formLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: cssVar('textTertiary'),
    textTransform: 'uppercase',
    fontFamily: cssVar('fontMono'),
    marginBottom: 6,
    display: 'block',
    userSelect: 'none',
  },

  formRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },

  formTextarea: {
    width: '100%',
    minHeight: 88,
    maxHeight: 200,
    padding: '12px 14px',
    border: `1px solid ${cssVar('borderSubtle')}`,
    borderRadius: 10,
    background: cssVar('bgDeep'),
    color: cssVar('text'),
    fontSize: 13,
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.55,
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },

  formInput: {
    width: '100%',
    height: 36,
    padding: '0 12px',
    border: `1px solid ${cssVar('borderSubtle')}`,
    borderRadius: 10,
    background: cssVar('bgDeep'),
    color: cssVar('text'),
    fontSize: 12,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },

  formSelect: {
    width: '100%',
    height: 36,
    padding: '0 12px',
    border: `1px solid ${cssVar('borderSubtle')}`,
    borderRadius: 10,
    background: cssVar('bgDeep'),
    color: cssVar('text'),
    fontSize: 12,
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },

  formCountGroup: {
    display: 'flex',
    gap: 6,
  },

  formCountBtn: {
    flex: 1,
    padding: '7px 0',
    border: `1px solid ${cssVar('borderSubtle')}`,
    borderRadius: 8,
    background: 'transparent',
    color: cssVar('textSecondary'),
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  formCountBtnActive: {
    flex: 1,
    padding: '7px 0',
    border: `1px solid color-mix(in oklab, ${cssVar('primary')} 40%, transparent)`,
    borderRadius: 8,
    background: cssVar('primarySubtle'),
    color: cssVar('text'),
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'inherit',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    boxShadow: `0 0 12px ${cssVar('primaryGlow')}`,
    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  formGenerateBtn: {
    width: '100%',
    padding: '11px 0',
    border: 'none',
    borderRadius: 10,
    background: cssVar('primary'),
    color: cssVar('primaryForeground'),
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    letterSpacing: '0.02em',
    marginTop: 6,
    position: 'relative',
    overflow: 'hidden',
  },

  formGenerateBtnDisabled: {
    width: '100%',
    padding: '11px 0',
    border: `1px solid ${cssVar('borderSubtle')}`,
    borderRadius: 10,
    background: 'transparent',
    color: cssVar('textTertiary'),
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'not-allowed',
    opacity: 0.5,
    marginTop: 6,
    letterSpacing: '0.02em',
  },

  formUploadArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 100,
    padding: '20px 16px',
    border: `1.5px dashed ${cssVar('borderSubtle')}`,
    borderRadius: 12,
    background: 'transparent',
    color: cssVar('textTertiary'),
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    textAlign: 'center',
    userSelect: 'none',
  },

  formUploadAreaDragging: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 100,
    padding: '20px 16px',
    border: `1.5px dashed ${cssVar('primary')}`,
    borderRadius: 12,
    background: cssVar('primarySubtle'),
    color: cssVar('text'),
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    textAlign: 'center',
    userSelect: 'none',
  },

  formHint: {
    fontSize: 11,
    color: cssVar('textTertiary'),
    marginTop: 2,
    fontFamily: cssVar('fontMono'),
  },

  // ── Upload area ───────────────────────────────────────────────────────────

  uploadArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 100,
    padding: '16px 12px',
    border: `1.5px dashed ${cssVar('borderSubtle')}`,
    borderRadius: 12,
    background: 'transparent',
    color: cssVar('textTertiary'),
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    textAlign: 'center',
    userSelect: 'none',
  },

  uploadPreview: {
    position: 'relative',
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    background: cssVar('bgDeep'),
    border: `1px solid ${cssVar('borderSubtle')}`,
    aspectRatio: '1 / 1',
  },

  uploadPreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },

  // ── Generate button ───────────────────────────────────────────────────────

  generateBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    width: '100%',
    height: 42,
    border: 'none',
    borderRadius: 10,
    background: cssVar('primary'),
    color: cssVar('primaryForeground'),
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    letterSpacing: '0.02em',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  },

  generateBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },

  // ── Slider ────────────────────────────────────────────────────────────────

  slider: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },

  sliderLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: cssVar('textSecondary'),
    fontWeight: 500,
  },

  sliderInput: {
    width: '100%',
    cursor: 'pointer',
    accentColor: cssVar('primary'),
  },

  // ── Gallery (left pane) ───────────────────────────────────────────────────

  gallery: {
    flex: 1,
    minWidth: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '20px',
    background: cssVar('bgDeep'),
  },

  galleryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 14,
    alignContent: 'start',
  },

  galleryEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: 400,
    color: cssVar('textTertiary'),
    fontSize: 13,
    textAlign: 'center',
    userSelect: 'none',
  },

  galleryCard: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    background: cssVar('bgElevated'),
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)',
    cursor: 'pointer',
    aspectRatio: '1 / 1',
    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  galleryCardImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },

  galleryCardOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.82) 0%, rgba(0, 0, 0, 0.25) 40%, rgba(0, 0, 0, 0) 60%)',
    opacity: 0,
    transition: 'opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: '14px',
  },

  galleryCardPrompt: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 1.45,
    marginBottom: 8,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    letterSpacing: '0.01em',
  },

  galleryCardActions: {
    display: 'flex',
    gap: 5,
    flexWrap: 'wrap',
  },

  galleryCardActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    padding: '0 10px',
    border: 'none',
    borderRadius: 7,
    background: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
    letterSpacing: '0.02em',
  },

  // ── Quick input bar (floating) ────────────────────────────────────────────

  quickInput: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    maxWidth: 900,
    margin: '0 auto',
    zIndex: 10,
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 16,
    background: cssVar('glass'),
    backdropFilter: 'blur(24px) saturate(1.2)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
    border: `1px solid ${cssVar('glassBorder')}`,
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.4), 0 2px 12px rgba(0, 0, 0, 0.2)',
    transition: 'box-shadow 0.3s',
  },

  quickInputTextarea: {
    flex: 1,
    minHeight: 24,
    maxHeight: 120,
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: cssVar('text'),
    fontSize: 13,
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    lineHeight: 1.5,
  },

  quickInputSendBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    border: 'none',
    borderRadius: 10,
    background: cssVar('primary'),
    color: cssVar('primaryForeground'),
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: `0 0 16px ${cssVar('primaryGlow')}`,
  },

  // ── Section divider ───────────────────────────────────────────────────────

  sectionDivider: {
    height: 1,
    margin: '4px 16px',
    background: `linear-gradient(to right, transparent, ${cssVar('borderSubtle')}, transparent)`,
    flexShrink: 0,
  },

  // ── Badge ─────────────────────────────────────────────────────────────────

  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 18,
    padding: '0 6px',
    borderRadius: 5,
    background: cssVar('bgHover'),
    color: cssVar('textTertiary'),
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    flexShrink: 0,
    fontFamily: cssVar('fontMono'),
  },

  badgeProcessing: {
    background: cssVar('primarySubtle'),
    color: cssVar('primary'),
  },

  badgeCompleted: {
    background: 'rgba(74, 222, 128, 0.12)',
    color: '#4ade80',
  },

  badgeFailed: {
    background: 'rgba(248, 113, 113, 0.12)',
    color: '#f87171',
  },

  // ── Fullscreen preview overlay ────────────────────────────────────────────

  previewOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(20px) saturate(0.8)',
    WebkitBackdropFilter: 'blur(20px) saturate(0.8)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewOverlayImg: {
    maxWidth: 'min(90vw, 1200px)',
    maxHeight: '78vh',
    borderRadius: 14,
    boxShadow: '0 32px 80px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.3)',
    objectFit: 'contain',
  },

  previewOverlayMeta: {
    marginTop: 16,
    padding: '12px 20px',
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    maxWidth: 'min(90vw, 600px)',
    textAlign: 'center',
    lineHeight: 1.6,
  },

  previewOverlayActions: {
    display: 'flex',
    gap: 8,
    marginTop: 14,
  },

  previewOverlayBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    padding: '0 18px',
    border: 'none',
    borderRadius: 10,
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
    letterSpacing: '0.02em',
  },

  previewOverlayClose: {
    position: 'absolute',
    top: 20,
    right: 20,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: '#fff',
    fontSize: 20,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  },

  // ── Advanced workflow link ─────────────────────────────────────────────────

  advancedLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '10px 16px 14px',
    fontSize: 11,
    fontWeight: 600,
    color: cssVar('textTertiary'),
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'color 0.15s',
    letterSpacing: '0.01em',
    userSelect: 'none',
  },
};

export const studioCSS = `
  .studio-gallery-card:hover {
    transform: translateY(-5px) scale(1.01);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3);
  }
  .studio-gallery-card:hover .studio-gallery-overlay {
    opacity: 1;
  }
  .studio-gallery-card:active {
    transform: translateY(-2px) scale(1.0);
  }

  .studio-gallery-action:hover {
    background: rgba(255, 255, 255, 0.22) !important;
  }

  .studio-gen-btn:hover:not(:disabled) {
    opacity: 0.92;
    box-shadow: 0 0 24px ${cssVar('primaryGlow')};
    transform: translateY(-1px);
  }
  .studio-gen-btn:active:not(:disabled) {
    transform: translateY(0);
    opacity: 1;
  }

  .studio-send-btn:hover:not(:disabled) {
    transform: scale(1.06);
    box-shadow: 0 0 20px ${cssVar('primaryGlow')};
  }

  .studio-quick-input:focus-within {
    border-color: color-mix(in oklab, ${cssVar('primary')} 35%, transparent);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4), 0 2px 12px rgba(0, 0, 0, 0.2), 0 0 0 1px color-mix(in oklab, ${cssVar('primary')} 12%, transparent);
  }

  .studio-textarea:focus {
    border-color: color-mix(in oklab, ${cssVar('primary')} 30%, transparent) !important;
    box-shadow: 0 0 0 3px ${cssVar('primaryGlow')};
  }

  .studio-media-btn:hover:not(:disabled) {
    background: ${cssVar('bgHover')};
    border-color: ${cssVar('border')};
  }

  .studio-mode-tab:hover {
    background: ${cssVar('bgHover')};
    color: ${cssVar('textSecondary')};
  }

  .studio-preview-btn:hover {
    background: rgba(255, 255, 255, 0.16) !important;
  }

  .studio-preview-close:hover {
    background: rgba(255, 255, 255, 0.12) !important;
  }

  .studio-count-btn:hover:not(.studio-count-active) {
    background: ${cssVar('bgHover')};
    border-color: ${cssVar('border')};
    color: ${cssVar('text')};
  }

  .studio-upload-area:hover {
    border-color: ${cssVar('border')};
    background: ${cssVar('bgHover')};
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes studioFadeIn {
    from { opacity: 0; transform: translateY(8px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes studioPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  @keyframes studioShimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .studio-gallery-card {
    animation: studioFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) backwards;
  }

  .studio-sidebar::-webkit-scrollbar {
    width: 4px;
  }
  .studio-sidebar::-webkit-scrollbar-track {
    background: transparent;
  }
  .studio-sidebar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }
  .studio-sidebar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.14);
  }

  .studio-gallery::-webkit-scrollbar {
    width: 6px;
  }
  .studio-gallery::-webkit-scrollbar-track {
    background: transparent;
  }
  .studio-gallery::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.06);
    border-radius: 6px;
  }
  .studio-gallery::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.12);
  }
`;
