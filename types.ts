import React from 'react';

export enum UserRole {
  ADMIN = '管理者',
  STAFF = 'スタッフ',
  AUJUA_STAFF = 'Aujua担当',
}

export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface User {
  id:string;
  name: string;
  role: UserRole;
  storeId?: string; // Staff must have a storeId
  hashedPassword?: string; // パスワード保存用 (モック)
}

export interface Category {
  id:string;
  name: string;
  parentId: string | null; // ルートカテゴリの場合はnull
}

export enum ProductUsage {
  PROFESSIONAL = '業務',
  RETAIL = '店販',
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string; // 旧カテゴリ名フィールド (移行用)
  categoryId: string; // 必須とする
  usage: ProductUsage; // 業務 or 店販
  costPrice: number; // 標準原価 For admin
  supplierId: string;
  lastUpdated: string; // 商品情報の最終更新日 or 在庫変動日
  description?: string; // AI生成用商品説明
  imageUrl?: string;
}

export interface InventoryRecord {
  productId: string;
  storeId: string;
  currentStock: number;
  minimumStock: number;
  lastUpdated: string;
}

// A composite type used frequently in the UI
export interface ProductWithStock extends Product {
  currentStock: number;
  minimumStock: number;
}


export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string; // 新規追加: 住所
  lineId?: string; // 新規追加: LINE ID
}

export enum ScheduledIntakeStatus {
  PENDING_APPROVAL = '承認待ち',
  APPROVED = '承認済み',
  RECEIVED = '入荷済み',
  MANUAL_CHECK_NEEDED = '要手動確認',
  REJECTED = '却下',
}

export interface ScheduledIntakeItem {
  id: string;
  productName: string; // Initially from email or invoice
  productId?: string; // Linked after confirmation or new product registration
  barcode?: string; // Optional: for reference or if parsed from invoice
  quantity: number;
  pricePerUnit?: number; // From email, for admin
  costPriceAtIntake?: number; // Actual cost at the time of intake, from invoice
  status: ScheduledIntakeStatus;
  supplierName?: string; // From email or linked supplier
  supplierId?: string; // Link to supplier table
  storeId: string; // Which store is this intake for
  estimatedArrivalDate?: string;
  receivedDate?: string; // Actual date received, for precise monthly calculation
  notes?: string;
  lastUpdated: string; // Record last update timestamp
  invoiceReference?: string; // Optional: to link back to an invoice if needed
}

export interface MonthlyReportDataPoint {
  month: string; // YYYY-MM
  supplierName: string;
  totalAmount: number;
}

// For Admin Dashboard
export interface SupplierMonthlyPerformance {
  supplierId: string;
  supplierName: string;
  currentPeriodTotal: number;
  previousPeriodTotal: number;
  difference: number;
  percentageChange: number; // e.g., 0.1 for 10%, -0.05 for -5%
}

// 1ヶ月の出庫データを保持する型
export interface MonthlyOutboundItem {
  productId: string;
  productName: string;
  totalQuantity: number;
}

// 不良在庫・過剰在庫の型
export interface WatchlistItem {
  product: ProductWithStock;
  reason: 'obsolete' | 'excess'; // 'obsolete' = 不良在庫, 'excess' = 過剰在庫
  daysSinceLastUpdate: number;
}

// For Admin Dashboard new analytics
export interface InventoryMovement {
  month: string; // e.g., '2023-01'
  intake: number;
  outbound: number;
}

export interface CategoryPerformance {
  categoryId: string;
  categoryName: string;
  inventoryValue: number;
  turnoverRate: number; // A representative number, higher is better
  [key: string]: any;
}

export interface SupplierUsagePerformance {
  supplierId: string;
  supplierName: string;
  professionalIntakeAmount: number;
  retailIntakeAmount: number;
  professionalOutboundAmount: number;
  retailOutboundAmount: number;
}

export interface AdminDashboardData {
  // Overall stats (not dependent on selected period)
  totalInventoryValue: number;
  lowStockItemsCount: number;
  pendingIntakeApprovals: number;
  obsoleteStockItemsCount: number;

  // Stats for a *selected* period (passed as argument to API)
  selectedPeriodSummary: {
    periodLabel: string;
    supplierPerformances: SupplierMonthlyPerformance[];
    totalForPeriod: number;
    totalForPreviousPeriod: number;
  };

  // Stats for the *actual current* calendar month
  currentCalendarMonthStats: {
    month: string;
    totalMaterialCost: number;
  };
  
  // Existing Analysis Data
  totalIntakeItemsThisMonth: number;
  totalOutboundItemsThisMonth: number;
  topOutboundProductsThisMonth: MonthlyOutboundItem[];
  inventoryWatchlist: WatchlistItem[];

  // New High-Level Metrics
  obsoleteStockValue: number; // 不良在庫金額
  inventoryTurnoverRate: number; // 在庫回転率

  // New Detailed Analysis Data
  inventoryMovement: InventoryMovement[]; // 在庫推移
  categoryPerformance: CategoryPerformance[]; // カテゴリ別分析

  // New by-usage breakdowns
  totalInventoryValueByUsage: { professional: number; retail: number; };
  obsoleteStockValueByUsage: { professional: number; retail: number; };
  totalIntakeItemsThisMonthByUsage: { professional: number; retail: number; };
  totalOutboundItemsThisMonthByUsage: { professional: number; retail: number; };
  
  // New usage analysis by supplier and category
  supplierUsagePerformance: SupplierUsagePerformance[];
}

// New Types for Category Detailed Analysis
export interface RankedProduct {
  rank: number;
  productId: string;
  productName: string;
  usage: ProductUsage;
  quantity: number;
  amount: number;
}

export interface CategoryAnalysisData {
  period: string; // e.g., "2024-06"
  totalOutbound: { professional: number; retail: number; total: number };
  totalIntake: { professional: number; retail: number; total: number };
  outboundRanking: RankedProduct[];
  intakeRanking: RankedProduct[];
}


export interface StaffDashboardData {
  approxTotalInventoryValue: string; // e.g. "約 ¥XXX,XXX" - calculation on backend preferred
  lowStockItemsCount: number;
  totalIntakeItemsThisMonth: number; // 当月入庫アイテム総数
  totalOutboundItemsThisMonth: number; // 当月出庫アイテム総数
  topOutboundProductsThisMonth: MonthlyOutboundItem[]; // 当月出庫数TOP5商品
  // New by-usage breakdowns
  totalIntakeItemsThisMonthByUsage: { professional: number; retail: number; };
  totalOutboundItemsThisMonthByUsage: { professional: number; retail: number; };
}

// New interfaces for grouped data in Aujua Dashboard
export interface AujuaInventoryCategoryGroup {
  categoryId: string;
  categoryName: string;
  itemCount: number;
  totalValue: number;
  items: ProductWithStock[];
}

// New interface for the enhanced Aujua Dashboard history view
export interface AujuaProductHistoryGroup {
  productId: string;
  productName: string;
  historyItems: UnifiedHistoryItem[];
}

export interface AujuaDashboardData {
  // Overall Stats
  totalInventoryAmount: number;
  lowStockItemsCount: number;

  // Month-specific stats
  selectedMonth: string;
  monthlyIntakeAmount: number;
  monthlyOutboundAmount: number; // New field

  // Detailed lists (now grouped)
  currentInventoryList: AujuaInventoryCategoryGroup[];
  monthlyHistoryByProduct: AujuaProductHistoryGroup[]; // Replaces monthlyIntakeList
  
  // Trend data
  trendData: InventoryMovement[];
}

export interface NavigationItem {
  name: string;
  path: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
  roles?: UserRole[];
  children?: NavigationItem[]; // For nested admin navigation
  notificationCount?: () => number; // Optional function to get notification count
}

// Props for common components
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  contentClassName?: string;
}

export interface TableHeader<T> {
  key: keyof T | string;
  label: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  cellClassName?: string;
  headerClassName?: string;
}

export interface TableProps<T> {
  headers: TableHeader<T>[];
  data: T[];
  itemKey: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

// For AI Invoice Parsing
export interface RawInvoiceItem { // Data structure AI is prompted to return
  itemName: string;
  quantity: string; // e.g., "10", "5個", "2ダース"
  unitPrice?: string; // e.g., "1000", "500円"
  totalPrice?: string; // If AI provides total price instead of unit price
}

export interface ProcessedInvoiceItem {
  _tempId: string; // For React list key
  rawItem: RawInvoiceItem; // Original data from AI for reference

  matchedProductId: string | null; // If an existing product is matched
  isNewProduct: boolean;

  // Editable fields for the user
  productName: string; // Pre-filled from matched product or rawItem.itemName
  barcode: string; // Required if isNewProduct
  categoryId: string; // Required if isNewProduct
  usage: ProductUsage; // Required if isNewProduct
  minimumStock: number; // Required if isNewProduct
  imageUrl?: string;
  
  quantity: number; // Parsed and editable
  pricePerUnit: number; // Parsed/calculated and editable (this will be costPriceAtIntake for the intake record)
  
  error?: string; // For displaying validation errors per item
  status: 'pending' | 'matched' | 'new_details_required' | 'ready' | 'importing' | 'imported' | 'error_importing';
}

// For Outbound Page (New UI)
export interface OutboundCartItem {
  product: ProductWithStock;
  quantity: number;
}

// For Purchase List Context
export interface PurchaseListItem {
  product: ProductWithStock;
  quantity: number;
  supplierId: string;
  addedAt: string; // YYYY-MM-DD
}

// New Types for Date-based Purchase Orders
export enum PurchaseOrderStatus {
  ORDERED = '発注済み',
  PARTIALLY_RECEIVED = '一部入荷済み',
  COMPLETED = '入荷処理完了',
  CANCELLED = 'キャンセル',
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string; 
  barcode: string;
  quantity: number;
  costPriceAtOrder: number;
  isReceived: boolean; 
}

export interface PurchaseOrder {
  id: string;
  orderDate: string; // YYYY-MM-DD
  completedDate?: string; // YYYY-MM-DD
  supplierId: string;
  supplierName: string;
  storeId: string;
  items: PurchaseOrderItem[];
  status: PurchaseOrderStatus;
  notes?: string;
  createdById: string; // userId
}

export interface CompanyInfo {
  id: string; // 'main'
  name: string;
  address: string;
  phone: string;
  fax?: string;
  website?: string;
  representativeName?: string;
}

export interface NewProductLog {
  id: string;
  productId: string;
  storeId: string;
  quantity: number; // initial stock
  date: string;
  operatorId: string;
}

export interface AllDataBackup {
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

export interface AutoBackupInfo {
  timestamp: string;
  stats: {
    products: number;
    users: number;

    stores: number;
  };
}

export interface AutoBackup extends AllDataBackup {
  backupInfo: AutoBackupInfo;
}

export interface UnifiedHistoryItem {
  id: string;
  type: 'intake' | 'outbound' | 'new_product';
  date: string;
  productId: string;
  productName: string;
  quantity: number;
  operatorName?: string;
  notes?: string;
}