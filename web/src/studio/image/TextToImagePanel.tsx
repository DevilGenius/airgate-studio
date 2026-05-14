import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStudio } from '../StudioContext';
import { CustomSelect } from '../CustomSelect';
import { studioStyles as ss } from '../studioStyles';

const SIZE_OPTIONS = [
  { value: 'auto',      label: 'Auto' },
  { value: '1024x1024', label: '1024×1024' },
  { value: '1536x1024', label: '1536×1024' },
  { value: '1024x1536', label: '1024×1536' },
  { value: '2048x2048', label: '2048×2048' },
  { value: '2048x1152', label: '2048×1152' },
  { value: '1152x2048', label: '1152×2048' },
  { value: '3840x2160', label: '3840×2160 (4K)' },
  { value: '2160x3840', label: '2160×3840 (4K)' },
];

const COUNT_OPTIONS = [1, 2, 3, 4];

export function TextToImagePanel() {
  const { t } = useTranslation();
  const {
    selectedModel,
    setSelectedModel,
    imageSize,
    setImageSize,
    imageModels,
    isGenerating,
    generate,
  } = useStudio();

  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(1);

  const canGenerate = prompt.trim().length > 0;

  const handleGenerate = () => {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;
    const fireAll = async () => {
      for (let i = 0; i < count; i++) {
        generate(trimmed, { count: 1 });
      }
    };
    void fireAll();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={ss.formRow}>
        <label style={ss.formLabel}>
          {t('playground.studio_prompt', { defaultValue: '提示词' })}
        </label>
        <textarea
          style={ss.formTextarea}
          className="studio-textarea"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={t('playground.studio_prompt_placeholder', { defaultValue: '描述你想生成的图片...' })}
          rows={4}
        />
      </div>

      <div style={ss.formRow}>
        <label style={ss.formLabel}>
          {t('playground.studio_model', { defaultValue: '模型' })}
        </label>
        <CustomSelect
          value={selectedModel}
          options={imageModels.length === 0
            ? [{ value: '', label: t('playground.studio_no_models', { defaultValue: '暂无可用模型' }) }]
            : imageModels.map(m => ({ value: m.platform ? `${m.platform}::${m.id}` : m.id, label: m.name || m.id }))}
          onChange={setSelectedModel}
        />
      </div>

      <div style={ss.formRow}>
        <label style={ss.formLabel}>
          {t('playground.studio_size', { defaultValue: '尺寸' })}
        </label>
        <CustomSelect
          value={imageSize}
          options={SIZE_OPTIONS}
          onChange={setImageSize}
        />
      </div>

      <div style={ss.formRow}>
        <label style={ss.formLabel}>
          {t('playground.studio_count', { defaultValue: '数量' })}
        </label>
        <div style={ss.formCountGroup}>
          {COUNT_OPTIONS.map(n => (
            <button
              key={n}
              type="button"
              style={count === n ? ss.formCountBtnActive : ss.formCountBtn}
              className={count === n ? 'studio-count-active' : 'studio-count-btn'}
              onClick={() => setCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
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
