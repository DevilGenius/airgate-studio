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

// GPT Image 系列（gpt-image-2 / 2.5-sunburst / 2.5-flare）共用同一套尺寸与分档价：
// 1K $0.10 / 2K $0.20 / 4K $0.40 每张，与 openai 插件 imagePriceForSize 的分档一致。
// 每次返回新数组，避免多个模型共享同一个 options 实例被就地修改。
function gptImageSizes(): SizeOption[] {
  return [
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
  ];
}

// ── Model Registry ─────────────────────────────────────────────────────────
// MODEL_REGISTRY 是本地兜底 + 尺寸/价格来源：运行时优先用 Core 返回的可用模型列表
// （见 resolveModelRegistry），插件新增模型后 studio 不需要改代码。
// Add new models here only when they need a size ladder / pricing different from the default.

/** 默认模型：动态列表拉取失败或其中不含它时，仍保持 GPT Image 2 为默认选项。 */
export const DEFAULT_MODEL_ID = 'gpt-image-2';

/** Core 模型能力标记：只有声明了图像生成能力的模型才进 studio 的图片模型选择器。 */
export const IMAGE_GENERATION_CAPABILITY = 'image_generation';

export const MODEL_REGISTRY: ModelConfig[] = [
  {
    id: 'gpt-image-2',
    name: 'GPT Image 2',
    platform: 'openai',
    defaultSize: 'auto',
    sizes: gptImageSizes(),
  },
  // 上游把 gpt-image-2.5 拆成 sunburst / flare 两个变体：裸名 gpt-image-2.5 由 openai 插件
  // 统一重路由到 sunburst，所以这里只暴露两个变体，避免出现两个完全等价的选项。
  {
    id: 'gpt-image-2.5-sunburst',
    name: 'GPT Image 2.5 Sunburst',
    platform: 'openai',
    defaultSize: 'auto',
    sizes: gptImageSizes(),
  },
  {
    id: 'gpt-image-2.5-flare',
    name: 'GPT Image 2.5 Flare',
    platform: 'openai',
    defaultSize: 'auto',
    sizes: gptImageSizes(),
  },
];

/** 本地注册表里没有的模型（例如插件刚加的变体）：沿用同一套尺寸阶梯与分档价。 */
export function createModelConfig(id: string, name?: string): ModelConfig {
  return {
    id,
    name: name?.trim() || id,
    platform: 'openai',
    defaultSize: 'auto',
    sizes: gptImageSizes(),
  };
}

/**
 * 从 Core 的模型列表里挑出可生图的模型。
 *
 * Core 的 models.list 只按 platform 过滤（capability 参数会被忽略），openai 平台会带回
 * chat 模型，所以这里必须自己按能力筛。列表里完全没有能力信息时（老 Core）原样返回，
 * 由调用方与本地注册表合并后仍然可用。
 */
export function pickImageModels<T extends { capabilities?: string[] }>(models: readonly T[]): T[] {
  const withCapabilities = models.filter(m => Array.isArray(m.capabilities) && m.capabilities.length > 0);
  if (withCapabilities.length === 0) return [...models];
  return withCapabilities.filter(m => m.capabilities?.includes(IMAGE_GENERATION_CAPABILITY) === true);
}

/**
 * 把 Core 返回的可用模型列表合并成下拉选项：
 *   - GPT Image 2 永远排第一，保证默认选项不随 Core 返回顺序变化；
 *   - 已知 id 复用本地配置（尺寸/价格经过校对），未知 id 用默认模板兜底；
 *   - 重复 id 只保留一条；空列表时返回默认模型本身，UI 不会变成空选择器。
 */
export function resolveModelRegistry(models: ReadonlyArray<{ id: string; name?: string }>): ModelConfig[] {
  const merged: ModelConfig[] = [];
  const seen = new Set<string>();
  const push = (rawId: string | undefined, name?: string) => {
    const id = (rawId ?? '').trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    merged.push(getModelConfig(id) ?? createModelConfig(id, name));
  };

  push(DEFAULT_MODEL_ID);
  for (const model of models) push(model.id, model.name);
  return merged;
}

export function getModelConfig(id: string): ModelConfig | undefined {
  return MODEL_REGISTRY.find(m => m.id === id);
}

/** 在任意注册表（含动态合并结果）里按 id 查找模型配置。 */
export function findModelConfig(registry: readonly ModelConfig[], id: string): ModelConfig | undefined {
  return registry.find(m => m.id === id);
}

export function getDefaultModel(): ModelConfig {
  return getModelConfig(DEFAULT_MODEL_ID) ?? MODEL_REGISTRY[0];
}

export function getSizeOption(model: ModelConfig, sizeValue: string): SizeOption | undefined {
  return model.sizes.find(s => s.value === sizeValue);
}
