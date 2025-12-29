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
} from "lucide-react";
import reportService from "../../services/reportService";

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    const filtered = reports.filter((report) => {
      const searchLower = searchTerm.toLowerCase();
      const reportDate = new Date(report.createdAt)
        .toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
        .toLowerCase();
      // Check if any transaction description matches the search term
      const transactionMatch = (report.transactions || []).some((transaction) =>
        (transaction.description || "").toLowerCase().includes(searchLower)
      );
      return reportDate.includes(searchLower) || transactionMatch;
    });
    setFilteredReports(filtered);
    setCurrentPage(1);
  }, [searchTerm, reports]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const data = await reportService.getEmployeeReports();
      setReports(data);
      setFilteredReports(data);
    } catch (error) {
      showNotification(`Failed to fetch reports: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredReports.slice(startIndex, endIndex);

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

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddReport = async (reportData) => {
    setIsLoading(true);
    try {
      await reportService.createReport(reportData);
      await fetchReports();
      setIsAddModalOpen(false);
      showNotification("Report created successfully!");
    } catch (error) {
      showNotification(`Failed to create report: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditReport = async (reportData) => {
    setIsLoading(true);
    try {
      await reportService.updateReport(selectedReport.id, reportData);
      await fetchReports();
      setIsEditModalOpen(false);
      setSelectedReport(null);
      showNotification("Report updated successfully!");
    } catch (error) {
      showNotification(`Failed to update report: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReport = async () => {
    setIsLoading(true);
    try {
      await reportService.deleteReport(selectedReport.id);
      await fetchReports();
      setIsDeleteModalOpen(false);
      setSelectedReport(null);
      showNotification("Report deleted successfully!");
    } catch (error) {
      showNotification(`Failed to delete report: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
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

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Calculate summary statistics
  const calculateSummaryStats = () => {
    const totalCashAtHand = filteredReports.reduce(
      (sum, report) => sum + (report.cashAtHand || 0),
      0
    );
    const totalMoneyOnPhone = filteredReports.reduce(
      (sum, report) => sum + (report.moneyOnPhone || 0),
      0
    );
    const totalExpenses = filteredReports.reduce((sum, report) => {
      const reportExpenses = (report.expenses || []).reduce(
        (expSum, exp) => expSum + (exp.amount || 0),
        0
      );
      return sum + reportExpenses;
    }, 0);
    const totalCredit = filteredReports.reduce((sum, report) => {
      const reportCredits = (report.transactions || [])
        .filter((t) => t.type === "CREDIT")
        .reduce((creditSum, t) => creditSum + (t.amount || 0), 0);
      return sum + reportCredits;
    }, 0);
    const totalDebit = filteredReports.reduce((sum, report) => {
      const reportDebits = (report.transactions || [])
        .filter((t) => t.type === "DEBIT")
        .reduce((debitSum, t) => debitSum + (t.amount || 0), 0);
      return sum + reportDebits;
    }, 0);
    return {
      totalCashAtHand,
      totalMoneyOnPhone,
      totalMoney: totalCashAtHand + totalMoneyOnPhone,
      totalExpenses,
      totalCredit,
      totalDebit,
    };
  };

  const summaryStats = calculateSummaryStats();

  // Pagination Component
  const PaginationComponent = ({ showItemsPerPage = true }) => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4">
        <p className="text-xs text-gray-600">
          Showing {startIndex + 1} to{" "}
          {Math.min(endIndex, filteredReports.length)} of{" "}
          {filteredReports.length} entries
        </p>
        {showItemsPerPage && filteredReports.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Show:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-2 text-xs border rounded-md transition-colors ${
              currentPage === 1
                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                : "border-gray-300 text-gray-700 hover:bg-gray-100"
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
                    ? "bg-primary-600 text-white"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-100"
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
                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                : "border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );

  // Card View Component (Mobile/Tablet)
  const CardView = () => (
    <div className="md:hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        {currentItems.map((report) => {
          const totalExpenses = (report.expenses || []).reduce(
            (sum, exp) => sum + (exp.amount || 0),
            0
          );
          const totalMoney =
            (report.cashAtHand || 0) + (report.moneyOnPhone || 0);
          const totalCredit = (report.transactions || [])
            .filter((t) => t.type === "CREDIT")
            .reduce((total, t) => total + (t.amount || 0), 0);
          const totalDebit = (report.transactions || [])
            .filter((t) => t.type === "DEBIT")
            .reduce((total, t) => total + (t.amount || 0), 0);
          const netCashFlow = totalCredit - totalDebit;
          return (
            <div
              key={report.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-base">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        Daily Report
                      </h3>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openViewModal(report)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => openEditModal(report)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(report)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={12} className="text-green-600" />
                        <span className="text-xs font-medium text-green-800">
                          Total Money
                        </span>
                      </div>
                      <p className="font-bold text-green-700 text-sm">
                        {formatCurrency(totalMoney)}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown size={12} className="text-red-600" />
                        <span className="text-xs font-medium text-red-800">
                          Expenses
                        </span>
                      </div>
                      <p className="font-bold text-red-700 text-sm">
                        {formatCurrency(totalExpenses)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={12} className="text-blue-600" />
                        <span className="text-xs font-medium text-blue-800">
                          Total Credit
                        </span>
                      </div>
                      <p className="font-bold text-blue-700 text-sm">
                        {formatCurrency(totalCredit)}
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown size={12} className="text-orange-600" />
                        <span className="text-xs font-medium text-orange-800">
                          Total Debit
                        </span>
                      </div>
                      <p className="font-bold text-orange-700 text-sm">
                        {formatCurrency(totalDebit)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Receipt size={12} className="text-purple-600" />
                      <span className="text-xs font-medium text-purple-800">
                        Products
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={10} />
                    <span>Created {formatDate(report.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <PaginationComponent showItemsPerPage={false} />
      </div>
    </div>
  );

  // Table View Component (Desktop)
  const TableView = () => (
    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cash Summary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Credits/Debits
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expenses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((report, index) => {
              const totalExpenses = (report.expenses || []).reduce(
                (sum, exp) => sum + (exp.amount || 0),
                0
              );
              const totalMoney =
                (report.cashAtHand || 0) + (report.moneyOnPhone || 0);
              const totalCredit = (report.transactions || [])
                .filter((t) => t.type === "CREDIT")
                .reduce((total, t) => total + (t.amount || 0), 0);
              const totalDebit = (report.transactions || [])
                .filter((t) => t.type === "DEBIT")
                .reduce((total, t) => total + (t.amount || 0), 0);
              return (
                <tr
                  key={report.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {startIndex + index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-900">
                        {formatDate(report.createdAt)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-900">
                        {formatCurrency(totalMoney)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <TrendingUp size={10} className="text-green-400" />
                        <span className="text-xs font-medium text-green-600">
                          {formatCurrency(totalCredit)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingDown size={10} className="text-red-400" />
                        <span className="text-xs font-medium text-red-600">
                          {formatCurrency(totalDebit)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <TrendingDown size={12} className="text-red-400" />
                      <span className="font-medium text-red-600 text-sm">
                        {formatCurrency(totalExpenses)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {(report.expenses || []).length} entries
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(report)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => openEditModal(report)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(report)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PaginationComponent showItemsPerPage={false} />
    </div>
  );

  return (
    <div className="bg-gray-50 p-4 h-[90vh] sm:p-6 lg:p-8 text-sm">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === "success"
              ? "bg-primary-500 text-white"
              : "bg-red-500 text-white"
          } animate-in slide-in-from-top-2 duration-300 text-xs`}
        >
          {notification.message}
        </div>
      )}
      <div className="h-full overflow-y-auto mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-600 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Report Management
            </h1>
          </div>
          <p className="text-gray-600 text-xs">
            Track daily sales reports with cash flow and expenses
          </p>
        </div>
        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Receipt className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Reports</p>
                <p className="text-base font-bold text-gray-900">
                  {filteredReports.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Total Cash</p>
                <p className="text-base font-bold text-gray-900">
                  {formatCurrency(summaryStats.totalCashAtHand)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Phone Money</p>
                <p className="text-base font-bold text-gray-900">
                  {formatCurrency(summaryStats.totalMoneyOnPhone)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Expenses</p>
                <p className="text-base font-bold text-gray-900">
                  {formatCurrency(summaryStats.totalExpenses)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Total Credit
                </p>
                <p className="text-base font-bold text-emerald-600">
                  {formatCurrency(summaryStats.totalCredit)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingDown className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Total Debit</p>
                <p className="text-base font-bold text-orange-600">
                  {formatCurrency(summaryStats.totalDebit)}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by date or product names..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm"
              />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
            >
              <Plus size={16} />
              Create Report
            </button>
          </div>
        </div>
        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 mt-4 text-xs">Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base font-medium text-gray-900 mb-2">
              No reports found
            </h3>
            <p className="text-gray-600 mb-4 text-xs">
              {searchTerm
                ? "Try adjusting your search terms."
                : "Get started by creating your first daily report."}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                <Plus size={16} />
                Create Report
              </button>
            )}
          </div>
        ) : (
          <>
            <CardView />
            <TableView />
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
          onSubmit={isEditModalOpen ? handleEditReport : handleAddReport}
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
          onConfirm={handleDeleteReport}
          report={selectedReport}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default ReportManagement;
