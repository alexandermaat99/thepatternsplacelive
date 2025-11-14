/**
 * Utility for managing field defaults and change tracking
 * Similar to the C++ FMField pattern for handling default values
 */

export interface FieldState<T> {
  value: T;
  changed: boolean;
  originalValue?: T;
}

export interface AccessOption {
  isDefaultValue(): boolean;
}

export interface DepositAccessOption {
  isDefaultValue(): boolean;
}

/**
 * Creates a field state tracker
 */
export function createFieldState<T>(initialValue: T, originalValue?: T): FieldState<T> {
  return {
    value: initialValue,
    changed: false,
    originalValue: originalValue ?? initialValue,
  };
}

/**
 * Checks if a field has been changed from its original value
 */
export function isFieldChanged<T>(field: FieldState<T>): boolean {
  return field.changed || JSON.stringify(field.value) !== JSON.stringify(field.originalValue);
}

/**
 * Sets a field value and marks it as changed
 */
export function setFieldValue<T>(field: FieldState<T>, newValue: T): FieldState<T> {
  return {
    ...field,
    value: newValue,
    changed: true,
  };
}

/**
 * Gets the current value of a field
 */
export function getFieldValue<T>(field: FieldState<T>): T {
  return field.value;
}

/**
 * Applies default value logic similar to the C++ pattern:
 * If field hasn't been changed and current value is default, set to provided default
 */
export function applyDefaultIfNeeded<T extends AccessOption | DepositAccessOption>(
  field: FieldState<T>,
  defaultValue: T
): FieldState<T> {
  if (!isFieldChanged(field)) {
    const currentValue = getFieldValue(field);
    if (currentValue.isDefaultValue()) {
      return setFieldValue(field, defaultValue);
    }
  }
  return field;
}

/**
 * Helper function to process multiple access fields with default values
 * Mirrors the C++ pattern for withdrawal, deposit, inquiry, purchase, and third-party access
 */
export interface AccessFieldConfig<T extends AccessOption | DepositAccessOption> {
  field: FieldState<T>;
  defaultValue: T;
}

export function processAccessFields<T extends AccessOption | DepositAccessOption>(
  configs: AccessFieldConfig<T>[]
): FieldState<T>[] {
  return configs.map(({ field, defaultValue }) => 
    applyDefaultIfNeeded(field, defaultValue)
  );
}

/**
 * Type-safe access field manager
 */
export class AccessFieldManager {
  private fields: Map<string, FieldState<any>> = new Map();

  /**
   * Register a field with its default value
   */
  registerField<T extends AccessOption | DepositAccessOption>(
    name: string,
    initialValue: T,
    defaultValue: T
  ): void {
    this.fields.set(name, createFieldState(initialValue));
    // Store default separately
    (this.fields.get(name) as any).defaultValue = defaultValue;
  }

  /**
   * Get a field by name
   */
  getField<T extends AccessOption | DepositAccessOption>(name: string): FieldState<T> | undefined {
    return this.fields.get(name) as FieldState<T> | undefined;
  }

  /**
   * Set a field value
   */
  setField<T extends AccessOption | DepositAccessOption>(
    name: string,
    value: T
  ): void {
    const field = this.fields.get(name);
    if (field) {
      this.fields.set(name, setFieldValue(field, value));
    }
  }

  /**
   * Apply defaults to all fields that haven't been changed
   */
  applyDefaults(): void {
    this.fields.forEach((field, name) => {
      const defaultValue = (field as any).defaultValue;
      if (defaultValue && !isFieldChanged(field)) {
        const currentValue = getFieldValue(field);
        if (currentValue && typeof currentValue.isDefaultValue === 'function' && currentValue.isDefaultValue()) {
          this.fields.set(name, setFieldValue(field, defaultValue));
        }
      }
    });
  }

  /**
   * Process access fields similar to the C++ code pattern
   */
  processAccessField<T extends AccessOption | DepositAccessOption>(
    name: string,
    defaultValue: T
  ): void {
    const field = this.fields.get(name);
    if (field) {
      const updatedField = applyDefaultIfNeeded(field, defaultValue);
      this.fields.set(name, updatedField);
    }
  }
}

