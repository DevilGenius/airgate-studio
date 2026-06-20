import { describe, expect, it } from 'vitest';
import { MODEL_REGISTRY, getDefaultModel, getModelConfig, getSizeOption } from './modelConfig';

describe('modelConfig', () => {
  it('returns the default model and resolves known models', () => {
    expect(getDefaultModel()).toBe(MODEL_REGISTRY[0]);
    expect(getModelConfig('gpt-image-2')?.name).toBe('GPT Image 2');
    expect(getModelConfig('missing')).toBeUndefined();
  });

  it('resolves size options by value', () => {
    const model = getDefaultModel();

    expect(getSizeOption(model, 'auto')?.label).toBe('Auto');
    expect(getSizeOption(model, '1024x1024')?.aspect).toBe('1:1');
    expect(getSizeOption(model, 'nope')).toBeUndefined();
  });
});
