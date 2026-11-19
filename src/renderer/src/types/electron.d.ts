export interface DbInfo {
  success: boolean;
  isConnected: boolean;
  dbPath: string;
  userDataPath: string;
  appVersion: string;
  error?: string;
}

export interface TaskItem {
  id: number;
  title: string;
  status: string;
  created_at: string;
}

export interface CustomerItem {
  id: number;
  name: string;
  phone: string;
  address: string;
  default_rate: number;
  balance: number;
  previous_balance?: number;
  sort_order?: number;
  shift?: string;
  whatsapp_consent?: boolean;
  whatsapp_opt_out_at?: string;
  created_at?: string;
}

export interface SaleItem {
  id: number;
  date: string;
  customerId?: number;
  customer_name?: string;
  customerName?: string;
  quantity: number;
  rate: number;
  total_amount?: number;
  totalAmount?: number;
  payment_status?: 'Paid' | 'Due';
  payment_method?: string;
  paymentStatus?: 'Paid' | 'Due';
  notes?: string;
  created_at?: string;
}

export interface DashboardStats {
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
  monthCollected?: number;
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
  topDue?: Array<{ id: number; name: string; phone?: string; balance: number }>;
  recentTransactions: Array<{
    id: number;
    type: string;
    date: string;
    customerName: string;
    quantity?: number;
    rate?: number;
    totalAmount: number;
    paymentStatus?: string;
    paymentMethod?: string;
    created_at?: string;
  }>;
}

export interface KhataCustomer {
  id: number;
  name: string;
  phone: string;
  address: string;
  default_rate: number;
  sort_order: number;
  shift?: string;
  whatsapp_consent?: boolean;
}

export interface KhataEntry {
  customer_id: number;
  entry_date: string;
  quantity: number;
}

export interface KhataReceived {
  customer_id: number;
  amount: number;
}

export interface KhataMonthData {
  customers: KhataCustomer[];
  entries: KhataEntry[];
  received: KhataReceived[];
  carry: KhataReceived[];
}

export interface MonthlyRecordRow {
  month: string;
  liters: number;
  rate: number;
  bill: number;
  paid: number;
  balance: number;
}

export interface MonthlyRecordCustomer {
  id: number;
  name: string;
  phone: string;
  address?: string;
  openingBalance: number;
  totalLiters: number;
  totalBilled: number;
  totalPaid: number;
  balance: number;
  monthCount: number;
  whatsapp_consent?: boolean;
  rows: MonthlyRecordRow[];
}

export interface SupplierItem {
  id: number;
  name: string;
  phone: string;
  address: string;
  default_rate: number;
  month_liters: number;
  month_amount: number;
  month_paid: number;
  total_liters: number;
  total_amount: number;
  total_paid: number;
}

export interface SupplierPurchase {
  id: number;
  supplier_id: number;
  supplier_name?: string;
  date: string;
  liters: number;
  rate: number;
  total: number;
  paid?: number;
  notes?: string;
  shift?: string;
  created_at?: string;
}

export interface SupplierPayment {
  id: number;
  supplier_id: number;
  date: string;
  amount: number;
  notes?: string;
  created_at?: string;
}

export interface StockMonth {
  purchases: SupplierPurchase[];
  payments: SupplierPayment[];
  summary: {
    totalLiters: number;
    totalCost: number;
    totalPaid: number;
    payable: number;
  };
}

export interface ExpenseItem {
  id: number;
  category: 'Shop' | 'Home' | 'Drawer' | 'Fleet' | 'Other';
  title: string;
  amount: number;
  date: string;
  paid_to?: string;
  source?: string;
  payment_source?: string;
  notes?: string;
}

export interface GheeTransaction {
  id: number;
  type: 'Inward' | 'Outward';
  quantity: number;
  rate: number;
  total: number;
  payment: 'Cash' | 'Udhaar';
  party?: string;
  date: string;
  notes?: string;
  created_at?: string;
}

export interface ShopperTransaction {
  id: number;
  type: 'Inward' | 'Outward';
  sizes?: string;
  quantity: number;
  rate: number;
  total: number;
  payment: 'Cash' | 'Udhaar';
  party?: string;
  date: string;
  notes?: string;
  created_at?: string;
}

export interface BillSettings {
  shop_title: string;
  owner_name: string;
  phone: string;
  bank_name: string;
  account_title: string;
  account_number: string;
}

export interface CloudConfig {
  apiUrl: string;
  apiKey: string;
  deviceId: string;
}

export interface CloudConnectionStatus {
  isOnline: boolean;
  isBackendReachable: boolean;
  apiUrl: string;
  backendVersion?: string;
  backendComponents?: any;
  error?: string;
}

export interface CloudSyncResult {
  success: boolean;
  counts?: any;
  serverTimestamp?: string;
  error?: string;
}

export interface CloudBackupItem {
  id: string;
  deviceId?: string;
  fileName: string;
  fileSizeBytes: number;
  storageKey: string;
  storageUrl?: string;
  sha256Checksum: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface WhatsAppCloudStatus {
  configured: boolean;
  connected: boolean;
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  templateStatus?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  error?: string;
}

export interface WhatsAppBillLog {
  id: number;
  customer_id: number;
  customer_name: string;
  phone: string;
  bill_month: string;
  bill_amount: number;
  liters: number;
  rate: number;
  balance_due: number;
  status: 'pending' | 'processing' | 'sent' | 'delivered' | 'read' | 'failed';
  message_id?: string;
  media_id?: string;
  error_message?: string;
  idempotency_key?: string;
  retry_count: number;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
}

export interface ElectronAPI {
  getDbInfo: () => Promise<DbInfo>;
  getSettings: () => Promise<Record<string, string>>;
  setSetting: (key: string, value: string) => Promise<{ success: boolean }>;
  getDashboardStats: (month?: string) => Promise<DashboardStats>;
  getTasks: () => Promise<TaskItem[]>;
  addTask: (title: string, status?: string) => Promise<{ id: number; title: string; status: string; success: boolean }>;
  deleteTask: (id: number) => Promise<{ success: boolean }>;
  getCustomers: () => Promise<CustomerItem[]>;
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
  getSales: (filters?: { dateFrom?: string; dateTo?: string; customerId?: number; status?: string }) => Promise<SaleItem[]>;
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
  getKhataMonth: (month: string) => Promise<KhataMonthData>;
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
  getMonthlyRecords: () => Promise<MonthlyRecordCustomer[]>;
  setKhataPrevious: (p: { customerId: number; month: string; amount: number | null }) => Promise<{ success: boolean }>;
  getSuppliers: (month?: string) => Promise<SupplierItem[]>;
  addSupplier: (s: { name: string; phone?: string; address?: string; default_rate?: number }) => Promise<{ success: boolean; id?: number; error?: string }>;
  updateSupplier: (s: { id: number; name: string; phone?: string; address?: string; default_rate?: number }) => Promise<{ success: boolean; error?: string }>;
  deleteSupplier: (id: number) => Promise<{ success: boolean }>;
  deleteSuppliers: (ids: number[]) => Promise<{ success: boolean; deleted: number }>;
  addSupplierPurchase: (p: { supplierId: number; date: string; liters: number; rate: number; paid?: number; notes?: string; shift?: string }) => Promise<{ success: boolean; error?: string }>;
  addSupplierPayment: (p: { supplierId: number; date: string; amount: number; notes?: string }) => Promise<{ success: boolean; error?: string }>;
  getSupplierLedger: (id: number) => Promise<{
    purchases: Array<{ id: number; date: string; liters: number; rate: number; total: number; notes?: string }>;
    payments: Array<{ id: number; date: string; amount: number; notes?: string }>;
  }>;
  deleteSupplierPurchase: (id: number) => Promise<{ success: boolean }>;
  updateSupplierPurchase: (p: { id: number; date?: string; liters: number; rate: number }) => Promise<{ success: boolean; error?: string }>;
  deleteAllStockPurchases: (month: string) => Promise<{ success: boolean }>;
  deleteSupplierPayment: (id: number) => Promise<{ success: boolean }>;
  getStockMonth: (month?: string) => Promise<StockMonth>;
  getStockDay: (date: string) => Promise<{
    date: string;
    activeRate: number;
    yesterdayLeftover: number;
    receivedToday: number;
    supplierCount: number;
    receivedTotalCost: number;
    soldToday: number;
    soldPos: number;
    soldKhata: number;
    soldPosRevenue?: number;
    soldKhataRevenue?: number;
    totalSoldRevenue?: number;
    expensesToday?: number;
    profitToday?: number;
    leftoverTomorrow: number;
    dahiKg: number;
    dahiMilkUsed: number;
    notes: string;
    isSaved: boolean;
    id?: number;
  }>;
  saveStockDay: (payload: {
    date: string;
    yesterdayLeftover: number;
    receivedToday: number;
    soldToday: number;
    leftoverTomorrow: number;
    rate: number;
    dahiKg?: number;
    dahiMilkUsed?: number;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  getStockHistory: (limit?: number) => Promise<Array<{
    id: number;
    date: string;
    yesterday_leftover: number;
    received_today: number;
    sold_today: number;
    leftover_tomorrow: number;
    rate: number;
    dahi_kg: number;
    dahi_milk_used: number;
    notes?: string;
    created_at?: string;
  }>>;
  deleteDailyStockRecord: (id: number) => Promise<{ success: boolean }>;
  deleteAllDailyStockRecords: () => Promise<{ success: boolean }>;
  getExpenses: (month: string) => Promise<ExpenseItem[]>;
  addExpense: (x: { category: string; title: string; amount: number; date: string; paidTo?: string; source?: string; notes?: string }) => Promise<{ success: boolean; id?: number; error?: string }>;
  deleteExpense: (id: number) => Promise<{ success: boolean }>;
  updateExpense: (x: { id: number; category: string; title: string; amount: number; date: string; paidTo?: string; source?: string; notes?: string }) => Promise<{ success: boolean; error?: string }>;
  getGheeTransactions: () => Promise<GheeTransaction[]>;
  addGheeTransaction: (g: { type: string; quantity: number; rate: number; payment: string; party?: string; date: string; notes?: string }) => Promise<{ success: boolean; id?: number; error?: string }>;
  updateGheeTransaction: (id: number, g: { type: string; quantity: number; rate: number; payment: string; party?: string; date: string; notes?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteGheeTransaction: (id: number) => Promise<{ success: boolean }>;
  getShopperTransactions: () => Promise<ShopperTransaction[]>;
  addShopperTransaction: (s: { type: string; sizes?: string[]; quantity: number; rate: number; payment: string; party?: string; date: string; notes?: string }) => Promise<{ success: boolean; id?: number; error?: string }>;
  updateShopperTransaction: (id: number, s: { type: string; sizes?: string[]; quantity: number; rate: number; payment: string; party?: string; date: string; notes?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteShopperTransaction: (id: number) => Promise<{ success: boolean }>;
  sendTwilioWhatsApp: (p: { to: string; message: string }) => Promise<{ success: boolean; messageSid?: string; error?: string }>;
  getBillSettings: () => Promise<BillSettings>;
  saveBillSettings: (s: BillSettings) => Promise<{ success: boolean }>;
  getSupplierSheet: (month: string, shift?: string) => Promise<{
    suppliers: Array<{ id: number; name: string; phone: string; default_rate: number }>;
    entries: Array<{ supplier_id: number; date: string; liters: number; total: number; shift?: string }>;
    paid: Array<{ supplier_id: number; amount: number }>;
    carry: Array<{ supplier_id: number; amount: number }>;
  }>;
  setSupplierCell: (p: { supplierId: number; date: string; liters: number; shift?: string }) => Promise<{ success: boolean }>;
  bulkFillSupplier: (p: { supplierIds: number[]; month: string; fromDay: number; toDay: number; liters: number; rate?: number; shift?: string }) => Promise<{ success: boolean; updated: number; error?: string }>;
  deleteSupplierMonth: (p: { supplierId: number; month: string; shift?: string }) => Promise<{ success: boolean }>;
  setSupplierPrevious: (p: { supplierId: number; month: string; amount: number }) => Promise<{ success: boolean }>;
  addPosSale: (sale: { date: string; customerName?: string; quantity: number; rate: number; paymentMethod: string; notes?: string }) => Promise<{ success: boolean; id?: number; error?: string }>;
  updatePosSale: (sale: { id: number; date: string; customerName?: string; quantity: number; rate: number; paymentMethod: string; notes?: string }) => Promise<{ success: boolean; error?: string }>;
  getPosSales: (date?: string) => Promise<SaleItem[]>;
  markPosPaid: (id: number, method: string) => Promise<{ success: boolean }>;
  deletePosSale: (id: number) => Promise<{ success: boolean }>;
  bulkFillKhata: (payload: {
    customerIds: number[];
    month: string;
    fromDay: number;
    toDay: number;
    quantity: number;
  }) => Promise<{ success: boolean; updated: number; error?: string }>;
  getOperators: () => Promise<Array<{ id: number; username: string; name: string; role: string; created_at: string }>>;
  addOperator: (op: { username: string; name: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  deleteOperator: (id: number) => Promise<{ success: boolean }>;
  changePassword: (p: { currentPassword: string; newPassword: string }) => Promise<{ success: boolean; error?: string }>;
  updateAdminCredentials: (p: { username?: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  getPricing: () => Promise<{ currentRate: number; previousRate: number; active_rate?: number; history: Array<{ id: number; rate: number; effective_from: string; created_at: string }> }>;
  savePricing: (p: { rate: number; effectiveFrom: string; recalculate?: boolean }) => Promise<{ success: boolean; error?: string }>;
  getBackupOverview: () => Promise<{
    dbPath: string;
    dbSizeBytes: number;
    localBackupDir: string;
    localBackupsCount: number;
    latestLocalBackup: string | null;
    drives: Array<{ letter: string; type: string; freeSpaceGB: number }>;
    detectedUsbCount: number;
  }>;
  backupToUsb: (driveLetter?: string) => Promise<{ success: boolean; copiedTo?: string[]; error?: string }>;
  exportDbBackup: () => Promise<{ success: boolean; path?: string; error?: string }>;
  restoreDbBackup: () => Promise<{ success: boolean; error?: string }>;
  exportJsonBackup: () => Promise<{ success: boolean; path?: string; error?: string }>;
  exportCsvBackup: () => Promise<{ success: boolean; path?: string; error?: string }>;
  getWhatsAppStatus: () => Promise<any>;
  disconnectWhatsApp: () => Promise<{ success: boolean }>;
  getVehicles: () => Promise<Array<{ id: number; name: string; reg_number: string; type: string; assigned_to?: string }>>;
  addVehicle: (v: { name: string; regNumber: string; type?: string; assignedTo?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteVehicle: (id: number) => Promise<{ success: boolean }>;

  // Cloud & WhatsApp Cloud API
  getCloudConfig: () => Promise<CloudConfig>;
  saveCloudConfig: (c: Partial<CloudConfig>) => Promise<{ success: boolean }>;
  getCloudConnectionStatus: () => Promise<CloudConnectionStatus>;
  performCloudSync: () => Promise<CloudSyncResult>;
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
  getCloudBackupHistory: () => Promise<{ success: boolean; backups?: CloudBackupItem[]; error?: string }>;
  restoreCloudBackup: (backupId: string) => Promise<{ success: boolean; safetyBackupPath?: string; error?: string }>;
  getWhatsAppCloudStatus: () => Promise<WhatsAppCloudStatus>;
  sendWhatsAppSingleBill: (payload: { item: any; settings: any; force?: boolean }) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    duplicate?: boolean;
  }>;
  getWhatsAppLogs: (month: string) => Promise<WhatsAppBillLog[]>;
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

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
