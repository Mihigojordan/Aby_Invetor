/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X,
  AlertCircle,
  Users,
  RefreshCw,
  Filter,
  Grid3X3,
  List,
  Settings,
  Minimize2,
  Mail,
  Phone,
  MapPin,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import partnerService from '../../services/partnerService';
import { useNavigate } from 'react-router-dom';

const PartnerDashboard = () => {
  const [partners, setPartners] = useState([]);
  const [allPartners, setAllPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [showFilters, setShowFilters] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
   
    phone: '',
    address: '',
  });
  const [formError, setFormError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    handleFilterAndSort();
  }, [searchTerm, sortBy, sortOrder, allPartners]);

  const loadData = async () => {
    try {
      setLoading(true);
      const pts = await partnerService.getAllPartners();
      setAllPartners(Array.isArray(pts) ? pts : []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load partners');
      setAllPartners([]);
    } finally {
      setLoading(false);
    }
  };

  const showOperationStatus = (type, message, duration = 3000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const handleFilterAndSort = () => {
    let filtered = [...allPartners];

    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (partner) =>
          partner?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          partner?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          partner?.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          partner?.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        const aDate = new Date(aValue || 0);
        const bDate = new Date(bValue || 0);
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      }

      const aStr = aValue ? aValue.toString().toLowerCase() : '';
      const bStr = bValue ? bValue.toString().toLowerCase() : '';
      return sortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });

    setPartners(filtered);
    setCurrentPage(1);
  };

  const totalPartners = allPartners.length;

  const handleAddPartner = () => {
    setFormData({
      name: '',
      email: '',
     
      phone: '',
      address: '',
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const validation = partnerService.validatePartnerData(formData);
    if (!validation.isValid) {
      setFormError(validation.errors.join(', '));
      return;
    }


    try {
      setOperationLoading(true);
      const newPartner = await partnerService.createPartner(formData);
      setShowAddModal(false);
      await loadData();
      showOperationStatus('success', `${newPartner.name} created successfully!`);
    } catch (err) {
      setFormError(err.message || 'Failed to create partner');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEditPartner = (partner) => {
    if (!partner?.id) return;
    setSelectedPartner(partner);
    setFormData({
      name: partner.name || '',
      email: partner.email || '',
   
      phone: partner.phone || '',
      address: partner.address || '',
    });
    setFormError('');
    setShowUpdateModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const validation = partnerService.validatePartnerData({
      name: formData.name,
      email: formData.email,
    });
    if (!validation.isValid) {
      setFormError(validation.errors.join(', '));
      return;
    }

    if (!selectedPartner?.id) {
      setFormError('Invalid partner ID');
      return;
    }

    // Prepare data 
    const updateData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
    };


    try {
      setOperationLoading(true);
      await partnerService.updatePartner(selectedPartner.id, updateData);
      setShowUpdateModal(false);
      setSelectedPartner(null);
      await loadData();
      showOperationStatus('success', `${formData.name} updated successfully!`);
    } catch (err) {
      setFormError(err.message || 'Failed to update partner');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleViewPartner = (partner) => {
    if (!partner?.id) return;
    setSelectedPartner(partner);
    setShowViewModal(true);
  };

  const handleDeletePartner = async (partner) => {
    if (!partner?.id) {
      showOperationStatus('error', 'Invalid partner ID');
      return;
    }

    try {
      setOperationLoading(true);
      await partnerService.deletePartner(partner.id);
      setDeleteConfirm(null);
      await loadData();
      showOperationStatus('success', `${partner.name} deleted successfully!`);
    } catch (err) {
      showOperationStatus('error', err.message || 'Failed to delete partner');
    } finally {
      setOperationLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const totalPages = Math.ceil(partners.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPartners = partners.slice(startIndex, endIndex);

  const renderTableView = () => (
    <div className="bg-white rounded-lg shadow border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden sm:table-cell">Avatar</th>
              <th
                className="text-left py-3 px-4 text-gray-600 font-semibold cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  setSortBy('name');
                  setSortOrder(sortBy === 'name' ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc');
                }}
              >
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  <ChevronDown className={`w-4 h-4 ${sortBy === 'name' ? 'text-primary-600' : 'text-gray-400'}`} />
                </div>
              </th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden md:table-cell">Email</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden lg:table-cell">Phone</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden xl:table-cell">Address</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden xl:table-cell">Created</th>
              <th className="text-right py-3 px-4 text-gray-600 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentPartners.map((partner) => (
              <motion.tr
                key={partner.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="hover:bg-gray-50"
              >
                <td className="py-3 px-4 hidden sm:table-cell">
                  <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-600" />
                  </div>
                </td>
                <td className="py-3 px-4 font-medium text-gray-900">{partner.name || 'N/A'}</td>
                <td className="py-3 px-4 text-gray-600 hidden md:table-cell">
                  <div className="flex items-center space-x-1">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{partner.email || 'N/A'}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600 hidden lg:table-cell">
                  <div className="flex items-center space-x-1">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{partner.phone || 'N/A'}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600 hidden xl:table-cell">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="truncate max-w-xs">{partner.address || 'N/A'}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600 hidden xl:table-cell">{formatDate(partner.createdAt)}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => handleViewPartner(partner)}
                      className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => handleEditPartner(partner)}
                      className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => setDeleteConfirm(partner)}
                      className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {currentPartners.map((partner) => (
        <motion.div
          key={partner.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{partner.name}</h3>
              <p className="text-sm text-gray-500 truncate">{partner.email}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            {partner.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>{partner.phone}</span>
              </div>
            )}
            {partner.address && (
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{partner.address}</span>
              </div>
            )}
          </div>
          <div className="flex justify-end mt-4 space-x-2">
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleViewPartner(partner)} className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50">
              <Eye className="w-4 h-4" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleEditPartner(partner)} className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50">
              <Edit className="w-4 h-4" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => setDeleteConfirm(partner)} className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="bg-white rounded-lg shadow border border-gray-100 divide-y divide-gray-100">
      {currentPartners.map((partner) => (
        <motion.div
          key={partner.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="px-4 py-4 hover:bg-gray-50 flex items-center justify-between"
        >
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">{partner.name}</div>
              <div className="text-sm text-gray-500 truncate">{partner.email}</div>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-sm text-gray-600">
            {partner.phone && <span>{partner.phone}</span>}
            <span className="truncate max-w-xs">{partner.address || '—'}</span>
            <span>{formatDate(partner.createdAt)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleViewPartner(partner)} className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50">
              <Eye className="w-4 h-4" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleEditPartner(partner)} className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50">
              <Edit className="w-4 h-4" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => setDeleteConfirm(partner)} className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
      <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-100 rounded-b-lg shadow">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, partners.length)} of {partners.length}
        </div>
        <div className="flex space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 border rounded hover:bg-primary-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          {pages.map((page) => (
            <motion.button
              key={page}
              whileHover={{ scale: 1.05 }}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 rounded ${currentPage === page ? 'bg-primary-600 text-white' : 'border hover:bg-primary-50'}`}
            >
              {page}
            </motion.button>
          ))}
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 border rounded hover:bg-primary-50 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <div className="sticky top-0 bg-white shadow-md z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 rounded-full hover:bg-gray-100">
                <Minimize2 className="w-5 h-5" />
              </motion.button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Partner Management</h1>
                <p className="text-sm text-gray-500">Manage all your partners in one place</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={loadData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleAddPartner}
                className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded shadow-md hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Partner</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Card - Only Total Partners since no status field */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow border border-gray-100 p-6 col-span-full lg:col-span-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Partners</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalPartners}</p>
              </div>
              <div className="p-4 bg-primary-50 rounded-full">
                <Users className="w-8 h-8 text-primary-600" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search partners by name, email, phone or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="email-asc">Email (A-Z)</option>
                <option value="email-desc">Email (Z-A)</option>
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
              </select>
              <div className="flex border rounded-lg overflow-hidden">
                <button onClick={() => setViewMode('table')} className={`p-2 ${viewMode === 'table' ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100'}`} title="Table">
                  <List className="w-5 h-5" />
                </button>
                <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100'}`} title="Grid">
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100'}`} title="List">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-flex items-center space-x-3">
              <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading partners...</span>
            </div>
          </div>
        ) : partners.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No partners found' : 'No partners yet'}
            </h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search.' : 'Start by adding your first partner.'}
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'table' && renderTableView()}
            {viewMode === 'grid' && renderGridView()}
            {viewMode === 'list' && renderListView()}
            {totalPages > 1 && renderPagination()}
          </>
        )}

        <AnimatePresence>
          {operationStatus && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50"
            >
              <div className={`flex items-center space-x-3 px-6 py-3 rounded-lg shadow-lg text-white ${
                operationStatus.type === 'success' ? 'bg-green-600' :
                operationStatus.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
              }`}>
                {operationStatus.type === 'success' && <CheckCircle className="w-5 h-5" />}
                {operationStatus.type === 'error' && <XCircle className="w-5 h-5" />}
                <span className="font-medium">{operationStatus.message}</span>
                <button onClick={() => setOperationStatus(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {operationLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-lg">Processing...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {deleteConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Delete Partner</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                </div>
                <p className="mb-6">
                  Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
                </p>
                <div className="flex justify-end space-x-3">
                  <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border rounded hover:bg-gray-100">
                    Cancel
                  </button>
                  <button onClick={() => handleDeletePartner(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAddModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h3 className="text-xl font-semibold mb-4">Add New Partner</h3>
                {formError && <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 mb-4">{formError}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input name="name" value={formData.name} onChange={handleInputChange} required className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-primary-500" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-primary-500" placeholder="john@example.com" />
                  </div>
          
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-primary-500" placeholder="+1234567890" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <input name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-primary-500" placeholder="123 Main St, City" />
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100">
                      Cancel
                    </button>
                    <button type="submit" disabled={operationLoading} className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50">
                      {operationLoading ? 'Creating...' : 'Create Partner'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showUpdateModal && selectedPartner && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h3 className="text-xl font-semibold mb-4">Update Partner</h3>
                {formError && <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 mb-4">{formError}</div>}
                <form onSubmit={handleUpdateSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input name="name" value={formData.name} onChange={handleInputChange} required className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-primary-500" />
                  </div>
                 
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <input name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={() => setShowUpdateModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100">
                      Cancel
                    </button>
                    <button type="submit" disabled={operationLoading} className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50">
                      {operationLoading ? 'Updating...' : 'Update Partner'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showViewModal && selectedPartner && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h3 className="text-xl font-semibold mb-6">Partner Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center">
                      <Users className="w-8 h-8 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold">{selectedPartner.name}</h4>
                      <p className="text-sm text-gray-500">{selectedPartner.email}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="mt-1 flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      {selectedPartner.phone || '—'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <p className="mt-1 flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      {selectedPartner.address || '—'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Created</label>
                    <p className="mt-1">{formatDate(selectedPartner.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Updated</label>
                    <p className="mt-1">{formatDate(selectedPartner.updatedAt)}</p>
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <button onClick={() => setShowViewModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100">
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PartnerDashboard;