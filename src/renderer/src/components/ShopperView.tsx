import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { StockLedgerView } from './StockLedgerView';

const SIZES = ['5*7', '6*8', '7*9', '8*11', '8*12', '10*13', '10*14', '10*16', '12*15', '12*16', '15*18'];

export const ShopperView: React.FC = () => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  return (
    <StockLedgerView
      title={ur ? 'شاپر بیگز اور پیکنگ اسٹاک' : 'Shopper Bags & Packing Stock'}
      subtitle={
        ur
          ? 'شاپر بیگز کی خریداری، استعمال/فروخت، موجود بیلنس اور منافع کا ریکارڈ رکھیں'
          : 'Track packing bags procurement, usage/sales, available balance, and expense margins'
      }
      unit="Kg"
      sizeOptions={SIZES}
      quickQtys={['5', '10', '20', '50']}
      getAll={() => window.electronAPI!.getShopperTransactions()}
      addTxn={(s) => window.electronAPI!.addShopperTransaction(s)}
      updateTxn={(id, s) => window.electronAPI!.updateShopperTransaction(id, s)}
      deleteTxn={(id) => window.electronAPI!.deleteShopperTransaction(id)}
    />
  );
};
