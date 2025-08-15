import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseConfig } from '../src/firebaseConfig';

// Firebase初期化
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// 環境に応じてエミュレーターを使用
if (process.env.NODE_ENV === 'development') {
  // ローカル開発時はFirebaseエミュレーターを使用
  // connectFunctionsEmulator(functions, 'localhost', 5001);
}

// APIクライアントの基本設定
export const apiClient = {
  // 認証関連
  auth: {
    login: (id: string, password: string) => 
      httpsCallable(functions, 'authenticateUser')({ id, password }),
    
    updatePassword: (id: string, currentPassword: string, newPassword: string) =>
      httpsCallable(functions, 'updateAdminPassword')({ id, currentPassword, newPassword })
  },

  // カテゴリ管理
  categories: {
    getAll: () => httpsCallable(functions, 'getCategories')(),
    create: (category: any) => httpsCallable(functions, 'addCategory')(category),
    update: (category: any) => httpsCallable(functions, 'updateCategory')(category),
    delete: (id: string) => httpsCallable(functions, 'deleteCategory')({ id })
  },

  // 商品管理
  products: {
    getAll: (storeId?: string) => httpsCallable(functions, 'getProducts')({ storeId }),
    getAujuaProducts: (storeId?: string) => httpsCallable(functions, 'getAujuaProducts')({ storeId }),
    getById: (id: string, storeId?: string) => httpsCallable(functions, 'getProductById')({ id, storeId }),
    findByBarcode: (barcode: string, storeId?: string, aujuaOnly?: boolean) => 
      httpsCallable(functions, 'findProductByBarcode')({ barcode, storeId, aujuaOnly }),
    create: (productData: any, stockData: any, operatorId: string) => 
      httpsCallable(functions, 'addProduct')({ productData, stockData, operatorId }),
    update: (product: any, stock: any, storeId: string) => 
      httpsCallable(functions, 'updateProductAndInventory')({ product, stock, storeId }),
    updateStock: (productId: string, storeId: string, newStock: number) => 
      httpsCallable(functions, 'updateSingleStock')({ productId, storeId, newStock }),
    delete: (id: string) => httpsCallable(functions, 'deleteProduct')({ id }),
    batchUpsert: (productsData: any[], storeId: string) => 
      httpsCallable(functions, 'batchUpsertProducts')({ productsData, storeId })
  },

  // 仕入先管理
  suppliers: {
    getAll: () => httpsCallable(functions, 'getSuppliers')(),
    create: (supplier: any) => httpsCallable(functions, 'addSupplier')(supplier),
    update: (supplier: any) => httpsCallable(functions, 'updateSupplier')(supplier),
    delete: (id: string) => httpsCallable(functions, 'deleteSupplier')({ id })
  },

  // 店舗管理
  stores: {
    getAll: () => httpsCallable(functions, 'getStores')(),
    create: (store: any) => httpsCallable(functions, 'addStore')(store),
    update: (store: any) => httpsCallable(functions, 'updateStore')(store),
    delete: (id: string) => httpsCallable(functions, 'deleteStore')({ id })
  },

  // ユーザー管理
  users: {
    getAll: () => httpsCallable(functions, 'getStaffUsers')(),
    create: (userData: any) => httpsCallable(functions, 'addStaffUser')(userData),
    update: (userData: any) => httpsCallable(functions, 'updateStaffUser')(userData),
    delete: (id: string) => httpsCallable(functions, 'deleteStaffUser')({ id })
  },

  // 会社情報
  company: {
    get: () => httpsCallable(functions, 'getCompanyInfo')(),
    update: (info: any) => httpsCallable(functions, 'updateCompanyInfo')(info)
  },

  // 入庫管理
  intake: {
    getScheduled: (storeId?: string) => httpsCallable(functions, 'getScheduledIntakeItems')({ storeId }),
    addFromInvoice: (items: any[], supplierId: string, userId: string, storeId: string) => 
      httpsCallable(functions, 'addReceivedItemsFromInvoice')({ items, supplierId, userId, storeId }),
    addAujuaFromInvoice: (items: any[], supplierId: string, userId: string, storeId: string) => 
      httpsCallable(functions, 'addAujuaReceivedItemsFromInvoice')({ items, supplierId, userId, storeId }),
    addNewProducts: (items: any[], supplierId: string, registrarId: string, storeId: string) => 
      httpsCallable(functions, 'addNewProductsFromAIData')({ items, supplierId, registrarId, storeId }),
    update: (item: any) => httpsCallable(functions, 'updateScheduledIntakeItem')(item),
    processBatch: (items: any[], supplierId: string, operatorId: string, storeId: string, aujuaOnly?: boolean) => 
      httpsCallable(functions, 'processIntakeBatch')({ items, supplierId, operatorId, storeId, aujuaOnly })
  },

  // 出庫管理
  outbound: {
    processBatch: (items: any[], operatorId: string, storeId: string, aujuaOnly?: boolean) => 
      httpsCallable(functions, 'processOutboundBatch')({ items, operatorId, storeId, aujuaOnly })
  },

  // 発注管理
  purchaseOrders: {
    getAll: (storeId?: string) => httpsCallable(functions, 'getPurchaseOrders')({ storeId }),
    getById: (id: string) => httpsCallable(functions, 'getPurchaseOrderById')({ id }),
    create: (orderData: any) => httpsCallable(functions, 'addPurchaseOrder')(orderData),
    processReceipt: (orderId: string, receivedItems: any[], userId: string) => 
      httpsCallable(functions, 'processPurchaseOrderReceipt')({ orderId, receivedItems, userId })
  },

  // ダッシュボード
  dashboard: {
    getAdmin: (startDate: string, endDate: string, periodLabel: string, storeId?: string) => 
      httpsCallable(functions, 'getAdminDashboardData')({ startDate, endDate, periodLabel, storeId }),
    getStaff: (storeId: string) => httpsCallable(functions, 'getStaffDashboardData')({ storeId }),
    getAujua: (month: string, storeId: string) => httpsCallable(functions, 'getAujuaDashboardData')({ month, storeId }),
    getAujuaHistory: (storeId: string) => httpsCallable(functions, 'getAujuaUnifiedHistory')({ storeId }),
    getCategoryAnalysis: (parentCategoryId?: string, childCategoryId?: string, storeId?: string) => 
      httpsCallable(functions, 'getCategoryAnalysisData')({ parentCategoryId, childCategoryId, storeId })
  },

  // レポート
  reports: {
    getMonthlyPurchase: (month: string, storeId?: string) => 
      httpsCallable(functions, 'getMonthlyPurchaseReport')({ month, storeId })
  },

  // データ管理
  data: {
    export: () => httpsCallable(functions, 'exportAllData')(),
    import: (data: any) => httpsCallable(functions, 'importAllData')(data),
    runAutoBackup: () => httpsCallable(functions, 'runAutoBackupCheck')(),
    getAutoBackups: () => httpsCallable(functions, 'getAutoBackups')(),
    restoreFromBackup: (timestamp: string) => httpsCallable(functions, 'restoreFromAutoBackup')({ timestamp })
  },

  // ログ
  logs: {
    add: (action: string, userId: string) => httpsCallable(functions, 'addChangeLog')({ action, userId })
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