import { twMerge } from 'tailwind-merge';

import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTierLabel(tier: string): string {
  const normalized = tier.toLowerCase().replace('_', ' ').trim();
  switch (normalized) {
    case 'lockbox': return 'Lockbox';
    case 'safe': return 'Safe';
    case 'vault': return 'Vault';
    case 'deep vault': return 'Deep Vault';
    default: return tier;
  }
}
