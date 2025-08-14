import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, AdminDashboardData, StaffDashboardData, ProductWithStock, CategoryPerformance, ProductUsage, SupplierUsagePerformance, Category, CategoryAnalysisData, RankedProduct, TableHeader } from '../types';
import apiClient from '../services/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import { UI_TEXT, ROUTE_PATHS } from '../constants';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, FireIcon, ExclamationTriangleIcon, ChartBarIcon, ArchiveBoxIcon, BellAlertIcon, CurrencyYenIcon, ArchiveBoxXMarkIcon, ArrowPathIcon, BanknotesIcon, InformationCircleIcon, TruckIcon, FolderIcon } from '@heroicons/react/24/outline';
import { QuestionMarkCircleIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Treemap } from 'recharts';
import HelpModal from '../components/HelpModal';
import { useStore } from '../contexts/StoreContext';
import { Link } from 'react-router-dom';
import Table from '../components/Table';
import PageGuide from '../components/PageGuide';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
  color: string;
  subText?: React.ReactNode;
  tooltip?: string;
  linkTo?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subText, tooltip, linkTo }) => {
  const cardContent = (
    <div className="relative group w-full">
      <div className={`bg-white shadow-lg rounded-xl p-5 flex items-center space-x-4 border-l-4 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${color}`}>
        <div className={`p-3 rounded-full ${color.replace('border-l-', 'bg-').replace('-500', '-100').replace('-600', '-100')}`}>
          {React.cloneElement(icon, { className: `h-8 w-8 ${color.replace('border-l-', 'text-')}` })}
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-semibold text-slate-800">{value}</p>
          {subText && <div className="text-xs text-slate-400 mt-1">{subText}</div>}
        </div>
        {linkTo && <ArrowTopRightOnSquareIcon className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors" />}
      </div>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 text-sm text-white bg-slate-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
          {tooltip}
        </div>
      )}
    </div>
  );

  return linkTo ? <Link to={linkTo} className="block">{cardContent}</Link> : <div className="block">{cardContent}</div>;
};

// --- Custom Treemap Content Renderer ---
const getTurnoverColor = (rate: number, minRate: number, maxRate: number): string => {
  if (maxRate <= minRate) return '#a7f3d0'; // emerald-200
  const normalized = (rate - minRate) / (maxRate - minRate);
  const colors = [
    '#fecaca', // red-200
    '#fed7aa', // orange-200
    '#fef08a', // yellow-200
    '#d9f99d', // lime-200
    '#a7f3d0', // emerald-200
    '#6ee7b7', // emerald-300
    '#34d399', // emerald-400
    '#10b981', // emerald-500
  ];
  const index = Math.min(colors.length - 1, Math.floor(normalized * colors.length));
  return colors[index];
};

const CustomizedTreemapContent: React.FC<any> = (props) => {
  const { root, depth, x, y, width, height, index, name, inventoryValue, turnoverRate, minRate, maxRate } = props;

  if (inventoryValue === undefined) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: turnoverRate !== undefined ? getTurnoverColor(turnoverRate, minRate, maxRate) : '#f3f4f6',
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
        rx={4}
        ry={4}
      />
      {width > 100 && height > 60 ? (
        <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#1f2937" fontSize={14} fontWeight="bold">
          {name}
        </text>
      ) : null}
      {width > 100 && height > 80 && typeof inventoryValue === 'number' ? (
        <text x={x + width / 2} y={y + height / 2 + 25} textAnchor="middle" fill="#4b5563" fontSize={14}>
          ¥{inventoryValue.toLocaleString()}
        </text>
      ) : null}
    </g>
  );
};

const CategoryAnalysisSection: React.FC = () => {
    const { selectedStoreId } = useStore();
    const [categories, setCategories] = useState<Category[]>([]);
    const [parentCategoryId, setParentCategoryId] = useState<string>('');
    const [childCategoryId, setChildCategoryId] = useState<string>('');
    const [analysisData, setAnalysisData] = useState<CategoryAnalysisData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        apiClient.get('/categories').then(setCategories).catch(() => setError('カテゴリの読み込みに失敗しました。'));
    }, []);

    useEffect(() => {
        setLoading(true);
        setError(null);
        apiClient.get('/dashboard/category-analysis', { parentCategoryId, childCategoryId, storeId: selectedStoreId })
            .then(data => setAnalysisData(data))
            .catch(() => setError('カテゴリ分析データの読み込みに失敗しました。'))
            .finally(() => setLoading(false));
    }, [parentCategoryId, childCategoryId, selectedStoreId]);

    const parentCategories = useMemo(() => categories.filter(c => c.parentId === null), [categories]);
    const childCategories = useMemo(() => {
        if (!parentCategoryId) return [];
        return categories.filter(c => c.parentId === parentCategoryId);
    }, [categories, parentCategoryId]);

    useEffect(() => {
        setChildCategoryId('');
    }, [parentCategoryId]);

    const rankingHeaders: TableHeader<RankedProduct>[] = [
        { key: 'rank', label: '順位', cellClassName: 'font-bold text-center w-12', headerClassName: 'text-center' },
        { key: 'productName', label: '商品名', cellClassName: 'font-semibold' },
        { key: 'usage', label: '用途' },
        { key: 'quantity', label: '数量', render: item => `${item.quantity.toLocaleString()} 点`, cellClassName: 'text-right' },
        { key: 'amount', label: '金額', render: item => `¥${item.amount.toLocaleString()}`, cellClassName: 'text-right' },
    ];

    return (
        <div className="bg-white shadow-lg rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center">
                <FolderIcon className="h-6 w-6 mr-2 text-purple-500" />
                カテゴリ別 詳細分析 (当月実績)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-md">
                <div>
                    <label htmlFor="parent-cat-filter" className="text-sm font-medium text-slate-600 block mb-1">親カテゴリ</label>
                    <select id="parent-cat-filter" value={parentCategoryId} onChange={e => setParentCategoryId(e.target.value)} className="w-full p-2 border rounded-md bg-white border-slate-300 text-slate-900">
                        <option value="">全カテゴリ</option>
                        {parentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="child-cat-filter" className="text-sm font-medium text-slate-600 block mb-1">子カテゴリ (任意)</label>
                    <select id="child-cat-filter" value={childCategoryId} onChange={e => setChildCategoryId(e.target.value)} disabled={!parentCategoryId} className="w-full p-2 border rounded-md bg-white border-slate-300 disabled:bg-slate-100 text-slate-900 disabled:text-slate-500">
                        <option value="">すべての子カテゴリ</option>
                        {childCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>
            
            {loading ? <LoadingSpinner message="分析データを計算中..." /> : error ? <p className="text-red-500 text-center">{error}</p> : analysisData && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                        <div className="bg-rose-50 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-rose-700">当月出庫合計 (売上原価)</p>
                            <p className="text-2xl font-bold text-rose-900">¥{analysisData.totalOutbound.total.toLocaleString()}</p>
                            <p className="text-xs text-rose-600">業務: ¥{analysisData.totalOutbound.professional.toLocaleString()} / 店販: ¥{analysisData.totalOutbound.retail.toLocaleString()}</p>
                        </div>
                        <div className="bg-sky-50 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-sky-700">当月入庫合計 (仕入)</p>
                            <p className="text-2xl font-bold text-sky-900">¥{analysisData.totalIntake.total.toLocaleString()}</p>
                            <p className="text-xs text-sky-600">業務: ¥{analysisData.totalIntake.professional.toLocaleString()} / 店販: ¥{analysisData.totalIntake.retail.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold text-slate-700 mb-2">📈 売上ランキング (当月出庫)</h3>
                            <div className="max-h-96 overflow-y-auto">
                                <Table<RankedProduct> headers={rankingHeaders} data={analysisData.outboundRanking} itemKey="productId" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-700 mb-2">📉 仕入ランキング (当月入庫)</h3>
                             <div className="max-h-96 overflow-y-auto">
                                <Table<RankedProduct> headers={rankingHeaders} data={analysisData.intakeRanking} itemKey="productId" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedStoreId } = useStore();
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null);
  const [staffData, setStaffData] = useState<StaffDashboardData | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !selectedStoreId) return;

      setLoading(true);
      setError(null);
      try {
        if (currentUser.role === UserRole.ADMIN) {
          const today = new Date();
          const year = today.getFullYear();
          const month = today.getMonth() + 1;
          
          const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
          const endDate = new Date(year, month, 0).toISOString().split('T')[0];
          const periodLabel = `${year}-${String(month).padStart(2, '0')}`;
          
          const data = await apiClient.get('/dashboard/admin', { startDate, endDate, periodLabel, storeId: selectedStoreId });
          setAdminData(data);
        } else if (currentUser.role === UserRole.STAFF) {
          const data = await apiClient.get('/dashboard/staff', { storeId: selectedStoreId });
          setStaffData(data);
        }
        const products: ProductWithStock[] = await apiClient.get('/products', { storeId: selectedStoreId });
        setLowStockProducts(products.filter(p => p.currentStock < p.minimumStock));
      } catch (err) {
        setError(UI_TEXT.ERROR_LOADING_DATA);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, selectedStoreId]);

  if (loading) return <LoadingSpinner message={UI_TEXT.LOADING} />;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="space-y-6">
      <PageGuide title="ダッシュボードの使い方">
        <p>このページでは、サロンの在庫状況と経営指標をひと目で確認できます。</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>統計カード:</strong> 総在庫評価額や不良在庫など、重要な数値をリアルタイムで表示します。</li>
          <li><strong>グラフ:</strong> 在庫の推移やカテゴリ別の状況を視覚的に把握できます。</li>
          <li><strong>リスト:</strong> 人気商品や要注意在庫を具体的に確認し、次のアクションに繋げることができます。</li>
        </ul>
      </PageGuide>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">ダッシュボード</h1>
        <button
          onClick={() => setIsHelpModalOpen(true)}
          className="flex items-center gap-2 text-sm text-white bg-sky-600 hover:bg-sky-700 font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors"
        >
          <QuestionMarkCircleIcon className="h-5 w-5" />
          ヘルプ / ガイド
        </button>
      </div>
      
      {currentUser?.role === UserRole.ADMIN && adminData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="総在庫評価額" value={`¥${adminData.totalInventoryValue.toLocaleString()}`} 
              subText={<><span>業務: ¥{adminData.totalInventoryValueByUsage.professional.toLocaleString()}</span><br/><span>店販: ¥{adminData.totalInventoryValueByUsage.retail.toLocaleString()}</span></>}
              icon={<BanknotesIcon />} color="border-l-blue-500" tooltip="(各商品の原価 × 現在庫数) の合計です。会社の資産価値の重要な指標です。" linkTo={ROUTE_PATHS.INVENTORY} />
            <StatCard title="不良在庫金額" value={`¥${adminData.obsoleteStockValue.toLocaleString()}`} icon={<ArchiveBoxXMarkIcon />} color="border-l-red-500" 
              subText={<span>6ヶ月以上動きなし</span>}
              tooltip="長期間、入出庫の動きがない商品の在庫金額の合計です。この金額が高いほどキャッシュフローが悪化している可能性があります。" linkTo={ROUTE_PATHS.INVENTORY} />
            <StatCard title="在庫回転率" value={adminData.inventoryTurnoverRate.toFixed(2)} icon={<ArrowPathIcon />} color="border-l-green-500" subText="年間換算 (直近3ヶ月)" tooltip="在庫がどれだけ効率的に出庫(売上)に変わっているかを示す指標。数値が高いほど効率的に資本が使われていることを意味します。" linkTo={ROUTE_PATHS.REPORTS} />
            <StatCard title="当月入庫アイテム数" value={adminData.totalIntakeItemsThisMonth.toLocaleString()} 
              subText={<><span>業務: {adminData.totalIntakeItemsThisMonthByUsage.professional.toLocaleString()}</span> / <span>店販: {adminData.totalIntakeItemsThisMonthByUsage.retail.toLocaleString()}</span></>}
              icon={<ArrowDownTrayIcon />} color="border-l-sky-500" tooltip="今月、入荷処理が完了した商品の総数です。" linkTo={ROUTE_PATHS.INTAKE} />
            <StatCard title="当月出庫アイテム数" value={adminData.totalOutboundItemsThisMonth.toLocaleString()} 
              subText={<><span>業務: {adminData.totalOutboundItemsThisMonthByUsage.professional.toLocaleString()}</span> / <span>店販: {adminData.totalOutboundItemsThisMonthByUsage.retail.toLocaleString()}</span></>}
              icon={<ArrowUpTrayIcon />} color="border-l-rose-500" tooltip="今月、出庫処理された商品の総数です。" linkTo={ROUTE_PATHS.OUTBOUND} />
            <StatCard title="在庫僅少品目数" value={adminData.lowStockItemsCount} icon={<BellAlertIcon />} color="border-l-yellow-500" tooltip="現在庫数が最低在庫数を下回っている商品の数です。発注の目安となります。" linkTo={ROUTE_PATHS.INVENTORY} />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Supplier Usage Performance */}
            <div className="bg-white shadow-lg rounded-xl p-6">
              <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center">
                <TruckIcon className="h-6 w-6 mr-2 text-blue-500" />
                仕入先別 業務・店販実績 ({adminData.selectedPeriodSummary.periodLabel})
              </h2>
              {adminData.supplierUsagePerformance && adminData.supplierUsagePerformance.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                    <Table<SupplierUsagePerformance>
                        headers={[
                            { key: 'supplierName', label: '仕入先', cellClassName: 'font-semibold' },
                            { key: 'professionalIntakeAmount', label: '業務(入)', render: item => `¥${item.professionalIntakeAmount.toLocaleString()}`, cellClassName: 'text-right' },
                            { key: 'retailIntakeAmount', label: '店販(入)', render: item => `¥${item.retailIntakeAmount.toLocaleString()}`, cellClassName: 'text-right' },
                            { key: 'professionalOutboundAmount', label: '業務(出)', render: item => `¥${item.professionalOutboundAmount.toLocaleString()}`, cellClassName: 'text-right' },
                            { key: 'retailOutboundAmount', label: '店販(出)', render: item => `¥${item.retailOutboundAmount.toLocaleString()}`, cellClassName: 'text-right' },
                        ]}
                        data={adminData.supplierUsagePerformance}
                        itemKey="supplierId"
                    />
                </div>
              ) : (
                <p className="text-slate-500 text-center py-10">この期間のデータはありません。</p>
              )}
            </div>
            
            {/* New Category Analysis Section */}
            <CategoryAnalysisSection />

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow-lg rounded-xl p-6">
               <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center">
                <ChartBarIcon className="h-6 w-6 mr-2 text-indigo-500" />
                在庫推移 (過去6ヶ月)
                <div className="relative group ml-2" role="tooltip" aria-describedby="inventory-movement-tooltip">
                    <InformationCircleIcon className="h-5 w-5 text-slate-400 cursor-help" />
                    <div id="inventory-movement-tooltip" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-sm text-white bg-slate-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                        過去6ヶ月間の総入庫数と総出庫数の推移です。季節的な需要の波や仕入れの傾向を把握できます。
                    </div>
                </div>
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={adminData.inventoryMovement} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip contentStyle={{backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', borderRadius: '0.5rem', border: '1px solid #e2e8f0'}} />
                  <Legend />
                  <Line type="monotone" dataKey="intake" name="総入庫数" stroke="#0ea5e9" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                  <Line type="monotone" dataKey="outbound" name="総出庫数" stroke="#f43f5e" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white shadow-lg rounded-xl p-6">
               <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center">
                <ArchiveBoxIcon className="h-6 w-6 mr-2 text-teal-500" />
                カテゴリ別 ポートフォリオ分析
                 <div className="relative group ml-2" role="tooltip" aria-describedby="category-portfolio-tooltip">
                    <InformationCircleIcon className="h-5 w-5 text-slate-400 cursor-help" />
                    <div id="category-portfolio-tooltip" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 text-sm text-white bg-slate-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                        <p><strong className="font-semibold">ブロックの大きさ:</strong> 在庫金額の大きさ</p>
                        <p><strong className="font-semibold">ブロックの色:</strong> 在庫回転率の高さ (緑が濃いほど高い)</p>
                        <p className="mt-1 pt-1 border-t border-slate-600">「大きくて色が薄い(赤系)」カテゴリは過剰在庫の可能性があります。</p>
                    </div>
                </div>
              </h2>
              {adminData.categoryPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <Treemap
                    data={adminData.categoryPerformance}
                    dataKey="inventoryValue"
                    nameKey="categoryName"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    content={<CustomizedTreemapContent minRate={Math.min(...adminData.categoryPerformance.map(c => c.turnoverRate))} maxRate={Math.max(...adminData.categoryPerformance.map(c => c.turnoverRate))}/>}
                  >
                    <Tooltip formatter={(value: number, name: string, props: {payload: CategoryPerformance}) => [`¥${(props.payload.inventoryValue || 0).toLocaleString()}`, `回転率: ${props.payload.turnoverRate.toFixed(2)}`]}/>
                  </Treemap>
                </ResponsiveContainer>
              ) : (
                 <p className="text-slate-500 text-center py-10">カテゴリ分析データがありません。</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow-lg rounded-xl p-6">
              <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center">
                <FireIcon className="h-6 w-6 mr-2 text-red-500" />
                当月 人気商品ランキング (出庫数)
              </h2>
              {adminData.topOutboundProductsThisMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={adminData.topOutboundProductsThisMonth.map(p=>({...p, productName: p.productName.substring(0,15)}))} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis type="category" dataKey="productName" width={120} tick={{ fontSize: 12, fill: '#334155' }} />
                    <Tooltip formatter={(value) => `${value} 点`} contentStyle={{backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', borderRadius: '0.5rem', border: '1px solid #e2e8f0'}} />
                    <Legend />
                    <Bar dataKey="totalQuantity" fill="#f43f5e" name="出庫数" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-500 text-center py-10">今月の出庫データはありません。</p>
              )}
            </div>

            <div className="bg-white shadow-lg rounded-xl p-6">
              <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center">
                <ExclamationTriangleIcon className="h-6 w-6 mr-2 text-orange-500" />
                要注意在庫リスト
              </h2>
              {adminData.inventoryWatchlist.length > 0 ? (
                  <ul className="divide-y divide-slate-200 max-h-[300px] overflow-y-auto pr-2">
                    {adminData.inventoryWatchlist.slice(0, 10).map(item => ( // Limit to top 10 for display
                        <li key={item.product.id} className="py-3 flex justify-between items-center">
                            <div>
                                <p className="font-medium text-slate-800">{item.product.name}</p>
                                <p className="text-sm text-slate-500">
                                    {item.reason === 'obsolete' 
                                        ? <span className="text-red-600 font-semibold">不良在庫</span>
                                        : <span className="text-yellow-600 font-semibold">過剰在庫</span>
                                    }
                                    <span className="ml-2"> - 最終変動から {item.daysSinceLastUpdate}日経過</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">{item.product.currentStock}点</p>
                                <p className="text-sm text-slate-500">最低: {item.product.minimumStock}</p>
                            </div>
                        </li>
                    ))}
                </ul>
              ) : (
                  <p className="text-slate-500 text-center py-10">現在、注意が必要な在庫はありません。</p>
              )}
            </div>
          </div>
        </>
      )}

      {currentUser?.role === UserRole.STAFF && staffData && (
        <>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="総在庫評価額 (概算)" value={staffData.approxTotalInventoryValue} icon={<CurrencyYenIcon />} color="border-l-blue-500" />
            <StatCard title="当月入庫アイテム数" value={staffData.totalIntakeItemsThisMonth.toLocaleString()} 
              subText={<><span>業務: {staffData.totalIntakeItemsThisMonthByUsage.professional.toLocaleString()}</span> / <span>店販: {staffData.totalIntakeItemsThisMonthByUsage.retail.toLocaleString()}</span></>}
              icon={<ArrowDownTrayIcon />} color="border-l-sky-500" linkTo={ROUTE_PATHS.INTAKE} />
            <StatCard title="当月出庫アイテム数" value={staffData.totalOutboundItemsThisMonth.toLocaleString()} 
               subText={<><span>業務: {staffData.totalOutboundItemsThisMonthByUsage.professional.toLocaleString()}</span> / <span>店販: {staffData.totalOutboundItemsThisMonthByUsage.retail.toLocaleString()}</span></>}
              icon={<ArrowUpTrayIcon />} color="border-l-rose-500" linkTo={ROUTE_PATHS.OUTBOUND} />
            <StatCard title="在庫僅少品目数" value={staffData.lowStockItemsCount} icon={<BellAlertIcon />} color="border-l-yellow-500" linkTo={ROUTE_PATHS.INVENTORY} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow-lg rounded-xl p-6">
                <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center">
                    <FireIcon className="h-6 w-6 mr-2 text-red-500" />
                    当月 人気商品ランキング (出庫数)
                </h2>
                {staffData.topOutboundProductsThisMonth.length > 0 ? (
                   <ResponsiveContainer width="100%" height={300}>
                     <BarChart data={staffData.topOutboundProductsThisMonth.map(p=>({...p, productName: p.productName.substring(0,15)}))} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis type="category" dataKey="productName" width={120} tick={{ fontSize: 12, fill: '#334155' }} />
                        <Tooltip formatter={(value) => `${value} 点`} contentStyle={{backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', borderRadius: '0.5rem', border: '1px solid #e2e8f0'}} />
                        <Legend />
                        <Bar dataKey="totalQuantity" fill="#f43f5e" name="出庫数" radius={[0, 4, 4, 0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-slate-500 text-center py-10">今月の出庫データはありません。</p>
                )}
            </div>
             {lowStockProducts.length > 0 && (
              <div className="bg-white shadow-lg rounded-xl p-6">
                <h2 className="text-xl font-semibold text-yellow-600 mb-4 flex items-center">
                  <BellAlertIcon className="h-6 w-6 mr-2 text-yellow-500" />
                  {UI_TEXT.LOW_STOCK_ALERT} ({lowStockProducts.length}件)
                </h2>
                <ul className="divide-y divide-slate-200 max-h-[300px] overflow-y-auto pr-2">
                  {lowStockProducts.map(p => (
                    <li key={p.id} className="py-3 flex justify-between items-center">
                      <span className="text-slate-700">{p.name} ({p.barcode})</span>
                      <span className="text-red-600 font-medium">残: {p.currentStock} (最低: {p.minimumStock})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
        </>
      )}
      
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
};

export default DashboardPage;