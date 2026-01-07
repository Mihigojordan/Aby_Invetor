// src/pages/UpdateStockRequisition.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Search, CheckCircle, X, ArrowLeft, Lock } from 'lucide-react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import requisitionService from '../../../services/stockRequisitionService';
import stockInService from '../../../services/stockinService';
import categoryService from '../../../services/categoryService';

const UpdateStockRequisition = ({role}) => {
  const { id } = useParams();
  const navigate = useNavigate();
;

  const [requisition, setRequisition] = useState(null);
  const [categories, setCategories] = useState([]);
  const [allStocks, setAllStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);

  const [formData, setFormData] = useState({
    description: '',
    items: []
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Load requisition
        const req = await requisitionService.getOne(id);
        setRequisition(req);

        // Initialize form
        setFormData({
          description: req.description || '',
          items: req.items.map(item => ({
            id: item.id || undefined,
            stockId: item.stockId || '',
            itemName: item.itemName || '',
            categoryId: item.categoryId || '',
            quantity: item.quantity || '',
            note: item.note || '',
            isEdited: false,
            isNew: false,
            remove: false
          }))
        });

        // Load categories
        const cats = await categoryService.getAllCategories();
        setCategories(cats || []);

        // Load stocks
        const stocks = await stockInService.getAllStockIns();
        setAllStocks(stocks || []);
        setFilteredStocks(stocks || []);
      } catch (err) {
        console.error('Failed to load data:', err);
        setErrors({ load: 'Failed to load requisition. Please try again.' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Filter stocks for modal
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStocks(allStocks);
      return;
    }
    const term = searchTerm.toLowerCase();
    const filtered = allStocks.filter(stock =>
      stock.product?.productName?.toLowerCase().includes(term) ||
      stock.sku?.toLowerCase().includes(term)
    );
    setFilteredStocks(filtered);
  }, [searchTerm, allStocks]);

  const canEdit = requisition?.status === 'PENDING';

  // Prevent duplicate stock selection
  const isStockAlreadySelected = (stockId, currentIndex) => {
    if (!stockId) return false;
    return formData.items.some((item, idx) =>
      idx !== currentIndex && item.stockId === stockId && !item.remove
    );
  };

  const openStockModal = (index) => {
    if (!canEdit) return;
    setSelectedItemIndex(index);
    setSearchTerm('');
    setShowStockModal(true);
  };

  const selectStock = (stock) => {
    if (selectedItemIndex === null || !canEdit) return;

    if (isStockAlreadySelected(stock.id, selectedItemIndex)) {
      setErrors(prev => ({
        ...prev,
        [`items.${selectedItemIndex}.stockId`]: 'This stock item is already selected in another active row.'
      }));
      setShowStockModal(false);
      setSelectedItemIndex(null);
      return;
    }

    const newItems = [...formData.items];
    newItems[selectedItemIndex] = {
      ...newItems[selectedItemIndex],
      stockId: stock.id,
      itemName: stock.product?.productName || '',
      categoryId: stock.product?.categoryId || '',
      isEdited: true
    };

    setFormData(prev => ({ ...prev, items: newItems }));
    setShowStockModal(false);
    setSelectedItemIndex(null);
  };

  const clearStockSelection = (index) => {
    if (!canEdit) return;
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      stockId: '',
      itemName: newItems[index].itemName || '',
      categoryId: '',
      isEdited: true
    };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleInputChange = (e) => {
    if (!canEdit) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    if (!canEdit) return;
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value, isEdited: true };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    if (!canEdit) return;
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          stockId: '',
          itemName: '',
          categoryId: '',
          quantity: '',
          note: '',
          isNew: true,
          isEdited: false,
          remove: false
        }
      ]
    }));
  };

  const markForRemoval = (index) => {
    if (!canEdit) return;
    const newItems = [...formData.items];
    newItems[index].remove = !newItems[index].remove;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeNewItem = (index) => {
    if (!canEdit) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    const activeItems = formData.items.filter(i => !i.remove);

    if (activeItems.length === 0) {
      newErrors.items = 'At least one active item is required';
    }

    activeItems.forEach((item, idx) => {
      const originalIndex = formData.items.indexOf(item);

      if (!item.itemName.trim()) {
        newErrors[`items.${originalIndex}.itemName`] = 'Item name is required';
      }
      if (!item.categoryId) {
        newErrors[`items.${originalIndex}.categoryId`] = 'Category is required';
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        newErrors[`items.${originalIndex}.quantity`] = 'Valid quantity is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      setErrors({ submit: 'Cannot update requisition with current status' });
      return;
    }
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        description: formData.description || undefined,
        items: formData.items.map(item => {
          if (item.remove && item.id) {
            return { id: item.id, remove: true };
          }
          const data = {
            itemName: item.itemName.trim(),
            quantity: parseFloat(item.quantity),
            categoryId: item.categoryId,
            note: item.note || undefined,
            stockId: item.stockId || undefined
          };
          if (item.id && !item.isNew) data.id = item.id;
          return data;
        }).filter(Boolean)
      };

      await requisitionService.update(id, payload);
      setSubmitSuccess(true);
      setTimeout(() => navigate(`/${role}/dashboard/stock-requisition`), 2000);
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to update stock requisition.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStockInfo = (stockId) => allStocks.find(s => s.id === stockId) || null;

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      REJECTED: 'bg-red-100 text-red-800',
      PARTIALLY_RECEIVED: 'bg-orange-100 text-orange-800',
      FULLY_RECEIVED: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="max-h-[90vh] overflow-y-auto bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (errors.load || !requisition) {
    return (
      <div className="max-h-[90vh] overflow-y-auto bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-800">Error Loading Requisition</p>
          <p className="text-gray-600 mt-2">{errors.load || 'Requisition not found'}</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-50 py-8 px-4">
      <div className=" mx-auto">
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Requisitions
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-6 border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Stock Requisition #{requisition.id.slice(-8)}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Created: {new Date(requisition.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(requisition.status)}`}>
              {requisition.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
            <div>
              <p className="text-sm text-gray-500">Requested By</p>
              <p className="font-semibold text-gray-900">
                {requisition.employee?.firstname} {requisition.employee?.lastname}
              </p>
              <p className="text-sm text-gray-600">{requisition.employee?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Employee ID</p>
              <p className="font-mono text-gray-700">{requisition.employee?.id}</p>
            </div>
          </div>
        </div>

        {/* Edit Warning */}
        {!canEdit && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start">
            <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-amber-900">Editing Disabled</h3>
              <p className="text-sm text-amber-800 mt-1">
                This requisition has status <strong>{requisition.status}</strong>. Only PENDING requisitions can be updated.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md">
          <div className="border-b px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Update Stock Requisition</h1>
            <p className="text-sm text-gray-600 mt-1">
              {canEdit ? 'Modify items, quantities, or add new ones' : 'View requisition details'}
            </p>
          </div>

          {submitSuccess && (
            <div className="mx-6 mt-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-green-800">Requisition updated successfully!</p>
                <p className="text-sm text-green-700">Redirecting to dashboard...</p>
              </div>
            </div>
          )}

          {errors.submit && (
            <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
              <p className="text-red-800">{errors.submit}</p>
            </div>
          )}

          <div className="p-6 space-y-8">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-gray-400">(Optional)</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                disabled={!canEdit}
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  !canEdit ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'
                }`}
                placeholder="Purpose of this requisition..."
              />
            </div>

            {/* Items */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Requisition Items</h2>
                {canEdit && (
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Item
                  </button>
                )}
              </div>

              {errors.items && <p className="text-sm text-red-600 mb-4">{errors.items}</p>}

              <div className="space-y-6">
                {formData.items.map((item, index) => {
                  const stockInfo = item.stockId ? getStockInfo(item.stockId) : null;
                  const isMarkedForRemoval = item.remove;

                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-6 transition-all ${
                        isMarkedForRemoval
                          ? 'bg-red-50 border-red-300 opacity-70'
                          : item.isNew
                          ? 'bg-green-50 border-green-300'
                          : item.isEdited
                          ? 'bg-yellow-50 border-yellow-300'
                          : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-gray-800">Item {index + 1}</h3>
                          {item.isNew && <span className="text-xs px-3 py-1 bg-green-600 text-white rounded-full">NEW</span>}
                          {item.isEdited && !item.isNew && <span className="text-xs px-3 py-1 bg-yellow-600 text-white rounded-full">EDITED</span>}
                          {isMarkedForRemoval && <span className="text-xs px-3 py-1 bg-red-600 text-white rounded-full">TO REMOVE</span>}
                        </div>

                        {canEdit && (
                          <div className="flex gap-2">
                            {item.id && !item.isNew && (
                              <button
                                type="button"
                                onClick={() => markForRemoval(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                {isMarkedForRemoval ? <X className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                              </button>
                            )}
                            {item.isNew && (
                              <button
                                type="button"
                                onClick={() => removeNewItem(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {!isMarkedForRemoval && (
                        <>
                          {/* Stock Selection */}
                          <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select from Existing Stock <span className="text-gray-400">(Optional)</span>
                            </label>

                            {!stockInfo ? (
                              <button
                                type="button"
                                onClick={() => openStockModal(index)}
                                disabled={!canEdit}
                                className={`w-full px-4 py-3 border-2 border-dashed rounded-lg text-left flex items-center justify-between ${
                                  !canEdit
                                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                                    : 'border-gray-400 hover:border-blue-500 hover:bg-blue-50'
                                }`}
                              >
                                <span className="text-gray-500">Choose from available stock</span>
                                <Search className="h-5 w-5 text-gray-400" />
                              </button>
                            ) : (
                              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold text-gray-900">{stockInfo.product?.productName}</p>
                                    <p className="text-sm text-gray-600 mt-1">SKU: {stockInfo.sku}</p>
                                    <p className="text-sm text-gray-600">Available: {stockInfo.quantity}</p>
                                  </div>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => clearStockSelection(index)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <X className="h-5 w-5" />
                                    </button>
                                  )}
                                </div>
                                {errors[`items.${index}.stockId`] && (
                                  <p className="mt-3 text-sm text-red-600">{errors[`items.${index}.stockId`]}</p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Item Name */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Item Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={item.itemName}
                                onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                                disabled={!canEdit || !!item.stockId}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                  errors[`items.${index}.itemName`] ? 'border-red-500' : 'border-gray-300'
                                } ${(!canEdit || !!item.stockId) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                placeholder="Enter item name"
                              />
                              {errors[`items.${index}.itemName`] && (
                                <p className="mt-1 text-sm text-red-600">{errors[`items.${index}.itemName`]}</p>
                              )}
                            </div>

                            {/* Category */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={item.categoryId}
                                onChange={(e) => handleItemChange(index, 'categoryId', e.target.value)}
                                disabled={!canEdit || !!item.stockId}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                  errors[`items.${index}.categoryId`] ? 'border-red-500' : 'border-gray-300'
                                } ${(!canEdit || !!item.stockId) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              >
                                <option value="">Select category</option>
                                {categories.map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                              {errors[`items.${index}.categoryId`] && (
                                <p className="mt-1 text-sm text-red-600">{errors[`items.${index}.categoryId`]}</p>
                              )}
                            </div>

                            {/* Quantity */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                disabled={!canEdit}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                  errors[`items.${index}.quantity`] ? 'border-red-500' : 'border-gray-300'
                                } ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              />
                              {errors[`items.${index}.quantity`] && (
                                <p className="mt-1 text-sm text-red-600">{errors[`items.${index}.quantity`]}</p>
                              )}
                            </div>

                            {/* Note */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Note <span className="text-gray-400">(Optional)</span>
                              </label>
                              <input
                                type="text"
                                value={item.note}
                                onChange={(e) => handleItemChange(index, 'note', e.target.value)}
                                disabled={!canEdit}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                  !canEdit ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-gray-300'
                                }`}
                                placeholder="Additional instructions"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              {canEdit && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Requisition'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Stock Selection Modal */}
      {showStockModal && canEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-semibold">Select Stock Item</h3>
              <button onClick={() => setShowStockModal(false)}>
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or SKU..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {filteredStocks.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No matching items' : 'No stock available'}
                  </p>
                ) : (
                  filteredStocks.map(stock => {
                    const isDuplicate = isStockAlreadySelected(stock.id, selectedItemIndex);

                    return (
                      <button
                        key={stock.id}
                        type="button"
                        onClick={() => !isDuplicate && selectStock(stock)}
                        disabled={isDuplicate}
                        className={`w-full p-5 text-left border rounded-lg transition-all ${
                          isDuplicate
                            ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
                            : 'hover:bg-blue-50 hover:border-blue-500 border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-900">{stock.product?.productName}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              SKU: {stock.sku} • Available: {stock.quantity}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Category: {stock.product?.category?.name || 'Uncategorized'}
                            </p>
                          </div>
                          {isDuplicate && <span className="text-red-600 text-sm font-medium">Already selected</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateStockRequisition;