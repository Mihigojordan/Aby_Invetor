import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, Filter, User, DollarSign, TrendingUp, FileText, Clock } from 'lucide-react';
import reportService from '../../services/reportService';

const EmployeeReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Fetch all reports on component mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const data = await reportService.getAllReports();
        setReports(data);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to fetch reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Filter reports based on search term and date filter
  useEffect(() => {
    let filtered = [...reports];

    // Filter by employee search
    if (searchTerm) {
      filtered = filtered.filter(report => {
        const employeeName = `${report.employee?.firstname || ''} ${report.employee?.lastname || ''}`.toLowerCase();
        const employeeEmail = report.employee?.email?.toLowerCase() || '';
        const employeePhone = report.employee?.phoneNumber || '';
        
        return employeeName.includes(searchTerm.toLowerCase()) ||
               employeeEmail.includes(searchTerm.toLowerCase()) ||
               employeePhone.includes(searchTerm);
      });
    }

    // Filter by date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(report => {
          const reportDate = new Date(report.createdAt);
          const reportDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate());
          return reportDay.getTime() === today.getTime();
        });
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        filtered = filtered.filter(report => {
          const reportDate = new Date(report.createdAt);
          return reportDate >= weekStart && reportDate <= now;
        });
        break;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        filtered = filtered.filter(report => {
          const reportDate = new Date(report.createdAt);
          return reportDate >= monthStart && reportDate <= now;
        });
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999); // Include full end date
          filtered = filtered.filter(report => {
            const reportDate = new Date(report.createdAt);
            return reportDate >= startDate && reportDate <= endDate;
          });
        }
        break;
      default:
        // Show all reports
        break;
    }

    setFilteredReports(filtered);
  }, [reports, searchTerm, dateFilter, customStartDate, customEndDate]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalReports = filteredReports.length;
    const totalEmployees = new Set(filteredReports.map(r => r.employeeId)).size;
    const totalCash = filteredReports.reduce((sum, r) => sum + (r.cashAtHand || 0), 0);
    const totalPhoneMoney = filteredReports.reduce((sum, r) => sum + (r.moneyOnPhone || 0), 0);
    const totalExpenses = filteredReports.reduce((sum, r) => 
      sum + (r.expenses?.reduce((expSum, exp) => expSum + (exp.amount || 0), 0) || 0), 0);

    return {
      totalReports,
      totalEmployees,
      totalCash,
      totalPhoneMoney,
      totalExpenses,
      totalMoney: totalCash + totalPhoneMoney
    };
  }, [filteredReports]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-RW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getEmployeeReportsCount = (employeeId) => {
    return filteredReports.filter(r => r.employeeId === employeeId).length;
  };

  // Group reports by employee for better display
  const groupedReports = useMemo(() => {
    const grouped = {};
    filteredReports.forEach(report => {
      const employeeId = report.employeeId;
      if (!grouped[employeeId]) {
        grouped[employeeId] = {
          employee: report.employee,
          reports: []
        };
      }
      grouped[employeeId].reports.push(report);
    });
    return grouped;
  }, [filteredReports]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Report Management</h1>
          <p className="text-gray-600">View and analyze all employee reports</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <FileText className="h-12 w-12 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">{summaryStats.totalReports}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <User className="h-12 w-12 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Employees</p>
                <p className="text-2xl font-bold text-gray-900">{summaryStats.totalEmployees}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <DollarSign className="h-12 w-12 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Money</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryStats.totalMoney)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <TrendingUp className="h-12 w-12 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryStats.totalExpenses)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search employees (name, email, phone)..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Date Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="flex space-x-2">
                <input
                  type="date"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
                <input
                  type="date"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Reports Display */}
        <div className="space-y-6">
          {Object.keys(groupedReports).length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl text-gray-600 mb-2">No reports found</p>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            Object.entries(groupedReports).map(([employeeId, data]) => (
              <div key={employeeId} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Employee Header */}
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="h-10 w-10 text-gray-600 bg-gray-200 rounded-full p-2" />
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {data.employee?.firstname} {data.employee?.lastname}
                        </h3>
                        <p className="text-gray-600">{data.employee?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Reports</p>
                      <p className="text-2xl font-bold text-blue-600">{data.reports.length}</p>
                    </div>
                  </div>
                </div>

                {/* Employee Reports */}
                <div className="divide-y divide-gray-200">
                  {data.reports.map((report) => (
                    <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Date</p>
                          <p className="text-gray-900 flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDate(report.createdAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Products Sold</p>
                          <p className="text-gray-900 font-semibold">{report.productsSold || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Money Available</p>
                          <div className="space-y-1">
                            <p className="text-gray-900 text-sm">
                              Cash: {formatCurrency(report.cashAtHand || 0)}
                            </p>
                            <p className="text-gray-900 text-sm">
                              Phone: {formatCurrency(report.moneyOnPhone || 0)}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Activity</p>
                          <div className="space-y-1">
                            <p className="text-gray-900 text-sm">
                              Expenses: {report.expenses?.length || 0}
                            </p>
                            <p className="text-gray-900 text-sm">
                              Transactions: {report.transactions?.length || 0}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Expenses and Transactions Details */}
                      {(report.expenses?.length > 0 || report.transactions?.length > 0) && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Expenses */}
                            {report.expenses?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Expenses</h4>
                                <div className="space-y-1">
                                  {report.expenses.slice(0, 3).map((expense, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span className="text-gray-600 truncate">{expense.description}</span>
                                      <span className="text-red-600 ml-2">{formatCurrency(expense.amount)}</span>
                                    </div>
                                  ))}
                                  {report.expenses.length > 3 && (
                                    <p className="text-xs text-gray-500">
                                      +{report.expenses.length - 3} more expenses
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Transactions */}
                            {report.transactions?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Transactions</h4>
                                <div className="space-y-1">
                                  {report.transactions.slice(0, 3).map((transaction, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span className="text-gray-600 truncate">
                                        {transaction.description} ({transaction.type})
                                      </span>
                                      <span className={`ml-2 ${transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                                        {transaction.type === 'CREDIT' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                      </span>
                                    </div>
                                  ))}
                                  {report.transactions.length > 3 && (
                                    <p className="text-xs text-gray-500">
                                      +{report.transactions.length - 3} more transactions
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeReportManagement;