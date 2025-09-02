import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Package, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Phone, 
  Mail, 
  MapPin,
  Clock,
  CreditCard,
  Wallet,
  Receipt,
  Activity,
  ChevronRight
} from 'lucide-react';
import reportService from '../../services/reportService';
import { useParams } from 'react-router-dom';

const EmployeeReportViewMore = () => {
  // For demo purposes, using a mock ID. In real app, you'd get this from useParams()
  const {id:reportId} = useParams();
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        
        // For demo purposes, creating a mock report. In real app, you'd use:
        const data = await reportService.getReportById(reportId);
        
        // Mock report data for demonstration
        
        
        setReport(data);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to fetch report details');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  const handleBackClick = () => {
    window.history.back();
  };

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const formatDateShort = (date) => {
    return new Intl.DateTimeFormat('en-RW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const calculateTotalExpenses = () => {
    return report?.expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
  };

  const calculateNetTransactions = () => {
    if (!report?.transactions) return { credit: 0, debit: 0, net: 0 };
    
    const credit = report.transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const debit = report.transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    return { credit, debit, net: credit - debit };
  };

  const calculateTotalMoney = () => {
    return (report?.cashAtHand || 0) + (report?.moneyOnPhone || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={handleBackClick}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} />
            Back to Reports
          </button>
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-red-600 mb-2">Error Loading Report</p>
            <p className="text-gray-500">{error || 'Report not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalExpenses = calculateTotalExpenses();
  const transactionSummary = calculateNetTransactions();
  const totalMoney = calculateTotalMoney();

  return (
    <div className="h-[90vh] overflow-y-auto  bg-gray-50 p-6">
      <div className=" mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackClick}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Reports
            </button>
            <ChevronRight size={16} className="text-gray-400" />
            <h1 className="text-3xl font-bold text-gray-900">Report Details</h1>
          </div>
         
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Employee Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {report.employee?.firstname} {report.employee?.lastname}
                  </h2>
                  <p className="text-gray-600">Employee Report</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {report.employee?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium">Email</p>
                      <p className="text-gray-900">{report.employee.email}</p>
                    </div>
                  </div>
                )}
                
                {report.employee?.phoneNumber && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium">Phone</p>
                      <p className="text-gray-900">{report.employee.phoneNumber}</p>
                    </div>
                  </div>
                )}
                
                {report.employee?.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium">Address</p>
                      <p className="text-gray-900">{report.employee.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Report Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                  <Calendar className="h-10 w-10 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">Report Date</p>
                    <p className="text-lg font-semibold text-gray-900">{formatDate(report.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            {report.expenses && report.expenses.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Expenses</h3>
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-red-500" />
                      <span className="text-lg font-bold text-red-600">{formatCurrency(totalExpenses)}</span>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {report.expenses.map((expense, index) => (
                    <div key={expense.id || index} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{expense.description}</p>
                            <p className="text-sm text-gray-500">Expense #{index + 1}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions Section */}
            {report.transactions && report.transactions.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">{formatCurrency(transactionSummary.credit)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-600">{formatCurrency(transactionSummary.debit)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {report.transactions.map((transaction, index) => (
                    <div key={transaction.id || index} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            transaction.type === 'CREDIT' 
                              ? 'bg-green-100' 
                              : 'bg-red-100'
                          }`}>
                            {transaction.type === 'CREDIT' ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{transaction.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                transaction.type === 'CREDIT' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {transaction.type}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'CREDIT' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">Cash at Hand</span>
                  </div>
                  <span className="font-bold text-green-600">{formatCurrency(report.cashAtHand || 0)}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Money on Phone</span>
                  </div>
                  <span className="font-bold text-blue-600">{formatCurrency(report.moneyOnPhone || 0)}</span>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Total Available</span>
                    <span className="text-xl font-bold text-gray-900">{formatCurrency(totalMoney)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-red-500" />
                    <span className="text-gray-700">Total Expenses</span>
                  </div>
                  <span className="font-semibold text-red-600">{formatCurrency(totalExpenses)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">Expense Items</span>
                  </div>
                  <span className="font-semibold text-gray-900">{report.expenses?.length || 0}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-700">Transactions</span>
                  </div>
                  <span className="font-semibold text-gray-900">{report.transactions?.length || 0}</span>
                </div>
                
                {transactionSummary.net !== 0 && (
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Net Transaction</span>
                      <span className={`font-semibold ${
                        transactionSummary.net >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transactionSummary.net >= 0 ? '+' : ''}{formatCurrency(transactionSummary.net)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Report Metadata */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="font-medium text-gray-900">{formatDate(report.createdAt)}</p>
                  </div>
                </div>
                
                {report.updatedAt && report.updatedAt !== report.createdAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-medium text-gray-900">{formatDate(report.updatedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeReportViewMore;