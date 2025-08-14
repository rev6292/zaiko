import React, { useState } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, NavigationItem } from '../../types';
import { APP_TITLE, ADMIN_NAVIGATION_ITEMS, ROUTE_PATHS } from '../../constants';
import { ArrowLeftOnRectangleIcon, Bars3Icon, UserCircleIcon, ArrowUturnLeftIcon, XCircleIcon } from '@heroicons/react/24/outline';
import StoreSelector from '../../components/StoreSelector';


const AdminLayout: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!currentUser) {
    return <Navigate to="/" replace />; // Should be login page in real app
  }
  if (currentUser.role !== UserRole.ADMIN) {
    return <Navigate to={ROUTE_PATHS.DASHBOARD} replace />;
  }
  
  const currentPageName = ADMIN_NAVIGATION_ITEMS.find(item => `/admin${location.pathname}` === item.path || location.pathname === item.path)?.name || "管理画面";


  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`bg-white text-gray-800 w-72 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out z-30 shadow-lg border-r border-gray-200`}>
        <div className="px-4 flex items-center justify-between">
         <Link to={ROUTE_PATHS.ADMIN_DASHBOARD} className="text-2xl font-semibold text-gray-900 hover:text-indigo-600">
            {APP_TITLE}
            <span className="block text-sm text-gray-500 -mt-1">管理者パネル</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-gray-800">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-10">
          {ADMIN_NAVIGATION_ITEMS.map((item: NavigationItem) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors
                ${location.pathname === item.path || (location.pathname === '/admin' && item.path === ROUTE_PATHS.ADMIN_DASHBOARD)  ? 'bg-indigo-50 text-indigo-600 font-semibold' : ''}`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-6 left-0 right-0 px-4">
           <Link
            to={ROUTE_PATHS.DASHBOARD} 
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ArrowUturnLeftIcon className="h-5 w-5" />
            <span>通常画面へ戻る</span>
          </Link>
           <button
            onClick={logout}
            className="mt-2 w-full flex items-center space-x-3 px-4 py-3 rounded-md text-red-600 bg-red-100 hover:bg-red-200 hover:text-red-800 transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-600 hover:text-gray-800">
                <Bars3Icon className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-semibold text-gray-800">{currentPageName}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <StoreSelector />
             <span className="text-sm text-gray-700 hidden sm:block">
               {currentUser.name} ({currentUser.role})
             </span>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <Outlet /> {/* Nested routes will render here */}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;