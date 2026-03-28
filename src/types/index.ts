export type SplitMethod = 'equal' | 'percentage' | 'custom';

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface Group {
  id: string;
  name: string;
  members: string[];
  createdAt: string;
}

export interface Expense {
  id: string;
  groupId: string;
  payerId: string;
  amount: number;
  notes: string;
  date: string;
  splitMethod: SplitMethod;
  splitDetails: Record<string, number>;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
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
