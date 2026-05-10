import { lightTheme, darkTheme } from '../constants/theme';

// ─── Avatar helpers ─────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#E57373', '#F06292', '#BA68C8', '#9575CD', '#7986CB',
  '#4FC3F7', '#4DB6AC', '#81C784', '#FFB74D', '#FF8A65',
];

export function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ─── Activity helpers ───────────────────────────────────────────────────────

export function getActivityIcon(action: string): string {
  if (action.includes('Expense')) return 'cash-multiple';
  if (action.includes('Bill') && action.includes('Add')) return 'receipt-text-plus';
  if (action.includes('Bill') && action.includes('Handle')) return 'check-circle-outline';
  if (action.includes('Member')) return 'account-plus';
  if (action.includes('Group')) return 'account-group';
  return 'clock-outline';
}

export function getActivityColor(action: string, isDark = false): string {
  if (action.includes('Expense')) return isDark ? darkTheme.success : lightTheme.success;
  if (action.includes('Bill')) return isDark ? darkTheme.warning : lightTheme.warning;
  if (action.includes('Group') || action.includes('Member')) return isDark ? darkTheme.info : lightTheme.info;
  return isDark ? darkTheme.textSecondary : lightTheme.textSecondary;
}

// ─── Time formatting ────────────────────────────────────────────────────────

export function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Pie chart helpers (FriendsScreen) ──────────────────────────────────────

export function pieColors(id: string): string[] {
  const c1 = avatarColor(id);
  const c2 = avatarColor(id + '2');
  const c3 = avatarColor(id + '3');
  return [c1, c2, c3];
}

export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
) {
  const angleRad = (Math.PI / 180) * (angleDeg - 90);
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

export function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}
