import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MODEL_REGISTRY } from './modelConfig';
import { StudioView, __studioViewTestUtils } from './StudioView';
import StudioPage from '../StudioPage';

const mockStudio = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock('./StudioContext', () => ({
  StudioProvider: (props: { children: unknown }) => props.children,
  useStudio: () => mockStudio.value,
}));

function setStudio(overrides: Partial<typeof mockStudio.value> = {}) {
  Object.assign(mockStudio.value, {
    gallery: [],
    tasks: [],
    currentModel: MODEL_REGISTRY[0],
    imageSize: MODEL_REGISTRY[0].defaultSize,
    setImageSize: vi.fn(),
    setImageMode: vi.fn(),
    generate: vi.fn(),
    referenceImages: [],
    setReferenceImages: vi.fn(),
    previewItem: null,
    hasMore: false,
    loadingMore: false,
    loadMore: vi.fn(),
    setPreviewItem: vi.fn(),
    deleteGalleryItem: vi.fn(),
    deleteTask: vi.fn(),
    useAsReference: vi.fn(),
    regenerate: vi.fn(),
    generatedAssetRetentionDays: null,
    setSelectedModelId: vi.fn(),
    ...overrides,
  });
}

function imageFile(name = 'image.png') {
  return new File(['image'], name, { type: 'image/png' });
}

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('StudioView helpers', () => {
  it('normalizes mask rectangles and reads files', async () => {
    expect(__studioViewTestUtils.normalizeRect(80, 60, 20, 10, 100, 100)).toEqual({
      x: 0.2,
      y: 0.1,
      width: 0.6,
      height: 0.5,
    });
    expect(__studioViewTestUtils.normalizeRect(0, 0, 10, 10, 0, 100)).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });

    await expect(__studioViewTestUtils.readFileAsDataURL(imageFile())).resolves.toContain('data:image/png');
    expect(__studioViewTestUtils.INSPIRATIONS.length).toBeGreaterThan(10);
  });
});

describe('MaskEditor', () => {
  it('confirms, clears, closes, deletes, and handles escape', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const onDelete = vi.fn();
    const selection = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };

    render(
      <__studioViewTestUtils.MaskEditor
        src="/source.png"
        selection={selection}
        onConfirm={onConfirm}
        onClose={onClose}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: '确定' }));
    expect(onConfirm).toHaveBeenCalledWith(selection);

    await user.click(screen.getByRole('button', { name: '清除选区' }));
    await user.click(screen.getByRole('button', { name: '确定' }));
    expect(onConfirm).toHaveBeenLastCalledWith(null);

    await user.click(screen.getByRole('button', { name: '删除图片' }));
    expect(onDelete).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(onClose).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('supports preview-only mode', () => {
    render(
      <__studioViewTestUtils.MaskEditor
        src="/source.png"
        selection={null}
        maskingEnabled={false}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText('在图片上拖拽框选要局部修改的区域，不框选则为整图变换')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确定' })).not.toBeInTheDocument();
  });
});

describe('StudioLayout and ComposerBar', () => {
  beforeEach(() => setStudio());

  it('renders through StudioView and applies inspiration templates', async () => {
    const user = userEvent.setup();
    const { container } = render(<StudioView />);

    expect(screen.getByText('创作中心')).toBeInTheDocument();
    expect(screen.getByText('灵感画廊')).toBeInTheDocument();
    await user.click(screen.getByText('微缩护肤品广告'));

    expect((screen.getByPlaceholderText('描述你想生成的图片...') as HTMLTextAreaElement).value).toContain('miniature diorama');

    const mobileTabs = container.querySelectorAll('.studio-mobile-tabs button');
    fireEvent.click(mobileTabs[0]);
    expect(container.querySelector('[data-mobile-tab]')).toHaveAttribute('data-mobile-tab', 'inspiration');
    fireEvent.click(mobileTabs[1]);
    expect(container.querySelector('[data-mobile-tab]')).toHaveAttribute('data-mobile-tab', 'create');
  });

  it('renders the StudioPage wrapper', () => {
    render(<StudioPage />);

    expect(screen.getByText('创作中心')).toBeInTheDocument();
  });

  it('sends text prompts with the selected count', async () => {
    const user = userEvent.setup();
    render(<__studioViewTestUtils.ComposerBar />);

    await user.type(screen.getByPlaceholderText('描述你想生成的图片...'), 'city skyline');
    await user.click(screen.getByRole('button', { name: '4' }));
    fireEvent.keyDown(screen.getByPlaceholderText('描述你想生成的图片...'), { key: 'Enter' });

    expect(mockStudio.value.setImageMode).toHaveBeenCalledWith('text2img');
    expect(mockStudio.value.generate).toHaveBeenCalledTimes(4);
    expect(mockStudio.value.generate).toHaveBeenCalledWith('city skyline', { mode: 'text2img', count: 1 });
    expect(screen.getByPlaceholderText('描述你想生成的图片...')).toHaveValue('');
  });

  it('uploads sources and sends img2img prompts', async () => {
    const user = userEvent.setup();
    const { container } = render(<__studioViewTestUtils.ComposerBar />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [imageFile()] } });
    await screen.findByAltText('source');
    await user.type(screen.getByPlaceholderText('描述你想要的变化...'), 'change lighting');
    fireEvent.keyDown(screen.getByPlaceholderText('描述你想要的变化...'), { key: 'Enter' });

    expect(mockStudio.value.setImageMode).toHaveBeenCalledWith('img2img');
    expect(mockStudio.value.generate).toHaveBeenCalledWith('change lighting', {
      mode: 'img2img',
      sourceImages: [expect.stringContaining('data:image/png')],
      count: 1,
    });
  });

  it('handles upload button clicks, drag/drop, and paste image sources', async () => {
    const { container } = render(<__studioViewTestUtils.ComposerBar />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const inputClick = vi.spyOn(input, 'click').mockImplementation(() => {});
    const card = container.querySelector('.studio-quick-input') as HTMLElement;
    const textarea = screen.getByPlaceholderText('描述你想生成的图片...');

    fireEvent.click(screen.getByTitle('添加参考图'));
    expect(inputClick).toHaveBeenCalled();

    fireEvent.dragOver(card);
    fireEvent.dragLeave(card);
    fireEvent.drop(card, { dataTransfer: { files: [imageFile('drop.png')] } });
    await screen.findByAltText('source');

    fireEvent.paste(textarea, {
      clipboardData: {
        items: [
          { type: 'text/plain', getAsFile: () => null },
          { type: 'image/png', getAsFile: () => imageFile('paste.png') },
        ],
      },
    });

    await waitFor(() => expect(screen.getAllByAltText('source').length).toBeGreaterThanOrEqual(2));
  });

  it('combines and clears gallery reference images', async () => {
    const user = userEvent.setup();
    setStudio({ referenceImages: ['/ref-a.png', '/ref-b.png'] });
    render(<__studioViewTestUtils.ComposerBar />);

    expect(screen.getAllByAltText('source')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: '清除全部' }));

    expect(mockStudio.value.setReferenceImages).toHaveBeenCalledWith([]);
  });

  it('opens multi-source previews and removes referenced images', async () => {
    const user = userEvent.setup();
    setStudio({ referenceImages: ['/ref-a.png', '/ref-b.png'] });
    render(<__studioViewTestUtils.ComposerBar />);

    fireEvent.click((screen.getAllByAltText('source')[0].parentElement as HTMLElement));
    expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确定' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '删除图片' }));
    expect(mockStudio.value.setReferenceImages).toHaveBeenCalledWith(['/ref-b.png']);
  });

  it('creates inpaint selections from single references', async () => {
    const user = userEvent.setup();
    setStudio({ referenceImages: ['/ref.png'] });
    render(<__studioViewTestUtils.ComposerBar />);

    fireEvent.click(screen.getByAltText('source').parentElement as HTMLElement);
    const editorImg = screen.getAllByAltText('source').at(-1) as HTMLImageElement;
    const canvas = editorImg.parentElement as HTMLElement;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 100, 100));
    vi.spyOn(editorImg, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 100, 100));
    Object.defineProperty(canvas, 'clientLeft', { configurable: true, value: 0 });
    Object.defineProperty(canvas, 'clientTop', { configurable: true, value: 0 });

    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 20 });
    fireEvent.mouseMove(canvas, { clientX: 60, clientY: 80 });
    fireEvent.mouseUp(canvas, { clientX: 60, clientY: 80 });
    await user.click(screen.getByRole('button', { name: '确定' }));

    expect(screen.getByText('局部绘图')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '清除选区' }));
    expect(screen.getByText('图生图')).toBeInTheDocument();
    fireEvent.click(screen.getByAltText('source').parentElement as HTMLElement);
    const editorImgAgain = screen.getAllByAltText('source').at(-1) as HTMLImageElement;
    const canvasAgain = editorImgAgain.parentElement as HTMLElement;
    vi.spyOn(canvasAgain, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 100, 100));
    vi.spyOn(editorImgAgain, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 100, 100));
    Object.defineProperty(canvasAgain, 'clientLeft', { configurable: true, value: 0 });
    Object.defineProperty(canvasAgain, 'clientTop', { configurable: true, value: 0 });
    fireEvent.mouseDown(canvasAgain, { clientX: 10, clientY: 20 });
    fireEvent.mouseUp(canvasAgain, { clientX: 60, clientY: 80 });
    await user.click(screen.getByRole('button', { name: '确定' }));

    await user.type(screen.getByPlaceholderText('描述要修改的区域...'), 'replace object');
    fireEvent.keyDown(screen.getByPlaceholderText('描述要修改的区域...'), { key: 'Enter' });

    expect(mockStudio.value.setImageMode).toHaveBeenCalledWith('inpaint');
    expect(mockStudio.value.generate).toHaveBeenCalledWith('replace object', {
      mode: 'inpaint',
      sourceImage: '/ref.png',
      maskRegion: { x: 0.1, y: 0.2, width: 0.5, height: 0.6 },
    });
  });

  it('renders gallery mode when there are visible tasks or images', async () => {
    setStudio({
      gallery: [{
        id: 'g',
        taskId: 1,
        url: '/assets-runtime/g.png',
        alt: 'gallery image',
        prompt: 'gallery prompt',
        model: 'gpt-image-2',
        mode: 'text2img',
        size: '1024x1024',
        createdAt: new Date().toISOString(),
      }],
    });

    render(<__studioViewTestUtils.StudioLayout />);

    await waitFor(() => expect(screen.getByAltText('gallery image')).toBeInTheDocument());
    expect(screen.queryByText('创作中心')).not.toBeInTheDocument();
  });
});
