/**
 * Expense Validation Tests
 *
 * Every rule from the spec must be enforced exactly.
 */

import {
  validateExpense,
  validateSplits,
  validatePayers,
  validateParticipants,
} from '../expenseValidation';
import { Expense, Participant, Payer, Split, SplitMethod } from '../../types';

function makeExpense(overrides: Partial<Expense> = {}): Partial<Expense> {
  return {
    title: 'Dinner',
    totalAmount: 100,
    currency: 'USD',
    date: new Date().toISOString(),
    contextType: 'group',
    groupId: 'group-1',
    participants: [
      { userId: 'user-0', name: 'Alice', isActive: true },
      { userId: 'user-1', name: 'Bob', isActive: true },
    ],
    payerMode: 'single',
    payers: [{ userId: 'user-0', amountPaid: 100 }],
    splitMethod: 'equal',
    splits: [
      { userId: 'user-0', splitMethod: 'equal', value: 1, computedAmount: 50 },
      { userId: 'user-1', splitMethod: 'equal', value: 1, computedAmount: 50 },
    ],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Global Rules (G1–G8)
// ─────────────────────────────────────────────────────────────────────────────

describe('validateExpense — Global Rules', () => {
  // G1: Title required
  it('G1: fails when title is empty', () => {
    const result = validateExpense(makeExpense({ title: '' }));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Please enter a valid expense title.');
  });

  it('G1: fails when title is whitespace only', () => {
    const result = validateExpense(makeExpense({ title: '   ' }));
    expect(result.isValid).toBe(false);
  });

  // G2: Total > 0
  it('G2: fails when total is 0', () => {
    const result = validateExpense(makeExpense({ totalAmount: 0 }));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Please enter a valid expense amount greater than zero.');
  });

  it('G2: fails when total is negative', () => {
    const result = validateExpense(makeExpense({ totalAmount: -10 }));
    expect(result.isValid).toBe(false);
  });

  // G3: Valid currency
  it('G3: fails when currency is invalid', () => {
    const result = validateExpense(makeExpense({ currency: 'INVALID' }));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Please select a valid currency.');
  });

  it('G3: passes with valid currency', () => {
    const result = validateExpense(makeExpense({ currency: 'USD' }));
    expect(result.errors).not.toContain('Please select a valid currency.');
  });

  // G4: Date required
  it('G4: fails when date is missing', () => {
    const result = validateExpense(makeExpense({ date: undefined }));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Please select a date.');
  });

  it('G4: fails when date is invalid', () => {
    const result = validateExpense(makeExpense({ date: 'not-a-date' }));
    expect(result.isValid).toBe(false);
  });

  // G5: ≥2 active participants
  it('G5: fails with fewer than 2 active participants', () => {
    const result = validateExpense(makeExpense({
      participants: [
        { userId: 'user-0', name: 'Alice', isActive: true },
        { userId: 'user-1', name: 'Bob', isActive: false },
      ],
    }));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('You need at least 2 people to split an expense.');
  });

  it('G5: passes with exactly 2 active participants', () => {
    const result = validateExpense(makeExpense());
    expect(result.errors).not.toContain('You need at least 2 people to split an expense.');
  });

  // G6: Payer must be participant
  it('G6: fails when payer is not a participant', () => {
    const result = validateExpense(makeExpense({
      payers: [{ userId: 'user-999', amountPaid: 100 }],
    }));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Please specify who paid for this expense.');
  });

  // G7: Splits sum = total
  it('G7: fails when splits do not sum to total', () => {
    const result = validateExpense(makeExpense({
      splits: [
        { userId: 'user-0', splitMethod: 'equal', value: 1, computedAmount: 40 },
        { userId: 'user-1', splitMethod: 'equal', value: 1, computedAmount: 40 },
      ],
    }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('split amounts'))).toBe(true);
  });

  // G8: No negative computed amounts
  it('G8: fails when any computed amount is negative', () => {
    const result = validateExpense(makeExpense({
      splits: [
        { userId: 'user-0', splitMethod: 'equal', value: 1, computedAmount: 150 },
        { userId: 'user-1', splitMethod: 'equal', value: 1, computedAmount: -50 },
      ],
    }));
    expect(result.isValid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Multiple Payer Rules (MP1–MP3)
// ─────────────────────────────────────────────────────────────────────────────

describe('validateExpense — Multiple Payer Rules', () => {
  it('MP1+MP2: fails when multiple payer amounts do not sum to total', () => {
    const result = validateExpense(makeExpense({
      payerMode: 'multiple',
      payers: [
        { userId: 'user-0', amountPaid: 60 },
        { userId: 'user-1', amountPaid: 30 },
      ],
    }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('amounts paid add up'))).toBe(true);
    expect(result.diffs.payerSum).toBeCloseTo(10, 10);
  });

  it('MP2: passes when multiple payer amounts sum exactly to total', () => {
    const result = validateExpense(makeExpense({
      payerMode: 'multiple',
      payers: [
        { userId: 'user-0', amountPaid: 60 },
        { userId: 'user-1', amountPaid: 40 },
      ],
    }));
    expect(result.errors.some(e => e.includes('amounts paid add up'))).toBe(false);
  });

  it('MP3: fails when fewer than 2 non-zero payers in multiple mode', () => {
    const result = validateExpense(makeExpense({
      payerMode: 'multiple',
      payers: [
        { userId: 'user-0', amountPaid: 100 },
        { userId: 'user-1', amountPaid: 0 },
      ],
    }));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least 2 payers must have non-zero amounts.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Self-Exclusion Rules
// ─────────────────────────────────────────────────────────────────────────────

describe('validateExpense — Self-Exclusion', () => {
  it('allows self-exclusion with single payer', () => {
    const result = validateExpense(makeExpense({
      participants: [
        { userId: 'user-0', name: 'Alice', isActive: false },
        { userId: 'user-1', name: 'Bob', isActive: true },
      ],
      payerMode: 'single',
      payers: [{ userId: 'user-0', amountPaid: 100 }],
      splits: [
        { userId: 'user-0', splitMethod: 'equal', value: 1, computedAmount: 0 },
        { userId: 'user-1', splitMethod: 'equal', value: 1, computedAmount: 100 },
      ],
    }));
    expect(result.errors).not.toContain('Self-exclusion is only valid when the self-excluded user is the sole payer.');
  });

  it('blocks self-exclusion with multiple payers', () => {
    const result = validateExpense(makeExpense({
      participants: [
        { userId: 'user-0', name: 'Alice', isActive: false },
        { userId: 'user-1', name: 'Bob', isActive: true },
      ],
      payerMode: 'multiple',
      payers: [
        { userId: 'user-0', amountPaid: 50 },
        { userId: 'user-1', amountPaid: 50 },
      ],
      splits: [
        { userId: 'user-0', splitMethod: 'equal', value: 1, computedAmount: 0 },
        { userId: 'user-1', splitMethod: 'equal', value: 1, computedAmount: 100 },
      ],
    }));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Self-exclusion is only valid when the self-excluded user is the sole payer.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateSplits — Split Method Specific Rules (SM1–SM7)
// ─────────────────────────────────────────────────────────────────────────────

describe('validateSplits', () => {
  const makeSplits = (overrides: Split[] = []): Split[] => [
    { userId: 'user-0', splitMethod: 'equal', value: 1, computedAmount: 50 },
    { userId: 'user-1', splitMethod: 'equal', value: 1, computedAmount: 50 },
    ...overrides,
  ];

  // SM1–SM2: Exact amounts
  it('SM2: fails when exact amounts do not sum to total', () => {
    const result = validateSplits(100, [
      { userId: 'user-0', splitMethod: 'exact', value: 40, computedAmount: 40 },
      { userId: 'user-1', splitMethod: 'exact', value: 40, computedAmount: 40 },
    ], 'exact');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('amounts entered add up to');
    expect(result.diffs.exactSum).toBeCloseTo(20, 10);
  });

  it('SM2: passes when exact amounts sum to total', () => {
    const result = validateSplits(100, [
      { userId: 'user-0', splitMethod: 'exact', value: 60, computedAmount: 60 },
      { userId: 'user-1', splitMethod: 'exact', value: 40, computedAmount: 40 },
    ], 'exact');
    expect(result.isValid).toBe(true);
  });

  // SM3–SM4: Percentages
  it('SM4: fails when percentages do not sum to 100', () => {
    const result = validateSplits(100, [
      { userId: 'user-0', splitMethod: 'percentage', value: 50, computedAmount: 50 },
      { userId: 'user-1', splitMethod: 'percentage', value: 30, computedAmount: 30 },
    ], 'percentage');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Percentages add up to');
    expect(result.diffs.percentageSum).toBeCloseTo(20, 10);
  });

  it('SM4: passes when percentages sum to 100', () => {
    const result = validateSplits(100, [
      { userId: 'user-0', splitMethod: 'percentage', value: 60, computedAmount: 60 },
      { userId: 'user-1', splitMethod: 'percentage', value: 40, computedAmount: 40 },
    ], 'percentage');
    expect(result.isValid).toBe(true);
  });

  it('SM3: fails when any percentage is <= 0', () => {
    const result = validateSplits(100, [
      { userId: 'user-0', splitMethod: 'percentage', value: 100, computedAmount: 100 },
      { userId: 'user-1', splitMethod: 'percentage', value: 0, computedAmount: 1 },
    ], 'percentage');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('All percentages must be > 0');
  });

  // SM5: Shares
  it('SM5: fails when any share is <= 0', () => {
    const result = validateSplits(100, [
      { userId: 'user-0', splitMethod: 'shares', value: 2, computedAmount: 100 },
      { userId: 'user-1', splitMethod: 'shares', value: 0, computedAmount: 1 },
    ], 'shares');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('All share values must be > 0');
  });

  it('SM5: passes with valid shares', () => {
    const result = validateSplits(100, [
      { userId: 'user-0', splitMethod: 'shares', value: 2, computedAmount: 66.67 },
      { userId: 'user-1', splitMethod: 'shares', value: 1, computedAmount: 33.33 },
    ], 'shares');
    expect(result.isValid).toBe(true);
  });

  // SM6–SM7: Adjustments
  it('SM6: fails when adjustments do not sum to 0', () => {
    const result = validateSplits(100, [
      { userId: 'user-0', splitMethod: 'adjustment', value: 10, computedAmount: 43.33 },
      { userId: 'user-1', splitMethod: 'adjustment', value: -5, computedAmount: 28.33 },
    ], 'adjustment');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('adjustments are off by');
  });

  it('SM6: passes when adjustments sum to 0', () => {
    const result = validateSplits(100, [
      { userId: 'user-0', splitMethod: 'adjustment', value: 5, computedAmount: 38.33 },
      { userId: 'user-1', splitMethod: 'adjustment', value: -5, computedAmount: 28.33 },
    ], 'adjustment');
    expect(result.isValid).toBe(true);
  });

  it('SM7: fails when adjustment would produce negative amount', () => {
    const result = validateSplits(10, [
      { userId: 'user-0', splitMethod: 'adjustment', value: -10, computedAmount: -5 },
      { userId: 'user-1', splitMethod: 'adjustment', value: 10, computedAmount: 15 },
    ], 'adjustment');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Adjustment would produce a negative amount.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validatePayers
// ─────────────────────────────────────────────────────────────────────────────

describe('validatePayers', () => {
  it('fails in single payer mode with no payers', () => {
    const result = validatePayers(100, [], 'single');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Please specify who paid for this expense.');
  });

  it('fails in multiple payer mode with only 1 non-zero payer', () => {
    const result = validatePayers(100, [
      { userId: 'user-0', amountPaid: 100 },
      { userId: 'user-1', amountPaid: 0 },
    ], 'multiple');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least 2 payers must have non-zero amounts.');
  });

  it('fails in multiple payer mode when sum != total', () => {
    const result = validatePayers(100, [
      { userId: 'user-0', amountPaid: 60 },
      { userId: 'user-1', amountPaid: 30 },
    ], 'multiple');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('amounts paid add up to');
    expect(result.diffs.payerSum).toBeCloseTo(10, 10);
  });

  it('passes in multiple payer mode when sum == total', () => {
    const result = validatePayers(100, [
      { userId: 'user-0', amountPaid: 60 },
      { userId: 'user-1', amountPaid: 40 },
    ], 'multiple');
    expect(result.isValid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateParticipants
// ─────────────────────────────────────────────────────────────────────────────

describe('validateParticipants', () => {
  it('fails with < 2 active participants', () => {
    const result = validateParticipants(
      [{ userId: 'a', name: 'A', isActive: true }],
      [{ userId: 'a', amountPaid: 100 }],
    );
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('You need at least 2 people to split an expense.');
  });

  it('blocks self-exclusion with multiple payers', () => {
    const result = validateParticipants(
      [
        { userId: 'a', name: 'A', isActive: false },
        { userId: 'b', name: 'B', isActive: true },
      ],
      [
        { userId: 'a', amountPaid: 50 },
        { userId: 'b', amountPaid: 50 },
      ],
    );
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Self-exclusion is only valid when the self-excluded user is the sole payer.');
  });

  it('allows self-exclusion with single payer', () => {
    const result = validateParticipants(
      [
        { userId: 'a', name: 'A', isActive: false },
        { userId: 'b', name: 'B', isActive: true },
      ],
      [{ userId: 'a', amountPaid: 100 }],
    );
    expect(result.errors).not.toContain('Self-exclusion is only valid when the self-excluded user is the sole payer.');
  });
});
