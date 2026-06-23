import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStudio } from '../StudioContext';
import { CustomSelect } from '../CustomSelect';
import { SizeSelector } from '../SizeSelector';
import { MODEL_REGISTRY } from '../modelConfig';

type BatchMode = 'multi_prompt' | 'multi_image';

export function BatchPanel() {
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

  const [mode, setMode] = useState<BatchMode>('multi_prompt');
  const [multiPrompts, setMultiPrompts] = useState('');
  const [images, setImages] = useState<Array<{ id: string; url: string; file: File }>>([]);
  const [imagePrompt, setImagePrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const promptLines = multiPrompts.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const canGenerate = (
    mode === 'multi_prompt' ? promptLines.length > 0 : (images.length > 0 && imagePrompt.trim().length > 0)
  );

  const addImages = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, { id: `${file.name}-${Date.now()}`, url: reader.result as string, file }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    if (mode === 'multi_prompt') {
      for (const line of promptLines) {
        void generate(line, { mode: 'batch', count: 1 });
      }
    } else {
      for (const img of images) {
        void generate(imagePrompt.trim(), { mode: 'img2img', sourceImage: img.url });
      }
    }
  };

  const btnLabel = isGenerating
    ? t('playground.studio_generating', { defaultValue: '生成中...' })
    : mode === 'multi_prompt'
      ? `${t('playground.studio_batch_generate', { defaultValue: '批量生成' })} ${promptLines.length} ${t('playground.studio_batch_unit', { defaultValue: '张' })}`
      : `${t('playground.studio_batch_process', { defaultValue: '批量处理' })} ${images.length} ${t('playground.studio_batch_images', { defaultValue: '张图片' })}`;

  return (
    <div>
      <div>
        <button type="button" onClick={() => setMode('multi_prompt')}>
          {t('playground.studio_batch_multi_prompt', { defaultValue: '多提示词' })}
        </button>
        <button type="button" onClick={() => setMode('multi_image')}>
          {t('playground.studio_batch_multi_image', { defaultValue: '多图片' })}
        </button>
      </div>

      {mode === 'multi_prompt' ? (
        <div>
          <label>{t('playground.studio_batch_prompts', { defaultValue: '批量提示词' })}</label>
          <textarea
            value={multiPrompts}
            onChange={e => setMultiPrompts(e.target.value)}
            placeholder={t('playground.studio_batch_placeholder', { defaultValue: '每行一个提示词...' })}
            rows={5}
          />
          <div>
            {promptLines.length > 0 ? `共 ${promptLines.length} 个提示词` : t('playground.studio_batch_empty', { defaultValue: '尚未输入提示词' })}
          </div>
        </div>
      ) : (
        <>
          <div>
            <label>{t('playground.studio_batch_upload', { defaultValue: '上传图片' })}</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); addImages(e.dataTransfer.files); }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}>
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t('playground.studio_batch_add_images', { defaultValue: '点击或拖拽添加图片' })}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={e => addImages(e.target.files)} />
          </div>

          {images.length > 0 && (
            <div>
              {images.map(img => (
                <div key={img.id}>
                  <img src={img.url} alt="" />
                  <button type="button" onClick={() => removeImage(img.id)}>×</button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label>{t('playground.studio_batch_shared_prompt', { defaultValue: '统一提示词' })}</label>
            <textarea
              value={imagePrompt}
              onChange={e => setImagePrompt(e.target.value)}
              placeholder={t('playground.studio_batch_shared_placeholder', { defaultValue: '对所有图片应用相同的描述...' })}
              rows={3}
            />
          </div>
        </>
      )}

      <div>
        <label>{t('playground.studio_model', { defaultValue: '模型' })}</label>
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
        <label>{t('playground.studio_size', { defaultValue: '尺寸' })}</label>
        <SizeSelector
          value={imageSize}
          sizes={currentModel.sizes}
          onChange={setImageSize}
        />
      </div>

      <button
        type="button"
        disabled={!canGenerate}
        onClick={() => { void handleGenerate(); }}
      >
        {btnLabel}
      </button>
    </div>
  );
}
