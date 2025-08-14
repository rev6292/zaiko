import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/apiClient';
import { UI_TEXT } from '../../constants';
import { KeyIcon } from '@heroicons/react/24/outline';
import PageGuide from '../../components/PageGuide';

const AdminProfilePage: React.FC = () => {
  const { currentUser, setCurrentUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmNewPassword) {
      setMessage({ type: 'error', text: UI_TEXT.PASSWORD_MISMATCH });
      return;
    }
    if (!newPassword || !currentPassword) {
      setMessage({ type: 'error', text: 'すべてのパスワードフィールドを入力してください。' });
      return;
    }
    if (!currentUser) {
      setMessage({ type: 'error', text: 'ユーザー情報が見つかりません。' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.put(`/users/admin/${currentUser.id}/password`, { currentPassword, newPassword });
      if (response.success) {
        setMessage({ type: 'success', text: response.message || UI_TEXT.PASSWORD_CHANGE_SUCCESS });
        await apiClient.post('/logs', { action: '管理者パスワードを変更', userId: currentUser.id });
        // Update user context if password hash is stored there (for mock)
        if (currentUser.hashedPassword) {
          setCurrentUser({ ...currentUser, hashedPassword: `${newPassword}_hashed_mock` });
        }
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setMessage({ type: 'error', text: response.message || UI_TEXT.INCORRECT_CURRENT_PASSWORD });
      }
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message || 'パスワードの変更中にエラーが発生しました。' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
       <PageGuide title="管理者情報変更の使い方">
        <p>ここでは、現在ログインしている管理者アカウントのパスワードを変更できます。</p>
        <ul className="list-decimal list-inside mt-2 space-y-1">
          <li>現在のパスワードを正確に入力してください。</li>
          <li>新しいパスワードを2回入力し、間違いがないか確認してください。</li>
          <li>「保存変更」ボタンを押すと、パスワードが更新されます。</li>
        </ul>
      </PageGuide>
      <h1 className="text-3xl font-semibold text-gray-800">{UI_TEXT.ADMIN_PROFILE_EDIT}</h1>
      
      <div className="bg-white p-8 rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">{UI_TEXT.CURRENT_PASSWORD}</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input 
                type="password" 
                name="currentPassword" 
                id="currentPassword" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required 
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-700 rounded-md py-2 bg-slate-900 text-white placeholder-slate-400"
                placeholder="現在のパスワード"
              />
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">{UI_TEXT.NEW_PASSWORD}</label>
             <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input 
                type="password" 
                name="newPassword" 
                id="newPassword" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required 
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-700 rounded-md py-2 bg-slate-900 text-white placeholder-slate-400"
                placeholder="新しいパスワード"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">{UI_TEXT.CONFIRM_PASSWORD}</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input 
                type="password" 
                name="confirmNewPassword" 
                id="confirmNewPassword" 
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required 
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-700 rounded-md py-2 bg-slate-900 text-white placeholder-slate-400"
                placeholder="新しいパスワード (確認)"
              />
            </div>
          </div>
          
          {message && (
            <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full sm:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {UI_TEXT.SAVE}変更
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminProfilePage;