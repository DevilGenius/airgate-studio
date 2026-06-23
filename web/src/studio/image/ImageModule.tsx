import { useTranslation } from 'react-i18next';
import type { ImageMode } from '../types';
import { useStudio } from '../StudioContext';
import { TextToImagePanel } from './TextToImagePanel';
import { ImageToImagePanel } from './ImageToImagePanel';
import { InpaintPanel } from './InpaintPanel';
import { BatchPanel } from './BatchPanel';

// ── Types ───────────────────────────────────────────────────────────────────

interface TabDef {
  mode: ImageMode;
  labelKey: string;
  defaultLabel: string;
}

const TABS: TabDef[] = [
  { mode: 'text2img', labelKey: 'playground.studio_mode_text2img', defaultLabel: '文生图' },
  { mode: 'img2img',  labelKey: 'playground.studio_mode_img2img',  defaultLabel: '图生图' },
  { mode: 'inpaint',  labelKey: 'playground.studio_mode_inpaint',  defaultLabel: '局部绘图' },
  { mode: 'batch',    labelKey: 'playground.studio_mode_batch',     defaultLabel: '批量' },
];

// ── ImageModule ─────────────────────────────────────────────────────────────

export function ImageModule() {
  const { t } = useTranslation();
  const { imageMode, setImageMode } = useStudio();

  return (
    <>
      <div>
        {TABS.map(tab => (
          <button
            key={tab.mode}
            type="button"
            onClick={() => setImageMode(tab.mode)}
          >
            {t(tab.labelKey, { defaultValue: tab.defaultLabel })}
          </button>
        ))}
      </div>

      <div>
        {imageMode === 'text2img' && <TextToImagePanel />}
        {imageMode === 'img2img'  && <ImageToImagePanel />}
        {imageMode === 'inpaint'  && <InpaintPanel />}
        {imageMode === 'batch'    && <BatchPanel />}
      </div>
    </>
  );
}
