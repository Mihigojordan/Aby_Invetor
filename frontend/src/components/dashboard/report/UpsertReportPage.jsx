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
  ArrowLeft,
  Save,
} from "lucide-react";

const UpsertReportPage = ({ 
  reportId = null, 
  onNavigateBack, 
  reportService 
}) => {
  const [formData, setFormData] = useState({
    productsSold: [],
    cashAtHand: "",
    moneyOnPhone: "",
    expenses: [],
    transactions: [],
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [currentProductName, setCurrentProductName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Load existing report if editing
  useEffect(() => {
    const loadReport = async () => {
      if (reportId) {
        setIsLoading(true);
        try {
          const report = await reportService.getById(reportId);
          setFormData({
            productsSold: report.productsSold || [],
            cashAtHand: report.cashAtHand?.toString() || "",
            moneyOnPhone: report.moneyOnPhone?.toString() || "",
            expenses: report.expenses || [],
            transactions: report.transactions || [],
          });
        } catch (error) {
          setLoadError("Failed to load report data");
          console.error("Error loading report:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadReport();
  }, [reportId, reportService]);

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

    if (!formData.productsSold || formData.productsSold.length === 0) {
      errors.productsSold = "At least one product name is required";
    }

    const cashAtHand = parseFloat(formData.cashAtHand);
    if (formData.cashAtHand && (isNaN(cashAtHand) || cashAtHand < 0)) {
      errors.cashAtHand = "Cash at hand must be a valid non-negative number";
    }

    const moneyOnPhone = parseFloat(formData.moneyOnPhone);
    if (formData.moneyOnPhone && (isNaN(moneyOnPhone) || moneyOnPhone < 0)) {
      errors.moneyOnPhone =
        "Money on phone must be a valid non-negative number";
    }

    // Validate expenses
    (formData.expenses || []).forEach((expense, index) => {
      const amount = parseFloat(expense.amount);
      if (expense.amount && (isNaN(amount) || amount < 0)) {
        errors[`expense_${index}`] =
          "Expense amount must be a valid non-negative number";
      }
    });

    // Validate transactions
    (formData.transactions || []).forEach((transaction, index) => {
      const amount = parseFloat(transaction.amount);
      if (transaction.amount && (isNaN(amount) || amount < 0)) {
        errors[`transaction_${index}`] =
          "Transaction amount must be a valid non-negative number";
      }
    });

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      const submitData = {
        productsSold: formData.productsSold || [],
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

      if (reportId) {
        await reportService.update(reportId, submitData);
      } else {
        await reportService.create(submitData);
      }

      // Navigate back on success
      if (onNavigateBack) {
        onNavigateBack();
      }
    } catch (error) {
      console.error("Error saving report:", error);
      // You might want to show a toast or error message here
    } finally {
      setIsSaving(false);
    }
  };

  // Product management
  const addProduct = () => {
    if (currentProductName.trim()) {
      setFormData((prev) => ({
        ...prev,
        productsSold: [...(prev.productsSold || []), currentProductName.trim()],
      }));
      setCurrentProductName("");
    }
  };

  const removeProduct = (index) => {
    setFormData((prev) => ({
      ...prev,
      productsSold: (prev.productsSold || []).filter((_, i) => i !== index),
    }));
  };

  const handleProductKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addProduct();
    }
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
    // Clear validation error for this expense
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

    // Clear validation error when user starts typing
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
    // Clear validation error for this transaction
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

    // Clear validation error when user starts typing
    if (field === "amount" && validationErrors[`transaction_${index}`]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`transaction_${index}`];
        return newErrors;
      });
    }
  };

  const totalCash = calculateTotalCash();
  const totalExpenses = calculateTotalExpenses();
  const totalCredit = calculateTotalCredit();
  const totalDebit = calculateTotalDebit();
  const netCashFlow = totalCredit - totalDebit;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <X size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Report</h2>
          <p className="text-gray-600 mb-4">{loadError}</p>
          <button
            onClick={onNavigateBack}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onNavigateBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {reportId ? "Edit Report" : "Create New Report"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onNavigateBack}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <Save size={16} />
                {isSaving
                  ? "Saving..."
                  : reportId
                  ? "Update Report"
                  : "Create Report"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Products Sold Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Products Sold <span className="text-red-500">*</span>
              </h2>
              <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm font-medium">
                {(formData.productsSold || []).length} products
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={currentProductName}
                onChange={(e) => setCurrentProductName(e.target.value)}
                onKeyPress={handleProductKeyPress}
                placeholder="Enter product name"
                className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                  validationErrors.productsSold
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-300 focus:ring-primary-500"
                }`}
              />
              <button
                type="button"
                onClick={addProduct}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Add Product
              </button>
            </div>

            {validationErrors.productsSold && (
              <p className="text-red-500 text-sm mb-4">
                {validationErrors.productsSold}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {(formData.productsSold || []).map((product, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full"
                >
                  <span className="font-medium">{product}</span>
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="text-primary-500 hover:text-primary-700 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Cash Summary Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Cash Summary
              </h2>
              <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign size={18} />
                  <span className="font-semibold">
                    Total: {formatCurrency(totalCash)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                    validationErrors.cashAtHand
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-primary-500"
                  }`}
                  placeholder="Enter cash amount"
                  min="0"
                  step="0.01"
                />
                {validationErrors.cashAtHand && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.cashAtHand}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                    validationErrors.moneyOnPhone
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-primary-500"
                  }`}
                  placeholder="Enter mobile money amount"
                  min="0"
                  step="0.01"
                />
                {validationErrors.moneyOnPhone && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.moneyOnPhone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Expenses Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Expenses</h2>
              <div className="flex items-center gap-4">
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={18} />
                    <span className="font-semibold">
                      Total: {formatCurrency(totalExpenses)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addExpense}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Add Expense
                </button>
              </div>
            </div>

            {(!formData.expenses || formData.expenses.length === 0) ? (
              <div className="text-center py-12 text-gray-500">
                <TrendingDown size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-lg">No expenses added yet</p>
                <p className="text-sm">Click "Add Expense" to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(formData.expenses || []).map((expense, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={expense.description}
                        onChange={(e) =>
                          updateExpense(index, "description", e.target.value)
                        }
                        placeholder="Expense description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
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
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
                          validationErrors[`expense_${index}`]
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-primary-500"
                        }`}
                        min="0"
                        step="0.01"
                      />
                      <button
                        type="button"
                        onClick={() => removeExpense(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {validationErrors[`expense_${index}`] && (
                      <div className="md:col-span-3">
                        <p className="text-red-500 text-sm">
                          {validationErrors[`expense_${index}`]}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transactions Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Transactions
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-sm">
                    <div className="flex items-center gap-1">
                      <TrendingUp size={16} />
                      <span>Credit: {formatCurrency(totalCredit)}</span>
                    </div>
                  </div>
                  <div className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-sm">
                    <div className="flex items-center gap-1">
                      <TrendingDown size={16} />
                      <span>Debit: {formatCurrency(totalDebit)}</span>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
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
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Add Transaction
                </button>
              </div>
            </div>

            {(!formData.transactions || formData.transactions.length === 0) ? (
              <div className="text-center py-12 text-gray-500">
                <Receipt size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-lg">No transactions added yet</p>
                <p className="text-sm">Click "Add Transaction" to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(formData.transactions || []).map((transaction, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <select
                        value={transaction.type}
                        onChange={(e) =>
                          updateTransaction(index, "type", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
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
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
                          validationErrors[`transaction_${index}`]
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-primary-500"
                        }`}
                        min="0"
                        step="0.01"
                      />
                      <button
                        type="button"
                        onClick={() => removeTransaction(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {validationErrors[`transaction_${index}`] && (
                      <div className="md:col-span-4">
                        <p className="text-red-500 text-sm">
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
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Report Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">
                  {(formData.productsSold || []).length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Products</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(totalCash)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Cash</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {formatCurrency(totalExpenses)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Expenses</div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  netCashFlow >= 0 ? "text-blue-600" : "text-orange-600"
                }`}>
                  {netCashFlow >= 0 ? "+" : ""}{formatCurrency(netCashFlow)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Net Cash Flow</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpsertReportPage;