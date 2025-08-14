import React, { useState, useEffect, useCallback, ChangeEvent, useRef, useMemo } from 'react';
import { 
  ScheduledIntakeItem, ScheduledIntakeStatus, Product, Supplier, UserRole, TableHeader, 
  RawInvoiceItem, ProcessedInvoiceItem, Category, PurchaseListItem as PLItemFromContext, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, ProductWithStock, ProductUsage
} from '../types';
import apiClient from '../services/apiClient';
import { usePurchaseList } from '../contexts/PurchaseListContext';
import Table from '../components/Table';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import PurchaseOrderPreviewModal from '../components/PurchaseOrderPreviewModal';
import { UI_TEXT } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { 
  CheckCircleIcon, XCircleIcon, InboxArrowDownIcon, DocumentMagnifyingGlassIcon, PencilIcon, 
  DocumentArrowUpIcon, SparklesIcon, ExclamationTriangleIcon, PlusCircleIcon, TrashIcon, 
  MinusIcon, PlusIcon, DocumentArrowDownIcon, EnvelopeIcon, ShoppingCartIcon, BuildingStorefrontIcon,
  ShoppingBagIcon, TruckIcon, InformationCircleIcon, ChevronDownIcon, CalendarDaysIcon, ClipboardDocumentCheckIcon,
  DocumentTextIcon, EyeIcon, CheckIcon, QrCodeIcon, XMarkIcon, PhotoIcon
} from '@heroicons/react/24/outline';
import { useLocation, useNavigate } from 'react-router-dom';
import PageGuide from '../components/PageGuide';


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

const CategoryManagementForm: React.FC<{
  category: Category | null;
  allCategories: Category[];
  onSave: (data: Category | Omit<Category, 'id'>) => void;
  onCancel: () => void;
}> = ({ category, allCategories, onSave, onCancel }) => {
  const [name, setName] = useState(category?.name || '');
  const [parentId, setParentId] = useState<string | null>(category?.parentId || null);
  const isEditing = !!category;

  const hierarchicalParentOptions = useMemo(() => {
    let availableCategories = allCategories;
    if (isEditing && category) {
      const descendantIds: string[] = [];
      const findDescendants = (parentId: string) => {
        allCategories.filter(c => c.parentId === parentId).forEach(child => {
          descendantIds.push(child.id);
          findDescendants(child.id);
        });
      };
      findDescendants(category.id);
      availableCategories = allCategories.filter(c => c.id !== category.id && !descendantIds.includes(c.id));
    }
    
    const buildHierarchy = (items: Category[], parentId: string | null, level: number): { id: string; name: string; level: number }[] => {
        return items
            .filter(item => item.parentId === parentId)
            .sort((a, b) => a.name.localeCompare(b.name))
            .flatMap(child => [
                { id: child.id, name: child.name, level },
                ...buildHierarchy(items, child.id, level + 1)
            ]);
    };

    return buildHierarchy(availableCategories, null, 0);
  }, [allCategories, category, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const dataToSave = {
      ...(category ? { id: category.id } : {}),
      name,
      parentId
    };
    onSave(dataToSave as Category | Omit<Category, 'id'>);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700">カテゴリ名</label>
        <input type="text" id="categoryName" name="categoryName" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500" />
      </div>
      <div>
        <label htmlFor="parentCategory" className="block text-sm font-medium text-gray-700">親カテゴリ</label>
        <select id="parentCategory" name="parentCategory" value={parentId || ''} onChange={e => setParentId(e.target.value || null)} className="mt-1 block w-full p-2 border rounded-md bg-slate-900 text-white border-slate-700 focus:ring-indigo-500 focus:border-indigo-500">
          <option value="">(ルートカテゴリとして作成)</option>
          {hierarchicalParentOptions.map(c => (
            <option key={c.id} value={c.id}>
              {''.padStart(c.level * 2, '\u00A0\u00A0')}{c.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-400 mt-1">任意のカテゴリを親として設定できます。</p>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm">キャンセル</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-md shadow-sm">保存</button>
      </div>
    </form>
  );
};

const ScheduledItemEditForm: React.FC<{
    item: ScheduledIntakeItem;
    onSave: (item: ScheduledIntakeItem) => void;
    onCancel: () => void;
}> = ({ item, onSave, onCancel }) => {
    const [formData, setFormData] = useState(item);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: name === 'quantity' ? parseInt(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">商品名</label>
                <p className="mt-1 text-gray-900 font-semibold">{formData.productName}</p>
            </div>
            <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">ステータス</label>
                <select id="status" name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-white border-gray-300 text-slate-900">
                    {Object.values(ScheduledIntakeStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">数量</label>
                <input type="number" id="quantity" name="quantity" value={formData.quantity} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-white border-gray-300 text-slate-900" />
            </div>
            <div>
                <label htmlFor="estimatedArrivalDate" className="block text-sm font-medium text-gray-700">入荷予定日</label>
                <input type="date" id="estimatedArrivalDate" name="estimatedArrivalDate" value={formData.estimatedArrivalDate ? formData.estimatedArrivalDate.split('T')[0] : ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-white border-gray-300 text-slate-900" />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md">キャンセル</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md">保存</button>
            </div>
        </form>
    );
};


//=============================================================================
// 1. Intake Processing Tab Component
//=============================================================================
const IntakeProcessingTab: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedStoreId } = useStore();
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [resultModalContent, setResultModalContent] = useState({ title: '', message: '' });

  // For Barcode Intake
  const [intakeCart, setIntakeCart] = useState<IntakeCartItem[]>([]);
  const [selectedSupplierForBarcode, setSelectedSupplierForBarcode] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);


  // For AI Invoice Intake
  const [selectedSupplierForAI, setSelectedSupplierForAI] = useState<string>('');
  const [invoiceImageFile, setInvoiceImageFile] = useState<File | null>(null);
  const [invoiceImageBase64, setInvoiceImageBase64] = useState<string | null>(null);
  const [isParsingInvoice, setIsParsingInvoice] = useState(false);
  const [parsedItems, setParsedItems] = useState<ProcessedInvoiceItem[]>([]);
  const [isSubmittingInvoiceItems, setIsSubmittingInvoiceItems] = useState(false);
  const invoiceFileRef = useRef<HTMLInputElement>(null);
  
  // For AI bulk edit
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [bulkEditValues, setBulkEditValues] = useState({
    categoryId: '',
    usage: ProductUsage.PROFESSIONAL,
    isNewProduct: '', // 'new' or 'existing'
  });

  // For category management modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const fetchBaseData = useCallback(async () => {
    if (!selectedStoreId) return;
    setLoading(true); setError(null);
    try {
      const [prods, supps, cats] = await Promise.all([
        apiClient.get('/products', { storeId: selectedStoreId }),
        apiClient.get('/suppliers'),
        apiClient.get('/categories'),
      ]);
      setProducts(prods); setSuppliers(supps); setCategories(cats);
      if (supps && supps.length > 0) {
        setSelectedSupplierForBarcode(current => current || supps[0].id);
        setSelectedSupplierForAI(current => current || supps[0].id);
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
  
  // --- CATEGORY MANAGEMENT LOGIC ---
  const refreshCategories = async () => {
    try {
        const cats = await apiClient.get('/categories');
        setCategories(cats);
    } catch (err) {
        showToast('error', 'カテゴリリストの更新に失敗しました。');
    }
  };

  const handleOpenCategoryModal = (category?: Category | null) => {
      setEditingCategory(category || null); setIsCategoryModalOpen(true);
  };
  const handleCloseCategoryModal = () => {
      setIsCategoryModalOpen(false); setEditingCategory(null);
  };
  
  const handleSaveCategory = async (categoryData: Omit<Category, 'id'> | Category) => {
    try {
        if ('id' in categoryData) {
            await apiClient.put(`/categories/${categoryData.id}`, { ...categoryData });
        } else {
            await apiClient.post('/categories', categoryData);
        }
        showToast('success', `カテゴリ「${categoryData.name}」を保存しました。`);
        await refreshCategories();
        handleCloseCategoryModal();
    } catch (err) {
        showToast('error', `カテゴリの保存に失敗しました: ${(err as Error).message}`);
    }
  };

  const handleDeleteCategory = async () => {
      if (!categoryToDelete) return;
      try {
          await apiClient.delete(`/categories/${categoryToDelete.id}`);
          showToast('success', `カテゴリ「${categoryToDelete.name}」を削除しました。`);
          setParsedItems(prev => prev.map(item => item.categoryId === categoryToDelete.id ? {...item, categoryId: ''} : item)); 
          await refreshCategories();
      } catch (err) {
          showToast('error', `カテゴリの削除に失敗しました: ${(err as Error).message}`);
      } finally {
          setCategoryToDelete(null);
      }
  };

  
  // --- BARCODE INTAKE LOGIC ---
  const handleBarcodeSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!barcodeInput.trim() || !selectedSupplierForBarcode || !selectedStoreId) return;
    
    setIsProcessingBarcode(true);
    try {
        const product: ProductWithStock | undefined = await apiClient.get('/products', { barcode: barcodeInput.trim(), storeId: selectedStoreId });
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
            showToast('error', `バーコードに一致する商品が見つかりません: ${barcodeInput}`);
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
  
   const handleCartKeyDown = (e: React.KeyboardEvent, currentProductId: string, field: 'quantity' | 'costPrice') => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const currentIndex = intakeCart.findIndex(p => p.product.id === currentProductId);
    if (currentIndex > -1 && currentIndex < intakeCart.length - 1) {
        const nextItem = intakeCart[currentIndex + 1];
        const nextInput = document.getElementById(`cart-${field}-${nextItem.product.id}`);
        if (nextInput) {
            nextInput.focus();
            (nextInput as HTMLInputElement).select();
        }
    } else {
        barcodeInputRef.current?.focus();
    }
  };

  const handleCompleteIntake = async () => {
    if (intakeCart.length === 0 || !selectedSupplierForBarcode || !currentUser || !selectedStoreId) {
        showToast('error', '入荷する商品がありません、または店舗が選択されていません。');
        return;
    }
    
    setIsProcessingBarcode(true);
    const itemsToProcess = intakeCart.map(({ product, quantity, costPrice }) => ({
        productId: product.id, quantity, costPrice
    }));
    try {
        const result = await apiClient.post('/intake/batch', {
            items: itemsToProcess, supplierId: selectedSupplierForBarcode, operatorId: currentUser.id, storeId: selectedStoreId
        });

        if (result.success) {
            await apiClient.post('/logs', { action: `${itemsToProcess.length}品目の一括入荷を完了`, userId: currentUser.id });
            showToast('success', '一括入荷が完了し、在庫が更新されました。');
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
      setParsedItems([]); setSelectedItemIds(new Set());
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
      const rawItems = await apiClient.post('/gemini/invoice', { imageBase64: base64Data });
      
      const processed: ProcessedInvoiceItem[] = await Promise.all(rawItems.map(async (raw: RawInvoiceItem, index: number): Promise<ProcessedInvoiceItem> => {
        const rawItemName = raw.itemName.trim();
        let productName = rawItemName;
        let extractedBarcode = '';

        const barcodeMatch = rawItemName.match(/^([0-9-]{6,})\s*(.*)/);
        if (barcodeMatch) {
            extractedBarcode = barcodeMatch[1].replace(/-/g, '');
            productName = barcodeMatch[2].trim();
        }

        let matchedProduct: ProductWithStock | null = null;
        if (extractedBarcode) {
            matchedProduct = products.find(p => p.barcode === extractedBarcode) || null;
        }
        if (!matchedProduct) {
            matchedProduct = products.find(p => p.name.toLowerCase() === productName.toLowerCase()) || null;
        }

        const qty = parseInt(raw.quantity) || 0;
        let price = parseFloat(raw.unitPrice || raw.totalPrice || '0');
        if (raw.totalPrice && !raw.unitPrice && qty > 0) price = parseFloat(raw.totalPrice) / qty;

        return {
          _tempId: `item_${Date.now()}_${index}`, rawItem: raw, matchedProductId: matchedProduct?.id || null,
          isNewProduct: !matchedProduct, productName: matchedProduct?.name || productName,
          barcode: matchedProduct?.barcode || extractedBarcode, categoryId: matchedProduct?.categoryId || '',
          usage: matchedProduct?.usage || ProductUsage.PROFESSIONAL,
          minimumStock: matchedProduct?.minimumStock || 1, quantity: qty,
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
          if (!(updatedItem.productName && updatedItem.barcode && updatedItem.categoryId && updatedItem.usage && updatedItem.quantity >= 0 && updatedItem.pricePerUnit >= 0 && updatedItem.minimumStock >= 0)) {
            updatedItem.status = 'new_details_required';
          } else { updatedItem.status = 'ready'; }
        } else if (updatedItem.matchedProductId) {
           if (!(updatedItem.quantity > 0 && updatedItem.pricePerUnit >= 0)) {
             updatedItem.status = 'matched';
           } else { updatedItem.status = 'ready'; }
        } else if (!updatedItem.isNewProduct && !updatedItem.matchedProductId) {
             updatedItem.status = 'pending';
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
      const result = await apiClient.post('/intake/from-invoice', { items: itemsToSubmit, supplierId: selectedSupplierForAI, userId: currentUser.id, storeId: selectedStoreId });
      
      let modalTitle = '';
      let modalMessage = '';
      if (result.successCount > 0 && result.errorCount === 0) {
        modalTitle = '入荷記録完了';
        modalMessage = `${result.successCount}件のすべての商品を入荷記録し、在庫を更新しました。`;
      } else if (result.successCount > 0 && result.errorCount > 0) {
        modalTitle = '一部入荷記録完了';
        modalMessage = `${result.successCount}件の商品を入荷記録しました。\n${result.errorCount}件はエラーのため記録できませんでした。\nエラー内容: ${result.errors.join(', ')}`;
      } else if (result.errorCount > 0) {
        modalTitle = '入荷記録エラー';
        modalMessage = `すべての商品の入荷記録に失敗しました (${result.errorCount}件)。\nエラー内容: ${result.errors.join(', ')}`;
      }
      
      showResultModal(modalTitle, modalMessage);

      if (result.successCount > 0) {
        await apiClient.post('/logs', { action: `${result.successCount}件の納品書アイテムを登録`, userId: currentUser.id });
        setParsedItems([]); setInvoiceImageFile(null); setInvoiceImageBase64(null);
        setSelectedItemIds(new Set()); if (invoiceFileRef.current) invoiceFileRef.current.value = "";
        fetchBaseData();
      }
    } catch (err) { 
      showToast("error", `入荷記録処理中にエラーが発生しました: ${(err as Error).message}`);
    } finally { setIsSubmittingInvoiceItems(false); }
  };
  
const handleToggleSelection = (itemId: string) => setSelectedItemIds(prev => { const newSet = new Set(prev); if (newSet.has(itemId)) { newSet.delete(itemId); } else { newSet.add(itemId); } return newSet; });
const handleToggleSelectAll = () => setSelectedItemIds(selectedItemIds.size === parsedItems.length ? new Set() : new Set(parsedItems.map(item => item._tempId)));
const handleBulkEditChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const { name, value } = e.target; setBulkEditValues(prev => ({ ...prev, [name]: value })); };

const handleApplyBulkEdit = (field: 'categoryId' | 'usage' | 'isNewProduct') => {
    const valueToApply = bulkEditValues[field];
    if (valueToApply === '' || selectedItemIds.size === 0) return;

    setParsedItems(prev => prev.map(item => {
        if (selectedItemIds.has(item._tempId)) {
            let value: any = valueToApply;
            if (field === 'isNewProduct') {
                value = valueToApply === 'new';
            }
            let updatedItem = { ...item, [field]: value };
            
            // Re-validate status
            if (updatedItem.isNewProduct) {
              if (!(updatedItem.productName && updatedItem.barcode && updatedItem.categoryId && updatedItem.usage && updatedItem.quantity >= 0 && updatedItem.pricePerUnit >= 0 && updatedItem.minimumStock >= 0)) {
                updatedItem.status = 'new_details_required';
              } else { updatedItem.status = 'ready'; }
            } else if (updatedItem.matchedProductId) {
               if (!(updatedItem.quantity > 0 && updatedItem.pricePerUnit >= 0)) {
                 updatedItem.status = 'matched';
               } else { updatedItem.status = 'ready'; }
            } else if (!updatedItem.isNewProduct && !updatedItem.matchedProductId) {
                 updatedItem.status = 'pending';
            }
            return updatedItem;
        }
        return item;
    }));
};

const handleCellKeyDown = (e: React.KeyboardEvent, currentTempId: string, field: keyof ProcessedInvoiceItem) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const currentIndex = parsedItems.findIndex(p => p._tempId === currentTempId);
    if (currentIndex > -1 && currentIndex < parsedItems.length - 1) {
        const nextItem = parsedItems[currentIndex + 1];
        const nextInput = document.getElementById(`${field}-${nextItem._tempId}`);
        if (nextInput) {
            nextInput.focus();
            if (nextInput.tagName.toLowerCase() === 'input') {
                (nextInput as HTMLInputElement).select();
            }
        }
    } else {
        (e.target as HTMLElement).blur();
    }
};

  const getStatusColor = (status: ScheduledIntakeStatus | ProcessedInvoiceItem['status']) => {
    const colorMap: { [key: string]: string } = {
        [ScheduledIntakeStatus.PENDING_APPROVAL]: 'bg-yellow-100 text-yellow-800', [ScheduledIntakeStatus.APPROVED]: 'bg-blue-100 text-blue-800',
        [ScheduledIntakeStatus.RECEIVED]: 'bg-green-100 text-green-800', imported: 'bg-green-100 text-green-800',
        [ScheduledIntakeStatus.MANUAL_CHECK_NEEDED]: 'bg-orange-100 text-orange-800', new_details_required: 'bg-yellow-100 text-yellow-800',
        [ScheduledIntakeStatus.REJECTED]: 'bg-red-100 text-red-800', error_importing: 'bg-red-100 text-red-800',
        matched: 'bg-pink-100 text-pink-800', 
        ready: 'bg-sky-100 text-sky-800', 
        pending: 'bg-gray-100 text-gray-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };
  
  const processedItemTableHeaders: TableHeader<ProcessedInvoiceItem>[] = [
    { key: 'selection', label: <input type="checkbox" name="select-all-checkbox" checked={parsedItems.length > 0 && selectedItemIds.size === parsedItems.length} onChange={handleToggleSelectAll} className="form-checkbox h-4 w-4"/>, render: (item) => <input type="checkbox" id={`select-${item._tempId}`} name={`select-${item._tempId}`} checked={selectedItemIds.has(item._tempId)} onChange={() => handleToggleSelection(item._tempId)} className="form-checkbox h-4 w-4"/> },
    { key: 'rawItem.itemName', label: 'AI抽出名', render: (item) => <span title={item.rawItem.itemName}>{item.rawItem.itemName.substring(0,20)}{item.rawItem.itemName.length > 20 ? '...' : ''}</span>},
    { key: 'productName', label: '商品名', render: (item) => item.isNewProduct ? <input type="text" id={`productName-${item._tempId}`} name={`productName-${item._tempId}`} value={item.productName} onChange={(e) => handleProcessedItemChange(item._tempId, 'productName', e.target.value)} onKeyDown={(e) => handleCellKeyDown(e, item._tempId, 'productName')} className="w-full min-w-[200px] p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700"/> : <select id={`matchedProductId-${item._tempId}`} name={`matchedProductId-${item._tempId}`} value={item.matchedProductId || ''} onChange={(e) => handleProcessedItemChange(item._tempId, 'matchedProductId', e.target.value)} className="w-full min-w-[200px] p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700"><option value="">選択...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>},
    { key: 'barcode', label: 'バーコード', render: (item) => (item.isNewProduct ? <input type="text" id={`barcode-${item._tempId}`} name={`barcode-${item._tempId}`} value={item.barcode} onChange={(e) => handleProcessedItemChange(item._tempId, 'barcode', e.target.value)} onKeyDown={(e) => handleCellKeyDown(e, item._tempId, 'barcode')} className="w-full min-w-[160px] p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700"/> : <span>{products.find(p=>p.id === item.matchedProductId)?.barcode || '-'}</span>)},
    { key: 'categoryId', label: 'カテゴリ', render: (item) => {
        if (!item.isNewProduct) {
            const product = products.find(p => p.id === item.matchedProductId);
            const category = product ? categories.find(c => c.id === product.categoryId) : null;
            return <span>{category?.name || '-'}</span>;
        }
        const selectedCategory = categories.find(c => c.id === item.categoryId);
        return (
            <div className="flex items-center gap-1">
                <select id={`categoryId-${item._tempId}`} name={`categoryId-${item._tempId}`} value={item.categoryId} onChange={(e) => handleProcessedItemChange(item._tempId, 'categoryId', e.target.value)} onKeyDown={(e) => handleCellKeyDown(e, item._tempId, 'categoryId')} className="flex-grow w-full min-w-[200px] p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700">
                    <option value="">選択...</option>
                    {categories.filter(c => c.parentId === null).map(parent => (
                        <optgroup key={parent.id} label={parent.name}>
                        {categories.filter(child => child.parentId === parent.id).map(child => (
                            <option key={child.id} value={child.id}>{child.name}</option>
                        ))}
                        </optgroup>
                    ))}
                </select>
                <div className="flex">
                    <button type="button" onClick={() => handleOpenCategoryModal(null)} className="p-1 text-gray-400 hover:text-green-500" title="新規カテゴリ追加"><PlusCircleIcon className="h-5 w-5"/></button>
                    <button type="button" onClick={() => selectedCategory && handleOpenCategoryModal(selectedCategory)} disabled={!selectedCategory} className="p-1 text-gray-400 hover:text-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed" title="選択したカテゴリを編集"><PencilIcon className="h-5 w-5"/></button>
                    <button type="button" onClick={() => selectedCategory && setCategoryToDelete(selectedCategory)} disabled={!selectedCategory} className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed" title="選択したカテゴリを削除"><TrashIcon className="h-5 w-5"/></button>
                </div>
            </div>
        );
    }},
     { key: 'usage', label: '用途', render: (item) => {
        if (!item.isNewProduct) {
            const product = products.find(p => p.id === item.matchedProductId);
            return <span>{product?.usage || '-'}</span>;
        }
        return (
            <select id={`usage-${item._tempId}`} name={`usage-${item._tempId}`} value={item.usage} onChange={(e) => handleProcessedItemChange(item._tempId, 'usage', e.target.value)} onKeyDown={(e) => handleCellKeyDown(e, item._tempId, 'usage')} className="w-full min-w-[100px] p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700">
                <option value={ProductUsage.PROFESSIONAL}>{ProductUsage.PROFESSIONAL}</option>
                <option value={ProductUsage.RETAIL}>{ProductUsage.RETAIL}</option>
            </select>
        );
    }},
    { key: 'quantity', label: '数量', render: (item) => <input type="number" id={`quantity-${item._tempId}`} name={`quantity-${item._tempId}`} value={item.quantity} onChange={(e) => handleProcessedItemChange(item._tempId, 'quantity', parseInt(e.target.value))} onKeyDown={(e) => handleCellKeyDown(e, item._tempId, 'quantity')} className="w-20 p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700" />},
    { key: 'pricePerUnit', label: '入荷単価', render: (item) => <input type="number" id={`pricePerUnit-${item._tempId}`} name={`pricePerUnit-${item._tempId}`} value={item.pricePerUnit} onChange={(e) => handleProcessedItemChange(item._tempId, 'pricePerUnit', parseFloat(e.target.value))} onKeyDown={(e) => handleCellKeyDown(e, item._tempId, 'pricePerUnit')} className="w-24 p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700" />},
    { key: 'minimumStock', label: '最低在庫', render: (item) => (item.isNewProduct ? <input type="number" id={`minimumStock-${item._tempId}`} name={`minimumStock-${item._tempId}`} value={item.minimumStock} onChange={(e) => handleProcessedItemChange(item._tempId, 'minimumStock', parseInt(e.target.value))} onKeyDown={(e) => handleCellKeyDown(e, item._tempId, 'minimumStock')} className="w-20 p-1 border rounded-md text-sm bg-slate-900 text-white border-slate-700" /> : <span>{products.find(p=>p.id === item.matchedProductId)?.minimumStock || '-'}</span>)},
    { key: 'status', label: '状態', render: (item) => <span className={`px-2 py-0.5 inline-flex text-sm font-semibold rounded-full ${getStatusColor(item.status)}`}>{getStatusText(item.status)}</span>},
  ];

  if (loading) return <div className="p-8"><LoadingSpinner message={UI_TEXT.LOADING} /></div>;

  const totalCartValue = intakeCart.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);

  if (isAdmin && selectedStoreId === 'all') {
    return (
        <div className="p-6 bg-yellow-50 text-yellow-800 rounded-lg shadow-md flex items-center gap-4">
            <ExclamationTriangleIcon className="h-10 w-10 text-yellow-500" />
            <div>
                <h3 className="font-bold">店舗を選択してください</h3>
                <p>AI納品書登録やバーコード入荷を行うには、ヘッダーのドロップダウンから特定の店舗を選択してください。</p>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && <div className="p-3 my-2 bg-red-100 text-red-700 rounded-md flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5"/>{error}</div>}
      {successMessage && !isResultModalOpen && <div className="p-3 my-2 bg-green-100 text-green-700 rounded-md flex items-center gap-2"><CheckCircleIcon className="h-5 w-5"/>{successMessage}</div>}

      <details className="bg-white p-6 rounded-lg shadow-md group" open>
        <summary className="text-xl font-semibold text-gray-700 cursor-pointer list-none flex justify-between items-center">
          <span className="flex items-center">
            AI納品書一括登録 (新規・既存商品対応)
            <div className="relative group ml-2">
                <InformationCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                    紙の納品書を撮影・アップロードするだけでAIが内容を読み取ります。手入力の手間を大幅に削減でき、新規商品もその場で登録可能です。
                </div>
            </div>
          </span>
          <ChevronDownIcon className="h-6 w-6 transform group-open:rotate-180 transition-transform" />
        </summary>
        <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="supplier-select-ai" className="block text-sm font-medium text-gray-700 mb-1">担当仕入先:</label>
              <select id="supplier-select-ai" name="supplier-select-ai" value={selectedSupplierForAI} onChange={(e) => {setSelectedSupplierForAI(e.target.value); setParsedItems([]); setInvoiceImageFile(null); setSelectedItemIds(new Set());}} className="w-full md:w-1/2 p-2 border rounded-md shadow-sm bg-slate-900 text-white border-slate-700 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">仕入先を選択...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="invoice-image" className="block text-sm font-medium text-gray-700 mb-1">納品書画像:</label>
              <input ref={invoiceFileRef} type="file" id="invoice-image" name="invoice-image" accept="image/*" onChange={handleImageFileChange} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
            </div>
            {invoiceImageBase64 && <div className="my-2"><img src={invoiceImageBase64} alt="Invoice preview" className="max-h-40 border rounded-md"/></div>}
            <button onClick={handleParseInvoice} disabled={!selectedSupplierForAI || !invoiceImageBase64 || isParsingInvoice || isSubmittingInvoiceItems} className="flex items-center justify-center w-full md:w-auto px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm disabled:opacity-50">{isParsingInvoice ? <LoadingSpinner size="sm" /> : <SparklesIcon className="h-5 w-5 mr-2" />}画像を解析 (AI)</button>
            {parsedItems.length > 0 && (
            <div className="mt-4 space-y-4">
                <h3 className="text-lg font-medium">解析結果 ({parsedItems.length}件)</h3>
                
                <div className="p-4 bg-slate-800 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <InformationCircleIcon className="h-5 w-5" />
                        <p>下のチェックボックスで商品を選択し、一括でカテゴリや用途を設定できます。</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="flex-grow">
                            <label htmlFor="bulk-category" className="text-sm font-medium text-slate-300 block mb-1">カテゴリ一括設定:</label>
                            <div className="flex gap-2">
                                <select 
                                    id="bulk-category" 
                                    name="categoryId" 
                                    value={bulkEditValues.categoryId}
                                    onChange={handleBulkEditChange}
                                    className="w-full p-2 border rounded-md text-sm bg-slate-900 text-white border-slate-700"
                                >
                                    <option value="">カテゴリを選択...</option>
                                    {categories.filter(c => c.parentId === null).map(parent => (
                                        <optgroup key={parent.id} label={parent.name}>
                                        {categories.filter(child => child.parentId === parent.id).map(child => (
                                            <option key={child.id} value={child.id}>{child.name}</option>
                                        ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <button onClick={() => handleApplyBulkEdit('categoryId')} disabled={selectedItemIds.size === 0 || !bulkEditValues.categoryId} className="px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm disabled:opacity-50 hover:bg-indigo-700">適用</button>
                            </div>
                        </div>

                        <div className="flex-grow">
                            <label htmlFor="bulk-usage" className="text-sm font-medium text-slate-300 block mb-1">用途一括設定:</label>
                            <div className="flex gap-2">
                                <select 
                                    id="bulk-usage" 
                                    name="usage" 
                                    value={bulkEditValues.usage}
                                    onChange={handleBulkEditChange}
                                    className="w-full p-2 border rounded-md text-sm bg-slate-900 text-white border-slate-700"
                                >
                                    <option value={ProductUsage.PROFESSIONAL}>{ProductUsage.PROFESSIONAL}</option>
                                    <option value={ProductUsage.RETAIL}>{ProductUsage.RETAIL}</option>
                                </select>
                                <button onClick={() => handleApplyBulkEdit('usage')} disabled={selectedItemIds.size === 0} className="px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm disabled:opacity-50 hover:bg-indigo-700">適用</button>
                            </div>
                        </div>
                         <div className="flex-grow">
                            <label htmlFor="bulk-isNew" className="text-sm font-medium text-slate-300 block mb-1">新規/既存 一括設定:</label>
                            <div className="flex gap-2">
                                <select 
                                    id="bulk-isNew" 
                                    name="isNewProduct" 
                                    value={bulkEditValues.isNewProduct}
                                    onChange={handleBulkEditChange}
                                    className="w-full p-2 border rounded-md text-sm bg-slate-900 text-white border-slate-700"
                                >
                                    <option value="">選択...</option>
                                    <option value="new">新規商品</option>
                                    <option value="existing">既存商品</option>
                                </select>
                                <button onClick={() => handleApplyBulkEdit('isNewProduct')} disabled={selectedItemIds.size === 0 || !bulkEditValues.isNewProduct} className="px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm disabled:opacity-50 hover:bg-indigo-700">適用</button>
                            </div>
                        </div>
                    </div>
                </div>

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
            バーコードによる一括入荷
            <div className="relative group ml-2">
                <InformationCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                    ハンディスキャナ等でバーコードを連続で読み取ることで、迅速に入荷リストを作成します。定期的な入荷作業に最適です。
                </div>
            </div>
          </span>
          <ChevronDownIcon className="h-6 w-6 transform group-open:rotate-180 transition-transform" />
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                  <label htmlFor="supplier-select-barcode" className="block text-sm font-medium text-gray-700 mb-1">仕入先:</label>
                  <select id="supplier-select-barcode" name="supplier-select-barcode" value={selectedSupplierForBarcode} onChange={(e) => {setSelectedSupplierForBarcode(e.target.value); setIntakeCart([])}} className="w-full p-2 border rounded-md shadow-sm bg-slate-900 text-white border-slate-700 focus:ring-indigo-500 focus:border-indigo-500">
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
              </div>
              <form onSubmit={handleBarcodeSubmit}>
                  <label htmlFor="barcode-input" className="block text-sm font-medium text-gray-700 mb-1">バーコードスキャン:</label>
                  <div className="flex items-center space-x-2">
                      <input ref={barcodeInputRef} type="text" id="barcode-input" name="barcode-input" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} placeholder="バーコードをスキャンまたは入力してEnter" disabled={!selectedSupplierForBarcode || isProcessingBarcode} className="flex-grow p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"/>
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
                                  <label htmlFor={`cart-qty-${item.product.id}`} className="text-sm text-gray-900">数量:</label>
                                  <input type="number" id={`cart-qty-${item.product.id}`} name={`cart-qty-${item.product.id}`} value={item.quantity} onChange={(e) => handleCartItemChange(item.product.id, 'quantity', parseInt(e.target.value))} onFocus={(e) => e.target.select()} onKeyDown={e => handleCartKeyDown(e, item.product.id, 'quantity')} className="w-16 text-center border-gray-300 rounded-md py-1 bg-slate-100 text-gray-800"/>
                              </div>
                              <div className="flex items-center gap-2">
                                  <label htmlFor={`cart-cost-${item.product.id}`} className="text-sm text-gray-900">入荷単価:</label>
                                  <input type="number" id={`cart-cost-${item.product.id}`} name={`cart-cost-${item.product.id}`} value={item.costPrice} onChange={(e) => handleCartItemChange(item.product.id, 'costPrice', parseFloat(e.target.value))} onFocus={(e) => e.target.select()} onKeyDown={e => handleCartKeyDown(e, item.product.id, 'costPrice')} className="w-24 text-center border-gray-300 rounded-md py-1 bg-slate-100 text-gray-800"/>
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
              <p className="text-gray-500 text-center py-4">スキャンした商品がここに追加されます。</p>
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

      {isCategoryModalOpen && (
        <Modal isOpen={isCategoryModalOpen} onClose={handleCloseCategoryModal} title={editingCategory ? 'カテゴリ編集' : '新規カテゴリ追加'}>
            <CategoryManagementForm 
            category={editingCategory}
            allCategories={categories}
            onSave={handleSaveCategory}
            onCancel={handleCloseCategoryModal}
            />
        </Modal>
      )}
      
      {categoryToDelete && (
          <Modal isOpen={!!categoryToDelete} onClose={() => setCategoryToDelete(null)} title="カテゴリ削除の確認">
            <p className="text-gray-700 mb-2">カテゴリ「{categoryToDelete.name}」を本当に削除しますか？</p>
            <p className="text-sm text-red-600">この操作は元に戻せません。このカテゴリを使用している商品がある場合、問題が発生する可能性があります。</p>
            <div className="flex justify-end space-x-3 mt-6">
                <button onClick={() => setCategoryToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm">キャンセル</button>
                <button onClick={handleDeleteCategory} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 border border-transparent rounded-md shadow-sm">削除</button>
            </div>
          </Modal>
      )}

    </div>
  );
};


//=============================================================================
// 2. Purchase Management Tab Component (Replaces PurchaseListTab)
//=============================================================================
const PurchaseManagementTab: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedStoreId } = useStore();
  const { purchaseListItems, createPurchaseOrderFromCart, removeFromPurchaseList, updateQuantity, createAllPurchaseOrdersForDate } = usePurchaseList();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [allIntakeItems, setAllIntakeItems] = useState<ScheduledIntakeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<string | null>(null); // supplierId
  const [isSubmittingAll, setIsSubmittingAll] = useState<string | null>(null); // date
  const [isProcessingReceipt, setIsProcessingReceipt] = useState<string | null>(null); // po.id

  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [expandedPOId, setExpandedPOId] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<Map<string, {checked: boolean, quantity: number}>>(new Map());
  const [highlightedPOId, setHighlightedPOId] = useState<string | null>(null);
  const [viewingPOId, setViewingPOId] = useState<string | null>(null); // For preview modal
  
  const [isItemEditModalOpen, setIsItemEditModalOpen] = useState(false);
  const [editingScheduledItem, setEditingScheduledItem] = useState<ScheduledIntakeItem | null>(null);

  const fetchPageData = useCallback(async () => {
    if (!selectedStoreId) return;
    try {
      const [supps, poData, intakeData] = await Promise.all([
        apiClient.get('/suppliers'), 
        apiClient.get('/purchase-orders', { storeId: selectedStoreId }),
        apiClient.get('/intake-items', { storeId: selectedStoreId })
      ]);
      setSuppliers(supps);
      setPurchaseOrders(poData);
      setAllIntakeItems(intakeData);
    } catch (err) { showToast('error', "データの読み込みに失敗しました。"); console.error(err); }
    finally { setLoading(false); }
  }, [selectedStoreId]);

  useEffect(() => { 
    setLoading(true);
    fetchPageData(); 
  }, [fetchPageData]);
  
  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };
  
  const handleOpenItemEditModal = (item: ScheduledIntakeItem) => {
    setEditingScheduledItem(item);
    setIsItemEditModalOpen(true);
  };
  const handleCloseItemEditModal = () => {
    setEditingScheduledItem(null);
    setIsItemEditModalOpen(false);
  };
  const handleSaveScheduledItem = async (updatedItem: ScheduledIntakeItem) => {
    try {
        await apiClient.put(`/intake-items/${updatedItem.id}`, updatedItem);
        showToast('success', '入荷予定を更新しました。');
        fetchPageData(); // Refresh list
        handleCloseItemEditModal();
    } catch (err) {
        showToast('error', `更新に失敗しました: ${(err as Error).message}`);
    }
  };

  const handleCreateOrder = async (supplierId: string, date: string) => {
    if (!currentUser || !selectedStoreId) return;
    
    setIsSubmittingOrder(supplierId);
    try {
      const newOrder = await createPurchaseOrderFromCart(supplierId, currentUser.id, date, selectedStoreId);
      showToast('success', `仕入先「${suppliers.find(s => s.id === supplierId)?.name}」への発注書を作成しました。`);
      setHighlightedPOId(newOrder.id);
      fetchPageData(); // Refresh PO list
      setExpandedDate(null);
      setTimeout(() => setHighlightedPOId(null), 3000);
    } catch (err) {
      showToast('error', `発注書の作成に失敗しました: ${(err as Error).message}`);
    } finally {
      setIsSubmittingOrder(null);
    }
  };
  
  const handleCreateAllOrders = async (date: string) => {
    if (!currentUser || !selectedStoreId) return;
    setIsSubmittingAll(date);
    try {
        await createAllPurchaseOrdersForDate(currentUser.id, date, selectedStoreId);
        showToast('success', `${date}の全カートアイテムについて発注書を作成しました。`);
        fetchPageData();
        setExpandedDate(null);
    } catch (err) {
        showToast('error', `一括発注に失敗しました: ${(err as Error).message}`);
    } finally {
        setIsSubmittingAll(null);
    }
  };

  const handleTogglePO = (poId: string) => {
    if (expandedPOId === poId) {
      setExpandedPOId(null);
      setReceiptItems(new Map());
    } else {
      const po = purchaseOrders.find(p => p.id === poId);
      if (po) {
        const initialItems = new Map(po.items.map(item => [item.productId, { checked: !item.isReceived, quantity: item.quantity }]));
        setReceiptItems(initialItems);
        setExpandedPOId(poId);
      }
    }
  };

  const handlePreviewClick = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setViewingPOId(orderId);
  };
  
  const handleReceiptItemChange = (productId: string, field: 'checked' | 'quantity', value: boolean | number) => {
    setReceiptItems(prev => {
      const newMap = new Map(prev);
      const currentItem = newMap.get(productId);
      if (currentItem) {
        newMap.set(productId, { ...currentItem, [field]: value });
      }
      return newMap;
    });
  };

  const handleProcessReceipt = async (po: PurchaseOrder) => {
    if (!currentUser) return;
    setIsProcessingReceipt(po.id);
    
    const receivedItems = Array.from(receiptItems.entries())
      .filter(([productId, data]) => data.checked && po.items.find(i => i.productId === productId && !i.isReceived))
      .map(([productId, data]) => ({ productId, quantity: data.quantity }));

    if (receivedItems.length === 0) {
      showToast('error', '入荷記録する未処理の商品が選択されていません。');
      setIsProcessingReceipt(null);
      return;
    }

    try {
      const result = await apiClient.post(`/purchase-orders/${po.id}/receipt`, { receivedItems, userId: currentUser.id });
      const receivedCount = receivedItems.length;
      let msg = `${receivedCount}件の商品を入荷記録しました。`;

      if (result.updatedStatus === PurchaseOrderStatus.COMPLETED) {
        msg += " この発注書のすべての商品が入荷完了しました。";
      } else {
        msg += " この発注書は「一部入荷済み」として更新されました。";
      }
      
      showToast('success', msg);
      setExpandedPOId(null);
      fetchPageData();
    } catch (err) {
      showToast('error', `入荷処理に失敗しました: ${(err as Error).message}`);
    } finally {
      setIsProcessingReceipt(null);
    }
  };
  
  const groupedByDate = useMemo(() => {
    return purchaseListItems.reduce<Record<string, PLItemFromContext[]>>((acc, item) => {
      const date = item.addedAt;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(item);
      return acc;
    }, {});
  }, [purchaseListItems]);

  const sortedDates = useMemo(() => Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a)), [groupedByDate]);
  const pendingPOs = useMemo(() => purchaseOrders.filter(p => p.status === PurchaseOrderStatus.ORDERED || p.status === PurchaseOrderStatus.PARTIALLY_RECEIVED), [purchaseOrders]);
  const otherScheduledItems = useMemo(() => {
    return allIntakeItems.filter(item => 
        item.status === ScheduledIntakeStatus.PENDING_APPROVAL || 
        item.status === ScheduledIntakeStatus.APPROVED ||
        item.status === ScheduledIntakeStatus.MANUAL_CHECK_NEEDED
      ).sort((a, b) => (a.estimatedArrivalDate || '').localeCompare(b.estimatedArrivalDate || ''));
  }, [allIntakeItems]);


  if (loading) return <LoadingSpinner message="仕入先と発注情報を読み込み中..." />;

  const getStatusChip = (status: PurchaseOrderStatus | ScheduledIntakeStatus) => {
    switch(status) {
      case PurchaseOrderStatus.ORDERED:
        return <span className="text-sm font-medium text-blue-800 bg-blue-100 px-2 py-1 rounded-full">発注済み</span>;
      case PurchaseOrderStatus.PARTIALLY_RECEIVED:
        return <span className="text-sm font-medium text-purple-800 bg-purple-100 px-2 py-1 rounded-full">一部入荷済み</span>;
      case ScheduledIntakeStatus.APPROVED:
        return <span className="text-sm font-medium text-sky-800 bg-sky-100 px-2 py-1 rounded-full">承認済み</span>;
      case ScheduledIntakeStatus.PENDING_APPROVAL:
        return <span className="text-sm font-medium text-yellow-800 bg-yellow-100 px-2 py-1 rounded-full">承認待ち</span>;
      case ScheduledIntakeStatus.MANUAL_CHECK_NEEDED:
        return <span className="text-sm font-medium text-orange-800 bg-orange-100 px-2 py-1 rounded-full">要手動確認</span>;
      default:
        return null;
    }
  }
  
  return (
    <div className="space-y-8 relative">
       {toast && (
        <div className={`fixed top-24 right-5 p-4 rounded-lg shadow-xl z-50 animate-fadeInOut flex items-center gap-3 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
           {toast.type === 'success' ? <CheckCircleIcon className="h-6 w-6"/> : <ExclamationTriangleIcon className="h-6 w-6"/>}
          <span>{toast.text}</span>
        </div>
      )}
       <style>{`
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; transform: translateY(-20px); }
          10%, 90% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInOut { animation: fadeInOut 5s ease-in-out; }
      `}</style>
      {/* 1. Create Purchase Order Section */}
      <div className="bg-sky-50 border-2 border-sky-300 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
        <h2 className="text-2xl font-bold text-sky-800 mb-4 flex items-center gap-3">
            <PlusCircleIcon className="h-7 w-7 text-sky-600" />
            <span>新規発注書の作成</span>
             <div className="relative group">
                <InformationCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                    在庫管理ページで「仕入れリストに追加」した商品がここに表示されます。リストから正式な発注書を作成できます。
                </div>
            </div>
        </h2>
        {purchaseListItems.length > 0 ? (
          <div className="space-y-3">
            {sortedDates.map(date => {
              const itemsForDate = groupedByDate[date];
              const isExpanded = expandedDate === date;
              const groupedBySupplier = itemsForDate.reduce<Record<string, PLItemFromContext[]>>((acc, item) => {
                const supplierId = item.supplierId;
                if (!acc[supplierId]) acc[supplierId] = [];
                acc[supplierId].push(item);
                return acc;
              }, {});

              return (
                <div key={date} className="border border-gray-200 rounded-lg bg-white">
                  <button onClick={() => setExpandedDate(isExpanded ? null : date)} className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 focus:outline-none">
                    <div className="font-semibold text-lg flex items-center text-gray-700">
                      <CalendarDaysIcon className="h-6 w-6 mr-3 text-gray-500"/>
                      作成日: {date}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">{itemsForDate.length} 品目</span>
                      <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 border-t border-gray-200 space-y-6 bg-white">
                      <div className="flex justify-end">
                        <button onClick={() => handleCreateAllOrders(date)} disabled={isSubmittingAll === date} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50 flex items-center justify-center">
                            {isSubmittingAll === date ? <LoadingSpinner size="sm"/> : 'この日付の全リストで一括発注書を作成'}
                        </button>
                      </div>

                      {Object.keys(groupedBySupplier).map(supplierId => {
                        const supplierCart = groupedBySupplier[supplierId];
                        const supplier = suppliers.find(s => s.id === supplierId);
                        if (!supplier) return null;
                        const total = supplierCart.reduce((sum, item) => sum + (item.product.costPrice * item.quantity), 0);
                        
                        return (
                          <div key={supplierId} className="border border-gray-100 rounded-md p-4 bg-gray-50/50 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                              <h3 className="font-semibold text-lg text-gray-700 mb-2 sm:mb-0">{supplier.name}</h3>
                              <button onClick={() => handleCreateOrder(supplierId, date)} disabled={isSubmittingOrder === supplierId || supplierCart.every(item => item.quantity <= 0)} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50 flex items-center justify-center w-full sm:w-auto">
                                {isSubmittingOrder === supplierId ? <LoadingSpinner size="sm"/> : 'この内容で発注書を作成'}
                              </button>
                            </div>
                            <ul className="divide-y divide-gray-200">
                              {supplierCart.map(item => (
                                <li key={item.product.id} className="flex items-center justify-between py-3 text-sm">
                                  <span className="pr-2 text-gray-800 font-medium">{item.product.name}</span>
                                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                                    <input type="number" id={`pli-qty-${item.product.id}-${date}`} name={`pli-qty-${item.product.id}-${date}`} value={item.quantity || ''} onChange={e => updateQuantity(item.product.id, parseInt(e.target.value) || 0, date)} onFocus={e => e.target.select()} className="w-16 text-center border-gray-300 rounded-md py-1 bg-slate-100 text-gray-800"/>
                                    <span className="w-24 text-right text-gray-700">¥{(item.product.costPrice * item.quantity).toLocaleString()}</span>
                                    <button onClick={() => removeFromPurchaseList(item.product.id, date)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4"/></button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                            <p className="text-right font-semibold mt-2 text-gray-800">合計: ¥{total.toLocaleString()}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <ShoppingCartIcon className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p>仕入れリストは空です。</p>
            <p className="text-sm">在庫管理ページから商品を追加してください。</p>
          </div>
        )}
      </div>

      {/* 2. Pending Purchase Orders Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center"><CalendarDaysIcon className="h-6 w-6 mr-2 text-yellow-500" />入荷待ちの発注書</h2>
        {pendingPOs.length > 0 ? (
          <div className="space-y-3">
            {pendingPOs.map(po => (
              <div key={po.id} className={`border border-gray-200 rounded-lg transition-all duration-500 ${highlightedPOId === po.id ? 'bg-yellow-100 ring-2 ring-yellow-400' : ''}`}>
                <div className="w-full flex justify-between items-center p-4 text-left cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleTogglePO(po.id)}>
                  <div className="font-semibold text-gray-800">{po.supplierName} - 発注日: {po.orderDate}</div>
                  <div className="flex items-center gap-4">
                    <button onClick={(e) => handlePreviewClick(e, po.id)} className="p-1.5 text-gray-500 hover:text-gray-800" title="プレビュー"><EyeIcon className="h-5 w-5"/></button>
                    {getStatusChip(po.status)}
                    <span className="text-sm text-gray-500">{po.items.length}品目</span>
                    <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${expandedPOId === po.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {expandedPOId === po.id && (
                  <div className="p-4 border-t border-gray-200">
                    <div className="p-3 mb-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 text-sm rounded-r-md">入荷した商品にチェックを入れてください。遅延する商品はチェックを外したままにすると、この発注書は「一部入荷済み」として残り、次回以降で入荷処理できます。</div>
                    <ul className="divide-y divide-gray-200">
                       {po.items.map(item => (
                         <li key={item.productId} className={`flex flex-col md:flex-row gap-y-2 gap-x-4 items-start md:items-center py-4 px-2 ${item.isReceived ? 'opacity-60 bg-gray-100 rounded-md' : ''}`}>
                            <div className="w-full md:w-1/12 flex items-center gap-3">
                              <input type="checkbox" id={`receipt-check-${item.productId}`} name={`receipt-check-${item.productId}`} checked={receiptItems.get(item.productId)?.checked || false} onChange={e => handleReceiptItemChange(item.productId, 'checked', e.target.checked)} className="h-5 w-5 rounded form-checkbox text-indigo-600 focus:ring-indigo-500" disabled={item.isReceived} />
                              {item.isReceived && <span className="text-sm font-bold text-green-600">入荷済</span>}
                            </div>
                           <div className="w-full md:w-5/12 font-medium text-gray-800">{item.productName} <span className="text-sm text-gray-500">({item.barcode})</span></div>
                           <div className="w-full md:w-2/12 text-sm text-gray-600">発注数: {item.quantity}</div>
                           <div className="w-full md:w-2/12 flex items-center gap-2">
                             <label htmlFor={`qty-${item.productId}`} className="text-sm text-gray-600">入荷数:</label>
                             <input id={`qty-${item.productId}`} name={`qty-${item.productId}`} type="number" value={receiptItems.get(item.productId)?.quantity || 0} onChange={e => handleReceiptItemChange(item.productId, 'quantity', parseInt(e.target.value))} className="w-20 text-center border-gray-300 rounded-md py-1 bg-slate-100 text-gray-800" disabled={item.isReceived || !receiptItems.get(item.productId)?.checked} />
                           </div>
                           <div className="w-full md:w-2/12 text-sm text-gray-600 md:text-right">単価: ¥{item.costPriceAtOrder.toLocaleString()}</div>
                         </li>
                      ))}
                    </ul>
                    <div className="flex justify-end mt-4">
                       <button onClick={() => handleProcessReceipt(po)} disabled={isProcessingReceipt === po.id} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50 flex items-center">
                        {isProcessingReceipt === po.id ? <LoadingSpinner size="sm"/> : <><InboxArrowDownIcon className="h-5 w-5 mr-2"/>選択した商品の入荷を記録</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-6 text-gray-500">入荷待ちの発注書はありません。</p>
        )}
      </div>
      
       {/* 3. All Pending Intakes (Moved from IntakeProcessingTab) */}
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <DocumentMagnifyingGlassIcon className="h-6 w-6 mr-2 text-indigo-500" />
                その他の入荷予定 (全仕入先)
            </h2>
             {otherScheduledItems.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                    <ul className="divide-y divide-gray-200">
                        {otherScheduledItems.map(item => (
                            <li key={item.id} className="p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                <div className="flex-1 mb-2 sm:mb-0">
                                    <p className="font-semibold text-gray-800">{item.productName}</p>
                                    <p className="text-sm text-gray-500">{item.supplierName}</p>
                                </div>
                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                                    <span className="text-sm">予定日: {item.estimatedArrivalDate ? new Date(item.estimatedArrivalDate).toLocaleDateString() : '未定'}</span>
                                    {getStatusChip(item.status)}
                                    <button onClick={() => handleOpenItemEditModal(item)} className="p-1 text-gray-400 hover:text-gray-600"><PencilIcon className="h-5 w-5"/></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p className="text-center py-6 text-gray-500">現在、その他の入荷予定はありません。</p>
            )}
        </div>

      {viewingPOId && <PurchaseOrderPreviewModal orderId={viewingPOId} onClose={() => setViewingPOId(null)} />}
      {isItemEditModalOpen && editingScheduledItem && (
        <Modal isOpen={isItemEditModalOpen} onClose={handleCloseItemEditModal} title="入荷予定の編集">
            <ScheduledItemEditForm
                item={editingScheduledItem}
                onSave={handleSaveScheduledItem}
                onCancel={handleCloseItemEditModal}
            />
        </Modal>
      )}
    </div>
  );
};

//=============================================================================
// 3. Purchase Order List Tab (New)
//=============================================================================
const PurchaseOrderListTab: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingPOId, setViewingPOId] = useState<string | null>(null); // For preview modal
  const { selectedStoreId } = useStore();
  
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  
  const years = useMemo(() => {
    if (purchaseOrders.length === 0) return [];
    const poYears = new Set(purchaseOrders.map(po => new Date(po.orderDate).getFullYear()));
    return Array.from(poYears).sort((a,b) => b-a);
  }, [purchaseOrders]);

  useEffect(() => {
    const fetchPOs = async () => {
      if(!selectedStoreId) return;
      setLoading(true);
      try {
        let poData: PurchaseOrder[] = await apiClient.get('/purchase-orders', { storeId: selectedStoreId });
        poData.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
        setPurchaseOrders(poData);
      } catch (err) {
        setError("発注書履歴の読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    fetchPOs();
  }, [selectedStoreId]);
  
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => {
      const orderDate = new Date(po.orderDate);
      const yearMatch = !filterYear || orderDate.getFullYear().toString() === filterYear;
      const monthMatch = !filterMonth || (orderDate.getMonth() + 1).toString() === filterMonth;
      return yearMatch && monthMatch;
    });
  }, [purchaseOrders, filterYear, filterMonth]);
  
  const getStatusChip = (status: PurchaseOrderStatus) => {
    switch (status) {
      case PurchaseOrderStatus.ORDERED:
        return <span className="text-sm font-medium text-blue-800 bg-blue-100 px-2 py-1 rounded-full">発注済み</span>;
      case PurchaseOrderStatus.PARTIALLY_RECEIVED:
        return <span className="text-sm font-medium text-purple-800 bg-purple-100 px-2 py-1 rounded-full">一部入荷済み</span>;
      case PurchaseOrderStatus.COMPLETED:
        return <span className="text-sm font-medium text-green-800 bg-green-100 px-2 py-1 rounded-full">入荷処理完了</span>;
      case PurchaseOrderStatus.CANCELLED:
         return <span className="text-sm font-medium text-gray-800 bg-gray-200 px-2 py-1 rounded-full">キャンセル</span>;
      default:
        return null;
    }
  };

  const handlePreviewClick = (orderId: string) => {
    setViewingPOId(orderId);
  };

  if (loading) return <div className="p-8"><LoadingSpinner message="発注書を読み込んでいます..." /></div>;
  if (error) return <div className="p-3 my-4 bg-red-100 text-red-700 rounded-md flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5"/>{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-800">発注書履歴</h2>
        <div className="flex items-center gap-2">
          <select id="po-filter-year" name="po-filter-year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="p-2 border rounded-md bg-slate-900 text-white border-slate-700">
            <option value="">全ての年</option>
            {years.map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select id="po-filter-month" name="po-filter-month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="p-2 border rounded-md bg-slate-900 text-white border-slate-700">
            <option value="">全ての月</option>
            {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
          </select>
        </div>
      </div>
      {filteredPOs.length > 0 ? (
        <div className="space-y-4">
          {filteredPOs.map(po => {
            const totalAmount = po.items.reduce((sum, item) => sum + item.costPriceAtOrder * item.quantity, 0);
            return (
              <div key={po.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div className="mb-2 sm:mb-0">
                    <p className="font-semibold text-lg text-gray-800">{po.supplierName}</p>
                    <p className="text-sm text-gray-500">発注日: {new Date(po.orderDate).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                     <div className="flex flex-col items-end">
                        {getStatusChip(po.status)}
                        <p className="text-sm text-gray-600 mt-1">合計: ¥{totalAmount.toLocaleString()}</p>
                     </div>
                    <button
                      onClick={() => handlePreviewClick(po.id)}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                    >
                      <EyeIcon className="h-5 w-5" />
                      プレビュー
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center py-6 text-gray-500">条件に一致する発注書はありません。</p>
      )}
       {viewingPOId && <PurchaseOrderPreviewModal orderId={viewingPOId} onClose={() => setViewingPOId(null)} />}
    </div>
  );
};


//=============================================================================
// 4. Supplier Management Tab Component
//=============================================================================
const initialSupplierFormState: Omit<Supplier, 'id'> = { name: '', contactPerson: '', phone: '', email: '', address: '', lineId: '' };

const SupplierForm: React.FC<{ supplier?: Supplier | null; onSave: (supplier: Supplier | Omit<Supplier, 'id'>) => void; onCancel: () => void; }> = ({ supplier, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Supplier | Omit<Supplier, 'id'>>(supplier ? { ...initialSupplierFormState, ...supplier } : initialSupplierFormState);
  useEffect(() => { setFormData(supplier ? { ...initialSupplierFormState, ...supplier } : initialSupplierFormState); }, [supplier]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label htmlFor="name" className="block text-sm">仕入先名</label><input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/></div>
      <div><label htmlFor="contactPerson" className="block text-sm">担当者名</label><input type="text" name="contactPerson" id="contactPerson" value={formData.contactPerson || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/></div>
      <div><label htmlFor="phone" className="block text-sm">電話番号</label><input type="tel" name="phone" id="phone" value={formData.phone || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/></div>
      <div><label htmlFor="email" className="block text-sm">メール</label><input type="email" name="email" id="email" value={formData.email || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/></div>
      <div><label htmlFor="address" className="block text-sm">住所</label><input type="text" name="address" id="address" value={formData.address || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/></div>
      <div><label htmlFor="lineId" className="block text-sm">LINE ID</label><input type="text" name="lineId" id="lineId" value={formData.lineId || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/></div>
      <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-gray-100 border border-gray-300 rounded-md">{UI_TEXT.CANCEL}</button><button type="submit" className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md">{UI_TEXT.SAVE}</button></div>
    </form>
  );
};

const SupplierManagementTab: React.FC = () => {
  const { currentUser } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<Supplier | null>(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true); setError(null);
    try { const data = await apiClient.get('/suppliers'); setSuppliers(data); } 
    catch (err) { setError(UI_TEXT.ERROR_LOADING_DATA); console.error(err); } 
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleOpenModal = (supplier?: Supplier | null) => {
    setEditingSupplier(supplier || null);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingSupplier(null); };

  const handleSaveSupplier = async (supplierData: Supplier | Omit<Supplier, 'id'>) => {
    setLoading(true);
    try {
      if ('id' in supplierData) { 
        await apiClient.put(`/suppliers/${(supplierData as Supplier).id}`, supplierData);
      } 
      else { 
        await apiClient.post('/suppliers', supplierData);
      }
      await apiClient.post('/logs', { action: `仕入先 ${supplierData.name} を保存`, userId: currentUser?.id });
      fetchSuppliers(); handleCloseModal();
    } catch (err) { setError(`エラー: 仕入先情報の保存に失敗しました。`); } 
    finally { setLoading(false); }
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    if (!supplier) return;
    setLoading(true);
    try { 
      await apiClient.delete(`/suppliers/${supplier.id}`); 
      await apiClient.post('/logs', { action: `仕入先 ${supplier.name} を削除`, userId: currentUser?.id });
      fetchSuppliers(); setShowConfirmDelete(null); 
    } 
    catch (err) { setError(`エラー: 仕入先の削除に失敗しました。`); } 
    finally { setLoading(false); }
  };

  const supplierTableHeaders: TableHeader<Supplier>[] = [
    { key: 'name', label: '仕入先名' }, { key: 'contactPerson', label: '担当者' },
    { key: 'phone', label: '電話番号' }, { key: 'email', label: 'Email' },
    { key: 'actions', label: UI_TEXT.ACTIONS, render: (item) => <div className="space-x-2"><button onClick={() => handleOpenModal(item)} className="p-1 text-indigo-600"><PencilIcon className="h-5 w-5"/></button><button onClick={() => setShowConfirmDelete(item)} className="p-1 text-red-600"><TrashIcon className="h-5 w-5"/></button></div> },
  ];

  return (
    <div className="space-y-6">
      {error && <p className="text-red-500 p-4 bg-red-100 rounded-md">{error}</p>}
      <div className="flex justify-between items-center"><h1 className="text-2xl font-semibold text-gray-800">仕入先管理</h1><button onClick={() => handleOpenModal()} className="flex items-center bg-indigo-600 text-white py-2 px-4 rounded-md"><PlusCircleIcon className="h-5 w-5 mr-2"/>新規追加</button></div>
      {loading ? <LoadingSpinner message="仕入先情報を読み込み中..."/> : <Table headers={supplierTableHeaders} data={suppliers} itemKey="id" onRowClick={handleOpenModal} />}
      {isModalOpen && <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSupplier ? '仕入先編集' : '新規仕入先追加'}><SupplierForm supplier={editingSupplier} onSave={handleSaveSupplier} onCancel={handleCloseModal} /></Modal>}
      {showConfirmDelete && <Modal isOpen={!!showConfirmDelete} onClose={() => setShowConfirmDelete(null)} title={UI_TEXT.CONFIRM_DELETE_TITLE}><p className="mb-6">{UI_TEXT.CONFIRM_DELETE_MESSAGE(showConfirmDelete.name)}</p><div className="flex justify-end gap-3"><button onClick={() => setShowConfirmDelete(null)} className="px-3 py-1 border rounded">{UI_TEXT.CANCEL}</button><button onClick={() => handleDeleteSupplier(showConfirmDelete)} className="px-3 py-1 bg-red-600 text-white rounded">{UI_TEXT.DELETE}</button></div></Modal>}
    </div>
  );
};


//=============================================================================
// Main Intake Page Component
//=============================================================================
const IntakePage: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = useMemo(() => {
    return new URLSearchParams(location.search).get('tab') || 'intake';
  }, [location.search]);
  
  const handleTabChange = (tabKey: string) => {
    navigate(`${location.pathname}?tab=${tabKey}`);
  };

  const TABS = useMemo(() => [
    { name: '入荷処理', icon: TruckIcon, key: 'intake', component: <IntakeProcessingTab /> },
    { name: '発注管理', icon: ShoppingBagIcon, key: 'purchase', component: <PurchaseManagementTab /> },
    { name: '発注書一覧', icon: DocumentTextIcon, key: 'po-list', component: <PurchaseOrderListTab /> },
    { name: '仕入先管理', icon: BuildingStorefrontIcon, key: 'suppliers', component: <SupplierManagementTab />, roles: [UserRole.ADMIN] },
  ], []);

  const availableTabs = useMemo(() => TABS.filter(tab => !tab.roles || (currentUser && tab.roles.includes(currentUser.role))), [TABS, currentUser]);

  return (
    <div className="space-y-6">
       <PageGuide title="入荷・発注管理ページの使い方">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>入荷処理タブ:</strong> AIによる納品書読み取りや、バーコードスキャンによる迅速な入荷記録が可能です。</li>
            <li><strong>発注管理タブ:</strong> 在庫管理ページで「発注リスト」に追加した商品から、正式な発注書を作成できます。入荷待ちの発注書の状況確認や、入荷処理もここで行います。</li>
            <li><strong>発注書一覧タブ:</strong> 過去に作成したすべての発注書を閲覧・検索できます。</li>
            <li><strong>仕入先管理タブ (管理者のみ):</strong> 取引のある仕入先の情報を登録・編集します。</li>
          </ul>
      </PageGuide>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {availableTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {availableTabs.find(tab => tab.key === activeTab)?.component}
      </div>
    </div>
  );
};

export default IntakePage;