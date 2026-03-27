export const validateExpense = (amount: string, notes: string) => {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return {
      valid: false,
      error: 'Please enter a valid amount greater than 0.',
    };
  }
  if (notes.trim().length < 3) {
    return {
      valid: false,
      error: 'Please provide a brief description (min 3 chars).',
    };
  }
  return { valid: true, error: '' };
};
