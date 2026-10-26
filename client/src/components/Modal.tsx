import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  maxWidth = 'max-w-lg',
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ground/85 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`animate-fade-up w-full ${maxWidth} overflow-hidden rounded-t-[5px] border border-line bg-panel sm:rounded-[5px]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            {eyebrow && <p className="label text-accent">{eyebrow}</p>}
            <h3 className="mt-1.5 text-[19px] font-medium tracking-[-0.03em] text-ink">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="focus-ring -mr-1 -mt-1 rounded-[4px] p-1.5 text-[#8f96a3] transition-colors duration-150 hover:bg-white/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
