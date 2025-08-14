import React, { useState, useEffect, useCallback } from 'react';
import { Store, TableHeader, UserRole } from '../../types';
import apiClient from '../../services/apiClient';
import Modal from '../../components/Modal';
import Table from '../../components/Table';
import LoadingSpinner from '../../components/LoadingSpinner';
import { UI_TEXT } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const initialStoreFormState: Omit<Store, 'id'> = {
  name: '',
  address: '',
  phone: '',
};

interface StoreFormProps {
  store?: Store | null;
  onSave: (storeData: Store | Omit<Store, 'id'>) => void;
  onCancel: () => void;
}

const StoreForm: React.FC<StoreFormProps> = ({ store, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Store | Omit<Store, 'id'>>(
    store ? { ...initialStoreFormState, ...store } : initialStoreFormState
  );

  useEffect(() => {
    setFormData(store ? { ...initialStoreFormState, ...store } : initialStoreFormState);
  }, [store]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">{UI_TEXT.STORE_NAME}</label>
        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-900 text-white placeholder-slate-400" />
      </div>
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">{UI_TEXT.STORE_ADDRESS}</label>
        <input type="text" name="address" id="address" value={formData.address || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-900 text-white placeholder-slate-400" />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">{UI_TEXT.STORE_PHONE}</label>
        <input type="tel" name="phone" id="phone" value={formData.phone || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-900 text-white placeholder-slate-400" />
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm">{UI_TEXT.CANCEL}</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-md shadow-sm">{UI_TEXT.SAVE}</button>
      </div>
    </form>
  );
};

const StoreManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<Store | null>(null);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get('/stores');
      setStores(data);
    } catch (err) {
      setError(UI_TEXT.ERROR_LOADING_DATA);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleOpenModal = (store?: Store) => {
    setEditingStore(store || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStore(null);
  };

  const handleSaveStore = async (storeData: Store | Omit<Store, 'id'>) => {
    setLoading(true);
    try {
      if ('id' in storeData) {
        await apiClient.put(`/stores/${(storeData as Store).id}`, storeData);
        await apiClient.post('/logs', { action: `店舗 ${storeData.name} の情報を更新`, userId: currentUser?.id });
      } else {
        await apiClient.post('/stores', storeData);
        await apiClient.post('/logs', { action: `店舗 ${storeData.name} を新規追加`, userId: currentUser?.id });
      }
      fetchStores();
      handleCloseModal();
    } catch (err) {
      setError(`エラー: 店舗情報の保存に失敗しました。${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = async (store: Store) => {
    if (!store) return;
    setLoading(true);
    try {
      await apiClient.delete(`/stores/${store.id}`);
      await apiClient.post('/logs', { action: `店舗 ${store.name} を削除`, userId: currentUser?.id });
      fetchStores();
      setShowConfirmDelete(null);
    } catch (err) {
      setError(`エラー: 店舗の削除に失敗しました。(${(err as Error).message})`);
    } finally {
      setLoading(false);
    }
  };
  
  const tableHeaders: TableHeader<Store>[] = [
    { key: 'name', label: UI_TEXT.STORE_NAME },
    { key: 'address', label: UI_TEXT.STORE_ADDRESS },
    { key: 'phone', label: UI_TEXT.STORE_PHONE },
    { key: 'actions', label: UI_TEXT.ACTIONS, render: (item) => (
      <div className="space-x-2">
        <button onClick={() => handleOpenModal(item)} className="text-indigo-600 hover:text-indigo-900 transition-colors p-1"><PencilIcon className="h-5 w-5"/></button>
        <button onClick={() => setShowConfirmDelete(item)} className="text-red-600 hover:text-red-900 transition-colors p-1"><TrashIcon className="h-5 w-5"/></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-gray-800">{UI_TEXT.STORE_MANAGEMENT}</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors"
        >
          <PlusCircleIcon className="h-5 w-5 mr-2"/>
          {UI_TEXT.ADD_NEW}店舗
        </button>
      </div>

      {loading && <LoadingSpinner message={UI_TEXT.LOADING} />}
      {error && <p className="text-red-500 p-4 bg-red-100 rounded-md">{error}</p>}
      {!loading && !error && (
        <Table headers={tableHeaders} data={stores} itemKey="id" onRowClick={handleOpenModal} />
      )}

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingStore ? `${UI_TEXT.EDIT}店舗` : `${UI_TEXT.ADD_NEW}店舗`}>
          <StoreForm
            store={editingStore}
            onSave={handleSaveStore}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}
      
      {showConfirmDelete && (
        <Modal isOpen={!!showConfirmDelete} onClose={() => setShowConfirmDelete(null)} title={UI_TEXT.CONFIRM_DELETE_TITLE}>
          <p className="text-gray-700 mb-2">{UI_TEXT.CONFIRM_DELETE_MESSAGE(showConfirmDelete.name)}</p>
          <p className="text-sm text-red-600">この店舗に所属するスタッフや在庫データがある場合、削除できません。先にスタッフの所属店舗を変更し、在庫を別店舗に移管または削除してください。</p>
          <div className="flex justify-end space-x-3 mt-6">
            <button onClick={() => setShowConfirmDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm">{UI_TEXT.CANCEL}</button>
            <button onClick={() => handleDeleteStore(showConfirmDelete)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 border border-transparent rounded-md shadow-sm">{UI_TEXT.DELETE}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StoreManagementPage;
