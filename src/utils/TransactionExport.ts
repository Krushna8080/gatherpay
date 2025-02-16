import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Transaction } from '../contexts/WalletContext';

export class TransactionExport {
  static async exportToCSV(transactions: Transaction[], fileName: string = 'transactions.csv') {
    try {
      const headers = [
        'Date',
        'Type',
        'Amount',
        'Description',
        'Status',
        'Reference ID'
      ].join(',');

      const rows = transactions.map(transaction => [
        new Date(transaction.timestamp).toLocaleString(),
        transaction.type,
        transaction.amount,
        transaction.description.replace(/,/g, ';'),
        transaction.status,
        transaction.id
      ].join(','));

      const csvContent = [headers, ...rows].join('\n');
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Transactions',
          UTI: 'public.comma-separated-values-text'
        });
      }

      return filePath;
    } catch (error) {
      console.error('Error exporting transactions:', error);
      throw error;
    }
  }

  static async exportToPDF(transactions: Transaction[], fileName: string = 'transactions.pdf') {
    try {
      // TODO: Implement PDF export using react-native-html-to-pdf
      // This will require additional setup and dependencies
      throw new Error('PDF export not implemented yet');
    } catch (error) {
      console.error('Error exporting transactions to PDF:', error);
      throw error;
    }
  }

  static formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  static formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  static generateSummary(transactions: Transaction[]) {
    const summary = {
      totalCredits: 0,
      totalDebits: 0,
      totalTransfers: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      startDate: new Date(),
      endDate: new Date(0)
    };

    transactions.forEach(transaction => {
      // Update date range
      const date = new Date(transaction.timestamp);
      if (date < summary.startDate) summary.startDate = date;
      if (date > summary.endDate) summary.endDate = date;

      // Update transaction counts
      if (transaction.status === 'completed') {
        summary.successfulTransactions++;
        switch (transaction.type) {
          case 'credit':
            summary.totalCredits += transaction.amount;
            break;
          case 'debit':
            summary.totalDebits += transaction.amount;
            break;
          case 'transfer_in':
          case 'transfer_out':
            summary.totalTransfers += transaction.amount;
            break;
        }
      } else if (transaction.status === 'failed') {
        summary.failedTransactions++;
      }
    });

    return summary;
  }
} 