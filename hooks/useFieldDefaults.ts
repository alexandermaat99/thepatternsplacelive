import { useState, useCallback, useMemo } from 'react';
import {
  FieldState,
  createFieldState,
  isFieldChanged,
  setFieldValue,
  getFieldValue,
  applyDefaultIfNeeded,
  AccessFieldManager,
} from '@/lib/field-defaults';

/**
 * React hook for managing field defaults and change tracking
 * Provides a React-friendly interface for the field defaults utility
 */
export function useFieldDefaults<T>(initialValue: T) {
  const [field, setField] = useState<FieldState<T>>(() => 
    createFieldState(initialValue)
  );

  const updateValue = useCallback((newValue: T) => {
    setField(prev => setFieldValue(prev, newValue));
  }, []);

  const applyDefault = useCallback((defaultValue: T) => {
    setField(prev => {
      // Type guard for AccessOption-like objects
      if (typeof (prev.value as any)?.isDefaultValue === 'function') {
        return applyDefaultIfNeeded(prev as FieldState<any>, defaultValue);
      }
      return prev;
    });
  }, []);

  const changed = useMemo(() => isFieldChanged(field), [field]);
  const value = useMemo(() => getFieldValue(field), [field]);

  return {
    value,
    changed,
    updateValue,
    applyDefault,
    field,
  };
}

/**
 * Hook for managing multiple access fields
 * Similar to the C++ pattern for withdrawal, deposit, inquiry, purchase, third-party access
 */
export interface AccessFieldConfig<T> {
  name: string;
  initialValue: T;
  defaultValue: T;
}

export function useAccessFields<T extends { isDefaultValue(): boolean }>(
  configs: AccessFieldConfig<T>[]
) {
  const manager = useMemo(() => new AccessFieldManager(), []);
  
  // Initialize fields
  configs.forEach(({ name, initialValue, defaultValue }) => {
    manager.registerField(name, initialValue, defaultValue);
  });

  const getField = useCallback((name: string) => {
    return manager.getField(name);
  }, [manager]);

  const setField = useCallback((name: string, value: T) => {
    manager.setField(name, value);
  }, [manager]);

  const applyDefaults = useCallback(() => {
    manager.applyDefaults();
  }, [manager]);

  const processField = useCallback((name: string, defaultValue: T) => {
    manager.processAccessField(name, defaultValue);
  }, [manager]);

  return {
    getField,
    setField,
    applyDefaults,
    processField,
  };
}



