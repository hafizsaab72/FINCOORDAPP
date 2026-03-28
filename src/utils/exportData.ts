import { Share, Alert } from 'react-native';
import { Expense, Bill } from '../types';

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function exportDataToCSV(expenses: Expense[], bills: Bill[]) {
  try {
    const rows: string[] = [
      'Type,Date,Description,Amount,Category,Group,SplitMethod,Status',
    ];

    for (const e of expenses) {
      rows.push(
        [
          'Expense',
          escapeCsv(new Date(e.date).toLocaleDateString()),
          escapeCsv(e.notes || ''),
          escapeCsv(e.amount.toFixed(2)),
          '',
          escapeCsv(e.groupId),
          escapeCsv(e.splitMethod),
          '',
        ].join(','),
      );
    }

    for (const b of bills) {
      rows.push(
        [
          'Bill',
          escapeCsv(new Date(b.dueDate).toLocaleDateString()),
          escapeCsv(b.title),
          escapeCsv(b.amount.toFixed(2)),
          escapeCsv(b.category),
          '',
          '',
          escapeCsv(b.status),
        ].join(','),
      );
    }

    const csv = rows.join('\n');
    await Share.share({
      title: 'FinCoord Export',
      message: csv,
    });
  } catch {
    Alert.alert('Export Failed', 'Could not export data. Please try again.');
  }
}
