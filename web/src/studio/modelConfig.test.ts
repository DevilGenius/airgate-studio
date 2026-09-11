import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MODEL_ID,
  MODEL_REGISTRY,
  createModelConfig,
  findModelConfig,
  getDefaultModel,
  getModelConfig,
  getSizeOption,
  pickImageModels,
  resolveModelRegistry,
} from './modelConfig';

describe('modelConfig', () => {
  it('returns the default model and resolves known models', () => {
    expect(getDefaultModel()).toBe(MODEL_REGISTRY[0]);
    expect(getDefaultModel().id).toBe(DEFAULT_MODEL_ID);
    expect(getModelConfig('gpt-image-2')?.name).toBe('GPT Image 2');
    expect(getModelConfig('missing')).toBeUndefined();
  });

  it('exposes the two gpt-image-2.5 variants alongside gpt-image-2', () => {
    expect(MODEL_REGISTRY.map(m => m.id)).toEqual([
      'gpt-image-2',
      'gpt-image-2.5-sunburst',
      'gpt-image-2.5-flare',
    ]);
    expect(getModelConfig('gpt-image-2.5-sunburst')?.name).toBe('GPT Image 2.5 Sunburst');
    expect(getModelConfig('gpt-image-2.5-flare')?.name).toBe('GPT Image 2.5 Flare');
    // 裸名 gpt-image-2.5 由 openai 插件重路由到 sunburst，这里不重复暴露等价选项。
    expect(getModelConfig('gpt-image-2.5')).toBeUndefined();
  });

  it('gives every model the same gpt-image size ladder and pricing', () => {
    const reference = getDefaultModel().sizes;
    for (const model of MODEL_REGISTRY) {
      expect(model.platform).toBe('openai');
      expect(model.defaultSize).toBe('auto');
      expect(model.sizes.map(s => s.value)).toEqual(reference.map(s => s.value));
      expect(model.sizes.map(s => s.price)).toEqual(reference.map(s => s.price));
    }
    // 每个模型持有独立的 options 数组，互不共享可变实例。
    expect(MODEL_REGISTRY[0].sizes).not.toBe(MODEL_REGISTRY[1].sizes);
  });

  it('resolves size options by value', () => {
    const model = getDefaultModel();

    expect(getSizeOption(model, 'auto')?.label).toBe('Auto');
    expect(getSizeOption(model, '1024x1024')?.aspect).toBe('1:1');
    expect(getSizeOption(model, 'nope')).toBeUndefined();
  });

  it('keeps gpt-image-2 first when merging the live model list from Core', () => {
    const registry = resolveModelRegistry([
      { id: 'gpt-image-2.5-flare', name: 'GPT Image 2.5 Flare' },
      { id: 'gpt-image-2', name: 'GPT Image 2' },
      { id: 'gpt-image-2.5-sunburst', name: 'GPT Image 2.5 Sunburst' },
      // Core 可能把同一个 id 返回多次
      { id: 'gpt-image-2.5-flare', name: 'GPT Image 2.5 Flare' },
    ]);

    expect(registry.map(m => m.id)).toEqual([
      'gpt-image-2',
      'gpt-image-2.5-flare',
      'gpt-image-2.5-sunburst',
    ]);
    // 已知模型复用本地配置（固定尺寸阶梯与分档价）
    expect(registry[1]).toBe(getModelConfig('gpt-image-2.5-flare'));
  });

  it('generates a usable config for models that are only known to Core', () => {
    const registry = resolveModelRegistry([
      { id: 'gpt-image-9-aurora', name: 'GPT Image 9 Aurora' },
      { id: '   ' },
    ]);

    expect(registry.map(m => m.id)).toEqual(['gpt-image-2', 'gpt-image-9-aurora']);
    const aurora = registry[1]!;
    expect(aurora.name).toBe('GPT Image 9 Aurora');
    expect(aurora.platform).toBe('openai');
    expect(aurora.defaultSize).toBe('auto');
    expect(aurora.sizes.map(s => s.value)).toEqual(getDefaultModel().sizes.map(s => s.value));
    expect(findModelConfig(registry, 'gpt-image-9-aurora')).toBe(aurora);
  });

  it('falls back to the default model alone when Core returns nothing', () => {
    const registry = resolveModelRegistry([]);

    expect(registry).toHaveLength(1);
    expect(registry[0]?.id).toBe(DEFAULT_MODEL_ID);
  });

  it('uses the model id as the label when Core omits the name', () => {
    const config = createModelConfig('gpt-image-9-aurora');

    expect(config.name).toBe('gpt-image-9-aurora');
    expect(createModelConfig('gpt-image-9-aurora', '  ').name).toBe('gpt-image-9-aurora');
  });

  it('keeps only image-capable models from the Core model list', () => {
    const picked = pickImageModels([
      { id: 'gpt-image-2', name: 'GPT Image 2', capabilities: ['image_generation'] },
      { id: 'gpt-5.6-luna', name: 'GPT-5.6-Luna', capabilities: ['chat', 'reasoning'] },
      { id: 'gpt-image-2.5-flare', name: 'GPT Image 2.5 Flare', capabilities: ['image_generation'] },
    ]);

    expect(picked.map(m => m.id)).toEqual(['gpt-image-2', 'gpt-image-2.5-flare']);
  });

  it('passes the list through when Core reports no capability metadata', () => {
    const models = [{ id: 'gpt-image-2' }, { id: 'gpt-image-2.5-flare' }];

    expect(pickImageModels(models).map(m => m.id)).toEqual(['gpt-image-2', 'gpt-image-2.5-flare']);
    expect(pickImageModels([])).toEqual([]);
  });
});
