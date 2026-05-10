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
 * Convention (matches backend API):
 *   member.net > 0  → this member owes money to myId
 *   member.net < 0  → myId owes money to this member
 */
export function computeBalances(
  expenses: BalanceExpense[],
  myId: string,
  nameMap?: Record<string, string>,
): GroupBalancesData {
  const memberMap: Record<string, { name: string; paid: number; owed: number; net: number }> = {};

  for (const e of expenses) {
    // Ensure all participants exist in map
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

    // Accumulate payments (who paid)
    for (const p of e.payments) {
      memberMap[p.userId].paid += p.amount;
    }

    // Accumulate splits (who owes)
    for (const s of e.splits) {
      memberMap[s.userId].owed += s.owedAmount;
    }
  }

  // Compute net for each member: paid - owed
  for (const uid of Object.keys(memberMap)) {
    memberMap[uid].net = memberMap[uid].paid - memberMap[uid].owed;
  }

  let totalOwedToYou = 0;
  let totalYouOwe = 0;

  for (const [uid, info] of Object.entries(memberMap)) {
    if (uid === myId) continue;
    if (info.net > 0) {
      // They over-paid → I owe them (their net is positive, meaning they're owed)
      totalYouOwe += info.net;
    } else if (info.net < 0) {
      // They under-paid → they owe me
      totalOwedToYou += Math.abs(info.net);
    }
  }

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
