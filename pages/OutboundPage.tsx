import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Product, UserRole, OutboundCartItem, ProductWithStock } from '../types';
import apiClient from '../services/apiClient';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { UI_TEXT } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { UserCircleIcon, QrCodeIcon, CheckCircleIcon, ExclamationTriangleIcon, PlusIcon, MinusIcon, TrashIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import PageGuide from '../components/PageGuide';


const OutboundPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedStoreId } = useStore();
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<OutboundCartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const isStoreSelected = selectedStoreId !== 'all';

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const users = await apiClient.get('/users/staff');
        setStaffUsers(users.filter(u => u.role === UserRole.STAFF || u.role === UserRole.ADMIN));
        if (currentUser) {
            setSelectedStaffId(currentUser.id);
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'データの読み込みに失敗しました。' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser]);
  
  // This effect handles focusing the input for continuous scanning
  useEffect(() => {
    if (!isProcessing && selectedStaffId && isStoreSelected) {
      barcodeInputRef.current?.focus();
    }
  }, [isProcessing, selectedStaffId, cart, isStoreSelected]);


  const showMessageTemporarily = (type: 'success' | 'error', text: string) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), 3000);
  };

  const handleBarcodeSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!barcode.trim() || !selectedStaffId || isProcessing) return;

    if (!isStoreSelected) {
        showMessageTemporarily('error', '商品をスキャンするには、まずヘッダーで特定の店舗を選択してください。');
        return;
    }
    
    setIsProcessing(true);
    try {
        const product = await apiClient.get('/products', { barcode: barcode.trim(), storeId: selectedStoreId });
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
            showMessageTemporarily('error', `バーコードに一致する商品が見つかりません: ${barcode}`);
        }
    } catch (error) {
        showMessageTemporarily('error', `スキャンエラー: ${(error as Error).message}`);
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
      if (cart.length === 0 || !selectedStaffId) return;
      if (!isStoreSelected) {
          setMessage({ type: 'error', text: '出庫処理を行うには、ヘッダーのドロップダウンから特定の店舗を選択してください。' });
          setIsConfirmModalOpen(false);
          return;
      }

      setIsProcessing(true);
      
      const itemsToProcess = cart.map(item => ({ productId: item.product.id, quantity: item.quantity }));

      try {
          const result = await apiClient.post('/outbound', { items: itemsToProcess, operatorId: selectedStaffId, storeId: selectedStoreId });
          if (result.success) {
              showMessageTemporarily('success', '出庫処理が正常に完了しました。在庫が更新されました。');
              await apiClient.post('/logs', { action: `${itemsToProcess.length}品目の出庫処理を完了`, userId: selectedStaffId });
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

  if (isLoading) return <LoadingSpinner message="担当者情報を読み込み中..." />;

  return (
    <div className="space-y-6">
    <PageGuide title="出庫処理ページの使い方">
      <ol className="list-decimal list-inside space-y-1">
          <li><strong>担当者を選択:</strong> まず、右側のパネルで出庫作業を行う担当者を選択します。</li>
          <li><strong>バーコードをスキャン:</strong> 出庫する商品のバーコードをスキャン（または入力してEnter）します。</li>
          <li><strong>リストの確認:</strong> スキャンした商品が左側の「出庫リスト」に追加されます。同じ商品を再度スキャンすると数量が1つ増えます。数量は手動でも調整可能です。</li>
          <li><strong>出庫を完了:</strong> リストの内容が正しければ、「出庫を完了する」ボタンを押して在庫を更新します。</li>
      </ol>
    </PageGuide>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* --- Left Column: Cart --- */}
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-700 flex items-center">
                <ShoppingCartIcon className="h-6 w-6 mr-2 text-slate-500"/>
                出庫リスト
            </h2>
            <span className="text-slate-600 font-medium bg-slate-100 px-3 py-1 rounded-full text-sm">合計 <span className="font-bold">{totalCartItems}</span> 点</span>
          </div>

          <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            {cart.length > 0 ? (
                <ul className="space-y-3">
                    {cart.map(({product, quantity}) => (
                        <li key={product.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                            <div className="flex-grow">
                                <p className="font-semibold text-slate-800">{product.name}</p>
                                <p className="text-sm text-slate-500">{product.barcode}</p>
                                <p className="text-sm text-slate-600 mt-1">
                                    店舗在庫: <span className={`font-bold ${product.currentStock < product.minimumStock ? 'text-red-600' : 'text-slate-800'}`}>{product.currentStock}</span>
                                </p>
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
                    <p className="font-semibold">商品をスキャンしてください</p>
                    <p className="text-sm">スキャンした商品がここに追加されます。</p>
                </div>
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-200">
             <button
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={cart.length === 0 || isProcessing || !isStoreSelected}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? '処理中...' : `${totalCartItems} 点の出庫を完了する`}
            </button>
          </div>
      </div>
      
      {/* --- Right Column: Controls --- */}
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-800 lg:hidden">出庫処理</h1>
        
        {/* Operator Selection */}
        <div className="bg-white p-4 rounded-lg shadow-md">
            <label htmlFor="staff-select" className="block text-sm font-medium text-slate-700 mb-1">
                <UserCircleIcon className="h-5 w-5 inline-block mr-2 align-middle text-slate-500" />
                {UI_TEXT.OPERATOR}
            </label>
            <select
                id="staff-select"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                disabled={isProcessing}
                className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
            >
                <option value="">担当者を選択...</option>
                {staffUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                ))}
            </select>
        </div>

        {/* Barcode Input */}
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
          <p className="text-slate-700 mb-4">合計 {totalCartItems} 点の商品を出庫します。この操作により在庫が更新されます。よろしいですか？</p>
          <ul className="max-h-60 overflow-y-auto space-y-2 mb-6 p-3 bg-slate-50 rounded-md border">
              {cart.map(item => (
                  <li key={item.product.id} className="flex justify-between items-center text-sm">
                      <span className="text-slate-800">{item.product.name}</span>
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
    </div>
  );
};

export default OutboundPage;