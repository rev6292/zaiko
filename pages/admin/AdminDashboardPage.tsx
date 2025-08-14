import React, { useState, useEffect, useCallback } from 'react';
import { AdminDashboardData, SupplierMonthlyPerformance, TableHeader } from '../../types';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import Table from '../../components/Table';
import { UI_TEXT } from '../../constants';
import { ArrowDownTrayIcon, CalendarDaysIcon, BanknotesIcon, ArchiveBoxIcon, BellAlertIcon, ExclamationTriangleIcon, ShoppingCartIcon, CurrencyYenIcon, ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import PageGuide from '../../components/PageGuide';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; subText?: string; bgColor?: string; textColor?: string; borderColor?: string }> = ({ title, value, icon, subText, bgColor = 'bg-sky-100', textColor = 'text-sky-800', borderColor = 'border-sky-500' }) => (
  <div className={`bg-white shadow-lg rounded-xl p-5 border-l-4 ${borderColor}`}>
    <div className="flex items-center space-x-4">
      <div className={`p-3 rounded-full ${bgColor}`}>
        {React.cloneElement(icon, { className: `h-7 w-7 ${textColor}` })}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-semibold text-gray-800">{value}</p>
        {subText && <p className="text-xs text-gray-400">{subText}</p>}
      </div>
    </div>
  </div>
);

// Helper function to convert data to CSV
const convertToCSV = (data: SupplierMonthlyPerformance[], headers: { key: keyof SupplierMonthlyPerformance | string, label: string }[]): string => {
  const headerRow = headers.map(h => h.label).join(',');
  const rows = data.map(item => {
    return headers.map(header => {
      let val = item[header.key as keyof SupplierMonthlyPerformance];
      if (header.key === 'percentageChange') {
         val = (Number(val) * 100).toFixed(1) + '%';
         if (val === 'Infinity%') val = 'N/A';
      } else if (typeof val === 'number') {
        val = val.toLocaleString();
      }
      return `"${String(val ?? '').replace(/"/g, '""')}"`; // Escape double quotes
    }).join(',');
  });
  return [headerRow, ...rows].join('\r\n');
};

const downloadCSV = (csvStr: string, filename: string) => {
  const blob = new Blob([`\uFEFF${csvStr}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

type PeriodSelectionType = 'specific_month' | 'last_1_month' | 'last_3_months' | 'last_6_months' | 'last_12_months';

const periodOptions: { value: PeriodSelectionType; label: string }[] = [
  { value: 'specific_month', label: '月指定' },
  { value: 'last_1_month', label: '過去1ヶ月' },
  { value: 'last_3_months', label: '過去3ヶ月' },
  { value: 'last_6_months', label: '過去6ヶ月' },
  { value: 'last_12_months', label: '過去1年間' },
];

const AdminDashboardPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [periodType, setPeriodType] = useState<PeriodSelectionType>('specific_month');
  const [specificMonthValue, setSpecificMonthValue] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchDashboardData = useCallback(async (startDate: string, endDate: string, displayLabel: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get('/dashboard/admin', { startDate, endDate, periodLabel: displayLabel });
      setDashboardData(data);
    } catch (err) {
      setError(UI_TEXT.ERROR_LOADING_DATA);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let startDate: Date;
    let endDate: Date;
    let displayLabel: string;
    const today = new Date();

    switch (periodType) {
      case 'last_1_month':
        endDate = new Date(today.getFullYear(), today.getMonth(), 0); // End of last month
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1); // Start of last month
        displayLabel = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'last_3_months':
        endDate = new Date(today.getFullYear(), today.getMonth(), 0); // End of last month
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 2, 1); // Start of 3 months ago (relative to last month)
        displayLabel = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')} ~ ${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'last_6_months':
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);
        displayLabel = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')} ~ ${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'last_12_months':
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1);
        displayLabel = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')} ~ ${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'specific_month':
      default:
        const [year, month] = specificMonthValue.split('-').map(Number);
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0); // Last day of selected month
        displayLabel = specificMonthValue;
        break;
    }
    
    const isoStartDate = startDate.toISOString().split('T')[0];
    const isoEndDate = endDate.toISOString().split('T')[0];
    
    fetchDashboardData(isoStartDate, isoEndDate, displayLabel);
  }, [periodType, specificMonthValue, fetchDashboardData]);
  
  const supplierPerformanceHeaders: TableHeader<SupplierMonthlyPerformance>[] = [
    { key: 'supplierName', label: UI_TEXT.SUPPLIER },
    { key: 'currentPeriodTotal', label: `期間合計 (${dashboardData?.selectedPeriodSummary.periodLabel || ''})`, render: item => `¥${item.currentPeriodTotal.toLocaleString()}` },
    { key: 'previousPeriodTotal', label: UI_TEXT.PREVIOUS_YEAR_MONTH_TOTAL, render: item => `¥${item.previousPeriodTotal.toLocaleString()}` },
    { key: 'difference', label: UI_TEXT.DIFFERENCE, render: item => {
        const diff = item.difference;
        const color = diff >= 0 ? 'text-green-600' : 'text-red-600';
        return <span className={color}>{diff >= 0 ? '+' : ''}¥{diff.toLocaleString()}</span>;
      } 
    },
    { key: 'percentageChange', label: UI_TEXT.PERCENTAGE_CHANGE, render: item => {
        if (item.percentageChange === Infinity) return <span className="text-gray-500">N/A</span>;
        const perc = item.percentageChange * 100;
        const color = perc >= 0 ? 'text-green-600' : 'text-red-600';
        return <span className={color}>{perc >= 0 ? '+' : ''}{perc.toFixed(1)}%</span>;
      }
    },
  ];

  const handleDownloadCsv = () => {
    if (dashboardData?.selectedPeriodSummary?.supplierPerformances) {
      const csvData = convertToCSV(dashboardData.selectedPeriodSummary.supplierPerformances, supplierPerformanceHeaders.map(h => ({key: h.key, label: String(h.label).replace(` (${dashboardData?.selectedPeriodSummary.periodLabel || ''})`, '') }))); // Remove dynamic part from header label for CSV
      const filenameSuffix = dashboardData.selectedPeriodSummary.periodLabel.replace(/ ~ /g, '_to_');
      downloadCSV(csvData, `supplier_performance_${filenameSuffix}.csv`);
    }
  };


  if (loading) return <LoadingSpinner message={UI_TEXT.LOADING_DASHBOARD_DATA} />;
  if (error) return <p className="text-red-500 p-4 bg-red-100 rounded-md">{error}</p>;
  if (!dashboardData) return <p className="text-gray-500">{UI_TEXT.NO_DATA_AVAILABLE}</p>;

  const { 
    totalInventoryValue, 
    lowStockItemsCount, 
    pendingIntakeApprovals, 
    obsoleteStockItemsCount,
    selectedPeriodSummary,
    currentCalendarMonthStats 
  } = dashboardData;

  return (
    <div className="space-y-8">
      <PageGuide title="管理ダッシュボードの使い方">
        <p>このページは管理者向けの特設ダッシュボードです。店舗全体の経営状況を分析するための指標がまとめられています。</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>統計カード:</strong> 全店舗の合計在庫額や要対応項目など、経営に関わる重要指標を一覧できます。</li>
          <li><strong>期間別 仕入先実績:</strong> 指定した期間と前年の同期間を比較し、仕入先ごとの取引額の増減を確認できます。期間は右上のセレクタで自由に変更可能です。</li>
        </ul>
      </PageGuide>
      <h1 className="text-3xl font-semibold text-gray-800">管理者ダッシュボード</h1>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        <StatCard title={UI_TEXT.TOTAL_INVENTORY_VALUE} value={`¥${totalInventoryValue.toLocaleString()}`} icon={<ArchiveBoxIcon />} borderColor="border-blue-500" bgColor="bg-blue-100" textColor="text-blue-700"/>
        <StatCard title={UI_TEXT.CURRENT_MONTH_TOTAL_COST} value={`¥${currentCalendarMonthStats.totalMaterialCost.toLocaleString()}`} icon={<BanknotesIcon />} subText={`(${currentCalendarMonthStats.month})`} borderColor="border-green-500" bgColor="bg-green-100" textColor="text-green-700" />
        <StatCard title={UI_TEXT.LOW_STOCK_ITEMS_COUNT} value={lowStockItemsCount} icon={<BellAlertIcon />} borderColor="border-yellow-500" bgColor="bg-yellow-100" textColor="text-yellow-700"/>
        <StatCard title={UI_TEXT.OBSOLETE_STOCK_ITEMS_COUNT} value={obsoleteStockItemsCount} icon={<ExclamationTriangleIcon />} borderColor="border-orange-500" bgColor="bg-orange-100" textColor="text-orange-700"/>
        <StatCard title={UI_TEXT.PENDING_INTAKE_APPROVALS} value={pendingIntakeApprovals} icon={<ShoppingCartIcon />} borderColor="border-purple-500" bgColor="bg-purple-100" textColor="text-purple-700"/>
      </div>
      
      {/* Monthly Supplier Performance Section */}
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <h2 className="text-2xl font-semibold text-gray-700 flex items-center">
            <CalendarDaysIcon className="h-7 w-7 mr-2 text-sky-600"/>
            期間別 仕入先実績
          </h2>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <div className="relative">
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodSelectionType)}
                className="appearance-none w-full sm:w-auto bg-slate-900 border border-slate-700 text-white py-2 px-3 pr-8 rounded-md leading-tight focus:outline-none focus:border-sky-500 shadow-sm"
                aria-label="集計期間タイプを選択"
              >
                {periodOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-300">
                <ChevronDownIcon className="h-4 w-4"/>
              </div>
            </div>
            {periodType === 'specific_month' && (
              <input 
                type="month"
                value={specificMonthValue}
                onChange={(e) => setSpecificMonthValue(e.target.value)}
                className="p-2 border border-slate-700 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 w-full sm:w-auto bg-slate-900 text-white"
                aria-label="対象月を選択"
              />
            )}
            <button
              onClick={handleDownloadCsv}
              disabled={!selectedPeriodSummary?.supplierPerformances || selectedPeriodSummary.supplierPerformances.length === 0}
              className="flex items-center bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-3 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title={UI_TEXT.DOWNLOAD_CSV}
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-1.5"/>
              CSV
            </button>
          </div>
        </div>
        
        <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg flex items-start gap-2 border border-blue-200">
            <InformationCircleIcon className="h-5 w-5 mt-0.5 text-blue-500 flex-shrink-0" />
            <div>
                指定した「集計期間」と、その「前年の同期間」における各仕入先の仕入合計額を比較します。これにより、季節変動や取引の変化を把握できます。
            </div>
        </div>


        {selectedPeriodSummary && selectedPeriodSummary.supplierPerformances.length > 0 ? (
          <>
            <Table headers={supplierPerformanceHeaders} data={selectedPeriodSummary.supplierPerformances} itemKey="supplierId" />
            <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end sm:space-x-6 pr-2 sm:pr-6 gap-2 sm:gap-0">
                 <div className="text-right">
                    <p className="text-sm text-gray-500">{selectedPeriodSummary.periodLabel} 総計</p>
                    <p className="text-lg font-semibold text-gray-800">¥{selectedPeriodSummary.totalForPeriod.toLocaleString()}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-sm text-gray-500">前年同期間 総計</p>
                    <p className="text-lg font-semibold text-gray-800">¥{selectedPeriodSummary.totalForPreviousPeriod.toLocaleString()}</p>
                 </div>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-500 py-8">{selectedPeriodSummary?.periodLabel || '選択された期間'}には該当する仕入実績データがありません。</p>
        )}
      </div>

    </div>
  );
};

export default AdminDashboardPage;