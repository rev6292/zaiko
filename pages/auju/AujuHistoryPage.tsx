import React, { useState, useEffect, useCallback } from 'react';
import { TableHeader, UnifiedHistoryItem } from '../../types';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import Table from '../../components/Table';
import { UI_TEXT } from '../../constants';
import { ArrowDownCircleIcon, ArrowUpCircleIcon, PlusCircleIcon } from '@heroicons/react/24/solid';
import { useStore } from '../../contexts/StoreContext';

const AujuHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<UnifiedHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedStoreId } = useStore();

  useEffect(() => {
    const fetchHistory = async () => {
      // The AujuRouteGuard ensures selectedStoreId is valid here.
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.get('/history/auju', { storeId: selectedStoreId });
        setHistory(data);
      } catch (err) {
        setError(UI_TEXT.ERROR_LOADING_DATA);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [selectedStoreId]);

  const tableHeaders: TableHeader<UnifiedHistoryItem>[] = [
    {
      key: 'type',
      label: '種別',
      render: (item) => {
        switch (item.type) {
          case 'intake':
            return (
              <div className="flex items-center">
                <ArrowDownCircleIcon className="h-6 w-6 text-green-500 mr-2" />
                <span className="font-semibold text-green-700">入荷</span>
              </div>
            );
          case 'outbound':
            return (
              <div className="flex items-center">
                <ArrowUpCircleIcon className="h-6 w-6 text-red-500 mr-2" />
                <span className="font-semibold text-red-700">出庫</span>
              </div>
            );
          case 'new_product':
            return (
                <div className="flex items-center">
                    <PlusCircleIcon className="h-6 w-6 text-blue-500 mr-2" />
                    <span className="font-semibold text-blue-700">新規登録</span>
                </div>
            );
          default:
            return <span>{item.type}</span>;
        }
      },
    },
    {
      key: 'date',
      label: '日時',
      render: (item) => new Date(item.date).toLocaleString('ja-JP'),
    },
    { key: 'productName', label: '商品名' },
    { key: 'quantity', label: '数量' },
    { key: 'notes', label: '備考' },
  ];

  if (loading) return <LoadingSpinner message="履歴を読み込み中..." />;
  if (error) return <p className="text-red-500 p-4 bg-red-100 rounded-md">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-gray-800">Aujua 入出庫履歴</h1>
      
      <div className="bg-white shadow-lg rounded-xl">
        <Table headers={tableHeaders} data={history} itemKey="id" />
      </div>
    </div>
  );
};

export default AujuHistoryPage;