import { Share, Alert, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { Expense } from '../types';

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function exportDataToCSV(expenses: Expense[]) {
  try {
    const rows: string[] = [
      'Type,Date,Title,Amount,Currency,Category,Group,SplitMethod',
    ];

    for (const e of expenses) {
      rows.push(
        [
          'Expense',
          escapeCsv(new Date(e.date).toLocaleDateString()),
          escapeCsv(e.title || ''),
          escapeCsv((e.totalAmount ?? 0).toFixed(2)),
          escapeCsv(e.currency || ''),
          escapeCsv(e.category || ''),
          escapeCsv(e.groupId || ''),
          escapeCsv(e.splitMethod),
        ].join(','),
      );
    }

    const csv = rows.join('\n');
    const fileName = `onthetab_export_${new Date().toISOString().slice(0, 10)}.csv`;
    const path = `${RNFS.TemporaryDirectoryPath}/${fileName}`;

    await RNFS.writeFile(path, csv, 'utf8');

    const fileUrl = Platform.OS === 'android' ? `file://${path}` : path;

    await Share.share({
      title: 'OnTheTab Export',
      message: 'Here is your OnTheTab data export.',
      url: fileUrl,
    });
  } catch (err: any) {
    Alert.alert('Export Failed', err?.message || 'Could not export data. Please try again.');
  }
}
