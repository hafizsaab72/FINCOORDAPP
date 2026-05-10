import { GroupBalancesData, MemberBalance } from '../types';

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

    for (const uid of allUserIds) {
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

  let totalYouOwe = 0;      // money I owe to others (they over-paid)
  let totalOwedToYou = 0;   // money others owe to me (they under-paid)

  for (const [uid, info] of Object.entries(memberMap)) {
    if (uid === myId) continue;
    if (info.net > 0) {
      // They over-paid → they are owed money → I may owe them
      totalYouOwe += info.net;
    } else if (info.net < 0) {
      // They under-paid → they owe money → they may owe me
      totalOwedToYou += Math.abs(info.net);
    }
  }

  // For exact per-user net (used by UI)
  const myNet = memberMap[myId]?.net ?? 0;
  // Adjust: if myNet > 0, I'm owed money (totalOwedToYou should reflect this)
  // If myNet < 0, I owe money (totalYouOwe should reflect this)
  // The pairwise breakdown requires API data; this is approximation.

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
