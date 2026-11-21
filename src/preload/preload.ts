import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  getDbInfo: () => Promise<{
    success: boolean;
    isConnected: boolean;
    dbPath: string;
    userDataPath: string;
    appVersion: string;
    error?: string;
  }>;
  getSettings: () => Promise<Record<string, string>>;
  setSetting: (key: string, value: string) => Promise<{ success: boolean }>;
  getDashboardStats: (month?: string) => Promise<{
    selectedMonth?: string;
    totalMilk: number;
    totalCustomers: number;
    todaySale: number;
    monthSale?: number;
    totalDue: number;
    todayMilk?: number;
    todayPosQty?: number;
    todayKhataQty?: number;
    monthBilled?: number;
    todayPurchased?: number;
    todayPurchaseCost?: number;
    monthPurchased?: number;
    monthPurchaseCost?: number;
    stockAvailable?: number;
    stockOpeningToday?: number;
    supplierPayable?: number;
    suppliersCount?: number;
    todayExpenses?: number;
    monthExpenses?: number;
    gheeStock?: number;
    gheeProfit?: number;
    shopperStock?: number;
    activeRate?: number;
    monthCollected?: number;
    topDue?: Array<{ id: number; name: string; phone?: string; balance: number }>;
    recentTransactions: any[];
  }>;
  getTasks: () => Promise<Array<{ id: number; title: string; status: string; created_at: string }>>;
  addTask: (title: string, status?: string) => Promise<{ id: number; title: string; status: string; success: boolean }>;
  deleteTask: (id: number) => Promise<{ success: boolean }>;
  getCustomers: () => Promise<Array<{
    id: number;
    name: string;
    phone: string;
    address: string;
    default_rate: number;
    balance: number;
    previous_balance: number;
    sort_order: number;
    whatsapp_consent?: boolean;
    whatsapp_opt_out_at?: string;
  }>>;
  addCustomer: (customer: {
    name: string;
    phone: string;
    address: string;
    default_rate: number;
    previous_balance?: number;
    shift?: string;
    position?: number;
    whatsapp_consent?: boolean;
  }) => Promise<{ id: number; success: boolean }>;
  updateCustomer: (customer: {
    id: number;
    name: string;
    phone: string;
    address: string;
    default_rate: number;
    previous_balance?: number;
    shift?: string;
    position?: number;
    whatsapp_consent?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteCustomer: (id: number) => Promise<{ success: boolean }>;
  deleteCustomers: (ids: number[]) => Promise<{ success: boolean; deleted: number }>;
  reorderCustomers: (orderedIds: number[]) => Promise<{ success: boolean }>;
  getSales: (filters?: { dateFrom?: string; dateTo?: string; customerId?: number; status?: string }) => Promise<any[]>;
  addSale: (sale: {
    date: string;
    customerId: number;
    customerName: string;
    quantity: number;
    rate: number;
    totalAmount: number;
    paymentStatus: string;
    notes?: string;
  }) => Promise<{ id: number; success: boolean }>;
  getKhataMonth: (month: string) => Promise<{
    customers: Array<{
      id: number;
      name: string;
      phone: string;
      address: string;
      default_rate: number;
      sort_order: number;
    }>;
    entries: Array<{ customer_id: number; entry_date: string; quantity: number }>;
    received: Array<{ customer_id: number; amount: number }>;
  }>;
  setKhataEntry: (payload: {
    customerId: number;
    date: string;
    quantity: number;
    cleared?: boolean;
  }) => Promise<{ success: boolean; cleared?: boolean; error?: string }>;
  setKhataReceived: (payload: {
    customerId: number;
    month: string;
    amount: number;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteKhataCustomerMonth: (payload: { customerId: number; month: string }) => Promise<{ success: boolean }>;
  openExternal: (url: string) => Promise<{ success: boolean }>;
  getMonthlyRecords: () => Promise<any[]>;
  setKhataPrevious: (p: { customerId: number; month: string; amount: number | null }) => Promise<{ success: boolean }>;
  getSuppliers: (month: string) => Promise<any[]>;
  addSupplier: (s: any) => Promise<{ success: boolean; id?: number; error?: string }>;
  updateSupplier: (s: any) => Promise<{ success: boolean; error?: string }>;
  deleteSupplier: (id: number) => Promise<{ success: boolean }>;
  deleteSuppliers: (ids: number[]) => Promise<{ success: boolean; deleted: number }>;
  addSupplierPurchase: (p: any) => Promise<{ success: boolean; error?: string }>;
  addSupplierPayment: (p: any) => Promise<{ success: boolean; error?: string }>;
  getSupplierLedger: (id: number) => Promise<{ purchases: any[]; payments: any[] }>;
  deleteSupplierPurchase: (id: number) => Promise<{ success: boolean }>;
  updateSupplierPurchase: (p: { id: number; date?: string; liters: number; rate: number }) => Promise<{ success: boolean; error?: string }>;
  deleteAllStockPurchases: (month: string) => Promise<{ success: boolean }>;
  deleteSupplierPayment: (id: number) => Promise<{ success: boolean }>;
  getStockMonth: (month: string) => Promise<any>;
  getStockDay: (date: string) => Promise<any>;
  saveStockDay: (payload: any) => Promise<{ success: boolean; error?: string }>;
  getStockHistory: (limit?: number) => Promise<any[]>;
  deleteDailyStockRecord: (id: number) => Promise<{ success: boolean }>;
  deleteAllDailyStockRecords: () => Promise<{ success: boolean }>;
  getExpenses: (month: string) => Promise<any[]>;
  addExpense: (x: any) => Promise<{ success: boolean; id?: number; error?: string }>;
  deleteExpense: (id: number) => Promise<{ success: boolean }>;
  updateExpense: (x: any) => Promise<{ success: boolean; error?: string }>;
  getGheeTransactions: () => Promise<any[]>;
  addGheeTransaction: (g: any) => Promise<{ success: boolean; id?: number; error?: string }>;
  updateGheeTransaction: (id: number, g: any) => Promise<{ success: boolean; error?: string }>;
  deleteGheeTransaction: (id: number) => Promise<{ success: boolean }>;
  getShopperTransactions: () => Promise<any[]>;
  addShopperTransaction: (s: any) => Promise<{ success: boolean; id?: number; error?: string }>;
  updateShopperTransaction: (id: number, s: any) => Promise<{ success: boolean; error?: string }>;
  deleteShopperTransaction: (id: number) => Promise<{ success: boolean }>;
  sendTwilioWhatsApp: (p: { to: string; message: string }) => Promise<{ success: boolean; messageSid?: string; error?: string }>;
  getBillSettings: () => Promise<any>;
  saveBillSettings: (s: any) => Promise<{ success: boolean }>;
  getSupplierSheet: (month: string, shift?: string) => Promise<any>;
  setSupplierCell: (p: { supplierId: number; date: string; liters: number; shift?: string }) => Promise<{ success: boolean }>;
  bulkFillSupplier: (p: any) => Promise<{ success: boolean; updated: number; error?: string }>;
  deleteSupplierMonth: (p: { supplierId: number; month: string; shift?: string }) => Promise<{ success: boolean }>;
  setSupplierPrevious: (p: { supplierId: number; month: string; amount: number }) => Promise<{ success: boolean }>;
  addPosSale: (sale: { date: string; customerName?: string; quantity: number; rate: number; paymentMethod: string; notes?: string }) => Promise<{ success: boolean; id?: number; error?: string }>;
  updatePosSale: (sale: { id: number; date: string; customerName?: string; quantity: number; rate: number; paymentMethod: string; notes?: string }) => Promise<{ success: boolean; error?: string }>;
  getPosSales: (date?: string) => Promise<any[]>;
  markPosPaid: (id: number, method: string) => Promise<{ success: boolean }>;
  deletePosSale: (id: number) => Promise<{ success: boolean }>;
  bulkFillKhata: (payload: {
    customerIds: number[];
    month: string;
    fromDay: number;
    toDay: number;
    quantity: number;
  }) => Promise<{ success: boolean; updated: number; error?: string }>;
  getOperators: () => Promise<any[]>;
  addOperator: (op: { username: string; name: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  deleteOperator: (id: number) => Promise<{ success: boolean }>;
  changePassword: (p: { currentPassword: string; newPassword: string }) => Promise<{ success: boolean; error?: string }>;
  updateAdminCredentials: (p: { username?: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  getPricing: () => Promise<{ currentRate: number; previousRate: number; active_rate?: number; history: any[] }>;
  savePricing: (p: { rate: number; effectiveFrom: string; recalculate?: boolean }) => Promise<{ success: boolean; error?: string }>;
  getBackupOverview: () => Promise<any>;
  backupToUsb: (driveLetter?: string) => Promise<{ success: boolean; copiedTo?: string[]; error?: string }>;
  exportDbBackup: () => Promise<{ success: boolean; path?: string; error?: string }>;
  restoreDbBackup: () => Promise<{ success: boolean; error?: string }>;
  exportJsonBackup: () => Promise<{ success: boolean; path?: string; error?: string }>;
  exportCsvBackup: () => Promise<{ success: boolean; path?: string; error?: string }>;
  getWhatsAppStatus: () => Promise<any>;
  disconnectWhatsApp: () => Promise<{ success: boolean }>;
  getVehicles: () => Promise<any[]>;
  addVehicle: (v: { name: string; regNumber: string; type?: string; assignedTo?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteVehicle: (id: number) => Promise<{ success: boolean }>;

  // Cloud & WhatsApp Cloud API
  getCloudConfig: () => Promise<{ apiUrl: string; apiKey: string; deviceId: string }>;
  saveCloudConfig: (c: { apiUrl?: string; apiKey?: string; deviceId?: string }) => Promise<{ success: boolean }>;
  getCloudConnectionStatus: () => Promise<{
    isOnline: boolean;
    isBackendReachable: boolean;
    apiUrl: string;
    backendVersion?: string;
    backendComponents?: any;
    error?: string;
  }>;
  performCloudSync: () => Promise<{ success: boolean; counts?: any; serverTimestamp?: string; error?: string }>;
  getCloudSyncMeta: () => Promise<{ lastSyncAt: string | null; lastError?: string }>;
  createCloudBackup: (notes?: string) => Promise<{
    success: boolean;
    backupId?: string;
    checksum?: string;
    sizeBytes?: number;
    error?: string;
    cancelled?: boolean;
  }>;
  cancelCloudBackup: () => Promise<{ cancelled: boolean }>;
  getCloudBackupHistory: () => Promise<{ success: boolean; backups?: any[]; error?: string }>;
  restoreCloudBackup: (backupId: string) => Promise<{ success: boolean; safetyBackupPath?: string; error?: string }>;
  getWhatsAppCloudStatus: () => Promise<{
    configured: boolean;
    connected: boolean;
    displayPhoneNumber?: string;
    verifiedName?: string;
    qualityRating?: string;
    templateStatus?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
    error?: string;
  }>;
  connectWhatsApp: (payload?: { force?: boolean }) => Promise<any>;
  disconnectWhatsApp: () => Promise<any>;
  getWhatsAppStatus: () => Promise<any>;
  enqueueWhatsAppBills: (payload: { items: any[]; speedPreset?: string; force?: boolean }) => Promise<{ enqueued: number; skipped: number }>;
  pauseWhatsAppQueue: () => Promise<any>;
  resumeWhatsAppQueue: (payload?: { month?: string }) => Promise<any>;
  clearWhatsAppQueue: (payload?: { month?: string; scope?: 'all' | 'queued' | 'failed' }) => Promise<any>;
  clearFailedWhatsAppQueue: (payload?: { month?: string }) => Promise<any>;
  clearWhatsAppQueueItem: (payload: { customerId: number; month?: string }) => Promise<any>;
  retryFailedWhatsAppQueue: (payload?: { month?: string }) => Promise<any>;
  getWhatsAppQueueStatus: (month?: string) => Promise<any>;
  getWhatsAppQueueItems: (month: string) => Promise<any[]>;
  getWhatsAppBillStatusMap: (month: string) => Promise<Record<number, { status: string; sentAt?: string }>>;
  setWhatsAppSpeedPreset: (preset: string) => Promise<any>;
  sendSingleBillDirect: (payload: { item: any; settings: any }) => Promise<any>;
  sendReceiptDirect: (payload: { item: any; settings: any }) => Promise<any>;
  onWhatsAppQR: (callback: (qr: string) => void) => () => void;
  onWhatsAppStatus: (callback: (status: any) => void) => () => void;
  onWhatsAppQueueProgress: (callback: (progress: any) => void) => () => void;
  sendWhatsAppSingleBill: (payload: { item: any; settings: any; force?: boolean }) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    duplicate?: boolean;
  }>;
  getWhatsAppLogs: (month: string) => Promise<any[]>;
  setWhatsAppConsent: (payload: { customerId: number; consent: boolean }) => Promise<{ success: boolean }>;
  renderBillImage: (data: any) => Promise<{ success: boolean; filePath?: string; error?: string }>;

  // Application Shutdown Lifecycle
  confirmForceClose: () => Promise<void>;
  cancelClose: () => Promise<void>;
  performCloseBackup: () => Promise<any>;
  onShowCloseBackupModal: (callback: (data: { scenario: 'A' | 'B' | 'C'; error?: string }) => void) => () => void;
  onBackupCloseProgress: (callback: (data: { stage: string; percent?: number }) => void) => () => void;
  onBackupProgress: (callback: (data: { stage: string; percent?: number }) => void) => () => void;
  onRestoreProgress: (callback: (data: { stage: string; percent?: number }) => void) => () => void;
}

const api: ElectronAPI = {
  getDbInfo: () => ipcRenderer.invoke('db:getInfo'),
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getDashboardStats: (month?: string) => ipcRenderer.invoke('dashboard:getStats', month),
  getTasks: () => ipcRenderer.invoke('tasks:getAll'),
  addTask: (title, status) => ipcRenderer.invoke('tasks:add', title, status),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),
  getCustomers: () => ipcRenderer.invoke('customers:getAll'),
  addCustomer: (customer) => ipcRenderer.invoke('customers:add', customer),
  updateCustomer: (customer) => ipcRenderer.invoke('customers:update', customer),
  deleteCustomer: (id) => ipcRenderer.invoke('customers:delete', id),
  deleteCustomers: (ids) => ipcRenderer.invoke('customers:deleteMany', ids),
  reorderCustomers: (orderedIds) => ipcRenderer.invoke('customers:reorder', orderedIds),
  getSales: (filters) => ipcRenderer.invoke('sales:getAll', filters),
  addSale: (sale) => ipcRenderer.invoke('sales:add', sale),
  getKhataMonth: (month) => ipcRenderer.invoke('khata:getMonth', month),
  setKhataEntry: (payload) => ipcRenderer.invoke('khata:setEntry', payload),
  setKhataReceived: (payload) => ipcRenderer.invoke('khata:setReceived', payload),
  bulkFillKhata: (payload) => ipcRenderer.invoke('khata:bulkFill', payload),
  deleteKhataCustomerMonth: (payload) => ipcRenderer.invoke('khata:deleteCustomerMonth', payload),
  getMonthlyRecords: () => ipcRenderer.invoke('records:monthly'),
  setKhataPrevious: (p) => ipcRenderer.invoke('khata:setPrevious', p),
  getSuppliers: (month) => ipcRenderer.invoke('suppliers:list', month),
  addSupplier: (s) => ipcRenderer.invoke('suppliers:add', s),
  updateSupplier: (s) => ipcRenderer.invoke('suppliers:update', s),
  deleteSupplier: (id) => ipcRenderer.invoke('suppliers:delete', id),
  deleteSuppliers: (ids) => ipcRenderer.invoke('suppliers:deleteMany', ids),
  addSupplierPurchase: (p) => ipcRenderer.invoke('suppliers:addPurchase', p),
  addSupplierPayment: (p) => ipcRenderer.invoke('suppliers:addPayment', p),
  getSupplierLedger: (id) => ipcRenderer.invoke('suppliers:ledger', id),
  deleteSupplierPurchase: (id) => ipcRenderer.invoke('suppliers:deletePurchase', id),
  updateSupplierPurchase: (p) => ipcRenderer.invoke('suppliers:updatePurchase', p),
  deleteAllStockPurchases: (month) => ipcRenderer.invoke('stock:deleteAllPurchases', month),
  deleteSupplierPayment: (id) => ipcRenderer.invoke('suppliers:deletePayment', id),
  getStockMonth: (month) => ipcRenderer.invoke('stock:getMonth', month),
  getStockDay: (date) => ipcRenderer.invoke('stock:getDay', date),
  saveStockDay: (payload) => ipcRenderer.invoke('stock:saveDay', payload),
  getStockHistory: (limit) => ipcRenderer.invoke('stock:getHistory', limit),
  deleteDailyStockRecord: (id) => ipcRenderer.invoke('stock:deleteDailyRecord', id),
  deleteAllDailyStockRecords: () => ipcRenderer.invoke('stock:deleteAllDailyRecords'),
  getExpenses: (month) => ipcRenderer.invoke('expenses:list', month),
  addExpense: (x) => ipcRenderer.invoke('expenses:add', x),
  deleteExpense: (id) => ipcRenderer.invoke('expenses:delete', id),
  updateExpense: (x) => ipcRenderer.invoke('expenses:update', x),
  getGheeTransactions: () => ipcRenderer.invoke('ghee:list'),
  addGheeTransaction: (g) => ipcRenderer.invoke('ghee:add', g),
  updateGheeTransaction: (id, g) => ipcRenderer.invoke('ghee:update', id, g),
  deleteGheeTransaction: (id) => ipcRenderer.invoke('ghee:delete', id),
  getShopperTransactions: () => ipcRenderer.invoke('shopper:list'),
  addShopperTransaction: (s) => ipcRenderer.invoke('shopper:add', s),
  updateShopperTransaction: (id, s) => ipcRenderer.invoke('shopper:update', id, s),
  deleteShopperTransaction: (id) => ipcRenderer.invoke('shopper:delete', id),
  sendTwilioWhatsApp: (p) => ipcRenderer.invoke('twilio:send', p),
  getBillSettings: () => ipcRenderer.invoke('billSettings:get'),
  saveBillSettings: (s) => ipcRenderer.invoke('billSettings:save', s),
  getSupplierSheet: (month, shift) => ipcRenderer.invoke('ssheet:getMonth', month, shift),
  setSupplierCell: (p) => ipcRenderer.invoke('ssheet:setCell', p),
  bulkFillSupplier: (p) => ipcRenderer.invoke('ssheet:bulkFill', p),
  deleteSupplierMonth: (p) => ipcRenderer.invoke('ssheet:deleteMonth', p),
  setSupplierPrevious: (p) => ipcRenderer.invoke('ssheet:setPrevious', p),
  addPosSale: (sale) => ipcRenderer.invoke('pos:add', sale),
  updatePosSale: (sale) => ipcRenderer.invoke('pos:update', sale),
  getPosSales: (date) => ipcRenderer.invoke('pos:list', date),
  markPosPaid: (id, method) => ipcRenderer.invoke('pos:markPaid', id, method),
  deletePosSale: (id) => ipcRenderer.invoke('pos:delete', id),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  getOperators: () => ipcRenderer.invoke('operators:list'),
  addOperator: (op) => ipcRenderer.invoke('operators:add', op),
  deleteOperator: (id) => ipcRenderer.invoke('operators:delete', id),
  changePassword: (p) => ipcRenderer.invoke('auth:changePassword', p),
  updateAdminCredentials: (p) => ipcRenderer.invoke('auth:updateAdminCredentials', p),
  getPricing: () => ipcRenderer.invoke('pricing:get'),
  savePricing: (p) => ipcRenderer.invoke('pricing:save', p),
  getBackupOverview: () => ipcRenderer.invoke('backup:getOverview'),
  backupToUsb: (driveLetter) => ipcRenderer.invoke('backup:toUsb', driveLetter),
  exportDbBackup: () => ipcRenderer.invoke('backup:exportDb'),
  restoreDbBackup: () => ipcRenderer.invoke('backup:restoreDb'),
  exportJsonBackup: () => ipcRenderer.invoke('backup:exportJson'),
  exportCsvBackup: () => ipcRenderer.invoke('backup:exportCsv'),
  connectWhatsApp: (payload) => ipcRenderer.invoke('whatsapp:connect', payload),
  getWhatsAppStatus: () => ipcRenderer.invoke('whatsapp:getStatus'),
  disconnectWhatsApp: () => ipcRenderer.invoke('whatsapp:disconnect'),
  enqueueWhatsAppBills: (payload) => ipcRenderer.invoke('whatsapp:enqueueBills', payload),
  pauseWhatsAppQueue: () => ipcRenderer.invoke('whatsapp:pauseQueue'),
  resumeWhatsAppQueue: (payload) => ipcRenderer.invoke('whatsapp:resumeQueue', payload),
  clearWhatsAppQueue: (payload) => ipcRenderer.invoke('whatsapp:clearQueue', payload),
  clearFailedWhatsAppQueue: (payload) => ipcRenderer.invoke('whatsapp:clearFailedQueue', payload),
  clearWhatsAppQueueItem: (payload) => ipcRenderer.invoke('whatsapp:clearQueueItem', payload),
  retryFailedWhatsAppQueue: (payload) => ipcRenderer.invoke('whatsapp:retryFailed', payload),
  getWhatsAppQueueStatus: (month) => ipcRenderer.invoke('whatsapp:getQueueStatus', month),
  getWhatsAppQueueItems: (month) => ipcRenderer.invoke('whatsapp:getQueueItems', month),
  getWhatsAppBillStatusMap: (month) => ipcRenderer.invoke('whatsapp:getBillStatusMap', month),
  setWhatsAppSpeedPreset: (preset) => ipcRenderer.invoke('whatsapp:setSpeedPreset', preset),
  sendSingleBillDirect: (payload) => ipcRenderer.invoke('whatsapp:sendSingleBillDirect', payload),
  sendReceiptDirect: (payload) => ipcRenderer.invoke('whatsapp:sendReceiptDirect', payload),
  onWhatsAppQR: (callback) => {
    const listener = (_e: any, qr: string) => callback(qr);
    ipcRenderer.on('whatsapp:qr', listener);
    return () => {
      ipcRenderer.removeListener('whatsapp:qr', listener);
    };
  },
  onWhatsAppStatus: (callback) => {
    const listener = (_e: any, status: any) => callback(status);
    ipcRenderer.on('whatsapp:status', listener);
    return () => {
      ipcRenderer.removeListener('whatsapp:status', listener);
    };
  },
  onWhatsAppQueueProgress: (callback) => {
    const listener = (_e: any, progress: any) => callback(progress);
    ipcRenderer.on('whatsapp:queue-progress', listener);
    return () => {
      ipcRenderer.removeListener('whatsapp:queue-progress', listener);
    };
  },
  getVehicles: () => ipcRenderer.invoke('vehicles:list'),
  addVehicle: (v) => ipcRenderer.invoke('vehicles:add', v),
  deleteVehicle: (id) => ipcRenderer.invoke('vehicles:delete', id),

  // Cloud & WhatsApp Cloud API implementations
  getCloudConfig: () => ipcRenderer.invoke('cloud:getConfig'),
  saveCloudConfig: (c) => ipcRenderer.invoke('cloud:saveConfig', c),
  getCloudConnectionStatus: () => ipcRenderer.invoke('cloud:getConnectionStatus'),
  performCloudSync: () => ipcRenderer.invoke('cloud:sync'),
  getCloudSyncMeta: () => ipcRenderer.invoke('cloud:getSyncMeta'),
  createCloudBackup: (notes) => ipcRenderer.invoke('cloud:createBackup', notes),
  cancelCloudBackup: () => ipcRenderer.invoke('cloud:cancelBackup'),
  getCloudBackupHistory: () => ipcRenderer.invoke('cloud:getHistory'),
  restoreCloudBackup: (backupId) => ipcRenderer.invoke('cloud:restoreBackup', backupId),
  getWhatsAppCloudStatus: () => ipcRenderer.invoke('whatsapp:getCloudStatus'),
  sendWhatsAppSingleBill: (payload) => ipcRenderer.invoke('whatsapp:sendSingleBill', payload),
  getWhatsAppLogs: (month) => ipcRenderer.invoke('whatsapp:getLogs', month),
  setWhatsAppConsent: (payload) => ipcRenderer.invoke('whatsapp:setConsent', payload),
  renderBillImage: (data) => ipcRenderer.invoke('bill:renderImage', data),

  // Application Shutdown Lifecycle
  confirmForceClose: () => ipcRenderer.invoke('app:confirmForceClose'),
  cancelClose: () => ipcRenderer.invoke('app:cancelClose'),
  performCloseBackup: () => ipcRenderer.invoke('app:performCloseBackup'),
  onShowCloseBackupModal: (callback) => {
    const listener = (_e: any, data: any) => callback(data);
    ipcRenderer.on('app:show-close-backup-modal', listener);
    return () => {
      ipcRenderer.removeListener('app:show-close-backup-modal', listener);
    };
  },
  onBackupCloseProgress: (callback) => {
    const listener = (_e: any, data: any) => callback(data);
    ipcRenderer.on('backup:close-progress', listener);
    return () => {
      ipcRenderer.removeListener('backup:close-progress', listener);
    };
  },
  onBackupProgress: (callback) => {
    const listener = (_e: any, data: any) => callback(data);
    ipcRenderer.on('backup:progress', listener);
    return () => {
      ipcRenderer.removeListener('backup:progress', listener);
    };
  },
  onRestoreProgress: (callback) => {
    const listener = (_e: any, data: any) => callback(data);
    ipcRenderer.on('restore:progress', listener);
    return () => {
      ipcRenderer.removeListener('restore:progress', listener);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
