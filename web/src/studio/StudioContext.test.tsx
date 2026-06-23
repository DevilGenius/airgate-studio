import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioProvider, useStudio, __studioContextTestUtils, type StudioContextValue } from './StudioContext';
import type { GalleryItem } from './types';
import type { GenerationTask } from '../api';
import { MODEL_REGISTRY } from './modelConfig';

const mockApi = vi.hoisted(() => ({
  createGenerationTask: vi.fn(),
  getGenerationTask: vi.fn(),
  listGenerationTasks: vi.fn(),
  deleteGenerationTask: vi.fn(),
  listPlatforms: vi.fn(),
  listModels: vi.fn(),
  getPublicSettings: vi.fn(),
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

function remoteTask(overrides: Partial<GenerationTask> = {}): GenerationTask {
  return {
    id: 1,
    task_id: 1,
    status: 'completed',
    progress: 100,
    prompt: 'prompt',
    model: 'gpt-image-2',
    operation: 'generate',
    size: 'auto',
    result_content: '![result](/assets-runtime/result.png)',
    created_at: '2026-01-01T00:00:00Z',
    completed_at: '2026-01-01T00:01:00Z',
    ...overrides,
  };
}

function renderStudio() {
  const capture: { current: StudioContextValue | null } = { current: null };

  function Probe() {
    capture.current = useStudio();
    return null;
  }

  render(
    <StudioProvider>
      <Probe />
    </StudioProvider>,
  );

  return capture;
}

function current(capture: { current: StudioContextValue | null }): StudioContextValue {
  if (!capture.current) throw new Error('context not captured');
  return capture.current;
}

describe('StudioContext helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses tasks, operations, modes, and gallery uniqueness', async () => {
    const u = __studioContextTestUtils;
    const first: GalleryItem = {
      id: 'a',
      taskId: 1,
      url: '/a.png',
      alt: 'a',
      prompt: 'p',
      model: 'm',
      mode: 'text2img',
      createdAt: 'now',
    };
    const duplicate: GalleryItem = { ...first, id: 'b' };
    const second: GalleryItem = { ...first, id: 'c', taskId: 2, url: '/b.png' };

    expect(u.parseMarkdownImages('x ![A](/a.png) y ![B](https://cdn.test/b.webp)')).toEqual([
      { alt: 'A', url: '/a.png' },
      { alt: 'B', url: 'https://cdn.test/b.webp' },
    ]);
    expect(u.parseMarkdownImages('![bad](with space.png)')).toEqual([]);
    expect(u.uniqueNumbers([1, undefined, 2, 1, 0, null, 3])).toEqual([1, 2, 3]);
    expect(u.operationToImageMode('inpaint')).toBe('inpaint');
    expect(u.operationToImageMode('edit')).toBe('img2img');
    expect(u.operationToImageMode('generate')).toBe('text2img');
    expect(u.modeToOperation('inpaint')).toBe('inpaint');
    expect(u.modeToOperation('img2img')).toBe('edit');
    expect(u.resolveGenerationMode({ maskRegion: { x: 0, y: 0, width: 1, height: 1 } })).toBe('inpaint');
    expect(u.resolveGenerationMode({ sourceImages: ['/a.png'] })).toBe('img2img');
    expect(u.resolveGenerationMode()).toBe('text2img');
    expect(u.taskRemoteIds({
      id: 'r-8',
      prompt: '',
      mode: 'text2img',
      status: 'completed',
      createdAt: '',
      remoteTaskIds: [3, 3],
      result: [{ ...first, taskId: 4 }],
    })).toEqual([3, 8, 4]);
    expect(u.taskRemoteIds(undefined)).toEqual([]);
    expect(u.taskSize(remoteTask({ size: undefined }))).toBeUndefined();
    expect(u.taskAssetCreatedAt(remoteTask({ completed_at: undefined }))).toBe('2026-01-01T00:00:00Z');
    expect(u.galleryItemKey(first)).toBe('1:/a.png');
    expect(u.galleryItemKey({ ...first, taskId: undefined })).toBe('url:/a.png');
    expect(u.dedupeGalleryItems([first, duplicate, second])).toEqual([first, second]);
    expect(u.prependUniqueGalleryItems([first], [duplicate, second])).toEqual([second, first]);
    expect(u.prependUniqueGalleryItems([first], [])).toEqual([first]);
    expect(u.prependUniqueGalleryItems([first], [duplicate])).toEqual([first]);
    expect(u.appendUniqueGalleryItems([first], [duplicate, second])).toEqual([first, second]);
    expect(u.appendUniqueGalleryItems([first], [])).toEqual([first]);
    expect(u.appendUniqueGalleryItems([first], [duplicate])).toEqual([first]);

    vi.useFakeTimers();
    const controller = new AbortController();
    const delayed = u.delay(10, controller.signal);
    await vi.advanceTimersByTimeAsync(10);
    await expect(delayed).resolves.toBeUndefined();
    const aborting = new AbortController();
    const abortedLater = u.delay(100, aborting.signal);
    aborting.abort();
    await expect(abortedLater).rejects.toThrow('Aborted');
    controller.abort();
    await expect(u.delay(10, controller.signal)).rejects.toThrow('Aborted');
  });

  it('creates mask data URLs and polls task terminal states', async () => {
    const u = __studioContextTestUtils;
    await expect(u.createMaskDataUrl('/source.png', { x: -1, y: 0.2, width: 3, height: 0.4 })).resolves.toBe('data:image/png;base64,mask');
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => null),
    });
    await expect(u.createMaskDataUrl('/source.png', { x: 0, y: 0, width: 1, height: 1 })).rejects.toThrow('Cannot create canvas context');
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: originalGetContext,
    });

    mockApi.getGenerationTask.mockResolvedValueOnce(remoteTask({ id: 12, status: 'completed' }));
    await expect(u.pollGenerationTask(12, new AbortController().signal, 1)).resolves.toMatchObject({ id: 12 });

    mockApi.getGenerationTask.mockResolvedValueOnce(remoteTask({ id: 13, status: 'failed', error_message: 'nope' }));
    await expect(u.pollGenerationTask(13, new AbortController().signal, 1)).rejects.toThrow('nope');
    mockApi.getGenerationTask.mockResolvedValueOnce(remoteTask({ id: 14, status: 'failed', error_message: undefined }));
    await expect(u.pollGenerationTask(14, new AbortController().signal, 1)).rejects.toThrow('Image generation task failed');

    const controller = new AbortController();
    controller.abort();
    await expect(u.pollGenerationTask(15, controller.signal, 1)).rejects.toThrow('Aborted');
  });

  it('polls through temporary network errors and times out pending tasks', async () => {
    vi.useFakeTimers();
    const u = __studioContextTestUtils;
    mockApi.getGenerationTask
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce(remoteTask({ id: 15, status: 'completed' }));

    const recovered = u.pollGenerationTask(15, new AbortController().signal, 2);
    await vi.advanceTimersByTimeAsync(4000);
    await expect(recovered).resolves.toMatchObject({ id: 15 });

    mockApi.getGenerationTask.mockResolvedValue(remoteTask({ id: 16, status: 'processing', result_content: undefined }));
    const timedOut = u.pollGenerationTask(16, new AbortController().signal, 1);
    const timeoutAssertion = expect(timedOut).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(2000);
    await timeoutAssertion;
  });
});

describe('StudioProvider', () => {
  beforeEach(() => {
    mockApi.getPublicSettings.mockResolvedValue({});
    mockApi.listGenerationTasks.mockResolvedValue({ tasks: [], total: 0 });
    mockApi.createGenerationTask.mockResolvedValue(remoteTask({ id: 50, status: 'pending' }));
    mockApi.getGenerationTask.mockResolvedValue(remoteTask({ id: 50, status: 'completed' }));
    mockApi.deleteGenerationTask.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws when the hook is used outside the provider', () => {
    function Outside() {
      useStudio();
      return null;
    }

    expect(() => render(<Outside />)).toThrow('useStudio must be used within StudioProvider');
  });

  it('recovers settings, completed gallery items, failed tasks, and in-flight tasks', async () => {
    const completed = remoteTask({
      id: 21,
      operation: 'edit',
      size: '1024x1024',
      result_content: '![one](/assets-runtime/one.png)\n![duplicate](/assets-runtime/one.png)',
    });
    const failed = remoteTask({
      id: 22,
      status: 'failed',
      operation: 'inpaint',
      result_content: undefined,
      error_message: 'bad mask',
    });
    const pending = remoteTask({
      id: 23,
      status: 'processing',
      operation: 'generate',
      result_content: undefined,
    });
    mockApi.getPublicSettings.mockResolvedValueOnce({ asset_retention_generated_days: '14' });
    mockApi.listGenerationTasks.mockImplementation((params?: { status?: string }) => {
      if (params?.status === 'completed') return Promise.resolve({ tasks: [completed], total: 3 });
      return Promise.resolve({ tasks: [failed, pending], total: 2 });
    });
    mockApi.getGenerationTask.mockResolvedValueOnce(remoteTask({
      id: 23,
      status: 'completed',
      prompt: pending.prompt,
      result_content: '![done](/assets-runtime/done.png)',
    }));

    const capture = renderStudio();

    await waitFor(() => expect(current(capture).generatedAssetRetentionDays).toBe(14));
    await waitFor(() => expect(current(capture).gallery.map(g => g.url)).toContain('/assets-runtime/done.png'));
    expect(current(capture).gallery.filter(g => g.url === '/assets-runtime/one.png')).toHaveLength(1);
    expect(current(capture).hasMore).toBe(true);
    expect(current(capture).tasks.some(t => t.id === 'r-22' && t.status === 'failed' && t.error === 'bad mask')).toBe(true);
    expect(current(capture).tasks.some(t => t.id === 'r-23' && t.status === 'completed')).toBe(true);
  });

  it('keeps invalid retention settings as null', async () => {
    mockApi.getPublicSettings.mockResolvedValueOnce({ asset_retention_generated_days: '0' });
    const capture = renderStudio();

    await waitFor(() => expect(mockApi.getPublicSettings).toHaveBeenCalled());
    expect(current(capture).generatedAssetRetentionDays).toBeNull();
  });

  it('updates model size only when the selected model cannot use the current size', async () => {
    const extraModel = {
      ...MODEL_REGISTRY[0],
      id: 'tiny-model',
      name: 'Tiny Model',
      defaultSize: 'tiny',
      sizes: [{ value: 'tiny', label: 'Tiny', tier: '1K' as const, price: 0.01 }],
    };
    MODEL_REGISTRY.push(extraModel);
    const capture = renderStudio();
    await waitFor(() => expect(mockApi.listGenerationTasks).toHaveBeenCalledTimes(2));

    try {
      act(() => {
        current(capture).setSelectedModelId('missing-model');
      });
      expect(current(capture).imageSize).toBe('auto');

      act(() => {
        current(capture).setSelectedModelId('tiny-model');
      });
      expect(current(capture).selectedModelId).toBe('tiny-model');
      expect(current(capture).imageSize).toBe('tiny');
    } finally {
      MODEL_REGISTRY.pop();
    }
  });

  it('treats settings and recovery failures as non-fatal', async () => {
    mockApi.getPublicSettings.mockRejectedValueOnce(new Error('settings failed'));
    mockApi.listGenerationTasks.mockRejectedValue(new Error('recovery failed'));
    const capture = renderStudio();

    await waitFor(() => expect(mockApi.getPublicSettings).toHaveBeenCalled());
    await waitFor(() => expect(mockApi.listGenerationTasks).toHaveBeenCalled());
    expect(current(capture).generatedAssetRetentionDays).toBeNull();
    expect(current(capture).gallery).toEqual([]);
    expect(current(capture).tasks).toEqual([]);
  });

  it('loads more completed gallery pages and dedupes existing images', async () => {
    mockApi.listGenerationTasks
      .mockResolvedValueOnce({ tasks: [], total: 2 })
      .mockResolvedValueOnce({ tasks: [], total: 0 })
      .mockResolvedValueOnce({
        tasks: [
          remoteTask({ id: 31, result_content: '![new](/assets-runtime/new.png)' }),
          remoteTask({ id: 31, result_content: '![new](/assets-runtime/new.png)' }),
        ],
        total: 2,
      });
    const capture = renderStudio();

    await waitFor(() => expect(current(capture).hasMore).toBe(true));
    await act(async () => {
      await current(capture).loadMore();
    });

    expect(current(capture).gallery.map(g => g.url)).toEqual(['/assets-runtime/new.png']);
    expect(current(capture).hasMore).toBe(false);
  });

  it('short-circuits and recovers from loadMore failures', async () => {
    mockApi.listGenerationTasks
      .mockResolvedValueOnce({ tasks: [], total: 0 })
      .mockResolvedValueOnce({ tasks: [], total: 0 });
    const capture = renderStudio();
    await waitFor(() => expect(current(capture).hasMore).toBe(false));

    await act(async () => {
      await current(capture).loadMore();
    });
    expect(mockApi.listGenerationTasks).toHaveBeenCalledTimes(2);

    mockApi.listGenerationTasks
      .mockResolvedValueOnce({ tasks: [], total: 2 })
      .mockResolvedValueOnce({ tasks: [], total: 0 })
      .mockRejectedValueOnce(new Error('load failed'));
    const second = renderStudio();
    await waitFor(() => expect(current(second).hasMore).toBe(true));
    await act(async () => {
      await current(second).loadMore();
    });

    expect(current(second).loadingMore).toBe(false);
    expect(current(second).gallery).toEqual([]);
  });

  it('generates text-to-image tasks and can delete the completed task', async () => {
    mockApi.createGenerationTask.mockResolvedValueOnce(remoteTask({ id: 41, status: 'pending' }));
    mockApi.getGenerationTask.mockResolvedValueOnce(remoteTask({
      id: 41,
      status: 'completed',
      result_content: '![new](/assets-runtime/new.png)',
    }));
    const capture = renderStudio();
    await waitFor(() => expect(mockApi.listGenerationTasks).toHaveBeenCalledTimes(2));

    act(() => {
      current(capture).generate('  a castle  ');
    });

    await waitFor(() => expect(current(capture).gallery[0]?.url).toBe('/assets-runtime/new.png'));
    expect(mockApi.createGenerationTask).toHaveBeenCalledWith({
      kind: 'image',
      operation: 'generate',
      platform: 'openai',
      model: 'gpt-image-2',
      prompt: '  a castle  ',
      parameters: { size: 'auto' },
    });
    const uiTaskId = current(capture).tasks[0].id;
    act(() => {
      current(capture).deleteTask(uiTaskId);
    });

    expect(mockApi.deleteGenerationTask).toHaveBeenCalledWith(41);
    expect(current(capture).tasks).toHaveLength(0);
    expect(current(capture).gallery).toHaveLength(0);
  });

  it('handles empty size, empty result content, and non-Error failures', async () => {
    mockApi.createGenerationTask.mockResolvedValueOnce(remoteTask({ id: 46, status: 'pending' }));
    mockApi.getGenerationTask.mockResolvedValueOnce(remoteTask({
      id: 46,
      status: 'completed',
      result_content: undefined,
    }));
    const capture = renderStudio();
    await waitFor(() => expect(mockApi.listGenerationTasks).toHaveBeenCalledTimes(2));

    act(() => {
      current(capture).setImageSize('');
    });
    act(() => {
      current(capture).generate('no output');
    });

    await waitFor(() => expect(current(capture).tasks[0].status).toBe('completed'));
    expect(mockApi.createGenerationTask).toHaveBeenCalledWith(expect.objectContaining({
      parameters: undefined,
    }));
    expect(current(capture).tasks[0].result).toEqual([]);

    mockApi.createGenerationTask.mockRejectedValueOnce('plain failure');
    act(() => {
      current(capture).generate('plain failure');
    });
    await waitFor(() => expect(current(capture).tasks[0].status).toBe('failed'));
    expect(current(capture).tasks[0].error).toBe('Generation failed');
  });

  it('ignores missing delete targets without remote calls', async () => {
    const capture = renderStudio();
    await waitFor(() => expect(mockApi.listGenerationTasks).toHaveBeenCalledTimes(2));
    mockApi.deleteGenerationTask.mockClear();

    act(() => {
      current(capture).deleteTask('missing');
      current(capture).deleteGalleryItem('missing');
    });

    expect(mockApi.deleteGenerationTask).not.toHaveBeenCalled();
  });

  it('deletes a gallery item through its matching task', async () => {
    mockApi.createGenerationTask.mockResolvedValueOnce(remoteTask({ id: 44, status: 'pending' }));
    mockApi.getGenerationTask.mockResolvedValueOnce(remoteTask({
      id: 44,
      status: 'completed',
      result_content: '![new](/assets-runtime/delete-me.png)',
    }));
    const capture = renderStudio();
    await waitFor(() => expect(mockApi.listGenerationTasks).toHaveBeenCalledTimes(2));

    act(() => {
      current(capture).generate('delete me');
    });
    await waitFor(() => expect(current(capture).gallery[0]?.url).toBe('/assets-runtime/delete-me.png'));

    act(() => {
      current(capture).deleteGalleryItem(current(capture).gallery[0].id);
    });

    expect(mockApi.deleteGenerationTask).toHaveBeenCalledWith(44);
    expect(current(capture).gallery).toHaveLength(0);
  });

  it('sends img2img sources and marks inpaint without a source as failed', async () => {
    mockApi.createGenerationTask.mockResolvedValueOnce(remoteTask({ id: 42, status: 'pending' }));
    mockApi.getGenerationTask.mockResolvedValueOnce(remoteTask({
      id: 42,
      status: 'completed',
      result_content: '![edit](/assets-runtime/edit.png)',
    }));
    const capture = renderStudio();
    await waitFor(() => expect(mockApi.listGenerationTasks).toHaveBeenCalledTimes(2));

    act(() => {
      current(capture).generate('edit it', { mode: 'img2img', sourceImages: ['/a.png', '/b.png'] });
    });

    await waitFor(() => expect(mockApi.createGenerationTask).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'edit',
      inputs: [
        { type: 'image', role: 'source', url: '/a.png' },
        { type: 'image', role: 'source', url: '/b.png' },
      ],
    })));

    act(() => {
      current(capture).generate('paint', { mode: 'inpaint' });
    });

    await waitFor(() => expect(current(capture).tasks[0].status).toBe('failed'));
    expect(current(capture).tasks[0].error).toBe('Inpaint requires a source image');
  });

  it('uses accumulated references for img2img and records the first reference as sourceUrl', async () => {
    mockApi.createGenerationTask.mockResolvedValueOnce(remoteTask({ id: 45, status: 'pending' }));
    mockApi.getGenerationTask.mockResolvedValueOnce(remoteTask({
      id: 45,
      status: 'completed',
      result_content: '![edit](/assets-runtime/ref-edit.png)',
    }));
    const capture = renderStudio();
    await waitFor(() => expect(mockApi.listGenerationTasks).toHaveBeenCalledTimes(2));

    act(() => {
      current(capture).setReferenceImages(['/ref-a.png', '/ref-b.png']);
    });
    act(() => {
      current(capture).generate('use refs', { mode: 'img2img' });
    });

    await waitFor(() => expect(current(capture).gallery[0]?.sourceUrl).toBe('/ref-a.png'));
    expect(mockApi.createGenerationTask).toHaveBeenCalledWith(expect.objectContaining({
      inputs: [
        { type: 'image', role: 'source', url: '/ref-a.png' },
        { type: 'image', role: 'source', url: '/ref-b.png' },
      ],
    }));
  });

  it('generates inpaint masks when a source and region are provided', async () => {
    mockApi.createGenerationTask.mockResolvedValueOnce(remoteTask({ id: 43, status: 'pending' }));
    mockApi.getGenerationTask.mockResolvedValueOnce(remoteTask({
      id: 43,
      status: 'completed',
      result_content: '![paint](/assets-runtime/paint.png)',
    }));
    const capture = renderStudio();
    await waitFor(() => expect(mockApi.listGenerationTasks).toHaveBeenCalledTimes(2));

    act(() => {
      current(capture).generate('paint it', {
        mode: 'inpaint',
        sourceImage: '/source.png',
        maskRegion: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      });
    });

    await waitFor(() => expect(mockApi.createGenerationTask).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'inpaint',
      inputs: [{ type: 'image', role: 'source', url: '/source.png' }],
      mask: { type: 'image', role: 'mask', url: 'data:image/png;base64,mask' },
    })));
  });

  it('deletes standalone gallery items and can use or regenerate references', async () => {
    mockApi.listGenerationTasks
      .mockResolvedValueOnce({
        tasks: [remoteTask({
          id: 61,
          result_content: '![old](/assets-runtime/old.png)',
          operation: 'edit',
          size: '1024x1024',
        })],
        total: 1,
      })
      .mockResolvedValueOnce({ tasks: [], total: 0 });
    mockApi.createGenerationTask.mockResolvedValue(remoteTask({ id: 62, status: 'pending' }));
    mockApi.getGenerationTask.mockResolvedValue(remoteTask({
      id: 62,
      status: 'completed',
      result_content: '![regen](/assets-runtime/regen.png)',
    }));
    const capture = renderStudio();

    await waitFor(() => expect(current(capture).gallery[0]?.url).toBe('/assets-runtime/old.png'));
    const galleryItem = current(capture).gallery[0];

    act(() => {
      current(capture).useAsReference(galleryItem);
      current(capture).useAsReference(galleryItem);
    });
    expect(current(capture).referenceImages).toEqual(['/assets-runtime/old.png']);

    act(() => {
      current(capture).regenerate({ ...galleryItem, sourceUrl: '/source.png' });
    });
    await waitFor(() => expect(mockApi.createGenerationTask).toHaveBeenCalledWith(expect.objectContaining({
      prompt: galleryItem.prompt,
    })));

    act(() => {
      current(capture).deleteGalleryItem(galleryItem.id);
    });
    expect(mockApi.deleteGenerationTask).toHaveBeenCalledWith(61);

  });

  it('refreshes processing tasks on focus and visibility changes', async () => {
    mockApi.createGenerationTask.mockResolvedValueOnce(remoteTask({ id: 81, status: 'pending' }));
    mockApi.getGenerationTask.mockReturnValue(new Promise(() => {}));
    const capture = renderStudio();
    await waitFor(() => expect(mockApi.listGenerationTasks).toHaveBeenCalledTimes(2));

    act(() => {
      current(capture).generate('focus refresh');
    });
    await waitFor(() => expect(current(capture).tasks[0]?.remoteTaskIds).toEqual([81]));

    mockApi.getGenerationTask.mockResolvedValueOnce(remoteTask({
      id: 81,
      status: 'completed',
      prompt: 'focus refresh',
      result_content: '![focus](/assets-runtime/focus.png)',
    }));
    fireEvent.focus(window);
    await waitFor(() => expect(current(capture).tasks[0].status).toBe('completed'));
    expect(current(capture).gallery[0].url).toBe('/assets-runtime/focus.png');

    mockApi.createGenerationTask.mockResolvedValueOnce(remoteTask({ id: 82, status: 'pending' }));
    mockApi.getGenerationTask.mockReturnValue(new Promise(() => {}));
    act(() => {
      current(capture).generate('visibility refresh');
    });
    await waitFor(() => expect(current(capture).tasks[0]?.remoteTaskIds).toEqual([82]));
    mockApi.getGenerationTask.mockResolvedValueOnce(remoteTask({
      id: 82,
      status: 'failed',
      error_message: 'remote failed',
      result_content: undefined,
    }));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    fireEvent(document, new Event('visibilitychange'));
    await waitFor(() => expect(current(capture).tasks[0].status).toBe('failed'));
    expect(current(capture).tasks[0].error).toBe('remote failed');

    mockApi.createGenerationTask.mockResolvedValueOnce(remoteTask({ id: 83, status: 'pending' }));
    mockApi.getGenerationTask.mockReturnValue(new Promise(() => {}));
    act(() => {
      current(capture).generate('refresh catch');
    });
    await waitFor(() => expect(current(capture).tasks[0]?.remoteTaskIds).toEqual([83]));
    mockApi.getGenerationTask.mockRejectedValueOnce(new Error('single check failed'));
    fireEvent.focus(window);
    await waitFor(() => expect(mockApi.getGenerationTask).toHaveBeenCalled());
  });

  it('ignores blank prompts', async () => {
    const capture = renderStudio();
    await waitFor(() => expect(mockApi.listGenerationTasks).toHaveBeenCalledTimes(2));

    act(() => {
      current(capture).generate('   ');
    });
    expect(mockApi.createGenerationTask).not.toHaveBeenCalled();
  });
});
