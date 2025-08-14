import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { PurchaseListItem, PurchaseOrder, PurchaseOrderItem, ProductWithStock } from '../types'; 
import apiClient from '../services/apiClient';

interface PurchaseListContextType {
  purchaseListItems: PurchaseListItem[];
  addToPurchaseList: (product: ProductWithStock, quantity: number) => void;
  removeFromPurchaseList: (productId: string, addedAt: string) => void;
  updateQuantity: (productId: string, quantity: number, addedAt: string) => void;
  getCartForSupplier: (supplierId: string) => PurchaseListItem[];
  getTotalItems: () => number; // 総アイテム数を取得する関数
  createPurchaseOrderFromCart: (supplierId: string, createdById: string, date: string, storeId: string) => Promise<PurchaseOrder>;
  createAllPurchaseOrdersForDate: (createdById: string, date: string, storeId: string) => Promise<PurchaseOrder[]>;
}

const PurchaseListContext = createContext<PurchaseListContextType | undefined>(undefined);

export const PurchaseListProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [purchaseListItems, setPurchaseListItems] = useState<PurchaseListItem[]>([]);

  const addToPurchaseList = useCallback((product: ProductWithStock, quantity: number) => {
    const today = new Date().toISOString().split('T')[0];
    setPurchaseListItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        item => item.product.id === product.id && item.addedAt === today
      );
      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        const newQuantity = updatedItems[existingItemIndex].quantity + quantity;
        updatedItems[existingItemIndex] = { ...updatedItems[existingItemIndex], quantity: Math.max(1, newQuantity) };
        return updatedItems;
      }
      return [...prevItems, { product, quantity: Math.max(1, quantity), supplierId: product.supplierId, addedAt: today }];
    });
  }, []);

  const removeFromPurchaseList = useCallback((productId: string, addedAt: string) => {
    setPurchaseListItems(prevItems => prevItems.filter(item => !(item.product.id === productId && item.addedAt === addedAt)));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, addedAt: string) => {
    setPurchaseListItems(prevItems =>
      prevItems.map(item =>
        (item.product.id === productId && item.addedAt === addedAt) ? { ...item, quantity: Math.max(0, quantity) } : item
      )
    );
  }, []);

  const getCartForSupplier = useCallback((supplierId: string) => {
    return purchaseListItems.filter(item => item.supplierId === supplierId);
  }, [purchaseListItems]);
  
  const createPurchaseOrderFromCart = useCallback(async (supplierId: string, createdById: string, date: string, storeId: string): Promise<PurchaseOrder> => {
    const itemsForOrder = purchaseListItems.filter(item => item.supplierId === supplierId && item.addedAt === date && item.quantity > 0);
    if (itemsForOrder.length === 0) throw new Error("カートに発注可能な（数量が1以上の）商品がありません。");
    
    const orderItems: PurchaseOrderItem[] = itemsForOrder.map(item => ({
        productId: item.product.id, productName: item.product.name, barcode: item.product.barcode,
        quantity: item.quantity, costPriceAtOrder: item.product.costPrice, isReceived: false,
    }));

    const orderPayload: Omit<PurchaseOrder, 'id'|'status'|'supplierName'> = {
        orderDate: new Date().toISOString().split('T')[0], supplierId, createdById, items: orderItems, storeId,
    };

    const newOrder = await apiClient.post('/purchase-orders', orderPayload);
    setPurchaseListItems(prevItems => prevItems.filter(item => !(item.supplierId === supplierId && item.addedAt === date)));
    return newOrder;
  }, [purchaseListItems]);
  
  const createAllPurchaseOrdersForDate = useCallback(async (createdById: string, date: string, storeId: string): Promise<PurchaseOrder[]> => {
    const itemsForDate = purchaseListItems.filter(item => item.addedAt === date && item.quantity > 0);
    if (itemsForDate.length === 0) throw new Error("カートに発注可能な（数量が1以上の）商品がありません。");
    
    const groupedBySupplier = itemsForDate.reduce<Record<string, PurchaseListItem[]>>((acc, item) => {
        if (!acc[item.supplierId]) acc[item.supplierId] = [];
        acc[item.supplierId].push(item);
        return acc;
    }, {});

    const createdOrders: PurchaseOrder[] = [];

    for (const supplierId in groupedBySupplier) {
        const itemsForOrder = groupedBySupplier[supplierId];
        
        const orderItems: PurchaseOrderItem[] = itemsForOrder.map(item => ({
            productId: item.product.id, productName: item.product.name, barcode: item.product.barcode,
            quantity: item.quantity, costPriceAtOrder: item.product.costPrice, isReceived: false,
        }));

        const orderPayload: Omit<PurchaseOrder, 'id'|'status'|'supplierName'> = {
            orderDate: new Date().toISOString().split('T')[0], supplierId, createdById, items: orderItems, storeId
        };
        const newOrder = await apiClient.post('/purchase-orders', orderPayload);
        createdOrders.push(newOrder);
    }
    
    setPurchaseListItems(prev => prev.filter(item => item.addedAt !== date));
    return createdOrders;
  }, [purchaseListItems]);

  const getTotalItems = useCallback((): number => {
    return purchaseListItems.length;
  }, [purchaseListItems]);

  const value = {
      purchaseListItems,
      addToPurchaseList,
      removeFromPurchaseList,
      updateQuantity,
      getCartForSupplier,
      getTotalItems,
      createPurchaseOrderFromCart,
      createAllPurchaseOrdersForDate,
  };

  return (
    <PurchaseListContext.Provider value={value}>
      {children}
    </PurchaseListContext.Provider>
  );
};

export const usePurchaseList = (): PurchaseListContextType => {
  const context = useContext(PurchaseListContext);
  if (context === undefined) {
    throw new Error('usePurchaseList must be used within a PurchaseListProvider');
  }
  return context;
};