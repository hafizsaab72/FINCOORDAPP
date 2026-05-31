import { Split, SplitMethod, Participant } from '../types';

/**
 * Convert a major-unit amount to integer cents for precise division.
 */
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert integer cents back to major units.
 */
function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Equal split: divide total equally among active participants.
 * Remainder (in cents) goes to the payer if specified, otherwise first participant.
 */
export function calculateEqualSplit(
  totalAmount: number,
  participants: Participant[],
  payerUserId?: string,
): Split[] {
  const active = participants.filter(p => p.isActive);
  if (active.length === 0) return [];

  const totalCents = toCents(totalAmount);
  const baseCents = Math.floor(totalCents / active.length);
  const remainder = totalCents - baseCents * active.length;

  // Determine who gets the remainder: payer if specified, otherwise first participant
  let remainderIndex = 0;
  if (payerUserId) {
    const idx = active.findIndex(p => p.userId === payerUserId);
    if (idx >= 0) remainderIndex = idx;
  }

  return active.map((p, i) => ({
    userId: p.userId,
    splitMethod: 'equal' as SplitMethod,
    value: 1,
    computedAmount: fromCents(baseCents + (i === remainderIndex ? remainder : 0)),
  }));
}

/**
 * Exact amounts split: each participant's value IS their computed amount.
 */
export function calculateExactSplit(
  values: Record<string, number>,
): Split[] {
  return Object.entries(values).map(([userId, amount]) => ({
    userId,
    splitMethod: 'exact' as SplitMethod,
    value: amount,
    computedAmount: amount,
  }));
}

/**
 * Percentage split: compute each participant's share from their percentage.
 * Remainder goes to the LAST participant to ensure exact total.
 */
export function calculatePercentageSplit(
  totalAmount: number,
  percentages: Record<string, number>,
): Split[] {
  const entries = Object.entries(percentages);
  if (entries.length === 0) return [];

  const totalCents = toCents(totalAmount);
  let allocatedCents = 0;

  const splits: Split[] = [];
  for (let i = 0; i < entries.length; i++) {
    const [userId, pct] = entries[i];
    let cents: number;

    if (i === entries.length - 1) {
      cents = totalCents - allocatedCents;
    } else {
      cents = Math.floor((totalCents * pct) / 100);
    }

    allocatedCents += cents;
    splits.push({
      userId,
      splitMethod: 'percentage' as SplitMethod,
      value: pct,
      computedAmount: fromCents(cents),
    });
  }

  return splits;
}

/**
 * Shares split: compute proportional amounts from share weights.
 * Remainder goes to the LAST participant.
 */
export function calculateSharesSplit(
  totalAmount: number,
  shares: Record<string, number>,
): Split[] {
  const entries = Object.entries(shares);
  if (entries.length === 0) return [];

  const totalShares = entries.reduce((sum, [, s]) => sum + s, 0);
  if (totalShares <= 0) return [];

  const totalCents = toCents(totalAmount);
  let allocatedCents = 0;

  const splits: Split[] = [];
  for (let i = 0; i < entries.length; i++) {
    const [userId, shareCount] = entries[i];
    let cents: number;

    if (i === entries.length - 1) {
      cents = totalCents - allocatedCents;
    } else {
      cents = Math.floor((totalCents * shareCount) / totalShares);
    }

    allocatedCents += cents;
    splits.push({
      userId,
      splitMethod: 'shares' as SplitMethod,
      value: shareCount,
      computedAmount: fromCents(cents),
    });
  }

  return splits;
}

/**
 * Adjustment split: base equal + per-participant delta.
 * Validates that no computed amount goes negative.
 */
export function calculateAdjustmentSplit(
  totalAmount: number,
  adjustments: Record<string, number>,
  participants: Participant[],
): Split[] {
  const active = participants.filter(p => p.isActive);
  if (active.length === 0) return [];

  const totalCents = toCents(totalAmount);
  const baseCents = Math.floor(totalCents / active.length);
  const remainder = totalCents - baseCents * active.length;

  const splits: Split[] = [];
  for (let i = 0; i < active.length; i++) {
    const p = active[i];
    const adjCents = toCents(adjustments[p.userId] ?? 0);
    const cents = baseCents + (i === 0 ? remainder : 0) + adjCents;

    if (cents < 0) {
      throw new Error(`Adjustment would produce a negative amount for ${p.name}`);
    }

    splits.push({
      userId: p.userId,
      splitMethod: 'adjustment' as SplitMethod,
      value: adjustments[p.userId] ?? 0,
      computedAmount: fromCents(cents),
    });
  }

  return splits;
}

/**
 * Generic split calculator that dispatches to the correct method.
 */
export function calculateSplits(
  method: SplitMethod,
  totalAmount: number,
  participants: Participant[],
  values: Record<string, number>,
  payerUserId?: string,
): Split[] {
  switch (method) {
    case 'equal':
      return calculateEqualSplit(totalAmount, participants, payerUserId);
    case 'exact':
      return calculateExactSplit(values);
    case 'percentage':
      return calculatePercentageSplit(totalAmount, values);
    case 'shares':
      return calculateSharesSplit(totalAmount, values);
    case 'adjustment':
      return calculateAdjustmentSplit(totalAmount, values, participants);
    default:
      return calculateEqualSplit(totalAmount, participants, payerUserId);
  }
}
