import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, Supplier, UserRole, TableHeader, Category, ProductWithStock, ProductUsage } from '../types';
import apiClient from '../services/apiClient';
import Modal from '../components/Modal';
import Table from '../components/Table';
import SkeletonTable from '../components/SkeletonTable';
import { UI_TEXT } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { usePurchaseList } from '../contexts/PurchaseListContext'; 
import { useStore } from '../contexts/StoreContext';
import { PlusCircleIcon, PencilIcon, TrashIcon, CameraIcon, SparklesIcon, ShoppingCartIcon, BellAlertIcon, ArchiveBoxXMarkIcon, InformationCircleIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '../constants';
import { useNotification } from '../contexts/NotificationContext';
import PageGuide from '../components/PageGuide';


const initialProductFormState: ProductWithStock = {
  id: '', name: '', barcode: '', category: '', categoryId: '', usage: ProductUsage.PROFESSIONAL, costPrice: 0, supplierId: '', lastUpdated: '', description: '',
  currentStock: 0, minimumStock: 0,
};

const ProductForm: React.FC<{
  product?: ProductWithStock | null;
  suppliers: Supplier[];
  categories: Category[];
  onSave: (product: ProductWithStock) => void;
  onCancel: () => void;
  isAdmin: boolean;
  onAddToPurchaseList?: (product: ProductWithStock) => void;
}> = ({ product, suppliers, categories, onSave, onCancel, isAdmin, onAddToPurchaseList }) => {
  const [formData, setFormData] = useState<ProductWithStock>(
    product ? { ...initialProductFormState, ...product } : initialProductFormState
  );
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    const initialData = product ? { ...initialProductFormState, ...product } : initialProductFormState;
    setFormData(initialData);
    if (initialData.categoryId) {
      const childCategory = categories.find(c => c.id === initialData.categoryId);
      setSelectedParentId(childCategory?.parentId || null);
    } else {
      setSelectedParentId(null);
    }
    setGenerationError(null);
  }, [product, categories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'currentStock' || name === 'minimumStock' || name === 'costPrice' ? parseFloat(value) || 0 : value }));
  };
  
  const handleParentCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const parentId = e.target.value;
    setSelectedParentId(parentId || null);
    setFormData(prev => ({ ...prev, categoryId: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleGenerateDescription = async () => {
    if (!formData.name) {
      setGenerationError("商品説明文を生成するには商品名を入力してください。");
      return;
    }
    const categoryName = categories.find(c => c.id === formData.categoryId)?.name || formData.category;
    setIsGeneratingDescription(true);
    setGenerationError(null);
    try {
      const description = await apiClient.post('/gemini/description', { productName: formData.name, category: categoryName });
      setFormData(prev => ({ ...prev, description: description }));
    } catch (err) {
      console.error("Description generation failed:", err);
      setGenerationError((err as Error).message || "商品説明文の生成に失敗しました。");
    } finally {
      setIsGeneratingDescription(false);
    }
  };
  
  const parentCategories = useMemo(() => categories.filter(c => c.parentId === null), [categories]);
  const childCategories = useMemo(() => {
    if (!selectedParentId) return [];
    return categories.filter(c => c.parentId === selectedParentId);
  }, [categories, selectedParentId]);


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
       <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">{UI_TEXT.PRODUCT_NAME}</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400" />
        </div>
        <div>
            <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">{UI_TEXT.BARCODE}</label>
            <input type="text" name="barcode" id="barcode" value={formData.barcode} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400" />
        </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="currentStock" className="block text-sm font-medium text-gray-700">{UI_TEXT.CURRENT_STOCK}</label>
          <input type="number" name="currentStock" id="currentStock" value={formData.currentStock} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400" />
        </div>
        <div>
          <label htmlFor="minimumStock" className="block text-sm font-medium text-gray-700">{UI_TEXT.MINIMUM_STOCK}</label>
          <input type="number" name="minimumStock" id="minimumStock" value={formData.minimumStock} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label htmlFor="parent-category" className="block text-sm font-medium text-gray-700">{UI_TEXT.PARENT_CATEGORY}</label>
            <select 
            id="parent-category"
            name="parent-category"
            value={selectedParentId || ''} 
            onChange={handleParentCategoryChange} 
            className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900"
            >
            <option value="">親カテゴリを選択...</option>
            {parentCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
            </select>
        </div>

        <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">{UI_TEXT.CATEGORY}</label>
            <select 
            name="categoryId" 
            id="categoryId" 
            value={formData.categoryId} 
            onChange={handleChange} 
            required 
            disabled={!selectedParentId}
            className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 disabled:bg-slate-50 disabled:cursor-not-allowed"
            >
            <option value="">子カテゴリを選択...</option>
            {childCategories.map(cat => ( 
                <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
            </select>
            <input type="hidden" name="category" value={formData.category} />
        </div>
      </div>
      
       <div>
        <label className="block text-sm font-medium text-gray-700">用途</label>
        <div className="mt-2 flex space-x-4">
          <div className="flex items-center">
            <input id="usage-professional" name="usage" type="radio" value={ProductUsage.PROFESSIONAL} checked={formData.usage === ProductUsage.PROFESSIONAL} onChange={handleChange} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300" />
            <label htmlFor="usage-professional" className="ml-2 block text-sm text-gray-900">{ProductUsage.PROFESSIONAL}</label>
          </div>
          <div className="flex items-center">
            <input id="usage-retail" name="usage" type="radio" value={ProductUsage.RETAIL} checked={formData.usage === ProductUsage.RETAIL} onChange={handleChange} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300" />
            <label htmlFor="usage-retail" className="ml-2 block text-sm text-gray-900">{ProductUsage.RETAIL}</label>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">商品説明</label>
          <button 
            type="button" 
            onClick={handleGenerateDescription}
            disabled={!formData.name || !formData.categoryId || isGeneratingDescription}
            className="flex items-center text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingDescription ? (
              <React.Fragment>...生成中</React.Fragment>
            ) : (
              <SparklesIcon className="h-4 w-4 mr-1" />
            )}
            AIで生成
          </button>
        </div>
        <textarea name="description" id="description" value={formData.description || ''} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400" />
        {generationError && <p className="mt-1 text-sm text-red-600">{generationError}</p>}
      </div>

       {isAdmin && (
        <div>
          <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700">{UI_TEXT.COST_PRICE} (¥)</label>
          <input type="number" name="costPrice" id="costPrice" value={formData.costPrice} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400" />
        </div>
      )}
      <div>
        <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700">{UI_TEXT.SUPPLIER}</label>
        <select name="supplierId" id="supplierId" value={formData.supplierId} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900">
          <option value="">選択してください</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="flex justify-between items-center pt-4">
        <div>
          {product && onAddToPurchaseList && (
            <button
              type="button"
              onClick={() => onAddToPurchaseList(product)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm"
            >
              <ShoppingCartIcon className="h-5 w-5 mr-2" />
              発注リストに追加
            </button>
          )}
        </div>
        <div className="flex space-x-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">{UI_TEXT.CANCEL}</button>
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">{UI_TEXT.SAVE}</button>
        </div>
      </div>
    </form>
  );
};


const InventoryPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedStoreId } = useStore();
  const { addToPurchaseList, getTotalItems: getTotalPurchaseListItems } = usePurchaseList();
  const { showNotification } = useNotification();
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<ProductWithStock | null>(null);
  
  const [editingCell, setEditingCell] = useState<{productId: string, field: 'currentStock'} | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<string>('');
  const [selectedChildCategoryId, setSelectedChildCategoryId] = useState<string>('');
  const [selectedSupplierIdForFilter, setSelectedSupplierIdForFilter] = useState<string>('');
  const [selectedUsage, setSelectedUsage] = useState<string>('');
  const [deadStockPeriod, setDeadStockPeriod] = useState<string>(''); // '1m', '3m', '6m'

  // Barcode scan
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedProductInfo, setScannedProductInfo] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    setError(null);
    try {
      const [productsData, suppliersData, categoriesData] = await Promise.all([
          apiClient.get('/products', { storeId: selectedStoreId }), 
          apiClient.get('/suppliers'),
          apiClient.get('/categories')
        ]);
      setProducts(productsData);
      setSuppliers(suppliersData);
      setCategories(categoriesData);
    } catch (err) {
      setError('データの読み込みに失敗しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  const handleOpenModal = (product?: ProductWithStock) => {
    setEditingProduct(product || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleAddToPurchaseList = (product: ProductWithStock, quantity: number = 1) => {
    addToPurchaseList(product, quantity);
    showNotification(`「${product.name}」を発注リストに追加しました。`, 'success');
    handleCloseModal();
  };

  const parentCategories = useMemo(() => categories.filter(c => c.parentId === null), [categories]);
  const childCategories = useMemo(() => {
    if (!selectedParentCategoryId) return [];
    return categories.filter(c => c.parentId === selectedParentCategoryId);
  }, [categories, selectedParentCategoryId]);

  useEffect(() => {
    setSelectedChildCategoryId(''); // Reset child if parent changes
  }, [selectedParentCategoryId]);
  
  const getCategoryFullName = useCallback((categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '未分類';
    if (category.parentId) {
      const parent = categories.find(c => c.id === category.parentId);
      return parent ? `${parent.name} > ${category.name}` : category.name;
    }
    return category.name;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearchTerm = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm) ||
        getCategoryFullName(p.categoryId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesParentCategory = selectedParentCategoryId ? 
        (categories.find(c => c.id === p.categoryId)?.parentId === selectedParentCategoryId || p.categoryId === selectedParentCategoryId) // also match if parent is selected directly
        : true;
      const matchesChildCategory = selectedChildCategoryId ? p.categoryId === selectedChildCategoryId : true;
      const matchesSupplier = selectedSupplierIdForFilter ? p.supplierId === selectedSupplierIdForFilter : true;
      const matchesUsage = selectedUsage ? p.usage === selectedUsage : true;

      return matchesSearchTerm && matchesParentCategory && matchesChildCategory && matchesSupplier && matchesUsage;
    });
  }, [products, searchTerm, selectedParentCategoryId, selectedChildCategoryId, selectedSupplierIdForFilter, selectedUsage, getCategoryFullName, categories]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.currentStock < p.minimumStock);
  }, [products]);

  const deadStockProducts = useMemo(() => {
    if (!deadStockPeriod) return [];
    const now = new Date();
    let monthsToSubtract = 0;
    if (deadStockPeriod === '1m') monthsToSubtract = 1;
    if (deadStockPeriod === '3m') monthsToSubtract = 3;
    if (deadStockPeriod === '6m') monthsToSubtract = 6;
    
    const cutoffDate = new Date(now.setMonth(now.getMonth() - monthsToSubtract));
    
    return products.filter(p => new Date(p.lastUpdated) < cutoffDate);
  }, [products, deadStockPeriod]);


  const handleSaveProduct = async (productData: ProductWithStock) => {
    const isUpdating = 'id' in productData && productData.id;
    const originalProductName = isUpdating ? products.find(p => p.id === productData.id)?.name : productData.name;
    
    const categoryName = categories.find(c => c.id === productData.categoryId)?.name || '';
    
    const { currentStock, minimumStock, ...productFields } = productData;
    const productToSave = { ...productFields, category: categoryName };
    const stockInfo = { currentStock, minimumStock };
    const payload = { product: productToSave, stock: stockInfo, storeId: selectedStoreId };

    try {
      if (isUpdating) {
        await apiClient.put(`/products/${productToSave.id}`, payload);
        await apiClient.post('/logs', { action: `${productToSave.name} を更新`, userId: currentUser?.id });
      } else {
        const { id, ...newProductFields } = productToSave;
        await apiClient.post('/products', { ...payload, product: newProductFields, operatorId: currentUser?.id });
        await apiClient.post('/logs', { action: `${productToSave.name} を追加`, userId: currentUser?.id });
      }
      fetchAllData();
      handleCloseModal();
      showNotification(`商品「${originalProductName}」を${isUpdating ? '更新' : '追加'}しました。`, 'success');
    } catch (err) {
      showNotification(`エラー: 商品の保存に失敗しました。${(err as Error).message}`, 'error');
    }
  };

  const handleInlineEditSave = async (productId: string, value: string) => {
    const product = products.find(p => p.id === productId);
    const numericValue = parseInt(value, 10);
    
    if (product && !isNaN(numericValue) && product.currentStock !== numericValue) {
        // Optimistic UI update
        const originalProducts = products;
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, currentStock: numericValue, lastUpdated: new Date().toISOString() } : p));
        
        try {
            await apiClient.put(`/products/${productId}/stock`, { storeId: selectedStoreId, newStock: numericValue });
            showNotification(`「${product.name}」の在庫を ${numericValue} に更新しました。`, 'success');
        } catch (err) {
            showNotification(`在庫の更新に失敗しました。`, 'error');
            // Revert on error
            setProducts(originalProducts);
        }
    }
  };

  const handleDeleteProduct = async (product: ProductWithStock) => {
    if (!product) return;
    try {
      await apiClient.delete(`/products/${product.id}`);
      await apiClient.post('/logs', { action: `${product.name} を削除`, userId: currentUser?.id });
      fetchAllData();
      setShowConfirmDelete(null); 
      showNotification(`商品「${product.name}」を削除しました。`, 'success');
    } catch (err) {
      showNotification(`エラー: 商品の削除に失敗しました。${(err as Error).message}`, 'error');
    }
  };

  const handleScanBarcode = async () => {
    if (!barcodeInput.trim() || !selectedStoreId) {
      setScannedProductInfo("バーコードを入力してください。");
      return;
    }
    setScannedProductInfo(null);
    try {
      const product: ProductWithStock = await apiClient.get('/products', { barcode: barcodeInput.trim(), storeId: selectedStoreId });
      if (product) {
        setScannedProductInfo(`商品名: ${product.name}, 現在庫: ${product.currentStock}`);
        handleOpenModal(product); 
      } else {
        setScannedProductInfo(`バーコードに一致する商品が見つかりません: ${barcodeInput}`);
      }
    } catch (err) {
      setScannedProductInfo(`エラー: バーコード検索に失敗しました。`);
    } finally {
      setBarcodeInput(''); 
    }
  };
  
  const handleStockEditKeyDown = (e: React.KeyboardEvent, currentItem: ProductWithStock) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleInlineEditSave(currentItem.id, editingValue);

        const currentIndex = filteredProducts.findIndex(p => p.id === currentItem.id);
        if (currentIndex > -1 && currentIndex < filteredProducts.length - 1) {
            const nextProduct = filteredProducts[currentIndex + 1];
            setEditingCell({ productId: nextProduct.id, field: 'currentStock' });
            setEditingValue(String(nextProduct.currentStock));
        } else {
            setEditingCell(null);
        }
    } else if (e.key === 'Escape') {
        setEditingCell(null);
    }
  };

  const productTableHeaders: TableHeader<ProductWithStock>[] = [
    { key: 'name', label: UI_TEXT.PRODUCT_NAME, cellClassName: "font-medium text-slate-800" },
    { key: 'barcode', label: UI_TEXT.BARCODE },
    { key: 'categoryId', label: UI_TEXT.CATEGORY, render: (item) => getCategoryFullName(item.categoryId) },
    { key: 'usage', label: '用途' },
    { 
      key: 'currentStock',
      label: UI_TEXT.CURRENT_STOCK,
      render: (item) => {
        const isEditing = editingCell?.productId === item.id && editingCell?.field === 'currentStock';
        
        if (isAdmin && selectedStoreId === 'all') {
          return (
            <div className={`flex items-center p-1 ${item.currentStock < item.minimumStock ? 'text-red-600 font-bold' : ''}`}>
              {item.currentStock}
            </div>
          );
        }

        return isEditing ? (
            <input
                id={`stock-edit-${item.id}`}
                name={`stock-edit-${item.id}`}
                type="number"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => {
                  handleInlineEditSave(item.id, editingValue);
                  setEditingCell(null);
                }}
                onKeyDown={(e) => handleStockEditKeyDown(e, item)}
                onClick={e => e.stopPropagation()}
                autoFocus
                className="w-20 text-center border-slate-300 rounded-md py-1"
            />
        ) : (
            <div
                className={`group w-full h-full flex items-center p-1 rounded transition-colors cursor-pointer hover:bg-slate-100 ${item.currentStock < item.minimumStock ? 'text-red-600 font-bold' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setEditingCell({ productId: item.id, field: 'currentStock' });
                    setEditingValue(String(item.currentStock));
                }}
            >
                {item.currentStock}
                <PencilIcon className="h-3 w-3 ml-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"/>
            </div>
        );
      } 
    },
    { key: 'supplierId', label: UI_TEXT.SUPPLIER, render: (item) => suppliers.find(s => s.id === item.supplierId)?.name || 'N/A' },
    { key: 'actions', label: UI_TEXT.ACTIONS, render: (item) => (
      <div className="flex items-center space-x-1">
        <button onClick={(e) => { e.stopPropagation(); handleAddToPurchaseList(item); }} className="text-green-600 hover:text-green-800 p-1 transition-colors" title="発注リストに追加">
          <ShoppingCartIcon className="h-5 w-5"/>
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors" title={UI_TEXT.EDIT}>
          <PencilIcon className="h-5 w-5" />
        </button>
        {isAdmin && (
          <button onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(item); }} className="text-red-600 hover:text-red-900 p-1 transition-colors" title={UI_TEXT.DELETE}>
            <TrashIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    )},
  ];

   const lowStockTableHeaders: TableHeader<ProductWithStock>[] = [
    { key: 'name', label: UI_TEXT.PRODUCT_NAME },
    { key: 'currentStock', label: UI_TEXT.CURRENT_STOCK, render: (item) => (
        <span className="text-red-600 font-bold">{item.currentStock}</span>
      )
    },
    { key: 'minimumStock', label: UI_TEXT.MINIMUM_STOCK },
    { key: 'supplierId', label: UI_TEXT.SUPPLIER, render: (item) => suppliers.find(s => s.id === item.supplierId)?.name || 'N/A' },
    { key: 'actions', label: '発注リストに追加', render: (item) => (
        <button onClick={() => handleAddToPurchaseList(item)} className="text-green-600 hover:text-green-800 p-1 flex items-center text-sm font-semibold">
          <ShoppingCartIcon className="h-5 w-5 mr-1"/> 追加
        </button>
      )
    },
  ];
  
  const deadStockTableHeaders: TableHeader<ProductWithStock>[] = [
    { key: 'name', label: UI_TEXT.PRODUCT_NAME },
    { key: 'barcode', label: UI_TEXT.BARCODE },
    { key: 'currentStock', label: UI_TEXT.CURRENT_STOCK },
    { key: 'lastUpdated', label: '最終更新/変動日', render: item => new Date(item.lastUpdated).toLocaleDateString() },
    { key: 'supplierId', label: UI_TEXT.SUPPLIER, render: (item) => suppliers.find(s => s.id === item.supplierId)?.name || 'N/A' },
  ];
  
  const isNewProductDisabled = isAdmin && selectedStoreId === 'all';

  return (
    <div className="space-y-6">
      <PageGuide title="在庫管理ページの使い方">
        <ul className="list-disc list-inside space-y-1">
          <li><strong>フィルター:</strong> カテゴリ、用途、仕入先で商品を絞り込めます。全体検索は商品名、バーコード、商品説明などから横断的に検索します。</li>
          <li><strong>バーコード処理:</strong> バーコードをスキャンまたは入力すると、該当商品の編集画面を直接開くことができます。</li>
          <li><strong>在庫数編集:</strong> 在庫数カラムをクリックすると、その場で数値を直接編集できます。Enterキーで下の行に移動するため、連続入力が可能です。</li>
          <li><strong>発注リスト:</strong> 各商品のカートアイコンをクリックすると、その商品が「入荷処理」ページの発注リストに追加されます。</li>
        </ul>
      </PageGuide>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800">在庫管理</h1>
        <div className="flex items-center gap-3">
          <Link 
            to={`${ROUTE_PATHS.INTAKE}?tab=purchase`} 
            className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm"
          >
            <ShoppingCartIcon className="h-5 w-5 mr-2" />
            発注リスト ({getTotalPurchaseListItems()}件)
          </Link>
          <div title={isNewProductDisabled ? '商品を登録するには、まずヘッダーで特定の店舗を選択してください。' : ''}>
            <button
              onClick={() => handleOpenModal()}
              disabled={isNewProductDisabled}
              className="flex items-center bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              {UI_TEXT.ADD_NEW}商品
            </button>
          </div>
        </div>
      </div>
      
      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow space-y-3 md:space-y-0 md:flex md:items-end md:gap-3">
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="parent-category-filter" className="block text-sm font-medium text-gray-900">親カテゴリ</label>
          <select 
            id="parent-category-filter"
            name="parent-category-filter"
            value={selectedParentCategoryId} 
            onChange={(e) => setSelectedParentCategoryId(e.target.value)}
            className="mt-1 block w-full p-2 rounded-md shadow-sm sm:text-sm bg-white border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
          >
            <option value="">すべてのカテゴリ</option>
            {parentCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="child-category-filter" className="block text-sm font-medium text-gray-900">子カテゴリ</label>
          <select 
            id="child-category-filter"
            name="child-category-filter"
            value={selectedChildCategoryId} 
            onChange={(e) => setSelectedChildCategoryId(e.target.value)}
            disabled={!selectedParentCategoryId || childCategories.length === 0}
            className="mt-1 block w-full p-2 rounded-md shadow-sm sm:text-sm bg-white border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400 text-slate-900"
          >
            <option value="">すべてのカテゴリ (子)</option>
            {childCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>
         <div className="flex-1 min-w-[150px]">
          <label htmlFor="usage-filter" className="block text-sm font-medium text-gray-900">用途</label>
          <select 
            id="usage-filter"
            name="usage-filter"
            value={selectedUsage} 
            onChange={(e) => setSelectedUsage(e.target.value)}
            className="mt-1 block w-full p-2 rounded-md shadow-sm sm:text-sm bg-white border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
          >
            <option value="">全ての用途</option>
            <option value={ProductUsage.PROFESSIONAL}>{ProductUsage.PROFESSIONAL}</option>
            <option value={ProductUsage.RETAIL}>{ProductUsage.RETAIL}</option>
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="supplier-filter" className="block text-sm font-medium text-gray-900">仕入先で絞り込み</label>
          <select 
            id="supplier-filter"
            name="supplier-filter"
            value={selectedSupplierIdForFilter} 
            onChange={(e) => setSelectedSupplierIdForFilter(e.target.value)}
            className="mt-1 block w-full p-2 rounded-md shadow-sm sm:text-sm bg-white border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
          >
            <option value="">すべての仕入先</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex-1 md:flex-grow-0">
          <input
            id="inventory-search"
            name="inventory-search"
            type="text"
            placeholder="全体検索 (商品名,バーコード等)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1 block w-full p-2 rounded-md shadow-sm sm:text-sm border-slate-300 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>


      {/* Barcode Scanner Section */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-700 mb-2">バーコード処理</h2>
        <div className="flex items-center space-x-2">
          <input 
            type="text"
            id="barcode-scanner-input"
            name="barcode-scanner-input"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScanBarcode()}
            placeholder="バーコードをスキャンまたは入力してEnter"
            className="flex-grow p-2 border rounded-md border-slate-300 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button 
            onClick={handleScanBarcode}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md flex items-center"
            title="カメラでスキャン (シミュレーション)"
          >
            <CameraIcon className="h-5 w-5 mr-1 sm:mr-2"/> <span className="hidden sm:inline">スキャン</span>
          </button>
        </div>
        {scannedProductInfo && <p className="mt-2 text-sm text-gray-600">{scannedProductInfo}</p>}
      </div>
      
      {error && <p className="text-red-500 p-4 bg-red-100 rounded-md">{error}</p>}
      
      {loading ? (
        <SkeletonTable rows={5} cols={7}/>
      ) : (
        <Table headers={productTableHeaders} data={filteredProducts} itemKey="id" onRowClick={handleOpenModal} />
      )}

      {/* Low Stock Section */}
      {lowStockProducts.length > 0 && (
        <div className="mt-8 bg-white shadow-lg rounded-xl p-6 border-t-4 border-yellow-400">
          <h2 className="text-xl font-semibold text-yellow-600 mb-4 flex items-center">
            <BellAlertIcon className="h-6 w-6 mr-2 text-yellow-500" />
            在庫僅少アラート ({lowStockProducts.length}件)
          </h2>
          <div className="max-h-80 overflow-y-auto">
            <Table headers={lowStockTableHeaders} data={lowStockProducts} itemKey="id" />
          </div>
        </div>
      )}

      {/* Dead Stock Section */}
      <div className="mt-8 bg-white shadow-lg rounded-xl p-6 border-t-4 border-orange-400">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-orange-600 flex items-center">
            <ArchiveBoxXMarkIcon className="h-6 w-6 mr-2 text-orange-500" />
            不良在庫アラート
            <div className="relative group ml-2">
                <InformationCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                    指定した期間、商品の情報や在庫数が一度も更新されていない（入出庫や編集が行われていない）商品をリストアップします。
                </div>
            </div>
          </h2>
          <select 
            id="dead-stock-period"
            name="dead-stock-period"
            value={deadStockPeriod} 
            onChange={(e) => setDeadStockPeriod(e.target.value)}
            className="p-2 border rounded-md shadow-sm text-sm border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
          >
            <option value="">期間を選択...</option>
            <option value="1m">1ヶ月以上</option>
            <option value="3m">3ヶ月以上</option>
            <option value="6m">6ヶ月以上</option>
          </select>
        </div>
        {deadStockPeriod && deadStockProducts.length > 0 ? (
          <div className="max-h-80 overflow-y-auto">
            <Table headers={deadStockTableHeaders} data={deadStockProducts} itemKey="id" />
          </div>
        ) : deadStockPeriod ? (
          <p className="text-gray-500">{deadStockPeriod.slice(0,-1)}ヶ月以上動きのなかった商品はありません。</p>
        ) : (
           <p className="text-gray-500">分析する期間を選択してください。</p>
        )}
      </div>


      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingProduct ? '商品編集' : '新規商品追加'}>
          <ProductForm
            product={editingProduct}
            suppliers={suppliers}
            categories={categories}
            onSave={handleSaveProduct}
            onCancel={handleCloseModal}
            isAdmin={isAdmin}
            onAddToPurchaseList={handleAddToPurchaseList}
          />
        </Modal>
      )}
      
      {showConfirmDelete && (
        <Modal isOpen={!!showConfirmDelete} onClose={() => setShowConfirmDelete(null)} title={UI_TEXT.CONFIRM_DELETE_TITLE}>
          <p className="text-gray-700 mb-6">{UI_TEXT.CONFIRM_DELETE_MESSAGE(showConfirmDelete.name)}</p>
          <div className="flex justify-end space-x-3">
            <button onClick={() => setShowConfirmDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm">{UI_TEXT.CANCEL}</button>
            <button onClick={() => handleDeleteProduct(showConfirmDelete)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 border border-transparent rounded-md shadow-sm">{UI_TEXT.DELETE}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InventoryPage;