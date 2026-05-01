import { useEffect, useRef, useState } from 'react';

export interface DraftMetadata {
  savedAt: string;
  formId: string;
}

export interface Draft<T> {
  data: T;
  metadata: DraftMetadata;
}

const AUTOSAVE_DELAY = 1500; // 1.5 seconds for faster feedback

export class DraftStorage {
  private static prefix = 'draft_';

  static save<T>(formId: string, data: T): void {
    const draft: Draft<T> = {
      data,
      metadata: {
        savedAt: new Date().toISOString(),
        formId,
      },
    };
    localStorage.setItem(this.prefix + formId, JSON.stringify(draft));
  }

  static load<T>(formId: string): Draft<T> | null {
    const stored = localStorage.getItem(this.prefix + formId);
    if (!stored) return null;
    
    try {
      return JSON.parse(stored) as Draft<T>;
    } catch {
      return null;
    }
  }

  static clear(formId: string): void {
    localStorage.removeItem(this.prefix + formId);
  }

  static getAll(): { formId: string; draft: Draft<any> }[] {
    const drafts: { formId: string; draft: Draft<any> }[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        const formId = key.slice(this.prefix.length);
        const draft = this.load(formId);
        if (draft) {
          drafts.push({ formId, draft });
        }
      }
    }
    
    return drafts;
  }
}

export function useAutosave<T extends Record<string, any>>(
  formId: string,
  formData: T,
  enabled: boolean = true
) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousDataRef = useRef<string>('');

  useEffect(() => {
    if (!enabled) return;

    const currentData = JSON.stringify(formData);
    
    // Don't save if data hasn't changed
    if (currentData === previousDataRef.current) return;
    
    // Don't save if all values are empty
    const hasData = Object.values(formData).some(value => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined;
    });
    
    if (!hasData) return;

    setIsSaving(true);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      DraftStorage.save(formId, formData);
      previousDataRef.current = currentData;
      setLastSaved(new Date());
      setIsSaving(false);
    }, AUTOSAVE_DELAY);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formId, formData, enabled]);

  const clearDraft = () => {
    DraftStorage.clear(formId);
    setLastSaved(null);
    previousDataRef.current = '';
  };

  const loadDraft = () => {
    return DraftStorage.load<T>(formId);
  };

  return {
    lastSaved,
    isSaving,
    clearDraft,
    loadDraft,
  };
}

export function useDebouncedSave<T>(
  value: T,
  save: (value: T) => void,
  delay: number = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousRef = useRef<string>('');

  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (serialized === previousRef.current) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      save(value);
      previousRef.current = serialized;
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, save, delay]);
}

export function formatSaveTime(date: Date | null): string {
  if (!date) return '';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  }
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
