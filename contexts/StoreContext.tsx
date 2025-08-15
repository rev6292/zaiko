import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Store, UserRole } from '../types';
import { apiClient } from '../services/apiClient';
import { useAuth } from './AuthContext';
import { useLocation } from 'react-router-dom';

interface StoreContextType {
  stores: Store[];
  selectedStoreId: string; // This is now the DERIVED value
  setSelectedStoreId: (storeId: string) => void; // This will only work for Admins
  loading: boolean;
  error: string | null;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [stores, setStores] = useState<Store[]>([]);
  // This state is now ONLY for the Admin's selection.
  const [adminSelectedStoreId, setAdminSelectedStoreId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiClient.stores.getAll();
        const fetchedStores = result.data as Store[];
        setStores(fetchedStores);
      } catch (err) {
        setError('店舗情報の読み込みに失敗しました。');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  // The single source of truth for the currently active store ID.
  // It's derived from currentUser and admin's selection, eliminating useEffect race conditions.
  const selectedStoreId = useMemo(() => {
    if (!currentUser) {
      return ''; // Not logged in, no store context.
    }
    if (currentUser.role === UserRole.ADMIN) {
        // NEW LOGIC: If admin is on an Auju page and has "All Stores" selected,
        // default to the main store ('store1') for this context.
        const isOnAujuPage = location.pathname.startsWith('/auju');
        if (isOnAujuPage && adminSelectedStoreId === 'all') {
            // Default to '本店' (store1) for Admins on Auju pages to prevent errors
            return 'store1'; 
        }
      return adminSelectedStoreId; // Admins can choose.
    }
    if (currentUser.role === UserRole.STAFF || currentUser.role === UserRole.AUJUA_STAFF) {
      return currentUser.storeId || ''; // Staff are locked to their store.
    }
    return ''; // Should not be reached.
  }, [currentUser, adminSelectedStoreId, location.pathname]);


  const handleSetSelectedStoreId = (storeId: string) => {
    // Only allow Admins to change the store selection.
    if (currentUser?.role === UserRole.ADMIN) {
      setAdminSelectedStoreId(storeId);
    }
  };

  const value = useMemo(
    () => ({
      stores,
      selectedStoreId,
      setSelectedStoreId: handleSetSelectedStoreId,
      loading,
      error,
    }),
    [stores, selectedStoreId, loading, error]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};