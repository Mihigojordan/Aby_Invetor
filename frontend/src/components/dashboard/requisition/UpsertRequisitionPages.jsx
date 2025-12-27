// src/pages/RequisitionForm.jsx
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle, X
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import requisitionService from '../../../services/requisitionService';
import { usePartnerAuth } from '../../../context/PartnerAuthContext';

const RequisitionForm = ({ requisitionId = null, onSuccess, onCancel }) => {
  const { user: partner } = usePartnerAuth(); // Assuming context provides user object with id
  const navigate = useNavigate();

  const [originalData, setOriginalData] = useState(null); // To track changes in edit mode
  const [formData, setFormData] = useState({
    partnerId: partner?.id || '',
    partnerNote: '',
    items: [{ tempId: Date.now(), itemName: '', qtyRequested: 1, note: '', remove: false }]
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const isEditMode = !!requisitionId;

  // Fetch existing requisition if editing
  useEffect(() => {
    if (requisitionId && partner?.id) {
      fetchRequisition();
    }
  }, [requisitionId, partner?.id]);

  const fetchRequisition = async () => {
    setFetching(true);
    setApiError('');
    try {
      const data = await requisitionService.getRequisitionById(requisitionId);

      if (data.partnerId !== partner.id) {
        setApiError('You can only edit your own requisitions');
        setFetching(false);
        return;
      }

      if (data.status !== 'PENDING') {
        setApiError('Only pending requisitions can be edited');
        setFetching(false);
        return;
      }

      const itemsWithTempId = data.items.map(item => ({
        id: item.id,
        tempId: Date.now() + Math.random(),
        itemName: item.itemName,
        qtyRequested: item.qtyRequested,
        note: item.note || '',
        remove: false
      }));

      setFormData({
        partnerId: data.partnerId,
        partnerNote: data.partnerNote || '',
        items: itemsWithTempId.length > 0 ? itemsWithTempId : [{ tempId: Date.now(), itemName: '', qtyRequested: 1, note: '', remove: false }]
      });

      // Store original for change detection
      setOriginalData(JSON.parse(JSON.stringify({
        partnerNote: data.partnerNote || '',
        items: data.items
      })));
    } catch (error) {
      setApiError(error.message || 'Failed to load requisition');
    } finally {
      setFetching(false);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { tempId: Date.now(), itemName: '', qtyRequested: 1, note: '', remove: false }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => {
      const items = [...prev.items];
      if (items[index].id) {
        items[index].remove = true;
      } else {
        items.splice(index, 1);
      }
      return { ...prev, items };
    });
    clearFieldError(index);
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => {
      const items = [...prev.items];
      items[index][field] = value;
      return { ...prev, items };
    });
    validateField(index, field, value);
  };

  const updatePartnerNote = (value) => {
    setFormData(prev => ({ ...prev, partnerNote: value }));
  };

  // Real-time field validation
  const validateField = (index, field, value) => {
    const newErrors = { ...errors };

    if (field === 'itemName') {
      if (!value.trim()) {
        newErrors[`item-${index}-name`] = 'Item name is required';
      } else {
        delete newErrors[`item-${index}-name`];
      }
    }

    if (field === 'qtyRequested') {
      const qty = parseInt(value);
      if (isNaN(qty) || qty <= 0) {
        newErrors[`item-${index}-qty`] = 'Quantity must be greater than 0';
      } else {
        delete newErrors[`item-${index}-qty`];
      }
    }

    setErrors(newErrors);
  };

  const clearFieldError = (index) => {
    const newErrors = { ...errors };
    delete newErrors[`item-${index}-name`];
    delete newErrors[`item-${index}-qty`];
    setErrors(newErrors);
  };

  // Full form validation before submit
  const validateForm = () => {
    const newErrors = {};
    const activeItems = formData.items.filter(item => !item.remove);

    if (activeItems.length === 0) {
      newErrors.general = 'At least one active item is required';
    }

    activeItems.forEach((item, idx) => {
      const actualIndex = formData.items.indexOf(item);
      if (!item.itemName.trim()) {
        newErrors[`item-${actualIndex}-name`] = 'Item name is required';
      }
      if (!item.qtyRequested || parseInt(item.qtyRequested) <= 0) {
        newErrors[`item-${actualIndex}-qty`] = 'Quantity must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if item was modified (for highlighting in edit mode)
  const isItemEdited = (item, index) => {
    if (!isEditMode || !originalData) return false;

    const originalItem = originalData.items[index];
    if (!originalItem) return true; // New item

    if (item.id && item.remove) return true;

    return (
      item.itemName !== originalItem.itemName ||
      parseInt(item.qtyRequested) !== originalItem.qtyRequested ||
      item.note !== (originalItem.note || '')
    );
  };

  const isPartnerNoteEdited = () => {
    if (!isEditMode || !originalData) return false;
    return formData.partnerNote !== (originalData.partnerNote || '');
  };

  const handleSubmit = async () => {
    setApiError('');
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        partnerNote: formData.partnerNote.trim() || undefined,
        items: formData.items
          .filter(item => !item.remove || item.id) // Include marked for removal
          .map(item => ({
            ...(item.id && { id: item.id }),
            itemName: item.itemName.trim(),
            qtyRequested: parseInt(item.qtyRequested),
            note: item.note.trim() || undefined,
            ...(item.remove && { remove: true })
          }))
      };

      let result;
      if (isEditMode) {
        result = await requisitionService.updateRequisition(requisitionId, payload);
      } else {
        result = await requisitionService.createRequisition(payload);
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess(result);
      }, 1500);
    } catch (error) {
      setApiError(error.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else navigate(-1);
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading requisition...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className=" mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Requisition' : 'Create New Requisition'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEditMode
              ? 'Update your pending requisition details'
              : 'Submit a new request for items you need'}
          </p>
        </div>

        {/* Success */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-6 flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600 mr-4" />
            <div>
              <p className="text-lg font-semibold text-green-800">
                {isEditMode ? 'Requisition updated!' : 'Requisition created!'}
              </p>
              <p className="text-green-700">Redirecting...</p>
            </div>
          </div>
        )}

        {/* API Error */}
        {apiError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-6 flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-red-700">{apiError}</p>
            </div>
          </div>
        )}

        {/* General Validation Error */}
        {errors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">{errors.general}</p>
          </div>
        )}

        {/* Partner Note */}
        <div className={`bg-white rounded-lg shadow-sm border-2 p-6 mb-6 transition-all ${isPartnerNoteEdited() ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Overall Note (Optional)
          </label>
          <textarea
            value={formData.partnerNote}
            onChange={(e) => updatePartnerNote(e.target.value)}
            placeholder="Add any general notes about this requisition..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
          {isPartnerNoteEdited() && (
            <p className="text-xs text-blue-600 mt-2 flex items-center">
              <Edit2 className="w-3 h-3 mr-1" />
              Edited
            </p>
          )}
        </div>

        {/* Items List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Items</h2>
            <button
              onClick={addItem}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="space-y-5">
            {formData.items.map((item, index) => {
              const isEdited = isItemEdited(item, index);
              const isRemoved = item.remove;

              return (
                <div
                  key={item.tempId || item.id}
                  className={`rounded-lg p-5 transition-all border-2 ${
                    isRemoved
                      ? 'border-red-300 bg-red-50 opacity-70'
                      : isEdited
                      ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600">
                        Item {index + 1}
                      </span>
                      {isRemoved && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Marked for removal
                        </span>
                      )}
                      {isEdited && !isRemoved && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edited
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      disabled={isRemoved}
                      className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {!isRemoved && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Item Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Item Name <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                            placeholder="e.g., Laptop, Office Chair"
                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
                              errors[`item-${index}-name`]
                                ? 'border-red-500'
                                : 'border-gray-300'
                            }`}
                          />
                          {errors[`item-${index}-name`] && (
                            <p className="text-red-600 text-sm mt-1.5 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {errors[`item-${index}-name`]}
                            </p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Quantity <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.qtyRequested}
                            onChange={(e) => updateItem(index, 'qtyRequested', e.target.value)}
                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
                              errors[`item-${index}-qty`]
                                ? 'border-red-500'
                                : 'border-gray-300'
                            }`}
                          />
                          {errors[`item-${index}-qty`] && (
                            <p className="text-red-600 text-sm mt-1.5 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {errors[`item-${index}-qty`]}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Note */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Note (Optional)
                        </label>
                        <textarea
                          value={item.note}
                          onChange={(e) => updateItem(index, 'note', e.target.value)}
                          placeholder="Any specific requirements (brand, model, color, etc.)"
                          rows={2}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || Object.keys(errors).length > 0}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3 font-medium"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                {isEditMode ? 'Update Requisition' : 'Create Requisition'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Wrapper pages
export const CreateRequisitionPage = () => {
  const navigate = useNavigate();
  const handleSuccess = () => navigate(-1);
  const handleCancel = () => navigate(-1);
  return <RequisitionForm onSuccess={handleSuccess} onCancel={handleCancel} />;
};

export const UpdateRequisitionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const handleSuccess = () => navigate(-1);
  const handleCancel = () => navigate(-1);
  return <RequisitionForm requisitionId={id} onSuccess={handleSuccess} onCancel={handleCancel} />;
};

export default RequisitionForm;