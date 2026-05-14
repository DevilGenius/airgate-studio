import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { cssVar } from '@doudou-start/airgate-theme';

interface Option { value: string; label: string }
interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
}

const triggerStyle: CSSProperties = {
  width: '100%',
  padding: '9px 14px',
  border: `1px solid ${cssVar('borderSubtle')}`,
  borderRadius: 10,
  background: cssVar('bgDeep'),
  color: cssVar('text'),
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  font: 'inherit',
  fontSize: 13,
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const triggerOpenStyle: CSSProperties = {
  borderColor: `color-mix(in oklab, ${cssVar('primary')} 30%, transparent)`,
  boxShadow: `0 0 0 3px ${cssVar('primaryGlow')}`,
};

const dropdownStyle: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  right: 0,
  zIndex: 50,
  background: cssVar('bgElevated'),
  border: `1px solid ${cssVar('glassBorder')}`,
  borderRadius: 12,
  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.2)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  maxHeight: 260,
  overflowY: 'auto',
  padding: 5,
  animation: 'studioFadeIn 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
};

const optionStyle: CSSProperties = {
  width: '100%',
  padding: '9px 14px',
  border: 'none',
  background: 'transparent',
  color: cssVar('text'),
  textAlign: 'left',
  cursor: 'pointer',
  borderRadius: 8,
  fontSize: 13,
  font: 'inherit',
  transition: 'background 0.12s',
};

const activeOptionStyle: CSSProperties = {
  background: cssVar('primarySubtle'),
  color: cssVar('text'),
  fontWeight: 600,
};

const hoverCSS = `
  .studio-select-option:hover {
    background: ${cssVar('bgHover')};
  }
  .studio-select-trigger:hover {
    border-color: ${cssVar('border')};
  }
`;

export function CustomSelect({ value, options, onChange, placeholder }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <style>{hoverCSS}</style>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ ...triggerStyle, ...(open ? triggerOpenStyle : {}) }}
        className="studio-select-trigger"
      >
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label || placeholder || value}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: 0.4, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={dropdownStyle}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              style={{ ...optionStyle, ...(opt.value === value ? activeOptionStyle : {}) }}
              className={opt.value === value ? '' : 'studio-select-option'}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
