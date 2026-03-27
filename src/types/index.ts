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
