
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PurchaseOrder, Supplier, CompanyInfo } from '../types';
import apiClient from '../services/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import { APP_TITLE, ROUTE_PATHS } from '../constants';
import { PrinterIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const PurchaseOrderPreviewPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
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
                const orderData = await apiClient.get(`/purchase-orders/${orderId}`);

                if (orderData) {
                    setOrder(orderData);
                    const [allSuppliers, companyData] = await Promise.all([
                        apiClient.get('/suppliers'),
                        apiClient.get('/company-info'),
                    ]);
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
                printWindow.document.write('<script src="https://cdn.tailwindcss.com/"></script>');
                printWindow.document.write('<style>@media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print-area { color: black !important; } }</style>');
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

    if (loading) return <div className="flex justify-center items-center h-screen bg-gray-100"><LoadingSpinner message="発注書を読み込んでいます..." /></div>;
    if (error) return <div className="flex justify-center items-center h-screen bg-gray-100"><div className="p-8 text-center text-red-600 font-semibold bg-red-100 rounded-lg shadow-md">{error}</div></div>;
    if (!order || !supplierInfo) return <div className="flex justify-center items-center h-screen bg-gray-100"><div className="p-8 text-center text-gray-500 bg-gray-100 rounded-lg shadow-md">データが見つかりません。</div></div>;
        
    const totalAmount = order.items.reduce((sum, item) => sum + (item.costPriceAtOrder * item.quantity), 0);

    return (
        <div className="bg-gray-100 min-h-screen p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="no-print mb-6 flex justify-between items-center">
                    <Link to={`${ROUTE_PATHS.INTAKE}?tab=purchase`} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
                       <ArrowLeftIcon className="h-5 w-5"/>
                       発注管理に戻る
                    </Link>
                     <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md shadow-sm transition-colors"
                    >
                        <PrinterIcon className="h-5 w-5" />
                        印刷 / PDF保存
                    </button>
                </div>

                <div className="bg-white shadow-lg p-6 sm:p-10" id="po-preview-content">
                    <div className="print-area">
                        <header className="flex justify-between items-start pb-4 mb-6 border-b-2 border-black">
                            <div>
                                <h1 className="text-4xl font-bold text-black">発注書</h1>
                                <p className="text-sm mt-1 text-black">Purchase Order</p>
                            </div>
                           {companyInfo ? (
                                <div className="text-right text-black">
                                    <p className="font-semibold">{companyInfo.name}</p>
                                    <p className="text-sm">{companyInfo.address}</p>
                                    <p className="text-sm">TEL: {companyInfo.phone}{companyInfo.fax ? ` / FAX: ${companyInfo.fax}`: ''}</p>
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
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderPreviewPage;
