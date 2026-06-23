import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStudio } from '../StudioContext';
import { CustomSelect } from '../CustomSelect';
import { SizeSelector } from '../SizeSelector';
import { MODEL_REGISTRY } from '../modelConfig';

const COUNT_OPTIONS = [1, 2, 3, 4];

export function TextToImagePanel() {
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
  const [count, setCount] = useState(1);

  const canGenerate = prompt.trim().length > 0;

  const handleGenerate = () => {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;
    const fireAll = async () => {
      for (let i = 0; i < count; i++) {
        generate(trimmed, { mode: 'text2img', count: 1 });
      }
    };
    void fireAll();
  };

  return (
    <div>
      <div>
        <label>
          {t('playground.studio_prompt', { defaultValue: '提示词' })}
        </label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={t('playground.studio_prompt_placeholder', { defaultValue: '描述你想生成的图片...' })}
          rows={4}
        />
      </div>

      <div>
        <label>
          {t('playground.studio_model', { defaultValue: '模型' })}
        </label>
        {MODEL_REGISTRY.length === 1 ? (
          <div><span />{currentModel.name}</div>
        ) : (
          <CustomSelect
            value={selectedModelId}
            options={MODEL_REGISTRY.map(m => ({ value: m.id, label: m.name }))}
            onChange={setSelectedModelId}
          />
        )}
      </div>

      <div>
        <label>
          {t('playground.studio_size', { defaultValue: '尺寸' })}
        </label>
        <SizeSelector
          value={imageSize}
          sizes={currentModel.sizes}
          onChange={setImageSize}
        />
      </div>

      <div>
        <label>
          {t('playground.studio_count', { defaultValue: '数量' })}
        </label>
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
