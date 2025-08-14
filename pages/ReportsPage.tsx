import React, { useState, useEffect, useCallback } from 'react';
import { MonthlyReportDataPoint, TableHeader } from '../types';
import apiClient from '../services/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import Table from '../components/Table';
import { UI_TEXT } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageGuide from '../components/PageGuide';

const ReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<MonthlyReportDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchReportData = useCallback(async (month: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get('/reports/monthly-purchase', { month });
      setReportData(data);
    } catch (err) {
      setError(UI_TEXT.ERROR_LOADING_DATA);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData(selectedMonth);
  }, [fetchReportData, selectedMonth]);

  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(event.target.value);
  };

  const tableHeaders: TableHeader<MonthlyReportDataPoint>[] = [
    { key: 'supplierName', label: '仕入先名' },
    { key: 'totalAmount', label: '合計金額 (¥)', render: (item) => `¥${item.totalAmount.toLocaleString()}` },
  ];
  
  const aggregatedChartData = reportData.reduce((acc, curr) => {
    const existing = acc.find(item => item.supplierName === curr.supplierName);
    if (existing) {
      existing.totalAmount += curr.totalAmount;
    } else {
      acc.push({ supplierName: curr.supplierName, totalAmount: curr.totalAmount });
    }
    return acc;
  }, [] as { supplierName: string; totalAmount: number }[]);


  return (
    <div className="space-y-6">
      <PageGuide title="月次レポートの使い方">
        <p>このページでは、指定した月の仕入れに関するレポートを確認できます。</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>対象月の変更:</strong> 右上の日付ピッカーで、レポートを見たい月を選択してください。</li>
          <li><strong>グラフ:</strong> 選択した月に、どの仕入先からどれくらいの金額を仕入れたかが一目でわかります。</li>
          <li><strong>テーブル:</strong> グラフの詳細な数値データを確認できます。</li>
        </ul>
      </PageGuide>
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-3xl font-semibold text-gray-800 mb-4 sm:mb-0">月次仕入レポート</h1>
        <div>
          <label htmlFor="month-select" className="mr-2 text-sm font-medium text-gray-700">対象月:</label>
          <input 
            type="month" 
            id="month-select"
            value={selectedMonth}
            onChange={handleMonthChange}
            className="p-2 border border-slate-700 rounded-md shadow-sm bg-slate-900 text-white focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {loading && <LoadingSpinner message={UI_TEXT.LOADING} />}
      {error && <p className="text-red-500 p-4 bg-red-100 rounded-md">{error}</p>}
      
      {!loading && !error && (
        <>
          {reportData.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
              {selectedMonth} のデータはありません。
            </div>
          ) : (
            <>
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">{selectedMonth} 仕入先別合計金額</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={aggregatedChartData} margin={{ top: 5, right: 30, left: 20, bottom: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="supplierName" angle={-45} textAnchor="end" interval={0} height={80} />
                    <YAxis tickFormatter={(value) => `¥${Number(value).toLocaleString()}`} />
                    <Tooltip formatter={(value) => `¥${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="totalAmount" fill="#82ca9d" name="仕入合計額" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6">
                 <Table headers={tableHeaders} data={reportData} itemKey="supplierName" />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;