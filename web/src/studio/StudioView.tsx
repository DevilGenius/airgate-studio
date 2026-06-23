import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type DragEvent, type ChangeEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioProvider, useStudio } from './StudioContext';
import { GalleryView } from './GalleryView';
import { SizeSelector } from './SizeSelector';
import styles from './StudioView.module.css';

const STUDIO_COMPOSER_MAX_WIDTH = '68rem';

// ── Helpers ─────────────────────────────────────────────────────────────────

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ── MaskEditor (fullscreen overlay for drawing inpaint region) ──────────────

interface NormalizedRect { x: number; y: number; width: number; height: number }

function normalizeRect(
  sx: number, sy: number, ex: number, ey: number, cw: number, ch: number,
): NormalizedRect {
  if (cw <= 0 || ch <= 0) return { x: 0, y: 0, width: 0, height: 0 };
  const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));
  const x1 = clamp(sx, cw);
  const y1 = clamp(sy, ch);
  const x2 = clamp(ex, cw);
  const y2 = clamp(ey, ch);
  return {
    x: Math.min(x1, x2) / cw,
    y: Math.min(y1, y2) / ch,
    width: Math.abs(x2 - x1) / cw,
    height: Math.abs(y2 - y1) / ch,
  };
}

function MaskEditor({ src, selection: initialSelection, onConfirm, onClose, onDelete, maskingEnabled = true }: {
  src: string;
  selection: NormalizedRect | null;
  onConfirm: (sel: NormalizedRect | null) => void;
  onClose: () => void;
  onDelete?: () => void;
  maskingEnabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [sel, setSel] = useState<NormalizedRect | null>(initialSelection);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [liveRect, setLiveRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const getImageMetrics = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return null;
    const containerRect = container.getBoundingClientRect();
    const imageRect = img.getBoundingClientRect();
    const originLeft = containerRect.left + container.clientLeft;
    const originTop = containerRect.top + container.clientTop;
    return {
      offsetX: imageRect.left - originLeft,
      offsetY: imageRect.top - originTop,
      width: imageRect.width,
      height: imageRect.height,
      imageRect,
    };
  }, []);

  const getRelPos = useCallback((e: ReactMouseEvent): { x: number; y: number } | null => {
    const metrics = getImageMetrics();
    if (!metrics || metrics.width <= 0 || metrics.height <= 0) return null;
    const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));
    return {
      x: clamp(e.clientX - metrics.imageRect.left, metrics.width),
      y: clamp(e.clientY - metrics.imageRect.top, metrics.height),
    };
  }, [getImageMetrics]);

  const toContainerRect = useCallback((rect: { x: number; y: number; w: number; h: number }) => {
    const metrics = getImageMetrics();
    if (!metrics) return null;
    return {
      left: metrics.offsetX + rect.x,
      top: metrics.offsetY + rect.y,
      width: rect.w,
      height: rect.h,
    };
  }, [getImageMetrics]);

  const onDown = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const pos = getRelPos(e);
    if (!pos) return;
    e.preventDefault();
    setDragStart(pos);
    setLiveRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    setSel(null);
  }, [getRelPos]);

  const onMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    const pos = getRelPos(e);
    if (!pos) return;
    setLiveRect({
      x: Math.min(dragStart.x, pos.x), y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x), h: Math.abs(pos.y - dragStart.y),
    });
  }, [dragStart, getRelPos]);

  const onUp = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    const pos = getRelPos(e);
    const metrics = getImageMetrics();
    if (!pos || !metrics) { setDragStart(null); setLiveRect(null); return; }
    const norm = normalizeRect(dragStart.x, dragStart.y, pos.x, pos.y, metrics.width, metrics.height);
    if (norm.width > 0.01 && norm.height > 0.01) setSel(norm);
    setDragStart(null);
    setLiveRect(null);
  }, [dragStart, getImageMetrics, getRelPos]);

  const overlay = (() => {
    const rect = liveRect
      ? toContainerRect(liveRect)
      : sel
        ? (() => {
            const metrics = getImageMetrics();
            if (!metrics) return null;
            return {
              left: metrics.offsetX + sel.x * metrics.width,
              top: metrics.offsetY + sel.y * metrics.height,
              width: sel.width * metrics.width,
              height: sel.height * metrics.height,
            };
          })()
        : null;
    if (!rect || (rect.width < 2 && rect.height < 2)) return null;
    return <div />;
  })();

  return (
    <div onClick={onClose}>
      {maskingEnabled && (
        <div>在图片上拖拽框选要局部修改的区域，不框选则为整图变换</div>
      )}
      <div
        ref={containerRef}
        onClick={e => e.stopPropagation()}
        onMouseDown={maskingEnabled ? onDown : undefined}
        onMouseMove={maskingEnabled ? onMove : undefined}
        onMouseUp={maskingEnabled ? onUp : undefined}
        onMouseLeave={maskingEnabled ? onUp : undefined}
      >
        <img ref={imgRef} src={src} alt="source" />
        {maskingEnabled && overlay}
      </div>
      <div onClick={e => e.stopPropagation()}>
        {onDelete && (
          <button type="button" onClick={onDelete}>删除图片</button>
        )}
        {maskingEnabled && sel && (
          <button type="button" onClick={() => setSel(null)}>清除选区</button>
        )}
        <button type="button" onClick={onClose}>{maskingEnabled ? '取消' : '关闭'}</button>
        {maskingEnabled && (
          <button type="button" onClick={() => onConfirm(sel)}>确定</button>
        )}
      </div>
    </div>
  );
}

// ── Templates ───────────────────────────────────────────────────────────────

interface Inspiration {
  category: string;
  title: string;
  image: string;
  prompt: string;
}

const INSPIRATIONS: Inspiration[] = [
  { category: '电商', title: '微缩护肤品广告', image: '/plugins/airgate-studio/assets/inspirations/skincare-diorama.jpg', prompt: 'A hyper-realistic miniature diorama product advertisement featuring an oversized luxury skincare pump bottle placed on a circular platform. Tiny figurine construction workers in yellow coveralls and white hard hats swarm around the bottle — climbing scaffolding, painting with rollers, operating a tower crane, working near industrial tanks. Warm beige, cream, gold, mustard yellow palette. Studio photography, soft diffused lighting, clean beige background. Tilt-shift miniature aesthetic, ultra-detailed, commercial product photography, 8K resolution, photorealistic CGI render.' },
  { category: '广告', title: '奢华手表广告', image: '/plugins/airgate-studio/assets/inspirations/luxury-watch.jpg', prompt: 'A dramatic luxury product advertising image for a motorsport-inspired chronograph wristwatch in a dark studio. Stainless steel chronograph watch at a three-quarter angle, black dial, red-accent subdials, tachymeter bezel. Black leather strap with bold red stitching. Deep black background with cinematic red and white horizontal light streaks suggesting speed. Glossy wet ground plane with reflective texture. Ultra-polished commercial product photography, luxury watch campaign.' },
  { category: '广告', title: '巧克力品牌广告', image: '/plugins/airgate-studio/assets/inspirations/chocolate-brand.jpg', prompt: 'Create a premium square product advertisement for a fictional luxury chocolate brand. High-end editorial campaign combining luxury food photography, refined packaging design, and cinematic lighting. Matte black wrapper, subtle gold foil, elegant serif typography, realistic product rendering. Chocolate bar as hero centerpiece with subtle reflections, shallow depth of field, luxury minimalism.' },
  { category: '广告', title: '汉堡英雄海报', image: '/plugins/airgate-studio/assets/inspirations/burger-hero.jpg', prompt: 'A cinematic 9:16 vertical composition featuring a gourmet burger. A towering burger with a charcoal brioche bun, thick Wagyu beef patty with visible sear marks, melting aged gruyère dripping like lava, crispy maple-glazed bacon. Dark moody lighting with warm amber spotlight. The burger in a "deconstructed gravity" moment — top bun slightly hovering. Ultra-bold distressed sans-serif typeface "DEFY GRAVITY". 4K resolution, macro photography, neon-noir color grading.' },
  { category: '广告', title: '抹茶燕麦广告', image: '/plugins/airgate-studio/assets/inspirations/matcha-granola.jpg', prompt: 'Ultra-realistic premium food advertisement poster for a healthy breakfast granola brand, centered matte pouch packaging labeled "Matcha Oat Granola", green monochrome aesthetic, flat lay composition, soft studio lighting, vibrant matcha green background, surrounded by kiwi slices, almonds, oats, chia seeds, matcha powder bowl, granola bowls. Clean modern typography headline "SUPERFOOD MORNING BOWL". Luxury organic branding, 8K detail.' },
  { category: '人像', title: '水彩时装素描', image: '/plugins/airgate-studio/assets/inspirations/watercolor-fashion.jpg', prompt: 'Transform the uploaded photo into a full-body watercolor fashion illustration in the style of an elegant runway design sketch. Preserve the original outfit, pose, silhouette, colors, fabrics. Use elongated fashion-sketch proportions, loose expressive ink lines, delicate pencil contour, transparent watercolor washes, soft shadows, painterly texture, minimalist editorial mood. White background, clean composition, full body centered.' },
  { category: '人像', title: '复古报刊亭', image: '/plugins/airgate-studio/assets/inspirations/retro-newsstand.jpg', prompt: 'A cinematic fashion editorial scene of 8 diverse young adults gathered around a vintage urban newsstand kiosk with a bold "NEWSSTAND" sign. Gritty indoor street environment with worn concrete floors, dark industrial walls. Newspapers fly dynamically through the air with natural motion blur. Styled in coordinated 90s-inspired retro streetwear. Shot from slightly elevated angle, wide 35mm lens, soft cinematic lighting, high-end magazine aesthetic, 4K quality.' },
  { category: '人像', title: '咖啡厅约会', image: '/plugins/airgate-studio/assets/inspirations/cafe-date.jpg', prompt: 'Ultra-realistic cozy Japanese-Korean cafe photography featuring a cute young couple sitting together naturally in a trendy aesthetic cafe. Table beautifully filled with pancakes, strawberry cakes, macarons, croissants, iced coffees, matcha lattes. Cute scrapbook-style doodles and handwritten notes — tiny hearts, stars, sparkles, ribbons. Shallow depth of field, cinematic composition, ultra realistic food textures, 8K.' },
  { category: '人像', title: '雨中金色街拍', image: '/plugins/airgate-studio/assets/inspirations/rainy-street.jpg', prompt: 'Ultra-realistic cinematic street photography of a young man standing alone on a rainy urban sidewalk during golden hour sunset. Wearing oversized black hoodie, loose dark blue cargo jeans, clean white sneakers. Moody introspective vibe. Wide-angle composition with dramatic depth. Reflective rain-soaked street surface glowing with warm sunset light. Historic Gothic architecture visible. Shot on Sony A7R IV, 35mm lens, f/1.8, HDR photography, cinematic color grading, 8K ultra resolution.' },
  { category: '海报', title: '孔雀花艺装饰画', image: '/plugins/airgate-studio/assets/inspirations/peacock-art.jpg', prompt: 'Symmetrical design featuring two elegant blue peacocks with detailed feather patterns, surrounded by blue floral elements, intricate vintage botanical ornament, soft beige background, classical floral decor style with rich navy and sky blue details, decorative art illustration.' },
  { category: '海报', title: '3D 液体艺术', image: '/plugins/airgate-studio/assets/inspirations/3d-liquid.jpg', prompt: 'A mesmerizing explosively colorful vertical poster featuring giant 3D liquid fluid sculpture forms. Enormous glossy morphing blob shapes — massive melting form in hot magenta pink flowing downward, intersecting with a giant swirling wave of electric cobalt blue, a third liquid mass in neon lime green curling upward. All three collide at center in a spectacular splash explosion with hundreds of flying colorful droplets frozen mid-air. Clean bright white background. Bold rounded white typography "LET IT FLOW".' },
  { category: '海报', title: '创意拼贴', image: '/plugins/airgate-studio/assets/inspirations/collage-art.jpg', prompt: 'Transform the attached image into a collage artwork. Make it appear as if hand-torn from newspapers, magazines, and flyers and pasted. Every single expression completed using large torn pieces of paper. Represent in detail the torn edges, wrinkles, overlaps, and glue marks. Use relatively large pieces of paper placed randomly at different angles and directions. Create it to look like an actual collage roughly hand-pasted by a person.' },
  { category: '海报', title: '等距线稿旅行海报', image: '/plugins/airgate-studio/assets/inspirations/isometric-travel.jpg', prompt: 'Design a vertical retro mid-century travel poster showcasing a city landmark. Stick to a tight 3-color scheme: cream-toned paper background, black technical line drawing, plus one accent color. Aesthetic: minimalist isometric top-down aerial perspective with very fine cross-hatching and silkscreen print grain. Zero gradients allowed. Large bold sans-serif city name at top.' },
  { category: '海报', title: '微缩旅行世界', image: '/plugins/airgate-studio/assets/inspirations/miniature-travel.jpg', prompt: 'A cinematic hyper-detailed miniature travel diorama resting inside an open human palm. A realistic passport and official travel visa card stand upright in the center of a tiny landscape, surrounded by miniature travelers with luggage, scattered suitcases, local vegetation, iconic cultural elements. Famous skyline and landmarks rise softly with atmospheric depth. A commercial airplane flies overhead in bright blue sky. Ultra-realistic textures, shallow depth of field, warm sunlight, macro photography style, tilt-shift miniature effect.' },
  { category: '海报', title: '暗黑西部亡命徒', image: '/plugins/airgate-studio/assets/inspirations/dark-western.jpg', prompt: 'Dark cinematic western outlaw poster, vertical 2:3 composition. A mysterious masked cowboy with a black horse standing at a desert border. Wide-brim cowboy hat, patterned face cloth, dark leather jacket with multi-layer leather gear, bullet belt, revolver holster. Stormy desert background with lightning, dark clouds, canyon walls. Vintage parchment texture, ink splatters, wanted poster information, character profile, compass graphic, stamp seal. Ultra-detailed leather and metal textures, 8K.' },
  { category: '海报', title: '动物百科信息图', image: '/plugins/airgate-studio/assets/inspirations/wildlife-infographic.jpg', prompt: 'A premium cinematic wildlife infographic poster centered around a visually unique animal species. Ultra-detailed photorealistic fur, realistic eyes, moisture textures, cinematic shadows, powerful eye contact. Dense layered infographic storytelling: anatomy callouts, adaptation systems, prey and diet visuals, ecosystem overlays, conservation status, geographic range maps. Asymmetric editorial composition, premium typography, holographic UI elements. Cinematic documentary realism meets futuristic infographic design. 8K, museum-quality composition.' },
  { category: '角色', title: '机甲少女', image: '/plugins/airgate-studio/assets/inspirations/mecha-girl.jpg', prompt: 'A mecha girl mid-teens, pale skin smudged with soot and salt spray, sharp amber eyes with glowing HUD reticles, waist-length ash-white hair tied in a high ponytail whipping in the sea wind, matte gunmetal exoskeleton armor plating her shoulders forearms and shins, exposed hydraulic pistons at the joints, chest rig with glowing cyan coolant lines, massive rail cannon resting on her right shoulder. Standing on rusted steel platform jutting out over dark water. Vast derelict sea-city at dusk, colossal megastructures rising from the ocean. Cinematic anime key visual, 16:9.' },
  { category: '角色', title: 'GTA 风格花市', image: '/plugins/airgate-studio/assets/inspirations/gta-market.jpg', prompt: 'GTA 6 style artwork set in a vibrant Bangalore flower market in India. Bold stylized characters, dramatic poses, vivid colors, urban street energy mixed with traditional Indian market atmosphere. Game cover art composition, cinematic lighting, detailed environment.' },
  { category: '角色', title: '动漫街头潮牌', image: '/plugins/airgate-studio/assets/inspirations/anime-streetwear.jpg', prompt: 'Stylized anime streetwear brand poster of a fast-food mascot character, full-body dynamic pose, highly detailed manga illustration, modern urban fashion outfit inspired by restaurant brand colors, oversized hoodie, tactical straps, sneakers, chains, branded accessories, holding signature food item. Bold graphic typography, editorial magazine layout, Japanese text elements, grunge textures, paint splashes. Collectible poster aesthetic, cyber street fashion meets commercial advertising, vibrant red/orange/black/white palette.' },
];

// ── InspirationSidebar ─────────────────────────────────────────────────────────

function InspirationSidebar({ onSelect }: { onSelect: (prompt: string) => void }) {
  const { t } = useTranslation();
  const categories = [...new Set(INSPIRATIONS.map(i => i.category))];
  const title = t('playground.studio_inspiration_gallery', { defaultValue: '灵感画廊' });

  return (
    <aside className={styles.inspirationSidebar} aria-label={title}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitle}>{title}</div>
      </div>
      {categories.map(cat => (
        <section className={styles.categorySection} key={cat}>
          <div className={styles.categoryTitle}>{cat}</div>
          <div className={styles.cardList}>
            {INSPIRATIONS.filter(i => i.category === cat).map(item => (
              <button
                type="button"
                className={styles.inspirationCard}
                key={item.title}
                onClick={() => onSelect(item.prompt)}
                title={item.prompt.slice(0, 100) + '...'}
              >
                <span className={styles.cardImageFrame}>
                  <img className={styles.cardImage} src={item.image} alt={item.title} loading="lazy" />
                </span>
                <span className={styles.cardMeta}>
                  <span className={styles.cardTitle}>{item.title}</span>
                  <span className={styles.cardAction}>{t('playground.studio_use_template', { defaultValue: '使用' })}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}

// ── ComposerBar ─────────────────────────────────────────────────────────────

const COUNT_OPTIONS = [1, 2, 3, 4];
const COMPOSER_TEXTAREA_HEIGHT = 96;

function ComposerBar({ promptRef }: { promptRef?: React.MutableRefObject<{ set: (v: string) => void } | null> }) {
  const { t } = useTranslation();
  const {
    setImageMode,
    currentModel,
    imageSize, setImageSize,
    generate,
    referenceImages, setReferenceImages,
  } = useStudio();

  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(1);
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // mask state (only for single image → inpaint)
  const [selection, setSelection] = useState<NormalizedRect | null>(null);
  // Index into allSources for the thumbnail currently open in the preview/mask editor.
  // null when closed. Multi-image opens in preview-only mode (no mask drawing).
  const [editorIndex, setEditorIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (promptRef) {
      promptRef.current = {
        set: (v: string) => { setPrompt(v); textareaRef.current?.focus(); },
      };
    }
  }, [promptRef]);

  // Union: composer uploads come first, then gallery "use as reference" picks.
  // Both can coexist now (previously gallery picks only showed when composer
  // was empty, which made it impossible to combine).
  const allSources = [...sourceImages, ...referenceImages];
  const hasSource = allSources.length > 0;
  const isSingleSource = allSources.length === 1;
  const canSend = prompt.trim().length > 0;

  const handleSend = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    if (isSingleSource && selection) {
      setImageMode('inpaint');
      void generate(trimmed, { mode: 'inpaint', sourceImage: allSources[0], maskRegion: selection });
    } else if (hasSource) {
      setImageMode('img2img');
      for (let i = 0; i < count; i++) {
        void generate(trimmed, { mode: 'img2img', sourceImages: allSources, count: 1 });
      }
    } else {
      setImageMode('text2img');
      for (let i = 0; i < count; i++) {
        void generate(trimmed, { mode: 'text2img', count: 1 });
      }
    }
    setPrompt('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setSourceImages(prev => [...prev, dataUrl]);
      setSelection(null);
    } catch { /* ignore */ }
  }, []);

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (const file of files) void handleFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files) {
      for (const file of files) void handleFile(file);
    }
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) void handleFile(file);
        return;
      }
    }
  }, [handleFile]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.addEventListener('paste', handlePaste as EventListener);
    return () => el.removeEventListener('paste', handlePaste as EventListener);
  }, [handlePaste]);

  const removeSource = (index: number) => {
    // Index addresses allSources = [...sourceImages, ...referenceImages].
    // Route the removal to the right backing array.
    if (index < sourceImages.length) {
      setSourceImages(prev => prev.filter((_, i) => i !== index));
    } else {
      const refIdx = index - sourceImages.length;
      setReferenceImages(referenceImages.filter((_, i) => i !== refIdx));
    }
    setSelection(null);
  };

  const clearAllSources = () => {
    setSourceImages([]);
    setReferenceImages([]);
    setSelection(null);
  };

  const placeholder = hasSource
    ? (isSingleSource && selection ? '描述要修改的区域...' : '描述你想要的变化...')
    : '描述你想生成的图片...';

  const modeHint = hasSource
    ? (isSingleSource && selection ? '局部绘图' : '图生图')
    : null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Source image thumbnails */}
      {hasSource && (
        <div>
          {allSources.map((src, i) => (
            <div key={i} onClick={() => setEditorIndex(i)}>
              <img
                src={src}
                alt="source"
              />
              {isSingleSource && selection && (
                <div
                  title="已选区"
                />
              )}
            </div>
          ))}
          {allSources.length > 1 && (
            <button type="button" onClick={clearAllSources}>
              {t('playground.studio_clear_all', { defaultValue: '清除全部' })}
            </button>
          )}
          {isSingleSource && selection && (
            <button type="button" onClick={() => setSelection(null)}>
              {t('playground.studio_clear_selection', { defaultValue: '清除选区' })}
            </button>
          )}
          {modeHint && <span>{modeHint}</span>}
        </div>
      )}
      {editorIndex !== null && allSources[editorIndex] && (
        <MaskEditor
          src={allSources[editorIndex]}
          selection={isSingleSource ? selection : null}
          maskingEnabled={isSingleSource}
          onConfirm={(sel) => {
            if (isSingleSource) setSelection(sel);
            setEditorIndex(null);
          }}
          onClose={() => setEditorIndex(null)}
          onDelete={() => {
            removeSource(editorIndex);
            setEditorIndex(null);
          }}
        />
      )}
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileInput} />

      {/* Prompt textarea */}
      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('playground.studio_quick_placeholder', { defaultValue: placeholder })}
        rows={5}
      />

      {/* Toolbar row */}
      <div>
        <div>
          <span>
            <span />
            {currentModel.name}
          </span>
          <div>
            <SizeSelector value={imageSize} sizes={currentModel.sizes} onChange={setImageSize} upward compact />
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title={t('playground.studio_add_reference', { defaultValue: '添加参考图' })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
          </button>
          <div>
            {COUNT_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
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

function StudioLayout() {
  const { gallery, tasks } = useStudio();
  const { t } = useTranslation();
  const promptRef = useRef<{ set: (v: string) => void } | null>(null);
  const [mobileTab, setMobileTab] = useState<'inspiration' | 'create'>('create');

  const visibleTasks = tasks.filter(tk => tk.status !== 'completed');
  const isEmpty = gallery.length === 0 && visibleTasks.length === 0;

  const handleTemplate = (prompt: string) => {
    promptRef.current?.set(prompt);
    setMobileTab('create');
  };

  const mobileTabs = (
    <div className={styles.mobileTabs}>
      <button
        type="button"
        className={`${styles.mobileTab} ${mobileTab === 'inspiration' ? styles.mobileTabActive : ''}`}
        onClick={() => setMobileTab('inspiration')}
      >
        {t('playground.studio_tab_inspiration', { defaultValue: '灵感' })}
      </button>
      <button
        type="button"
        className={`${styles.mobileTab} ${mobileTab === 'create' ? styles.mobileTabActive : ''}`}
        onClick={() => setMobileTab('create')}
      >
        {t('playground.studio_tab_create', { defaultValue: '创作' })}
      </button>
    </div>
  );

  const inspirationPanel = (
    <div className={styles.inspirationPanel}>
      <div className={styles.inspirationPanelInner}>
        <InspirationSidebar onSelect={handleTemplate} />
      </div>
    </div>
  );

  if (isEmpty) {
    return (
      <div className={styles.studioShell} data-full-bleed data-mobile-tab={mobileTab}>
        {mobileTabs}
        {inspirationPanel}
        <div className={styles.mainPane}>
          <div>
            <div>
              <div>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              <div>{t('plugin_pages.studio.title', { defaultValue: '创作中心' })}</div>
              <div>{t('playground.studio_landing_subtitle', { defaultValue: '输入提示词，AI 为你生成图片' })}</div>
              <div>
                <ComposerBar promptRef={promptRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.studioShell} data-full-bleed data-mobile-tab={mobileTab}>
      {mobileTabs}
      {inspirationPanel}
      <div className={styles.mainPane}>
        <GalleryView />
        <div>
          <ComposerBar promptRef={promptRef} />
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

export const __studioViewTestUtils = {
  normalizeRect,
  readFileAsDataURL,
  MaskEditor,
  InspirationSidebar,
  ComposerBar,
  StudioLayout,
  INSPIRATIONS,
};
