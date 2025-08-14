import React, { useState, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import { ProductWithStock, Supplier, ProcessedInvoiceItem, Category, RawInvoiceItem, TableHeader, ProductUsage } from '../../types';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import { UI_TEXT } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';
import { CheckCircleIcon, ExclamationTriangleIcon, SparklesIcon, DocumentArrowUpIcon, TrashIcon, InboxArrowDownIcon, QrCodeIcon, ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import Modal from '../../components/Modal';
import Table from '../../components/Table';


const getStatusText = (status: ProcessedInvoiceItem['status']): string => {
    const statusMap: Record<ProcessedInvoiceItem['status'], string> = {
      pending: '商品紐付け待ち',
      matched: '既存品と一致',
      new_details_required: '詳細入力待ち',
      ready: '登録準備完了',
      importing: '登録中',
      imported: '登録済み',
      error_importing: '登録エラー',
    };
    return statusMap[status] || status;
};

interface IntakeCartItem {
  product: ProductWithStock;
  quantity: number;
  costPrice: number;
}

const AujuIntakePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedStoreId } = useStore();
  
  // Base data
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [resultModalContent, setResultModalContent] = useState({ title: '', message: '' });

  // Barcode Intake State
  const [intakeCart, setIntakeCart] = useState<IntakeCartItem[]>([]);
  const [selectedSupplierForBarcode, setSelectedSupplierForBarcode] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // AI Invoice Intake State
  const [selectedSupplierForAI, setSelectedSupplierForAI] = useState<string>('');
  const [invoiceImageFile, setInvoiceImageFile] = useState<File | null>(null);
  const [invoiceImageBase64, setInvoiceImageBase64] = useState<string | null>(null);
  const [isParsingInvoice, setIsParsingInvoice] = useState(false);
  const [parsedItems, setParsedItems] = useState<ProcessedInvoiceItem[]>([]);
  const [isSubmittingInvoiceItems, setIsSubmittingInvoiceItems] = useState(false);
  const invoiceFileRef = useRef<HTMLInputElement>(null);

  const fetchBaseData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
        const [prods, supps, cats] = await Promise.all([
            apiClient.get('/products/auju', { storeId: selectedStoreId }),
            apiClient.get('/suppliers'),
            apiClient.get('/categories'),
        ]);
        setProducts(prods); 
        setSuppliers(supps); 
        setAllCategories(cats);
        if (supps && supps.length > 0) {
            const defaultSupplierId = supps[0].id;
            setSelectedSupplierForBarcode(current => current || defaultSupplierId);
            setSelectedSupplierForAI(current => current || defaultSupplierId);
        }
    } catch (err) {
        setError('コンポーネントの初期化に失敗しました。');
    } finally {
        setLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);


  const showToast = (type: 'success' | 'error', text: string) => {
    if (type === 'success') { setSuccessMessage(text); setError(null); } 
    else { setError(text); setSuccessMessage(null); }
    setTimeout(() => { setSuccessMessage(null); setError(null); }, 4000);
  };

  const showResultModal = (title: string, message: string) => {
    setResultModalContent({ title, message }); setIsResultModalOpen(true);
  };
  
  // --- BARCODE INTAKE LOGIC ---
  const handleBarcodeSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!barcodeInput.trim() || !selectedSupplierForBarcode || !selectedStoreId) return;
    
    setIsProcessingBarcode(true);
    try {
        const product: ProductWithStock | undefined = await apiClient.get('/products/auju', { barcode: barcodeInput.trim(), storeId: selectedStoreId });
        if (product) {
            if (product.supplierId !== selectedSupplierForBarcode && selectedSupplierForBarcode) {
                const productSupplier = suppliers.find(s => s.id === product.supplierId);
                showToast('error', `商品「${product.name}」は「${productSupplier?.name || '別の仕入先'}」の商品です。`);
                return;
            }

            const existingItemIndex = intakeCart.findIndex(item => item.product.id === product.id);
            if (existingItemIndex > -1) {
                setIntakeCart(prev => prev.map((item, index) => 
                    index === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item
                ));
            } else {
                setIntakeCart(prev => [{ product, quantity: 1, costPrice: product.costPrice }, ...prev]);
            }
            showToast('success', `「${product.name}」を追加しました。`);
        } else {
            showToast('error', `このバーコードを持つAujua商品が見つかりません: ${barcodeInput}`);
        }
    } catch (err) {
        showToast('error', `スキャンエラー: ${(err as Error).message}`);
    } finally {
        setBarcodeInput('');
        setIsProcessingBarcode(false);
        barcodeInputRef.current?.focus();
    }
  };

  const handleCartItemChange = (productId: string, field: 'quantity' | 'costPrice', value: number) => {
      setIntakeCart(prev => prev.map(item => {
          if (item.product.id === productId) {
              return { ...item, [field]: value };
          }
          return item;
      }).filter(item => item.quantity > 0)); 
  };

  const handleCompleteIntake = async () => {
    if (intakeCart.length === 0 || !selectedSupplierForBarcode || !currentUser || !selectedStoreId) {
        showToast('error', '入荷する商品がありません。');
        return;
    }
    
    setIsProcessingBarcode(true);
    const itemsToProcess = intakeCart.map(({ product, quantity, costPrice }) => ({
        productId: product.id, quantity, costPrice
    }));
    try {
        const result = await apiClient.post('/intake/batch/auju', {
            items: itemsToProcess, supplierId: selectedSupplierForBarcode, operatorId: currentUser.id, storeId: selectedStoreId
        });

        if (result.success) {
            await apiClient.post('/logs', { action: `${itemsToProcess.length}品目のAujua入荷を完了`, userId: currentUser.id });
            showToast('success', 'Aujuaの一括入荷が完了し、在庫が更新されました。');
            setIntakeCart([]);
            fetchBaseData();
        } else {
             showToast('error', `入荷処理エラー: ${result.errors.join(', ')}`);
        }
    } catch (err) {
        showToast('error', `入荷処理に失敗しました: ${(err as Error).message}`);
    } finally { setIsProcessingBarcode(false); }
  };

  // --- AI INVOICE INTAKE LOGIC ---
  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvoiceImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setInvoiceImageBase64(reader.result as string);
      reader.readAsDataURL(file);
      setParsedItems([]);
    } else {
      setInvoiceImageFile(null); setInvoiceImageBase64(null);
    }
  };
  
  const handleParseInvoice = async () => {
    if (!invoiceImageBase64) { showToast("error", "画像ファイルを選択してください。"); return; }
    if (!selectedSupplierForAI) { showToast("error", "担当仕入先を選択してください。"); return; }
    
    setIsParsingInvoice(true);
    try {
      const base64Data = invoiceImageBase64.split(',')[1];
      const rawItems: RawInvoiceItem[] = await apiClient.post('/gemini/invoice', { imageBase64: base64Data });
      
      const processed: ProcessedInvoiceItem[] = await Promise.all(rawItems.map(async (raw, index): Promise<ProcessedInvoiceItem> => {
        // IMPORTANT: Only match against Aujua products
        const matchedProduct = products.find(p => p.name.toLowerCase() === raw.itemName.toLowerCase().trim());
        const qty = parseInt(raw.quantity) || 0;
        let price = parseFloat(raw.unitPrice || raw.totalPrice || '0');
        if (raw.totalPrice && !raw.unitPrice && qty > 0) price = parseFloat(raw.totalPrice) / qty;

        return {
          _tempId: `item_${Date.now()}_${index}`, rawItem: raw, matchedProductId: matchedProduct?.id || null,
          isNewProduct: !matchedProduct, productName: matchedProduct?.name || raw.itemName.trim(),
          barcode: matchedProduct?.barcode || '', categoryId: matchedProduct?.categoryId || '',
          usage: matchedProduct?.usage || ProductUsage.RETAIL,
          minimumStock: matchedProduct?.minimumStock || 1, imageUrl: matchedProduct?.imageUrl || '', quantity: qty,
          pricePerUnit: isNaN(price) ? 0 : parseFloat(price.toFixed(2)),
          status: matchedProduct ? 'matched' : 'new_details_required',
        };
      }));
      setParsedItems(processed);
      showToast('success', processed.length > 0 ? `AIが ${processed.length} 件の商品候補を抽出しました。` : "AIが商品を抽出できませんでした。");
    } catch (err) {
      showToast("error", (err as Error).message || "納品書の解析に失敗しました。");
      setParsedItems([]);
    } finally { setIsParsingInvoice(false); }
  };
  
  const handleProcessedItemChange = (tempId: string, field: keyof ProcessedInvoiceItem, value: any) => {
    setParsedItems(prev => prev.map(item => {
        if (item._tempId !== tempId) return item;
        let updatedItem = { ...item, [field]: value };
        
        if (updatedItem.isNewProduct) {
          if (!(updatedItem.productName && updatedItem.barcode && updatedItem.categoryId && updatedItem.usage && updatedItem.imageUrl && updatedItem.quantity >= 0 && updatedItem.pricePerUnit >= 0 && updatedItem.minimumStock >= 0)) {
            updatedItem.status = 'new_details_required';
          } else { updatedItem.status = 'ready'; }
        } else if (updatedItem.matchedProductId) {
           if (!(updatedItem.quantity > 0 && updatedItem.pricePerUnit >= 0)) {
             updatedItem.status = 'matched';
           } else { updatedItem.status = 'ready'; }
        }
        return updatedItem;
    }));
  };
  
  const handleSubmitInvoiceItems = async () => {
    const itemsToSubmit = parsedItems.filter(item => item.status === 'ready');
    if (itemsToSubmit.length === 0) { showToast("error", "登録準備が完了している商品がありません。"); return; }
    if (!selectedSupplierForAI || !currentUser || !selectedStoreId) { showToast("error", "仕入先または店舗が選択されていません。"); return; }
    
    setIsSubmittingInvoiceItems(true);
    try {
      const result = await apiClient.post('/intake/auju-from-invoice', { items: itemsToSubmit, supplierId: selectedSupplierForAI, userId: currentUser.id, storeId: selectedStoreId });
      
      let modalTitle = '入荷記録完了';
      let modalMessage = `${result.successCount}件のAujua商品を入荷記録し、在庫を更新しました。`;

      if (result.errorCount > 0) {
        modalTitle = result.successCount > 0 ? '一部入荷記録完了' : '入荷記録エラー';
        modalMessage = `${result.successCount}件成功 / ${result.errorCount}件エラー: ${result.errors.join(', ')}`;
      }
      
      showResultModal(modalTitle, modalMessage);

      if (result.successCount > 0) {
        await apiClient.post('/logs', { action: `${result.successCount}件のAujua納品書アイテムを登録`, userId: currentUser.id });
        setParsedItems([]); setInvoiceImageFile(null); setInvoiceImageBase64(null);
        if (invoiceFileRef.current) invoiceFileRef.current.value = "";
        fetchBaseData();
      }
    } catch (err) { 
      showToast("error", `入荷記録処理中にエラーが発生しました: ${(err as Error).message}`);
    } finally { setIsSubmittingInvoiceItems(false); }
  };
  
  const getStatusColor = (status: ProcessedInvoiceItem['status']) => {
    const colorMap: Record<string, string> = {
        new_details_required: 'bg-yellow-100 text-yellow-800',
        error_importing: 'bg-red-100 text-red-800',
        matched: 'bg-pink-100 text-pink-800', 
        ready: 'bg-sky-100 text-sky-800', 
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };
  
  const processedItemTableHeaders: TableHeader<ProcessedInvoiceItem>[] = [
    { key: 'isNewProduct', label: '新規?', render: (item) => <input type="checkbox" checked={item.isNewProduct} onChange={(e) => handleProcessedItemChange(item._tempId, 'isNewProduct', e.target.checked)} className="form-checkbox h-5 w-5"/>},
    { key: 'productName', label: '商品名', render: (item) => item.isNewProduct ? <input type="text" value={item.productName} onChange={(e) => handleProcessedItemChange(item._tempId, 'productName', e.target.value)} className="w-full min-w-[200px] p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700"/> : <span>{item.productName}</span>},
    { key: 'barcode', label: 'バーコード', render: (item) => (item.isNewProduct ? <input type="text" value={item.barcode} onChange={(e) => handleProcessedItemChange(item._tempId, 'barcode', e.target.value)} className="w-full min-w-[160px] p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700"/> : <span>{products.find(p=>p.id === item.matchedProductId)?.barcode || '-'}</span>)},
    { key: 'imageUrl', label: '画像URL', render: (item) => (item.isNewProduct ? <input type="text" value={item.imageUrl} onChange={(e) => handleProcessedItemChange(item._tempId, 'imageUrl', e.target.value)} className="w-full min-w-[160px] p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700"/> : <span>-</span>)},
    { key: 'categoryId', label: 'カテゴリ', render: (item) => {
        if (!item.isNewProduct) return <span>{allCategories.find(c => c.id === item.categoryId)?.name || '-'}</span>;
        const aujuaChildCategories = allCategories.filter(c => c.parentId === 'cat_auju');
        return (<select value={item.categoryId} onChange={(e) => handleProcessedItemChange(item._tempId, 'categoryId', e.target.value)} className="w-full min-w-[200px] p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700"><option value="">選択...</option>{aujuaChildCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>);
    }},
    { key: 'usage', label: '用途', render: (item) => {
        if (!item.isNewProduct) {
            const product = products.find(p => p.id === item.matchedProductId);
            return <span>{product?.usage || '-'}</span>;
        }
        return (
            <select value={item.usage} onChange={(e) => handleProcessedItemChange(item._tempId, 'usage', e.target.value)} className="w-full min-w-[100px] p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700">
                <option value={ProductUsage.PROFESSIONAL}>{ProductUsage.PROFESSIONAL}</option>
                <option value={ProductUsage.RETAIL}>{ProductUsage.RETAIL}</option>
            </select>
        );
    }},
    { key: 'quantity', label: '数量', render: (item) => <input type="number" value={item.quantity} onChange={(e) => handleProcessedItemChange(item._tempId, 'quantity', parseInt(e.target.value))} className="w-20 p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700" />},
    { key: 'pricePerUnit', label: '入荷単価', render: (item) => <input type="number" value={item.pricePerUnit} onChange={(e) => handleProcessedItemChange(item._tempId, 'pricePerUnit', parseFloat(e.target.value))} className="w-24 p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700" />},
    { key: 'minimumStock', label: '最低在庫', render: (item) => (item.isNewProduct ? <input type="number" value={item.minimumStock} onChange={(e) => handleProcessedItemChange(item._tempId, 'minimumStock', parseInt(e.target.value))} className="w-20 p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700" /> : <span>{products.find(p=>p.id === item.matchedProductId)?.minimumStock || '-'}</span>)},
    { key: 'status', label: '状態', render: (item) => <span className={`px-2 py-0.5 inline-flex text-sm font-semibold rounded-full ${getStatusColor(item.status)}`}>{getStatusText(item.status)}</span>},
  ];
  
  if (loading) return <div className="p-8"><LoadingSpinner message={UI_TEXT.LOADING} /></div>;

  const totalCartValue = intakeCart.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
  
  return (
    <div className="space-y-8">
      {error && <div className="p-3 my-2 bg-red-100 text-red-700 rounded-md flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5"/>{error}</div>}
      {successMessage && !isResultModalOpen && <div className="p-3 my-2 bg-green-100 text-green-700 rounded-md flex items-center gap-2"><CheckCircleIcon className="h-5 w-5"/>{successMessage}</div>}
      <h1 className="text-3xl font-bold text-slate-800">Aujua 入荷処理</h1>

      <details className="bg-white p-6 rounded-lg shadow-md group" open>
        <summary className="text-xl font-semibold text-gray-700 cursor-pointer list-none flex justify-between items-center">
          <span className="flex items-center">
            AI納品書一括登録 (Aujua専用)
            <div className="relative group ml-2">
                <InformationCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                    Aujua製品の納品書を撮影・アップロードするとAIが内容を読み取ります。新規のAujua商品もその場で登録可能です。
                </div>
            </div>
          </span>
          <ChevronDownIcon className="h-6 w-6 transform group-open:rotate-180 transition-transform" />
        </summary>
        <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="supplier-select-ai" className="block text-sm font-medium text-gray-700 mb-1">担当仕入先:</label>
              <select id="supplier-select-ai" value={selectedSupplierForAI} onChange={(e) => {setSelectedSupplierForAI(e.target.value); setParsedItems([]); setInvoiceImageFile(null);}} className="w-full md:w-1/2 p-2 border rounded-md shadow-sm bg-slate-900 text-white border-slate-700 focus:ring-yellow-500 focus:border-yellow-500">
                <option value="">仕入先を選択...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="invoice-image" className="block text-sm font-medium text-gray-700 mb-1">納品書画像:</label>
              <input ref={invoiceFileRef} type="file" id="invoice-image" accept="image/*" onChange={handleImageFileChange} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"/>
            </div>
            {invoiceImageBase64 && <div className="my-2"><img src={invoiceImageBase64} alt="Invoice preview" className="max-h-40 border rounded-md"/></div>}
            <button onClick={handleParseInvoice} disabled={!selectedSupplierForAI || !invoiceImageBase64 || isParsingInvoice || isSubmittingInvoiceItems} className="flex items-center justify-center w-full md:w-auto px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm disabled:opacity-50">{isParsingInvoice ? <LoadingSpinner size="sm" /> : <SparklesIcon className="h-5 w-5 mr-2" />}画像を解析 (AI)</button>
            {parsedItems.length > 0 && (
            <div className="mt-4 space-y-4">
                <h3 className="text-lg font-medium">解析結果 ({parsedItems.length}件)</h3>
                <div className="overflow-x-auto">
                <Table headers={processedItemTableHeaders} data={parsedItems} itemKey="_tempId" />
                </div>
                <button onClick={handleSubmitInvoiceItems} disabled={isSubmittingInvoiceItems || isParsingInvoice || parsedItems.filter(p => p.status === 'ready').length === 0} className="flex items-center justify-center w-full md:w-auto px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm disabled:opacity-50">
                    {isSubmittingInvoiceItems ? <LoadingSpinner size="sm" /> : <DocumentArrowUpIcon className="h-5 w-5 mr-2" />}
                    確認済みの {parsedItems.filter(p => p.status === 'ready').length} 件を記録
                </button>
            </div>
            )}
        </div>
      </details>
      
      <details className="bg-white p-6 rounded-lg shadow-md group">
        <summary className="text-xl font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center">
          <span className="flex items-center">
            バーコードによる一括入荷 (Aujua専用)
            <div className="relative group ml-2">
                <InformationCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                    ハンディスキャナ等でAujua商品のバーコードを連続で読み取ることで、迅速に入荷リストを作成します。
                </div>
            </div>
          </span>
          <ChevronDownIcon className="h-6 w-6 transform group-open:rotate-180 transition-transform" />
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                  <label htmlFor="supplier-select-barcode" className="block text-sm font-medium text-gray-700 mb-1">仕入先:</label>
                  <select id="supplier-select-barcode" value={selectedSupplierForBarcode} onChange={(e) => {setSelectedSupplierForBarcode(e.target.value); setIntakeCart([])}} className="w-full p-2 border rounded-md shadow-sm bg-slate-900 text-white border-slate-700 focus:ring-yellow-500 focus:border-yellow-500">
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
              </div>
              <form onSubmit={handleBarcodeSubmit}>
                  <label htmlFor="barcode-input" className="block text-sm font-medium text-gray-700 mb-1">バーコードスキャン:</label>
                  <div className="flex items-center space-x-2">
                      <input ref={barcodeInputRef} type="text" id="barcode-input" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} placeholder={UI_TEXT.BARCODE_SCANNER_PLACEHOLDER} disabled={!selectedSupplierForBarcode || isProcessingBarcode} className="flex-grow p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-yellow-500 focus:border-yellow-500 disabled:opacity-50"/>
                      <button type="submit" className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50" disabled={isProcessingBarcode || !barcodeInput}>
                          <QrCodeIcon className="h-5 w-5"/>
                      </button>
                  </div>
              </form>
          </div>
          
          {intakeCart.length > 0 ? (
              <div className="mt-4 space-y-4">
                  <div className="max-h-80 overflow-y-auto pr-2 -mr-2 border rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {intakeCart.map(item => (
                          <li key={item.product.id} className="p-3 flex items-center gap-4 hover:bg-gray-50">
                              <div className="flex-grow">
                                  <p className="font-semibold text-gray-800">{item.product.name}</p>
                                  <p className="text-sm text-gray-500">{item.product.barcode}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                  <label className="text-sm">数量:</label>
                                  <input type="number" value={item.quantity} onChange={(e) => handleCartItemChange(item.product.id, 'quantity', parseInt(e.target.value))} onFocus={(e) => e.target.select()} className="w-16 text-center border-gray-300 rounded-md py-1 bg-slate-100"/>
                              </div>
                              <div className="flex items-center gap-2">
                                  <label className="text-sm">入荷単価:</label>
                                  <input type="number" value={item.costPrice} onChange={(e) => handleCartItemChange(item.product.id, 'costPrice', parseFloat(e.target.value))} onFocus={(e) => e.target.select()} className="w-24 text-center border-gray-300 rounded-md py-1 bg-slate-100"/>
                              </div>
                              <button onClick={() => setIntakeCart(prev => prev.filter(c => c.product.id !== item.product.id))} className="text-red-500 hover:text-red-700 p-1"><TrashIcon className="h-5 w-5"/></button>
                          </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t">
                      <p className="text-lg font-bold">合計金額: ¥{totalCartValue.toLocaleString()}</p>
                      <button onClick={handleCompleteIntake} disabled={isProcessingBarcode} className="flex items-center justify-center w-full md:w-auto px-6 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm disabled:opacity-50">
                          {isProcessingBarcode ? <LoadingSpinner size="sm"/> : <InboxArrowDownIcon className="h-5 w-5 mr-2"/>}
                          入荷を完了する
                      </button>
                  </div>
              </div>
          ) : (
              <p className="text-gray-500 text-center py-4">スキャンしたAujua商品がここに追加されます。</p>
          )}
        </div>
      </details>

      {isResultModalOpen && (
        <Modal 
          isOpen={isResultModalOpen} 
          onClose={() => setIsResultModalOpen(false)} 
          title={resultModalContent.title}
        >
          <div className="whitespace-pre-wrap">{resultModalContent.message}</div>
          <div className="flex justify-end mt-4">
            <button onClick={() => setIsResultModalOpen(false)} className="px-4 py-2 bg-indigo-600 text-white rounded-md">
              閉じる
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AujuIntakePage;
