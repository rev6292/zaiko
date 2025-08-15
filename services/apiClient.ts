import { httpsCallable } from 'firebase/functions';
import { functions } from '../src/firebaseConfig';

// APIクライアントの基本設定
export const apiClient = {
  // 認証関連
  authenticateUser: (email: string, password: string) => {
    const authenticateUserFunction = httpsCallable(functions, 'authenticateUser');
    return authenticateUserFunction({ email, password });
  },

  // カテゴリ関連
  getCategories: () => {
    const getCategoriesFunction = httpsCallable(functions, 'getCategories');
    return getCategoriesFunction();
  },

  addCategory: (category: any) => {
    const addCategoryFunction = httpsCallable(functions, 'addCategory');
    return addCategoryFunction(category);
  },

  updateCategory: (id: string, category: any) => {
    const updateCategoryFunction = httpsCallable(functions, 'updateCategory');
    return updateCategoryFunction({ id, ...category });
  },

  deleteCategory: (id: string) => {
    const deleteCategoryFunction = httpsCallable(functions, 'deleteCategory');
    return deleteCategoryFunction({ id });
  },

  // 商品関連
  getProducts: () => {
    const getProductsFunction = httpsCallable(functions, 'getProducts');
    return getProductsFunction();
  },

  getAujuaProducts: () => {
    const getAujuaProductsFunction = httpsCallable(functions, 'getAujuaProducts');
    return getAujuaProductsFunction();
  },

  getProductById: (id: string) => {
    const getProductByIdFunction = httpsCallable(functions, 'getProductById');
    return getProductByIdFunction({ id });
  },

  findProductByBarcode: (barcode: string) => {
    const findProductByBarcodeFunction = httpsCallable(functions, 'findProductByBarcode');
    return findProductByBarcodeFunction({ barcode });
  },

  addProduct: (product: any) => {
    const addProductFunction = httpsCallable(functions, 'addProduct');
    return addProductFunction(product);
  },

  updateProductAndInventory: (id: string, product: any) => {
    const updateProductAndInventoryFunction = httpsCallable(functions, 'updateProductAndInventory');
    return updateProductAndInventoryFunction({ id, ...product });
  },

  updateSingleStock: (id: string, stock: any) => {
    const updateSingleStockFunction = httpsCallable(functions, 'updateSingleStock');
    return updateSingleStockFunction({ id, ...stock });
  },

  deleteProduct: (id: string) => {
    const deleteProductFunction = httpsCallable(functions, 'deleteProduct');
    return deleteProductFunction({ id });
  },

  batchUpsertProducts: (products: any[]) => {
    const batchUpsertProductsFunction = httpsCallable(functions, 'batchUpsertProducts');
    return batchUpsertProductsFunction({ products });
  },

  // サプライヤー関連
  getSuppliers: () => {
    const getSuppliersFunction = httpsCallable(functions, 'getSuppliers');
    return getSuppliersFunction();
  },

  addSupplier: (supplier: any) => {
    const addSupplierFunction = httpsCallable(functions, 'addSupplier');
    return addSupplierFunction(supplier);
  },

  updateSupplier: (id: string, supplier: any) => {
    const updateSupplierFunction = httpsCallable(functions, 'updateSupplier');
    return updateSupplierFunction({ id, ...supplier });
  },

  deleteSupplier: (id: string) => {
    const deleteSupplierFunction = httpsCallable(functions, 'deleteSupplier');
    return deleteSupplierFunction({ id });
  },

  // 店舗関連
  getStores: () => {
    const getStoresFunction = httpsCallable(functions, 'getStores');
    return getStoresFunction();
  },

  addStore: (store: any) => {
    const addStoreFunction = httpsCallable(functions, 'addStore');
    return addStoreFunction(store);
  },

  updateStore: (id: string, store: any) => {
    const updateStoreFunction = httpsCallable(functions, 'updateStore');
    return updateStoreFunction({ id, ...store });
  },

  deleteStore: (id: string) => {
    const deleteStoreFunction = httpsCallable(functions, 'deleteStore');
    return deleteStoreFunction({ id });
  },

  // ユーザー関連
  getUsers: () => {
    const getUsersFunction = httpsCallable(functions, 'getUsers');
    return getUsersFunction();
  },

  addUser: (user: any) => {
    const addUserFunction = httpsCallable(functions, 'addUser');
    return addUserFunction(user);
  },

  updateUser: (id: string, user: any) => {
    const updateUserFunction = httpsCallable(functions, 'updateUser');
    return updateUserFunction({ id, ...user });
  },

  deleteUser: (id: string) => {
    const deleteUserFunction = httpsCallable(functions, 'deleteUser');
    return deleteUserFunction({ id });
  },

  // 会社情報関連
  getCompanyInfo: () => {
    const getCompanyInfoFunction = httpsCallable(functions, 'getCompanyInfo');
    return getCompanyInfoFunction();
  },

  updateCompanyInfo: (companyInfo: any) => {
    const updateCompanyInfoFunction = httpsCallable(functions, 'updateCompanyInfo');
    return updateCompanyInfoFunction(companyInfo);
  },

  // 入荷関連
  getIntakeItems: () => {
    const getIntakeItemsFunction = httpsCallable(functions, 'getIntakeItems');
    return getIntakeItemsFunction();
  },

  addIntakeItem: (item: any) => {
    const addIntakeItemFunction = httpsCallable(functions, 'addIntakeItem');
    return addIntakeItemFunction(item);
  },

  updateIntakeItem: (id: string, item: any) => {
    const updateIntakeItemFunction = httpsCallable(functions, 'updateIntakeItem');
    return updateIntakeItemFunction({ id, ...item });
  },

  deleteIntakeItem: (id: string) => {
    const deleteIntakeItemFunction = httpsCallable(functions, 'deleteIntakeItem');
    return deleteIntakeItemFunction({ id });
  },

  // 出荷関連
  getOutboundItems: () => {
    const getOutboundItemsFunction = httpsCallable(functions, 'getOutboundItems');
    return getOutboundItemsFunction();
  },

  addOutboundItem: (item: any) => {
    const addOutboundItemFunction = httpsCallable(functions, 'addOutboundItem');
    return addOutboundItemFunction(item);
  },

  updateOutboundItem: (id: string, item: any) => {
    const updateOutboundItemFunction = httpsCallable(functions, 'updateOutboundItem');
    return updateOutboundItemFunction({ id, ...item });
  },

  deleteOutboundItem: (id: string) => {
    const deleteOutboundItemFunction = httpsCallable(functions, 'deleteOutboundItem');
    return deleteOutboundItemFunction({ id });
  },

  // 発注関連
  getPurchaseOrders: () => {
    const getPurchaseOrdersFunction = httpsCallable(functions, 'getPurchaseOrders');
    return getPurchaseOrdersFunction();
  },

  addPurchaseOrder: (order: any) => {
    const addPurchaseOrderFunction = httpsCallable(functions, 'addPurchaseOrder');
    return addPurchaseOrderFunction(order);
  },

  updatePurchaseOrder: (id: string, order: any) => {
    const updatePurchaseOrderFunction = httpsCallable(functions, 'updatePurchaseOrder');
    return updatePurchaseOrderFunction({ id, ...order });
  },

  deletePurchaseOrder: (id: string) => {
    const deletePurchaseOrderFunction = httpsCallable(functions, 'deletePurchaseOrder');
    return deletePurchaseOrderFunction({ id });
  },

  // ダッシュボード関連
  getDashboardData: () => {
    const getDashboardDataFunction = httpsCallable(functions, 'getDashboardData');
    return getDashboardDataFunction();
  },

  getInventorySummary: () => {
    const getInventorySummaryFunction = httpsCallable(functions, 'getInventorySummary');
    return getInventorySummaryFunction();
  },

  getSalesData: () => {
    const getSalesDataFunction = httpsCallable(functions, 'getSalesData');
    return getSalesDataFunction();
  },

  getLowStockAlerts: () => {
    const getLowStockAlertsFunction = httpsCallable(functions, 'getLowStockAlerts');
    return getLowStockAlertsFunction();
  },

  // レポート関連
  generateReport: (reportType: string, filters: any) => {
    const generateReportFunction = httpsCallable(functions, 'generateReport');
    return generateReportFunction({ reportType, filters });
  },

  exportReport: (reportType: string, format: string, filters: any) => {
    const exportReportFunction = httpsCallable(functions, 'exportReport');
    return exportReportFunction({ reportType, format, filters });
  },

  // データ管理関連
  backupData: () => {
    const backupDataFunction = httpsCallable(functions, 'backupData');
    return backupDataFunction();
  },

  restoreData: (backupData: any) => {
    const restoreDataFunction = httpsCallable(functions, 'restoreData');
    return restoreDataFunction({ backupData });
  },

  clearData: () => {
    const clearDataFunction = httpsCallable(functions, 'clearData');
    return clearDataFunction();
  },

  // ログ関連
  getLogs: () => {
    const getLogsFunction = httpsCallable(functions, 'getLogs');
    return getLogsFunction();
  },

  addLog: (log: any) => {
    const addLogFunction = httpsCallable(functions, 'addLog');
    return addLogFunction(log);
  },

  clearLogs: () => {
    const clearLogsFunction = httpsCallable(functions, 'clearLogs');
    return clearLogsFunction();
  }
};

// エラーハンドリング用のヘルパー関数
export const handleApiError = (error: any) => {
  console.error('API Error:', error);

  if (error.code === 'functions/unavailable') {
    throw new Error('サービスが一時的に利用できません。しばらく待ってから再試行してください。');
  }

  if (error.code === 'functions/permission-denied') {
    throw new Error('この操作を実行する権限がありません。');
  }

  if (error.code === 'functions/unauthenticated') {
    throw new Error('認証が必要です。再度ログインしてください。');
  }

  // カスタムエラーメッセージがある場合はそれを使用
  if (error.message) {
    throw new Error(error.message);
  }

  throw new Error('予期しないエラーが発生しました。');
};

// APIレスポンスの型定義
export interface ApiResponse<T = any> {
  data: T;
  error?: string;
}