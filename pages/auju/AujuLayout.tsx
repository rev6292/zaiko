import React, { useState } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { APP_TITLE, AUJUA_NAVIGATION_ITEMS, ROUTE_PATHS } from '../../constants';
import { ArrowLeftOnRectangleIcon, Bars3Icon, XMarkIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

const AujuLayout: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  const isAdmin = currentUser.role === UserRole.ADMIN;

  const getPageTitle = () => {
    const currentNavItem = AUJUA_NAVIGATION_ITEMS.find(item => item.path === location.pathname);
    return currentNavItem?.name || "Aujua管理";
  }

  return (
    <div className="flex h-screen bg-slate-100">
       <aside className={`bg-slate-800 text-slate-100 w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out z-30 shadow-lg`}>
        <div className="px-4 flex items-center justify-between">
            <div>
              <h1 className="text-yellow-400 text-2xl font-bold">Aujua</h1>
              <p className="text-slate-400 text-sm">専用管理パネル</p>
            </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex flex-col justify-between h-[calc(100%-100px)]">
            <div>
                {AUJUA_NAVIGATION_ITEMS.map((item) => (
                    <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`relative flex items-center space-x-3 px-4 py-3 my-1 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors
                        ${location.pathname === item.path ? 'bg-yellow-500/20 text-yellow-300 font-semibold' : ''}`}
                    >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                    </Link>
                ))}
            </div>
            <div>
                {isAdmin && (
                    <Link to={ROUTE_PATHS.DASHBOARD} className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-colors mb-2">
                        <ArrowUturnLeftIcon className="h-5 w-5" />
                        <span>通常画面へ戻る</span>
                    </Link>
                )}
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
             <span className="text-sm text-slate-600 hidden sm:block">こんにちは、<span className="font-semibold text-slate-800">{currentUser.name}</span> さん ({currentUser.role})</span>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AujuLayout;
