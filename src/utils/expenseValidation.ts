import { Expense, Participant, Payer, Split, SplitMethod } from '../types';

const ISO_4217_REGEX = /^[A-Z]{3}$/;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  diffs: Record<string, number>;
}

/**
 * Validate a complete expense object against the spec.
 * Operates on major units (converts to minor at API boundary).
 */
export function validateExpense(expense: Partial<Expense>): ValidationResult {
  const errors: string[] = [];
  const diffs: Record<string, number> = {};

  // G1: Title required
  if (!expense.title || expense.title.trim().length === 0) {
    errors.push('Please enter a valid expense title.');
  }

  // G2: Total amount > 0
  if (!expense.totalAmount || expense.totalAmount <= 0) {
    errors.push('Please enter a valid expense amount greater than zero.');
  }

  // G3: Valid currency
  if (!expense.currency || !ISO_4217_REGEX.test(expense.currency)) {
    errors.push('Please select a valid currency.');
  }

  // G4: Date required
  if (!expense.date || isNaN(new Date(expense.date).getTime())) {
    errors.push('Please select a date.');
  }

  // G5: At least 2 active participants
  const activeParticipants = (expense.participants || []).filter(p => p.isActive);
  if (activeParticipants.length < 2) {
    errors.push('You need at least 2 people to split an expense.');
  }

  // G6: Payer must be participant or self-excluded payer
  const payerIds = new Set((expense.payers || []).map(p => p.userId));
  const participantIds = new Set((expense.participants || []).map(p => p.userId));
  for (const pid of payerIds) {
    if (!participantIds.has(pid)) {
      errors.push('Please specify who paid for this expense.');
      break;
    }
  }

  // G7: Splits sum = total
  // G8: No negative computed amounts
  if (expense.splits && expense.totalAmount) {
    const splitSum = expense.splits.reduce((sum, s) => sum + s.computedAmount, 0);
    if (Math.abs(splitSum - expense.totalAmount) > 0.001) {
      errors.push(`The split amounts do not add up to the total. Difference: ${(expense.totalAmount - splitSum).toFixed(2)}`);
      diffs.splitSum = expense.totalAmount - splitSum;
    }

    for (const s of expense.splits) {
      if (s.computedAmount < 0) {
        errors.push(`Split amount cannot be negative.`);
        break;
      }
    }
  }

  // Multiple payer validation
  if (expense.payerMode === 'multiple' && expense.payers && expense.totalAmount) {
    const nonZeroPayers = expense.payers.filter(p => p.amountPaid > 0);
    if (nonZeroPayers.length < 2) {
      errors.push('At least 2 payers must have non-zero amounts.');
    }

    const payerSum = expense.payers.reduce((sum, p) => sum + p.amountPaid, 0);
    if (Math.abs(payerSum - expense.totalAmount) > 0.001) {
      errors.push(`The amounts paid add up to ${payerSum.toFixed(2)}, but the total is ${expense.totalAmount.toFixed(2)}. Please correct the payer amounts.`);
      diffs.payerSum = expense.totalAmount - payerSum;
    }
  }

  // Single payer validation
  if (expense.payerMode === 'single' && (!expense.payers || expense.payers.length === 0)) {
    errors.push('Please specify who paid for this expense.');
  }

  // Self-exclusion: sole payer only
  if (expense.participants && expense.payers) {
    const inactivePayers = expense.participants.filter(
      p => !p.isActive && expense.payers!.some(py => py.userId === p.userId)
    );
    if (inactivePayers.length > 0 && expense.payerMode === 'multiple') {
      errors.push('Self-exclusion is only valid when the self-excluded user is the sole payer.');
    }
  }

  return { isValid: errors.length === 0, errors, diffs };
}

/**
 * Validate splits for a specific split method.
 */
export function validateSplits(
  totalAmount: number,
  splits: Split[],
  method: SplitMethod,
): ValidationResult {
  const errors: string[] = [];
  const diffs: Record<string, number> = {};

  const activeSplits = splits.filter(s => s.computedAmount > 0 || s.value !== 0);

  switch (method) {
    case 'exact': {
      const sum = activeSplits.reduce((s, split) => s + split.computedAmount, 0);
      if (Math.abs(sum - totalAmount) > 0.001) {
        errors.push(`The amounts entered add up to ${sum.toFixed(2)}. Please adjust them to match the total of ${totalAmount.toFixed(2)}. Difference: ${(totalAmount - sum).toFixed(2)}.`);
        diffs.exactSum = totalAmount - sum;
      }
      for (const s of activeSplits) {
        if (s.computedAmount < 0) errors.push('All amounts must be >= 0');
      }
      break;
    }

    case 'percentage': {
      const totalPct = activeSplits.reduce((s, split) => s + split.value, 0);
      if (Math.abs(totalPct - 100) > 0.001) {
        errors.push(`Percentages add up to ${totalPct.toFixed(2)}%. Please adjust them to total exactly 100%.`);
        diffs.percentageSum = 100 - totalPct;
      }
      for (const s of activeSplits) {
        if (s.value <= 0) errors.push('All percentages must be > 0');
      }
      break;
    }

    case 'shares': {
      for (const s of activeSplits) {
        if (s.value <= 0) errors.push('All share values must be > 0');
      }
      break;
    }

    case 'adjustment': {
      const totalAdjustment = activeSplits.reduce((s, split) => s + split.value, 0);
      if (Math.abs(totalAdjustment) > 0.001) {
        errors.push(`The adjustments are off by ${totalAdjustment.toFixed(2)}. They must cancel out to zero.`);
        diffs.adjustmentSum = -totalAdjustment;
      }
      const base = totalAmount / activeSplits.length;
      for (const s of activeSplits) {
        if (base + s.value < 0) {
          errors.push(`Adjustment would produce a negative amount.`);
        }
      }
      break;
    }

    case 'equal':
    default:
      // No extra validation needed
      break;
  }

  return { isValid: errors.length === 0, errors, diffs };
}

/**
 * Validate payers configuration.
 */
export function validatePayers(
  totalAmount: number,
  payers: Payer[],
  mode: 'single' | 'multiple',
): ValidationResult {
  const errors: string[] = [];
  const diffs: Record<string, number> = {};

  if (mode === 'single') {
    if (!payers || payers.length === 0 || payers.every(p => p.amountPaid === 0)) {
      errors.push('Please specify who paid for this expense.');
    }
  }

  if (mode === 'multiple') {
    const nonZeroPayers = payers.filter(p => p.amountPaid > 0);
    if (nonZeroPayers.length < 2) {
      errors.push('At least 2 payers must have non-zero amounts.');
    }

    const sum = payers.reduce((s, p) => s + p.amountPaid, 0);
    if (Math.abs(sum - totalAmount) > 0.001) {
      errors.push(`The amounts paid add up to ${sum.toFixed(2)}, but the total is ${totalAmount.toFixed(2)}. Please correct the payer amounts.`);
      diffs.payerSum = totalAmount - sum;
    }
  }

  return { isValid: errors.length === 0, errors, diffs };
}

/**
 * Validate participants configuration.
 */
export function validateParticipants(
  participants: Participant[],
  payers: Payer[],
): ValidationResult {
  const errors: string[] = [];
  const diffs: Record<string, number> = {};

  const activeCount = participants.filter(p => p.isActive).length;
  if (activeCount < 2) {
    errors.push('You need at least 2 people to split an expense.');
  }

  // Check if any payer is inactive (self-exclusion scenario)
  const payerIds = new Set(payers.map(p => p.userId));
  const inactivePayers = participants.filter(p => !p.isActive && payerIds.has(p.userId));
  if (inactivePayers.length > 0 && payers.length > 1) {
    errors.push('Self-exclusion is only valid when the self-excluded user is the sole payer.');
  }

  return { isValid: errors.length === 0, errors, diffs };
}
