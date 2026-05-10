export type SplitMethod = 'equal' | 'percentage' | 'custom' | 'shares' | 'adjustment';
export type SplitType = 'equal' | 'unequal' | 'percentage' | 'shares' | 'itemized';

// ── New multi-payer schema types ──────────────────────────────

export interface Payment {
  userId: string;
  amount: number; // major units in UI, converted to minor for API
  currency?: string; // original currency (defaults to expense baseCurrency)
}

export interface SplitEntry {
  userId: string;
  owedAmount: number; // major units in UI, converted to minor for API
  shareType?: SplitMethod;
  shareValue?: number;
  isExcluded?: boolean;
}

/** New multi-payer expense shape (matches backend schema) */
export interface ExpenseV2 {
  id: string;
  groupId: string;
  description: string;
  totalAmount: number; // in minor units from API; use fromMinorUnits() for display
  baseCurrency: string;
  payments: Payment[];
  splits: SplitEntry[];
  splitType: SplitType;
  expenseDate: string;
  notes?: string;
  category?: string;
  receiptUrl?: string;
  isSettlement?: boolean;
  createdBy?: string;
}

// ── Legacy single-payer types (keep for backward compat) ──────

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface GroupMember {
  _id: string;
  name: string;
  email: string;
  profilePic?: string;
}

export interface Group {
  id: string;
  name: string;
  members: string[];
  createdBy?: string;
  createdAt: string;
  type?: 'trip' | 'home' | 'couple' | 'other';
  image?: string;
  startDate?: string;
  endDate?: string;
  simplifyDebts?: boolean;
}

export interface MemberBalance {
  memberId: string;
  name: string;
  email: string;
  profilePic?: string;
  isMe: boolean;
  net: number;
}

export interface SimplifiedTransaction {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export interface GroupBalancesData {
  totalOwedToYou: number;
  totalYouOwe: number;
  memberBalances: MemberBalance[];
  simplifiedTransactions?: SimplifiedTransaction[];
}

/** Legacy single-payer expense (keep during transition) */
export interface Expense {
  id: string;
  groupId: string;
  payerId: string;
  amount: number;
  currency: string;
  notes: string;
  date: string;
  splitMethod: SplitMethod;
  splitDetails: Record<string, number>;
  participantNames?: Record<string, string>; // id → display name, for local direct expenses
}

// ── Dashboard types ─────────────────────────────────────────

export interface DashboardSummary {
  totalOwedToMe: number; // minor units
  totalIOwe: number;     // minor units
  netBalance: number;    // minor units (positive = owed to me)
  currency: string;
}

export interface DashboardByGroup {
  groupId: string;
  groupName: string;
  groupType?: string;
  totalOwedToMe: number;
  totalIOwe: number;
  netBalance: number;
}

export interface DashboardByPerson {
  userId: string;
  name: string;
  email?: string;
  profilePic?: string;
  totalOwedToMe: number;
  totalIOwe: number;
  netBalance: number;
  groupsInCommon: string[];
}

export interface DashboardBalances {
  summary: DashboardSummary;
  byGroup: DashboardByGroup[];
  byPerson: DashboardByPerson[];
  simplifiedTransactions: SimplifiedTransaction[];
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  currency?: string;
  dueDate: string;
  isRecurring: boolean;
  status: 'pending' | 'handled' | 'overdue';
  category: string;
}

export interface ActivityEntry {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  amount?: number;
  currency?: string;
}

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  password: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;  // ISO 3166-1 alpha-2, e.g. "GB"
  bio?: string;
  profilePic?: string; // base64 data URL stored in MongoDB
  currency?: string;
  isPro?: boolean;
}

export interface SplitTemplate {
  groupId: string;
  method: SplitMethod;
  details: Record<string, number>; // percentages or custom amounts
}
