import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Eye,
  Clock,
  Receipt,
  ChevronLeft,
  ChevronRight,
  X,
  Wifi,
  WifiOff,
  RotateCcw,
  RefreshCw,
  Grid3x3,
  Table2,
  Filter,
  Check,
  AlertTriangle,
  Package,
  Hash,
  User,
  Phone,
  Mail,
  ShoppingBag,
} from "lucide-react";
import reportService from "../../services/reportService";
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';
import { useNetworkStatusContext } from '../../context/useNetworkContext';
import { useNavigate } from 'react-router-dom';

// Enhanced Upsert Report Modal Component with Live Totals
const UpsertReportModal = ({
  isOpen,
  onClose,
  onSubmit,
  report,
  isLoading,
  title,
}) => {
  const [formData, setFormData] = useState({
    cashAtHand: "",
    moneyOnPhone: "",
    expenses: [],
    transactions: [],
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [currentProductName, setCurrentProductName] = useState("");

  useEffect(() => {
    if (report) {
      setFormData({
        cashAtHand: report.cashAtHand?.toString() || "",
        moneyOnPhone: report.moneyOnPhone?.toString() || "",
        expenses: report.expenses || [],
        transactions: report.transactions || [],
      });
    } else {
      setFormData({
        cashAtHand: "",
        moneyOnPhone: "",
        expenses: [],
        transactions: [],
      });
    }
    setValidationErrors({});
    setCurrentProductName("");
  }, [report, isOpen]);

  // Calculate totals in real-time
  const calculateTotalCash = () => {
    const cashAtHand = parseFloat(formData.cashAtHand) || 0;
    const moneyOnPhone = parseFloat(formData.moneyOnPhone) || 0;
    return cashAtHand + moneyOnPhone;
  };

  const calculateTotalExpenses = () => {
    return (formData.expenses || []).reduce((total, expense) => {
      return total + (parseFloat(expense.amount) || 0);
    }, 0);
  };

  const calculateTotalCredit = () => {
    return (formData.transactions || [])
      .filter((transaction) => transaction.type === "CREDIT")
      .reduce((total, transaction) => {
        return total + (parseFloat(transaction.amount) || 0);
      }, 0);
  };

  const calculateTotalDebit = () => {
    return (formData.transactions || [])
      .filter((transaction) => transaction.type === "DEBIT")
      .reduce((total, transaction) => {
        return total + (parseFloat(transaction.amount) || 0);
      }, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const validateForm = () => {
    const errors = {};
    const cashAtHand = parseFloat(formData.cashAtHand);
    if (formData.cashAtHand && (isNaN(cashAtHand) || cashAtHand < 0)) {
      errors.cashAtHand = "Cash at hand must be a valid non-negative number";
    }
    const moneyOnPhone = parseFloat(formData.moneyOnPhone);
    if (formData.moneyOnPhone && (isNaN(moneyOnPhone) || moneyOnPhone < 0)) {
      errors.moneyOnPhone = "Money on phone must be a valid non-negative number";
    }
    // Validate expenses
    (formData.expenses || []).forEach((expense, index) => {
      const amount = parseFloat(expense.amount);
      if (expense.amount && (isNaN(amount) || amount < 0)) {
        errors[`expense_${index}`] = "Expense amount must be a valid non-negative number";
      }
    });
    // Validate transactions
    (formData.transactions || []).forEach((transaction, index) => {
      const amount = parseFloat(transaction.amount);
      if (transaction.amount && (isNaN(amount) || amount < 0)) {
        errors[`transaction_${index}`] = "Transaction amount must be a valid non-negative number";
      }
    });
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    const submitData = {
      cashAtHand: parseFloat(formData.cashAtHand) || 0,
      moneyOnPhone: parseFloat(formData.moneyOnPhone) || 0,
      expenses: (formData.expenses || []).map((expense) => ({
        ...expense,
        amount: parseFloat(expense.amount) || 0,
      })),
      transactions: (formData.transactions || []).map((transaction) => ({
        ...transaction,
        amount: parseFloat(transaction.amount) || 0,
      })),
    };
    onSubmit(submitData);
  };

  // Expense management
  const addExpense = () => {
    setFormData((prev) => ({
      ...prev,
      expenses: [...(prev.expenses || []), { description: "", amount: "" }],
    }));
  };

  const removeExpense = (index) => {
    setFormData((prev) => ({
      ...prev,
      expenses: (prev.expenses || []).filter((_, i) => i !== index),
    }));
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`expense_${index}`];
      return newErrors;
    });
  };

  const updateExpense = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      expenses: (prev.expenses || []).map((expense, i) =>
        i === index ? { ...expense, [field]: value } : expense
      ),
    }));
    if (field === "amount" && validationErrors[`expense_${index}`]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`expense_${index}`];
        return newErrors;
      });
    }
  };

  // Transaction management
  const addTransaction = () => {
    setFormData((prev) => ({
      ...prev,
      transactions: [
        ...(prev.transactions || []),
        { type: "CREDIT", description: "", amount: "" },
      ],
    }));
  };

  const removeTransaction = (index) => {
    setFormData((prev) => ({
      ...prev,
      transactions: (prev.transactions || []).filter((_, i) => i !== index),
    }));
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`transaction_${index}`];
      return newErrors;
    });
  };

  const updateTransaction = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      transactions: (prev.transactions || []).map((transaction, i) =>
        i === index ? { ...transaction, [field]: value } : transaction
      ),
    }));
    if (field === "amount" && validationErrors[`transaction_${index}`]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`transaction_${index}`];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  const totalCash = calculateTotalCash();
  const totalExpenses = calculateTotalExpenses();
  const totalCredit = calculateTotalCredit();
  const totalDebit = calculateTotalDebit();
  const netCashFlow = totalCredit - totalDebit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-5xl mx-4 max-h-[95vh] overflow-y-auto text-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cash Summary Section with Live Total */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Cash Summary
              </h3>
              <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} />
                  <span className="text-xs font-medium">
                    Total: {formatCurrency(totalCash)}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cash at Hand
                </label>
                <input
                  type="number"
                  value={formData.cashAtHand}
                  onChange={(e) => {
                    setFormData({ ...formData, cashAtHand: e.target.value });
                    if (validationErrors.cashAtHand) {
                      setValidationErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.cashAtHand;
                        return newErrors;
                      });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                    validationErrors.cashAtHand
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-primary-500"
                  } text-sm`}
                  placeholder="Enter cash amount"
                  min="0"
                  step="0.01"
                />
                {validationErrors.cashAtHand && (
                  <p className="text-red-500 text-xs mt-1">
                    {validationErrors.cashAtHand}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Money on Phone
                </label>
                <input
                  type="number"
                  value={formData.moneyOnPhone}
                  onChange={(e) => {
                    setFormData({ ...formData, moneyOnPhone: e.target.value });
                    if (validationErrors.moneyOnPhone) {
                      setValidationErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.moneyOnPhone;
                        return newErrors;
                      });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                    validationErrors.moneyOnPhone
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-primary-500"
                  } text-sm`}
                  placeholder="Enter mobile money amount"
                  min="0"
                  step="0.01"
                />
                {validationErrors.moneyOnPhone && (
                  <p className="text-red-500 text-xs mt-1">
                    {validationErrors.moneyOnPhone}
                  </p>
                )}
              </div>
            </div>
          </div>
          {/* Expenses Section with Live Total */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-gray-900">Expenses</h3>
              <div className="flex items-center gap-3">
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={14} />
                    <span className="text-xs font-medium">
                      Total: {formatCurrency(totalExpenses)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addExpense}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs"
                >
                  Add Expense
                </button>
              </div>
            </div>
            {(!formData.expenses || formData.expenses.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <TrendingDown size={20} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">No expenses added yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(formData.expenses || []).map((expense, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={expense.description}
                        onChange={(e) =>
                          updateExpense(index, "description", e.target.value)
                        }
                        placeholder="Expense description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={expense.amount}
                        onChange={(e) =>
                          updateExpense(index, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 ${
                          validationErrors[`expense_${index}`]
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-primary-500"
                        } text-sm`}
                        min="0"
                        step="0.01"
                      />
                      <button
                        type="button"
                        onClick={() => removeExpense(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {validationErrors[`expense_${index}`] && (
                      <div className="md:col-span-3">
                        <p className="text-red-500 text-xs">
                          {validationErrors[`expense_${index}`]}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Transactions Section with Separated Credit/Debit Totals */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Transactions
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs">
                    <div className="flex items-center gap-1">
                      <TrendingUp size={12} />
                      <span>Credit: {formatCurrency(totalCredit)}</span>
                    </div>
                  </div>
                  <div className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-xs">
                    <div className="flex items-center gap-1">
                      <TrendingDown size={12} />
                      <span>Debit: {formatCurrency(totalDebit)}</span>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      netCashFlow >= 0
                        ? "bg-blue-50 text-blue-700"
                        : "bg-orange-50 text-orange-700"
                    }`}
                  >
                    Net: {netCashFlow >= 0 ? "+" : ""}
                    {formatCurrency(netCashFlow)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addTransaction}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs"
                >
                  Add Transaction
                </button>
              </div>
            </div>
            {(!formData.transactions || formData.transactions.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <Receipt size={20} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">No transactions added yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(formData.transactions || []).map((transaction, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <select
                        value={transaction.type}
                        onChange={(e) =>
                          updateTransaction(index, "type", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        <option value="CREDIT">Credit (+)</option>
                        <option value="DEBIT">Debit (-)</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={transaction.description}
                        onChange={(e) =>
                          updateTransaction(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Transaction description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={transaction.amount}
                        onChange={(e) =>
                          updateTransaction(index, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 ${
                          validationErrors[`transaction_${index}`]
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-primary-500"
                        } text-sm`}
                        min="0"
                        step="0.01"
                      />
                      <button
                        type="button"
                        onClick={() => removeTransaction(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {validationErrors[`transaction_${index}`] && (
                      <div className="md:col-span-4">
                        <p className="text-red-500 text-xs">
                          {validationErrors[`transaction_${index}`]}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Summary Panel */}
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Report Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(totalCash)}
                </div>
                <div className="text-xs text-gray-600">Total Cash</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">
                  {formatCurrency(totalExpenses)}
                </div>
                <div className="text-xs text-gray-600">Total Expenses</div>
              </div>
            </div>
          </div>
          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm"
            >
              {isLoading
                ? "Processing..."
                : report
                ? "Update Report"
                : "Create Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// View Report Modal Component
const ViewReportModal = ({ isOpen, onClose, report }) => {
  if (!isOpen || !report) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateTotalExpenses = () => {
    return (report.expenses || []).reduce(
      (total, expense) => total + (expense.amount || 0),
      0
    );
  };

  const calculateNetCashFlow = () => {
    const transactions = report.transactions || [];
    return transactions.reduce((total, transaction) => {
      const amount = transaction.amount || 0;
      if (transaction.type === "CREDIT") {
        return total + amount;
      } else if (transaction.type === "DEBIT") {
        return total - amount;
      }
      return total;
    }, 0);
  };

  const calculateTotalCredit = () => {
    const transactions = report.transactions || [];
    return transactions
      .filter((t) => t.type === "CREDIT")
      .reduce((total, t) => total + (t.amount || 0), 0);
  };

  const calculateTotalDebit = () => {
    const transactions = report.transactions || [];
    return transactions
      .filter((t) => t.type === "DEBIT")
      .reduce((total, t) => total + (t.amount || 0), 0);
  };

  // Separate credit and debit transactions
  const creditTransactions = (report.transactions || []).filter(t => t.type === "CREDIT");
  const debitTransactions = (report.transactions || []).filter(t => t.type === "DEBIT");
  const totalMoney = (report.cashAtHand || 0) + (report.moneyOnPhone || 0);
  const totalExpenses = calculateTotalExpenses();
  const totalCredit = calculateTotalCredit();
  const totalDebit = calculateTotalDebit();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto text-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Daily Report</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Financial Summary */}
            <div className="space-y-6">
              {/* Cash Summary */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <h3 className="font-semibold text-gray-900 text-base">Cash Summary</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Cash at Hand
                    </label>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(report.cashAtHand || 0)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Money on Phone
                    </label>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(report.moneyOnPhone || 0)}
                    </p>
                  </div>
                  <div className="col-span-2 border-t pt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Total Available
                    </label>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(totalMoney)}
                    </p>
                  </div>
                </div>
              </div>
              {/* Transaction Flow */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 text-base">
                    Transaction Flow
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Total Credit
                    </label>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(totalCredit)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Total Debit
                    </label>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(totalDebit)}
                    </p>
                  </div>
                </div>
              </div>
              {/* Expenses Summary */}
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <h3 className="font-semibold text-gray-900 text-base">
                    Expenses Summary
                  </h3>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Total Expenses
                    </label>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(totalExpenses)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(report.expenses || []).length} expense entries
                    </p>
                  </div>
                </div>
              </div>
              {/* Right Column - Details */}
              <div className="space-y-6">
                {/* Expense Details */}
                {report.expenses && report.expenses.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 text-base">
                      Expense Breakdown
                    </h3>
                    <div className="space-y-2">
                      {report.expenses.map((expense, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
                        >
                          <span className="text-gray-700 text-xs">
                            {expense.description || 'No description'}
                          </span>
                          <span className="font-medium text-red-600 text-sm">
                            {formatCurrency(expense.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Credit Transactions */}
                {creditTransactions.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-base">
                      <span className="w-3 h-3 bg-green-600 rounded-full"></span>
                      Credit Transactions ({creditTransactions.length})
                    </h3>
                    <div className="space-y-2">
                      {creditTransactions.map((transaction, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center py-2 border-b border-green-200 last:border-b-0"
                        >
                          <span className="text-gray-700 text-xs">
                            {transaction.description || 'No description'}
                          </span>
                          <span className="font-medium text-green-600 text-sm">
                            +{formatCurrency(transaction.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Debit Transactions */}
                {debitTransactions.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-base">
                      <span className="w-3 h-3 bg-red-600 rounded-full"></span>
                      Debit Transactions ({debitTransactions.length})
                    </h3>
                    <div className="space-y-2">
                      {debitTransactions.map((transaction, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center py-2 border-b border-red-200 last:border-b-0"
                        >
                          <span className="text-gray-700 text-xs">
                            {transaction.description || 'No description'}
                          </span>
                          <span className="font-medium text-red-600 text-sm">
                            -{formatCurrency(transaction.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Timeline */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <h3 className="font-semibold text-gray-900 text-base">Timeline</h3>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Created
                      </label>
                      <span className="text-gray-900 text-sm">
                        {formatDate(report.createdAt)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Last Updated
                      </label>
                      <span className="text-gray-900 text-sm">
                        {formatDate(report.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Delete Report Modal Component
const DeleteModal = ({ isOpen, onClose, onConfirm, report, isLoading }) => {
  if (!isOpen || !report) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-sm">
        <h2 className="text-lg font-semibold mb-4">Delete Report</h2>
        <p className="text-gray-600 mb-6 text-xs">
          Are you sure you want to delete the report from{" "}
          {formatDate(report.createdAt)}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Report Management Component
const ReportManagement = ({ role }) => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const { isOnline } = useNetworkStatusContext();
  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState('table');
  const navigate = useNavigate();

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const filtered = reports.filter(report => {
      const matchesSearch = 
        new Date(report.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.transactions || []).some(transaction => 
          (transaction.description || "").toLowerCase().includes(searchTerm.toLowerCase())
        );

      const reportDate = new Date(report.createdAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);

      const matchesDate =
        (!start || reportDate >= start) &&
        (!end || reportDate <= end);

      return matchesSearch && matchesDate;
    });
    setFilteredReports(filtered);
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, reports]);

  useEffect(() => {
    const stats = calculateReportStatistics(filteredReports);
    setStatistics(stats);
  }, [filteredReports]);

  const calculateReportStatistics = (reports) => {
    if (!Array.isArray(reports) || reports.length === 0) {
      return {
        totalReports: 0,
        totalCash: 0,
        totalExpenses: 0,
        totalCredit: 0,
        totalDebit: 0,
        recentReports: 0
      };
    }

    const totalCash = reports.reduce((sum, report) => 
      sum + (report.cashAtHand || 0) + (report.moneyOnPhone || 0), 0);
    
    const totalExpenses = reports.reduce((sum, report) =>
      sum + (report.expenses?.reduce((expSum, exp) => expSum + (exp.amount || 0), 0) || 0), 0);
    
    const totalCredit = reports.reduce((sum, report) =>
      sum + (report.transactions?.filter(t => t.type === 'CREDIT')
        .reduce((creditSum, t) => creditSum + (t.amount || 0), 0) || 0), 0);
    
    const totalDebit = reports.reduce((sum, report) =>
      sum + (report.transactions?.filter(t => t.type === 'DEBIT')
        .reduce((debitSum, t) => debitSum + (t.amount || 0), 0) || 0), 0);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentReports = reports.filter(report => 
      new Date(report.createdAt) > thirtyDaysAgo
    ).length;

    return {
      totalReports: reports.length,
      totalCash: totalCash.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      totalDebit: totalDebit.toFixed(2),
      recentReports
    };
  };

  const loadReports = async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await reportService.getEmployeeReports();
      setReports(data);
      setFilteredReports(data);

      if (showRefreshLoader) {
        setNotification({
          type: 'success',
          message: 'Reports refreshed successfully!'
        });
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load reports'
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleAddReport = async (reportData) => {
    setIsLoading(true);
    try {
      await reportService.createReport(reportData);
      await loadReports();
      setNotification({
        type: 'success',
        message: 'Report created successfully!'
      });
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding report:', error);
      setNotification({
        type: 'error',
        message: `Failed to create report: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateReport = async (reportData) => {
    setIsLoading(true);
    try {
      await reportService.updateReport(selectedReport.id, reportData);
      await loadReports();
      setNotification({
        type: 'success',
        message: 'Report updated successfully!'
      });
      setIsEditModalOpen(false);
      setSelectedReport(null);
    } catch (error) {
      console.error('Error updating report:', error);
      setNotification({
        type: 'error',
        message: `Failed to update report: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      await reportService.deleteReport(selectedReport.id);
      await loadReports();
      setNotification({
        type: 'success',
        message: 'Report deleted successfully!'
      });
      setIsDeleteModalOpen(false);
      setSelectedReport(null);
    } catch (error) {
      console.error('Error deleting report:', error);
      setNotification({
        type: 'error',
        message: `Failed to delete report: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadReports(true);
  };

  const openAddModal = () => {
    navigate(role === 'admin' ? '/admin/dashboard/report/create' : '/employee/dashboard/report/create');
  };

  const openEditModal = (report) => {
    setSelectedReport(report);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (report) => {
    setSelectedReport(report);
    setIsDeleteModalOpen(true);
  };

  const openViewModal = (report) => {
    setSelectedReport(report);
    setIsViewModalOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getTotalMoney = (report) => {
    return (report.cashAtHand || 0) + (report.moneyOnPhone || 0);
  };

  const getTotalExpenses = (report) => {
    return report.expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
  };

  const getTotalCredit = (report) => {
    return report.transactions?.filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
  };

  const getTotalDebit = (report) => {
    return report.transactions?.filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
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

  const handleClearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setFilteredReports(reports);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredReports.slice(startIndex, endIndex);

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

  const StatisticsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2 p-3">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Reports</p>
            <p className="text-lg font-bold text-gray-900">{statistics?.totalReports || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{statistics?.recentReports || 0} recent reports</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Cash</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(statistics?.totalCash || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Available funds</p>
          </div>
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Expenses</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(statistics?.totalExpenses || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Costs incurred</p>
          </div>
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Credit/Debit</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(statistics?.totalCredit || 0)}</p>
            <p className="text-xs text-red-600">{formatCurrency(statistics?.totalDebit || 0)}</p>
          </div>
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-t border-gray-200 bg-white">
      <div className="flex items-center gap-4">
        <p className="text-xs text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredReports.length)} of {filteredReports.length} entries
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
            <ChevronLeft size={12} />
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
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );

  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
      {(currentItems || []).map((report, index) => (
        <div
          key={report.id}
          className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200"
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-gray-900 truncate">
                    Report #{report.id?.substring(0, 8)}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-500">Processed</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Total Cash:</span>
                <span className="text-xs font-bold text-green-600">{formatCurrency(getTotalMoney(report))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Expenses:</span>
                <span className="text-xs text-red-600">{formatCurrency(getTotalExpenses(report))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Credit/Debit:</span>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-green-600">+{formatCurrency(getTotalCredit(report))}</span>
                  <span className="text-xs text-red-600">-{formatCurrency(getTotalDebit(report))}</span>
                </div>
              </div>
              {report.expenses?.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Expense Items:</span>
                  <span className="text-xs text-gray-900">{report.expenses.length}</span>
                </div>
              )}
            </div>
            
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} />
                  <span>{formatDate(report.createdAt)}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openViewModal(report)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => openEditModal(report)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(report)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const TableView = () => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6 p-3 ml-3 mr-3">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Report ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Total Cash</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Expenses</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Credit/Debit</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(currentItems || []).map((report, index) => (
              <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <FileText size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        Report #{report.id?.substring(0, 8)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {report.expenses?.length || 0} expense items
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">{formatDate(report.createdAt)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency(getTotalMoney(report))}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm font-semibold text-red-600">
                    {formatCurrency(getTotalExpenses(report))}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-xs text-green-600">+{formatCurrency(getTotalCredit(report))}</span>
                    <span className="text-xs text-red-600">-{formatCurrency(getTotalDebit(report))}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Processed
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openViewModal(report)}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(report)}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(report)}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
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

  const CardView = () => (
    <div className="md:hidden">
      <div className="grid grid-cols-1 gap-4 mb-6">
        {(currentItems || []).map((report, index) => (
          <div
            key={report.id}
            className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FileText size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 truncate">
                      Report #{report.id?.substring(0, 8)}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-500">Processed</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openViewModal(report)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex items-start justify-between text-xs">
                  <span className="font-medium text-gray-600">Total Cash:</span>
                  <span className="font-bold text-green-600">{formatCurrency(getTotalMoney(report))}</span>
                </div>
                <div className="flex items-start justify-between text-xs">
                  <span className="font-medium text-gray-600">Expenses:</span>
                  <span className="text-red-600">{formatCurrency(getTotalExpenses(report))}</span>
                </div>
                <div className="flex items-start justify-between text-xs">
                  <span className="font-medium text-gray-600">Credit:</span>
                  <span className="text-green-600">+{formatCurrency(getTotalCredit(report))}</span>
                </div>
                <div className="flex items-start justify-between text-xs">
                  <span className="font-medium text-gray-600">Debit:</span>
                  <span className="text-red-600">-{formatCurrency(getTotalDebit(report))}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={12} />
                    <span>{formatDate(report.createdAt)}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(report)}
                      disabled={isLoading}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(report)}
                      disabled={isLoading}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        <PaginationComponent />
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-[90vh] ">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-red-500 text-white'
          } animate-in slide-in-from-top-2 duration-300`}
        >
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}
      
      <div className="h-full">
        {/* Header Section */}
        <div className="mb-4 shadow-md bg-white p-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div>
                  <h1 className="text-2xl lg:text-2xl font-bold text-gray-900">Report Management</h1>
                  <p className="text-sm text-gray-600 mt-1">Track daily sales reports with cash flow, expenses, and transactions</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Sync and Refresh buttons */}
              <div className="flex gap-2">
                {(searchTerm || startDate || endDate) && (
                  <button
                    onClick={handleClearFilters}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors shadow-sm text-sm"
                    title="Clear Filters"
                  >
                    <X size={16} />
                    <span className="text-sm font-medium">Clear</span>
                  </button>
                )}
                
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                  <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                </div>
                
                {isOnline && (
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    title="Refresh"
                  >
                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    <span className="text-sm font-medium">Refresh</span>
                  </button>
                )}
              </div>

              <button
                onClick={openAddModal}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Plus size={18} />
                <span className="text-sm font-semibold">New Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && <StatisticsCards />}

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 p-2 ml-3 mr-3">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="w-full lg:w-[45%]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by date, transaction description, or expense..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-xs"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-[90%] ml-6 items-start sm:items-center">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-xs"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* View mode toggle in filter section */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1 border border-gray-300 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="Grid View"
                >
                  <Grid3x3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded transition-colors ${viewMode === 'table' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="Table View"
                >
                  <Table2 size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {isLoading && !isRefreshing ? (
          <div className="text-center py-16">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                <FileText className="w-8 h-8 text-primary-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">Loading Reports</p>
                <p className="text-sm text-gray-600">Please wait while we fetch your report data...</p>
              </div>
            </div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No Reports Found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || startDate || endDate 
                  ? 'Try adjusting your search or date filters to find what you\'re looking for.' 
                  : 'Get started by creating your first daily report.'}
              </p>
              {!(searchTerm || startDate || endDate) && (
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
                >
                  <Plus size={18} />
                  Create First Report
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <GridView />
            ) : (
              <>
                <CardView />
                <TableView />
              </>
            )}
          </>
        )}

        {/* Modals */}
        <UpsertReportModal
          isOpen={isAddModalOpen || isEditModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            setSelectedReport(null);
          }}
          onSubmit={isEditModalOpen ? handleUpdateReport : handleAddReport}
          report={selectedReport}
          isLoading={isLoading}
          title={isEditModalOpen ? "Edit Report" : "Create New Report"}
        />
        <ViewReportModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedReport(null);
          }}
          report={selectedReport}
        />
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedReport(null);
          }}
          onConfirm={handleConfirmDelete}
          report={selectedReport}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default ReportManagement;