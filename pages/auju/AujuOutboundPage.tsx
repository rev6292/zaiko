import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Product, UserRole, OutboundCartItem, ProductWithStock } from '../../types';
import apiClient from '../../services/apiClient';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { UI_TEXT } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';
import { UserCircleIcon, QrCodeIcon, CheckCircleIcon, ExclamationTriangleIcon, PlusIcon, MinusIcon, TrashIcon, ShoppingCartIcon, PhotoIcon } from '@heroicons/react/24/outline';


const AujuOutboundPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedStoreId } = useStore();
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<OutboundCartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
        setSelectedStaffId(currentUser.id);
    }
  }, [currentUser]);
  
  useEffect(() => {
    if (!isProcessing && selectedStaffId) {
      barcodeInputRef.current?.focus();
    }
  }, [isProcessing, selectedStaffId, cart]);


  const showMessageTemporarily = (type: 'success' | 'error', text: string) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), 3000);
  };

  const handleBarcodeSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!barcode.trim() || !selectedStaffId || isProcessing || !selectedStoreId) return;
    
    setIsProcessing(true);
    try {
        const product: ProductWithStock = await apiClient.get('/products/auju', { barcode: barcode.trim(), storeId: selectedStoreId });
        if (product) {
            let itemExists = false;
            const newCart = cart.map(item => {
                if (item.product.id === product.id) {
                    itemExists = true;
                    return { ...item, quantity: item.quantity + 1 };
                }
                return item;
            });

            if (itemExists) {
                setCart(newCart);
                showMessageTemporarily('success', `「${product.name}」の数量を+1しました。`);
            } else {
                setCart([{ product, quantity: 1 }, ...cart]);
                showMessageTemporarily('success', `「${product.name}」をリストに追加しました。`);
            }
        } else {
            showMessageTemporarily('error', `このバーコードを持つAujua商品が見つかりません: ${barcode}`);
        }
    } catch (error) {
        showMessageTemporarily('error', `${UI_TEXT.SCAN_ERROR_MESSAGE}: ${(error as Error).message}`);
    } finally {
        setBarcode('');
        setIsProcessing(false);
    }
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    setCart(prevCart => prevCart.map(item => {
        if (item.product.id === productId) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
        }
        return item;
      }).filter(Boolean) as OutboundCartItem[]
    );
  };
  
  const handleRemoveItem = (productId: string) => {
      setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };
  
  const handleConfirmOutbound = async () => {
      if (cart.length === 0 || !selectedStaffId || !selectedStoreId) return;
      setIsProcessing(true);
      
      const itemsToProcess = cart.map(item => ({ productId: item.product.id, quantity: item.quantity }));

      try {
          const result = await apiClient.post('/outbound/auju', { items: itemsToProcess, operatorId: selectedStaffId, storeId: selectedStoreId });
          if (result.success) {
              showMessageTemporarily('success', 'Aujua商品の出庫処理が正常に完了しました。在庫が更新されました。');
              await apiClient.post('/logs', { action: `${itemsToProcess.length}品目のAujua出庫処理を完了`, userId: selectedStaffId });
              setCart([]);
          } else {
              setMessage({ type: 'error', text: `出庫エラー: ${result.errors.join(', ')}` });
          }
      } catch (error) {
          setMessage({ type: 'error', text: `出庫処理中に予期せぬエラーが発生しました: ${(error as Error).message}`});
      } finally {
          setIsProcessing(false);
          setIsConfirmModalOpen(false);
      }
  };
  
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-700 flex items-center">
                <ShoppingCartIcon className="h-6 w-6 mr-2 text-slate-500"/>
                Aujua 出庫リスト
            </h2>
            <span className="text-slate-600 font-medium bg-slate-100 px-3 py-1 rounded-full text-sm">合計 <span className="font-bold">{totalCartItems}</span> 点</span>
          </div>

          <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            {cart.length > 0 ? (
                <ul className="space-y-3">
                    {cart.map(({product, quantity}) => (
                        <li key={product.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                            <div className="w-16 h-16 bg-white rounded-md flex-shrink-0 overflow-hidden shadow-sm">
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                        <PhotoIcon className="h-8 w-8 text-slate-300"/>
                                    </div>
                                )}
                            </div>
                            <div className="flex-grow">
                                <p className="font-semibold text-slate-800">{product.name}</p>
                                <p className="text-sm text-slate-500">{product.barcode}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleQuantityChange(product.id, -1)} className="p-1.5 rounded-full bg-slate-200 hover:bg-slate-300 transition"><MinusIcon className="h-4 w-4 text-slate-700"/></button>
                                <span className="w-8 text-center font-medium text-slate-900 text-lg">{quantity}</span>
                                <button onClick={() => handleQuantityChange(product.id, 1)} className="p-1.5 rounded-full bg-slate-200 hover:bg-slate-300 transition"><PlusIcon className="h-4 w-4 text-slate-700"/></button>
                            </div>
                            <button onClick={() => handleRemoveItem(product.id)} className="p-1 text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5"/></button>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center text-slate-500 py-16 flex flex-col items-center justify-center h-full">
                    <QrCodeIcon className="h-16 w-16 text-slate-300 mb-4"/>
                    <p className="font-semibold">Aujua商品をスキャンしてください</p>
                    <p className="text-sm">スキャンした商品がここに追加されます。</p>
                </div>
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-200">
             <button
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={cart.length === 0 || isProcessing}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? '処理中...' : `${totalCartItems} 点の出庫を完了する`}
            </button>
          </div>
      </div>
      
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-800 lg:hidden">Aujua 出庫処理</h1>
        <div className="bg-white p-4 rounded-lg shadow-md">
            <p className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                <UserCircleIcon className="h-5 w-5 inline-block mr-2 align-middle text-slate-500" />
                {UI_TEXT.OPERATOR}: <span className="font-semibold ml-2">{currentUser?.name}</span>
            </p>
        </div>

        {selectedStaffId && (
            <form onSubmit={handleBarcodeSubmit} className="bg-white p-4 rounded-lg shadow-md space-y-3 sticky top-6">
            <label htmlFor="barcode-input" className="block text-sm font-medium text-slate-700">
                <QrCodeIcon className="h-5 w-5 inline-block mr-2 align-middle text-slate-500" />
                {UI_TEXT.SCAN_BARCODE_FOR_OUTBOUND}
            </label>
            <div className="flex items-center space-x-2">
                <input
                    ref={barcodeInputRef}
                    id="barcode-input"
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder={UI_TEXT.BARCODE_PROMPT}
                    className="flex-grow p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400 disabled:bg-slate-50"
                    disabled={isProcessing || !selectedStaffId}
                />
            </div>
             {message && (
                <div className={`p-3 rounded-md text-sm flex items-center space-x-2
                ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                {message.type === 'success' && <CheckCircleIcon className="h-5 w-5" />}
                {message.type === 'error' && <ExclamationTriangleIcon className="h-5 w-5" />}
                <span>{message.text}</span>
                </div>
            )}
            </form>
        )}
      </div>

      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="出庫の最終確認">
          <p className="text-slate-700 mb-4">合計 {totalCartItems} 点のAujua商品を出庫します。この操作により在庫が更新されます。よろしいですか？</p>
          <ul className="max-h-60 overflow-y-auto space-y-2 mb-6 p-3 bg-slate-50 rounded-md border">
              {cart.map(item => (
                  <li key={item.product.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-white rounded flex-shrink-0 overflow-hidden">
                            {item.product.imageUrl ? <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover"/> : <PhotoIcon className="h-6 w-6 text-slate-300 m-1"/>}
                          </div>
                          <span className="text-slate-800">{item.product.name}</span>
                      </div>
                      <span className="font-medium text-slate-600">x {item.quantity}</span>
                  </li>
              ))}
          </ul>
          <div className="flex justify-end space-x-3">
              <button onClick={() => setIsConfirmModalOpen(false)} disabled={isProcessing} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md shadow-sm disabled:opacity-50">{UI_TEXT.CANCEL}</button>
              <button onClick={handleConfirmOutbound} disabled={isProcessing} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 border border-transparent rounded-md shadow-sm disabled:opacity-50 min-w-[120px] flex justify-center">
                  {isProcessing ? <LoadingSpinner size="sm"/> : 'はい、出庫します'}
              </button>
          </div>
      </Modal>
    </div>
  );
};

export default AujuOutboundPage;
