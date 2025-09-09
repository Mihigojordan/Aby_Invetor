import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Users, Mail, Phone, MapPin, Check, AlertTriangle, ClipboardList, User, FileText, Download, Eye, RotateCcw, ChevronLeft, ChevronRight, Calendar, Wifi, WifiOff } from 'lucide-react';
import UpsertEmployeeModal from '../../components/dashboard/employee/UpsertEmployeeModal';
import DeleteModal from '../../components/dashboard/employee/DeleteModal';
import AssignModal from '../../components/dashboard/employee/AssignModal';
import employeeService from '../../services/employeeService';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import { useNetworkStatusContext } from '../../context/useNetworkContext';

const EmployeeManagement = ({ role }) => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const { isOnline } = useNetworkStatusContext();
  const navigate = useNavigate();

  const fetchEmployees = async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const data = await employeeService.getAllEmployees();
      setEmployees(data);
      setFilteredEmployees(data);
      if (showRefreshLoader) {
        showNotification('Employees refreshed successfully!');
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      showNotification(`Failed to fetch employees: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(employee =>
      `${employee.firstname} ${employee.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.phoneNumber?.includes(searchTerm)
    );
    setFilteredEmployees(filtered);
    setCurrentPage(1);
  }, [searchTerm, employees]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredEmployees.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddEmployee = async (employeeFormData) => {
    setIsLoading(true);
    try {
      const validation = employeeService.validateEmployeeData(employeeFormData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const response = await employeeService.registerEmployee(employeeFormData);
      await fetchEmployees();
      setIsAddModalOpen(false);
      showNotification(response.message || 'Employee added successfully!');
    } catch (error) {
      showNotification(`Failed to add employee: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEmployee = async (employeeFormData) => {
    setIsLoading(true);
    try {
      if (!selectedEmployee) {
        throw new Error('No employee selected for editing');
      }

      const validation = employeeService.validateEmployeeData(employeeFormData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const response = await employeeService.updateEmployee(selectedEmployee.id, employeeFormData);
      await fetchEmployees();
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
      showNotification(response.message || 'Employee updated successfully!');
    } catch (error) {
      showNotification(`Failed to update employee: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    setIsLoading(true);
    try {
      if (!selectedEmployee) {
        throw new Error('No employee selected for deletion');
      }

      const response = await employeeService.deleteEmployee(selectedEmployee.id);
      setEmployees(prev => prev.filter(emp => emp.id !== selectedEmployee.id));
      setFilteredEmployees(prev => prev.filter(emp => emp.id !== selectedEmployee.id));
      setIsDeleteModalOpen(false);
      setSelectedEmployee(null);
      showNotification(response.message || 'Employee deleted successfully!');
    } catch (error) {
      showNotification(`Failed to delete employee: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignTasks = async (taskIds) => {
    setIsLoading(true);
    try {
      if (!selectedEmployee) {
        throw new Error('No employee selected for task assignment');
      }

      const assignmentData = {
        employeeId: selectedEmployee.id,
        assignedTasks: taskIds
      };
      
      const response = await employeeService.assignTasksToEmployee(assignmentData);
      setEmployees(prev =>
        prev.map(emp =>
          emp.id === selectedEmployee.id 
            ? { ...emp, tasks: response.employee?.tasks || taskIds.map(id => ({ id, taskname: `Task ${id}` })) }
            : emp
        )
      );
      setIsAssignModalOpen(false);
      setSelectedEmployee(null);
      showNotification(response.message || 'Tasks assigned successfully!');
    } catch (error) {
      showNotification(`Failed to assign tasks: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (employee) => {
    setSelectedEmployee(employee);
    setIsDeleteModalOpen(true);
  };

  const openAssignModal = (employee) => {
    setSelectedEmployee(employee);
    setIsAssignModalOpen(true);
  };

  const openViewModal = (employee) => {
    if (!employee.id) return;
    return navigate(`/admin/dashboard/employee/${employee.id}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDownloadFile = async (filePath, fileName) => {
    try {
      await employeeService.downloadFile(filePath, fileName);
    } catch (error) {
      showNotification(`Failed to download file: ${error.message}`, 'error');
    }
  };

  const getDisplayFileUrl = (filePath) => {
    return employeeService.getFileUrl(filePath);
  };

  const closeAllModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsAssignModalOpen(false);
    setSelectedEmployee(null);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4">
        <p className="text-xs text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredEmployees.length)} of {filteredEmployees.length} entries
        </p>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-2 text-xs border rounded-md transition-colors ${
              currentPage === 1
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft size={14} />
            Previous
          </button>
          
          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 text-xs rounded-md transition-colors ${
                  currentPage === page
                    ? 'bg-primary-600 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1 px-3 py-2 text-xs border rounded-md transition-colors ${
              currentPage === totalPages
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );

  const CardView = () => (
    <div className="md:hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        {currentItems.map((employee, index) => (
          <div key={employee.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg overflow-hidden">
                    {employee.profileImg ? (
                      <img 
                        src={getDisplayFileUrl(employee.profileImg)} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={employee.profileImg ? 'hidden' : 'flex'}>
                      {`${employee.firstname?.[0] || ''}${employee.lastname?.[0] || ''}`}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-sm" title={`${employee.firstname} ${employee.lastname}`}>
                      {employee.firstname} {employee.lastname}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        employee.status === 'ACTIVE' ? 'bg-green-500' : 
                        employee.status === 'INACTIVE' ? 'bg-red-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-xs text-gray-500">
                        {employee.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openViewModal(employee)}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="View employee"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => openEditModal(employee)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="Edit employee"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => openAssignModal(employee)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="Assign tasks"
                  >
                    <ClipboardList size={14} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(employee)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="Delete employee"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={12} />
                  <span className="truncate">{employee.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={12} />
                  <span>{employee.phoneNumber || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={12} />
                  <span className="truncate">{employee.address || 'No address'}</span>
                </div>
              </div>
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Documents</div>
                <div className="flex flex-wrap gap-2">
                  {employee.identityCard && (
                    <button
                      onClick={() => window.open(getDisplayFileUrl(employee.identityCard), '_blank')}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full hover:bg-blue-200 transition-colors"
                    >
                      <User size={12} />
                      ID Card
                    </button>
                  )}
                  {employee.cv && (
                    <button
                      onClick={() => handleDownloadFile(employee.cv, `${employee.firstname}_${employee.lastname}_CV.pdf`)}
                      className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full hover:bg-green-200 transition-colors"
                    >
                      <FileText size={12} />
                      CV
                    </button>
                  )}
                  {!employee.identityCard && !employee.cv && (
                    <span className="text-xs text-gray-500">No documents</span>
                  )}
                </div>
              </div>
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Tasks ({employee.tasks?.length || 0})
                </div>
                {employee.tasks?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {employee.tasks.slice(0, 2).map((task) => (
                      <span key={task.id} className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                        {task.taskname || task.name || 'Unnamed Task'}
                      </span>
                    ))}
                    {employee.tasks.length > 2 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{employee.tasks.length - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">No tasks assigned</span>
                )}
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} />
                  <span>Joined {formatDate(employee.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <PaginationComponent />
      </div>
    </div>
  );

  const TableView = () => (
    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((employee, index) => (
              <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {startIndex + index + 1}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                      {employee.profileImg ? (
                        <img 
                          src={getDisplayFileUrl(employee.profileImg)} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={employee.profileImg ? 'hidden' : 'flex'}>
                        {`${employee.firstname?.[0] || ''}${employee.lastname?.[0] || ''}`}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{employee.firstname} {employee.lastname}</div>
                      <div className="text-xs text-gray-500 truncate max-w-48">
                        {employee.address || 'No address provided'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-900">
                      <Mail size={12} className="text-gray-400" />
                      <span className="truncate max-w-40">{employee.email || 'No email'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-900">
                      <Phone size={12} className="text-gray-400" />
                      <span>{employee.phoneNumber || 'No phone'}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-900">
                      {employee.tasks?.length || 0} task{(employee.tasks?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {formatDate(employee.createdAt)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openViewModal(employee)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => openEditModal(employee)}
                      disabled={isLoading}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => openAssignModal(employee)}
                      disabled={isLoading}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Assign Tasks"
                    >
                      <ClipboardList size={14} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(employee)}
                      disabled={isLoading}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationComponent />
    </div>
  );

  return (
    <div className="bg-gray-50 p-4 h-[90vh] sm:p-6 lg:p-8">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
        } animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}
      <div className="h-full overflow-y-auto mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-600 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
            </div>
          </div>
          <p className="text-sm text-gray-600">Manage your team members and their information</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search employees by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm"
              />
            </div>
            <div className="flex gap-2">
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                isOnline ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`} title={isOnline ? 'Online' : 'Offline'}>
                {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              </div>
              {isOnline && (
                <button
                  onClick={() => fetchEmployees(true)}
                  disabled={isRefreshing}
                  className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  title="Refresh"
                >
                  <RotateCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              )}
              <button
                onClick={() => setIsAddModalOpen(true)}
                disabled={isLoading}
                className="flex items-center justify-center px-3 h-10 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg transition-colors shadow-sm"
                title="Add Employee"
              >
                <Plus size={16} />
                Add Employee
              </button>
            </div>
          </div>
        </div>
        {isLoading && !isRefreshing ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3">
              <RotateCcw className="w-5 h-5 animate-spin text-primary-600" />
              <p className="text-gray-600">Loading employees...</p>
            </div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first employee.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={20} />
                Add Employee
              </button>
            )}
          </div>
        ) : (
          <>
            <CardView />
            <TableView />
          </>
        )}
        <UpsertEmployeeModal
          isOpen={isAddModalOpen || isEditModalOpen}
          onClose={closeAllModals}
          onSubmit={isEditModalOpen ? handleEditEmployee : handleAddEmployee}
          employee={selectedEmployee}
          isLoading={isLoading}
          title={isEditModalOpen ? 'Edit Employee' : 'Add New Employee'}
        />
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={closeAllModals}
          onConfirm={handleDeleteEmployee}
          employee={selectedEmployee}
          isLoading={isLoading}
        />
        <AssignModal
          isOpen={isAssignModalOpen}
          onClose={closeAllModals}
          onConfirm={handleAssignTasks}
          employee={selectedEmployee}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default EmployeeManagement;