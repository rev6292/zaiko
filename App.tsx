import React, { useState, useMemo, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { UserRole, NavigationItem } from './types';
import { APP_TITLE, ROUTE_PATHS, NAVIGATION_ITEMS } from './constants';
import { PurchaseListProvider, usePurchaseList } from './contexts/PurchaseListContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StoreProvider } from './contexts/StoreContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import apiClient from './services/apiClient';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import IntakePage from './pages/IntakePage';
import OutboundPage from './pages/OutboundPage'; 
import ReportsPage from './pages/ReportsPage';
import PurchaseOrderPreviewPage from './pages/PurchaseOrderPreviewPage';
import { ArrowLeftOnRectangleIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import StoreSelector from './components/StoreSelector';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import CategoryManagementPage from './pages/admin/CategoryManagementPage';
import StaffManagementPage from './pages/admin/StaffManagementPage'; 
import AdminProfilePage from './pages/admin/AdminProfilePage'; 
import CompanyInfoPage from './pages/admin/CompanyInfoPage';
import NewProductRegistrationPage from './pages/admin/NewProductRegistrationPage'; 
import AdminCsvPage from './pages/admin/AdminCsvPage';
import StoreManagementPage from './pages/admin/StoreManagementPage';

// Auju Pages
import AujuLayout from './pages/auju/AujuLayout';
import AujuDashboardPage from './pages/auju/AujuDashboardPage';
import AujuHistoryPage from './pages/auju/AujuHistoryPage';
import AujuRouteGuard from './components/AujuRouteGuard';


// Main Layout Component
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout } = useAuth(); 
  const { getTotalItems: getTotalPurchaseListItems } = usePurchaseList();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const availableNavItems = useMemo(() => {
    if (!currentUser) return [];
    
    const itemsToShow = NAVIGATION_ITEMS.filter(item => {
        if (!item.roles || item.roles.length === 0) {
            return true;
        }
        return item.roles.includes(currentUser.role);
    });

    return itemsToShow.map(item => ({
      ...item,
      actualNotificationCount: item.path === ROUTE_PATHS.INTAKE ? getTotalPurchaseListItems() : (item.notificationCount ? item.notificationCount() : 0)
    }));

  }, [currentUser, getTotalPurchaseListItems]);

  if (!currentUser) {
     return <Navigate to="/" />;
  }

  // Aujua Staff should be handled by the main router and not reach this layout.
  if (currentUser.role === UserRole.AUJUA_STAFF) {
      return <Navigate to={ROUTE_PATHS.AUJUA_DASHBOARD} />;
  }

  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/auju')) {
    return <>{children}</>;
  }

  const getPageTitle = () => {
    const currentNavItem = NAVIGATION_ITEMS.find(item => item.path === location.pathname);
    if(currentNavItem) return currentNavItem.name;
    if(location.pathname === ROUTE_PATHS.INTAKE) return '入荷・発注管理'; // Fallback for the combined page
    return APP_TITLE;
  }
  
  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <div className="flex h-screen bg-slate-100">
       <aside className={`bg-slate-800 text-slate-100 w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out z-30 shadow-lg`}>
        <div className="px-4 flex items-center justify-between">
          <Link to={ROUTE_PATHS.DASHBOARD} className="text-white text-2xl font-bold hover:text-sky-300 transition-colors">
            {APP_TITLE}
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex flex-col justify-between h-[calc(100%-80px)]">
            <div>
                {availableNavItems.map((item: NavigationItem & { actualNotificationCount?: number }) => (
                    <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`relative flex items-center space-x-3 px-4 py-3 my-1 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors
                        ${location.pathname === item.path ? 'bg-sky-500/20 text-sky-300 font-semibold' : ''}`}
                    >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                    {item.path === ROUTE_PATHS.INTAKE && getTotalPurchaseListItems() > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {getTotalPurchaseListItems() > 99 ? '99+' : getTotalPurchaseListItems()}
                        </span>
                    )}
                    </Link>
                ))}
            </div>
            <div>
                 <button
                    onClick={logout}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-colors"
                >
                    <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                    <span>ログアウト</span>
                </button>
            </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-slate-600 hover:text-slate-800">
                <Bars3Icon className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-semibold text-slate-800">{getPageTitle()}</h1>
          </div>
          <div className="flex items-center space-x-3">
             {isAdmin && <StoreSelector />}
             <span className="text-sm text-slate-600 hidden sm:block">こんにちは、<span className="font-semibold text-slate-800">{currentUser.name}</span> さん ({currentUser.role})</span>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    return <Navigate to={ROUTE_PATHS.DASHBOARD} replace />;
  }
  return <>{children}</>;
};

const ProtectedAujuRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser || ![UserRole.ADMIN, UserRole.AUJUA_STAFF].includes(currentUser.role)) {
    return <Navigate to={ROUTE_PATHS.DASHBOARD} replace />;
  }
  return <>{children}</>;
};

const AppWithAuthCheck: React.FC = () => {
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  
  useEffect(() => {
    if (currentUser) {
        const checkBackup = async () => {
            try {
                const backupInfo = await apiClient.post('/data/run-backup-check');
                if (backupInfo) {
                    showNotification('週次の自動バックアップが作成されました。', 'success');
                }
            } catch (e) {
                console.error("Auto backup check failed:", e);
            }
        };
        checkBackup();
    }
  }, [currentUser, showNotification]);

  const location = useLocation();

  if (!currentUser) {
    return <LoginPage />;
  }

  // Aujua staff has a completely separate view
  if (currentUser.role === UserRole.AUJUA_STAFF) {
    return (
       <Routes>
          <Route path="/auju" element={<AujuLayout />}>
              <Route index element={<Navigate to={ROUTE_PATHS.AUJUA_DASHBOARD} replace />} />
              <Route path="dashboard" element={<AujuRouteGuard><AujuDashboardPage /></AujuRouteGuard>} />
              <Route path="history" element={<AujuRouteGuard><AujuHistoryPage /></AujuRouteGuard>} />
          </Route>
          <Route path="*" element={<Navigate to={ROUTE_PATHS.AUJUA_DASHBOARD} replace />} />
       </Routes>
    );
  }

  // Routes for Admin and Staff
  return (
    <Routes>
      {/* Admin Panel Routes */}
      <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
        <Route index element={<Navigate to={ROUTE_PATHS.ADMIN_DASHBOARD} replace />} />
        <Route path={ROUTE_PATHS.ADMIN_DASHBOARD.substring('/admin/'.length)} element={<AdminDashboardPage />} />
        <Route path={ROUTE_PATHS.ADMIN_STORES.substring('/admin/'.length)} element={<StoreManagementPage />} />
        <Route path={ROUTE_PATHS.ADMIN_CATEGORIES.substring('/admin/'.length)} element={<CategoryManagementPage />} />
        <Route path={ROUTE_PATHS.ADMIN_STAFF.substring('/admin/'.length)} element={<StaffManagementPage />} />
        <Route path={ROUTE_PATHS.ADMIN_PROFILE.substring('/admin/'.length)} element={<AdminProfilePage />} />
        <Route path={ROUTE_PATHS.ADMIN_COMPANY_INFO.substring('/admin/'.length)} element={<CompanyInfoPage />} />
        <Route path={ROUTE_PATHS.ADMIN_NEW_PRODUCT_REGISTRATION.substring('/admin/'.length)} element={<NewProductRegistrationPage />} />
        <Route path={ROUTE_PATHS.ADMIN_CSV_IMPORT_EXPORT.substring('/admin/'.length)} element={<AdminCsvPage />} />
      </Route>
      
      {/* Aujua Routes for Admin */}
      <Route path="/auju" element={<ProtectedAujuRoute><AujuLayout /></ProtectedAujuRoute>}>
          <Route index element={<Navigate to={ROUTE_PATHS.AUJUA_DASHBOARD} replace />} />
          <Route path="dashboard" element={<AujuRouteGuard><AujuDashboardPage /></AujuRouteGuard>} />
          <Route path="history" element={<AujuRouteGuard><AujuHistoryPage /></AujuRouteGuard>} />
      </Route>

      {/* Specific route for preview page (no layout) */}
      <Route path={ROUTE_PATHS.PURCHASE_ORDER + "/:orderId"} element={<PurchaseOrderPreviewPage />} />

      {/* Main App Routes with Layout for Staff and Admin */}
      <Route path="/*" element={
        <Layout>
            <Routes>
              <Route path={ROUTE_PATHS.DASHBOARD} element={<DashboardPage />} />
              <Route path={ROUTE_PATHS.INVENTORY} element={<InventoryPage />} />
              <Route path={ROUTE_PATHS.INTAKE} element={<IntakePage />} />
              <Route path={ROUTE_PATHS.OUTBOUND} element={<OutboundPage />} />
              <Route path={ROUTE_PATHS.REPORTS} element={<ReportsPage />} />
              <Route path="*" element={<Navigate to={ROUTE_PATHS.DASHBOARD} replace />} />
            </Routes>
        </Layout>
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <HashRouter>
          <StoreProvider>
            <PurchaseListProvider>
              <AppWithAuthCheck />
            </PurchaseListProvider>
          </StoreProvider>
        </HashRouter>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;