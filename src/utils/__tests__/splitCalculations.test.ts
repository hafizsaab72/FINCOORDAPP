/**
 * Split Calculation Tests
 *
 * Finance-critical: every split method must produce amounts that sum
 * exactly to the total. No rounding drift. No negative shares.
 */

import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateAdjustmentSplit,
  calculateSplits,
} from '../splitCalculations';
import { Participant } from '../../types';

function makeParticipants(count: number, active: boolean[] = []): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    userId: `user-${i}`,
    name: `User ${i}`,
    isActive: active[i] ?? true,
  }));
}

function sumComputed(splits: { computedAmount: number }[]): number {
  return splits.reduce((s, sp) => s + sp.computedAmount, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Equal Split
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateEqualSplit', () => {
  it('divides 100.00 evenly among 2 participants', () => {
    const splits = calculateEqualSplit(100, makeParticipants(2));
    expect(splits).toHaveLength(2);
    expect(splits[0].computedAmount).toBe(50);
    expect(splits[1].computedAmount).toBe(50);
    expect(sumComputed(splits)).toBe(100);
  });

  it('divides 100.00 among 3 (33.33, 33.33, 33.34)', () => {
    const splits = calculateEqualSplit(100, makeParticipants(3));
    expect(splits).toHaveLength(3);
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
    // Remainder (1 cent) goes to first participant (index 0)
    expect(splits[0].computedAmount).toBe(33.34);
    expect(splits[1].computedAmount).toBe(33.33);
    expect(splits[2].computedAmount).toBe(33.33);
  });

  it('divides 100.00 among 4 (25.00 each)', () => {
    const splits = calculateEqualSplit(100, makeParticipants(4));
    expect(splits).toHaveLength(4);
    expect(splits.every(s => s.computedAmount === 25)).toBe(true);
    expect(sumComputed(splits)).toBe(100);
  });

  it('divides 0.01 among 2 (0.01 to first, 0.00 to second)', () => {
    const splits = calculateEqualSplit(0.01, makeParticipants(2));
    expect(sumComputed(splits)).toBe(0.01);
    expect(splits[0].computedAmount).toBe(0.01);
    expect(splits[1].computedAmount).toBe(0);
  });

  it('gives remainder to payer when specified', () => {
    const participants = makeParticipants(3);
    const splits = calculateEqualSplit(100, participants, 'user-1');
    // payer is user-1 (index 1), so remainder goes to index 1
    expect(splits[1].computedAmount).toBe(33.34);
    expect(splits[0].computedAmount).toBe(33.33);
    expect(splits[2].computedAmount).toBe(33.33);
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
  });

  it('handles 10 participants on 100.00', () => {
    const splits = calculateEqualSplit(100, makeParticipants(10));
    expect(splits).toHaveLength(10);
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
    // 100 / 10 = 10.00 exactly
    expect(splits.every(s => s.computedAmount === 10)).toBe(true);
  });

  it('handles 3 participants on 10.00', () => {
    const splits = calculateEqualSplit(10, makeParticipants(3));
    expect(sumComputed(splits)).toBeCloseTo(10, 10);
    expect(splits[0].computedAmount).toBe(3.34);
    expect(splits[1].computedAmount).toBe(3.33);
    expect(splits[2].computedAmount).toBe(3.33);
  });

  it('excludes inactive participants', () => {
    const participants = makeParticipants(3, [true, false, true]);
    const splits = calculateEqualSplit(100, participants);
    expect(splits).toHaveLength(2);
    expect(splits[0].computedAmount).toBe(50);
    expect(splits[1].computedAmount).toBe(50);
    expect(sumComputed(splits)).toBe(100);
  });

  it('returns empty array on zero participants', () => {
    expect(calculateEqualSplit(100, [])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Exact Amounts Split
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateExactSplit', () => {
  it('uses provided values directly', () => {
    const splits = calculateExactSplit({
      'user-0': 30,
      'user-1': 40,
      'user-2': 30,
    });
    expect(splits).toHaveLength(3);
    expect(splits[0].computedAmount).toBe(30);
    expect(splits[1].computedAmount).toBe(40);
    expect(splits[2].computedAmount).toBe(30);
    expect(sumComputed(splits)).toBe(100);
  });

  it('handles zero for some participants', () => {
    const splits = calculateExactSplit({
      'user-0': 100,
      'user-1': 0,
    });
    expect(splits[0].computedAmount).toBe(100);
    expect(splits[1].computedAmount).toBe(0);
  });

  it('preserves decimal values', () => {
    const splits = calculateExactSplit({
      'user-0': 33.33,
      'user-1': 33.33,
      'user-2': 33.34,
    });
    expect(splits[0].computedAmount).toBe(33.33);
    expect(splits[1].computedAmount).toBe(33.33);
    expect(splits[2].computedAmount).toBe(33.34);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Percentage Split
// ─────────────────────────────────────────────────────────────────────────────

describe('calculatePercentageSplit', () => {
  it('splits 100.00 by 50/30/20', () => {
    const splits = calculatePercentageSplit(100, {
      'user-0': 50,
      'user-1': 30,
      'user-2': 20,
    });
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
    expect(splits[0].computedAmount).toBe(50);
    expect(splits[1].computedAmount).toBe(30);
    expect(splits[2].computedAmount).toBe(20);
  });

  it('handles rounding by giving remainder to last participant', () => {
    const splits = calculatePercentageSplit(100, {
      'user-0': 33.33,
      'user-1': 33.33,
      'user-2': 33.34,
    });
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
    // 33.33% of 10000 cents = 3333 cents = 33.33
    // 33.33% of 10000 cents = 3333 cents = 33.33
    // last gets remainder: 10000 - 3333 - 3333 = 3334 cents = 33.34
    expect(splits[0].computedAmount).toBe(33.33);
    expect(splits[1].computedAmount).toBe(33.33);
    expect(splits[2].computedAmount).toBe(33.34);
  });

  it('handles 3-way equal percentage (33.33, 33.33, 33.34)', () => {
    const splits = calculatePercentageSplit(100, {
      'user-0': 33.33,
      'user-1': 33.33,
      'user-2': 33.34,
    });
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
  });

  it('handles 100% to one person', () => {
    const splits = calculatePercentageSplit(100, {
      'user-0': 100,
    });
    expect(splits[0].computedAmount).toBe(100);
    expect(sumComputed(splits)).toBe(100);
  });

  it('handles 0% for some participants', () => {
    const splits = calculatePercentageSplit(100, {
      'user-0': 100,
      'user-1': 0,
    });
    expect(splits[0].computedAmount).toBe(100);
    expect(splits[1].computedAmount).toBe(0);
    expect(sumComputed(splits)).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Shares Split
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateSharesSplit', () => {
  it('splits 100.00 by 2:1:1 shares', () => {
    const splits = calculateSharesSplit(100, {
      'user-0': 2,
      'user-1': 1,
      'user-2': 1,
    });
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
    expect(splits[0].computedAmount).toBe(50);
    expect(splits[1].computedAmount).toBe(25);
    expect(splits[2].computedAmount).toBe(25);
  });

  it('splits 100.00 by 3:2:1 shares', () => {
    const splits = calculateSharesSplit(100, {
      'user-0': 3,
      'user-1': 2,
      'user-2': 1,
    });
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
    // 3/6 * 100 = 50, 2/6 * 100 = 33.33, 1/6 * 100 = 16.67
    // floor: 50.00, 33.33, 16.66 -> remainder 0.01 to last
    expect(splits[0].computedAmount).toBe(50);
    expect(splits[1].computedAmount).toBe(33.33);
    expect(splits[2].computedAmount).toBe(16.67);
  });

  it('handles all equal shares', () => {
    const splits = calculateSharesSplit(100, {
      'user-0': 1,
      'user-1': 1,
      'user-2': 1,
    });
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
    // Remainder goes to LAST participant
    expect(splits[0].computedAmount).toBe(33.33);
    expect(splits[1].computedAmount).toBe(33.33);
    expect(splits[2].computedAmount).toBe(33.34);
  });

  it('returns empty array on zero total shares', () => {
    expect(calculateSharesSplit(100, {
      'user-0': 0,
      'user-1': 0,
    })).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Adjustment Split
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateAdjustmentSplit', () => {
  it('base equal on 100.00 with +10, -5, -5', () => {
    const participants = makeParticipants(3);
    const splits = calculateAdjustmentSplit(100, {
      'user-0': 10,
      'user-1': -5,
      'user-2': -5,
    }, participants);
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
    // base = 33.33, + adjustments
    // base = 33.34 (remainder to index 0) + adjustments
    expect(splits[0].computedAmount).toBe(43.34);
    expect(splits[1].computedAmount).toBe(28.33);
    expect(splits[2].computedAmount).toBe(28.33);
  });

  it('base equal on 100.00 with all zero adjustments', () => {
    const participants = makeParticipants(3);
    const splits = calculateAdjustmentSplit(100, {
      'user-0': 0,
      'user-1': 0,
      'user-2': 0,
    }, participants);
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
    expect(splits[0].computedAmount).toBe(33.34);
    expect(splits[1].computedAmount).toBe(33.33);
    expect(splits[2].computedAmount).toBe(33.33);
  });

  it('throws if adjustment would make amount negative', () => {
    const participants = makeParticipants(2);
    expect(() => calculateAdjustmentSplit(10, {
      'user-0': -10,
      'user-1': 10,
    }, participants)).toThrow();
  });

  it('returns empty array on zero participants', () => {
    expect(calculateAdjustmentSplit(100, {}, [])).toEqual([]);
  });

  it('handles 4 participants with mixed adjustments', () => {
    const participants = makeParticipants(4);
    const splits = calculateAdjustmentSplit(100, {
      'user-0': 5,
      'user-1': -5,
      'user-2': 0,
      'user-3': 0,
    }, participants);
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
    // base = 25.00
    expect(splits[0].computedAmount).toBe(30);
    expect(splits[1].computedAmount).toBe(20);
    expect(splits[2].computedAmount).toBe(25);
    expect(splits[3].computedAmount).toBe(25);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Generic dispatcher
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateSplits dispatcher', () => {
  it('dispatches to equal', () => {
    const participants = makeParticipants(3);
    const splits = calculateSplits('equal', 100, participants, {}, 'user-0');
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
  });

  it('dispatches to exact', () => {
    const splits = calculateSplits('exact', 100, makeParticipants(3), {
      'user-0': 30,
      'user-1': 40,
      'user-2': 30,
    });
    expect(sumComputed(splits)).toBe(100);
  });

  it('dispatches to percentage', () => {
    const splits = calculateSplits('percentage', 100, makeParticipants(3), {
      'user-0': 50,
      'user-1': 30,
      'user-2': 20,
    });
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
  });

  it('dispatches to shares', () => {
    const splits = calculateSplits('shares', 100, makeParticipants(3), {
      'user-0': 2,
      'user-1': 1,
      'user-2': 1,
    });
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
  });

  it('dispatches to adjustment', () => {
    const participants = makeParticipants(3);
    const splits = calculateSplits('adjustment', 100, participants, {
      'user-0': 10,
      'user-1': -5,
      'user-2': -5,
    });
    expect(sumComputed(splits)).toBeCloseTo(100, 10);
  });

  it('defaults to equal for unknown method', () => {
    const participants = makeParticipants(2);
    const splits = calculateSplits('unknown' as any, 100, participants, {});
    expect(sumComputed(splits)).toBe(100);
    expect(splits[0].computedAmount).toBe(50);
    expect(splits[1].computedAmount).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Critical finance invariants (all methods)
// ─────────────────────────────────────────────────────────────────────────────

describe('Finance invariants', () => {
  const testCases = [
    { total: 0.01, count: 2, method: 'equal' as const },
    { total: 1.00, count: 3, method: 'equal' as const },
    { total: 9.99, count: 4, method: 'equal' as const },
    { total: 100.00, count: 7, method: 'equal' as const },
    { total: 999.99, count: 10, method: 'equal' as const },
    { total: 100.00, count: 5, method: 'percentage' as const, values: { 'user-0': 20, 'user-1': 20, 'user-2': 20, 'user-3': 20, 'user-4': 20 } },
    { total: 100.00, count: 3, method: 'shares' as const, values: { 'user-0': 3, 'user-1': 2, 'user-2': 1 } },
  ];

  testCases.forEach(({ total, count, method, values }) => {
    it(`${method} split of ${total} among ${count} sums exactly to total`, () => {
      const participants = makeParticipants(count);
      const vals = values || {};
      const splits = calculateSplits(method, total, participants, vals);
      const sum = sumComputed(splits);
      expect(sum).toBeCloseTo(total, 10);
    });
  });

  it('never produces negative computed amounts', () => {
    const participants = makeParticipants(3);
    const methods: Array<'equal' | 'exact' | 'percentage' | 'shares' | 'adjustment'> = ['equal', 'exact', 'percentage', 'shares', 'adjustment'];
    for (const method of methods) {
      let values: Record<string, number> = {};
      if (method === 'exact') values = { 'user-0': 30, 'user-1': 40, 'user-2': 30 };
      if (method === 'percentage') values = { 'user-0': 50, 'user-1': 30, 'user-2': 20 };
      if (method === 'shares') values = { 'user-0': 2, 'user-1': 1, 'user-2': 1 };
      if (method === 'adjustment') values = { 'user-0': 5, 'user-1': -5, 'user-2': 0 };

      const splits = calculateSplits(method, 100, participants, values);
      for (const s of splits) {
        expect(s.computedAmount).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
