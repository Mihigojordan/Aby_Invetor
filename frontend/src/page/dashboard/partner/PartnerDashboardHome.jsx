import React, { useState, useEffect } from 'react';
import {
  Package, Clock, CheckCircle, XCircle, Truck, AlertCircle,
  BarChart3, ShoppingCart, ChevronRight, Calendar
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import requisitionService from '../../../services/requisitionService';

export default function PartnerDashboardHome() {
  const [loading, setLoading] = useState(true);
  const [requisitions, setRequisitions] = useState([]);
  const [filteredRequisitions, setFilteredRequisitions] = useState([]);

  // Filter state
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'thisWeek', 'last30days', 'last6months', 'lastyear', 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [stats, setStats] = useState({
    totalRequisitions: 0,
    pending: 0,
    approved: 0,
    partiallyFulfilled: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
    awaitingConfirmation: 0,
    totalRequestedItems: 0,
    totalDeliveredItems: 0,
    fulfillmentRate: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await requisitionService.getMyRequisitions();
        setRequisitions(data || []);
        applyFilter(data || [], dateFilter, customStart, customEnd);
      } catch (error) {
        console.error('Failed to load requisitions', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    applyFilter(requisitions, dateFilter, customStart, customEnd);
  }, [dateFilter, customStart, customEnd, requisitions]);

  const applyFilter = (data, filter, start, end) => {
    const now = new Date();
    let filtered = [...data];

    if (filter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = data.filter(r => new Date(r.createdAt) >= today);
    } else if (filter === 'thisWeek') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Sunday as start
      weekStart.setHours(0, 0, 0, 0);
      filtered = data.filter(r => new Date(r.createdAt) >= weekStart);
    } else if (filter === 'last30days') {
      const cutoff = new Date(now.setDate(now.getDate() - 30));
      filtered = data.filter(r => new Date(r.createdAt) >= cutoff);
    } else if (filter === 'last6months') {
      const cutoff = new Date(now.setMonth(now.getMonth() - 6));
      filtered = data.filter(r => new Date(r.createdAt) >= cutoff);
    } else if (filter === 'lastyear') {
      const cutoff = new Date(now.setFullYear(now.getFullYear() - 1));
      filtered = data.filter(r => new Date(r.createdAt) >= cutoff);
    } else if (filter === 'custom' && start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      filtered = data.filter(r => {
        const created = new Date(r.createdAt);
        return created >= startDate && created <= endDate;
      });
    }

    setFilteredRequisitions(filtered);
    calculateStats(filtered);
  };

  const calculateStats = (data) => {
    const pending = data.filter(r => r.status === 'PENDING').length;
    const approved = data.filter(r => r.status === 'APPROVED').length;
    const partiallyFulfilled = data.filter(r => r.status === 'PARTIALLY_FULFILLED').length;
    const completed = data.filter(r => r.status === 'COMPLETED').length;
    const rejected = data.filter(r => r.status === 'REJECTED').length;
    const cancelled = data.filter(r => r.status === 'CANCELLED').length;

    let awaitingConfirmation = 0;
    let totalRequested = 0;
    let totalDelivered = 0;

    data.forEach(req => {
      req.items.forEach(item => {
        totalRequested += item.qtyRequested;
        totalDelivered += item.qtyDelivered || 0;

        if (item.qtyDelivered > 0 && 
            (!item.deliveries || item.deliveries.some(d => d.qtyDelivered > 0 && !d.confirmedAt))) {
          awaitingConfirmation++;
        }
      });
    });

    const fulfillmentRate = totalRequested > 0
      ? Math.round((totalDelivered / totalRequested) * 100)
      : 0;

    setStats({
      totalRequisitions: data.length,
      pending,
      approved,
      partiallyFulfilled,
      completed,
      rejected,
      cancelled,
      awaitingConfirmation,
      totalRequestedItems: totalRequested,
      totalDeliveredItems: totalDelivered,
      fulfillmentRate
    });
  };

  // Vertical bar chart data - grouped by month
  const getChartData = () => {
    const monthlyMap = {};

    filteredRequisitions.forEach(req => {
      const date = new Date(req.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthLabel,
          pending: 0,
          inProgress: 0,
          completed: 0,
          rejectedCancelled: 0
        };
      }

      if (req.status === 'PENDING') monthlyMap[monthKey].pending += 1;
      else if (req.status === 'APPROVED' || req.status === 'PARTIALLY_FULFILLED') monthlyMap[monthKey].inProgress += 1;
      else if (req.status === 'COMPLETED') monthlyMap[monthKey].completed += 1;
      else if (req.status === 'REJECTED' || req.status === 'CANCELLED') monthlyMap[monthKey].rejectedCancelled += 1;
    });

    return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
  };

  const chartData = getChartData();

  const recentRequisitions = filteredRequisitions
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': case 'PARTIALLY_FULFILLED': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'REJECTED': case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'APPROVED': case 'PARTIALLY_FULFILLED': return <Truck className="w-4 h-4" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED': case 'CANCELLED': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 animate-spin border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">

          {/* Enhanced Date Filter */}
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">Filter by Date:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['all', 'today', 'thisWeek', 'last30days', 'last6months', 'lastyear'].map(option => (
                  <button
                    key={option}
                    onClick={() => setDateFilter(option)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      dateFilter === option
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option === 'all' && 'All Time'}
                    {option === 'today' && 'Today'}
                    {option === 'thisWeek' && 'This Week'}
                    {option === 'last30days' && 'Last 30 Days'}
                    {option === 'last6months' && 'Last 6 Months'}
                    {option === 'lastyear' && 'Last Year'}
                  </button>
                ))}
                <button
                  onClick={() => setDateFilter('custom')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    dateFilter === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Custom Range
                </button>
              </div>
            </div>

            {dateFilter === 'custom' && (
              <div className="mt-4 flex gap-4 items-center flex-wrap">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {(customStart || customEnd) && (
                  <button
                    onClick={() => { setCustomStart(''); setCustomEnd(''); }}
                    className="self-end px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats Cards - Top Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Requisitions</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRequisitions}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <ShoppingCart className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Awaiting Review</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pending}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-xl">
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.approved + stats.partiallyFulfilled}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Truck className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Fulfillment Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.fulfillmentRate}%</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Vertical Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Requisitions Over Time</h3>
                <BarChart3 className="w-5 h-5 text-gray-500" />
              </div>
              {chartData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  No requisitions in selected period
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#6b7280" 
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                      <Bar dataKey="inProgress" fill="#8b5cf6" name="In Progress" />
                      <Bar dataKey="completed" fill="#10b981" name="Completed" />
                      <Bar dataKey="rejectedCancelled" fill="#ef4444" name="Rejected/Cancelled" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Recent Requisitions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Requisitions</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {recentRequisitions.length === 0 ? (
                  <p className="p-6 text-center text-gray-500">No requisitions in this period</p>
                ) : (
                  recentRequisitions.map((req) => (
                    <div key={req.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900">#{req.requisitionNumber}</p>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(req.status)} flex items-center gap-1`}>
                          {getStatusIcon(req.status)}
                          {req.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(req.createdAt).toLocaleDateString()} • {req.items.length} items
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action Required Alert */}
          {/* {stats.awaitingConfirmation > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900">Action Required</h3>
                  <p className="text-amber-800 mt-1">
                    You have {stats.awaitingConfirmation} delivered item(s) awaiting confirmation.
                  </p>
                  <button className="mt-3 text-amber-900 font-medium hover:text-amber-700 flex items-center gap-1">
                    Review Deliveries <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )} */}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Total Items Requested</h4>
                <Package className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalRequestedItems}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Items Delivered</h4>
                <Truck className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalDeliveredItems}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Completed Requisitions</h4>
                <CheckCircle className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}