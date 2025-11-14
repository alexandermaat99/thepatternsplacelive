/**
 * Difficulty levels for sewing patterns/products
 */
export const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
] as const;

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number]['value'];

/**
 * Get difficulty label from value
 */
export function getDifficultyLabel(value: string | null | undefined): string {
  const difficulty = DIFFICULTY_LEVELS.find(d => d.value === value);
  return difficulty?.label || 'Not specified';
}

/**
 * Get difficulty color/variant for badges
 */
export function getDifficultyVariant(value: string | null | undefined): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (value) {
    case 'beginner':
      return 'default';
    case 'intermediate':
      return 'secondary';
    case 'advanced':
      return 'outline';
    case 'expert':
      return 'destructive';
    default:
      return 'secondary';
  }
}

