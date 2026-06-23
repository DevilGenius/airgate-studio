import { useEffect, useRef, useState } from 'react';
import type { SizeOption } from './modelConfig';

interface SizeSelectorProps {
  value: string;
  sizes: SizeOption[];
  onChange: (value: string) => void;
  compact?: boolean;
  triggerClassName?: string;
  dropdownClassName?: string;
}

function AspectIcon({ aspect, size = 16 }: { aspect?: string; size?: number }) {
  if (!aspect) return null;
  const [aw, ah] = aspect.split(':').map(Number);
  const innerSize = size - 4;
  const ratio = aw / ah;
  let w: number, h: number;
  if (ratio >= 1) {
    w = innerSize;
    h = Math.round(innerSize / ratio);
  } else {
    h = innerSize;
    w = Math.round(innerSize * ratio);
  }
  w = Math.max(3, w);
  h = Math.max(3, h);
  const x = Math.round((size - w) / 2);
  const y = Math.round((size - h) / 2);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect x={x} y={y} width={w} height={h} rx={1.5} fill="currentColor" />
    </svg>
  );
}

export function SizeSelector({ value, sizes, onChange, compact, triggerClassName, dropdownClassName }: SizeSelectorProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (dropdownRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const selected = sizes.find(sz => sz.value === value);
  const autoOption = sizes.find(sz => sz.value === 'auto');

  const tierOrder: string[] = [];
  const tierGroups = new Map<string, SizeOption[]>();
  for (const sz of sizes) {
    if (sz.value === 'auto') continue;
    if (!tierGroups.has(sz.tier)) {
      tierOrder.push(sz.tier);
      tierGroups.set(sz.tier, []);
    }
    tierGroups.get(sz.tier)!.push(sz);
  }

  const triggerLabel = selected
    ? selected.value === 'auto'
      ? 'Auto'
      : `${selected.label}${selected.aspect ? ` · ${selected.aspect}` : ''}`
    : value;

  const select = (v: string) => { onChange(v); setOpen(false); };

  return (
    <>
      <button ref={triggerRef} type="button" className={triggerClassName} onClick={() => setOpen(v => !v)}>
        {selected?.aspect && <AspectIcon aspect={selected.aspect} size={compact ? 14 : 16} />}
        <span>{triggerLabel}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div ref={dropdownRef} className={dropdownClassName}>
          {autoOption && (
            <button type="button" onClick={() => select('auto')}>
              <span>Auto</span>
            </button>
          )}

          {tierOrder.map((tier, i) => {
            const options = tierGroups.get(tier)!;
            return (
              <div key={tier}>
                {(i > 0 || autoOption) && <hr />}
                <div>
                  <span>{tier}</span>
                </div>
                {options.map(opt => (
                  <button key={opt.value} type="button" onClick={() => select(opt.value)}>
                    {opt.aspect && <AspectIcon aspect={opt.aspect} />}
                    <span>{opt.label}</span>
                    {opt.aspect && <span>{opt.aspect}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
