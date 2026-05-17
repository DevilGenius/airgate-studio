export interface SizeOption {
  value: string;
  label: string;
  tier: '1K' | '2K' | '4K';
  price: number;
  aspect?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  platform: string;
  defaultSize: string;
  sizes: SizeOption[];
}

// ── Model Registry ─────────────────────────────────────────────────────────
// Add new models here. Each model defines its supported sizes and pricing.

export const MODEL_REGISTRY: ModelConfig[] = [
  {
    id: 'gpt-image-2',
    name: 'GPT Image 2',
    platform: 'openai',
    defaultSize: 'auto',
    sizes: [
      // 1K (≤1536)
      { value: 'auto',      label: 'Auto',      tier: '1K', price: 0.10 },
      { value: '1024x1024', label: '1024×1024',  tier: '1K', price: 0.10, aspect: '1:1' },
      { value: '1536x1024', label: '1536×1024',  tier: '1K', price: 0.10, aspect: '3:2' },
      { value: '1024x1536', label: '1024×1536',  tier: '1K', price: 0.10, aspect: '2:3' },
      // 2K (1537-2048)
      { value: '2048x2048', label: '2048×2048',  tier: '2K', price: 0.20, aspect: '1:1' },
      { value: '2048x1152', label: '2048×1152',  tier: '2K', price: 0.20, aspect: '16:9' },
      { value: '1152x2048', label: '1152×2048',  tier: '2K', price: 0.20, aspect: '9:16' },
      // 4K (>2048)
      { value: '3840x2160', label: '3840×2160',  tier: '4K', price: 0.40, aspect: '16:9' },
      { value: '2160x3840', label: '2160×3840',  tier: '4K', price: 0.40, aspect: '9:16' },
    ],
  },
];

export function getModelConfig(id: string): ModelConfig | undefined {
  return MODEL_REGISTRY.find(m => m.id === id);
}

export function getDefaultModel(): ModelConfig {
  return MODEL_REGISTRY[0];
}

export function getSizeOption(model: ModelConfig, sizeValue: string): SizeOption | undefined {
  return model.sizes.find(s => s.value === sizeValue);
}
