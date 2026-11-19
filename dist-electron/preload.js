"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/preload/preload.ts
var preload_exports = {};
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
var api = {
  getDbInfo: () => import_electron.ipcRenderer.invoke("db:getInfo"),
  getSettings: () => import_electron.ipcRenderer.invoke("settings:getAll"),
  setSetting: (key, value) => import_electron.ipcRenderer.invoke("settings:set", key, value),
  getDashboardStats: (month) => import_electron.ipcRenderer.invoke("dashboard:getStats", month),
  getTasks: () => import_electron.ipcRenderer.invoke("tasks:getAll"),
  addTask: (title, status) => import_electron.ipcRenderer.invoke("tasks:add", title, status),
  deleteTask: (id) => import_electron.ipcRenderer.invoke("tasks:delete", id),
  getCustomers: () => import_electron.ipcRenderer.invoke("customers:getAll"),
  addCustomer: (customer) => import_electron.ipcRenderer.invoke("customers:add", customer),
  updateCustomer: (customer) => import_electron.ipcRenderer.invoke("customers:update", customer),
  deleteCustomer: (id) => import_electron.ipcRenderer.invoke("customers:delete", id),
  deleteCustomers: (ids) => import_electron.ipcRenderer.invoke("customers:deleteMany", ids),
  reorderCustomers: (orderedIds) => import_electron.ipcRenderer.invoke("customers:reorder", orderedIds),
  getSales: (filters) => import_electron.ipcRenderer.invoke("sales:getAll", filters),
  addSale: (sale) => import_electron.ipcRenderer.invoke("sales:add", sale),
  getKhataMonth: (month) => import_electron.ipcRenderer.invoke("khata:getMonth", month),
  setKhataEntry: (payload) => import_electron.ipcRenderer.invoke("khata:setEntry", payload),
  setKhataReceived: (payload) => import_electron.ipcRenderer.invoke("khata:setReceived", payload),
  bulkFillKhata: (payload) => import_electron.ipcRenderer.invoke("khata:bulkFill", payload),
  deleteKhataCustomerMonth: (payload) => import_electron.ipcRenderer.invoke("khata:deleteCustomerMonth", payload),
  getMonthlyRecords: () => import_electron.ipcRenderer.invoke("records:monthly"),
  setKhataPrevious: (p) => import_electron.ipcRenderer.invoke("khata:setPrevious", p),
  getSuppliers: (month) => import_electron.ipcRenderer.invoke("suppliers:list", month),
  addSupplier: (s) => import_electron.ipcRenderer.invoke("suppliers:add", s),
  updateSupplier: (s) => import_electron.ipcRenderer.invoke("suppliers:update", s),
  deleteSupplier: (id) => import_electron.ipcRenderer.invoke("suppliers:delete", id),
  deleteSuppliers: (ids) => import_electron.ipcRenderer.invoke("suppliers:deleteMany", ids),
  addSupplierPurchase: (p) => import_electron.ipcRenderer.invoke("suppliers:addPurchase", p),
  addSupplierPayment: (p) => import_electron.ipcRenderer.invoke("suppliers:addPayment", p),
  getSupplierLedger: (id) => import_electron.ipcRenderer.invoke("suppliers:ledger", id),
  deleteSupplierPurchase: (id) => import_electron.ipcRenderer.invoke("suppliers:deletePurchase", id),
  updateSupplierPurchase: (p) => import_electron.ipcRenderer.invoke("suppliers:updatePurchase", p),
  deleteAllStockPurchases: (month) => import_electron.ipcRenderer.invoke("stock:deleteAllPurchases", month),
  deleteSupplierPayment: (id) => import_electron.ipcRenderer.invoke("suppliers:deletePayment", id),
  getStockMonth: (month) => import_electron.ipcRenderer.invoke("stock:getMonth", month),
  getStockDay: (date) => import_electron.ipcRenderer.invoke("stock:getDay", date),
  saveStockDay: (payload) => import_electron.ipcRenderer.invoke("stock:saveDay", payload),
  getStockHistory: (limit) => import_electron.ipcRenderer.invoke("stock:getHistory", limit),
  deleteDailyStockRecord: (id) => import_electron.ipcRenderer.invoke("stock:deleteDailyRecord", id),
  deleteAllDailyStockRecords: () => import_electron.ipcRenderer.invoke("stock:deleteAllDailyRecords"),
  getExpenses: (month) => import_electron.ipcRenderer.invoke("expenses:list", month),
  addExpense: (x) => import_electron.ipcRenderer.invoke("expenses:add", x),
  deleteExpense: (id) => import_electron.ipcRenderer.invoke("expenses:delete", id),
  updateExpense: (x) => import_electron.ipcRenderer.invoke("expenses:update", x),
  getGheeTransactions: () => import_electron.ipcRenderer.invoke("ghee:list"),
  addGheeTransaction: (g) => import_electron.ipcRenderer.invoke("ghee:add", g),
  updateGheeTransaction: (id, g) => import_electron.ipcRenderer.invoke("ghee:update", id, g),
  deleteGheeTransaction: (id) => import_electron.ipcRenderer.invoke("ghee:delete", id),
  getShopperTransactions: () => import_electron.ipcRenderer.invoke("shopper:list"),
  addShopperTransaction: (s) => import_electron.ipcRenderer.invoke("shopper:add", s),
  updateShopperTransaction: (id, s) => import_electron.ipcRenderer.invoke("shopper:update", id, s),
  deleteShopperTransaction: (id) => import_electron.ipcRenderer.invoke("shopper:delete", id),
  sendTwilioWhatsApp: (p) => import_electron.ipcRenderer.invoke("twilio:send", p),
  getBillSettings: () => import_electron.ipcRenderer.invoke("billSettings:get"),
  saveBillSettings: (s) => import_electron.ipcRenderer.invoke("billSettings:save", s),
  getSupplierSheet: (month, shift) => import_electron.ipcRenderer.invoke("ssheet:getMonth", month, shift),
  setSupplierCell: (p) => import_electron.ipcRenderer.invoke("ssheet:setCell", p),
  bulkFillSupplier: (p) => import_electron.ipcRenderer.invoke("ssheet:bulkFill", p),
  deleteSupplierMonth: (p) => import_electron.ipcRenderer.invoke("ssheet:deleteMonth", p),
  setSupplierPrevious: (p) => import_electron.ipcRenderer.invoke("ssheet:setPrevious", p),
  addPosSale: (sale) => import_electron.ipcRenderer.invoke("pos:add", sale),
  updatePosSale: (sale) => import_electron.ipcRenderer.invoke("pos:update", sale),
  getPosSales: (date) => import_electron.ipcRenderer.invoke("pos:list", date),
  markPosPaid: (id, method) => import_electron.ipcRenderer.invoke("pos:markPaid", id, method),
  deletePosSale: (id) => import_electron.ipcRenderer.invoke("pos:delete", id),
  openExternal: (url) => import_electron.ipcRenderer.invoke("app:openExternal", url),
  getOperators: () => import_electron.ipcRenderer.invoke("operators:list"),
  addOperator: (op) => import_electron.ipcRenderer.invoke("operators:add", op),
  deleteOperator: (id) => import_electron.ipcRenderer.invoke("operators:delete", id),
  changePassword: (p) => import_electron.ipcRenderer.invoke("auth:changePassword", p),
  updateAdminCredentials: (p) => import_electron.ipcRenderer.invoke("auth:updateAdminCredentials", p),
  getPricing: () => import_electron.ipcRenderer.invoke("pricing:get"),
  savePricing: (p) => import_electron.ipcRenderer.invoke("pricing:save", p),
  getBackupOverview: () => import_electron.ipcRenderer.invoke("backup:getOverview"),
  backupToUsb: (driveLetter) => import_electron.ipcRenderer.invoke("backup:toUsb", driveLetter),
  exportDbBackup: () => import_electron.ipcRenderer.invoke("backup:exportDb"),
  restoreDbBackup: () => import_electron.ipcRenderer.invoke("backup:restoreDb"),
  exportJsonBackup: () => import_electron.ipcRenderer.invoke("backup:exportJson"),
  exportCsvBackup: () => import_electron.ipcRenderer.invoke("backup:exportCsv"),
  getWhatsAppStatus: () => import_electron.ipcRenderer.invoke("whatsapp:getStatus"),
  disconnectWhatsApp: () => import_electron.ipcRenderer.invoke("whatsapp:disconnect"),
  getVehicles: () => import_electron.ipcRenderer.invoke("vehicles:list"),
  addVehicle: (v) => import_electron.ipcRenderer.invoke("vehicles:add", v),
  deleteVehicle: (id) => import_electron.ipcRenderer.invoke("vehicles:delete", id),
  // Cloud & WhatsApp Cloud API implementations
  getCloudConfig: () => import_electron.ipcRenderer.invoke("cloud:getConfig"),
  saveCloudConfig: (c) => import_electron.ipcRenderer.invoke("cloud:saveConfig", c),
  getCloudConnectionStatus: () => import_electron.ipcRenderer.invoke("cloud:getConnectionStatus"),
  performCloudSync: () => import_electron.ipcRenderer.invoke("cloud:sync"),
  getCloudSyncMeta: () => import_electron.ipcRenderer.invoke("cloud:getSyncMeta"),
  createCloudBackup: (notes) => import_electron.ipcRenderer.invoke("cloud:createBackup", notes),
  cancelCloudBackup: () => import_electron.ipcRenderer.invoke("cloud:cancelBackup"),
  getCloudBackupHistory: () => import_electron.ipcRenderer.invoke("cloud:getHistory"),
  restoreCloudBackup: (backupId) => import_electron.ipcRenderer.invoke("cloud:restoreBackup", backupId),
  getWhatsAppCloudStatus: () => import_electron.ipcRenderer.invoke("whatsapp:getCloudStatus"),
  sendWhatsAppSingleBill: (payload) => import_electron.ipcRenderer.invoke("whatsapp:sendSingleBill", payload),
  getWhatsAppLogs: (month) => import_electron.ipcRenderer.invoke("whatsapp:getLogs", month),
  setWhatsAppConsent: (payload) => import_electron.ipcRenderer.invoke("whatsapp:setConsent", payload),
  renderBillImage: (data) => import_electron.ipcRenderer.invoke("bill:renderImage", data),
  // Application Shutdown Lifecycle
  confirmForceClose: () => import_electron.ipcRenderer.invoke("app:confirmForceClose"),
  cancelClose: () => import_electron.ipcRenderer.invoke("app:cancelClose"),
  performCloseBackup: () => import_electron.ipcRenderer.invoke("app:performCloseBackup"),
  onShowCloseBackupModal: (callback) => {
    const listener = (_e, data) => callback(data);
    import_electron.ipcRenderer.on("app:show-close-backup-modal", listener);
    return () => {
      import_electron.ipcRenderer.removeListener("app:show-close-backup-modal", listener);
    };
  },
  onBackupCloseProgress: (callback) => {
    const listener = (_e, data) => callback(data);
    import_electron.ipcRenderer.on("backup:close-progress", listener);
    return () => {
      import_electron.ipcRenderer.removeListener("backup:close-progress", listener);
    };
  },
  onBackupProgress: (callback) => {
    const listener = (_e, data) => callback(data);
    import_electron.ipcRenderer.on("backup:progress", listener);
    return () => {
      import_electron.ipcRenderer.removeListener("backup:progress", listener);
    };
  },
  onRestoreProgress: (callback) => {
    const listener = (_e, data) => callback(data);
    import_electron.ipcRenderer.on("restore:progress", listener);
    return () => {
      import_electron.ipcRenderer.removeListener("restore:progress", listener);
    };
  }
};
import_electron.contextBridge.exposeInMainWorld("electronAPI", api);
//# sourceMappingURL=preload.js.map
