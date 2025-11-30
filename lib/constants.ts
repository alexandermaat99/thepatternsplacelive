/**
 * Difficulty levels for sewing patterns/products
 */
export const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner', color: '#FFBABA', textColor: 'white' },
  { value: 'intermediate', label: 'Intermediate', color: '#FF8C8C', textColor: 'white' },
  { value: 'advanced', label: 'Advanced', color: '#FF5757', textColor: 'white' },
  { value: 'expert', label: 'Expert', color: '#FF1212', textColor: 'white' },
] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number]['value'];

/**
 * Get difficulty label from value
 */
export function getDifficultyLabel(value: string | null | undefined): string {
  const difficulty = DIFFICULTY_LEVELS.find(d => d.value === value);
  return difficulty?.label || 'Not specified';
}

/**
 * Get difficulty color for badges
 */
export function getDifficultyColor(value: string | null | undefined): { bg: string; text: string } {
  const difficulty = DIFFICULTY_LEVELS.find(d => d.value === value);
  return {
    bg: difficulty?.color || '#E5E7EB',
    text: difficulty?.textColor || '#374151',
  };
}

/**
 * Get difficulty color/variant for badges (legacy)
 */
export function getDifficultyVariant(
  value: string | null | undefined
): 'default' | 'secondary' | 'destructive' | 'outline' {
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
