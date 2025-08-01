import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Users, Mail, Phone, MapPin, Check, AlertTriangle, ClipboardList, User, FileText, Download } from 'lucide-react';
// Import your existing components
import UpsertEmployeeModal from '../../components/dashboard/employee/UpsertEmployeeModal';
import DeleteModal from '../../components/dashboard/employee/DeleteModal';
import AssignModal from '../../components/dashboard/employee/AssignModal';
import employeeService from '../../services/employeeService';
import taskService from '../../services/taskService';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';

const EmployeeManagement = ({role}) => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(employee =>
      `${employee.firstname} ${employee.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.phoneNumber.includes(searchTerm)
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await employeeService.getAllEmployees();
      setEmployees(data);
      setFilteredEmployees(data);
    } catch (error) {
      showNotification(`Failed to fetch employees: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddEmployee = async (employeeFormData) => {
    setIsLoading(true);
    try {
      // Validate data before sending
      const validation = employeeService.validateEmployeeData(employeeFormData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const response = await employeeService.registerEmployee(employeeFormData);
      
      // Refresh the employees list to get the latest data
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

      // Validate data before sending
      const validation = employeeService.validateEmployeeData(employeeFormData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const response = await employeeService.updateEmployee(selectedEmployee.id, employeeFormData);
      
      // Refresh the employees list to get the latest data
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
      
      // Remove employee from local state
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
      
      // Update the local state with the updated employee data
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

  const formatDate = (dateString) => {
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

  return (
    <div className="bg-gray-50 p-4 h-[90vh] sm:p-6 lg:p-8">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        } animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}

      <div className="h-full overflow-y-auto mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-600 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
          </div>
          <p className="text-gray-600">Manage your team members and their information</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={isLoading}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={20} />
              Add Employee
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading employees...</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
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
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {employee.firstname} {employee.lastname}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <div className={`w-2 h-2 rounded-full ${
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
                        onClick={() => openEditModal(employee)}
                        disabled={isLoading}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => openAssignModal(employee)}
                        disabled={isLoading}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 rounded-lg transition-colors"
                      >
                        <ClipboardList size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(employee)}
                        disabled={isLoading}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail size={14} />
                      <span className="truncate">{employee.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={14} />
                      <span>{employee.phoneNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={14} />
                      <span className="truncate">{employee.address}</span>
                    </div>
                  </div>

                  {/* File attachments section */}
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Documents
                    </div>
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
                        <span className="text-xs text-gray-500">No documents uploaded</span>
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
                    <span className="text-xs text-gray-500">
                      Joined {formatDate(employee.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Components */}
        <UpsertEmployeeModal
          isOpen={isAddModalOpen || isEditModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            setSelectedEmployee(null);
          }}
          onSubmit={isEditModalOpen ? handleEditEmployee : handleAddEmployee}
          employee={selectedEmployee}
          isLoading={isLoading}
          title={isEditModalOpen ? 'Edit Employee' : 'Add New Employee'}
        />

        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedEmployee(null);
          }}
          onConfirm={handleDeleteEmployee}
          employee={selectedEmployee}
          isLoading={isLoading}
        />

        <AssignModal
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedEmployee(null);
          }}
          onConfirm={handleAssignTasks}
          employee={selectedEmployee}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default EmployeeManagement;