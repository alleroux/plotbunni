import { Save } from 'lucide-react';
import { useData } from '@/context/DataContext';

export function SaveIndicator() {
  const { isSaving } = useData();

  return (
    <div
      className={`
        fixed top-4 right-4 z-50
        flex items-center gap-2 px-3 py-2 rounded-md
        bg-background border border-border shadow-md
        text-sm text-muted-foreground
        transition-all duration-300 ease-in-out pointer-events-none
        ${isSaving ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
      aria-live="polite"
      aria-label="Saving"
    >
      <Save className="h-4 w-4 animate-pulse" />
      <span>Saving…</span>
    </div>
  );
}
