import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MODEL_REGISTRY, type ModelConfig } from './modelConfig';

interface ModelSelectorProps {
  value: string;
  models?: ModelConfig[];
  onChange: (id: string) => void;
  leading?: ReactNode;
  triggerClassName?: string;
  dropdownClassName?: string;
}

// 模型选择器：与 SizeSelector 同一套交互（点开浮层、点外部关闭），
// 只是选项来自 MODEL_REGISTRY —— 新增模型只需在 modelConfig.ts 里加一条。
export function ModelSelector({
  value,
  models = MODEL_REGISTRY,
  onChange,
  leading,
  triggerClassName,
  dropdownClassName,
}: ModelSelectorProps) {
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

  const selected = models.find(m => m.id === value) ?? models[0];
  if (!selected) return null;

  const select = (id: string) => { onChange(id); setOpen(false); };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={selected.name}
        onClick={() => setOpen(v => !v)}
      >
        {leading}
        <span>{selected.name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div ref={dropdownRef} className={dropdownClassName}>
          {models.map(model => (
            <button key={model.id} type="button" onClick={() => select(model.id)}>
              <span>{model.name}</span>
              {model.id === selected.id ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
