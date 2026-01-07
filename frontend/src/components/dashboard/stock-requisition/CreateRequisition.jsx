// src/pages/CreateStockRequisition.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Search, CheckCircle, X } from 'lucide-react';
import  useEmployeeAuth  from '../../../context/EmployeeAuthContext';
import requisitionService from '../../../services/stockRequisitionService';
import stockInService from '../../../services/stockinService';
import categoryService from '../../../services/categoryService';
import { useNavigate, useOutletContext } from 'react-router-dom';

const CreateStockRequisition = ({role}) => {
  const { user: employee } = useEmployeeAuth();
  const navigate = useNavigate();
 

  const [categories, setCategories] = useState([]);
  const [allStocks, setAllStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(true);

  const [formData, setFormData] = useState({
    description: '',
    items: [
      {
        stockId: '',
        itemName: '',
        categoryId: '',
        quantity: '',
        note: ''
      }
    ]
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load categories and stocks
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingCategories(true);
        const cats = await categoryService.getAllCategories();
        setCategories(cats || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
        setErrors(prev => ({ ...prev, categories: 'Failed to load categories' }));
      } finally {
        setLoadingCategories(false);
      }

      try {
        setLoadingStocks(true);
        const stocks = await stockInService.getAllStockInsWithCategoies();
        setAllStocks(stocks || []);
        setFilteredStocks(stocks || []);
      } catch (err) {
        console.error('Failed to load stocks:', err);
        setErrors(prev => ({ ...prev, stocks: 'Failed to load stock items' }));
      } finally {
        setLoadingStocks(false);
      }
    };

    loadData();
  }, []);

  // Filter stocks in modal
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

  const openStockModal = (index) => {
    setSelectedItemIndex(index);
    setSearchTerm('');
    setShowStockModal(true);
  };

  const selectStock = (stock) => {
    if (selectedItemIndex === null) return;

    // Prevent duplicate stock selection
    const alreadyUsed = formData.items.some(
      (item, i) => i !== selectedItemIndex && item.stockId === stock.id
    );

    if (alreadyUsed) {
      setErrors(prev => ({
        ...prev,
        [`items.${selectedItemIndex}.stockId`]: 'This stock item is already selected in another row.'
      }));
      setShowStockModal(false);
      setSelectedItemIndex(null);
      return;
    }

    const newItems = [...formData.items];
    newItems[selectedItemIndex] = {
      ...newItems[selectedItemIndex],
      stockId: stock.id,
      itemName: stock.product?.productName || 'Unknown Item',
      categoryId: stock.product?.categoryId || ''
    };

    setFormData(prev => ({ ...prev, items: newItems }));
    setShowStockModal(false);
    setSelectedItemIndex(null);

    // Clear any previous duplicate error
    setErrors(prev => {
      const newErr = { ...prev };
      delete newErr[`items.${selectedItemIndex}.stockId`];
      return newErr;
    });
  };

  const clearStockSelection = (index) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      stockId: '',
      itemName: '',
      categoryId: ''
    };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));

    if (errors[`items.${index}.${field}`]) {
      setErrors(prev => ({ ...prev, [`items.${index}.${field}`]: '' }));
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          stockId: '',
          itemName: '',
          categoryId: '',
          quantity: '',
          note: ''
        }
      ]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    formData.items.forEach((item, index) => {
      if (!item.itemName.trim()) {
        newErrors[`items.${index}.itemName`] = 'Item name is required';
      }
      if (!item.categoryId) {
        newErrors[`items.${index}.categoryId`] = 'Category is required';
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        newErrors[`items.${index}.quantity`] = 'Valid quantity is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      const payload = {
        description: formData.description || undefined,
        items: formData.items.map(item => ({
          stockId: item.stockId || undefined,
          itemName: item.itemName.trim(),
          categoryId: item.categoryId,
          quantity: parseFloat(item.quantity),
          note: item.note || undefined
        }))
      };

      await requisitionService.createStockRequisition(payload);
      setSubmitSuccess(true);
      navigate(`/${role}/dashboard/stock-requisition`);
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to create stock requisition' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStockInfo = (stockId) => {
    return allStocks.find(s => s.id === stockId) || null;
  };

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className=" mx-auto">
        {/* Employee Info */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Requesting Employee</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Name</p>
              <p className="font-semibold">{employee?.firstname} {employee?.lastname}</p>
            </div>
            <div>
              <p className="text-gray-600">Email</p>
              <p className="font-semibold">{employee?.email}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Create Stock Requisition</h1>
            <p className="mt-1 text-sm text-gray-600">Request items from inventory or new items</p>
          </div>

          {submitSuccess && (
            <div className="mx-6 mt-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-green-800">Requisition created successfully!</p>
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
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Purpose of this requisition..."
              />
            </div>

            {/* Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Requisition Items</h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Item
                </button>
              </div>

              <div className="space-y-6">
                {formData.items.map((item, index) => {
                  const stockInfo = item.stockId ? getStockInfo(item.stockId) : null;

                  return (
                    <div key={index} className="border border-gray-300 rounded-lg p-6 bg-gray-50">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium text-gray-800">Item {index + 1}</h3>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>

                      {/* Stock Selection */}
                      <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select from Existing Stock <span className="text-gray-400">(Optional)</span>
                        </label>

                        {!stockInfo ? (
                          <button
                            type="button"
                            onClick={() => openStockModal(index)}
                            disabled={loadingStocks}
                            className="w-full px-4 py-3 border border-dashed border-gray-400 rounded-lg text-left hover:border-blue-500 disabled:opacity-50 flex items-center justify-between"
                          >
                            <span className="text-gray-500">
                              {loadingStocks ? 'Loading stock...' : 'Choose from available stock'}
                            </span>
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
                              <button
                                type="button"
                                onClick={() => clearStockSelection(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="h-5 w-5" />
                              </button>
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
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              errors[`items.${index}.itemName`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter item name"
                            disabled={!!item.stockId}
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
                            disabled={!!item.stockId}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              errors[`items.${index}.categoryId`] ? 'border-red-500' : 'border-gray-300'
                            }`}
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
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              errors[`items.${index}.quantity`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="0.00"
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
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Additional instructions"
                          />
                        </div>
                      </div>
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
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Requisition'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Stock Selection Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Select Stock Item</h3>
                <button onClick={() => setShowStockModal(false)}>
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="relative mb-4">
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
                {loadingStocks ? (
                  <p className="text-center py-8 text-gray-500">Loading stock items...</p>
                ) : filteredStocks.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No matching items found' : 'No stock items available'}
                  </p>
                ) : (
                  filteredStocks.map(stock => {
                    const isSelected = formData.items[selectedItemIndex]?.stockId === stock.id;
                    const isDuplicate = formData.items.some(
                      (it, i) => i !== selectedItemIndex && it.stockId === stock.id
                    );

                    return (
                      <button
                        key={stock.id}
                        type="button"
                        onClick={() => !isDuplicate && selectStock(stock)}
                        disabled={isDuplicate}
                        className={`w-full p-5 text-left border rounded-lg transition-all ${
                          isDuplicate
                            ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-blue-100 border-blue-500 shadow-md'
                            : 'hover:bg-blue-50 hover:border-blue-400 border-gray-300'
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
                          {isDuplicate && <span className="text-red-600 text-sm">Already selected</span>}
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

export default CreateStockRequisition;