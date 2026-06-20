import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

function jsonResponse(body: unknown, init?: Partial<Response>): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  it('sends generation requests with the session auth token and JSON body', async () => {
    window.localStorage.setItem('ag:web:auth:token', 'local-token');
    window.sessionStorage.setItem('ag:web:auth:token', 'session-token');
    fetchMock.mockResolvedValueOnce(jsonResponse({
      id: 1,
      task_id: 1,
      status: 'pending',
      progress: 0,
      prompt: 'city',
      created_at: '2026-01-01T00:00:00Z',
    }));

    await api.createGenerationTask({
      kind: 'image',
      operation: 'generate',
      platform: 'openai',
      model: 'gpt-image-2',
      prompt: 'city',
      parameters: { size: 'auto' },
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/ext-user/airgate-studio/generation-tasks', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kind: 'image',
        operation: 'generate',
        platform: 'openai',
        model: 'gpt-image-2',
        prompt: 'city',
        parameters: { size: 'auto' },
      }),
    });
  });

  it('falls back to local auth token and normalizes list defaults', async () => {
    window.localStorage.setItem('ag:web:auth:token', 'local-token');
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    const result = await api.listGenerationTasks({ limit: 20, offset: 10, status: 'completed' });

    expect(result).toEqual({ tasks: [], total: 0 });
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/ext-user/airgate-studio/generation-tasks?limit=20&offset=10&status=completed', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer local-token',
      },
    });
  });

  it('ignores inaccessible browser storage', async () => {
    const originalSession = window.sessionStorage;
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: vi.fn(() => {
          throw new Error('blocked');
        }),
      },
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({ tasks: [], total: 0 }));

    await api.listGenerationTasks();

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/ext-user/airgate-studio/generation-tasks', {
      method: 'GET',
      headers: {},
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: originalSession,
    });
  });

  it('builds model query strings and normalizes collection responses', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ platforms: [{ name: 'openai', display_name: 'OpenAI' }] }))
      .mockResolvedValueOnce(jsonResponse({ models: [{ id: 'm', name: 'Model' }] }))
      .mockResolvedValueOnce(jsonResponse({}));

    await expect(api.listPlatforms()).resolves.toEqual([{ name: 'openai', display_name: 'OpenAI' }]);
    await expect(api.listModels('openai', 'image')).resolves.toEqual([{ id: 'm', name: 'Model' }]);
    await expect(api.listModels()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/ext-user/airgate-studio/models?platform=openai&capability=image', {
      method: 'GET',
      headers: {},
    });
  });

  it('throws useful errors for extension HTTP failures', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'upstream unavailable' } }, { ok: false, status: 503 }))
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: vi.fn().mockRejectedValue(new Error('not json')),
      });

    await expect(api.getGenerationTask(9)).rejects.toThrow('upstream unavailable');
    await expect(api.deleteGenerationTask(10)).rejects.toThrow('Bad Gateway');
  });

  it('unwraps core public settings envelopes', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ code: 0, data: { asset_retention_generated_days: '7' } }));

    await expect(api.getPublicSettings()).resolves.toEqual({ asset_retention_generated_days: '7' });
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/settings/public', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
  });

  it('throws for invalid core envelopes and non-JSON responses', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ code: 1, message: 'bad settings' }))
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('not json')),
      });

    await expect(api.getPublicSettings()).rejects.toThrow('bad settings');
    await expect(api.getPublicSettings()).rejects.toThrow('HTTP 500');
  });
});
