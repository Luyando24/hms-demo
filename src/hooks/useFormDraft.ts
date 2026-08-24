'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface FormDraftMetadata<T> {
  data: T;
  timestamp: string;
  key: string;
}

export interface UseFormDraftOptions<T> {
  debounceMs?: number;
  autoRestore?: boolean;
  onRestore?: (savedData: T) => void;
  isEnabled?: boolean;
}

export interface UseFormDraftResult<T> {
  hasDraft: boolean;
  draftTimestamp: Date | null;
  draftData: T | null;
  isSaving: boolean;
  lastSavedAt: Date | null;
  restoreDraft: () => void;
  clearDraft: () => void;
  saveNow: () => void;
}

function hasContent(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'boolean') return true;
  if (Array.isArray(val)) return val.length > 0 && val.some(hasContent);
  if (typeof val === 'object') {
    return Object.values(val).some(hasContent);
  }
  return false;
}

export function useFormDraft<T extends Record<string, any>>(
  draftKey: string,
  formData: T,
  setFormData: (data: T | ((prev: T) => T)) => void,
  options: UseFormDraftOptions<T> = {},
): UseFormDraftResult<T> {
  const {
    debounceMs = 400,
    autoRestore = false,
    onRestore,
    isEnabled = true,
  } = options;

  const storageKey = `hms_draft_${draftKey}`;
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<Date | null>(null);
  const [draftData, setDraftData] = useState<T | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const formDataRef = useRef<T>(formData);
  formDataRef.current = formData;

  // Check for existing draft on initial mount
  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: FormDraftMetadata<T> = JSON.parse(raw);
        if (parsed && parsed.data && hasContent(parsed.data)) {
          setHasDraft(true);
          setDraftTimestamp(new Date(parsed.timestamp));
          setDraftData(parsed.data);

          if (autoRestore) {
            setFormData(parsed.data);
            onRestore?.(parsed.data);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load form draft for key:', storageKey, e);
    }
  }, [storageKey, isEnabled, autoRestore]);

  // Immediate save helper
  const saveNow = useCallback(() => {
    if (!isEnabled || typeof window === 'undefined') return;
    const current = formDataRef.current;
    if (!hasContent(current)) return;

    try {
      setIsSaving(true);
      const payload: FormDraftMetadata<T> = {
        data: current,
        timestamp: new Date().toISOString(),
        key: draftKey,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setLastSavedAt(new Date());
      setHasDraft(true);
    } catch (e) {
      console.warn('Failed to save form draft for key:', storageKey, e);
    } finally {
      setIsSaving(false);
    }
  }, [draftKey, isEnabled, storageKey]);

  // Auto-save debounced on form change
  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined') return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (hasContent(formData)) {
      timerRef.current = setTimeout(() => {
        saveNow();
      }, debounceMs);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [formData, debounceMs, isEnabled, saveNow]);

  // Save on offline or beforeunload events to guarantee zero data loss
  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasContent(formDataRef.current)) {
        saveNow();
        // Warn if offline or form is dirty
        if (!navigator.onLine) {
          e.preventDefault();
          e.returnValue = 'You are currently offline. Your entered form data has been saved locally.';
          return e.returnValue;
        }
      }
    };

    const handleOffline = () => {
      saveNow();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isEnabled, saveNow]);

  const restoreDraft = useCallback(() => {
    if (draftData) {
      setFormData(draftData);
      onRestore?.(draftData);
      setHasDraft(false);
    }
  }, [draftData, onRestore, setFormData]);

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setDraftData(null);
      setDraftTimestamp(null);
      setLastSavedAt(null);
    } catch (e) {
      console.warn('Failed to clear form draft:', storageKey, e);
    }
  }, [storageKey]);

  return {
    hasDraft,
    draftTimestamp,
    draftData,
    isSaving,
    lastSavedAt,
    restoreDraft,
    clearDraft,
    saveNow,
  };
}
