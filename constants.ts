import { HomeIcon, ArchiveBoxIcon, TruckIcon, UsersIcon, ChartBarIcon, ClipboardDocumentListIcon, Cog6ToothIcon, FolderIcon, UserGroupIcon, ArrowDownOnSquareStackIcon, BuildingStorefrontIcon, UserCircleIcon, QrCodeIcon, ArrowUpOnSquareIcon, DocumentPlusIcon, ShoppingBagIcon, ArchiveBoxXMarkIcon, BuildingOffice2Icon, StarIcon } from '@heroicons/react/24/outline';
import { NavigationItem, UserRole } from './types';

export const APP_TITLE = "Salon Stock Intelligence";

export const ROUTE_PATHS = {
  DASHBOARD: '/',
  INVENTORY: '/inventory',
  INTAKE: '/intake',
  OUTBOUND: '/outbound', 
  PURCHASE_ORDER: '/purchase-order',
  REPORTS: '/reports',
  STAFF: '/staff', 
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_STORES: '/admin/stores',
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_STAFF: '/admin/staff',
  ADMIN_SUPPLIERS: '/admin/suppliers',
  ADMIN_COMPANY_INFO: '/admin/company',
  ADMIN_CSV_IMPORT_EXPORT: '/admin/csv',
  ADMIN_PROFILE: '/admin/profile', 
  ADMIN_NEW_PRODUCT_REGISTRATION: '/admin/new-product-registration',
  AUJUA_DASHBOARD: '/auju/dashboard',
  AUJUA_HISTORY: '/auju/history',
};

export const AUJUA_ROOT_CATEGORY_ID = 'cat_auju';

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { name: 'ダッシュボード', path: ROUTE_PATHS.DASHBOARD, icon: HomeIcon, roles: [UserRole.ADMIN, UserRole.STAFF] },
  { name: '在庫管理', path: ROUTE_PATHS.INVENTORY, icon: ArchiveBoxIcon, roles: [UserRole.ADMIN, UserRole.STAFF] },
  { name: '入荷処理', path: ROUTE_PATHS.INTAKE, icon: TruckIcon, roles: [UserRole.ADMIN, UserRole.STAFF] }, 
  { name: '出庫処理', path: ROUTE_PATHS.OUTBOUND, icon: ArrowUpOnSquareIcon, roles: [UserRole.ADMIN, UserRole.STAFF] }, 
  { name: '月次レポート', path: ROUTE_PATHS.REPORTS, icon: ChartBarIcon, roles: [UserRole.ADMIN, UserRole.STAFF] },
  { name: 'Aujua管理', path: ROUTE_PATHS.AUJUA_DASHBOARD, icon: StarIcon, roles: [UserRole.ADMIN, UserRole.AUJUA_STAFF] },
  { name: '管理者設定', path: ROUTE_PATHS.ADMIN_DASHBOARD, icon: Cog6ToothIcon, roles: [UserRole.ADMIN] }, 
];

export const ADMIN_NAVIGATION_ITEMS: NavigationItem[] = [
  { name: '管理ダッシュボード', path: ROUTE_PATHS.ADMIN_DASHBOARD, icon: HomeIcon },
  { name: '店舗管理', path: ROUTE_PATHS.ADMIN_STORES, icon: BuildingStorefrontIcon },
  { name: 'カテゴリ管理', path: ROUTE_PATHS.ADMIN_CATEGORIES, icon: FolderIcon },
  { name: 'スタッフ管理', path: ROUTE_PATHS.ADMIN_STAFF, icon: UserGroupIcon },
  { name: '新規商品登録', path: ROUTE_PATHS.ADMIN_NEW_PRODUCT_REGISTRATION, icon: DocumentPlusIcon },
  { name: '会社情報管理', path: ROUTE_PATHS.ADMIN_COMPANY_INFO, icon: BuildingOffice2Icon },
  { name: 'CSVインポート/エクスポート', path: ROUTE_PATHS.ADMIN_CSV_IMPORT_EXPORT, icon: ArrowDownOnSquareStackIcon },
  { name: '管理者情報変更', path: ROUTE_PATHS.ADMIN_PROFILE, icon: UserCircleIcon },
];

export const AUJUA_NAVIGATION_ITEMS: NavigationItem[] = [
    { name: 'Aujua ダッシュボード', path: ROUTE_PATHS.AUJUA_DASHBOARD, icon: HomeIcon },
    { name: 'Aujua 入出庫履歴', path: ROUTE_PATHS.AUJUA_HISTORY, icon: ClipboardDocumentListIcon },
];

export const UI_TEXT = {
  SAVE: '保存',
  CANCEL: 'キャンセル',
  ADD_NEW: '新規追加',
  EDIT: '編集',
  DELETE: '削除',
  APPROVE: '承認',
  REJECT: '却下',
  MARK_RECEIVED: '入荷済みにする',
  MANUAL_CHECK: '手動確認へ',
  PRODUCT_NAME: '商品名',
  BARCODE: 'バーコード',
  CURRENT_STOCK: '現在庫数',
  MINIMUM_STOCK: '最低在庫数',
  CATEGORY: 'カテゴリ',
  COST_PRICE: '仕入単価',
  SUPPLIER: '仕入先',
  ACTIONS: '操作',
  NO_DATA_AVAILABLE: 'データがありません',
  LOADING: '読み込み中...',
  ERROR_LOADING_DATA: 'データの読み込みに失敗しました。',
  SUCCESS_PREFIX: '成功: ',
  ERROR_PREFIX: 'エラー: ',
  CONFIRM_DELETE_TITLE: '削除の確認',
  CONFIRM_DELETE_MESSAGE: (itemName: string) => `${itemName}を本当に削除しますか？この操作は元に戻せません。`,
  
  // Dashboard specific
  TOTAL_INVENTORY_VALUE: '総在庫評価額',
  CURRENT_MONTH_TOTAL_COST: '当月仕入総額',
  LOW_STOCK_ITEMS_COUNT: '在庫僅少品目数',
  OBSOLETE_STOCK_ITEMS_COUNT: '不良在庫品目数',
  PENDING_INTAKE_APPROVALS: '要承認入荷数',
  LOW_STOCK_ALERT: '在庫僅少アラート',
  LOADING_DASHBOARD_DATA: 'ダッシュボードデータを読み込み中...',
  PREVIOUS_YEAR_MONTH_TOTAL: '前年同期間合計', 
  DIFFERENCE: '差異',
  PERCENTAGE_CHANGE: '増減率',
  DOWNLOAD_CSV: 'CSVダウンロード',
  
  // Category
  CATEGORY_NAME: 'カテゴリ名',
  PARENT_CATEGORY: '親カテゴリ',
  NO_PARENT_CATEGORY: '（ルートカテゴリ）',

  // Staff
  STAFF_MANAGEMENT: 'スタッフ管理',
  STAFF_NAME: 'スタッフ名',
  ROLE: '権限',
  ASSIGNED_STORE: '所属店舗',
  NO_STORE_ASSIGNED: '店舗未割り当て',
  PASSWORD: 'パスワード',
  CONFIRM_PASSWORD: 'パスワード (確認)',
  PASSWORD_MISMATCH: 'パスワードが一致しません。',
  INCORRECT_CURRENT_PASSWORD: '現在のパスワードが正しくありません。',
  PASSWORD_CHANGE_SUCCESS: 'パスワードが正常に変更されました。',

  // Admin Profile
  ADMIN_PROFILE_EDIT: '管理者情報変更',
  CURRENT_PASSWORD: '現在のパスワード',
  NEW_PASSWORD: '新しいパスワード',

  // New Product Registration
  NEW_PRODUCT_REGISTRATION_TITLE: 'AIによる新規商品一括登録',
  COST_PRICE_FOR_NEW_PRODUCT: '原価',
  INITIAL_STOCK_QUANTITY: '初期在庫数',
  REGISTRAR: '登録担当者',
  SELECT_REGISTRAR: '担当者を選択...',
  CREATE_CANDIDATES_FROM_IMAGE_AI: 'AIで画像から登録候補を作成',
  CONFIRM_AND_REGISTER_NEW_PRODUCTS: '内容を確認して新規商品を登録',
  ALL_ITEMS_MUST_BE_NEW_PRODUCTS: 'AIが抽出した商品は、すべて「新規商品」としてシステムに登録されます。',
  REGISTER_CONFIRMED_NEW_PRODUCTS: '確認済みの新規商品を登録',
  
  // Store Management
  STORE_MANAGEMENT: '店舗管理',
  STORE_NAME: '店舗名',
  STORE_ADDRESS: '住所',
  STORE_PHONE: '電話番号',
  ALL_STORES: '全店舗',

  // Barcode / Scanning
  BARCODE_SCANNER_PLACEHOLDER: 'バーコードをスキャンまたは入力',
  SCAN_ERROR_MESSAGE: 'スキャンエラー',
  SCAN_BARCODE_FOR_OUTBOUND: 'バーコードをスキャンして出庫',
  BARCODE_PROMPT: 'バーコードを入力...',

  // Outbound
  OPERATOR: '担当者',
};
