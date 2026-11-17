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
  getDashboardStats: () => Promise<{
    totalMilk: number;
    totalCustomers: number;
    todaySale: number;
    totalDue: number;
    todayMilk?: number;
    monthBilled?: number;
    todayPurchased?: number;
    todayPurchaseCost?: number;
    stockAvailable?: number;
    stockOpeningToday?: number;
    supplierPayable?: number;
    monthCollected?: number;
    topDue?: Array<{ id: number; name: string; balance: number }>;
    recentTransactions: Array<{
      id: number;
      date: string;
      customerName: string;
      quantity: number;
      rate: number;
      totalAmount: number;
      paymentStatus: 'Paid' | 'Due';
      notes?: string;
      created_at: string;
    }>;
  }>;
  getTasks: () => Promise<Array<{ id: number; title: string; status: string; created_at: string }>>;
  addTask: (title: string, status?: string) => Promise<{ id: number; title: string; status: string; success: boolean }>;
  deleteTask: (id: number) => Promise<{ success: boolean }>;
  getCustomers: () => Promise<Array<{ id: number; name: string; phone: string; address: string; default_rate: number; balance: number; previous_balance: number; sort_order: number }>>;
  addCustomer: (customer: {
    name: string;
    phone: string;
    address: string;
    default_rate: number;
    previous_balance?: number;
    shift?: string;
    position?: number;
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
  getPricing: () => Promise<{ currentRate: number; previousRate: number; history: any[] }>;
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
}

const api: ElectronAPI = {
  getDbInfo: () => ipcRenderer.invoke('db:getInfo'),
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),
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
  getWhatsAppStatus: () => ipcRenderer.invoke('whatsapp:getStatus'),
  disconnectWhatsApp: () => ipcRenderer.invoke('whatsapp:disconnect'),
  getVehicles: () => ipcRenderer.invoke('vehicles:list'),
  addVehicle: (v) => ipcRenderer.invoke('vehicles:add', v),
  deleteVehicle: (id) => ipcRenderer.invoke('vehicles:delete', id),
};

contextBridge.exposeInMainWorld('electronAPI', api);
