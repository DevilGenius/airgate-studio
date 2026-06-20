import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MODEL_REGISTRY } from '../modelConfig';
import { TextToImagePanel } from './TextToImagePanel';
import { ImageToImagePanel } from './ImageToImagePanel';
import { InpaintPanel, __inpaintPanelTestUtils } from './InpaintPanel';
import { BatchPanel } from './BatchPanel';
import { ImageModule } from './ImageModule';

const mockStudio = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock('../StudioContext', () => ({
  useStudio: () => mockStudio.value,
}));

function setStudio(overrides: Partial<typeof mockStudio.value> = {}) {
  Object.assign(mockStudio.value, {
    currentModel: MODEL_REGISTRY[0],
    selectedModelId: MODEL_REGISTRY[0].id,
    setSelectedModelId: vi.fn(),
    imageSize: MODEL_REGISTRY[0].defaultSize,
    setImageSize: vi.fn(),
    isGenerating: false,
    generate: vi.fn(),
    imageMode: 'text2img',
    setImageMode: vi.fn(),
    ...overrides,
  });
}

function imageFile(name = 'image.png') {
  return new File(['image'], name, { type: 'image/png' });
}

function textFile() {
  return new File(['text'], 'note.txt', { type: 'text/plain' });
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

describe('image panel helpers', () => {
  it('normalizes inpaint rectangles with clamping and reversed drags', () => {
    expect(__inpaintPanelTestUtils.normalizeRect(75, 50, 25, 10, 100, 80)).toEqual({
      x: 0.25,
      y: 0.125,
      width: 0.5,
      height: 0.5,
    });
    expect(__inpaintPanelTestUtils.normalizeRect(0, 0, 100, 100, 0, 80)).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });
});

describe('TextToImagePanel', () => {
  beforeEach(() => setStudio());

  it('generates one request per selected count', async () => {
    const user = userEvent.setup();
    render(<TextToImagePanel />);

    expect(screen.getByRole('button', { name: '生成' })).toBeDisabled();
    await user.type(screen.getByPlaceholderText('描述你想生成的图片...'), '  sunset  ');
    await user.click(screen.getByRole('button', { name: '3' }));
    await user.click(screen.getByRole('button', { name: '生成' }));

    expect(mockStudio.value.generate).toHaveBeenCalledTimes(3);
    expect(mockStudio.value.generate).toHaveBeenCalledWith('sunset', { mode: 'text2img', count: 1 });
  });

  it('does not generate while already generating', async () => {
    const user = userEvent.setup();
    setStudio({ isGenerating: true });
    render(<TextToImagePanel />);

    await user.type(screen.getByPlaceholderText('描述你想生成的图片...'), 'busy');
    await user.click(screen.getByRole('button', { name: '生成中...' }));

    expect(mockStudio.value.generate).not.toHaveBeenCalled();
  });
});

describe('multi-model selectors in image panels', () => {
  beforeEach(() => setStudio());

  it('routes model changes from every panel select', async () => {
    const user = userEvent.setup();
    const extraModel = {
      ...MODEL_REGISTRY[0],
      id: 'other-image-model',
      name: 'Other Image Model',
    };
    MODEL_REGISTRY.push(extraModel);

    try {
      const text = render(<TextToImagePanel />);
      await user.click(screen.getByRole('button', { name: /GPT Image 2/ }));
      await user.click(screen.getByRole('button', { name: 'Other Image Model' }));
      expect(mockStudio.value.setSelectedModelId).toHaveBeenCalledWith('other-image-model');
      text.unmount();

      const img = render(<ImageToImagePanel />);
      await user.click(screen.getByRole('button', { name: /GPT Image 2/ }));
      await user.click(screen.getByRole('button', { name: 'Other Image Model' }));
      expect(mockStudio.value.setSelectedModelId).toHaveBeenCalledWith('other-image-model');
      img.unmount();

      const inpaint = render(<InpaintPanel />);
      await user.click(screen.getByRole('button', { name: /GPT Image 2/ }));
      await user.click(screen.getByRole('button', { name: 'Other Image Model' }));
      expect(mockStudio.value.setSelectedModelId).toHaveBeenCalledWith('other-image-model');
      inpaint.unmount();

      const batch = render(<BatchPanel />);
      await user.click(screen.getByRole('button', { name: /GPT Image 2/ }));
      await user.click(screen.getByRole('button', { name: 'Other Image Model' }));
      expect(mockStudio.value.setSelectedModelId).toHaveBeenCalledWith('other-image-model');
      batch.unmount();
    } finally {
      MODEL_REGISTRY.pop();
    }
  });
});

describe('ImageToImagePanel', () => {
  beforeEach(() => setStudio());

  it('ignores non-images, uploads an image, removes it, and generates img2img', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImageToImagePanel />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [textFile()] } });
    expect(screen.getByRole('button', { name: '生成' })).toBeDisabled();

    fireEvent.change(input, { target: { files: [imageFile()] } });
    await screen.findByAltText('source');

    await user.click(screen.getByTitle('移除图片'));
    expect(screen.queryByAltText('source')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { files: [imageFile('second.png')] } });
    const source = await screen.findByAltText('source');
    await user.type(screen.getByPlaceholderText('描述你想要的变化...'), 'make it brighter');
    await user.click(screen.getByRole('button', { name: '生成' }));

    expect(source).toHaveAttribute('src', expect.stringContaining('data:image/png'));
    expect(mockStudio.value.generate).toHaveBeenCalledWith('make it brighter', {
      mode: 'img2img',
      sourceImage: expect.stringContaining('data:image/png'),
    });
  });

  it('handles upload area keyboard, drag state, and dropped files', async () => {
    const { container } = render(<ImageToImagePanel />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const inputClick = vi.spyOn(input, 'click').mockImplementation(() => {});
    const uploadArea = screen.getByRole('button', { name: /点击上传/ });

    fireEvent.keyDown(uploadArea, { key: 'Enter' });
    fireEvent.keyDown(uploadArea, { key: ' ' });
    expect(inputClick).toHaveBeenCalledTimes(2);
    fireEvent.click(uploadArea);
    expect(inputClick).toHaveBeenCalledTimes(3);
    fireEvent.keyDown(uploadArea, { key: 'Escape' });
    fireEvent.change(input, { target: { files: [] } });

    fireEvent.dragOver(uploadArea);
    fireEvent.dragLeave(uploadArea);
    fireEvent.drop(uploadArea, { dataTransfer: { files: [] } });
    fireEvent.drop(uploadArea, { dataTransfer: { files: [imageFile('drop.png')] } });

    await screen.findByAltText('source');
  });
});

describe('InpaintPanel', () => {
  beforeEach(() => setStudio());

  it('uploads a source image, records a selection, clears it, and generates inpaint', async () => {
    const user = userEvent.setup();
    const { container } = render(<InpaintPanel />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [imageFile()] } });
    const img = await screen.findByAltText('source');
    const canvas = img.parentElement as HTMLElement;
    fireEvent.mouseMove(canvas, { clientX: 1, clientY: 1 });
    fireEvent.mouseUp(canvas, { clientX: 1, clientY: 1 });
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 100, 50));
    vi.spyOn(img, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 100, 50));
    Object.defineProperty(canvas, 'clientLeft', { configurable: true, value: 0 });
    Object.defineProperty(canvas, 'clientTop', { configurable: true, value: 0 });

    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 5 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 25 });
    fireEvent.mouseUp(canvas, { clientX: 50, clientY: 25 });

    expect(screen.getByText('已选定修改区域，拖拽可重新选择')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('描述要修改的区域...'), 'replace sky');
    await user.click(screen.getByRole('button', { name: '生成' }));

    expect(mockStudio.value.generate).toHaveBeenCalledWith('replace sky', {
      mode: 'inpaint',
      sourceImage: expect.stringContaining('data:image/png'),
      maskRegion: {
        x: 0.1,
        y: 0.1,
        width: 0.4,
        height: 0.4,
      },
    });

    await user.click(screen.getByRole('button', { name: '清除选区' }));
    expect(screen.getByText('在图片上拖拽选择要修改的区域')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '移除图片' }));
    expect(screen.getByText('点击上传或拖拽图片到此处')).toBeInTheDocument();
  });

  it('ignores inpaint mouse events when image metrics are unavailable', async () => {
    const { container } = render(<InpaintPanel />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [imageFile()] } });
    const img = await screen.findByAltText('source');
    const canvas = img.parentElement as HTMLElement;

    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 0, 0));
    vi.spyOn(img, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 0, 0));
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    expect(screen.getByText('在图片上拖拽选择要修改的区域')).toBeInTheDocument();

    vi.mocked(canvas.getBoundingClientRect).mockReturnValue(rect(0, 0, 100, 100));
    vi.mocked(img.getBoundingClientRect).mockReturnValue(rect(0, 0, 100, 100));
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    vi.mocked(img.getBoundingClientRect).mockReturnValue(rect(0, 0, 0, 0));
    fireEvent.mouseUp(canvas, { clientX: 20, clientY: 20 });
    expect(screen.getByText('在图片上拖拽选择要修改的区域')).toBeInTheDocument();
  });

  it('handles inpaint dropzone keyboard and dropped files', async () => {
    const { container } = render(<InpaintPanel />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const inputClick = vi.spyOn(input, 'click').mockImplementation(() => {});
    const uploadArea = screen.getByRole('button', { name: /点击上传/ });

    fireEvent.keyDown(uploadArea, { key: 'Enter' });
    fireEvent.keyDown(uploadArea, { key: ' ' });
    expect(inputClick).toHaveBeenCalledTimes(2);
    fireEvent.click(uploadArea);
    expect(inputClick).toHaveBeenCalledTimes(3);
    fireEvent.keyDown(uploadArea, { key: 'Escape' });
    fireEvent.change(input, { target: { files: [] } });

    fireEvent.dragOver(uploadArea);
    fireEvent.dragLeave(uploadArea);
    fireEvent.drop(uploadArea, { dataTransfer: { files: [] } });
    fireEvent.drop(uploadArea, { dataTransfer: { files: [imageFile('inpaint-drop.png')] } });

    await screen.findByAltText('source');
  });
});

describe('BatchPanel', () => {
  beforeEach(() => setStudio());

  it('generates one batch task per prompt line', async () => {
    const user = userEvent.setup();
    render(<BatchPanel />);

    expect(screen.getByText('尚未输入提示词')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('每行一个提示词...'), 'first\n\nsecond');
    expect(screen.getByText('共 2 个提示词')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '批量生成 2 张' }));

    expect(mockStudio.value.generate).toHaveBeenCalledWith('first', { mode: 'batch', count: 1 });
    expect(mockStudio.value.generate).toHaveBeenCalledWith('second', { mode: 'batch', count: 1 });
  });

  it('uploads multiple images, removes images, and processes remaining images', async () => {
    const user = userEvent.setup();
    const { container } = render(<BatchPanel />);

    await user.click(screen.getByRole('button', { name: '多图片' }));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [imageFile('a.png'), imageFile('b.png'), textFile()] } });

    await waitFor(() => expect(container.querySelectorAll('img')).toHaveLength(2));
    await user.click(screen.getAllByRole('button', { name: '×' })[0]);
    expect(container.querySelectorAll('img')).toHaveLength(1);

    await user.type(screen.getByPlaceholderText('对所有图片应用相同的描述...'), 'same edit');
    await user.click(screen.getByRole('button', { name: '批量处理 1 张图片' }));

    expect(mockStudio.value.generate).toHaveBeenCalledTimes(1);
    expect(mockStudio.value.generate).toHaveBeenCalledWith('same edit', {
      mode: 'img2img',
      sourceImage: expect.stringContaining('data:image/png'),
    });
  });

  it('shows generating label and handles multi-image upload area click/drop', async () => {
    setStudio({ isGenerating: true });
    const { container } = render(<BatchPanel />);
    await userEvent.click(screen.getByRole('button', { name: '多图片' }));
    expect(screen.getByRole('button', { name: '生成中...' })).toBeDisabled();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const inputClick = vi.spyOn(input, 'click').mockImplementation(() => {});
    const uploadArea = screen.getByText('点击或拖拽添加图片');
    fireEvent.click(uploadArea);
    expect(inputClick).toHaveBeenCalled();

    fireEvent.dragOver(uploadArea);
    fireEvent.drop(uploadArea, { dataTransfer: { files: [] } });
    fireEvent.drop(uploadArea, { dataTransfer: { files: [imageFile('drop-batch.png')] } });
    await waitFor(() => expect(container.querySelectorAll('img')).toHaveLength(1));
  });
});

describe('ImageModule', () => {
  beforeEach(() => setStudio());

  it('switches mode tabs and renders the selected panel', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ImageModule />);

    expect(screen.getByPlaceholderText('描述你想生成的图片...')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '图生图' }));
    expect(mockStudio.value.setImageMode).toHaveBeenCalledWith('img2img');

    setStudio({ imageMode: 'img2img' });
    rerender(<ImageModule />);
    expect(screen.getByText('点击上传或拖拽图片到此处')).toBeInTheDocument();

    setStudio({ imageMode: 'inpaint' });
    rerender(<ImageModule />);
    expect(screen.getByPlaceholderText('描述要修改的区域...')).toBeInTheDocument();

    setStudio({ imageMode: 'batch' });
    rerender(<ImageModule />);
    expect(screen.getByText('多提示词')).toBeInTheDocument();
  });
});
