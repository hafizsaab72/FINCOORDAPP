export type ContextType = 'group' | 'non_group';
export type PayerMode = 'single' | 'multiple';
export type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares' | 'adjustment';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'yearly';

export interface Participant {
  userId: string;
  name: string;
  isActive: boolean;
}

export interface Payer {
  userId: string;
  amountPaid: number; // major units in UI
}

export interface Split {
  userId: string;
  splitMethod: SplitMethod;
  value: number;
  computedAmount: number; // major units in UI
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate?: string;
}

export interface Attachment {
  url: string;
  filename: string;
  uploadedAt: string;
}

export interface Expense {
  id: string;
  title: string;
  totalAmount: number; // major units in UI, minor in API
  currency: string;
  category: string;
  contextType: ContextType;
  groupId: string | null;
  participants: Participant[];
  payerMode: PayerMode;
  payers: Payer[];
  splitMethod: SplitMethod;
  splits: Split[];
  date: string; // ISO date
  notes: string | null;
  attachments: Attachment[] | null;
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule | null;
  isSettlement: boolean;
  settlementFrom?: string;
  settlementTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface Activity {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  expenseId?: string;
  groupId?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

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
  icon?: string;
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
  isFormerMember?: boolean;
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

export interface DashboardSummary {
  totalOwedToMe: number; // minor units
  totalIOwe: number;     // minor units
  netBalance: number;    // minor units (positive = owed to me)
  currency: string;
  expenseCount?: number;
  thisMonthTotal?: number; // minor units
  lastMonthTotal?: number; // minor units
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
