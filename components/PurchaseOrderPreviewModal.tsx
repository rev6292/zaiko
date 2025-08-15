import React, { useState, useEffect } from 'react';
import { PurchaseOrder, Supplier, CompanyInfo } from '../types';
import { apiClient } from '../services/apiClient';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import { APP_TITLE } from '../constants';
import { PrinterIcon } from '@heroicons/react/24/outline';

interface PurchaseOrderPreviewModalProps {
  orderId: string;
  onClose: () => void;
}

const PurchaseOrderPreviewModal: React.FC<PurchaseOrderPreviewModalProps> = ({ orderId, onClose }) => {
    const [order, setOrder] = useState<PurchaseOrder | null>(null);
    const [supplierInfo, setSupplierInfo] = useState<Supplier | null>(null);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            if (!orderId) {
                setError("発注IDが指定されていません。");
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                 const orderResult = await apiClient.purchaseOrders.getById(orderId);
                 const orderData = orderResult.data as PurchaseOrder;

                if (orderData) {
                    setOrder(orderData);
                    const [allSuppliersResult, companyResult] = await Promise.all([
                        apiClient.suppliers.getAll(),
                        apiClient.company.get(),
                    ]);
                    const allSuppliers = allSuppliersResult.data as Supplier[];
                    const companyData = companyResult.data as CompanyInfo;
                    const supplierData = allSuppliers.find((s: Supplier) => s.id === orderData.supplierId);
                    setSupplierInfo(supplierData || null);
                    setCompanyInfo(companyData);
                } else {
                    setError("指定された発注書が見つかりません。");
                }
            } catch (err) {
                setError("発注書の読み込み中にエラーが発生しました。");
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetails();
    }, [orderId]);
    
    const handlePrint = () => {
        const printContent = document.getElementById('po-preview-content');
        if (printContent) {
            const printWindow = window.open('', '', 'height=800,width=800');
            if (printWindow) {
                printWindow.document.write('<html><head><title>発注書</title>');
                printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                printWindow.document.write('<style>body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print-area { color: black !important; }</style>');
                printWindow.document.write('</head><body>');
                printWindow.document.write(printContent.innerHTML);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 250);
            }
        }
    };
    
    const renderContent = () => {
        if (loading) return <LoadingSpinner message="発注書を読み込んでいます..." />;
        if (error) return <div className="p-8 text-center text-red-600 font-semibold">{error}</div>;
        if (!order || !supplierInfo) return <div className="p-8 text-center text-gray-500">データが見つかりません。</div>;
        
        const totalAmount = order.items.reduce((sum, item) => sum + (item.costPriceAtOrder * item.quantity), 0);
        
        return (
            <div className="p-4 sm:p-6 text-gray-800">
                <div id="po-preview-content" className="print-area">
                    <header className="flex justify-between items-start pb-4 mb-6 border-b-2 border-black">
                        <div>
                            <h1 className="text-4xl font-bold text-black">発注書</h1>
                            <p className="text-sm mt-1 text-black">Purchase Order</p>
                        </div>
                        {companyInfo ? (
                           <div className="text-right text-black">
                               <p className="font-semibold">{companyInfo.name}</p>
                               <p className="text-sm">{companyInfo.address}</p>
                               <p className="text-sm">TEL: {companyInfo.phone}{companyInfo.fax ? ` / FAX: ${companyInfo.fax}` : ''}</p>
                           </div>
                       ) : (
                           <div className="text-right text-black">
                               <p className="font-semibold">{APP_TITLE}</p>
                           </div>
                       )}
                    </header>

                    <section className="grid grid-cols-2 gap-8 mb-8 text-black">
                        <div className="space-y-2">
                            <p className="text-lg font-semibold border-b pb-1">{supplierInfo.name} 御中</p>
                            {supplierInfo.address && <p className="text-sm">〒 {supplierInfo.address}</p>}
                            {supplierInfo.contactPerson && <p className="text-sm">ご担当: {supplierInfo.contactPerson} 様</p>}
                            <p className="text-sm">TEL: {supplierInfo.phone || 'N/A'}</p>
                        </div>
                        <div className="space-y-2 text-right">
                            <p><strong>発注日:</strong> {new Date(order.orderDate).toLocaleDateString('ja-JP')}</p>
                            <p><strong>発注番号:</strong> {order.id}</p>
                        </div>
                    </section>
                    
                    <section className="mb-8">
                        <p className="mb-2 text-black">下記の通り発注いたします。</p>
                         <table className="w-full text-sm text-left border-collapse text-black">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="p-2 border border-gray-400 font-semibold">商品コード</th>
                                    <th className="p-2 border border-gray-400 font-semibold">商品名</th>
                                    <th className="p-2 border border-gray-400 font-semibold text-right">数量</th>
                                    <th className="p-2 border border-gray-400 font-semibold text-right">単価</th>
                                    <th className="p-2 border border-gray-400 font-semibold text-right">合計</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map(item => (
                                    <tr key={item.productId}>
                                        <td className="p-2 border border-gray-300">{item.barcode}</td>
                                        <td className="p-2 border border-gray-300">{item.productName}</td>
                                        <td className="p-2 border border-gray-300 text-right">{item.quantity}</td>
                                        <td className="p-2 border border-gray-300 text-right">¥{item.costPriceAtOrder.toLocaleString()}</td>
                                        <td className="p-2 border border-gray-300 text-right">¥{(item.costPriceAtOrder * item.quantity).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    <section className="flex justify-end mb-12 text-black">
                        <div className="w-full md:w-1/2">
                            <div className="flex justify-between p-2">
                                <span>小計</span>
                                <span>¥{totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between p-2">
                                <span>消費税 (10%)</span>
                                <span>¥{Math.floor(totalAmount * 0.1).toLocaleString()}</span>
                            </div>
                             <div className="flex justify-between p-2 bg-gray-200 mt-2">
                                <span className="font-bold text-lg">合計金額</span>
                                <span className="font-bold text-lg">¥{Math.floor(totalAmount * 1.1).toLocaleString()}</span>
                            </div>
                        </div>
                    </section>

                    <footer className="pt-4 border-t text-sm text-black">
                        <p>備考:</p>
                        <p className="mt-1 pl-2">・納品書を必ず商品に添付の上、上記納品先までご送付ください。</p>
                        <p className="pl-2">・本発注書に関するお問い合わせは、上記連絡先までお願いいたします。</p>
                    </footer>
                </div>
                 <div className="mt-6 text-center">
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 mx-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                    >
                        <PrinterIcon className="h-5 w-5" />
                        印刷 / PDF保存
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <Modal isOpen={true} onClose={onClose} title={`発注書プレビュー`} contentClassName="max-w-4xl">
            {renderContent()}
        </Modal>
    );
};

export default PurchaseOrderPreviewModal;