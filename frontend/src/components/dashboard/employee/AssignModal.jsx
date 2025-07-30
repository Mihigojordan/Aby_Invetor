import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ClipboardList, Check } from 'lucide-react';
import taskService from '../../../services/taskService'; // Adjust the import path
import employeeService from '../../../services/employeeService'; // Adjust the import path

const AssignModal = ({ isOpen, onClose, onConfirm, employee, isLoading }) => {
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && employee) {
      const fetchTasks = async () => {
        setIsLoadingTasks(true);
        try {
          const data = await taskService.getAllTasks();
          setTasks(data);
          // Pre-select tasks already assigned to the employee
          setSelectedTaskIds(employee.tasks?.map(task => task.id) || []);
        } catch (error) {
          setError(`Failed to fetch tasks: ${error.message}`);
        } finally {
          setIsLoadingTasks(false);
        }
      };
      fetchTasks();
    }
  }, [isOpen, employee]);

  const handleTaskToggle = (taskId) => {
    setSelectedTaskIds(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
    setError(''); // Clear error when user makes a selection
  };

  const handleSubmit = () => {
    // if (selectedTaskIds.length === 0) {
    //   setError('Please select at least one task to assign.');
    //   return;
    // }
    setError('');
    onConfirm(selectedTaskIds);
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Assign Tasks</h2>
                <p className="text-gray-600">Assign tasks to {employee.firstname} {employee.lastname}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Tasks * ({selectedTaskIds.length} selected)
            </label>
            
            {isLoadingTasks ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading tasks...</div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                No tasks available
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                {tasks.map(task => {
                  const isSelected = selectedTaskIds.includes(task.id);
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleTaskToggle(task.id)}
                      className={`relative p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50 shadow-sm' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm ${
                            isSelected ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {task.taskname || 'Unnamed Task'}
                          </h4>
                          {task.description && (
                            <p className={`text-xs mt-1 ${
                              isSelected ? 'text-blue-700' : 'text-gray-600'
                            }`}>
                              {task.description.length > 60 
                                ? `${task.description.substring(0, 60)}...` 
                                : task.description
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {error && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || isLoadingTasks}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Assigning...' : 'Assign Tasks'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignModal;