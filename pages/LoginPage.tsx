import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { APP_TITLE } from '../constants';
import { KeyIcon, UserIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(userId, password);
      // On successful login, the App component will automatically navigate away
    } catch (err) {
      setError((err as Error).message || 'ログインに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-800">
                {APP_TITLE}
            </h1>
            <p className="mt-2 text-slate-500">
                在庫管理を、もっとインテリジェントに。
            </p>
        </div>
        <div className="bg-white shadow-2xl rounded-2xl p-8 space-y-6">
            <h2 className="text-center text-xl font-semibold text-slate-700">ログイン</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
                <label htmlFor="userId" className="sr-only">ユーザーID</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                    id="userId"
                    name="userId"
                    type="text"
                    autoComplete="username"
                    required
                    className="block w-full px-3 py-2 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 bg-white rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                    placeholder="ユーザーID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    />
                </div>
            </div>
            <div>
                <label htmlFor="password-input" className="sr-only">パスワード</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <KeyIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                    id="password-input"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="block w-full px-3 py-2 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 bg-white rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                    placeholder="パスワード"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    <ExclamationCircleIcon className="h-5 w-5 mr-2" />
                    {error}
                </div>
            )}

            <div>
                <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-sky-400 disabled:cursor-not-allowed transition-colors"
                >
                {isLoading ? <LoadingSpinner size="sm" /> : 'ログイン'}
                </button>
            </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;