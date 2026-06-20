import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GalleryView, __galleryViewTestUtils } from './GalleryView';
import type { GalleryItem, StudioGenerationTask } from './types';

const mocks = vi.hoisted(() => ({
  studio: {} as Record<string, unknown>,
  downloadImage: vi.fn(),
}));

vi.mock('./StudioContext', () => ({
  useStudio: () => mocks.studio,
}));

vi.mock('../utils', () => ({
  downloadImage: mocks.downloadImage,
}));

function item(overrides: Partial<GalleryItem> = {}): GalleryItem {
  return {
    id: 'g-1',
    taskId: 11,
    url: '/assets-runtime/image.png',
    alt: 'rendered image',
    prompt: 'a mountain',
    model: 'gpt-image-2',
    mode: 'text2img',
    size: '1024x1024',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

function task(overrides: Partial<StudioGenerationTask> = {}): StudioGenerationTask {
  return {
    id: 't-1',
    prompt: 'task prompt',
    mode: 'text2img',
    status: 'queued',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function setStudio(overrides: Partial<typeof mocks.studio> = {}) {
  Object.assign(mocks.studio, {
    gallery: [],
    tasks: [],
    previewItem: null,
    hasMore: false,
    loadingMore: false,
    loadMore: vi.fn(),
    setPreviewItem: vi.fn(),
    deleteGalleryItem: vi.fn(),
    deleteTask: vi.fn(),
    useAsReference: vi.fn(),
    regenerate: vi.fn(),
    generate: vi.fn(),
    setSelectedModelId: vi.fn(),
    setImageSize: vi.fn(),
    setImageMode: vi.fn(),
    generatedAssetRetentionDays: null,
    ...overrides,
  });
}

describe('GalleryView helpers', () => {
  it('formats assets and expiry metadata', () => {
    expect(__galleryViewTestUtils.isLocalRuntimeAsset('/assets-runtime/a.png')).toBe(true);
    expect(__galleryViewTestUtils.isLocalRuntimeAsset('https://cdn.test/a.png')).toBe(false);
    expect(__galleryViewTestUtils.buildThumbSrcSet('/assets-runtime/a.png')).toBe('/assets-runtime/a.png?w=256 256w, /assets-runtime/a.png?w=512 512w, /assets-runtime/a.png 1024w');
    expect(__galleryViewTestUtils.buildThumbSrcSet('/assets-runtime/a.png?token=1')).toContain('&w=256');
    expect(__galleryViewTestUtils.buildThumbSrcSet('https://cdn.test/a.png')).toBeUndefined();
    expect(__galleryViewTestUtils.formatCreatedAt('bad-date')).toBe('bad-date');
    expect(__galleryViewTestUtils.formatCreatedAt('2026-02-03T04:05:00Z')).toMatch(/2026-02-03/);
    expect(__galleryViewTestUtils.formatRemainingTime(2 * 24 * 60 * 60 * 1000)).toBe('2 天');
    expect(__galleryViewTestUtils.formatRemainingTime(2 * 60 * 60 * 1000 - 1)).toBe('2 小时');
    expect(__galleryViewTestUtils.formatRemainingTime(20 * 1000)).toBe('1 分钟');
    expect(__galleryViewTestUtils.getExpiryNotice('bad-date', 1)).toBeNull();
    expect(__galleryViewTestUtils.getExpiryNotice(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 1)).toEqual({ tone: 'danger', remainingLabel: '' });
    expect(__galleryViewTestUtils.parseAspectRatio('1024x512')).toBe(2);
    expect(__galleryViewTestUtils.parseAspectRatio('0x512')).toBeUndefined();
    expect(__galleryViewTestUtils.parseAspectRatio('auto')).toBeUndefined();
  });
});

describe('GalleryView', () => {
  beforeEach(() => {
    setStudio();
  });

  it('renders empty state and loading indicator', () => {
    setStudio({ loadingMore: true });

    render(<GalleryView />);

    expect(screen.getByText('还没有生成的图片')).toBeInTheDocument();
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders task cards, copies prompts, retries, and deletes failed tasks', async () => {
    setStudio({
      tasks: [
        task({ status: 'processing', prompt: 'processing prompt' }),
        task({ id: 'failed', status: 'failed', prompt: 'failed prompt', error: 'bad prompt', model: 'gpt-image-2', size: '1024x1024' }),
      ],
    });

    render(<GalleryView />);

    expect(screen.getByText('生成中...')).toBeInTheDocument();
    expect(screen.getByText('生成失败')).toBeInTheDocument();
    expect(screen.getByText('bad prompt')).toBeInTheDocument();

    fireEvent.click(screen.getByText('processing prompt'));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('processing prompt'));

    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(mocks.studio.deleteTask).toHaveBeenCalledWith('failed');
    expect(mocks.studio.setSelectedModelId).toHaveBeenCalledWith('gpt-image-2');
    expect(mocks.studio.setImageSize).toHaveBeenCalledWith('1024x1024');
    expect(mocks.studio.setImageMode).toHaveBeenCalledWith('text2img');
    await waitFor(() => expect(mocks.studio.generate).toHaveBeenCalledWith('failed prompt', { mode: 'text2img' }));

    fireEvent.click(screen.getByRole('button', { name: '删除' }));
    await waitFor(() => expect(mocks.studio.deleteTask).toHaveBeenCalledWith('failed'));
  });

  it('renders gallery cards and dispatches card actions', async () => {
    const galleryItem = item({
      createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    });
    setStudio({
      gallery: [galleryItem],
      generatedAssetRetentionDays: 1,
    });
    (window as unknown as { airgate: { confirm: ReturnType<typeof vi.fn> } }).airgate = {
      confirm: vi.fn().mockResolvedValue(true),
    };

    render(<GalleryView />);

    const img = await screen.findByAltText('rendered image');
    expect(img).toHaveAttribute('srcset', expect.stringContaining('w=256'));
    expect(screen.getByText('1024x1024')).toBeInTheDocument();
    expect(screen.getByText(/还有 .* 过期/)).toBeInTheDocument();

    fireEvent.click(img);
    expect(mocks.studio.setPreviewItem).toHaveBeenCalledWith(galleryItem);

    fireEvent.click(screen.getByTitle('下载'));
    expect(mocks.downloadImage).toHaveBeenCalledWith('/assets-runtime/image.png', 'rendered image');

    fireEvent.click(screen.getByTitle('参考图'));
    expect(mocks.studio.useAsReference).toHaveBeenCalledWith(galleryItem);

    fireEvent.click(screen.getByTitle('重试'));
    await waitFor(() => expect(mocks.studio.regenerate).toHaveBeenCalledWith(galleryItem));

    fireEvent.click(screen.getByTitle('删除'));
    await waitFor(() => expect(mocks.studio.deleteGalleryItem).toHaveBeenCalledWith('g-1'));
  });

  it('falls back to execCommand when clipboard write fails', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('denied'));
    const execSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true);
    setStudio({ gallery: [item({ prompt: 'copy fallback' })] });

    render(<GalleryView />);

    fireEvent.click(await screen.findByText('copy fallback'));
    await waitFor(() => expect(execSpy).toHaveBeenCalledWith('copy'));
    expect(await screen.findByText('✓ 已复制')).toBeInTheDocument();
  });

  it('renders and closes previews', () => {
    const preview = item({ url: '/assets-runtime/preview.png?token=1', alt: 'preview image' });
    setStudio({ previewItem: preview });

    render(<GalleryView />);

    const img = screen.getByAltText('preview image');
    expect(img).toHaveAttribute('src', '/assets-runtime/preview.png?token=1&w=512');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mocks.studio.setPreviewItem).toHaveBeenCalledWith(null);

    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(mocks.studio.setPreviewItem).toHaveBeenCalledWith(null);
  });

  it('renders non-local previews without progressive thumbnail URLs', () => {
    setStudio({ previewItem: item({ url: 'https://cdn.test/full.png', alt: 'remote preview' }) });

    render(<GalleryView />);

    const img = screen.getByAltText('remote preview');
    expect(img).toHaveAttribute('src', 'https://cdn.test/full.png');
    fireEvent.click(img);
    expect(mocks.studio.setPreviewItem).not.toHaveBeenCalled();
  });

  it('loads more when scrolled near the bottom', () => {
    const loadMore = vi.fn();
    setStudio({
      gallery: [item()],
      hasMore: true,
      loadMore,
    });

    const { container } = render(<GalleryView />);
    const scroller = container.querySelector('.studio-gallery') as HTMLElement;
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 900 });
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 400 });
    Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 1200 });

    fireEvent.scroll(scroller);

    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});
