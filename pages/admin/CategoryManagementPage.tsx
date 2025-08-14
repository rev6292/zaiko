import React, { useState, useEffect, useCallback } from 'react';
import { Category } from '../../types';
import apiClient from '../../services/apiClient';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { UI_TEXT } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { PlusCircleIcon, PencilIcon, TrashIcon, FolderIcon, FolderOpenIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import PageGuide from '../../components/PageGuide';

// --- Category Form Component ---
const initialCategoryFormState: Omit<Category, 'id'> = {
  name: '',
  parentId: null,
};

interface CategoryFormProps {
  category?: Category | null;
  categories: Category[]; // All categories for parent selection
  onSave: (category: Category | Omit<Category, 'id'>) => void;
  onCancel: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ category, categories, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Category | Omit<Category, 'id'>>(
    category ? { ...initialCategoryFormState, ...category } : initialCategoryFormState
  );

  useEffect(() => {
    setFormData(category ? { ...initialCategoryFormState, ...category } : initialCategoryFormState);
  }, [category]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  
  const hierarchicalParentOptions = React.useMemo(() => {
    // Filter out the current category and its descendants from being a possible parent
    let availableCategories = categories;
    if (category?.id) {
        const descendantIds = new Set<string>();
        const findDescendants = (parentId: string) => {
            categories.filter(c => c.parentId === parentId).forEach(child => {
                descendantIds.add(child.id);
                findDescendants(child.id);
            });
        };
        findDescendants(category.id);
        descendantIds.add(category.id); // Add itself
        availableCategories = categories.filter(c => !descendantIds.has(c.id));
    }

    const buildHierarchy = (items: Category[], parentId: string | null, level: number): { id: string, name: string, level: number }[] => {
      return items
        .filter(c => c.parentId === parentId)
        .sort((a,b) => a.name.localeCompare(b.name))
        .flatMap(child => [
          { id: child.id, name: child.name, level },
          ...buildHierarchy(items, child.id, level + 1)
        ]);
    };
    
    return buildHierarchy(availableCategories, null, 0);

  }, [categories, category]);


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">{UI_TEXT.CATEGORY_NAME}</label>
        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm bg-slate-900 text-white placeholder-slate-400 border-slate-700 focus:ring-indigo-500 focus:border-indigo-500" />
      </div>
      <div>
        <label htmlFor="parentId" className="block text-sm font-medium text-gray-700">{UI_TEXT.PARENT_CATEGORY}</label>
        <select name="parentId" id="parentId" value={formData.parentId || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm bg-slate-900 text-white border-slate-700 focus:ring-indigo-500 focus:border-indigo-500">
          <option value="">{UI_TEXT.NO_PARENT_CATEGORY}</option>
          {hierarchicalParentOptions.map(c => (
             <option key={c.id} value={c.id}>
              {''.padStart(c.level * 2, '\u00A0\u00A0')}{c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm">{UI_TEXT.CANCEL}</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-md shadow-sm">{UI_TEXT.SAVE}</button>
      </div>
    </form>
  );
};


// --- Main Page Component ---
const CategoryManagementPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState<Category | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.get('/categories');
            setCategories(data);
        } catch (err) {
            setError(UI_TEXT.ERROR_LOADING_DATA);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleOpenModal = (category?: Category | null) => {
        setEditingCategory(category || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    const handleSaveCategory = async (categoryData: Category | Omit<Category, 'id'>) => {
        setLoading(true);
        try {
            if ('id' in categoryData) {
                await apiClient.put(`/categories/${(categoryData as Category).id}`, categoryData);
                await apiClient.post('/logs', { action: `カテゴリ ${categoryData.name} を更新`, userId: currentUser?.id });
            } else {
                await apiClient.post('/categories', categoryData);
                 await apiClient.post('/logs', { action: `カテゴリ ${categoryData.name} を新規追加`, userId: currentUser?.id });
            }
            fetchCategories();
            handleCloseModal();
        } catch (err) {
            setError(`エラー: カテゴリの保存に失敗しました。${(err as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategory = async (category: Category) => {
        if (!category) return;
        setLoading(true);
        try {
            await apiClient.delete(`/categories/${category.id}`);
            await apiClient.post('/logs', { action: `カテゴリ ${category.name} を削除`, userId: currentUser?.id });
            fetchCategories();
            setShowConfirmDelete(null);
        } catch (err) {
            setError(`エラー: カテゴリの削除に失敗しました。${(err as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (categoryId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };
    
    const renderCategoryRow = (category: Category, level: number) => {
        const children = categories.filter(c => c.parentId === category.id);
        const isExpanded = expandedRows.has(category.id);

        return (
            <React.Fragment key={category.id}>
                <tr className="bg-white hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
                            {children.length > 0 ? (
                                <button onClick={() => toggleRow(category.id)} className="mr-2 p-1 rounded-full hover:bg-gray-200">
                                    {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                                </button>
                            ) : (
                              <span className="inline-block w-8"></span>
                            )}
                             <span className="flex items-center">
                                {isExpanded ? <FolderOpenIcon className="h-5 w-5 mr-2 text-yellow-500"/> : <FolderIcon className="h-5 w-5 mr-2 text-sky-500"/>}
                                {category.name}
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{category.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end items-center space-x-2">
                             <button onClick={() => handleOpenModal(category)} className="text-indigo-600 hover:text-indigo-900 p-1" title={UI_TEXT.EDIT}><PencilIcon className="h-5 w-5" /></button>
                             <button onClick={() => setShowConfirmDelete(category)} className="text-red-600 hover:text-red-900 p-1" title={UI_TEXT.DELETE}><TrashIcon className="h-5 w-5" /></button>
                        </div>
                    </td>
                </tr>
                {isExpanded && children.sort((a,b) => a.name.localeCompare(b.name)).map(child => renderCategoryRow(child, level + 1))}
            </React.Fragment>
        );
    };


    return (
        <div className="space-y-6">
            <PageGuide title="カテゴリ管理の使い方">
                <p>商品カテゴリを階層構造で管理します。例えば、「ヘアケア」という親カテゴリの下に「シャンプー」「トリートメント」という子カテゴリを作成できます。</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>新規追加:</strong> 右上のボタンから新しいカテゴリを作成します。作成時に親カテゴリを指定することで、階層を作ることができます。</li>
                <li><strong>編集・削除:</strong> 各カテゴリの右側にあるアイコンから操作します。子カテゴリや商品が紐づいているカテゴリは削除できません。</li>
                <li><strong>階層表示:</strong> カテゴリ名の左にある矢印アイコンで、子カテゴリの表示/非表示を切り替えられます。</li>
                </ul>
            </PageGuide>
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-semibold text-gray-800">カテゴリ管理</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors"
                >
                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                    新規カテゴリ追加
                </button>
            </div>
            
            {error && <p className="text-red-500 p-4 bg-red-100 rounded-md">{error}</p>}
            
            <div className="overflow-x-auto bg-white shadow-md rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">カテゴリ名</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={3} className="text-center py-8"><LoadingSpinner message={UI_TEXT.LOADING} /></td></tr>
                        ) : (
                            categories.filter(c => c.parentId === null).sort((a,b) => a.name.localeCompare(b.name)).map(rootCategory => renderCategoryRow(rootCategory, 0))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCategory ? "カテゴリ編集" : "新規カテゴリ追加"}>
                    <CategoryForm
                        category={editingCategory}
                        categories={categories}
                        onSave={handleSaveCategory}
                        onCancel={handleCloseModal}
                    />
                </Modal>
            )}

            {showConfirmDelete && (
                <Modal isOpen={!!showConfirmDelete} onClose={() => setShowConfirmDelete(null)} title={UI_TEXT.CONFIRM_DELETE_TITLE}>
                    <p className="text-gray-700 mb-2">{UI_TEXT.CONFIRM_DELETE_MESSAGE(showConfirmDelete.name)}</p>
                    <p className="text-sm text-red-600">このカテゴリを親として使用している子カテゴリや、このカテゴリに紐づく商品がある場合は削除できません。</p>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button onClick={() => setShowConfirmDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm">{UI_TEXT.CANCEL}</button>
                        <button onClick={() => handleDeleteCategory(showConfirmDelete)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 border border-transparent rounded-md shadow-sm">{UI_TEXT.DELETE}</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CategoryManagementPage;