import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names and safely merges Tailwind CSS classes
 * This prevents conflicts when multiple variants of the same class are used together
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
} 