import { Share, Alert, Platform } from 'react-native';
import RNFS from 'react-native-fs';
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
      'Type,Date,Description,Amount,Currency,Category,Group,SplitMethod,Status',
    ];

    for (const e of expenses) {
      rows.push(
        [
          'Expense',
          escapeCsv(new Date(e.date).toLocaleDateString()),
          escapeCsv(e.notes || ''),
          escapeCsv(e.amount.toFixed(2)),
          escapeCsv(e.currency || ''),
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
          escapeCsv(b.currency || ''),
          escapeCsv(b.category),
          '',
          '',
          escapeCsv(b.status),
        ].join(','),
      );
    }

    const csv = rows.join('\n');
    const fileName = `fincoord_export_${new Date().toISOString().slice(0, 10)}.csv`;
    const path = `${RNFS.TemporaryDirectoryPath}/${fileName}`;

    await RNFS.writeFile(path, csv, 'utf8');

    const fileUrl = Platform.OS === 'android' ? `file://${path}` : path;

    await Share.share({
      title: 'FinCoord Export',
      message: 'Here is your FinCoord data export.',
      url: fileUrl,
    });
  } catch (err: any) {
    Alert.alert('Export Failed', err?.message || 'Could not export data. Please try again.');
  }
}
