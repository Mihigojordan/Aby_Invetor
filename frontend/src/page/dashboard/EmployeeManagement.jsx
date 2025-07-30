import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Users, Mail, Phone, MapPin, Check, AlertTriangle, ClipboardList } from 'lucide-react';
import UpsertEmployeeModal from '../../components/dashboard/employee/UpsertEmployeeModal';
import DeleteModal from '../../components/dashboard/employee/DeleteModal';
import AssignModal from '../../components/dashboard/employee/AssignModal';
import employeeService from '../../services/employeeService'; // Adjust the import path
import taskService from '../../services/taskService'; // Adjust the import path

const EmployeeManagement = () => {
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

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddEmployee = async (employeeData) => {
    setIsLoading(true);
    try {
      const validation = employeeService.validateEmployeeData(employeeData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      const newEmployee = await employeeService.registerEmployee(employeeData);
      setEmployees(prev => [...prev, newEmployee.createEmployee]);
      setIsAddModalOpen(false);
      showNotification('Employee added successfully!');
    } catch (error) {
      showNotification(`Failed to add employee: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEmployee = async (employeeData) => {
    setIsLoading(true);
    try {
      const validation = employeeService.validateEmployeeData(employeeData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      const updatedEmployee = await employeeService.updateEmployee(selectedEmployee.id, employeeData);
      setEmployees(prev =>
        prev.map(emp =>
          emp.id === selectedEmployee.id ? updatedEmployee.employee : emp
        )
      );
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
      showNotification('Employee updated successfully!');
    } catch (error) {
      showNotification(`Failed to update employee: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    setIsLoading(true);
    try {
      await employeeService.deleteEmployee(selectedEmployee.id);
      setEmployees(prev => prev.filter(emp => emp.id !== selectedEmployee.id));
      setIsDeleteModalOpen(false);
      setSelectedEmployee(null);
      showNotification('Employee deleted successfully!');
    } catch (error) {
      showNotification(`Failed to delete employee: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignTasks = async (taskIds) => {
    setIsLoading(true);
    try {
      const assignmentData = {
        employeeId: selectedEmployee.id,
        assignedTasks:taskIds
      };
    const updatedEmployee =  await employeeService.assignTasksToEmployee(assignmentData);
      
      setEmployees(prev =>
        prev.map(emp =>
          emp.id === selectedEmployee.id ? updatedEmployee.employee : emp
        )
      );
      setIsAssignModalOpen(false);
      setSelectedEmployee(null);
      showNotification('Tasks assigned successfully!');
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
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={20} />
              Add Employee
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
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
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {employee.firstname?.[0]}{employee.lastname?.[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {employee.firstname} {employee.lastname}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <div className={`w-2 h-2 rounded-full ${employee.tasks?.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <span className="text-xs text-gray-500">
                            {employee.tasks?.length > 0 ? 'Active' : 'Available'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(employee)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => openAssignModal(employee)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <ClipboardList size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(employee)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Tasks ({employee.tasks?.length || 0})
                    </div>
                    {employee.tasks?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {employee.tasks.slice(0, 2).map((task) => (
                          <span key={task.id} className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                            {task.taskname || 'Unnamed Task'}
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