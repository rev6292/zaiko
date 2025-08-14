import { Product, Supplier, ScheduledIntakeItem, ScheduledIntakeStatus, UserRole, AdminDashboardData, StaffDashboardData, MonthlyReportDataPoint, Category, User, SupplierMonthlyPerformance, ProcessedInvoiceItem, PurchaseOrder, PurchaseOrderStatus, PurchaseOrderItem, CompanyInfo, WatchlistItem, InventoryMovement, CategoryPerformance, Store, InventoryRecord, ProductWithStock, MonthlyOutboundItem, AllDataBackup, AutoBackup, AutoBackupInfo, UnifiedHistoryItem, AujuaDashboardData, AujuaInventoryCategoryGroup, ProductUsage, NewProductLog, AujuaProductHistoryGroup, SupplierUsagePerformance, CategoryAnalysisData, RankedProduct } from '../types';
import { AUJUA_ROOT_CATEGORY_ID } from '../constants';

// localStorage Helper Functions
const lsGet = <T,>(key: string, fallback: T): T => {
    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            const parsed = JSON.parse(stored);
            return parsed ?? fallback;
        }
        return fallback;
    } catch (e) {
        console.error(`Failed to parse localStorage item ${key}:`, e);
        return fallback;
    }
};

const lsSet = (key: string, value: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`Failed to set localStorage item ${key}:`, e);
    }
};

// --- Keys for Data Storage ---
const DATA_KEY_PREFIX = 'salonStock_';
const LEGACY_PERSISTENT_DATA_KEY = `${DATA_KEY_PREFIX}persistentData`;
const AUTO_BACKUPS_KEY = `${DATA_KEY_PREFIX}autoBackups`;

// --- Type for the entire data structure ---
interface AppData {
  users: User[];
  stores: Store[];
  categories: Category[];
  suppliers: Supplier[];
  companyInfo: CompanyInfo;
  products: Product[];
  inventoryRecords: InventoryRecord[];
  scheduledIntakeItems: ScheduledIntakeItem[];
  outboundLogs: { productId: string; storeId: string; quantity: number; date: string; }[];
  purchaseOrders: PurchaseOrder[];
  newProductLogs: NewProductLog[];
}

// ============================================================================
// Data Manager - A centralized, abstract layer for data persistence.
// This refactoring improves efficiency and makes future database integration easier.
// ============================================================================
class DataManager {
    private data: AppData;
    private dataKeyMap: { [K in keyof AppData]: string };
    private allDataKeys: Array<keyof AppData>;

    constructor() {
        this.allDataKeys = [
            'users', 'stores', 'categories', 'suppliers', 'companyInfo',
            'products', 'inventoryRecords', 'scheduledIntakeItems',
            'outboundLogs', 'purchaseOrders', 'newProductLogs'
        ];

        this.dataKeyMap = this.allDataKeys.reduce((acc, key) => {
            acc[key] = `${DATA_KEY_PREFIX}${key}`;
            return acc;
        }, {} as { [K in keyof AppData]: string });
        
        // Initialize this.data before calling loadAndInitializeData to prevent race conditions.
        this.data = {} as AppData;
        this.loadAndInitializeData();
    }
    
    private getInitialData(): AppData {
        const d = (year: number, month: number, day: number) => new Date(year, month - 1, day).toISOString();

        const initialUsers: User[] = [
            { id: 'admin', name: '管理者', role: UserRole.ADMIN, hashedPassword: 'ukki0901_hashed_mock' },
            { id: 'staff1', name: 'デモスタッフ1', role: UserRole.STAFF, storeId: 'store1', hashedPassword: 'password_hashed_mock' },
            { id: 'aujuastaff1', name: 'Aujua担当', role: UserRole.AUJUA_STAFF, storeId: 'store1', hashedPassword: 'password_hashed_mock' },
        ];
        
        const initialStores: Store[] = [
            { id: 'all', name: '全店舗' },
            { id: 'store1', name: '本店', address: '東京都渋谷区道玄坂1-1-1', phone: '03-1111-2222' },
            { id: 'store2', name: '大阪支店', address: '大阪府大阪市中央区難波2-2-2', phone: '06-3333-4444' },
        ];
        
        const initialCategories: Category[] = [
            { id: 'cat1', name: 'ヘアケア', parentId: null }, { id: 'cat1_1', name: 'シャンプー', parentId: 'cat1' }, { id: 'cat1_2', name: 'トリートメント', parentId: 'cat1' },
            { id: 'cat2', name: 'カラー剤', parentId: null }, { id: 'cat2_1', name: 'アルカリカラー', parentId: 'cat2' },
            { id: 'cat3', name: '美容機器', parentId: null },
            { id: AUJUA_ROOT_CATEGORY_ID, name: 'Aujua', parentId: null },
            { id: 'cat_auju_sh', name: 'シャンプー', parentId: AUJUA_ROOT_CATEGORY_ID }, { id: 'cat_auju_tr', name: 'トリートメント', parentId: AUJUA_ROOT_CATEGORY_ID }, { id: 'cat_auju_ot', name: 'アウトバス', parentId: AUJUA_ROOT_CATEGORY_ID },
        ];
        
        const initialSuppliers: Supplier[] = [
            { id: 's1', name: 'ビューティーサプライ株式会社', contactPerson: '山田太郎', phone: '03-1234-5678' },
            { id: 's2', name: 'サロンマテリアルズ合同会社', contactPerson: '佐藤花子', phone: '06-9876-5432' },
        ];

        const initialCompanyInfo: CompanyInfo = {
            id: 'main', name: 'あなたのサロン名', address: '〒123-4567 東京都架空区架空1-2-3', phone: '03-9876-5432', representativeName: '代表者名',
        };

        const initialProducts: Product[] = [
            { id: 'p1', name: 'プレミアムリペアシャンプー 500ml', barcode: '4901234567890', category: 'シャンプー', categoryId: 'cat1_1', costPrice: 1500, supplierId: 's1', lastUpdated: d(2024, 5, 10), usage: ProductUsage.RETAIL },
            { id: 'p2', name: 'モイストトリートメント 200g', barcode: '4901234567891', category: 'トリートメント', categoryId: 'cat1_2', costPrice: 1800, supplierId: 's1', lastUpdated: d(2024, 5, 15), usage: ProductUsage.RETAIL },
            { id: 'p3', name: 'アッシュブラウンカラー 8A', barcode: '4901234567892', category: 'アルカリカラー', categoryId: 'cat2_1', costPrice: 800, supplierId: 's2', lastUpdated: d(2024, 5, 20), usage: ProductUsage.PROFESSIONAL },
            { id: 'p4', name: 'プロフェッショナルドライヤー', barcode: '4901234567893', category: '美容機器', categoryId: 'cat3', costPrice: 12000, supplierId: 's2', lastUpdated: d(2024, 4, 1), usage: ProductUsage.PROFESSIONAL },
            { id: 'p_au_1', name: 'Aujua QUENCH シャンプー', barcode: '4954835114066', categoryId: 'cat_auju_sh', category: 'シャンプー', costPrice: 2800, supplierId: 's1', lastUpdated: d(2024, 5, 25), usage: ProductUsage.RETAIL },
            { id: 'p_au_2', name: 'Aujua IMMURISE ヘアトリートメント', barcode: '4954835113427', categoryId: 'cat_auju_tr', category: 'トリートメント', costPrice: 4000, supplierId: 's1', lastUpdated: d(2024, 5, 26), usage: ProductUsage.RETAIL },
        ];
        
        const initialInventory: InventoryRecord[] = [];
        initialStores.filter(s => s.id !== 'all').forEach((store, storeIndex) => {
            initialProducts.forEach((product, productIndex) => {
                initialInventory.push({ productId: product.id, storeId: store.id, currentStock: 10 + storeIndex * 5 + productIndex * 2, minimumStock: 5, lastUpdated: d(2024, 5, 10 + productIndex) });
            });
        });
        
        const initialData: AppData = {
            users: initialUsers, stores: initialStores, categories: initialCategories, suppliers: initialSuppliers,
            companyInfo: initialCompanyInfo, products: initialProducts, inventoryRecords: initialInventory,
            scheduledIntakeItems: [
                { id: 'si1', productName: 'プレミアムリペアシャンプー 500ml', productId: 'p1', quantity: 20, status: ScheduledIntakeStatus.RECEIVED, storeId: 'store1', supplierName: 'ビューティーサプライ株式会社', supplierId: 's1', receivedDate: d(2024, 5, 1), lastUpdated: d(2024, 5, 1), costPriceAtIntake: 1500 },
                { id: 'si2', productName: 'アッシュブラウンカラー 8A', productId: 'p3', quantity: 50, status: ScheduledIntakeStatus.PENDING_APPROVAL, storeId: 'store1', supplierName: 'サロンマテリアルズ合同会社', supplierId: 's2', estimatedArrivalDate: d(2024, 6, 10), lastUpdated: d(2024, 5, 28) },
            ],
            outboundLogs: [
                { productId: 'p1', storeId: 'store1', quantity: 2, date: d(2024, 5, 12) }, { productId: 'p2', storeId: 'store1', quantity: 1, date: d(2024, 5, 16) },
            ],
            purchaseOrders: [
                { id: 'po1', orderDate: d(2024, 5, 1), completedDate: d(2024, 5, 5), supplierId: 's1', supplierName: 'ビューティーサプライ株式会社', storeId: 'store1', status: PurchaseOrderStatus.COMPLETED, createdById: 'admin', items: [{productId: 'p1', productName: 'プレミアムリペアシャンプー 500ml', barcode: '4901234567890', quantity: 10, costPriceAtOrder: 1450, isReceived: true}] }
            ],
            newProductLogs: [],
        };

        return initialData;
    }
    
    private getDefaultValueForKey(key: keyof AppData): any {
        if (key === 'companyInfo') return { id: 'main', name: '', address: '', phone: '' };
        return [];
    }

    private loadAndInitializeData(): void {
        // 1. Check for legacy data and migrate if it exists.
        const legacyDataRaw = localStorage.getItem(LEGACY_PERSISTENT_DATA_KEY);
        if (legacyDataRaw) {
            console.log("Legacy data format found. Migrating to new multi-key format...");
            const legacyData = JSON.parse(legacyDataRaw) as AppData;
            
            // Run one-time migrations on the legacy data before saving.
            if (legacyData.products.length > 0 && legacyData.products[0].usage === undefined) {
                console.log("Running one-time data migration: Adding 'usage' field to all products.");
                legacyData.products = legacyData.products.map(p => ({ ...p, usage: ProductUsage.PROFESSIONAL }));
            }

            this.replaceAllData(legacyData); // This saves the migrated data into the new format.
            localStorage.removeItem(LEGACY_PERSISTENT_DATA_KEY);
            console.log("Migration complete.");
            return;
        }

        // 2. If no legacy data, check if new data format already exists.
        if (localStorage.getItem(this.dataKeyMap.users)) {
            for (const key of this.allDataKeys) {
                this.data[key] = lsGet(this.dataKeyMap[key], this.getDefaultValueForKey(key));
            }
            return;
        }

        // 3. If neither exists, perform first-time setup.
        console.log("First time setup with new data format.");
        const initialData = this.getInitialData();
        this.replaceAllData(initialData);
    }

    public get<K extends keyof AppData>(key: K): AppData[K] {
        return this.data[key];
    }
    
    public set<K extends keyof AppData>(key: K, value: AppData[K]): void {
        this.data[key] = value;
        lsSet(this.dataKeyMap[key], value);
    }
    
    public getAllData(): AppData {
        return { ...this.data };
    }
    
    public replaceAllData(newData: AppData): void {
        for (const key of this.allDataKeys) {
            const value = newData[key] || this.getDefaultValueForKey(key);
            this.data[key] = value;
            lsSet(this.dataKeyMap[key], value);
        }
    }
}

// --- Initialize Data Manager ---
const dataManager = new DataManager();


const simulateApiCall = <T,>(payload: T, delay = 100): Promise<T> => {
  return new Promise(resolve => {
    setTimeout(() => {
        if (payload === undefined) {
            resolve(payload);
            return;
        }
        resolve(JSON.parse(JSON.stringify(payload)));
    }, delay);
  });
};

// --- Aujua Specific Helpers ---
let aujuaCategoryIds: Set<string> | null = null;
const getAujuaDescendantCategoryIds = (): Set<string> => {
    if (aujuaCategoryIds) {
        return aujuaCategoryIds; // Keep it quiet when cached
    }
    console.log("%c[Aujua Debug] Building Aujua category ID set for the first time...", 'color: purple; font-weight: bold;');
    
    const categories = dataManager.get('categories');
    const aujuaRoot = categories.find(c => c.id === AUJUA_ROOT_CATEGORY_ID);
    if (!aujuaRoot) {
        console.error(`[FATAL DEBUG] Could not find the Aujua root category with ID: ${AUJUA_ROOT_CATEGORY_ID}. Aujua features will not work.`);
        return new Set();
    }
    
    const ids = new Set<string>([AUJUA_ROOT_CATEGORY_ID]);
    const findChildren = (parentId: string) => {
        const children = categories.filter(category => category.parentId === parentId);
        children.forEach(category => {
            if (!ids.has(category.id)) {
                ids.add(category.id);
                findChildren(category.id);
            }
        });
    };

    findChildren(AUJUA_ROOT_CATEGORY_ID);
    aujuaCategoryIds = ids;
    console.log(`%c[Aujua Debug] Built Aujua category set. Found ${ids.size} IDs:`, 'color: purple;', Array.from(ids));
    return ids;
};


// --- Data Export/Import ---
export const exportAllData = (): Promise<AllDataBackup> => {
  const exportData: AllDataBackup = dataManager.getAllData();
  return simulateApiCall(exportData);
};

export const importAllData = (importData: AllDataBackup): Promise<{ success: boolean }> => {
  const completeData: AppData = {
    users: importData.users || [], stores: importData.stores || [],
    categories: importData.categories || [], suppliers: importData.suppliers || [],
    companyInfo: importData.companyInfo || {id:'main', name:'',address:'',phone:''},
    products: importData.products || [], inventoryRecords: importData.inventoryRecords || [],
    scheduledIntakeItems: importData.scheduledIntakeItems || [],
    outboundLogs: importData.outboundLogs || [], purchaseOrders: importData.purchaseOrders || [],
    newProductLogs: importData.newProductLogs || [],
  };
  dataManager.replaceAllData(completeData);
  return simulateApiCall({ success: true });
};

// --- Auto Backup ---
export const runAutoBackupCheck = async (): Promise<AutoBackupInfo | null> => {
    const backups: AutoBackup[] = lsGet(AUTO_BACKUPS_KEY, []);
    const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;

    if (backups.length > 0) {
        const lastBackupTime = new Date(backups[0].backupInfo.timestamp).getTime();
        const now = new Date().getTime();
        if (now - lastBackupTime < sevenDaysInMillis) {
            return null;
        }
    }

    const allData = await exportAllData();
    const backupInfo: AutoBackupInfo = {
        timestamp: new Date().toISOString(),
        stats: {
            products: allData.products.length,
            users: allData.users.length,
            stores: allData.stores.length,
        }
    };
    const newBackup: AutoBackup = { ...allData, backupInfo };

    backups.unshift(newBackup);
    if (backups.length > 4) backups.pop();
    
    lsSet(AUTO_BACKUPS_KEY, backups);
    console.log("Auto backup created:", backupInfo);
    return simulateApiCall(backupInfo);
};

export const getAutoBackups = (): Promise<AutoBackupInfo[]> => {
    const backups: AutoBackup[] = lsGet(AUTO_BACKUPS_KEY, []);
    const backupInfos = backups.map(b => b.backupInfo);
    return simulateApiCall(backupInfos);
};

export const restoreFromAutoBackup = async (timestamp: string): Promise<{ success: boolean }> => {
    const backups: AutoBackup[] = lsGet(AUTO_BACKUPS_KEY, []);
    const backupToRestore = backups.find(b => b.backupInfo.timestamp === timestamp);
    if (!backupToRestore) throw new Error("指定されたバックアップが見つかりません。");
    const { backupInfo, ...dataToImport } = backupToRestore;
    return importAllData(dataToImport);
};


// Auth
export const authenticateUser = (id: string, password?: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = dataManager.get('users');
      const user = users.find(u => u.id === id);
      const mockHashedPassword = `${password}_hashed_mock`;
      if (user && user.hashedPassword && user.hashedPassword === mockHashedPassword) {
        const { hashedPassword, ...userWithoutPassword } = user;
        resolve(userWithoutPassword);
      } else {
        reject(new Error("ユーザーIDまたはパスワードが正しくありません。"));
      }
    }, 500);
  });
};

// Categories (Persistent)
let aujuaTopLevelCategoryCache = new Map<string, Category | null>();
const invalidateAujuaCaches = () => {
    aujuaCategoryIds = null;
    aujuaTopLevelCategoryCache.clear();
};
export const getCategories = (): Promise<Category[]> => simulateApiCall(dataManager.get('categories'));
export const addCategory = (category: Omit<Category, 'id'>): Promise<Category> => {
  const newCategory: Category = { ...category, id: `cat${Date.now()}` };
  const categories = dataManager.get('categories');
  dataManager.set('categories', [...categories, newCategory]);
  invalidateAujuaCaches();
  return simulateApiCall(newCategory);
};
export const updateCategory = (updatedCategory: Category): Promise<Category> => {
  const categories = dataManager.get('categories');
  dataManager.set('categories', categories.map(c => c.id === updatedCategory.id ? updatedCategory : c));
  invalidateAujuaCaches();
  return simulateApiCall(updatedCategory);
};
export const deleteCategory = (categoryId: string): Promise<{ success: boolean }> => {
  const categories = dataManager.get('categories');
  const products = dataManager.get('products');
  const isParent = categories.some(c => c.parentId === categoryId);
  if (isParent) return Promise.reject(new Error("このカテゴリは他のカテゴリの親として使用されているため削除できません。"));
  const isInUseByProduct = products.some(p => p.categoryId === categoryId);
  if (isInUseByProduct) return Promise.reject(new Error("このカテゴリは商品に紐付けられているため削除できません。"));
  dataManager.set('categories', categories.filter(c => c.id !== categoryId));
  invalidateAujuaCaches();
  return simulateApiCall({ success: true });
};

// Products (Now Persistent)
const getProductWithStock = (product: Product, storeId?: string): ProductWithStock => {
    const inventoryRecords = dataManager.get('inventoryRecords');
    let currentStock = 0, minimumStock = 0;
    if (storeId && storeId !== 'all') {
        const record = inventoryRecords.find(inv => inv.productId === product.id && inv.storeId === storeId);
        if (record) { currentStock = record.currentStock; minimumStock = record.minimumStock; }
    } else {
        const records = inventoryRecords.filter(inv => inv.productId === product.id);
        currentStock = records.reduce((sum, r) => sum + r.currentStock, 0);
        minimumStock = records.reduce((sum, r) => sum + r.minimumStock, 0);
    }
    return { ...product, currentStock, minimumStock };
};

export const getProducts = (storeId?: string): Promise<ProductWithStock[]> => {
    const products = dataManager.get('products');
    const productsWithStock = products.map(p => getProductWithStock(p, storeId));
    return simulateApiCall(productsWithStock);
};

export const getAujuaProducts = (storeId?: string): Promise<ProductWithStock[]> => {
    const products = dataManager.get('products');
    const aujuaIds = getAujuaDescendantCategoryIds();
    const aujuaProducts = products.filter(p => aujuaIds.has(p.categoryId));
    const productsWithStock = aujuaProducts.map(p => getProductWithStock(p, storeId));
    return simulateApiCall(productsWithStock);
};

export const getProductById = (id: string, storeId?: string): Promise<ProductWithStock | undefined> => {
    const product = dataManager.get('products').find(p => p.id === id);
    if (!product) return simulateApiCall(undefined);
    return simulateApiCall(getProductWithStock(product, storeId));
};

export const findProductByBarcode = (barcode: string, storeId?: string, aujuaOnly: boolean = false): Promise<ProductWithStock | undefined> => {
  console.log(`%c[Aujua Debug] Barcode search started for: "${barcode}". Aujua-only mode: ${aujuaOnly}`, 'color: blue; font-weight: bold;');
  
  const allProducts = dataManager.get('products');
  const trimmedBarcode = barcode.trim();
  const product = allProducts.find(p => {
    if (p.barcode == null) return false;
    if (typeof p.barcode === 'string') return p.barcode.trim() == trimmedBarcode;
    return p.barcode == trimmedBarcode;
  });

  if (!product) {
    console.error(`%c[Aujua Debug] STEP 1 FAILED: No product found with barcode "${barcode}".`, 'color: red; font-weight: bold;');
    console.log(`[Aujua Debug] All product data currently in database:`, allProducts);
    return simulateApiCall(undefined);
  }

  console.log(`%c[Aujua Debug] STEP 1 SUCCESS: Found a product in the database.`, 'color: green; font-weight: bold;', product);

  if (aujuaOnly) {
    console.log(`%c[Aujua Debug] STEP 2: Checking Aujua category because 'aujuaOnly' is true...`, 'color: blue; font-weight: bold;');
    const aujuaIds = getAujuaDescendantCategoryIds();
    console.log(`[Aujua Debug] Aujua Category IDs to check against:`, Array.from(aujuaIds));
    const isAujuaProduct = aujuaIds.has(product.categoryId);
    if (!isAujuaProduct) {
      console.error(`%c[Aujua Debug] STEP 2 FAILED: The product's category ID ("${product.categoryId}") is NOT in the list of Aujua categories. The product will be ignored.`, 'color: red; font-weight: bold;');
      return simulateApiCall(undefined);
    }
    console.log(`%c[Aujua Debug] STEP 2 SUCCESS: Product category is valid.`, 'color: green; font-weight: bold;');
  }
  
  console.log(`%c[Aujua Debug] STEP 3: Fetching stock info and returning final product.`, 'color: blue; font-weight: bold;');
  return simulateApiCall(getProductWithStock(product, storeId));
};

export const findProductByName = (name: string): Promise<Product | undefined> => {
  const searchTerm = name.toLowerCase();
  const products = dataManager.get('products');
  return simulateApiCall(products.find(p => p.name.toLowerCase() === searchTerm));
};

export const addProduct = (
  productData: Omit<Product, 'id' | 'lastUpdated'>,
  stockData: { currentStock: number, minimumStock: number, storeId: string },
  operatorId: string
): Promise<Product> => {
  if (stockData.storeId === 'all') {
    return Promise.reject(new Error("商品を登録するには、特定の店舗を選択してください。"));
  }
  const products = dataManager.get('products');
  const existingByBarcode = products.find(p => p.barcode === productData.barcode);
  if (existingByBarcode) return Promise.reject(new Error(`バーコード '${productData.barcode}' は既に商品 '${existingByBarcode.name}' で使用されています。`));
  
  const categories = dataManager.get('categories');
  const newProduct: Product = { 
    ...productData, id: `p${Date.now()}`, 
    category: categories.find(c => c.id === productData.categoryId)?.name || productData.category,
    lastUpdated: new Date().toISOString(), 
  };
  dataManager.set('products', [...products, newProduct]);
  
  const inventoryRecords = dataManager.get('inventoryRecords');
  const stores = dataManager.get('stores');
  stores.filter(s => s.id !== 'all').forEach(store => {
      inventoryRecords.push({
        productId: newProduct.id, storeId: store.id,
        currentStock: store.id === stockData.storeId ? stockData.currentStock : 0,
        minimumStock: store.id === stockData.storeId ? stockData.minimumStock : 0,
        lastUpdated: new Date().toISOString()
      });
  });
  dataManager.set('inventoryRecords', inventoryRecords);

  const newProductLog: NewProductLog = {
    id: `npl_${Date.now()}`, productId: newProduct.id, storeId: stockData.storeId,
    quantity: stockData.currentStock, date: new Date().toISOString(), operatorId,
  };
  dataManager.set('newProductLogs', [...dataManager.get('newProductLogs'), newProductLog]);

  return simulateApiCall(newProduct);
};

export const updateProductAndInventory = (product: Product, stock: { currentStock: number, minimumStock: number }, storeId: string): Promise<Product> => {
  const categories = dataManager.get('categories');
  const productWithCategoryName = { ...product, category: categories.find(c => c.id === product.categoryId)?.name || product.category, lastUpdated: new Date().toISOString() };
  
  const products = dataManager.get('products');
  dataManager.set('products', products.map(p => p.id === productWithCategoryName.id ? productWithCategoryName : p));
  
  const inventoryRecords = dataManager.get('inventoryRecords');
  const invIndex = inventoryRecords.findIndex(inv => inv.productId === product.id && inv.storeId === storeId);
  if(invIndex > -1) {
    inventoryRecords[invIndex].currentStock = stock.currentStock;
    inventoryRecords[invIndex].minimumStock = stock.minimumStock;
    inventoryRecords[invIndex].lastUpdated = new Date().toISOString();
  }
  dataManager.set('inventoryRecords', inventoryRecords);

  return simulateApiCall(productWithCategoryName);
};

export const updateSingleStock = (productId: string, storeId: string, newStock: number): Promise<{ success: boolean }> => {
  const inventoryRecords = dataManager.get('inventoryRecords');
  const invIndex = inventoryRecords.findIndex(inv => inv.productId === productId && inv.storeId === storeId);
  if (invIndex > -1) {
    inventoryRecords[invIndex].currentStock = newStock;
    inventoryRecords[invIndex].lastUpdated = new Date().toISOString();
    dataManager.set('inventoryRecords', inventoryRecords);
    return simulateApiCall({ success: true });
  }
  return Promise.reject(new Error("在庫レコードが見つかりません。"));
};

export const deleteProduct = (id: string) => {
  const products = dataManager.get('products');
  dataManager.set('products', products.filter(p => p.id !== id));
  
  const inventoryRecords = dataManager.get('inventoryRecords');
  dataManager.set('inventoryRecords', inventoryRecords.filter(inv => inv.productId !== id));

  return simulateApiCall({ success: true });
};

export const batchUpsertProducts = async (productsData: (Partial<ProductWithStock>)[], storeId: string): Promise<{ createdCount: number; updatedCount: number; errors: string[] }> => {
  let createdCount = 0, updatedCount = 0; const errors: string[] = [];
  const products = dataManager.get('products');
  const inventoryRecords = dataManager.get('inventoryRecords');
  const stores = dataManager.get('stores');
  const categories = dataManager.get('categories');

  for (const pData of productsData) {
    if (!pData.barcode) { errors.push(`バーコードがありません: ${pData.name || '名前不明'}`); continue; }
    const existingIdx = products.findIndex(p => p.barcode === pData.barcode);
    if (existingIdx > -1) {
      const original = products[existingIdx];
      products[existingIdx] = { ...original, ...pData, lastUpdated: new Date().toISOString() };
      const invIdx = inventoryRecords.findIndex(i => i.productId === original.id && i.storeId === storeId);
      if (invIdx > -1) {
        if (pData.currentStock !== undefined) inventoryRecords[invIdx].currentStock = pData.currentStock;
        if (pData.minimumStock !== undefined) inventoryRecords[invIdx].minimumStock = pData.minimumStock;
        inventoryRecords[invIdx].lastUpdated = new Date().toISOString();
      }
      updatedCount++;
    } else {
      if (!pData.name || !pData.categoryId || !pData.supplierId || pData.costPrice === undefined) { errors.push(`新規商品の必須フィールド不足: ${pData.barcode}`); continue; }
      const newP: Product = {
        id: `p${Date.now()}_${Math.random()}`, name: pData.name!, barcode: pData.barcode, categoryId: pData.categoryId!,
        usage: pData.usage || ProductUsage.PROFESSIONAL,
        category: categories.find(c => c.id === pData.categoryId)?.name || '未分類',
        supplierId: pData.supplierId!, costPrice: pData.costPrice!, lastUpdated: new Date().toISOString(),
      };
      products.push(newP);
      stores.filter(s => s.id !== 'all').forEach(s => {
          inventoryRecords.push({
            productId: newP.id, storeId: s.id,
            currentStock: s.id === storeId ? (pData.currentStock || 0) : 0,
            minimumStock: s.id === storeId ? (pData.minimumStock || 0) : 0,
            lastUpdated: new Date().toISOString(),
          });
      });
      createdCount++;
    }
  }
  dataManager.set('products', products);
  dataManager.set('inventoryRecords', inventoryRecords);
  return simulateApiCall({ createdCount, updatedCount, errors });
};

// Suppliers (Persistent)
export const getSuppliers = (): Promise<Supplier[]> => simulateApiCall(dataManager.get('suppliers'));
export const addSupplier = (supplier: Omit<Supplier, 'id'>): Promise<Supplier> => {
  const newSupplier: Supplier = { ...supplier, id: `s${Date.now()}` };
  dataManager.set('suppliers', [...dataManager.get('suppliers'), newSupplier]);
  return simulateApiCall(newSupplier);
};
export const updateSupplier = (updatedSupplier: Supplier): Promise<Supplier> => {
  const suppliers = dataManager.get('suppliers');
  dataManager.set('suppliers', suppliers.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
  return simulateApiCall(updatedSupplier);
};
export const deleteSupplier = (id: string) => {
  const products = dataManager.get('products');
  const isInUse = products.some(p => p.supplierId === id);
  if (isInUse) return Promise.reject(new Error("この仕入先は商品に紐付けられているため削除できません。"));
  const suppliers = dataManager.get('suppliers');
  dataManager.set('suppliers', suppliers.filter(s => s.id !== id));
  return simulateApiCall({ success: true });
};

// Stores (Persistent)
export const getStores = (): Promise<Store[]> => simulateApiCall(dataManager.get('stores'));
export const addStore = (store: Omit<Store, 'id'>): Promise<Store> => {
    const newStore: Store = { ...store, id: `store${Date.now()}` };
    dataManager.set('stores', [...dataManager.get('stores'), newStore]);
    
    const products = dataManager.get('products');
    const inventoryRecords = dataManager.get('inventoryRecords');
    products.forEach(product => {
        const existingRecord = inventoryRecords.find(inv => inv.productId === product.id && inv.storeId === newStore.id);
        if (!existingRecord) {
            inventoryRecords.push({
                productId: product.id, storeId: newStore.id, currentStock: 0,
                minimumStock: 0, lastUpdated: new Date().toISOString()
            });
        }
    });
    dataManager.set('inventoryRecords', inventoryRecords);
    
    return simulateApiCall(newStore);
};
export const updateStore = (updatedStore: Store): Promise<Store> => {
    const stores = dataManager.get('stores');
    dataManager.set('stores', stores.map(s => s.id === updatedStore.id ? updatedStore : s));
    return simulateApiCall(updatedStore);
};
export const deleteStore = (id: string) => {
    if (id === 'all') return Promise.reject(new Error("「全店舗」は削除できません。"));
    const users = dataManager.get('users');
    const inventoryRecords = dataManager.get('inventoryRecords');
    const isInUse = users.some(u => u.storeId === id) || inventoryRecords.some(i => i.storeId === id);
    if (isInUse) return Promise.reject(new Error("この店舗はスタッフまたは在庫に紐付けられています。"));
    
    const stores = dataManager.get('stores');
    dataManager.set('stores', stores.filter(s => s.id !== id));
    return simulateApiCall({ success: true });
};

// Users (Persistent)
export const getStaffUsers = (): Promise<User[]> => simulateApiCall(dataManager.get('users'));
export const addStaffUser = (userData: any): Promise<User> => {
  const newUser: User = { ...userData, id: `user${Date.now()}`, hashedPassword: `${userData.password}_hashed_mock`};
  delete newUser['password' as keyof User]; delete newUser['confirmPassword' as keyof User];
  
  const users = dataManager.get('users');
  dataManager.set('users', [...users, newUser]);
  
  return simulateApiCall(newUser);
};
export const updateStaffUser = (userData: User & { newPassword?: string }): Promise<User> => {
  const users = dataManager.get('users');
  const idx = users.findIndex(u => u.id === userData.id);
  if (idx === -1) return Promise.reject(new Error('User not found'));
  
  const updatedUser = { ...users[idx], name: userData.name, role: userData.role, storeId: userData.storeId };
  if (userData.newPassword) updatedUser.hashedPassword = `${userData.newPassword}_hashed_mock`;
  
  users[idx] = updatedUser;
  dataManager.set('users', users);

  return simulateApiCall(updatedUser);
};
export const deleteStaffUser = (id: string): Promise<{ success: boolean }> => {
  const users = dataManager.get('users');
  dataManager.set('users', users.filter(u => u.id !== id));
  return simulateApiCall({ success: true });
};
export const updateAdminPassword = (id: string, currentPassword: string,newPassword: string): Promise<{success: boolean, message?:string}> => {
  const users = dataManager.get('users');
  const idx = users.findIndex(u => u.id === id);
  if(idx === -1) return Promise.reject(new Error("User not found"));
  if (users[idx].hashedPassword !== `${currentPassword}_hashed_mock`) return simulateApiCall({success: false, message: '現在のパスワードが正しくありません。'});
  
  users[idx].hashedPassword = `${newPassword}_hashed_mock`;
  dataManager.set('users', users);
  
  return simulateApiCall({success: true, message: 'パスワードが正常に変更されました。'});
};

// Company Info (Persistent)
export const getCompanyInfo = (): Promise<CompanyInfo> => simulateApiCall(dataManager.get('companyInfo'));
export const updateCompanyInfo = (info: CompanyInfo): Promise<CompanyInfo> => {
    dataManager.set('companyInfo', info);
    return simulateApiCall(info);
};

// Intake (Persistent)
export const getScheduledIntakeItems = (storeId?: string): Promise<ScheduledIntakeItem[]> => {
    const allItems = dataManager.get('scheduledIntakeItems');
    if (!storeId || storeId === 'all') return simulateApiCall(allItems);
    return simulateApiCall(allItems.filter(item => item.storeId === storeId));
};

export const addReceivedItemsFromInvoice = async (items: ProcessedInvoiceItem[], supplierId: string, userId: string, storeId: string): Promise<{ successCount: number; errorCount: number; errors: string[] }> => {
  let successCount = 0, errorCount = 0; let errors: string[] = [];
  const suppliers = dataManager.get('suppliers');
  const categories = dataManager.get('categories');
  const inventoryRecords = dataManager.get('inventoryRecords');
  const scheduledIntakeItems = dataManager.get('scheduledIntakeItems');

  for (const item of items) {
    try {
      let productId = item.matchedProductId;
      if (item.isNewProduct) {
        const newProductPayload: Omit<Product, 'id' | 'lastUpdated'> = {
          name: item.productName, barcode: item.barcode, categoryId: item.categoryId,
          usage: item.usage,
          category: categories.find(c => c.id === item.categoryId)?.name || '未分類',
          supplierId: supplierId, costPrice: item.pricePerUnit,
        };
        const stockPayload = { currentStock: item.quantity, minimumStock: item.minimumStock, storeId };
        const newProduct = await addProduct(newProductPayload, stockPayload, userId);
        productId = newProduct.id;
      }
      if (!productId) throw new Error("Product ID is missing.");
      const intakeItem: Omit<ScheduledIntakeItem, 'id'> = {
        productName: item.productName, productId: productId, barcode: item.barcode, quantity: item.quantity, costPriceAtIntake: item.pricePerUnit,
        status: ScheduledIntakeStatus.RECEIVED, supplierId: supplierId, supplierName: suppliers.find(s => s.id === supplierId)?.name || '不明',
        storeId: storeId, receivedDate: new Date().toISOString(), lastUpdated: new Date().toISOString(), notes: `AI納品書解析 (担当: ${userId})`,
      };
      scheduledIntakeItems.push({ ...intakeItem, id: `si${Date.now()}_${Math.random()}`});
      if (!item.isNewProduct) {
        const invIndex = inventoryRecords.findIndex(i => i.productId === productId && i.storeId === storeId);
        if (invIndex > -1) inventoryRecords[invIndex].currentStock += item.quantity;
        else inventoryRecords.push({ productId, storeId, currentStock: item.quantity, minimumStock: 0, lastUpdated: new Date().toISOString() });
      }
      successCount++;
    } catch (e) { errorCount++; errors.push(`${item.productName}: ${(e as Error).message}`); }
  }
  if (successCount > 0) {
      dataManager.set('scheduledIntakeItems', scheduledIntakeItems);
      dataManager.set('inventoryRecords', inventoryRecords);
  }
  return { successCount, errorCount, errors };
};

export const addAujuaReceivedItemsFromInvoice = async (items: ProcessedInvoiceItem[], supplierId: string, userId: string, storeId: string): Promise<{ successCount: number; errorCount: number; errors: string[] }> => {
    const aujuaIds = getAujuaDescendantCategoryIds();
    const products = dataManager.get('products');
    for (const item of items) {
        if (item.isNewProduct) {
            if (!aujuaIds.has(item.categoryId)) {
                return Promise.reject(new Error(`新規商品「${item.productName}」はAujuaカテゴリに属していません。`));
            }
        } else if (item.matchedProductId) {
            const product = products.find(p => p.id === item.matchedProductId);
            if (product && !aujuaIds.has(product.categoryId)) {
                return Promise.reject(new Error(`既存商品「${product.name}」はAujuaカテゴリに属していません。`));
            }
        }
    }
    return addReceivedItemsFromInvoice(items, supplierId, userId, storeId);
};

export const addNewProductsFromAIData = async (items: ProcessedInvoiceItem[], supplierId: string, registrarId: string, storeId: string) => {
  let successCount = 0, errorCount = 0; let errors: string[] = [];
  const categories = dataManager.get('categories');
  for(const item of items) {
    try {
       const newProductPayload: Omit<Product, 'id' | 'lastUpdated'> = {
          name: item.productName, barcode: item.barcode, categoryId: item.categoryId,
          usage: item.usage,
          category: categories.find(c => c.id === item.categoryId)?.name || '未分類',
          supplierId: supplierId, costPrice: item.pricePerUnit
        };
        const stockPayload = { currentStock: item.quantity, minimumStock: item.minimumStock, storeId };
        await addProduct(newProductPayload, stockPayload, registrarId);
        successCount++;
    } catch(e) { errorCount++; errors.push(`${item.productName}: ${(e as Error).message}`); }
  }
  // addProduct already saves, so no extra save needed here.
  return { successCount, errorCount, errors };
};

export const updateScheduledIntakeItem = (item: ScheduledIntakeItem): Promise<ScheduledIntakeItem> => {
    const intakeItems = dataManager.get('scheduledIntakeItems');
    dataManager.set('scheduledIntakeItems', intakeItems.map(i => i.id === item.id ? item : i));
    return simulateApiCall(item);
};

export const processIntakeBatch = async (items: {productId: string, quantity: number, costPrice: number}[], supplierId: string, operatorId: string, storeId: string, aujuaOnly: boolean = false) => {
    const products = dataManager.get('products');
    if (aujuaOnly) {
        const aujuaIds = getAujuaDescendantCategoryIds();
        const nonAujuaItems = items.filter(item => {
            const product = products.find(p => p.id === item.productId);
            return !product || !aujuaIds.has(product.categoryId);
        });
        if (nonAujuaItems.length > 0) {
            return simulateApiCall({ success: false, errors: ['Aujua製品ではない商品が含まれています。'] });
        }
    }

    const inventoryRecords = dataManager.get('inventoryRecords');
    for (const item of items) {
        const invIndex = inventoryRecords.findIndex(i => i.productId === item.productId && i.storeId === storeId);
        if (invIndex > -1) inventoryRecords[invIndex].currentStock += item.quantity;
    }
    dataManager.set('inventoryRecords', inventoryRecords);
    
    const suppliers = dataManager.get('suppliers');
    const intakeNote = `一括入荷 (担当: ${operatorId})`;
    const supplierName = suppliers.find(s => s.id === supplierId)?.name || '不明';
    const newIntakes: ScheduledIntakeItem[] = items.map(item => ({
        id: `si_${Date.now()}_${item.productId}`, productName: products.find(p => p.id === item.productId)?.name || '不明',
        productId: item.productId, quantity: item.quantity, costPriceAtIntake: item.costPrice,
        status: ScheduledIntakeStatus.RECEIVED, supplierId: supplierId, supplierName: supplierName,
        storeId: storeId, receivedDate: new Date().toISOString(), lastUpdated: new Date().toISOString(), notes: intakeNote,
    }));
    
    const scheduledIntakeItems = dataManager.get('scheduledIntakeItems');
    dataManager.set('scheduledIntakeItems', [...scheduledIntakeItems, ...newIntakes]);

    return simulateApiCall({ success: true, errors: [] });
};

// Outbound (Persistent)
export const processOutboundBatch = async (items: {productId: string, quantity: number}[], operatorId: string, storeId: string, aujuaOnly: boolean = false) => {
    const errors = [];
    let processed = false;
    const products = dataManager.get('products');

    if (aujuaOnly) {
        const aujuaIds = getAujuaDescendantCategoryIds();
        const nonAujuaItems = items.filter(item => {
            const product = products.find(p => p.id === item.productId);
            return !product || !aujuaIds.has(product.categoryId);
        });
        if (nonAujuaItems.length > 0) {
            errors.push(`Aujua製品ではない商品が含まれています。`);
        }
    }

    if (errors.length > 0) {
      return simulateApiCall({ success: false, errors });
    }
    
    const inventoryRecords = dataManager.get('inventoryRecords');
    const outboundLogs = dataManager.get('outboundLogs');

    for(const item of items) {
        const invIndex = inventoryRecords.findIndex(i => i.productId === item.productId && i.storeId === storeId);
        if (invIndex > -1) {
            if (inventoryRecords[invIndex].currentStock >= item.quantity) {
                inventoryRecords[invIndex].currentStock -= item.quantity;
                inventoryRecords[invIndex].lastUpdated = new Date().toISOString();
                outboundLogs.push({ ...item, storeId, date: new Date().toISOString() });
                processed = true;
            } else errors.push(`${products.find(p=>p.id === item.productId)?.name}: 在庫不足`);
        } else errors.push(`${products.find(p=>p.id === item.productId)?.name}: 在庫レコードなし`);
    }
    if(processed) {
        dataManager.set('inventoryRecords', inventoryRecords);
        dataManager.set('outboundLogs', outboundLogs);
    }
    return simulateApiCall({ success: errors.length === 0, errors });
};


// Purchase Orders (Persistent)
export const getPurchaseOrders = (storeId?: string): Promise<PurchaseOrder[]> => {
  const allPOs = dataManager.get('purchaseOrders');
  if (!storeId || storeId === 'all') return simulateApiCall(allPOs);
  return simulateApiCall(allPOs.filter(po => po.storeId === storeId));
};
export const getPurchaseOrderById = (id: string): Promise<PurchaseOrder | undefined> => {
  const allPOs = dataManager.get('purchaseOrders');
  return simulateApiCall(allPOs.find(po => po.id === id));
};
export const addPurchaseOrder = (orderData: Omit<PurchaseOrder, 'id' | 'status' | 'supplierName'>): Promise<PurchaseOrder> => {
  const suppliers = dataManager.get('suppliers');
  const newOrder: PurchaseOrder = {
    ...orderData, id: `po_${Date.now()}`, status: PurchaseOrderStatus.ORDERED,
    supplierName: suppliers.find(s => s.id === orderData.supplierId)?.name || '不明',
  };

  const purchaseOrders = dataManager.get('purchaseOrders');
  purchaseOrders.unshift(newOrder);
  dataManager.set('purchaseOrders', purchaseOrders);

  return simulateApiCall(newOrder);
};
export const processPurchaseOrderReceipt = async (orderId: string, receivedItems: {productId: string, quantity: number}[], userId: string) => {
    const purchaseOrders = dataManager.get('purchaseOrders');
    const poIndex = purchaseOrders.findIndex(p => p.id === orderId);
    if(poIndex === -1) throw new Error("Purchase Order not found");
    
    const inventoryRecords = dataManager.get('inventoryRecords');
    
    for (const rItem of receivedItems) {
        const poItem = purchaseOrders[poIndex].items.find(i => i.productId === rItem.productId);
        if (poItem) poItem.isReceived = true;
        const invIndex = inventoryRecords.findIndex(i => i.productId === rItem.productId && i.storeId === purchaseOrders[poIndex].storeId);
        if (invIndex > -1) inventoryRecords[invIndex].currentStock += rItem.quantity;
        else inventoryRecords.push({ productId: rItem.productId, storeId: purchaseOrders[poIndex].storeId, currentStock: rItem.quantity, minimumStock: 0, lastUpdated: new Date().toISOString() });
    }
    
    const allItemsReceived = purchaseOrders[poIndex].items.every(item => item.isReceived);
    if (allItemsReceived) {
        purchaseOrders[poIndex].status = PurchaseOrderStatus.COMPLETED;
        purchaseOrders[poIndex].completedDate = new Date().toISOString();
    } else purchaseOrders[poIndex].status = PurchaseOrderStatus.PARTIALLY_RECEIVED;
    
    dataManager.set('purchaseOrders', purchaseOrders);
    dataManager.set('inventoryRecords', inventoryRecords);

    return simulateApiCall({ success: true, updatedStatus: purchaseOrders[poIndex].status });
};

// Logs (Not persisted, just a mock endpoint)
export const addChangeLog = async (action: string, userId: string) => {
    console.log(`LOG: [User: ${userId}] performed action: "${action}" at ${new Date().toISOString()}`);
    return Promise.resolve({success: true});
};


// Reports (Calculated on the fly)
export const getMonthlyPurchaseReport = (month: string, storeId?: string): Promise<MonthlyReportDataPoint[]> => {
    const [year, monthNum] = month.split('-').map(Number);
    const report: MonthlyReportDataPoint[] = [];
    const allIntakes = dataManager.get('scheduledIntakeItems');
    
    const filteredIntakes = allIntakes.filter(item => {
        if (item.status !== ScheduledIntakeStatus.RECEIVED || !item.receivedDate) return false;
        const receivedDate = new Date(item.receivedDate);
        const storeMatch = !storeId || storeId === 'all' || item.storeId === storeId;
        return receivedDate.getFullYear() === year && (receivedDate.getMonth() + 1) === monthNum && storeMatch;
    });

    filteredIntakes.forEach(item => {
        const total = (item.costPriceAtIntake || 0) * item.quantity;
        if (item.supplierName && total > 0) {
            report.push({ month, supplierName: item.supplierName, totalAmount: total, });
        }
    });

    return simulateApiCall(report);
};

// A helper to get all data required for dashboards at once
const getDashboardContext = (storeId?: string) => {
    const allProducts = dataManager.get('products');
    const allInventory = dataManager.get('inventoryRecords');
    const allIntakes = dataManager.get('scheduledIntakeItems');
    const allOutbounds = dataManager.get('outboundLogs');
    const allCategories = dataManager.get('categories');
    const allSuppliers = dataManager.get('suppliers');
    
    const byStore = <T extends {storeId: string}>(item: T) => !storeId || storeId === 'all' || item.storeId === storeId;
    
    return {
        productsById: new Map(allProducts.map(p => [p.id, p])),
        relevantInventory: allInventory.filter(byStore),
        relevantIntakes: allIntakes.filter(byStore),
        relevantOutbounds: allOutbounds.filter(byStore),
        allProducts,
        allCategories,
        allSuppliers,
    };
}


export const getAdminDashboardData = async (startDate: string, endDate: string, periodLabel: string, storeId?: string): Promise<AdminDashboardData> => {
    const { productsById, relevantInventory, relevantIntakes, relevantOutbounds, allProducts, allCategories, allSuppliers } = getDashboardContext(storeId);
    
    const totalInventoryValueByUsage = relevantInventory.reduce((acc, record) => {
        const product = productsById.get(record.productId);
        if (product) {
            const value = record.currentStock * product.costPrice;
            if (product.usage === ProductUsage.RETAIL) acc.retail += value;
            else acc.professional += value;
        }
        return acc;
    }, { professional: 0, retail: 0 });
    const totalInventoryValue = totalInventoryValueByUsage.professional + totalInventoryValueByUsage.retail;

    const lowStockItemsCount = allProducts.reduce((count, p) => {
        const stock = getProductWithStock(p, storeId);
        return stock.currentStock < stock.minimumStock ? count + 1 : count;
    }, 0);
    const pendingIntakeApprovals = dataManager.get('scheduledIntakeItems').filter(item => item.status === ScheduledIntakeStatus.PENDING_APPROVAL).length;

    const start = new Date(startDate), end = new Date(endDate); end.setHours(23, 59, 59, 999);
    const prevStart = new Date(start); prevStart.setFullYear(start.getFullYear() - 1);
    const prevEnd = new Date(end); prevEnd.setFullYear(end.getFullYear() - 1);

    const supplierPerformances: SupplierMonthlyPerformance[] = allSuppliers.map(supplier => {
        const currentPeriodTotal = relevantIntakes.filter(i => i.supplierId === supplier.id && i.status === ScheduledIntakeStatus.RECEIVED && i.receivedDate && new Date(i.receivedDate) >= start && new Date(i.receivedDate) <= end).reduce((sum, i) => sum + (i.costPriceAtIntake || 0) * i.quantity, 0);
        const previousPeriodTotal = relevantIntakes.filter(i => i.supplierId === supplier.id && i.status === ScheduledIntakeStatus.RECEIVED && i.receivedDate && new Date(i.receivedDate) >= prevStart && new Date(i.receivedDate) <= prevEnd).reduce((sum, i) => sum + (i.costPriceAtIntake || 0) * i.quantity, 0);
        const difference = currentPeriodTotal - previousPeriodTotal;
        const percentageChange = previousPeriodTotal > 0 ? difference / previousPeriodTotal : (currentPeriodTotal > 0 ? Infinity : 0);
        return { supplierId: supplier.id, supplierName: supplier.name, currentPeriodTotal, previousPeriodTotal, difference, percentageChange };
    });
    const totalForPeriod = supplierPerformances.reduce((sum, s) => sum + s.currentPeriodTotal, 0);
    const totalForPreviousPeriod = supplierPerformances.reduce((sum, s) => sum + s.previousPeriodTotal, 0);

    const today = new Date(); const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1); const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const totalIntakeItemsThisMonthByUsage = relevantIntakes.filter(i => i.status === ScheduledIntakeStatus.RECEIVED && i.receivedDate && new Date(i.receivedDate) >= currentMonthStart && new Date(i.receivedDate) <= currentMonthEnd)
        .reduce((acc, i) => {
            const product = productsById.get(i.productId || '');
            if(product) {
                if(product.usage === ProductUsage.RETAIL) acc.retail += i.quantity;
                else acc.professional += i.quantity;
            }
            return acc;
        }, {professional: 0, retail: 0});
    const totalIntakeItemsThisMonth = totalIntakeItemsThisMonthByUsage.professional + totalIntakeItemsThisMonthByUsage.retail;
    
    const totalOutboundItemsThisMonthByUsage = relevantOutbounds.filter(o => new Date(o.date) >= currentMonthStart && new Date(o.date) <= currentMonthEnd)
        .reduce((acc, o) => {
            const product = productsById.get(o.productId);
            if(product) {
                if(product.usage === ProductUsage.RETAIL) acc.retail += o.quantity;
                else acc.professional += o.quantity;
            }
            return acc;
        }, {professional: 0, retail: 0});
    const totalOutboundItemsThisMonth = totalOutboundItemsThisMonthByUsage.professional + totalOutboundItemsThisMonthByUsage.retail;

    const topOutboundProductsThisMonth: MonthlyOutboundItem[] = relevantOutbounds.filter(o => new Date(o.date) >= currentMonthStart && new Date(o.date) <= currentMonthEnd).reduce((acc, o) => {
        let item = acc.find(i => i.productId === o.productId);
        if (item) item.totalQuantity += o.quantity;
        else acc.push({ productId: o.productId, productName: productsById.get(o.productId)?.name || '不明', totalQuantity: o.quantity });
        return acc;
    }, [] as MonthlyOutboundItem[]).sort((a,b) => b.totalQuantity - a.totalQuantity).slice(0, 5);

    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const inventoryWatchlist: WatchlistItem[] = [];
    let obsoleteStockItemsCount = 0;
    
    const obsoleteStockValueByUsage = { professional: 0, retail: 0 };

    allProducts.forEach(product => {
        const inventory = relevantInventory.find(i => i.productId === product.id); if (!inventory) return;
        const lastUpdateDate = new Date(inventory.lastUpdated);
        const daysSinceLastUpdate = Math.floor((new Date().getTime() - lastUpdateDate.getTime()) / (1000 * 3600 * 24));
        if (lastUpdateDate < sixMonthsAgo) {
            inventoryWatchlist.push({ product: getProductWithStock(product, storeId), reason: 'obsolete', daysSinceLastUpdate });
            obsoleteStockItemsCount++;
            const value = inventory.currentStock * product.costPrice;
            if (product.usage === ProductUsage.RETAIL) obsoleteStockValueByUsage.retail += value;
            else obsoleteStockValueByUsage.professional += value;
        } else if (inventory.currentStock > inventory.minimumStock * 3 && inventory.minimumStock > 0) {
            inventoryWatchlist.push({ product: getProductWithStock(product, storeId), reason: 'excess', daysSinceLastUpdate });
        }
    });
    const obsoleteStockValue = obsoleteStockValueByUsage.professional + obsoleteStockValueByUsage.retail;

    const inventoryMovement: InventoryMovement[] = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1); const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const intake = relevantIntakes.filter(item => item.status === ScheduledIntakeStatus.RECEIVED && item.receivedDate && new Date(item.receivedDate) >= monthStart && new Date(item.receivedDate) <= monthEnd).reduce((sum, item) => sum + item.quantity, 0);
        const outbound = relevantOutbounds.filter(item => new Date(item.date) >= monthStart && new Date(item.date) <= monthEnd).reduce((sum, item) => sum + item.quantity, 0);
        inventoryMovement.push({ month: monthKey, intake, outbound });
    }

    const categoryPerformance: CategoryPerformance[] = allCategories.filter(c => c.parentId !== null).map(category => {
        const productsInCategory = allProducts.filter(p => p.categoryId === category.id);
        const productIdsInCategory = new Set(productsInCategory.map(p => p.id));
        const inventoryValue = relevantInventory.filter(i => productIdsInCategory.has(i.productId)).reduce((sum, i) => sum + (i.currentStock * (productsById.get(i.productId)?.costPrice || 0)), 0);
        const outboundValue = relevantOutbounds.filter(o => productIdsInCategory.has(o.productId)).reduce((sum, o) => sum + (o.quantity * (productsById.get(o.productId)?.costPrice || 0)), 0);
        const turnoverRate = inventoryValue > 0 ? outboundValue / inventoryValue : 0;
        return { categoryId: category.id, categoryName: category.name, inventoryValue, turnoverRate };
    }).filter(c => c.inventoryValue > 0);

    const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const outboundValueLast3Months = relevantOutbounds.filter(o => new Date(o.date) >= threeMonthsAgo).reduce((sum, o) => sum + (o.quantity * (productsById.get(o.productId)?.costPrice || 0)), 0);
    const annualizedOutboundCost = outboundValueLast3Months * 4;
    const inventoryTurnoverRate = totalInventoryValue > 0 ? annualizedOutboundCost / totalInventoryValue : 0;
    
    const supplierUsageMap = new Map<string, { profIntake: number; retailIntake: number; profOutbound: number; retailOutbound: number }>();
    const ensureSupplier = (id: string) => {
        if (!supplierUsageMap.has(id)) supplierUsageMap.set(id, { profIntake: 0, retailIntake: 0, profOutbound: 0, retailOutbound: 0 });
        return supplierUsageMap.get(id)!;
    };
    
    relevantIntakes
        .filter(i => i.status === ScheduledIntakeStatus.RECEIVED && i.receivedDate && new Date(i.receivedDate) >= start && new Date(i.receivedDate) <= end)
        .forEach(intake => {
            const product = productsById.get(intake.productId || '');
            if (product && intake.supplierId) {
                const intakeAmount = (intake.costPriceAtIntake || product.costPrice || 0) * intake.quantity;
                const supplierEntry = ensureSupplier(intake.supplierId);
                if (product.usage === ProductUsage.RETAIL) supplierEntry.retailIntake += intakeAmount;
                else supplierEntry.profIntake += intakeAmount;
            }
        });

    relevantOutbounds
        .filter(o => new Date(o.date) >= start && new Date(o.date) <= end)
        .forEach(outbound => {
            const product = productsById.get(outbound.productId);
            if (product && product.supplierId) {
                const outboundAmount = product.costPrice * outbound.quantity;
                const supplierEntry = ensureSupplier(product.supplierId);
                if (product.usage === ProductUsage.RETAIL) supplierEntry.retailOutbound += outboundAmount;
                else supplierEntry.profOutbound += outboundAmount;
            }
        });

    const supplierUsagePerformance: SupplierUsagePerformance[] = allSuppliers.map(supplier => {
        const usageData = supplierUsageMap.get(supplier.id) || { profIntake: 0, retailIntake: 0, profOutbound: 0, retailOutbound: 0 };
        return {
            supplierId: supplier.id, supplierName: supplier.name,
            professionalIntakeAmount: usageData.profIntake, retailIntakeAmount: usageData.retailIntake,
            professionalOutboundAmount: usageData.profOutbound, retailOutboundAmount: usageData.retailOutbound,
        };
    }).filter(s => s.professionalIntakeAmount > 0 || s.retailIntakeAmount > 0 || s.professionalOutboundAmount > 0 || s.retailOutboundAmount > 0);

    return simulateApiCall({
        totalInventoryValue, lowStockItemsCount, pendingIntakeApprovals, obsoleteStockItemsCount,
        selectedPeriodSummary: { periodLabel, supplierPerformances, totalForPeriod, totalForPreviousPeriod },
        currentCalendarMonthStats: { month: `${today.getFullYear()}-${today.getMonth() + 1}`, totalMaterialCost: totalForPeriod },
        totalIntakeItemsThisMonth, totalOutboundItemsThisMonth, topOutboundProductsThisMonth, inventoryWatchlist,
        obsoleteStockValue, inventoryTurnoverRate, inventoryMovement, categoryPerformance,
        totalInventoryValueByUsage, obsoleteStockValueByUsage, totalIntakeItemsThisMonthByUsage, totalOutboundItemsThisMonthByUsage,
        supplierUsagePerformance,
    });
};

export const getStaffDashboardData = async (storeId?: string): Promise<StaffDashboardData> => {
    if (!storeId || storeId === 'all') throw new Error("Staff must be associated with a store.");
    const { productsById, relevantInventory, relevantIntakes, relevantOutbounds, allProducts } = getDashboardContext(storeId);
    
    const approxTotalInventoryValue = "約 ¥" + relevantInventory.reduce((sum, record) => {
        const product = productsById.get(record.productId);
        return sum + (record.currentStock * (product?.costPrice || 0));
    }, 0).toLocaleString();

    const lowStockItemsCount = allProducts.reduce((count, p) => {
        const stock = getProductWithStock(p, storeId);
        return stock.currentStock < stock.minimumStock ? count + 1 : count;
    }, 0);

    const today = new Date(); const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1); const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const totalIntakeItemsThisMonthByUsage = relevantIntakes.filter(i => i.status === ScheduledIntakeStatus.RECEIVED && i.receivedDate && new Date(i.receivedDate) >= currentMonthStart && new Date(i.receivedDate) <= currentMonthEnd)
        .reduce((acc, i) => {
            const product = productsById.get(i.productId || '');
            if(product) {
                if(product.usage === ProductUsage.RETAIL) acc.retail += i.quantity;
                else acc.professional += i.quantity;
            }
            return acc;
        }, {professional: 0, retail: 0});
    const totalIntakeItemsThisMonth = totalIntakeItemsThisMonthByUsage.professional + totalIntakeItemsThisMonthByUsage.retail;

    const totalOutboundItemsThisMonthByUsage = relevantOutbounds.filter(o => new Date(o.date) >= currentMonthStart && new Date(o.date) <= currentMonthEnd)
        .reduce((acc, o) => {
            const product = productsById.get(o.productId);
            if(product) {
                if(product.usage === ProductUsage.RETAIL) acc.retail += o.quantity;
                else acc.professional += o.quantity;
            }
            return acc;
        }, {professional: 0, retail: 0});
    const totalOutboundItemsThisMonth = totalOutboundItemsThisMonthByUsage.professional + totalOutboundItemsThisMonthByUsage.retail;

    const topOutboundProductsThisMonth: MonthlyOutboundItem[] = relevantOutbounds.filter(o => new Date(o.date) >= currentMonthStart && new Date(o.date) <= currentMonthEnd).reduce((acc, o) => {
        let item = acc.find(i => i.productId === o.productId);
        if (item) item.totalQuantity += o.quantity;
        else acc.push({ productId: o.productId, productName: productsById.get(o.productId)?.name || '不明', totalQuantity: o.quantity });
        return acc;
    }, [] as MonthlyOutboundItem[]).sort((a,b) => b.totalQuantity - a.totalQuantity).slice(0, 5);
    
    return simulateApiCall({ 
        approxTotalInventoryValue, lowStockItemsCount, 
        totalIntakeItemsThisMonth, totalOutboundItemsThisMonth, 
        topOutboundProductsThisMonth,
        totalIntakeItemsThisMonthByUsage, totalOutboundItemsThisMonthByUsage
    });
};

const getAujuaTopLevelParent = (categoryId: string): Category | null => {
    if (aujuaTopLevelCategoryCache.has(categoryId)) {
        return aujuaTopLevelCategoryCache.get(categoryId) as Category | null;
    }

    const categories = dataManager.get('categories');
    let currentCategory = categories.find(c => c.id === categoryId);
    if (!currentCategory) {
        aujuaTopLevelCategoryCache.set(categoryId, null);
        return null;
    }

    while (currentCategory.parentId !== null && currentCategory.parentId !== AUJUA_ROOT_CATEGORY_ID) {
        currentCategory = categories.find(c => c.id === currentCategory!.parentId);
        if (!currentCategory) {
            aujuaTopLevelCategoryCache.set(categoryId, null);
            return null;
        }
    }
    
    if (currentCategory.parentId === AUJUA_ROOT_CATEGORY_ID) {
        aujuaTopLevelCategoryCache.set(categoryId, currentCategory);
        return currentCategory;
    }

    aujuaTopLevelCategoryCache.set(categoryId, null);
    return null;
};


export const getAujuaDashboardData = async (month: string, storeId?: string): Promise<AujuaDashboardData> => {
    if (!storeId || storeId === 'all') throw new Error("Aujua担当者は店舗に所属している必要があります。");

    const [year, monthNum] = month.split('-').map(Number);
    const selectedMonthStart = new Date(year, monthNum - 1, 1);
    const selectedMonthEnd = new Date(year, monthNum, 0);
    selectedMonthEnd.setHours(23, 59, 59, 999);

    const aujuaIds = getAujuaDescendantCategoryIds();
    const allProducts = dataManager.get('products');
    const aujuaProducts = allProducts.filter(p => aujuaIds.has(p.categoryId));
    const aujuaProductIds = new Set(aujuaProducts.map(p => p.id));
    
    const byStore = <T extends { storeId: string }>(item: T) => item.storeId === storeId;

    const allInventoryForStore: ProductWithStock[] = aujuaProducts.map(p => getProductWithStock(p, storeId));
    const totalInventoryAmount = allInventoryForStore.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0);
    const lowStockItemsCount = allInventoryForStore.filter(p => p.currentStock < p.minimumStock).length;

    const allIntakes = dataManager.get('scheduledIntakeItems');
    const allIntakesForMonth = allIntakes
        .filter(byStore)
        .filter(i => i.status === ScheduledIntakeStatus.RECEIVED && i.productId && aujuaProductIds.has(i.productId))
        .filter(i => {
            if (!i.receivedDate) return false;
            const receivedDate = new Date(i.receivedDate);
            return receivedDate >= selectedMonthStart && receivedDate <= selectedMonthEnd;
        });
    const monthlyIntakeAmount = allIntakesForMonth.reduce((sum, i) => sum + (i.costPriceAtIntake || 0) * i.quantity, 0);
    
    const allOutbounds = dataManager.get('outboundLogs');
    const allOutboundsForMonth = allOutbounds
        .filter(byStore)
        .filter(o => aujuaProductIds.has(o.productId))
        .filter(o => {
            const outboundDate = new Date(o.date);
            return outboundDate >= selectedMonthStart && outboundDate <= selectedMonthEnd;
        });
    const monthlyOutboundAmount = allOutboundsForMonth.reduce((sum, log) => {
        const product = allProducts.find(p => p.id === log.productId);
        return sum + (log.quantity * (product?.costPrice || 0));
    }, 0);

    const inventoryGroupsMap = new Map<string, AujuaInventoryCategoryGroup>();
    allInventoryForStore.forEach(product => {
        const topLevelParent = getAujuaTopLevelParent(product.categoryId);
        if (topLevelParent) {
            if (!inventoryGroupsMap.has(topLevelParent.id)) {
                inventoryGroupsMap.set(topLevelParent.id, {
                    categoryId: topLevelParent.id, categoryName: topLevelParent.name,
                    itemCount: 0, totalValue: 0, items: []
                });
            }
            const group = inventoryGroupsMap.get(topLevelParent.id)!;
            group.items.push(product);
            group.itemCount += 1;
            group.totalValue += product.currentStock * product.costPrice;
        }
    });
    const inventoryGroups = Array.from(inventoryGroupsMap.values()).sort((a,b) => a.categoryName.localeCompare(b.categoryName));

    const allHistory = await getAujuaUnifiedHistory(storeId);
    const historyForMonth = allHistory.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= selectedMonthStart && itemDate <= selectedMonthEnd;
    });

    const historyByProductMap = historyForMonth.reduce((acc, item) => {
        if (!acc.has(item.productId)) {
            acc.set(item.productId, {
                productId: item.productId,
                productName: item.productName,
                historyItems: [],
            });
        }
        acc.get(item.productId)!.historyItems.push(item);
        return acc;
    }, new Map<string, AujuaProductHistoryGroup>());

    const monthlyHistoryByProduct = Array.from(historyByProductMap.values());
    monthlyHistoryByProduct.forEach(group => {
        group.historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    monthlyHistoryByProduct.sort((a, b) => a.productName.localeCompare(b.productName));

    const trendData: InventoryMovement[] = [];
    for (let i = 2; i >= 0; i--) {
        const d = new Date(year, monthNum - 1, 1);
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

        const intake = allIntakes
            .filter(byStore)
            .filter(item => item.status === ScheduledIntakeStatus.RECEIVED && item.productId && aujuaProductIds.has(item.productId) && item.receivedDate && new Date(item.receivedDate) >= monthStart && new Date(item.receivedDate) <= monthEnd)
            .reduce((sum, item) => sum + item.quantity, 0);

        const outbound = allOutbounds
            .filter(byStore)
            .filter(item => aujuaProductIds.has(item.productId) && new Date(item.date) >= monthStart && new Date(item.date) <= monthEnd)
            .reduce((sum, item) => sum + item.quantity, 0);

        trendData.push({ month: monthKey, intake, outbound });
    }

    const dashboardResult: AujuaDashboardData = {
        totalInventoryAmount,
        lowStockItemsCount,
        selectedMonth: month,
        monthlyIntakeAmount,
        monthlyOutboundAmount,
        currentInventoryList: inventoryGroups,
        monthlyHistoryByProduct,
        trendData,
    };

    return simulateApiCall(dashboardResult);
};

export const getAujuaUnifiedHistory = async (storeId?: string): Promise<UnifiedHistoryItem[]> => {
    if (!storeId || storeId === 'all') throw new Error("Aujua担当者は店舗に所属している必要があります。");
    
    const allProducts = dataManager.get('products');
    const aujuaIds = getAujuaDescendantCategoryIds();
    const aujuaProductIds = new Set(allProducts.filter(p => aujuaIds.has(p.categoryId)).map(p => p.id));
    const productsById = new Map(allProducts.map(p => [p.id, p]));
    
    const byStore = <T extends {storeId: string}>(item: T) => item.storeId === storeId;
    
    const allIntakes = dataManager.get('scheduledIntakeItems');
    const intakeHistory: UnifiedHistoryItem[] = allIntakes
        .filter(byStore)
        .filter(i => i.status === ScheduledIntakeStatus.RECEIVED && i.productId && aujuaProductIds.has(i.productId))
        .map(i => ({
            id: `in-${i.id}`, type: 'intake', date: i.receivedDate!, productId: i.productId!,
            productName: i.productName, quantity: i.quantity, notes: i.notes,
        }));
    
    const allOutbounds = dataManager.get('outboundLogs');
    const outboundHistory: UnifiedHistoryItem[] = allOutbounds
        .filter(byStore)
        .filter(o => aujuaProductIds.has(o.productId))
        .map((o, index) => ({
            id: `out-${o.date}-${index}`, type: 'outbound', date: o.date, productId: o.productId,
            productName: productsById.get(o.productId)?.name || '不明', quantity: o.quantity, notes: '通常出庫',
        }));
    
    const allNewLogs = dataManager.get('newProductLogs');
    const allUsers = dataManager.get('users');
    const newProductHistory: UnifiedHistoryItem[] = allNewLogs
        .filter(byStore)
        .filter(log => aujuaProductIds.has(log.productId))
        .map(log => ({
            id: `new-${log.id}`, type: 'new_product', date: log.date, productId: log.productId,
            productName: productsById.get(log.productId)?.name || '不明', quantity: log.quantity,
            notes: `初回在庫登録 (担当: ${allUsers.find(u => u.id === log.operatorId)?.name || '不明'})`,
        }));

    const unifiedHistory = [...intakeHistory, ...outboundHistory, ...newProductHistory];
    unifiedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return simulateApiCall(unifiedHistory);
}

export const getCategoryAnalysisData = async (
    parentCategoryId?: string, 
    childCategoryId?: string, 
    storeId?: string
): Promise<CategoryAnalysisData> => {
    
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    currentMonthEnd.setHours(23, 59, 59, 999);

    const { productsById, relevantIntakes, relevantOutbounds, allProducts, allCategories } = getDashboardContext(storeId);

    let targetCategoryIds = new Set<string>();
    if (childCategoryId) {
        targetCategoryIds.add(childCategoryId);
    } else if (parentCategoryId) {
        targetCategoryIds.add(parentCategoryId);
        const findChildren = (pId: string) => {
            allCategories.filter(c => c.parentId === pId).forEach(child => {
                targetCategoryIds.add(child.id);
                findChildren(child.id);
            });
        };
        findChildren(parentCategoryId);
    }
    
    const filteredProducts = targetCategoryIds.size > 0 
        ? allProducts.filter(p => targetCategoryIds.has(p.categoryId))
        : allProducts;
    
    const filteredProductIds = new Set(filteredProducts.map(p => p.id));

    const monthIntakes = relevantIntakes.filter(i => i.status === ScheduledIntakeStatus.RECEIVED && i.productId && filteredProductIds.has(i.productId) && i.receivedDate && new Date(i.receivedDate) >= currentMonthStart && new Date(i.receivedDate) <= currentMonthEnd);

    const intakeTotals = monthIntakes.reduce((acc, i) => {
        const product = productsById.get(i.productId!);
        if (product) {
            const amount = (i.costPriceAtIntake || product.costPrice || 0) * i.quantity;
            acc.total += amount;
            if (product.usage === ProductUsage.RETAIL) acc.retail += amount;
            else acc.professional += amount;
        }
        return acc;
    }, { professional: 0, retail: 0, total: 0 });

    const intakeAggregated = monthIntakes.reduce((acc, i) => {
        const amount = (i.costPriceAtIntake || 0) * i.quantity;
        if (!acc[i.productId!]) acc[i.productId!] = { quantity: 0, amount: 0 };
        acc[i.productId!].quantity += i.quantity;
        acc[i.productId!].amount += amount;
        return acc;
    }, {} as Record<string, { quantity: number, amount: number }>);

    const intakeRanking: RankedProduct[] = Object.entries(intakeAggregated)
        .map(([productId, itemData]) => ({ productId, productName: productsById.get(productId)?.name || '不明', usage: productsById.get(productId)?.usage || ProductUsage.PROFESSIONAL, ...itemData }))
        .sort((a, b) => b.amount - a.amount)
        .map((p, index) => ({ ...p, rank: index + 1 }));

    const monthOutbounds = relevantOutbounds.filter(o => filteredProductIds.has(o.productId) && new Date(o.date) >= currentMonthStart && new Date(o.date) <= currentMonthEnd);
    
    const outboundTotals = monthOutbounds.reduce((acc, o) => {
        const product = productsById.get(o.productId);
        if (product) {
            const amount = product.costPrice * o.quantity;
            acc.total += amount;
            if (product.usage === ProductUsage.RETAIL) acc.retail += amount;
            else acc.professional += amount;
        }
        return acc;
    }, { professional: 0, retail: 0, total: 0 });

    const outboundAggregated = monthOutbounds.reduce((acc, o) => {
        const product = productsById.get(o.productId);
        if(product) {
            const amount = product.costPrice * o.quantity;
            if (!acc[o.productId]) acc[o.productId] = { quantity: 0, amount: 0 };
            acc[o.productId].quantity += o.quantity;
            acc[o.productId].amount += amount;
        }
        return acc;
    }, {} as Record<string, { quantity: number, amount: number }>);

    const outboundRanking: RankedProduct[] = Object.entries(outboundAggregated)
        .map(([productId, itemData]) => ({ productId, productName: productsById.get(productId)?.name || '不明', usage: productsById.get(productId)?.usage || ProductUsage.PROFESSIONAL, ...itemData }))
        .sort((a, b) => b.amount - a.amount)
        .map((p, index) => ({ ...p, rank: index + 1 }));

    const result: CategoryAnalysisData = {
        period: month,
        totalOutbound: outboundTotals,
        totalIntake: intakeTotals,
        outboundRanking,
        intakeRanking,
    };
    
    return simulateApiCall(result);
};