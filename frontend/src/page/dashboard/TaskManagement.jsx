import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Check, AlertTriangle } from 'lucide-react';
import { ClipboardList } from 'lucide-react';
import UpsertTaskModal from '../../components/dashboard/task/UpsertTaskModal';
import DeleteTaskModal from '../../components/dashboard/task/DeleteTaskModal';
import taskService from '../../services/taskService'; // Adjust the import path

const TaskManagement = () => {
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        const fetchTasks = async () => {
            setIsLoading(true);
            try {
                const data = await taskService.getAllTasks();
                setTasks(data);
                setFilteredTasks(data);
            } catch (error) {
                showNotification(`Failed to fetch positions: ${error.message}`, 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTasks();
    }, []);

    useEffect(() => {
        const filtered = tasks.filter(task =>
            (task.taskname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (task.description || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredTasks(filtered);
    }, [searchTerm, tasks]);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleAddTask = async (taskData) => {
        setIsLoading(true);
        try {
            const validation = taskService.validateTaskData(taskData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            const response = await taskService.createTask(taskData);
            setTasks(prev => [...prev, response.createTask]);
            setIsAddModalOpen(false);
            showNotification('Postion added successfully!');
        } catch (error) {
            showNotification(`Failed to add Postion: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditTask = async (taskData) => {
        setIsLoading(true);
        try {
            const validation = taskService.validateTaskData(taskData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            const updatedTask = await taskService.updateTask(selectedTask.id, taskData);
            setTasks(prev =>
                prev.map(task =>
                    task.id === selectedTask.id ? updatedTask : task
                )
            );
            setIsEditModalOpen(false);
            setSelectedTask(null);
            showNotification('Position updated successfully!');
        } catch (error) {
            showNotification(`Failed to update task: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTask = async () => {
        setIsLoading(true);
        try {
            await taskService.deleteTask(selectedTask.id);
            setTasks(prev => prev.filter(task => task.id !== selectedTask.id));
            setIsDeleteModalOpen(false);
            setSelectedTask(null);
            showNotification('Position deleted successfully!');
        } catch (error) {
            showNotification(`Failed to delete postion: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const openEditModal = (task) => {
        setSelectedTask(task);
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (task) => {
        setSelectedTask(task);
        setIsDeleteModalOpen(true);
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
                            <ClipboardList className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Postion Management</h1>
                    </div>
                    <p className="text-gray-600">Manage your Postions and their details</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div className="relative flex-grow max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search Postions..."
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
                            Add Position
                        </button>
                    </div>

                  
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600">Loading Positions...</p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-12">
                        <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Postions found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first Postion.'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                <Plus size={20} />
                                Add Postion
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTasks.map((task) => (
                            <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                                {task.taskname?.[0] || 'T'}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">
                                                    {task.taskname || 'Unnamed Position'}
                                                </h3>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <div className={`w-2 h-2 rounded-full ${task.employees?.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                    <span className="text-xs text-gray-500">
                                                        {task.employees?.length > 0 ? 'Assigned' : 'Unassigned'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openEditModal(task)}
                                                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(task)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        <div className="text-sm text-gray-600">
                                            <span className="font-medium">Description:</span> {task.description || 'No description'}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            <span className="font-medium">Assigned Employees:</span>{' '}
                                            {task.employees?.length > 0
                                                ? task.employees.map(emp => `${emp.firstname} ${emp.lastname}`).join(', ')
                                                : 'None'}
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-gray-100">
                                        <span className="text-xs text-gray-500">
                                            Created {formatDate(task.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <UpsertTaskModal
                isOpen={isAddModalOpen || isEditModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                    setSelectedTask(null);
                }}
                onSubmit={isEditModalOpen ? handleEditTask : handleAddTask}
                task={selectedTask}
                isLoading={isLoading}
                title={isEditModalOpen ? 'Edit Posistion' : 'Add New Posistion'}
            />

            <DeleteTaskModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedTask(null);
                }}
                onConfirm={handleDeleteTask}
                task={selectedTask}
                isLoading={isLoading}
            />
        </div>
    );
};

export default TaskManagement;