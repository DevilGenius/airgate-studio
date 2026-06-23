import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SizeSelector } from './SizeSelector';
import type { SizeOption } from './modelConfig';

const sizes: SizeOption[] = [
  { value: 'auto', label: 'Auto', tier: '1K', price: 0.1 },
  { value: '1024x1024', label: '1024x1024', tier: '1K', price: 0.1, aspect: '1:1' },
  { value: '2048x1152', label: '2048x1152', tier: '2K', price: 0.2, aspect: '16:9' },
  { value: '1152x2048', label: '1152x2048', tier: '2K', price: 0.2, aspect: '9:16' },
];

function dropdown(container: HTMLElement): HTMLElement {
  const el = container.querySelector('button + div');
  if (!(el instanceof HTMLElement)) throw new Error('dropdown not found');
  return el;
}

describe('SizeSelector', () => {
  it('groups sizes by tier and selects a size', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<SizeSelector value="auto" sizes={sizes} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Auto/ }));
    const menu = dropdown(container);

    expect(within(menu).getByText('1K')).toBeInTheDocument();
    expect(within(menu).getByText('2K')).toBeInTheDocument();

    await user.click(within(menu).getByRole('button', { name: /2048x1152/ }));
    expect(onChange).toHaveBeenCalledWith('2048x1152');
    expect(container.querySelector('button + div')).not.toBeInTheDocument();
  });

  it('supports compact unknown values and outside close', async () => {
    const user = userEvent.setup();
    const { container } = render(<SizeSelector value="custom" sizes={sizes} onChange={vi.fn()} compact />);

    await user.click(screen.getByRole('button', { name: /custom/ }));
    expect(dropdown(container)).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(container.querySelector('button + div')).not.toBeInTheDocument();
  });

  it('renders portrait aspect icons and can select auto from another size', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<SizeSelector value="1152x2048" sizes={sizes} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /1152x2048/ }));
    await user.click(within(dropdown(container)).getByRole('button', { name: 'Auto' }));

    expect(onChange).toHaveBeenCalledWith('auto');
  });
});
