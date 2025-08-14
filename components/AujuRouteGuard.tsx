import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import LoadingSpinner from './LoadingSpinner';

const AujuRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { selectedStoreId, loading: storeLoading } = useStore();

  // Wait for auth context and store context to be fully loaded and valid.
  if (storeLoading || !currentUser || !selectedStoreId) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner message="ユーザーと店舗情報を読み込み中..." />
      </div>
    );
  }

  return <>{children}</>;
};

export default AujuRouteGuard;
