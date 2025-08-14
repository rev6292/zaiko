import React, { useState, useCallback, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { Product, AllDataBackup, ProductWithStock, AutoBackupInfo } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { useStore } from '../../contexts/StoreContext';
import { useNotification } from '../../contexts/NotificationContext';
import { ArchiveBoxArrowDownIcon, DocumentTextIcon, CheckCircleIcon, ExclamationTriangleIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ClockIcon } from '@heroicons/react/24/outline';
import PageGuide from '../../components/PageGuide';

const CSV_HEADERS = [
  { key: 'barcode', label: 'barcode (必須/ユニーク)' },
  { key: 'name', label: 'name (新規登録時必須)' },
  { key: 'categoryId', label: 'categoryId (新規登録時必須)' },
  { key: 'supplierId', label: 'supplierId (新規登録時必須)' },
  { key: 'currentStock', label: 'currentStock (現在庫)' },
  { key: 'minimumStock', label: 'minimumStock (最低在庫)' },
  { key: 'costPrice', label: 'costPrice (原価)' },
  { key: 'description', label: 'description (商品説明)' },
];

const AdminCsvPage: React.FC = () => {
  const { selectedStoreId } = useStore();
  const { showNotification } = useNotification();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isFullExporting, setIsFullExporting] = useState(false);
  const [isFullImporting, setIsFullImporting] = useState(false);
  const [fullImportFile, setFullImportFile] = useState<File | null>(null);
  const [fullImportResult, setFullImportResult] = useState<{ success: boolean, message: string } | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // For auto-backups
  const [autoBackups, setAutoBackups] = useState<AutoBackupInfo[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(true);
  const [backupToRestore, setBackupToRestore] = useState<AutoBackupInfo | null>(null);


  const fetchAutoBackups = useCallback(async () => {
    setIsLoadingBackups(true);
    try {
        const data = await apiClient.get('/data/auto-backups');
        setAutoBackups(data);
    } catch (error) {
        showNotification('自動バックアップ履歴の読み込みに失敗しました。', 'error');
    } finally {
        setIsLoadingBackups(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchAutoBackups();
  }, [fetchAutoBackups]);


  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setImportResult(null);
    try {
      const products = await apiClient.get('/products', { storeId: selectedStoreId });
      
      const headerRow = CSV_HEADERS.map(h => h.label).join(',');
      const rows = products.map((p: ProductWithStock) => {
        return CSV_HEADERS.map(header => {
          let val = p[header.key as keyof ProductWithStock];
          // Escape quotes and wrap in quotes
          return `"${String(val ?? '').replace(/"/g, '""')}"`;
        }).join(',');
      });
      
      const csvContent = [headerRow, ...rows].join('\r\n');
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `products_${selectedStoreId}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("CSVエクスポートエラー:", error);
      setImportResult({ success: false, message: 'エクスポート中にエラーが発生しました。'});
    } finally {
      setIsExporting(false);
    }
  }, [selectedStoreId]);

  const handleDownloadTemplate = () => {
    const headerRow = CSV_HEADERS.map(h => h.label).join(',');
    const blob = new Blob([`\uFEFF${headerRow}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'products_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportFile(e.target.files ? e.target.files[0] : null);
    setImportResult(null);
  };

  const handleImport = useCallback(async () => {
    if (!importFile) {
      setImportResult({ success: false, message: 'ファイルが選択されていません。' });
      return;
    }
     if (selectedStoreId === 'all') {
      setImportResult({ success: false, message: 'CSVインポートを行うには、ヘッダーのドロップダウンから特定の店舗を選択してください。' });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          throw new Error('ヘッダー行と少なくとも1つのデータ行が必要です。');
        }

        const headerLine = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const headerKeyMap = new Map<string, string>();
        CSV_HEADERS.forEach(h => headerKeyMap.set(h.label, h.key));
        
        const productsToUpsert: Partial<Product>[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/(^"|"$)/g, ''));
            const productData: Partial<Product> = {};
            for(let j=0; j < headerLine.length; j++) {
                const headerLabel = headerLine[j];
                const key = headerKeyMap.get(headerLabel);
                if(key) {
                    const value = values[j];
                    if (['costPrice', 'currentStock', 'minimumStock'].includes(key)) {
                        (productData as any)[key] = value ? parseFloat(value) : 0;
                    } else {
                        (productData as any)[key] = value;
                    }
                }
            }
            if (productData.barcode) { // Barcode is essential for upsert
                productsToUpsert.push(productData);
            }
        }
        
        const result = await apiClient.post('/products/batch-upsert', { products: productsToUpsert, storeId: selectedStoreId });
        setImportResult({ success: true, message: `インポート完了: ${result.createdCount}件新規作成, ${result.updatedCount}件更新.` });
        if (result.errors.length > 0) {
            setImportResult(prev => ({ ...prev!, message: prev!.message + ` エラー: ${result.errors.join(', ')}` }));
        }

      } catch (err) {
        setImportResult({ success: false, message: `インポートエラー: ${(err as Error).message}`});
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(importFile);
  }, [importFile, selectedStoreId]);

  const handleFullFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullImportFile(e.target.files ? e.target.files[0] : null);
    setFullImportResult(null);
  };
  
  const handleFullExport = async () => {
      setIsFullExporting(true);
      setFullImportResult(null);
      try {
        const data = await apiClient.get('/data/export-all');
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `full_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        setFullImportResult({ success: false, message: '全データのエクスポートに失敗しました。' });
      } finally {
        setIsFullExporting(false);
      }
  };
  
  const handleFullImport = async () => {
    if (!fullImportFile) {
        setFullImportResult({ success: false, message: 'バックアップファイルが選択されていません。' });
        return;
    }
    setIsConfirmModalOpen(false);
    setIsFullImporting(true);
    setFullImportResult(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result as string;
            const data: AllDataBackup = JSON.parse(text);
            await apiClient.post('/data/import-all', data);
            setFullImportResult({ success: true, message: '全データのインポートに成功しました。ページをリロードしてください。' });
        } catch (err) {
            setFullImportResult({ success: false, message: `インポートエラー: ${(err as Error).message}`});
        } finally {
            setIsFullImporting(false);
        }
    };
    reader.readAsText(fullImportFile);
  };

  const handleRestoreFromBackup = async () => {
    if (!backupToRestore) return;
    setIsConfirmModalOpen(false);
    setIsFullImporting(true);
    setFullImportResult(null);
    try {
        await apiClient.post('/data/restore-from-backup', { timestamp: backupToRestore.timestamp });
        setFullImportResult({ success: true, message: `バックアップ (${new Date(backupToRestore.timestamp).toLocaleString()}) からの復元に成功しました。ページをリロードしてください。` });
    } catch (err) {
        setFullImportResult({ success: false, message: `復元エラー: ${(err as Error).message}` });
    } finally {
        setIsFullImporting(false);
        setBackupToRestore(null);
    }
  };

  return (
    <div className="space-y-8">
        <PageGuide title="CSV・データ管理の使い方">
            <ul className="list-disc list-inside space-y-2">
                <li>
                    <strong>商品CSV:</strong> 在庫商品を一括で更新・登録できます。既存商品は「barcode」をキーに更新、存在しないbarcodeの場合は新規商品として登録されます。
                    <ul className="list-circle list-inside ml-4">
                        <li><strong>エクスポート:</strong> 現在の在庫データをCSV形式でダウンロードします。バックアップや外部でのデータ編集に利用できます。</li>
                        <li><strong>インポート:</strong> CSVファイルをアップロードしてデータを一括反映します。必ず「テンプレートをダウンロード」して形式を合わせてください。</li>
                    </ul>
                </li>
                 <li>
                    <strong>全データバックアップ/復元:</strong> 商品だけでなく、スタッフ、店舗、カテゴリなど、システム内の全データをJSONファイルとして一括で保存・復元します。
                    <strong className="text-red-600 block">注意: 復元を実行すると現在の全データがファイルの内容で上書きされます。操作は慎重に行ってください。</strong>
                </li>
                 <li>
                    <strong>自動バックアップ:</strong> システムが週に一度、自動で全データのバックアップを作成します。過去4回分まで保存され、ここから任意の時点に復元できます。
                </li>
            </ul>
        </PageGuide>
      <h1 className="text-3xl font-semibold text-gray-800">CSVインポート/エクスポート</h1>

      {/* Product CSV Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center"><DocumentTextIcon className="h-6 w-6 mr-2 text-sky-600"/>商品CSV</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export */}
          <div>
            <h3 className="font-medium text-gray-800 mb-2">エクスポート</h3>
            <p className="text-sm text-gray-500 mb-3">現在の在庫商品データをCSVファイルとしてダウンロードします。</p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              {isExporting ? <LoadingSpinner size="sm"/> : <><ArrowDownTrayIcon className="h-5 w-5 mr-2"/>エクスポート</>}
            </button>
          </div>
          {/* Import */}
          <div>
            <h3 className="font-medium text-gray-800 mb-2">インポート</h3>
            <p className="text-sm text-gray-500 mb-3">CSVファイルをアップロードして商品データを一括更新/登録します。</p>
            <button onClick={handleDownloadTemplate} className="text-sm text-sky-600 hover:underline mb-3">テンプレートをダウンロード</button>
            <input type="file" accept=".csv" onChange={handleFileChange} className="block w-full text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"/>
            <button
              onClick={handleImport}
              disabled={isImporting || !importFile}
              className="w-full mt-3 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              {isImporting ? <LoadingSpinner size="sm"/> : <><ArrowUpTrayIcon className="h-5 w-5 mr-2"/>インポート</>}
            </button>
          </div>
        </div>
        {importResult && (
          <div className={`mt-4 p-3 rounded-md text-sm flex items-center ${importResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {importResult.success ? <CheckCircleIcon className="h-5 w-5 mr-2"/> : <ExclamationTriangleIcon className="h-5 w-5 mr-2"/>}
            {importResult.message}
          </div>
        )}
      </div>

       {/* Full Data Backup/Restore Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-2 flex items-center"><ArchiveBoxArrowDownIcon className="h-6 w-6 mr-2 text-red-600"/>全データバックアップ/復元</h2>
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200 mb-4"><ExclamationTriangleIcon className="h-5 w-5 inline-block mr-1"/><strong>注意:</strong> 全データの復元は現在のすべてのデータを上書きします。操作は慎重に行ってください。</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export */}
          <div>
            <h3 className="font-medium text-gray-800 mb-2">バックアップ (エクスポート)</h3>
            <p className="text-sm text-gray-500 mb-3">すべてのデータをJSONファイルとしてダウンロードします。</p>
            <button
              onClick={handleFullExport}
              disabled={isFullExporting}
              className="w-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              {isFullExporting ? <LoadingSpinner size="sm"/> : <><ArrowDownTrayIcon className="h-5 w-5 mr-2"/>バックアップ作成</>}
            </button>
          </div>
          {/* Import */}
          <div>
            <h3 className="font-medium text-gray-800 mb-2">復元 (インポート)</h3>
            <p className="text-sm text-gray-500 mb-3">JSONバックアップファイルをアップロードして全データを復元します。</p>
            <input type="file" accept=".json" onChange={handleFullFileChange} className="block w-full text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"/>
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={isFullImporting || !fullImportFile}
              className="w-full mt-3 flex items-center justify-center bg-red-800 hover:bg-red-900 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              {isFullImporting ? <LoadingSpinner size="sm"/> : <><ArrowUpTrayIcon className="h-5 w-5 mr-2"/>復元</>}
            </button>
          </div>
        </div>
         {fullImportResult && (
          <div className={`mt-4 p-3 rounded-md text-sm flex items-center ${fullImportResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {fullImportResult.success ? <CheckCircleIcon className="h-5 w-5 mr-2"/> : <ExclamationTriangleIcon className="h-5 w-5 mr-2"/>}
            {fullImportResult.message}
          </div>
        )}
      </div>

      {/* Auto Backup Restore Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center"><ClockIcon className="h-6 w-6 mr-2 text-indigo-600"/>自動バックアップからの復元</h2>
        {isLoadingBackups ? <LoadingSpinner/> : (
            autoBackups.length > 0 ? (
                <ul className="space-y-3">
                    {autoBackups.map(backup => (
                        <li key={backup.timestamp} className="p-3 bg-gray-50 rounded-md border flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div>
                                <p className="font-semibold text-gray-800">{new Date(backup.timestamp).toLocaleString('ja-JP')}</p>
                                <p className="text-sm text-gray-500">
                                    商品: {backup.stats.products}, ユーザー: {backup.stats.users}, 店舗: {backup.stats.stores}
                                </p>
                            </div>
                            <button 
                                onClick={() => setBackupToRestore(backup)}
                                className="mt-2 sm:mt-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-1.5 px-3 rounded-md shadow-sm transition-colors"
                            >
                                この時点に復元
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500">自動バックアップはまだ作成されていません。</p>
            )
        )}
      </div>

      {(isConfirmModalOpen || backupToRestore) && (
        <Modal 
            isOpen={isConfirmModalOpen || !!backupToRestore} 
            onClose={() => {setIsConfirmModalOpen(false); setBackupToRestore(null)}}
            title="復元の最終確認"
        >
            <div className="text-center">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500"/>
                <h3 className="mt-2 text-lg font-medium text-gray-900">本当に復元しますか？</h3>
                <div className="mt-2 text-sm text-gray-600">
                    {backupToRestore ? (
                        <p><strong>{new Date(backupToRestore.timestamp).toLocaleString()}</strong> のバックアップデータで現在のすべてのデータを上書きします。</p>
                    ) : (
                        <p>選択したファイルで現在のすべてのデータを上書きします。</p>
                    )}
                    <p className="font-bold text-red-700 mt-2">この操作は元に戻せません。</p>
                </div>
            </div>
            <div className="mt-6 flex justify-center space-x-4">
                <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm"
                    onClick={() => {setIsConfirmModalOpen(false); setBackupToRestore(null)}}
                >
                    キャンセル
                </button>
                 <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 border border-transparent rounded-md shadow-sm"
                    onClick={backupToRestore ? handleRestoreFromBackup : handleFullImport}
                >
                    はい、復元します
                </button>
            </div>
        </Modal>
      )}

    </div>
  );
};

export default AdminCsvPage;
