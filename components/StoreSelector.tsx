import React from 'react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { UI_TEXT } from '../constants';
import { UserRole } from '../types';
import { ChevronDownIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';

const StoreSelector: React.FC = () => {
    const { stores, selectedStoreId, setSelectedStoreId, loading } = useStore();
    const { currentUser } = useAuth();

    if (loading) {
        return <div className="text-sm text-slate-500">店舗読込中...</div>;
    }

    const isAdmin = currentUser?.role === UserRole.ADMIN;

    return (
        <div className="relative flex items-center">
            <BuildingStorefrontIcon className="h-5 w-5 text-slate-400 absolute left-3 z-10 pointer-events-none" />
            <select
                id="store-selector"
                name="store-selector"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="appearance-none w-full md:w-48 bg-slate-100 border border-slate-300 text-slate-700 py-2 pl-10 pr-8 rounded-md leading-tight focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 text-sm"
                aria-label="店舗を選択"
                disabled={!isAdmin}
            >
                {isAdmin && <option value="all">{UI_TEXT.ALL_STORES}</option>}
                {stores.filter(s => s.id !== 'all').map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <ChevronDownIcon className="h-4 w-4"/>
            </div>
        </div>
    );
};

export default StoreSelector;