import React, { useState, useEffect, useCallback } from 'react';
import { CompanyInfo } from '../../types';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { BuildingOffice2Icon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { UI_TEXT } from '../../constants';
import PageGuide from '../../components/PageGuide';

const CompanyInfoPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/company-info');
      setCompanyInfo(data);
    } catch (err) {
      setError('会社情報の読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (companyInfo) {
      const { name, value } = e.target;
      setCompanyInfo({ ...companyInfo, [name]: value });
    }
  };
  
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyInfo) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiClient.put('/company-info', companyInfo);
      await apiClient.post('/logs', { action: '会社情報を更新しました', userId: currentUser?.id });
      showSuccessMessage('会社情報が正常に更新されました。');
    } catch (err) {
      setError('情報の更新に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (loading) return <div className="p-8"><LoadingSpinner message="会社情報を読み込み中..." /></div>;

  return (
    <div className="space-y-6">
      <PageGuide title="会社情報管理の使い方">
        <p>ここで登録した会社名、住所、連絡先などの情報は、システムから生成される各種書類（例：発注書）に自動的に記載されます。</p>
        <p>正確な情報を入力することで、対外的な書類作成の手間を省き、プロフェッショナルな印象を与えることができます。</p>
      </PageGuide>
      <h1 className="text-3xl font-semibold text-gray-800">会社情報管理</h1>
      
       {error && <div className="p-3 my-4 bg-red-100 text-red-700 rounded-md flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5"/>{error}</div>}
      {successMessage && (
        <div className="p-3 my-4 bg-green-100 text-green-700 rounded-md flex items-center gap-2 animate-fadeInOut">
          <CheckCircleIcon className="h-5 w-5"/>{successMessage}
        </div>
      )}
      <style>{`
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; }
          10%, 90% { opacity: 1; }
        }
        .animate-fadeInOut { animation: fadeInOut 3s ease-in-out; }
      `}</style>
      
      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl">
         <div className="flex items-center text-gray-700 mb-6">
            <BuildingOffice2Icon className="h-8 w-8 mr-3 text-sky-600"/>
            <p>ここに登録された情報は、発注書などの書類に自動で反映されます。</p>
        </div>
        {companyInfo ? (
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">会社名 / 店舗名</label>
                    <input type="text" id="name" name="name" value={companyInfo.name} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">住所</label>
                    <input type="text" id="address" name="address" value={companyInfo.address} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">電話番号</label>
                        <input type="text" id="phone" name="phone" value={companyInfo.phone} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/>
                    </div>
                    <div>
                        <label htmlFor="fax" className="block text-sm font-medium text-gray-700">FAX番号</label>
                        <input type="text" id="fax" name="fax" value={companyInfo.fax || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/>
                    </div>
                </div>
                 <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700">ウェブサイト</label>
                    <input type="url" id="website" name="website" value={companyInfo.website || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                 <div>
                    <label htmlFor="representativeName" className="block text-sm font-medium text-gray-700">代表者名</label>
                    <input type="text" id="representativeName" name="representativeName" value={companyInfo.representativeName || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>

                <div className="pt-5 flex justify-end">
                    <button type="submit" disabled={isSaving} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-md shadow-sm disabled:opacity-50">
                        {isSaving ? <LoadingSpinner size="sm"/> : UI_TEXT.SAVE}
                    </button>
                </div>
            </form>
        ) : (
            <p>会社情報が見つかりません。</p>
        )}
      </div>
    </div>
  );
};

export default CompanyInfoPage;