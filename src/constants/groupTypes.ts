export interface GroupTypeConfig {
  key: 'trip' | 'home' | 'couple' | 'other';
  label: string;
  icon: string;
  color: string;
}

export const GROUP_TYPES: GroupTypeConfig[] = [
  { key: 'trip',   label: 'Trip',   icon: 'airplane',             color: '#E8673A' },
  { key: 'home',   label: 'Home',   icon: 'home-outline',         color: '#4A90D9' },
  { key: 'couple', label: 'Couple', icon: 'heart-outline',        color: '#D96B9A' },
  { key: 'other',  label: 'Other',  icon: 'format-list-bulleted', color: '#6B8E6B' },
];

export function getGroupTypeConfig(type?: string): GroupTypeConfig {
  return GROUP_TYPES.find(t => t.key === type) ?? GROUP_TYPES[3];
}

// ── Group Icons ────────────────────────────────────────────────────────────
// A preset palette of icons users can choose for their group avatar.
// Each has a consistent color so the group has visual identity.

export interface GroupIconConfig {
  key: string;
  icon: string;
  color: string;
}

export const GROUP_ICONS: GroupIconConfig[] = [
  { key: 'airplane',       icon: 'airplane',       color: '#E8673A' },
  { key: 'home',           icon: 'home-outline',   color: '#4A90D9' },
  { key: 'heart',          icon: 'heart-outline',  color: '#D96B9A' },
  { key: 'food',           icon: 'food',           color: '#F5A623' },
  { key: 'car',            icon: 'car',            color: '#7B68EE' },
  { key: 'movie',          icon: 'movie-open-outline', color: '#9013FE' },
  { key: 'cart',           icon: 'cart-outline',   color: '#06B6D4' },
  { key: 'beer',           icon: 'glass-mug-variant', color: '#F8B500' },
  { key: 'guitar',         icon: 'guitar-acoustic', color: '#C75B39' },
  { key: 'run',            icon: 'run',            color: '#20B2AA' },
  { key: 'dog',            icon: 'dog',            color: '#8B4513' },
  { key: 'cat',            icon: 'cat',            color: '#FF7F50' },
  { key: 'tree',           icon: 'pine-tree',      color: '#228B22' },
  { key: 'office',         icon: 'office-building', color: '#5F9EA0' },
  { key: 'map',            icon: 'map-marker',     color: '#DC143C' },
  { key: 'wallet',         icon: 'wallet-outline', color: '#3B82F6' },
];

export function getGroupIconConfig(iconKey?: string): GroupIconConfig {
  return GROUP_ICONS.find(i => i.key === iconKey) ?? GROUP_ICONS[0];
}

const HASH_COLORS = ['#E8673A', '#4A90D9', '#D96B9A', '#6B8E6B', '#7B68EE', '#20B2AA'];

export function groupColor(id?: string | null, type?: string): string {
  if (type && type !== 'other') {
    const config = GROUP_TYPES.find(t => t.key === type);
    if (config) return config.color;
  }
  const safeId = id ?? '';
  let hash = 0;
  for (let i = 0; i < safeId.length; i++) {
    hash = ((hash << 5) - hash + safeId.charCodeAt(i)) | 0;
  }
  return HASH_COLORS[Math.abs(hash) % HASH_COLORS.length];
}
