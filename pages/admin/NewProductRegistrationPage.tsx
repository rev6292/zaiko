

import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Supplier, User, Category, ProcessedInvoiceItem, TableHeader } from '../../types';
import apiClient from '../../services/apiClient';
import Table from '../../components/Table';
import LoadingSpinner from '../../components/LoadingSpinner';
import { UI_TEXT } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircleIcon, ExclamationTriangleIcon, SparklesIcon, DocumentArrowUpIcon, UserCircleIcon, BuildingStorefrontIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const getStatusText = (status: ProcessedInvoiceItem['status']): string => {
  const statusMap: Record<ProcessedInvoiceItem['status'], string> = {
    pending: '保留',
    matched: '一致',
    new_details_required: '詳細入力待ち',
    ready: '登録準備完了',
    importing: '登録中',
    imported: '登録済み',
    error_importing: '登録エラー',
  };
  return statusMap[status] || status;
};

const NewProductRegistrationPage: React.FC = () => {
  const { currentUser } = useAuth();

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedRegistrarId, setSelectedRegistrarId] = useState<string>('');
  const [invoiceImageFile, setInvoiceImageFile] = useState<File | null>(null);
  const [invoiceImageBase64, setInvoiceImageBase64] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [parsedItems, setParsedItems] = useState<ProcessedInvoiceItem[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [supps, users, cats] = await Promise.all([
        apiClient.get('/suppliers'),
        apiClient.get('/users/staff'),
        apiClient.get('/categories')
      ]);
      setSuppliers(supps);
      setStaffUsers(users);
      setAllCategories(cats);

      if (currentUser) setSelectedRegistrarId(currentUser.id);
      if (supps.length > 0) setSelectedSupplierId(supps[0].id);

    } catch (err) {
      setError(UI_TEXT.ERROR_LOADING_DATA);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };
  
  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    clearMessages();
    const file = e.target.files?.[0];
    if (file) {
      setInvoiceImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setInvoiceImageBase64(reader.result as string);
      reader.readAsDataURL(file);
      setParsedItems([]);
    } else {
      setInvoiceImageFile(null);
      setInvoiceImageBase64(null);
    }
  };

  const handleParseImage = async () => {
    if (!invoiceImageBase64 || !selectedSupplierId) {
      setError("仕入先を選択し、画像ファイルをアップロードしてください。");
      return;
    }
    clearMessages();
    setIsParsing(true);
    try {
      const base64Data = invoiceImageBase64.split(',')[1];
      const rawItems = await apiClient.post('/gemini/invoice', { imageBase64: base64Data });

      const processed: ProcessedInvoiceItem[] = rawItems.map((raw: any, index: number) => {
        const qty = parseInt(raw.quantity) || 0;
        let price = parseFloat(raw.unitPrice || raw.totalPrice || '0');
        if (raw.totalPrice && !raw.unitPrice && qty > 0) price = parseFloat(raw.totalPrice) / qty;

        return {
          _tempId: `new_item_${Date.now()}_${index}`,
          rawItem: raw,
          matchedProductId: null,
          isNewProduct: true,
          productName: raw.itemName.trim(),
          barcode: '',
          categoryId: '',
          minimumStock: 1,
          quantity: qty,
          pricePerUnit: isNaN(price) ? 0 : parseFloat(price.toFixed(2)),
          status: 'new_details_required',
        };
      });
      setParsedItems(processed);
      setSuccessMessage(`${processed.length} 件の新規商品候補を抽出しました。`);
    } catch (err) {
      setError(`画像の解析に失敗しました: ${(err as Error).message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleItemChange = (tempId: string, field: keyof ProcessedInvoiceItem, value: any) => {
    setParsedItems(prev => prev.map(item => {
      if (item._tempId !== tempId) return item;
      
      const updatedItem = { ...item, [field]: value };
      
      if (updatedItem.productName && updatedItem.barcode && updatedItem.categoryId && updatedItem.pricePerUnit >= 0 && updatedItem.minimumStock >= 0) {
        updatedItem.status = 'ready';
      } else {
        updatedItem.status = 'new_details_required';
      }

      return updatedItem;
    }));
  };
  
  const handleSubmitNewProducts = async () => {
    clearMessages();
    const itemsToSubmit = parsedItems.filter(item => item.status === 'ready');
    if (itemsToSubmit.length === 0) {
      setError("登録準備が完了している商品がありません。");
      return;
    }
    if (!selectedSupplierId || !selectedRegistrarId) {
      setError("仕入先と担当者が選択されていません。");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await apiClient.post('/intake/new-products', { items: itemsToSubmit, supplierId: selectedSupplierId, registrarId: selectedRegistrarId });
      
      let message = '';
      if(result.successCount > 0) {
          message += `${result.successCount}件の新規商品を登録しました。`;
          await apiClient.post('/logs', { action: `${result.successCount}件の新規商品を一括登録`, userId: selectedRegistrarId });
      }
      if(result.errorCount > 0) {
          message += ` ${result.errorCount}件はエラーのため登録できませんでした: ${result.errors.join(', ')}`;
      }

      if(result.successCount > 0 && result.errorCount === 0) {
        setSuccessMessage(message);
        setParsedItems([]);
        setInvoiceImageFile(null);
        setInvoiceImageBase64(null);
      } else {
        setError(message);
      }
    } catch (err) {
      setError(`登録処理中にエラーが発生しました: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: ProcessedInvoiceItem['status']) => {
    switch (status) {
      case 'new_details_required': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-sky-100 text-sky-800';
      case 'importing': return 'bg-blue-100 text-blue-800';
      case 'imported': return 'bg-green-100 text-green-800';
      case 'error_importing': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const tableHeaders: TableHeader<ProcessedInvoiceItem>[] = [
    { key: 'productName', label: UI_TEXT.PRODUCT_NAME, render: (item) => <input type="text" value={item.productName} onChange={(e) => handleItemChange(item._tempId, 'productName', e.target.value)} className="w-full min-w-[200px] p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/> },
    { key: 'barcode', label: UI_TEXT.BARCODE, render: (item) => <input type="text" value={item.barcode} onChange={(e) => handleItemChange(item._tempId, 'barcode', e.target.value)} className="w-full min-w-[160px] p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/> },
    { key: 'categoryId', label: UI_TEXT.CATEGORY, render: (item) => (
      <select value={item.categoryId} onChange={(e) => handleItemChange(item._tempId, 'categoryId', e.target.value)} className="w-full min-w-[240px] p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700 focus:ring-indigo-500 focus:border-indigo-500">
        <option value="">選択...</option>
        {allCategories.filter(c => c.parentId !== null).map(c => {
            const parent = allCategories.find(p => p.id === c.parentId);
            return <option key={c.id} value={c.id}>{parent ? `${parent.name} > ` : ''}{c.name}</option>;
        })}
      </select>
    )},
    { key: 'costPrice', label: UI_TEXT.COST_PRICE_FOR_NEW_PRODUCT, render: (item) => <input type="number" value={item.pricePerUnit} onChange={(e) => handleItemChange(item._tempId, 'pricePerUnit', parseFloat(e.target.value))} className="w-24 p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/> },
    { key: 'initialStock', label: UI_TEXT.INITIAL_STOCK_QUANTITY, render: (item) => <input type="number" value={item.quantity} onChange={(e) => handleItemChange(item._tempId, 'quantity', parseInt(e.target.value))} className="w-20 p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700 focus:ring-indigo-500 focus:border-indigo-500" /> },
    { key: 'minimumStock', label: UI_TEXT.MINIMUM_STOCK, render: (item) => <input type="number" value={item.minimumStock} onChange={(e) => handleItemChange(item._tempId, 'minimumStock', parseInt(e.target.value))} className="w-20 p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700 focus:ring-indigo-500 focus:border-indigo-500" /> },
    { key: 'status', label: '状態', render: (item) => <span className={`px-2 py-0.5 inline-flex text-sm font-semibold rounded-full ${getStatusColor(item.status)}`}>{getStatusText(item.status)}</span> },
  ];

  if (loading) return <div className="p-8"><LoadingSpinner message="基本データを読み込み中..." /></div>;
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-gray-800">{UI_TEXT.NEW_PRODUCT_REGISTRATION_TITLE}</h1>

      {error && <div className="p-3 my-4 bg-red-100 text-red-700 rounded-md flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5"/>{error}</div>}
      {successMessage && <div className="p-3 my-4 bg-green-100 text-green-700 rounded-md flex items-center gap-2"><CheckCircleIcon className="h-5 w-5"/>{successMessage}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-md">
              <label htmlFor="registrar-select" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <UserCircleIcon className="h-5 w-5 mr-2 text-gray-500"/>{UI_TEXT.REGISTRAR}
              </label>
              <select id="registrar-select" value={selectedRegistrarId} onChange={e => setSelectedRegistrarId(e.target.value)} className="w-full p-2 border rounded-md bg-slate-900 text-white border-slate-700">
                  <option value="">{UI_TEXT.SELECT_REGISTRAR}</option>
                  {staffUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
              <label htmlFor="supplier-select" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <BuildingStorefrontIcon className="h-5 w-5 mr-2 text-gray-500"/>{UI_TEXT.SUPPLIER}
              </label>
              <select id="supplier-select" value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)} className="w-full p-2 border rounded-md bg-slate-900 text-white border-slate-700">
                  <option value="">仕入先を選択...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
          </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
        <h2 className="text-xl font-semibold text-gray-700">{UI_TEXT.CREATE_CANDIDATES_FROM_IMAGE_AI}</h2>
        <div>
          <label htmlFor="invoice-image" className="block text-sm font-medium text-gray-700 mb-2">納品書・商品リスト等の画像:</label>
          <input type="file" id="invoice-image" accept="image/*" onChange={handleImageFileChange} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
        </div>
        {invoiceImageBase64 && <div className="my-2"><img src={invoiceImageBase64} alt="Preview" className="max-h-40 border rounded-md"/></div>}
        <button onClick={handleParseImage} disabled={!selectedSupplierId || !invoiceImageBase64 || isParsing || isSubmitting} className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm disabled:opacity-50">
          {isParsing ? <LoadingSpinner size="sm" /> : <SparklesIcon className="h-5 w-5 mr-2" />}画像を解析 (AI)
        </button>
      </div>

      {parsedItems.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">{UI_TEXT.CONFIRM_AND_REGISTER_NEW_PRODUCTS}</h2>
            <div className="p-3 my-2 bg-blue-50 border-l-4 border-blue-400 text-blue-800 text-sm rounded-md flex items-start gap-3">
              <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5"/>
              <p>{UI_TEXT.ALL_ITEMS_MUST_BE_NEW_PRODUCTS} 必須項目を全て埋めると状態が「登録準備完了」に変わります。</p>
            </div>
            
            <div className="overflow-x-auto">
                <Table headers={tableHeaders} data={parsedItems} itemKey="_tempId" />
            </div>

            <button onClick={handleSubmitNewProducts} disabled={isSubmitting || isParsing || parsedItems.filter(p => p.status === 'ready').length === 0} className="flex items-center justify-center w-full md:w-auto px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm disabled:opacity-50">
              {isSubmitting ? <LoadingSpinner size="sm" /> : <DocumentArrowUpIcon className="h-5 w-5 mr-2" />}
              {UI_TEXT.REGISTER_CONFIRMED_NEW_PRODUCTS} ({parsedItems.filter(p => p.status === 'ready').length} 件)
            </button>
          </div>
      )}
    </div>
  );
};

export default NewProductRegistrationPage;