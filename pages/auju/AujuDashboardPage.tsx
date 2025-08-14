import React, { useEffect, useState } from 'react';
import { AujuaDashboardData, ProductWithStock, TableHeader, AujuaInventoryCategoryGroup, AujuaProductHistoryGroup, UnifiedHistoryItem } from '../../types';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import Table from '../../components/Table';
import { UI_TEXT } from '../../constants';
import { BanknotesIcon, BellAlertIcon, ArchiveBoxIcon, TruckIcon, ChartBarIcon, ArrowUpOnSquareIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { ArrowDownCircleIcon, ArrowUpCircleIcon, PlusCircleIcon } from '@heroicons/react/24/solid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useStore } from '../../contexts/StoreContext';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  return (
    <div className={`bg-white shadow-lg rounded-xl p-5 flex items-center space-x-4 border-l-4 ${color}`}>
        <div className={`p-3 rounded-full ${color.replace('border-l-', 'bg-').replace('-500', '-100').replace('-600', '-100')}`}>
          {React.cloneElement(icon, { className: `h-8 w-8 ${color.replace('border-l-', 'text-')}` })}
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-semibold text-slate-800">{value}</p>
        </div>
    </div>
  );
};

const AujuDashboardPage: React.FC = () => {
  const { selectedStoreId } = useStore();
  const [dashboardData, setDashboardData] = useState<AujuaDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [openInventoryCategories, setOpenInventoryCategories] = useState<Set<string>>(new Set());
  const [openHistoryProducts, setOpenHistoryProducts] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setOpenInventoryCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const toggleHistoryProduct = (productId: string) => {
    setOpenHistoryProducts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(productId)) {
            newSet.delete(productId);
        } else {
            newSet.add(productId);
        }
        return newSet;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.get('/dashboard/auju', { month: selectedMonth, storeId: selectedStoreId });
        setDashboardData(data);
      } catch (err) {
        setError(UI_TEXT.ERROR_LOADING_DATA);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth, selectedStoreId]);

  const inventoryTableHeaders: TableHeader<ProductWithStock>[] = [
    { key: 'name', label: '商品名' },
    { key: 'barcode', label: 'バーコード' },
    { key: 'currentStock', label: '現在庫数', cellClassName: 'text-right' },
    { key: 'costPrice', label: '原価', render: (item) => `¥${item.costPrice.toLocaleString()}`, cellClassName: 'text-right' },
    { key: 'totalValue', label: '在庫金額', render: (item) => `¥${(item.costPrice * item.currentStock).toLocaleString()}`, cellClassName: 'text-right font-semibold' },
  ];

  const historyTableHeaders: TableHeader<UnifiedHistoryItem>[] = [
    { key: 'date', label: '日時', render: (item) => new Date(item.date).toLocaleDateString() },
    { key: 'type', label: '種別', render: (item) => {
      switch (item.type) {
        case 'intake': return <div className="flex items-center text-sm font-semibold text-green-700"><ArrowDownCircleIcon className="h-5 w-5 mr-1.5 text-green-500" />入荷</div>;
        case 'outbound': return <div className="flex items-center text-sm font-semibold text-red-700"><ArrowUpCircleIcon className="h-5 w-5 mr-1.5 text-red-500" />出庫</div>;
        case 'new_product': return <div className="flex items-center text-sm font-semibold text-blue-700"><PlusCircleIcon className="h-5 w-5 mr-1.5 text-blue-500" />新規登録</div>;
        default: return <span>{item.type}</span>;
      }
    }},
    { key: 'quantity', label: '数量', cellClassName: 'text-right' },
    { key: 'notes', label: '備考' },
  ];


  if (loading) return <LoadingSpinner message="ダッシュボードデータを読み込み中..." />;
  if (error) return <p className="text-red-500 p-4 bg-red-100 rounded-md">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Aujua ダッシュボード</h1>
        <div>
          <label htmlFor="month-select" className="mr-2 text-sm font-medium text-gray-700">対象月:</label>
          <input 
            type="month" 
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="p-2 border border-slate-700 rounded-md shadow-sm bg-slate-900 text-white focus:ring-yellow-500 focus:border-yellow-500"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Aujua 現在在庫合計金額" value={`¥${(dashboardData?.totalInventoryAmount || 0).toLocaleString()}`} icon={<BanknotesIcon />} color="border-l-yellow-500" />
        <StatCard title={`${selectedMonth}月 入庫合計金額`} value={`¥${(dashboardData?.monthlyIntakeAmount || 0).toLocaleString()}`} icon={<TruckIcon />} color="border-l-sky-500" />
        <StatCard title={`${selectedMonth}月 出庫合計金額`} value={`¥${(dashboardData?.monthlyOutboundAmount || 0).toLocaleString()}`} icon={<ArrowUpOnSquareIcon />} color="border-l-rose-500" />
        <StatCard title="在庫僅少品目数" value={dashboardData?.lowStockItemsCount || 0} icon={<BellAlertIcon />} color="border-l-orange-500" />
      </div>

      <div className="bg-white shadow-lg rounded-xl p-6">
        <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center">
          <ChartBarIcon className="h-6 w-6 mr-2 text-indigo-500" />
          入出庫推移 (直近3ヶ月)
        </h2>
        {dashboardData && dashboardData.trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip contentStyle={{backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', borderRadius: '0.5rem', border: '1px solid #e2e8f0'}} />
              <Legend />
              <Line type="monotone" dataKey="intake" name="総入庫数" stroke="#0ea5e9" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
              <Line type="monotone" dataKey="outbound" name="総出庫数" stroke="#f43f5e" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-center py-10">トレンドデータがありません。</p>
        )}
      </div>
      
      <div className="bg-white shadow-lg rounded-xl p-6">
        <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center">
          <ArchiveBoxIcon className="h-6 w-6 mr-2 text-green-500" />
          現在在庫リスト
        </h2>
        {dashboardData && dashboardData.currentInventoryList.length > 0 ? (
          <div className="space-y-2">
            {dashboardData.currentInventoryList.map(group => (
              <div key={group.categoryId} className="border rounded-md overflow-hidden transition-all duration-300">
                <button onClick={() => toggleCategory(group.categoryId)} className="p-3 w-full flex justify-between items-center cursor-pointer hover:bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-800">{group.categoryName}</p>
                    <p className="text-sm text-slate-500">{group.itemCount} 品目 / 合計: ¥{group.totalValue.toLocaleString()}</p>
                  </div>
                  <ChevronDownIcon className={`h-5 w-5 text-slate-500 transform transition-transform ${openInventoryCategories.has(group.categoryId) ? 'rotate-180' : ''}`} />
                </button>
                {openInventoryCategories.has(group.categoryId) && (
                  <div className="border-t p-2 bg-slate-50/50">
                    <Table headers={inventoryTableHeaders} data={group.items} itemKey="id" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-10">在庫データがありません。</p>
        )}
      </div>

      <div className="bg-white shadow-lg rounded-xl p-6">
        <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center">
          <TruckIcon className="h-6 w-6 mr-2 text-blue-500" />
          {selectedMonth}月 商品別履歴
        </h2>
        {dashboardData && dashboardData.monthlyHistoryByProduct.length > 0 ? (
          <div className="space-y-2">
            {dashboardData.monthlyHistoryByProduct.map(group => (
              <div key={group.productId} className="border rounded-md overflow-hidden transition-all duration-300">
                <button onClick={() => toggleHistoryProduct(group.productId)} className="p-3 w-full flex justify-between items-center cursor-pointer hover:bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-800">{group.productName}</p>
                    <p className="text-sm text-slate-500">{group.historyItems.length}件の履歴</p>
                  </div>
                  <ChevronDownIcon className={`h-5 w-5 text-slate-500 transform transition-transform ${openHistoryProducts.has(group.productId) ? 'rotate-180' : ''}`} />
                </button>
                {openHistoryProducts.has(group.productId) && (
                  <div className="border-t p-2 bg-slate-50/50">
                    <Table headers={historyTableHeaders} data={group.historyItems} itemKey="id" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-10">{selectedMonth}月の履歴データはありません。</p>
        )}
      </div>

    </div>
  );
};

export default AujuDashboardPage;
