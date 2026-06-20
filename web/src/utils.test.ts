import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadImage } from './utils';

describe('downloadImage', () => {
  const fetchMock = vi.fn();
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  it.each([
    ['https://cdn.test/image.png', 'hero', 'hero.png'],
    ['https://cdn.test/image.webp?x=1', '', 'image.webp'],
    ['https://cdn.test/image.jpeg', 'photo', 'photo.jpg'],
  ])('downloads %s as %s', async (url, alt, filename) => {
    fetchMock.mockResolvedValueOnce({
      blob: vi.fn().mockResolvedValue(new Blob(['img'], { type: 'image/png' })),
    });

    await downloadImage(url, alt);

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(document.querySelector(`a[download="${filename}"]`)).not.toBeInTheDocument();
  });

  it('opens the original URL when blob download fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));

    await downloadImage('/asset.jpg', 'asset');

    expect(window.open).toHaveBeenCalledWith('/asset.jpg', '_blank');
  });
});
