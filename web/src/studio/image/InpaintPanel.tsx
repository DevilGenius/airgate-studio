import {
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { cssVar } from '@doudou-start/airgate-theme';
import { useStudio } from '../StudioContext';
import { CustomSelect } from '../CustomSelect';
import { SizeSelector } from '../SizeSelector';
import { MODEL_REGISTRY } from '../modelConfig';
import { studioStyles as ss } from '../studioStyles';

interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragState {
  startX: number;
  startY: number;
}

const local: Record<string, CSSProperties> = {
  canvasContainer: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    border: `1px solid ${cssVar('borderSubtle')}`,
    cursor: 'crosshair',
    userSelect: 'none',
  },
  sourceImg: {
    display: 'block',
    width: '100%',
    height: 'auto',
    maxHeight: 200,
    objectFit: 'contain',
    pointerEvents: 'none',
  },
  selectionRect: {
    position: 'absolute',
    border: '2px dashed rgba(255, 255, 255, 0.7)',
    background: 'rgba(255, 255, 255, 0.08)',
    boxSizing: 'border-box',
    pointerEvents: 'none',
    borderRadius: 2,
  },
  canvasActions: {
    display: 'flex',
    gap: 6,
    marginTop: 6,
  },
  actionBtn: {
    padding: '6px 12px',
    border: `1px solid ${cssVar('borderSubtle')}`,
    borderRadius: 8,
    background: 'transparent',
    color: cssVar('textSecondary'),
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'inherit',
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  selectionHint: {
    fontSize: 10,
    color: cssVar('textTertiary'),
    marginTop: 4,
    fontFamily: cssVar('fontMono'),
    letterSpacing: '0.02em',
  },
};

const modelBadge: CSSProperties = {
  padding: '9px 14px',
  borderRadius: 10,
  background: cssVar('bgDeep'),
  border: `1px solid ${cssVar('borderSubtle')}`,
  color: cssVar('text'),
  fontSize: 13,
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const modelDot: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#4ade80',
  flexShrink: 0,
  boxShadow: '0 0 6px rgba(74, 222, 128, 0.4)',
};

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function normalizeRect(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  containerW: number,
  containerH: number,
): NormalizedRect {
  const x = Math.min(startX, endX) / containerW;
  const y = Math.min(startY, endY) / containerH;
  const w = Math.abs(endX - startX) / containerW;
  const h = Math.abs(endY - startY) / containerH;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
    width:  Math.max(0, Math.min(1, w)),
    height: Math.max(0, Math.min(1, h)),
  };
}

export function InpaintPanel() {
  const { t } = useTranslation();
  const {
    currentModel,
    selectedModelId,
    setSelectedModelId,
    imageSize,
    setImageSize,
    isGenerating,
    generate,
  } = useStudio();

  const [prompt, setPrompt] = useState('');
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selection, setSelection] = useState<NormalizedRect | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [liveRect, setLiveRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const canGenerate = prompt.trim().length > 0 && sourceImage !== null;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setSourceImage(dataUrl);
      setSelection(null);
    } catch { /* ignore */ }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  const handleDropzoneDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDropzoneDragLeave = () => setIsDragging(false);
  const handleDropzoneDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const getRelativePos = useCallback((e: ReactMouseEvent): { x: number; y: number } | null => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseDown = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!sourceImage) return;
    const pos = getRelativePos(e);
    if (!pos) return;
    e.preventDefault();
    setDragState({ startX: pos.x, startY: pos.y });
    setLiveRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    setSelection(null);
  }, [sourceImage, getRelativePos]);

  const handleMouseMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragState) return;
    const pos = getRelativePos(e);
    if (!pos) return;
    setLiveRect({
      x: Math.min(dragState.startX, pos.x),
      y: Math.min(dragState.startY, pos.y),
      w: Math.abs(pos.x - dragState.startX),
      h: Math.abs(pos.y - dragState.startY),
    });
  }, [dragState, getRelativePos]);

  const handleMouseUp = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragState) return;
    const pos = getRelativePos(e);
    const el = containerRef.current;
    if (!pos || !el) {
      setDragState(null);
      setLiveRect(null);
      return;
    }
    const { width, height } = el.getBoundingClientRect();
    const norm = normalizeRect(dragState.startX, dragState.startY, pos.x, pos.y, width, height);
    if (norm.width > 0.01 && norm.height > 0.01) {
      setSelection(norm);
    }
    setDragState(null);
    setLiveRect(null);
  }, [dragState, getRelativePos]);

  const renderSelectionOverlay = () => {
    const rect = liveRect
      ? { x: liveRect.x, y: liveRect.y, width: liveRect.w, height: liveRect.h }
      : selection
        ? (() => {
            const el = containerRef.current;
            if (!el) return null;
            const { width, height } = el.getBoundingClientRect();
            return {
              x: selection.x * width,
              y: selection.y * height,
              width: selection.width * width,
              height: selection.height * height,
            };
          })()
        : null;

    if (!rect || (rect.width < 2 && rect.height < 2)) return null;

    return (
      <div
        style={{
          ...local.selectionRect,
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
        }}
      />
    );
  };

  const handleGenerate = () => {
    if (!canGenerate || !sourceImage) return;
    void generate(prompt, {
      sourceImage,
      maskRegion: selection ?? undefined,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={ss.formRow}>
        <label style={ss.formLabel}>
          {t('playground.studio_source_image', { defaultValue: '参考图片' })}
        </label>

        {sourceImage ? (
          <>
            <div
              ref={containerRef}
              style={local.canvasContainer}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img src={sourceImage} alt="source" style={local.sourceImg} />
              {renderSelectionOverlay()}
            </div>

            <div style={local.canvasActions}>
              <button
                type="button"
                style={local.actionBtn}
                onClick={() => setSelection(null)}
              >
                {t('playground.studio_clear_selection', { defaultValue: '清除选区' })}
              </button>
              <button
                type="button"
                style={local.actionBtn}
                onClick={() => { setSourceImage(null); setSelection(null); }}
              >
                {t('playground.studio_remove_image', { defaultValue: '移除图片' })}
              </button>
            </div>

            <div style={local.selectionHint}>
              {selection
                ? t('playground.studio_selection_set', { defaultValue: '已选定修改区域，拖拽可重新选择' })
                : t('playground.studio_selection_hint', { defaultValue: '在图片上拖拽选择要修改的区域' })}
            </div>
          </>
        ) : (
          <div
            style={isDragging ? ss.formUploadAreaDragging : ss.formUploadArea}
            className="studio-upload-area"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDropzoneDragOver}
            onDragLeave={handleDropzoneDragLeave}
            onDrop={handleDropzoneDrop}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.35}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>
              {t('playground.studio_upload_hint', { defaultValue: '点击上传或拖拽图片到此处' })}
            </span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
      </div>

      <div style={ss.formRow}>
        <label style={ss.formLabel}>
          {t('playground.studio_prompt', { defaultValue: '提示词' })}
        </label>
        <textarea
          style={ss.formTextarea}
          className="studio-textarea"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={t('playground.studio_inpaint_placeholder', { defaultValue: '描述要修改的区域...' })}
          rows={3}
        />
      </div>

      <div style={ss.formRow}>
        <label style={ss.formLabel}>
          {t('playground.studio_model', { defaultValue: '模型' })}
        </label>
        {MODEL_REGISTRY.length === 1 ? (
          <div style={modelBadge}><span style={modelDot} />{currentModel.name}</div>
        ) : (
          <CustomSelect
            value={selectedModelId}
            options={MODEL_REGISTRY.map(m => ({ value: m.id, label: m.name }))}
            onChange={setSelectedModelId}
          />
        )}
      </div>

      <div style={ss.formRow}>
        <label style={ss.formLabel}>
          {t('playground.studio_size', { defaultValue: '尺寸' })}
        </label>
        <SizeSelector
          value={imageSize}
          sizes={currentModel.sizes}
          onChange={setImageSize}
        />
      </div>

      <button
        type="button"
        style={canGenerate ? ss.formGenerateBtn : ss.formGenerateBtnDisabled}
        className={canGenerate ? 'studio-gen-btn' : ''}
        disabled={!canGenerate}
        onClick={handleGenerate}
      >
        {isGenerating
          ? t('playground.studio_generating', { defaultValue: '生成中...' })
          : t('playground.studio_generate', { defaultValue: '生成' })}
      </button>
    </div>
  );
}
