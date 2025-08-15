import { httpsCallable } from 'firebase/functions';
import { functions } from '../src/firebaseConfig';

// 既存のAPI構造を維持しながら、Firebase Functionsと連携
export const apiClient = {
  // GET リクエスト
  get: async (endpoint: string, params?: any) => {
    try {
      const functionName = getFunctionNameFromEndpoint(endpoint, 'GET');
      const functionCall = httpsCallable(functions, functionName);
      const result = await functionCall(params || {});
      return result.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // POST リクエスト
  post: async (endpoint: string, data?: any) => {
    try {
      const functionName = getFunctionNameFromEndpoint(endpoint, 'POST');
      const functionCall = httpsCallable(functions, functionName);
      const result = await functionCall(data || {});
      return result.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // PUT リクエスト
  put: async (endpoint: string, data?: any) => {
    try {
      const functionName = getFunctionNameFromEndpoint(endpoint, 'PUT');
      const functionCall = httpsCallable(functions, functionName);
      const result = await functionCall(data || {});
      return result.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // DELETE リクエスト
  delete: async (endpoint: string, params?: any) => {
    try {
      const functionName = getFunctionNameFromEndpoint(endpoint, 'DELETE');
      const functionCall = httpsCallable(functions, functionName);
      const result = await functionCall(params || {});
      return result.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // 既存のコードとの互換性のためのメソッド
  auth: {
    login: async (id: string, password: string) => {
      try {
        const functionCall = httpsCallable(functions, 'authenticateUser');
        const result = await functionCall({ email: id, password });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    updatePassword: async (id: string, currentPassword: string, newPassword: string) => {
      try {
        const functionCall = httpsCallable(functions, 'updateAdminPassword');
        const result = await functionCall({ id, currentPassword, newPassword });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    }
  },

  // カテゴリ管理
  categories: {
    getAll: async () => {
      try {
        const functionCall = httpsCallable(functions, 'getCategories');
        const result = await functionCall();
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    create: async (category: any) => {
      try {
        const functionCall = httpsCallable(functions, 'addCategory');
        const result = await functionCall(category);
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    update: async (category: any) => {
      try {
        const functionCall = httpsCallable(functions, 'updateCategory');
        const result = await functionCall(category);
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    delete: async (id: string) => {
      try {
        const functionCall = httpsCallable(functions, 'deleteCategory');
        const result = await functionCall({ id });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    }
  },

  // 商品管理
  products: {
    getAll: async (storeId?: string) => {
      try {
        const functionCall = httpsCallable(functions, 'getProducts');
        const result = await functionCall({ storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    getAujuaProducts: async (storeId?: string) => {
      try {
        const functionCall = httpsCallable(functions, 'getAujuaProducts');
        const result = await functionCall({ storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    getById: async (id: string, storeId?: string) => {
      try {
        const functionCall = httpsCallable(functions, 'getProductById');
        const result = await functionCall({ id, storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    findByBarcode: async (barcode: string, storeId?: string, aujuaOnly?: boolean) => {
      try {
        const functionCall = httpsCallable(functions, 'findProductByBarcode');
        const result = await functionCall({ barcode, storeId, aujuaOnly });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    create: async (productData: any, stockData: any, operatorId: string) => {
      try {
        const functionCall = httpsCallable(functions, 'addProduct');
        const result = await functionCall({ productData, stockData, operatorId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    update: async (product: any, stock: any, storeId: string) => {
      try {
        const functionCall = httpsCallable(functions, 'updateProductAndInventory');
        const result = await functionCall({ product, stock, storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    updateStock: async (productId: string, storeId: string, newStock: number) => {
      try {
        const functionCall = httpsCallable(functions, 'updateSingleStock');
        const result = await functionCall({ productId, storeId, newStock });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    delete: async (id: string) => {
      try {
        const functionCall = httpsCallable(functions, 'deleteProduct');
        const result = await functionCall({ id });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    batchUpsert: async (productsData: any[], storeId: string) => {
      try {
        const functionCall = httpsCallable(functions, 'batchUpsertProducts');
        const result = await functionCall({ productsData, storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    }
  },

  // 仕入先管理
  suppliers: {
    getAll: async () => {
      try {
        const functionCall = httpsCallable(functions, 'getSuppliers');
        const result = await functionCall();
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    create: async (supplier: any) => {
      try {
        const functionCall = httpsCallable(functions, 'addSupplier');
        const result = await functionCall(supplier);
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    update: async (supplier: any) => {
      try {
        const functionCall = httpsCallable(functions, 'updateSupplier');
        const result = await functionCall(supplier);
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    delete: async (id: string) => {
      try {
        const functionCall = httpsCallable(functions, 'deleteSupplier');
        const result = await functionCall({ id });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    }
  },

  // 店舗管理
  stores: {
    getAll: async () => {
      try {
        const functionCall = httpsCallable(functions, 'getStores');
        const result = await functionCall();
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    create: async (store: any) => {
      try {
        const functionCall = httpsCallable(functions, 'addStore');
        const result = await functionCall(store);
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    update: async (store: any) => {
      try {
        const functionCall = httpsCallable(functions, 'updateStore');
        const result = await functionCall(store);
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    delete: async (id: string) => {
      try {
        const functionCall = httpsCallable(functions, 'deleteStore');
        const result = await functionCall({ id });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    }
  },

  // ユーザー管理
  users: {
    getAll: async () => {
      try {
        const functionCall = httpsCallable(functions, 'getUsers');
        const result = await functionCall();
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    create: async (userData: any) => {
      try {
        const functionCall = httpsCallable(functions, 'addUser');
        const result = await functionCall(userData);
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    update: async (userData: any) => {
      try {
        const functionCall = httpsCallable(functions, 'updateUser');
        const result = await functionCall(userData);
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    delete: async (id: string) => {
      try {
        const functionCall = httpsCallable(functions, 'deleteUser');
        const result = await functionCall({ id });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    }
  },

  // 会社情報
  company: {
    get: async () => {
      try {
        const functionCall = httpsCallable(functions, 'getCompanyInfo');
        const result = await functionCall();
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    update: async (info: any) => {
      try {
        const functionCall = httpsCallable(functions, 'updateCompanyInfo');
        const result = await functionCall(info);
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    }
  },

  // 入庫管理
  intake: {
    getScheduled: async (storeId?: string) => {
      try {
        const functionCall = httpsCallable(functions, 'getIntakeItems');
        const result = await functionCall({ storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    addFromInvoice: async (items: any[], supplierId: string, userId: string, storeId: string) => {
      try {
        const functionCall = httpsCallable(functions, 'addReceivedItemsFromInvoice');
        const result = await functionCall({ items, supplierId, userId, storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    addAujuaFromInvoice: async (items: any[], supplierId: string, userId: string, storeId: string) => {
      try {
        const functionCall = httpsCallable(functions, 'addAujuaReceivedItemsFromInvoice');
        const result = await functionCall({ items, supplierId, userId, storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    addNewProducts: async (items: any[], supplierId: string, registrarId: string, storeId: string) => {
      try {
        const functionCall = httpsCallable(functions, 'addNewProductsFromAIData');
        const result = await functionCall({ items, supplierId, registrarId, storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    update: async (item: any) => {
      try {
        const functionCall = httpsCallable(functions, 'updateIntakeItem');
        const result = await functionCall(item);
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    processBatch: async (items: any[], supplierId: string, operatorId: string, storeId: string, aujuaOnly?: boolean) => {
      try {
        const functionCall = httpsCallable(functions, 'processIntakeBatch');
        const result = await functionCall({ items, supplierId, operatorId, storeId, aujuaOnly });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    }
  },

  // 出庫管理
  outbound: {
    processBatch: async (items: any[], operatorId: string, storeId: string, aujuaOnly?: boolean) => {
      try {
        const functionCall = httpsCallable(functions, 'processOutboundBatch');
        const result = await functionCall({ items, operatorId, storeId, aujuaOnly });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    }
  },

  // 発注管理
  purchaseOrders: {
    getAll: async (storeId?: string) => {
      try {
        const functionCall = httpsCallable(functions, 'getPurchaseOrders');
        const result = await functionCall({ storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    getById: async (id: string) => {
      try {
        const functionCall = httpsCallable(functions, 'getProductById');
        const result = await functionCall({ id });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    create: async (orderData: any) => {
      try {
        const functionCall = httpsCallable(functions, 'addPurchaseOrder');
        const result = await functionCall(orderData);
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    processReceipt: async (orderId: string, receivedItems: any[], userId: string) => {
      try {
        const functionCall = httpsCallable(functions, 'processPurchaseOrderReceipt');
        const result = await functionCall({ orderId, receivedItems, userId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    }
  },

  // ダッシュボード
  dashboard: {
    getAdmin: async (startDate: string, endDate: string, periodLabel: string, storeId?: string) => {
      try {
        const functionCall = httpsCallable(functions, 'getAdminDashboardData');
        const result = await functionCall({ startDate, endDate, periodLabel, storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    getStaff: async (storeId: string) => {
      try {
        const functionCall = httpsCallable(functions, 'getStaffDashboardData');
        const result = await functionCall({ storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    getAujua: async (month: string, storeId: string) => {
      try {
        const functionCall = httpsCallable(functions, 'getAujuaDashboardData');
        const result = await functionCall({ month, storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    getAujuaHistory: async (storeId: string) => {
      try {
        const functionCall = httpsCallable(functions, 'getAujuaUnifiedHistory');
        const result = await functionCall({ storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    getCategoryAnalysis: async (parentCategoryId?: string, childCategoryId?: string, storeId?: string) => {
      try {
        const functionCall = httpsCallable(functions, 'getCategoryAnalysisData');
        const result = await functionCall({ parentCategoryId, childCategoryId, storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    }
  },

  // レポート
  reports: {
    getMonthlyPurchase: async (month: string, storeId?: string) => {
      try {
        const functionCall = httpsCallable(functions, 'getMonthlyPurchaseReport');
        const result = await functionCall({ month, storeId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    }
  },

  // データ管理
  data: {
    export: async () => {
      try {
        const functionCall = httpsCallable(functions, 'exportAllData');
        const result = await functionCall();
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    import: async (data: any) => {
      try {
        const functionCall = httpsCallable(functions, 'importAllData');
        const result = await functionCall(data);
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    runAutoBackup: async () => {
      try {
        const functionCall = httpsCallable(functions, 'runAutoBackupCheck');
        const result = await functionCall();
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    getAutoBackups: async () => {
      try {
        const functionCall = httpsCallable(functions, 'getAutoBackups');
        const result = await functionCall();
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    },
    
    restoreFromBackup: async (timestamp: string) => {
      try {
        const functionCall = httpsCallable(functions, 'restoreFromAutoBackup');
        const result = await functionCall({ timestamp });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    }
  },

  // ログ
  logs: {
    add: async (action: string, userId: string) => {
      try {
        const functionCall = httpsCallable(functions, 'addChangeLog');
        const result = await functionCall({ action, userId });
        return result.data;
      } catch (error) {
        throw handleApiError(error);
      }
    }
  }
};

// エンドポイントからFirebase Functionsの関数名を取得
function getFunctionNameFromEndpoint(endpoint: string, method: string): string {
  // 基本的なマッピング
  const endpointMap: { [key: string]: string } = {
    // 商品関連
    '/products': 'getProducts',
    '/products/auju': 'getAujuaProducts',
    
    // カテゴリ関連
    '/categories': 'getCategories',
    
    // サプライヤー関連
    '/suppliers': 'getSuppliers',
    
    // 店舗関連
    '/stores': 'getStores',
    
    // ユーザー関連
    '/users/staff': 'getUsers',
    
    // 会社情報
    '/company-info': 'getCompanyInfo',
    
    // 入荷関連
    '/intake-items': 'getIntakeItems',
    
    // 出荷関連
    '/outbound-items': 'getOutboundItems',
    
    // 発注関連
    '/purchase-orders': 'getPurchaseOrders',
    
    // ダッシュボード関連
    '/dashboard/admin': 'getDashboardData',
    '/dashboard/auju': 'getDashboardData',
    '/dashboard/staff': 'getDashboardData',
    
    // レポート関連
    '/reports/monthly-purchase': 'generateReport',
    
    // データ管理
    '/data/auto-backups': 'backupData',
    '/data/export-all': 'backupData',
    
    // ログ関連
    '/logs': 'getLogs',
    
    // Gemini AI関連
    '/gemini/invoice': 'processGeminiInvoice',
    '/gemini/description': 'generateGeminiDescription'
  };

  // パラメータ付きのエンドポイント
  if (endpoint.includes('/products/') && endpoint !== '/products/auju') {
    return 'getProductById';
  }
  
  if (endpoint.includes('/purchase-orders/') && !endpoint.includes('/receipt')) {
    return 'getPurchaseOrderById';
  }

  // デフォルトのマッピング
  return endpointMap[endpoint] || 'defaultHandler';
}

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

// デフォルトエクスポートを追加
export default apiClient;