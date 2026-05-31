/**
 * Balance Logic Tests
 *
 * Materialized balance computations. Positive net = user is OWED money.
 * Negative net = user OWES money.
 */

import {
  computeBalances,
  simplifyDebts,
  getWhoOwesWho,
} from '../balances';

function makeExpense(overrides: Partial<{
  payments: { userId: string; amount: number }[];
  splits: { userId: string; owedAmount: number }[];
  participantNames?: Record<string, string>;
}> = {}) {
  return {
    payments: overrides.payments ?? [{ userId: 'a', amount: 100 }],
    splits: overrides.splits ?? [
      { userId: 'a', owedAmount: 50 },
      { userId: 'b', owedAmount: 50 },
    ],
    participantNames: overrides.participantNames,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// computeBalances
// ─────────────────────────────────────────────────────────────────────────────

describe('computeBalances', () => {
  it('single payer — payer is owed their share, others owe', () => {
    const result = computeBalances([makeExpense()], 'a');
    expect(result.totalOwedToYou).toBeCloseTo(50, 10);
    expect(result.totalYouOwe).toBe(0);
    expect(result.memberBalances).toHaveLength(1);
    expect(result.memberBalances[0].net).toBeCloseTo(-50, 10);
  });

  it('single payer from non-payer perspective', () => {
    const result = computeBalances([makeExpense()], 'b');
    expect(result.totalOwedToYou).toBe(0);
    expect(result.totalYouOwe).toBeCloseTo(50, 10);
    expect(result.memberBalances).toHaveLength(1);
    expect(result.memberBalances[0].net).toBeCloseTo(50, 10);
  });

  it('multiple payers — balances net paid - owed', () => {
    const result = computeBalances([makeExpense({
      payments: [
        { userId: 'a', amount: 60 },
        { userId: 'b', amount: 40 },
      ],
      splits: [
        { userId: 'a', owedAmount: 50 },
        { userId: 'b', owedAmount: 50 },
      ],
    })], 'a');
    // a paid 60, owed 50 → net +10 → totalOwedToYou = 10
    expect(result.totalOwedToYou).toBeCloseTo(10, 10);
    expect(result.totalYouOwe).toBe(0);
    expect(result.memberBalances[0].net).toBeCloseTo(-10, 10);
  });

  it('self-excluded payer — payer balance = total, others = negative', () => {
    const result = computeBalances([makeExpense({
      payments: [{ userId: 'a', amount: 100 }],
      splits: [
        { userId: 'a', owedAmount: 0 },
        { userId: 'b', owedAmount: 50 },
        { userId: 'c', owedAmount: 50 },
      ],
    })], 'a');
    expect(result.totalOwedToYou).toBeCloseTo(100, 10);
    expect(result.totalYouOwe).toBe(0);
    expect(result.memberBalances).toHaveLength(2);
  });

  it('unequal exact split', () => {
    const result = computeBalances([makeExpense({
      splits: [
        { userId: 'a', owedAmount: 70 },
        { userId: 'b', owedAmount: 30 },
      ],
    })], 'a');
    // a paid 100, owed 70 → net +30
    expect(result.totalOwedToYou).toBeCloseTo(30, 10);
    expect(result.totalYouOwe).toBe(0);
    expect(result.memberBalances[0].net).toBeCloseTo(-30, 10);
  });

  it('zero-sum: everyone paid exactly what they owe', () => {
    const result = computeBalances([makeExpense({
      payments: [
        { userId: 'a', amount: 50 },
        { userId: 'b', amount: 50 },
      ],
    })], 'a');
    expect(result.totalOwedToYou).toBe(0);
    expect(result.totalYouOwe).toBe(0);
  });

  it('3 participants with shares', () => {
    const result = computeBalances([makeExpense({
      payments: [{ userId: 'a', amount: 120 }],
      splits: [
        { userId: 'a', owedAmount: 60 },
        { userId: 'b', owedAmount: 30 },
        { userId: 'c', owedAmount: 30 },
      ],
    })], 'a');
    expect(result.totalOwedToYou).toBeCloseTo(60, 10);
    expect(result.memberBalances).toHaveLength(2);
    expect(result.memberBalances[0].net).toBeCloseTo(-30, 10);
    expect(result.memberBalances[1].net).toBeCloseTo(-30, 10);
  });

  it('sums across multiple expenses', () => {
    const expenses = [
      makeExpense(),
      makeExpense({
        payments: [
          { userId: 'a', amount: 60 },
          { userId: 'b', amount: 40 },
        ],
        splits: [
          { userId: 'a', owedAmount: 50 },
          { userId: 'b', owedAmount: 50 },
        ],
      }),
    ];
    const result = computeBalances(expenses, 'a');
    // exp1: a +50, exp2: a +10 → total +60
    expect(result.totalOwedToYou).toBeCloseTo(60, 10);
  });

  it('uses participantNames when provided', () => {
    const result = computeBalances([makeExpense({
      participantNames: { b: 'Bob The Builder' },
    })], 'a');
    expect(result.memberBalances[0].name).toBe('Bob The Builder');
  });

  it('balance sum across all members is always 0', () => {
    const expenses = [
      makeExpense(),
      makeExpense({
        payments: [
          { userId: 'a', amount: 60 },
          { userId: 'b', amount: 40 },
        ],
        splits: [
          { userId: 'a', owedAmount: 50 },
          { userId: 'b', owedAmount: 50 },
        ],
      }),
      makeExpense({
        payments: [{ userId: 'c', amount: 90 }],
        splits: [
          { userId: 'a', owedAmount: 30 },
          { userId: 'b', owedAmount: 30 },
          { userId: 'c', owedAmount: 30 },
        ],
      }),
    ];

    const allUsers = new Set<string>();
    expenses.forEach(e => {
      e.payments.forEach(p => allUsers.add(p.userId));
      e.splits.forEach(s => allUsers.add(s.userId));
    });

    for (const myId of allUsers) {
      const result = computeBalances(expenses, myId);
      const total = result.totalOwedToYou - result.totalYouOwe +
        result.memberBalances.reduce((s, m) => s + m.net, 0);
      expect(total).toBeCloseTo(0, 10);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// simplifyDebts
// ─────────────────────────────────────────────────────────────────────────────

describe('simplifyDebts', () => {
  it('simple 2-person debt', () => {
    const simplified = simplifyDebts({ a: 50, b: -50 });
    expect(simplified).toHaveLength(1);
    expect(simplified[0]).toEqual({ from: 'b', to: 'a', amount: 50 });
  });

  it('no debts when all zero', () => {
    const simplified = simplifyDebts({ a: 0, b: 0 });
    expect(simplified).toHaveLength(0);
  });

  it('3-person: a is owed, b and c owe', () => {
    const simplified = simplifyDebts({ a: 66.67, b: -33.33, c: -33.34 });
    expect(simplified).toHaveLength(2);
    expect(simplified.filter(t => t.to === 'a')).toHaveLength(2);
    expect(simplified.reduce((s, t) => s + t.amount, 0)).toBeCloseTo(66.67, 10);
  });

  it('complex 4-person scenario', () => {
    const simplified = simplifyDebts({ a: 100, b: 50, c: -80, d: -70 });
    const totalTransferred = simplified.reduce((s, t) => s + t.amount, 0);
    expect(totalTransferred).toBeCloseTo(150, 10);
    simplified.forEach(t => {
      expect(t.from).not.toBe(t.to);
      expect(t.amount).toBeGreaterThan(0);
    });
  });

  it('verifies each creditor receives correct total', () => {
    const balances = { a: 120, b: -50, c: -40, d: -30 };
    const simplified = simplifyDebts(balances);

    const receivedBy: Record<string, number> = {};
    simplified.forEach(t => {
      receivedBy[t.to] = (receivedBy[t.to] || 0) + t.amount;
    });

    expect(receivedBy.a).toBeCloseTo(120, 10);
  });

  it('verifies each debtor pays correct total', () => {
    const balances = { a: 120, b: -50, c: -40, d: -30 };
    const simplified = simplifyDebts(balances);

    const paidBy: Record<string, number> = {};
    simplified.forEach(t => {
      paidBy[t.from] = (paidBy[t.from] || 0) + t.amount;
    });

    expect(paidBy.b).toBeCloseTo(50, 10);
    expect(paidBy.c).toBeCloseTo(40, 10);
    expect(paidBy.d).toBeCloseTo(30, 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getWhoOwesWho
// ─────────────────────────────────────────────────────────────────────────────

describe('getWhoOwesWho', () => {
  it('returns who current user owes', () => {
    const { youOwe, theyOweYou } = getWhoOwesWho(
      { a: 50, b: -50 },
      'b',
    );
    expect(youOwe).toHaveLength(1);
    expect(youOwe[0]).toEqual({ userId: 'a', amount: 50 });
    expect(theyOweYou).toHaveLength(0);
  });

  it('returns who owes current user', () => {
    const { youOwe, theyOweYou } = getWhoOwesWho(
      { a: 50, b: -50 },
      'a',
    );
    expect(youOwe).toHaveLength(0);
    expect(theyOweYou).toHaveLength(1);
    expect(theyOweYou[0]).toEqual({ userId: 'b', amount: 50 });
  });

  it('handles multiple people', () => {
    const { youOwe, theyOweYou } = getWhoOwesWho(
      { a: 100, b: -30, c: -40, d: -30 },
      'b',
    );
    // b owes a 30 (from simplified debts)
    expect(youOwe).toHaveLength(1);
    expect(youOwe[0]).toEqual({ userId: 'a', amount: 30 });
    expect(theyOweYou).toHaveLength(0);
  });

  it('handles zero balance', () => {
    const { youOwe, theyOweYou } = getWhoOwesWho(
      { a: 0, b: 0 },
      'a',
    );
    expect(youOwe).toHaveLength(0);
    expect(theyOweYou).toHaveLength(0);
  });
});
