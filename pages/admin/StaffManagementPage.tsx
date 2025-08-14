import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, TableHeader, Store } from '../../types';
import apiClient from '../../services/apiClient';
import Modal from '../../components/Modal';
import Table from '../../components/Table';
import LoadingSpinner from '../../components/LoadingSpinner';
import { UI_TEXT } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { PlusCircleIcon, PencilIcon, TrashIcon, ShieldCheckIcon, UserIcon, BuildingStorefrontIcon, StarIcon } from '@heroicons/react/24/outline';

interface StaffFormState extends Omit<User, 'id' | 'hashedPassword'> {
  password?: string;
  confirmPassword?: string;
}

const initialStaffFormState: StaffFormState = {
  name: '',
  role: UserRole.STAFF,
  storeId: '',
  password: '',
  confirmPassword: '',
};

interface StaffFormProps {
  staffMember?: User | null;
  stores: Store[];
  onSave: (staffData: StaffFormState, originalId?: string) => void;
  onCancel: () => void;
}

const StaffForm: React.FC<StaffFormProps> = ({ staffMember, stores, onSave, onCancel }) => {
  const [formData, setFormData] = useState<StaffFormState>(initialStaffFormState);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (staffMember) {
      setFormData({
        name: staffMember.name,
        role: staffMember.role,
        storeId: staffMember.storeId || '',
        password: '', // Password fields are for changing/setting new, not displaying existing
        confirmPassword: '',
      });
    } else {
      setFormData(initialStaffFormState);
    }
    setPasswordError(null);
  }, [staffMember]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'password' || name === 'confirmPassword') {
      setPasswordError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password || (!staffMember && !formData.password)) { // Password required for new user or if password field is touched
        if (formData.password !== formData.confirmPassword) {
            setPasswordError('パスワードが一致しません。');
            return;
        }
    }
    setPasswordError(null);
    onSave(formData, staffMember?.id);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">{UI_TEXT.STAFF_NAME}</label>
        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-900 text-white placeholder-slate-400" />
      </div>
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">{UI_TEXT.ROLE}</label>
        <select name="role" id="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-700 bg-slate-900 text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value={UserRole.STAFF}>{UserRole.STAFF}</option>
          <option value={UserRole.AUJUA_STAFF}>{UserRole.AUJUA_STAFF}</option>
          <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
        </select>
      </div>
      <div>
        <label htmlFor="storeId" className="block text-sm font-medium text-gray-700">{UI_TEXT.ASSIGNED_STORE}</label>
        <select name="storeId" id="storeId" value={formData.storeId} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-700 bg-slate-900 text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="">{UI_TEXT.NO_STORE_ASSIGNED}</option>
          {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
        </select>
         <p className="text-sm text-gray-400 mt-1">スタッフ権限のユーザーは、所属店舗のデータのみアクセス可能になります。</p>
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          {staffMember ? '新しいパスワード (変更する場合のみ)' : UI_TEXT.PASSWORD}
        </label>
        <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} placeholder={staffMember ? "変更する場合のみ入力" : ""} className="mt-1 block w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-900 text-white placeholder-slate-400" />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          {staffMember ? '新しいパスワード (確認)' : UI_TEXT.CONFIRM_PASSWORD}
        </label>
        <input type="password" name="confirmPassword" id="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder={staffMember ? "変更する場合のみ入力" : ""} className="mt-1 block w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-900 text-white placeholder-slate-400" />
      </div>
      {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm">{UI_TEXT.CANCEL}</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-md shadow-sm">{UI_TEXT.SAVE}</button>
      </div>
    </form>
  );
};


const StaffManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [staffList, setStaffList] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<User | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [users, storesData] = await Promise.all([
          apiClient.get('/users/staff'),
          apiClient.get('/stores')
      ]);
      setStaffList(users.filter((user: User) => user.id !== currentUser?.id));
      setStores(storesData);
    } catch (err) {
      setError(UI_TEXT.ERROR_LOADING_DATA);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (staff?: User) => {
    setEditingStaff(staff || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
  };

  const handleSaveStaff = async (staffData: StaffFormState, originalId?: string) => {
    setLoading(true);
    setError(null);
    try {
      if (originalId) { // Editing existing staff
        const staffToUpdate: User & {newPassword?: string} = {
            id: originalId, 
            name: staffData.name,
            role: staffData.role,
            storeId: staffData.storeId,
            ...(staffData.password && { newPassword: staffData.password }) // Include newPassword only if provided
        };
        await apiClient.put(`/users/staff/${originalId}`, staffToUpdate);
        await apiClient.post('/logs', { action: `スタッフ ${staffData.name} の情報を更新`, userId: currentUser?.id });
      } else { // Adding new staff
        if (!staffData.password) {
            setError("新規スタッフ登録にはパスワードが必須です。");
            setLoading(false);
            return;
        }
        await apiClient.post('/users/staff', staffData);
        await apiClient.post('/logs', { action: `スタッフ ${staffData.name} を新規追加`, userId: currentUser?.id });
      }
      fetchData();
      handleCloseModal();
    } catch (err) {
      setError(`エラー: スタッフ情報の保存に失敗しました。(${(err as Error).message})`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (staff: User) => {
    if (!staff || staff.id === currentUser?.id) { // Prevent self-delete from this interface
        setError("自分自身をこの画面から削除することはできません。");
        return;
    }
    setLoading(true);
    try {
      await apiClient.delete(`/users/staff/${staff.id}`);
      await apiClient.post('/logs', { action: `スタッフ ${staff.name} を削除`, userId: currentUser?.id });
      fetchData();
      setShowConfirmDelete(null);
    } catch (err) {
      setError(`エラー: スタッフの削除に失敗しました。(${(err as Error).message})`);
    } finally {
      setLoading(false);
    }
  };
  
  const tableHeaders: TableHeader<User>[] = [
    { 
      key: 'name', 
      label: UI_TEXT.STAFF_NAME,
      render: (item) => (
        <div className="flex items-center">
          {item.role === UserRole.ADMIN 
            ? <ShieldCheckIcon className="h-5 w-5 mr-2 text-sky-600"/> 
            : item.role === UserRole.AUJUA_STAFF
            ? <StarIcon className="h-5 w-5 mr-2 text-yellow-500" />
            : <UserIcon className="h-5 w-5 mr-2 text-gray-500"/>
          }
          {item.name}
        </div>
      )
    },
    { 
      key: 'role', 
      label: UI_TEXT.ROLE,
      render: (item) => (
        <span className={`px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
            item.role === UserRole.ADMIN ? 'bg-sky-100 text-sky-800' 
            : item.role === UserRole.AUJUA_STAFF ? 'bg-yellow-100 text-yellow-800'
            : 'bg-green-100 text-green-800'
        }`}>
          {item.role}
        </span>
      )
    },
    {
        key: 'storeId',
        label: UI_TEXT.ASSIGNED_STORE,
        render: (item) => {
            const store = stores.find(s => s.id === item.storeId);
            return store ? (
                <span className="flex items-center text-sm text-gray-600">
                    <BuildingStorefrontIcon className="h-4 w-4 mr-1.5 text-gray-400"/>
                    {store.name}
                </span>
            ) : <span className="text-sm text-gray-400">{UI_TEXT.NO_STORE_ASSIGNED}</span>;
        }
    },
    { key: 'actions', label: UI_TEXT.ACTIONS, render: (item) => (
      <div className="space-x-2">
        <button onClick={() => handleOpenModal(item)} className="text-indigo-600 hover:text-indigo-900 transition-colors p-1"><PencilIcon className="h-5 w-5"/></button>
        {item.id !== currentUser?.id && item.id !== 'admin' && ( // Prevent deleting the main admin or self
           <button onClick={() => setShowConfirmDelete(item)} className="text-red-600 hover:text-red-900 transition-colors p-1"><TrashIcon className="h-5 w-5"/></button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-gray-800">{UI_TEXT.STAFF_MANAGEMENT}</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors"
        >
          <PlusCircleIcon className="h-5 w-5 mr-2"/>
          {UI_TEXT.ADD_NEW}スタッフ
        </button>
      </div>

      {loading && <LoadingSpinner message={UI_TEXT.LOADING} />}
      {error && <p className="text-red-500 p-4 bg-red-100 rounded-md">{error}</p>}
      {!loading && !error && (
        <Table headers={tableHeaders} data={staffList} itemKey="id" />
      )}

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingStaff ? `${UI_TEXT.EDIT}スタッフ` : `${UI_TEXT.ADD_NEW}スタッフ`}>
          <StaffForm
            staffMember={editingStaff}
            stores={stores}
            onSave={handleSaveStaff}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}
      
      {showConfirmDelete && (
        <Modal isOpen={!!showConfirmDelete} onClose={() => setShowConfirmDelete(null)} title={UI_TEXT.CONFIRM_DELETE_TITLE}>
          <p className="text-gray-700 mb-6">{UI_TEXT.CONFIRM_DELETE_MESSAGE(showConfirmDelete.name)}</p>
          <div className="flex justify-end space-x-3">
            <button onClick={() => setShowConfirmDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm">{UI_TEXT.CANCEL}</button>
            <button onClick={() => handleDeleteStaff(showConfirmDelete)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 border border-transparent rounded-md shadow-sm">{UI_TEXT.DELETE}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StaffManagementPage;