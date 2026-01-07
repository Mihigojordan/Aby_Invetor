// src/pages/ApproveStockRequisition.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle, X, Search, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import requisitionService from '../../../services/stockRequisitionService';
import stockInService from '../../../services/stockinService';
import categoryService from '../../../services/categoryService';

const formatCurrency = (amount, currency = 'RWF') => {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

const ApproveStockRequisition = ({role}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [requisition, setRequisition] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [allStocks, setAllStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
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
        const req = await requisitionService.getOne(id);
        setRequisition(req);

        // Load categories
        const cats = await categoryService.getAllCategories();
        setCategories(cats || []);

        // Load stocks
        const stocks = await stockInService.getAllStockIns();
        setAllStocks(stocks || []);
        setFilteredStocks(stocks || []);

        // Initialize items
        setItems(req.items.map(item => ({
          id: item.id,
          stockId: item.stockId || '',
          itemName: item.itemName || '',
          categoryId: item.categoryId || '',
          quantity: item.quantity || '',
          note: item.note || '',
          price: item.stockId ? (item.stock?.price || 0) : (item.price || 0),
          sellingPrice: item.stockId ? (item.stock?.sellingPrice || 0) : (item.sellingPrice || 0),
          isEdited: false,
          remove: false,
          isNew: false
        })));
      } catch (err) {
        console.error('Failed to load data:', err);
        setErrors({ load: 'Failed to load requisition. Please try again.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Search filtering
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStocks(allStocks);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFilteredStocks(allStocks.filter(s =>
      s.product?.productName?.toLowerCase().includes(term) ||
      s.sku?.toLowerCase().includes(term)
    ));
  }, [searchTerm, allStocks]);

  const isStockAlreadySelected = (stockId, currentIndex) => {
    if (!stockId) return false;
    return items.some((item, idx) =>
      idx !== currentIndex && item.stockId === stockId && !item.remove
    );
  };

  const openStockModal = (index) => {
    setSelectedItemIndex(index);
    setSearchTerm('');
    setShowStockModal(true);
  };

  const selectStock = (stock) => {
    if (selectedItemIndex === null) return;

    if (isStockAlreadySelected(stock.id, selectedItemIndex)) {
      setErrors(prev => ({
        ...prev,
        [`items.${selectedItemIndex}.stockId`]: 'This stock item is already selected in another active line.'
      }));
      setShowStockModal(false);
      setSelectedItemIndex(null);
      return;
    }

    const newItems = [...items];
    newItems[selectedItemIndex] = {
      ...newItems[selectedItemIndex],
      stockId: stock.id,
      itemName: stock.product?.productName || '',
      categoryId: stock.product?.categoryId || '',
      price: stock.price || 0,
      sellingPrice: stock.sellingPrice || 0,
      isEdited: true
    };

    setItems(newItems);
    setShowStockModal(false);
    setSelectedItemIndex(null);
  };

  const clearStockSelection = (index) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      stockId: '',
      itemName: newItems[index].itemName || '',
      categoryId: '',
      price: 0,
      sellingPrice: 0,
      isEdited: true
    };
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value, isEdited: true };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, {
      itemName: '',
      quantity: '',
      note: '',
      stockId: '',
      categoryId: '',
      price: 0,
      sellingPrice: 0,
      isNew: true
    }]);
  };

  const markForRemoval = (index) => {
    const newItems = [...items];
    newItems[index].remove = !newItems[index].remove;
    setItems(newItems);
  };

  const removeNewItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};
    const activeItems = items.filter(item => !item.remove);

    if (activeItems.length === 0) {
      newErrors.items = 'At least one active item is required';
    }

    activeItems.forEach((item, idx) => {
      const originalIndex = items.indexOf(item);

      if (!item.itemName.trim()) {
        newErrors[`items.${originalIndex}.itemName`] = 'Item name is required';
      }
      if (!item.categoryId) {
        newErrors[`items.${originalIndex}.categoryId`] = 'Category is required';
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        newErrors[`items.${originalIndex}.quantity`] = 'Quantity must be greater than 0';
      }

      // For items without stockId (new items), require price and sellingPrice
      if (!item.stockId) {
        if (!item.price || parseFloat(item.price) <= 0) {
          newErrors[`items.${originalIndex}.price`] = 'Purchase price is required for new items';
        }
        if (!item.sellingPrice || parseFloat(item.sellingPrice) <= 0) {
          newErrors[`items.${originalIndex}.sellingPrice`] = 'Selling price is required for new items';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApprove = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = items.map(item => {
        if (item.remove && item.id) {
          return { id: item.id, remove: true };
        }

        const data = {
          itemName: item.itemName.trim(),
          quantity: parseFloat(item.quantity),
          categoryId: item.categoryId,
          note: item.note || undefined,
          stockId: item.stockId || undefined,
          price: item.stockId ? undefined : parseFloat(item.price),
          sellingPrice: item.stockId ? undefined : parseFloat(item.sellingPrice)
        };

        if (item.id && !item.isNew) data.id = item.id;
        return data;
      }).filter(Boolean);

      await requisitionService.approve(id, payload);
      setSubmitSuccess(true);
      setTimeout(() => navigate(`/${role}/dashboard/stock-requisition`), 2000);
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to approve requisition.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStockInfo = (stockId) => allStocks.find(s => s.id === stockId) || null;

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
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </button>

        {/* Requisition Info */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-6 border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Stock Requisition #{requisition.id.slice(-8)}</h2>
              <p className="text-sm text-gray-600">
                Created: {new Date(requisition.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              {requisition.status.replace('_', ' ')}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
            <div>
              <p className="text-sm text-gray-500">Requested By</p>
              <p className="font-semibold text-gray-900">
                {requisition.employee?.firstname} {requisition.employee?.lastname}
              </p>
              <p className="text-sm text-gray-600">{requisition.employee?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-gray-700">{requisition.description || 'No description provided'}</p>
            </div>
          </div>
        </div>

        {/* Main Approval Form */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Review & Approve Requisition</h1>
            <p className="text-sm text-gray-600 mt-1">Verify items, assign categories, and set prices for new products</p>
          </div>

          {submitSuccess && (
            <div className="mx-6 mt-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-green-800">Requisition approved successfully!</p>
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
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Requisition Items</h2>
              <button
                onClick={addItem}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Item
              </button>
            </div>

            {errors.items && <p className="text-sm text-red-600">{errors.items}</p>}

            <div className="space-y-6">
              {items.map((item, idx) => {
                const stockInfo = item.stockId ? getStockInfo(item.stockId) : null;
                const isMarkedForRemoval = item.remove;
                const totalPurchasePrice = item.price && item.quantity ? parseFloat(item.price) * parseFloat(item.quantity) : 0;

                return (
                  <div
                    key={idx}
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
                        <h3 className="font-medium text-gray-800">Item {idx + 1}</h3>
                        {item.isNew && <span className="text-xs px-3 py-1 bg-green-600 text-white rounded-full">NEW</span>}
                        {item.isEdited && !item.isNew && <span className="text-xs px-3 py-1 bg-yellow-600 text-white rounded-full">EDITED</span>}
                        {isMarkedForRemoval && <span className="text-xs px-3 py-1 bg-red-600 text-white rounded-full">TO REMOVE</span>}
                      </div>
                      <div className="flex gap-2">
                        {item.id && !item.isNew && (
                          <button
                            onClick={() => markForRemoval(idx)}
                            className={isMarkedForRemoval ? 'text-green-600' : 'text-red-600'}
                          >
                            {isMarkedForRemoval ? <X className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                          </button>
                        )}
                        {item.isNew && (
                          <button onClick={() => removeNewItem(idx)} className="text-red-600">
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
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
                              onClick={() => openStockModal(idx)}
                              className="w-full px-4 py-3 border-2 border-dashed border-gray-400 rounded-lg text-left flex items-center justify-between hover:border-blue-500 hover:bg-blue-50"
                            >
                              <span className="text-gray-500">Browse available stock</span>
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
                                  onClick={() => clearStockSelection(idx)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>
                              {errors[`items.${idx}.stockId`] && (
                                <p className="mt-3 text-sm text-red-600">{errors[`items.${idx}.stockId`]}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          {/* Item Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Item Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                              disabled={!!item.stockId}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                errors[`items.${idx}.itemName`] ? 'border-red-500' : 'border-gray-300'
                              } ${item.stockId ? 'bg-gray-100' : ''}`}
                              placeholder="Enter item name"
                            />
                            {errors[`items.${idx}.itemName`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`items.${idx}.itemName`]}</p>
                            )}
                          </div>

                          {/* Category */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Category <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={item.categoryId}
                              onChange={(e) => handleItemChange(idx, 'categoryId', e.target.value)}
                              disabled={!!item.stockId}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                errors[`items.${idx}.categoryId`] ? 'border-red-500' : 'border-gray-300'
                              } ${item.stockId ? 'bg-gray-100' : ''}`}
                            >
                              <option value="">Select category</option>
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                            {errors[`items.${idx}.categoryId`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`items.${idx}.categoryId`]}</p>
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
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                errors[`items.${idx}.quantity`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {errors[`items.${idx}.quantity`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`items.${idx}.quantity`]}</p>
                            )}
                          </div>
                        </div>

                        {/* Total Cost & Prices */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total Purchase Cost
                            </label>
                            <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-lg font-semibold text-gray-900">
                              {formatCurrency(totalPurchasePrice)}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Purchase Price (per unit)
                              {item.stockId ? '' : <span className="text-red-500">*</span>}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price || ''}
                              onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                              disabled={!!item.stockId}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                errors[`items.${idx}.price`] ? 'border-red-500' : 'border-gray-300'
                              } ${item.stockId ? 'bg-gray-100' : ''}`}
                            />
                            {errors[`items.${idx}.price`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`items.${idx}.price`]}</p>
                            )}
                            {item.stockId && <p className="mt-1 text-xs text-gray-500">From stock record</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Selling Price (per unit)
                              {item.stockId ? '' : <span className="text-red-500">*</span>}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.sellingPrice || ''}
                              onChange={(e) => handleItemChange(idx, 'sellingPrice', e.target.value)}
                              disabled={!!item.stockId}
                              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                errors[`items.${idx}.sellingPrice`] ? 'border-red-500' : 'border-gray-300'
                              } ${item.stockId ? 'bg-gray-100' : ''}`}
                            />
                            {errors[`items.${idx}.sellingPrice`] && (
                              <p className="mt-1 text-sm text-red-600">{errors[`items.${idx}.sellingPrice`]}</p>
                            )}
                            {item.stockId && <p className="mt-1 text-xs text-gray-500">From stock record</p>}
                          </div>
                        </div>

                        {/* Note */}
                        <div className="mt-5">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Note <span className="text-gray-400">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={item.note || ''}
                            onChange={(e) => handleItemChange(idx, 'note', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Any special instructions"
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Approving...' : 'Approve Requisition'}
              </button>
            </div>
          </div>
        </div>

        {/* Stock Selection Modal */}
        {showStockModal && (
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
                              <div className="flex gap-4 mt-2 text-sm">
                                <span>Purchase: {formatCurrency(stock.price)}</span>
                                <span>Selling: {formatCurrency(stock.sellingPrice)}</span>
                              </div>
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
    </div>
  );
};

export default ApproveStockRequisition;