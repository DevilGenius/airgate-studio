import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CustomSelect } from './CustomSelect';
import { SizeSelector } from './SizeSelector';
import type { SizeOption } from './modelConfig';

const sizes: SizeOption[] = [
  { value: 'auto', label: 'Auto', tier: '1K', price: 0.1 },
  { value: '1024x1024', label: '1024x1024', tier: '1K', price: 0.1, aspect: '1:1' },
  { value: '2048x1152', label: '2048x1152', tier: '2K', price: 0.2, aspect: '16:9' },
  { value: '1152x2048', label: '1152x2048', tier: '2K', price: 0.2, aspect: '9:16' },
];

describe('CustomSelect', () => {
  it('opens, selects an option, and closes on outside click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <div>
        <CustomSelect
          value="a"
          options={[
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ]}
          onChange={onChange}
        />
        <button type="button">outside</button>
      </div>,
    );

    await user.click(screen.getByRole('button', { name: /Alpha/ }));
    await user.click(screen.getByRole('button', { name: 'Beta' }));

    expect(onChange).toHaveBeenCalledWith('b');
    expect(screen.queryByRole('button', { name: 'Beta' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Alpha/ }));
    expect(screen.getByRole('button', { name: 'Beta' })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('button', { name: 'Beta' })).not.toBeInTheDocument();
  });

  it('uses placeholder and raw value fallbacks', () => {
    const { rerender } = render(
      <CustomSelect value="" options={[]} onChange={vi.fn()} placeholder="Pick one" />,
    );

    expect(screen.getByRole('button', { name: /Pick one/ })).toBeInTheDocument();

    rerender(<CustomSelect value="raw" options={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /raw/ })).toBeInTheDocument();
  });
});

describe('SizeSelector', () => {
  it('groups sizes by tier and selects a size', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SizeSelector value="auto" sizes={sizes} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Auto/ }));
    const dropdown = document.querySelector('.studio-sidebar');

    expect(dropdown).toBeInTheDocument();
    expect(within(dropdown as HTMLElement).getByText('1K')).toBeInTheDocument();
    expect(within(dropdown as HTMLElement).getByText('2K')).toBeInTheDocument();

    await user.click(within(dropdown as HTMLElement).getByRole('button', { name: /2048x1152/ }));
    expect(onChange).toHaveBeenCalledWith('2048x1152');
    expect(document.querySelector('.studio-sidebar')).not.toBeInTheDocument();
  });

  it('supports compact upward positioning, unknown values, and outside close', async () => {
    const user = userEvent.setup();
    render(<SizeSelector value="custom" sizes={sizes} onChange={vi.fn()} upward compact />);

    await user.click(screen.getByRole('button', { name: /custom/ }));
    const dropdown = document.querySelector('.studio-sidebar') as HTMLElement;

    expect(dropdown).toBeInTheDocument();
    expect(dropdown.style.bottom).toContain('100vh');

    fireEvent.mouseDown(document.body);
    expect(document.querySelector('.studio-sidebar')).not.toBeInTheDocument();
  });

  it('renders portrait aspect icons and can select auto from another size', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SizeSelector value="1152x2048" sizes={sizes} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /1152x2048/ }));
    const dropdown = document.querySelector('.studio-sidebar') as HTMLElement;
    await user.click(within(dropdown).getByRole('button', { name: 'Auto' }));

    expect(onChange).toHaveBeenCalledWith('auto');
  });
});
