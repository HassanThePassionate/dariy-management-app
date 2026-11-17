export type Language = 'en' | 'ur';

export interface Translations {
  appName: string;
  appSubtitle: string;
  shopName: string;
  login: string;
  shopLogin: string;
  loginSubtitle: string;
  mobileNumber: string;
  mobilePlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  rememberMe: string;
  forgotPassword: string;
  welcomeBack: string;
  dashboard: string;
  monthlyKhatta: string;
  customers: string;
  suppliers: string;
  dailySale: string;
  allRecord: string;
  dailyStock: string;
  fleetExpenses: string;
  monthlyBills: string;
  payments: string;
  settings: string;
  totalMilk: string;
  totalCustomers: string;
  todaySale: string;
  totalDue: string;
  quickActions: string;
  addMilk: string;
  recentTransactions: string;
  viewAll: string;
  date: string;
  customer: string;
  selectCustomer: string;
  addNew: string;
  milkQuantity: string;
  enterQuantity: string;
  ratePerLtr: string;
  enterRate: string;
  totalAmount: string;
  paymentStatus: string;
  paid: string;
  due: string;
  notesOptional: string;
  enterNotes: string;
  save: string;
  reset: string;
  search: string;
  cancel: string;
  fullName: string;
  enterFullName: string;
  address: string;
  enterAddress: string;
  defaultRatePerLtr: string;
  searchFilter: string;
  dateFrom: string;
  dateTo: string;
  transactionType: string;
  minAmount: string;
  maxAmount: string;
  searchResults: string;
  clearFilter: string;
  totalRecords: string;
  status: string;
  all: string;
  databaseConnected: string;
  databaseError: string;
  databasePath: string;
  sqliteVerification: string;
  insertTestRecord: string;
  taskTitlePlaceholder: string;
  testRecordSuccess: string;
  logout: string;
  quickTestRecord: string;
  ltr: string;
  currencyRs: string;
  loading: string;
  english: string;
  urdu: string;
  // Customer management
  addCustomer: string;
  editCustomer: string;
  whatsappNumber: string;
  whatsappPlaceholder: string;
  previousBalance: string;
  enterPreviousBalance: string;
  rowPosition: string;
  rowPositionHint: string;
  sno: string;
  milkRate: string;
  actions: string;
  selectAll: string;
  selectedCount: string;
  deleteSelected: string;
  deleteConfirm: string;
  dragToReorder: string;
  update: string;
  noCustomers: string;
  deleteAllConfirm: string;
  // Monthly Khatta
  bulkEntry: string;
  apply: string;
  qtyLtr: string;
  fromDay: string;
  toDay: string;
  saving: string;
  clearAll: string;
  totalBilled: string;
  totalCollected: string;
  totalPending: string;
  withDue: string;
  fullyPaid: string;
  emptyCustomers: string;
  exportLabel: string;
  exportCsv: string;
  exportTxt: string;
  totalLiters: string;
  totalBill: string;
  received: string;
  balanceDue: string;
  selectMonth: string;
  noKhataRows: string;
  gheeStock: string;
  shopperStock: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'Qari Zafar Milk Shop',
    appSubtitle: 'Fresh Milk & Dairy Management',
    shopName: 'Qari Zafar Milk Shop',
    login: 'LOGIN',
    shopLogin: 'Shop Login',
    loginSubtitle: 'Enter your mobile number and password',
    mobileNumber: 'Mobile Number',
    mobilePlaceholder: 'Enter mobile number',
    password: 'Password',
    passwordPlaceholder: 'Enter password',
    rememberMe: 'Remember Me',
    forgotPassword: 'Forgot Password?',
    welcomeBack: 'Welcome Back!',
    dashboard: 'Dashboard',
    monthlyKhatta: 'Monthly Khatta',
    customers: 'Customers',
    suppliers: 'Suppliers (Dahi)',
    dailySale: 'Daily Sale',
    allRecord: 'All Record',
    dailyStock: 'Daily Stock',
    fleetExpenses: 'Fleet & Expenses',
    monthlyBills: 'Monthly Bills',
    payments: 'Payments',
    settings: 'Settings',
    totalMilk: 'Total Milk (Ltr)',
    totalCustomers: 'Total Customers',
    todaySale: "Today's Sale",
    totalDue: 'Total Due',
    quickActions: 'Quick Actions',
    addMilk: 'Add Milk',
    recentTransactions: 'Recent Transactions',
    viewAll: 'View All',
    date: 'Date',
    customer: 'Customer',
    selectCustomer: 'Select Customer',
    addNew: '+ Add New',
    milkQuantity: 'Milk Quantity (Ltr)',
    enterQuantity: 'Enter quantity',
    ratePerLtr: 'Rate Per Ltr (Rs.)',
    enterRate: 'Enter rate',
    totalAmount: 'Total Amount (Rs.)',
    paymentStatus: 'Payment Status',
    paid: 'Paid',
    due: 'Due',
    notesOptional: 'Notes (Optional)',
    enterNotes: 'Enter notes',
    save: 'SAVE',
    reset: 'RESET',
    search: 'SEARCH',
    cancel: 'Cancel',
    fullName: 'Full Name',
    enterFullName: 'Enter full name',
    address: 'Address',
    enterAddress: 'Enter address',
    defaultRatePerLtr: 'Default Rate Per Ltr (Rs.)',
    searchFilter: 'Search / Filter',
    dateFrom: 'Date From',
    dateTo: 'Date To',
    transactionType: 'Transaction Type',
    minAmount: 'Min. Amount (Rs.)',
    maxAmount: 'Max. Amount (Rs.)',
    searchResults: 'Search Results',
    clearFilter: 'Clear Filter',
    totalRecords: 'Total Records',
    status: 'Status',
    all: 'All',
    databaseConnected: 'Database Connected Successfully',
    databaseError: 'Database Connection Error',
    databasePath: 'SQLite Database Path',
    sqliteVerification: 'SQLite (better-sqlite3) Test & Verification',
    insertTestRecord: 'Add Record',
    taskTitlePlaceholder: 'Enter test note / item...',
    testRecordSuccess: 'Record saved to SQLite successfully!',
    logout: 'Logout',
    quickTestRecord: 'Quick Test Record',
    ltr: 'Ltr',
    currencyRs: 'Rs.',
    loading: 'Loading Milk Shop...',
    english: 'English',
    urdu: 'اردو',
    addCustomer: 'Add Customer',
    editCustomer: 'Edit Customer',
    whatsappNumber: 'WhatsApp Number',
    whatsappPlaceholder: 'Enter WhatsApp number',
    previousBalance: 'Previous Balance (Rs.)',
    enterPreviousBalance: 'Enter previous balance',
    rowPosition: 'Row Position',
    rowPositionHint: 'This customer will be placed at this row and the rows below will shift down.',
    sno: 'S.No',
    milkRate: 'Milk Rate',
    actions: 'Actions',
    selectAll: 'Select all',
    selectedCount: 'selected',
    deleteSelected: 'Delete Selected',
    deleteConfirm: 'Are you sure you want to delete this customer?',
    dragToReorder: 'Drag row to change order',
    update: 'UPDATE',
    noCustomers: 'No customers yet. Click "+ Add New" to add your first customer.',
    deleteAllConfirm: 'Delete the selected customers? This cannot be undone.',
    bulkEntry: 'Bulk Entry / Auto-Fill',
    apply: 'APPLY',
    qtyLtr: 'Qty (Ltr)',
    fromDay: 'From Day',
    toDay: 'To Day',
    saving: 'Saving...',
    clearAll: 'Clear all',
    totalBilled: 'Total Billed',
    totalCollected: 'Collected',
    totalPending: 'Pending Dues',
    withDue: 'With Due',
    fullyPaid: 'Fully Paid',
    emptyCustomers: 'Empty',
    exportLabel: 'Export',
    exportCsv: 'Export CSV',
    exportTxt: 'Export Text',
    totalLiters: 'Total Ltr',
    totalBill: 'Total Bill',
    received: 'Received',
    balanceDue: 'Balance Due',
    selectMonth: 'Select month',
    noKhataRows: 'No customers match the current filter.',
    gheeStock: 'Desi Ghee Stock',
    shopperStock: 'Shopper Bags Stock',
  },
  ur: {
    appName: 'قاری ظفر ملک شاپ',
    appSubtitle: 'تازہ دودھ اور ڈیری کا انتظام',
    shopName: 'قاری ظفر ملک شاپ',
    login: 'لاگ ان کریں',
    shopLogin: 'دکان لاگ ان',
    loginSubtitle: 'اپنا موبائل نمبر اور پاس ورڈ درج کریں',
    mobileNumber: 'موبائل نمبر',
    mobilePlaceholder: 'موبائل نمبر لکھیں',
    password: 'پاس ورڈ',
    passwordPlaceholder: 'پاس ورڈ لکھیں',
    rememberMe: 'مجھے یاد رکھیں',
    forgotPassword: 'پاس ورڈ بھول گئے؟',
    welcomeBack: 'خوش آمدید!',
    dashboard: 'ڈیش بورڈ',
    monthlyKhatta: 'ماہانہ کھاتہ',
    customers: 'گاہک (کسٹمرز)',
    suppliers: 'سپلائرز (دہی)',
    dailySale: 'روزانہ فروخت',
    allRecord: 'تمام ریکارڈ',
    dailyStock: 'روزانہ اسٹاک',
    fleetExpenses: 'گاڑیاں اور اخراجات',
    monthlyBills: 'ماہانہ بل',
    payments: 'ادائیگی و وصولی',
    settings: 'ترتیبات (سیٹنگز)',
    totalMilk: 'کل دودھ (لیٹر)',
    totalCustomers: 'کل گاہک',
    todaySale: 'آج کی فروخت',
    totalDue: 'کل بقایا جات',
    quickActions: 'فوری اقدامات',
    addMilk: 'دودھ شامل کریں',
    recentTransactions: 'حالیہ لین دین',
    viewAll: 'سب دیکھیں',
    date: 'تاریخ',
    customer: 'گاہک',
    selectCustomer: 'گاہک منتخب کریں',
    addNew: '+ نیا گاہک',
    milkQuantity: 'دودھ کی مقدار (لیٹر)',
    enterQuantity: 'مقدار درج کریں',
    ratePerLtr: 'فی لیٹر ریٹ (روپے)',
    enterRate: 'ریٹ درج کریں',
    totalAmount: 'کل رقم (روپے)',
    paymentStatus: 'ادائیگی کی حالت',
    paid: 'ادا شدہ',
    due: 'بقایا',
    notesOptional: 'تفصیل (اختیاری)',
    enterNotes: 'اضافی تفصیل لکھیں',
    save: 'محفوظ کریں',
    reset: 'دوبارہ ترتیب دیں',
    search: 'تلاش کریں',
    cancel: 'منسوخ',
    fullName: 'مکمل نام',
    enterFullName: 'گاہک کا مکمل نام لکھیں',
    address: 'پتہ',
    enterAddress: 'مکمل پتہ لکھیں',
    defaultRatePerLtr: 'طے شدہ ریٹ فی لیٹر (روپے)',
    searchFilter: 'تلاش اور فلٹر',
    dateFrom: 'تاریخ سے',
    dateTo: 'تاریخ تک',
    transactionType: 'لین دین کی قسم',
    minAmount: 'کم از کم رقم (روپے)',
    maxAmount: 'زیادہ سے زیادہ رقم (روپے)',
    searchResults: 'تلاش کے نتائج',
    clearFilter: 'فلٹر ختم کریں',
    totalRecords: 'کل ریکارڈز',
    status: 'حالت',
    all: 'سب',
    databaseConnected: 'ڈیٹابیس کامیابی سے منسلک ہو چکی ہے',
    databaseError: 'ڈیٹابیس کا رابطہ ناکام ہو گیا',
    databasePath: 'ایس کیو ایل ڈیٹابیس کا راستہ',
    sqliteVerification: 'ایس کیو ایل ڈیٹابیس کا براہ راست ٹیسٹ',
    insertTestRecord: 'ریکارڈ شامل کریں',
    taskTitlePlaceholder: 'ٹیسٹ اندراج لکھیں...',
    testRecordSuccess: 'ریکارڈ ایس کیو ایل میں کامیابی سے محفوظ ہو گیا!',
    logout: 'لاگ آؤٹ',
    quickTestRecord: 'فوری ٹیسٹ ریکارڈ',
    ltr: 'لیٹر',
    currencyRs: 'روپے',
    loading: 'ملک شاپ لوڈ ہو رہی ہے...',
    english: 'English',
    urdu: 'اردو',
    addCustomer: 'نیا گاہک شامل کریں',
    editCustomer: 'گاہک میں ترمیم کریں',
    whatsappNumber: 'واٹس ایپ نمبر',
    whatsappPlaceholder: 'واٹس ایپ نمبر لکھیں',
    previousBalance: 'پچھلی بقایا (روپے)',
    enterPreviousBalance: 'پچھلی بقایا رقم لکھیں',
    rowPosition: 'قطار نمبر',
    rowPositionHint: 'یہ گاہک اسی قطار پر آئے گا اور اس کے نیچے والے گاہک ایک ایک قطار نیچے سرک جائیں گے۔',
    sno: 'نمبر شمار',
    milkRate: 'دودھ کا ریٹ',
    actions: 'اختیارات',
    selectAll: 'سب منتخب کریں',
    selectedCount: 'منتخب',
    deleteSelected: 'منتخب شدہ حذف کریں',
    deleteConfirm: 'کیا آپ واقعی یہ گاہک حذف کرنا چاہتے ہیں؟',
    dragToReorder: 'ترتیب بدلنے کے لیے قطار کو کھینچیں',
    update: 'اپ ڈیٹ کریں',
    noCustomers: 'ابھی کوئی گاہک نہیں ہے۔ پہلا گاہک شامل کرنے کے لیے "+ نیا گاہک" پر کلک کریں۔',
    deleteAllConfirm: 'کیا منتخب شدہ گاہک حذف کر دیے جائیں؟ یہ عمل واپس نہیں ہو سکتا۔',
    bulkEntry: 'بیچ انٹری (فوری بھریں)',
    apply: 'لاگو کریں',
    qtyLtr: 'مقدار (لیٹر)',
    fromDay: 'دن سے',
    toDay: 'دن تک',
    saving: 'محفوظ ہو رہا ہے...',
    clearAll: 'سب ہٹا دیں',
    totalBilled: 'کل بل',
    totalCollected: 'وصول شدہ',
    totalPending: 'بقایا جات',
    withDue: 'بقایا والے',
    fullyPaid: 'مکمل ادا شدہ',
    emptyCustomers: 'خالی',
    exportLabel: 'ایکسپورٹ',
    exportCsv: 'CSV ڈاؤن لوڈ کریں',
    exportTxt: 'ٹیکسٹ ڈاؤن لوڈ کریں',
    totalLiters: 'کل لیٹر',
    totalBill: 'کل بل',
    received: 'وصول شدہ',
    balanceDue: 'بقایا',
    selectMonth: 'مہینہ منتخب کریں',
    noKhataRows: 'موجودہ فلٹر پر کوئی گاہک نہیں ملا۔',
    gheeStock: 'دیسی گھی اسٹاک',
    shopperStock: 'شاپر بیگز اسٹاک',
  },
};
