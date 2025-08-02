import React, { useState, useEffect } from 'react';
import { Search, Activity, Calendar, Clock, ChevronLeft, ChevronRight, RefreshCw, User, FileText, AlertTriangle, Check } from 'lucide-react';
import employeeService from '../../../services/employeeService';
import useEmployeeAuth from '../../../context/EmployeeAuthContext';

const WorkPerformance = ({employee,notAsEmployee=false}) => {
    const [activities, setActivities] = useState([]);
    const [filteredActivities, setFilteredActivities] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [notification, setNotification] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

   

    // Fetch employee activities
    const fetchActivities = async (showRefreshLoader = false) => {
        if (showRefreshLoader) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const data = notAsEmployee ? await employeeService.getActivityByEmployeeIdWithOutGuard(employee.id) :  await employeeService.getActivityByEmployeeId() ;
            console.log('activty data :', data);

            // Sort activities by doneAt date (newest first)
            const sortedData = data?.sort((a, b) => new Date(b.doneAt) - new Date(a.doneAt));
            setActivities(sortedData);
            setFilteredActivities(sortedData);

            if (showRefreshLoader) {
                showNotification('Activities refreshed successfully!');
            }
        } catch (error) {
            console.error('Failed to fetch activities:', error);
            showNotification(`Failed to fetch activities: ${error.message}`, 'error');
            setActivities([]);
            setFilteredActivities([]);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, []);

    // Filter activities based on search term and date range
    useEffect(() => {
        let filtered = activities.filter(activity => {
            const matchesSearch = activity.activityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                activity.description?.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesDateRange = true;
            if (startDate || endDate) {
                const activityDate = new Date(activity.doneAt);
                if (startDate) {
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    matchesDateRange = matchesDateRange && activityDate >= start;
                }
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    matchesDateRange = matchesDateRange && activityDate <= end;
                }
            }

            return matchesSearch && matchesDateRange;
        });

        setFilteredActivities(filtered);
        setCurrentPage(1); // Reset to first page when filtering
    }, [searchTerm, startDate, endDate, activities]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredActivities.slice(startIndex, endIndex);

    // Generate page numbers for pagination
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const clearDateFilters = () => {
        setStartDate('');
        setEndDate('');
    };

    // Pagination handlers
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

    // Pagination Component
    const PaginationComponent = () => (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredActivities.length)} of {filteredActivities.length} entries
                </p>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${currentPage === 1
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        <ChevronLeft size={16} />
                        Previous
                    </button>

                    <div className="flex items-center gap-1 mx-2">
                        {getPageNumbers().map((page) => (
                            <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-3 py-2 text-sm rounded-md transition-colors ${currentPage === page
                                        ? 'bg-blue-600 text-white'
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
                        className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${currentPage === totalPages
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );

    // Card View Component (Mobile/Tablet)
    const CardView = () => (
        <div className="lg:hidden">
            <div className="grid grid-cols-1 gap-6 mb-6">
                {currentItems.map((activity, index) => (
                    <div key={activity.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="p-6">
                            {/* Activity Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                                        <Activity size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate" title={activity.activityName}>
                                            {activity.activityName || 'Unnamed Activity'}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span className="text-xs text-gray-500">Completed</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Details */}
                            <div className="space-y-3 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Clock size={14} />
                                    <span>Completed on {formatDateTime(activity.doneAt)}</span>
                                </div>
                                {activity.description && (
                                    <div className="flex items-start gap-2 text-sm text-gray-600">
                                        <FileText size={14} className="mt-0.5 flex-shrink-0" />
                                        <div className="line-clamp-3">
                                            {activity.description}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Calendar size={12} />
                                    <span>Activity #{startIndex + index + 1}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination for Cards */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <PaginationComponent />
            </div>
        </div>
    );

    // Table View Component (Desktop)
    const TableView = () => (
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {currentItems.map((activity, index) => (
                            <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                        {startIndex + index + 1}
                                    </span>
                                </td>

                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                                            <Activity size={16} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {activity.activityName || 'Unnamed Activity'}
                                            </div>
                                            <div className="flex items-center gap-1 mt-1">
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                <span className="text-xs text-gray-500">Completed</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                <td className="px-6 py-4">
                                    <div className="max-w-xs">
                                        <div className="text-sm text-gray-900 line-clamp-2">
                                            {activity.description || 'No description provided'}
                                        </div>
                                    </div>
                                </td>

                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-gray-400" />
                                        <span className="text-sm text-gray-900">
                                            {formatDateTime(activity.doneAt)}
                                        </span>
                                    </div>
                                </td>

                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        <Check size={12} />
                                        Completed
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Table Pagination */}
            <PaginationComponent />
        </div>
    );

    return (
        <div className="bg-gray-50 p-4 ">
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    } animate-in slide-in-from-top-2 duration-300`}>
                    {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                    {notification.message}
                </div>
            )}

            <div className="h-full overflow-y-auto mx-auto">
                {/* Header Section */}
                <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Work Performance</h1>
                    </div>
                    <p className="text-gray-600">Track your completed activities and work history</p>
                </div>

                {/* Search and Filters Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* Search Input */}
                        <div className="lg:col-span-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search activities by name or description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Date Range Filters */}
                        <div className="lg:col-span-4 grid grid-cols-2 gap-2">
                            <div>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                    placeholder="Start date"
                                />
                            </div>
                            <div>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                    placeholder="End date"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="lg:col-span-2 flex gap-2">
                            {(startDate || endDate) && (
                                <button
                                    onClick={clearDateFilters}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2.5 rounded-lg font-medium transition-colors text-sm"
                                >
                                    Clear
                                </button>
                            )}
                            <button
                                onClick={() => fetchActivities(true)}
                                disabled={isRefreshing}
                                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 text-sm"
                            >
                                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="flex flex-wrap items-center justify-center  gap-6 mb-6">
                    <div className="bg-white rounded-xl flex-auto shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Activity className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Activities</p>
                                <p className="text-2xl font-bold text-gray-900">{activities.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl flex-auto  shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Check className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">This Month</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {activities.filter(activity => {
                                        const activityDate = new Date(activity.doneAt);
                                        const now = new Date();
                                        return activityDate.getMonth() === now.getMonth() &&
                                            activityDate.getFullYear() === now.getFullYear();
                                    }).length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl flex-auto  shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Calendar className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Filtered Results</p>
                                <p className="text-2xl font-bold text-gray-900">{filteredActivities.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && !isRefreshing ? (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center gap-3">
                            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                            <p className="text-gray-600">Loading activities...</p>
                        </div>
                    </div>
                ) : filteredActivities.length === 0 ? (
                    /* Empty State */
                    <div className="text-center py-12">
                        <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm || startDate || endDate ?
                                'Try adjusting your search terms or date filters.' :
                                'No activities have been recorded yet.'
                            }
                        </p>
                    </div>
                ) : (
                    <>
                        <CardView />
                        <TableView />
                    </>
                )}
            </div>
        </div>
    );
};

export default WorkPerformance;