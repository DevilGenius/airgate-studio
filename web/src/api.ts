const PLUGIN_ID = 'airgate-studio';

function baseURL(): string {
  return `/api/v1/ext-user/${PLUGIN_ID}`;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${baseURL()}${path}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const resp = await fetch(url, options);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: { message: resp.statusText } }));
    throw new Error(err?.error?.message || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export interface GenerationTask {
  id: number;
  task_id: number;
  status: string;
  progress: number;
  prompt: string;
  model?: string;
  result_content?: string;
  error_message?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

export interface PlatformInfo {
  name: string;
  display_name: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  platform?: string;
  image_only?: boolean;
  capabilities?: string[];
}

export interface UserInfo {
  user_id: number;
  username: string;
  role: string;
}

export const api = {
  createGenerationTask(params: {
    kind: string;
    operation: string;
    platform: string;
    model: string;
    prompt: string;
    group_id: number;
    parameters?: Record<string, unknown>;
    inputs?: Array<{ type: string; role: string; url: string }>;
    mask?: { type: string; role: string; url: string };
  }): Promise<GenerationTask> {
    return request('POST', '/generation-tasks', params);
  },

  getGenerationTask(taskId: number): Promise<GenerationTask> {
    return request('GET', `/generation-tasks/${taskId}`);
  },

  listGenerationTasks(): Promise<GenerationTask[]> {
    return request<{ tasks: GenerationTask[] }>('GET', '/generation-tasks').then(r => r.tasks || []);
  },

  listPlatforms(): Promise<PlatformInfo[]> {
    return request<{ platforms: PlatformInfo[] }>('GET', '/platforms').then(r => r.platforms || []);
  },

  listModels(platform?: string, capability?: string): Promise<ModelInfo[]> {
    const params: Record<string, string> = {};
    if (platform) params.platform = platform;
    if (capability) params.capability = capability;
    return request<{ models: ModelInfo[] }>('GET', '/models', params).then(r => r.models || []);
  },
};
