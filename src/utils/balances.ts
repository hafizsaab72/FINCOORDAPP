import { GroupBalancesData, MemberBalance, Expense } from '../types';
import { fromMinorUnits } from './currency';

function mapLegacySplitType(splitType: string | undefined): string {
  switch (splitType) {
    case 'unequal': return 'exact';
    case 'itemized': return 'adjustment';
    case 'equal':
    case 'exact':
    case 'percentage':
    case 'shares':
    case 'adjustment':
      return splitType;
    default:
      return 'equal';
  }
}

/**
 * Determine whether an expense is a non-group (direct friend-to-friend) expense.
 * Handles the new `contextType` field, null `groupId`, and legacy `'direct'` sentinel.
 */
export function isNonGroupExpense(e: Expense): boolean {
  if (e.contextType === 'non_group') return true;
  if (e.contextType === 'group') return false;
  // Fallback for legacy data that may lack contextType
  return !e.groupId || e.groupId === 'direct';
}

interface BalanceExpense {
  payments: { userId: string; amount: number }[];
  splits: { userId: string; owedAmount: number }[];
  participantNames?: Record<string, string>;
}

/**
 * Compute group balances from a list of expenses using the multi-payer schema.
 *
 * Per-user net = totalPaid - totalOwed
 * Positive net = user is owed money (over-paid)
 * Negative net = user owes money (under-paid)
 *
 * This is client-side approximation only. For exact pairwise balances,
 * use the API via useGroupBalances() which calls /groups/:id/balances.
 */
export function computeBalances(
  expenses: BalanceExpense[],
  myId: string,
  nameMap?: Record<string, string>,
): GroupBalancesData {
  const memberMap: Record<string, { name: string; paid: number; owed: number; net: number }> = {};

  for (const e of expenses) {
    const allUserIds = new Set<string>([
      ...e.payments.map(p => p.userId),
      ...e.splits.map(s => s.userId),
    ]);

    for (const uid of Array.from(allUserIds)) {
      if (!memberMap[uid]) {
        memberMap[uid] = {
          name: nameMap?.[uid] ?? e.participantNames?.[uid] ?? uid,
          paid: 0,
          owed: 0,
          net: 0,
        };
      }
    }

    for (const p of e.payments) {
      memberMap[p.userId].paid += p.amount;
    }

    for (const s of e.splits) {
      memberMap[s.userId].owed += s.owedAmount;
    }
  }

  for (const uid of Object.keys(memberMap)) {
    memberMap[uid].net = memberMap[uid].paid - memberMap[uid].owed;
  }

  const myNet = memberMap[myId]?.net ?? 0;
  const totalOwedToYou = myNet > 0 ? myNet : 0;
  const totalYouOwe = myNet < 0 ? Math.abs(myNet) : 0;

  const memberBalances: MemberBalance[] = Object.entries(memberMap)
    .filter(([memberId]) => memberId !== myId)
    .map(([memberId, info]) => ({
      memberId,
      name: info.name,
      email: '',
      isMe: false,
      net: info.net,
    }));

  return { totalOwedToYou, totalYouOwe, memberBalances };
}

export interface SimplifiedTransaction {
  from: string;
  to: string;
  amount: number;
}

/**
 * Simplify a set of debts using a greedy largest-first algorithm.
 * Given a map of userId -> net balance, returns a minimal set of
 * transactions that settles all debts.
 *
 * Positive balance = user is owed money.
 * Negative balance = user owes money.
 */
export function simplifyDebts(
  balances: Record<string, number>,
): SimplifiedTransaction[] {
  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  for (const [userId, net] of Object.entries(balances)) {
    if (net < -0.001) {
      debtors.push({ userId, amount: Math.abs(net) });
    } else if (net > 0.001) {
      creditors.push({ userId, amount: net });
    }
  }

  // Sort by amount descending
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: SimplifiedTransaction[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].amount, creditors[c].amount);
    if (amount > 0.001) {
      transactions.push({
        from: debtors[d].userId,
        to: creditors[c].userId,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtors[d].amount -= amount;
    creditors[c].amount -= amount;

    if (debtors[d].amount < 0.001) d++;
    if (creditors[c].amount < 0.001) c++;
  }

  return transactions;
}

export interface WhoOwesResult {
  youOwe: { userId: string; amount: number }[];
  theyOweYou: { userId: string; amount: number }[];
}

/**
 * From a balance map, compute what the current user owes and is owed.
 * Uses simplified debt transactions for accurate pairwise amounts.
 */
export function getWhoOwesWho(
  balances: Record<string, number>,
  myId: string,
): WhoOwesResult {
  const simplified = simplifyDebts(balances);
  const youOwe: { userId: string; amount: number }[] = [];
  const theyOweYou: { userId: string; amount: number }[] = [];

  for (const t of simplified) {
    if (t.from === myId) {
      youOwe.push({ userId: t.to, amount: t.amount });
    } else if (t.to === myId) {
      theyOweYou.push({ userId: t.from, amount: t.amount });
    }
  }

  return { youOwe, theyOweYou };
}

/**
 * Convert an API expense (with minor units) to the local Expense format (major units).
 */
export function apiExpenseToLocal(apiExpense: any): Expense {
  // Build the participants array from the splits array (consistent across all expense types).
  const participants = (apiExpense.splits || []).map((s: any) => ({
    userId: s.userId?.toString?.() ?? s.userId,
    name: s.name ?? '',
    isActive: !s.isExcluded && s.owedAmount > 0,
  }));

  // Apply stored participant names (from participantNames map on the expense).
  // This is critical for non-group expenses where user IDs may not resolve to names otherwise.
  const pn = apiExpense.participantNames;
  if (pn) {
    const nameMap: Record<string, string> =
      pn instanceof Map
        ? Object.fromEntries([...pn.entries()])
        : (typeof pn === 'object' ? pn : {});
    for (const p of participants) {
      if (nameMap[p.userId]) p.name = nameMap[p.userId];
    }
  }

  // Set initiator flag on the creator so AddExpenseScreen can populate their name.
  const creatorId = apiExpense.createdBy?.toString?.() ?? apiExpense.userId?.toString?.();
  if (creatorId) {
    for (const p of participants) {
      if (p.userId === creatorId) { p.initiator = true; break; }
    }
  }

  return {
    id: apiExpense._id ?? apiExpense.id,
    title: apiExpense.title ?? apiExpense.description ?? 'Expense',
    totalAmount: fromMinorUnits(apiExpense.totalAmount ?? 0),
    currency: apiExpense.baseCurrency ?? apiExpense.currency ?? 'USD',
    category: apiExpense.category ?? 'general',
    contextType: apiExpense.contextType ?? (apiExpense.groupId ? 'group' : 'non_group'),
    groupId: apiExpense.groupId ?? null,
    participants,
    payerMode: (apiExpense.payments || []).length > 1 ? 'multiple' : 'single',
    payers: (apiExpense.payments || []).map((p: any) => ({
      userId: p.userId?.toString?.() ?? p.userId,
      amountPaid: fromMinorUnits(p.amount ?? 0),
    })),
    splitMethod: mapLegacySplitType(apiExpense.splitType) as any,
    splits: (apiExpense.splits || []).map((s: any) => ({
      userId: s.userId?.toString?.() ?? s.userId,
      splitMethod: mapLegacySplitType(s.shareType ?? apiExpense.splitType) as any,
      value: s.shareValue ?? 1,
      computedAmount: fromMinorUnits(s.owedAmount ?? 0),
    })),
    date: apiExpense.expenseDate ?? apiExpense.date ?? new Date().toISOString(),
    notes: apiExpense.notes ?? null,
    attachments: apiExpense.attachments ?? null,
    isRecurring: apiExpense.isRecurring ?? false,
    recurrenceRule: apiExpense.recurrenceRule ?? null,
    isSettlement: apiExpense.isSettlement ?? false,
    settlementFrom: apiExpense.settlementFrom?.toString?.(),
    settlementTo: apiExpense.settlementTo?.toString?.(),
    createdBy: creatorId,
    createdAt: apiExpense.createdAt ?? new Date().toISOString(),
    updatedAt: apiExpense.updatedAt ?? new Date().toISOString(),
    isDeleted: apiExpense.isDeleted ?? false,
  };
}
