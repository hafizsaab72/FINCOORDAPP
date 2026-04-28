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

const HASH_COLORS = ['#E8673A', '#4A90D9', '#D96B9A', '#6B8E6B', '#7B68EE', '#20B2AA'];

export function groupColor(id: string, type?: string): string {
  if (type && type !== 'other') {
    const config = GROUP_TYPES.find(t => t.key === type);
    if (config) return config.color;
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return HASH_COLORS[Math.abs(hash) % HASH_COLORS.length];
}
