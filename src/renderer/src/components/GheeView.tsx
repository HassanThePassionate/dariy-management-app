import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { StockLedgerView } from './StockLedgerView';

export const GheeView: React.FC = () => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  return (
    <StockLedgerView
      title={ur ? 'دیسی گھی اسٹاک اور منافع' : 'Desi Ghee Stock & Profit'}
      subtitle={
        ur
          ? 'گھی کی خریداری، فروخت، موجود اسٹاک اور خالص منافع کا ریکارڈ رکھیں'
          : 'Track ghee procurement, sales, available stock balance, and net profit margins'
      }
      unit="Kg"
      getAll={() => window.electronAPI!.getGheeTransactions()}
      addTxn={(g) => window.electronAPI!.addGheeTransaction(g)}
      updateTxn={(id, g) => window.electronAPI!.updateGheeTransaction(id, g)}
      deleteTxn={(id) => window.electronAPI!.deleteGheeTransaction(id)}
    />
  );
};
