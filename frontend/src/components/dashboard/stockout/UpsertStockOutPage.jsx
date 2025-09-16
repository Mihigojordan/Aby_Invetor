import { useEffect, useRef, useState } from "react";
import stockInService from "../../../services/stockinService";
import { ChevronDownIcon, SearchIcon, Package, ShoppingCart } from 'lucide-react';
import { useNetworkStatusContext } from "../../../context/useNetworkContext";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import backOrderService from "../../../services/backOrderService";
import productService from "../../../services/productService";
import { db } from "../../../db/database";
import stockOutService from "../../../services/stockoutService";
import useEmployeeAuth from "../../../context/EmployeeAuthContext";
import useAdminAuth from "../../../context/AdminAuthContext";

// Searchable Stock-In Dropdown Component
const SearchableStockInDropdown = ({
    stockIns,
    value,
    onChange,
    placeholder = "Select a stock-in entry",
    error = false,
    formatCurrency
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    const { isOnline } = useNetworkStatusContext();
    // Filter stock items based on search term
    const filteredStockIns = stockIns?.filter(stockIn => {
        const searchLower = searchTerm.toLowerCase();
        const productName = stockIn.product?.productName?.toLowerCase() || '';
        const sku = stockIn.sku?.toLowerCase() || '';
        const quantity = (stockIn.offlineQuantity ?? stockIn.quantity ?? '').toString();
        const price = stockIn.sellingPrice?.toString() || '';

        return productName.includes(searchLower) ||
            sku.includes(searchLower) ||
            quantity.includes(searchLower) ||
            price.includes(searchLower);
    }) || [];

    // Get selected stock info for display
    const selectedStock = stockIns?.find(stock => stock.id === value || stock.localId === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (stockId) => {
        onChange({ target: { value: stockId } });
        setIsOpen(false);
        setSearchTerm('');
    };

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setSearchTerm('');
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Dropdown trigger */}
            <div
                onClick={toggleDropdown}
                className={`w-full px-2 py-1.5 border rounded-lg cursor-pointer flex items-center justify-between ${error
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                    } ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-gray-400'} text-sm`}
            >
                <span className={`${selectedStock ? 'text-gray-900' : 'text-gray-500'} truncate`}>
                    {selectedStock ? (
                        `${selectedStock.product?.productName || 'Unknown Product'} - Qty: #${selectedStock.offlineQuantity ?? selectedStock.quantity} - Price: ${formatCurrency(selectedStock.sellingPrice)} ${(!selectedStock.synced && selectedStock.localId) ? ' - Pending' : ''}`
                    ) : (
                        placeholder
                    )}
                </span>
                <ChevronDownIcon
                    size={16}
                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </div>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden text-sm">
                    {/* Search input */}
                    <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                            <SearchIcon size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by product name, SKU, quantity, or price..."
                                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* Options list */}
                    <div className="overflow-y-auto max-h-40">
                        {filteredStockIns.length > 0 ? (
                            <>
                                {/* Empty option */}
                                <div
                                    onClick={() => handleSelect('')}
                                    className="px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                                >
                                    {placeholder}
                                </div>

                                {/* Stock options */}
                                {filteredStockIns.map((stockIn, key) => (
                                    <div
                                        key={key}
                                        onClick={() => handleSelect(stockIn.id || stockIn.localId)}
                                        className={`px-2 py-1.5 text-sm cursor-pointer hover:bg-blue-50 ${(value === stockIn.id || value === stockIn.localId) ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">
                                                    {stockIn.product?.productName || 'Unknown Product'}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    SKU: {stockIn.sku} • Qty: #{stockIn.offlineQuantity ?? stockIn.quantity}
                                                </div>
                                            </div>
                                            {!stockIn.synced && (
                                                <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">
                                                    Pending
                                                </span>
                                            )}
                                            <div className="ml-2 text-right">
                                                <div className="text-sm font-medium text-green-600">
                                                    {formatCurrency(stockIn.sellingPrice)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="px-2 py-3 text-sm text-gray-500 text-center">
                                {searchTerm ? 'No matching stock items found' : 'No stock items available'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Modal Component for StockOut
const UpsertStockOutPage = ({ role }) => {
    const { id } = useParams();
    const [formData, setFormData] = useState({
        // Single entry fields (for update mode)
        stockinId: '',
        quantity: '',
        soldPrice: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        paymentMethod: '',
        backorderId: '',
        // Multiple entries fields (for create mode)
        salesEntries: [{ stockinId: '', quantity: '', soldPrice: '', isBackOrder: false, backOrder: null }]
    });
    const [stockOut, setStockOut] = useState(null);
    const [stockIns, setStockIns] = useState([]);
    const [title, setTitle] = useState(stockOut ? "Update Stock-Out Entry" : "Create Stock-Out Entries");
    const [isLoading, setIsLoading] = useState(false);
    const [closeForm, setCloseForm] = useState(false);
    const { isOnline } = useNetworkStatusContext();
    const [validationErrors, setValidationErrors] = useState({
        stockinId: '',
        quantity: '',
        clientEmail: '',
        salesEntries: []
    });

    const { user: employeeData } = useEmployeeAuth();
    const { user: adminData } = useAdminAuth();
    const navigate = useNavigate();
    const [isUpdateMode, setIsUpdateMode] = useState(!!stockOut);

    useEffect(() => {
        async function fetchData() {
            if (id) {
                const data = await loadStockOuts();
                const existingStockOut = data.combinedStockOuts.find(so => (so.id || so.localId) === id);
                setStockOut(existingStockOut || null);
                setIsUpdateMode(!!existingStockOut)
                setTitle("Update Stock-Out Entry")
            } else {
                setTitle(' "Create Stock-Out Entries"')
                const data = await loadStockOuts();
                setStockIns(data.convertedStockIns);
            }
        }
        fetchData();
    }, [isOnline, id]);

    useEffect(() => {
        if (stockOut) {
            // Update mode - single entry
            setFormData({
                stockinId: stockOut.stockinId || '',
                backorderId: stockOut.backorderId || '',
                quantity: stockOut.offlineQuantity ?? stockOut.quantity ?? '',
                soldPrice: stockOut.soldPrice || '',
                clientName: stockOut.clientName || '',
                clientEmail: stockOut.clientEmail || '',
                clientPhone: stockOut.clientPhone || '',
                paymentMethod: stockOut.paymentMethod || '',
                salesEntries: []
            });
        } else {
            // Create mode - multiple entries
            setFormData({
                stockinId: '',
                backorderId: '',
                quantity: '',
                soldPrice: '',
                clientName: '',
                clientEmail: '',
                clientPhone: '',
                paymentMethod: '',
                salesEntries: [{ stockinId: '', quantity: '', soldPrice: '', isBackOrder: false, backOrder: null }]
            });
        }
        setCloseForm(false);

        // Clear validation errors when modal opens/closes
        setValidationErrors({
            stockinId: '',
            quantity: '',
            clientEmail: '',
            paymentMethod: '',
            salesEntries: []
        });
    }, [stockOut, id]);

    const loadStockOuts = async (showRefreshLoader = false) => {
        setIsLoading(true);
        try {
            const [allStockOuts, offlineAdds, offlineUpdates, offlineDeletes, stockinsData, productsData, backOrderData] = await Promise.all([
                db.stockouts_all.toArray(),
                db.stockouts_offline_add.toArray(),
                db.stockouts_offline_update.toArray(),
                db.stockouts_offline_delete.toArray(),
                fetchStockIns(),
                fetchProducts(),
                fetchBackorders()
            ]);

            const deleteIds = new Set(offlineDeletes.map(d => d.id));
            const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));
            const backOrderMap = new Map(backOrderData.map(b => [b.id || b.localId, b]));
            const productMap = new Map(productsData.map(p => [p.id || p.localId, p]));
            const stockinMap = new Map(stockinsData.map(s => [s.id || s.localId, { ...s, product: productMap.get(s.productId) }]));
            const combinedStockOuts = allStockOuts
                .filter(so => !deleteIds.has(so.id))
                .map(so => ({
                    ...so,
                    ...updateMap.get(so.id),
                    synced: true,
                    stockin: stockinMap.get(so.stockinId),
                    backorder: backOrderMap.get(so.backorderId)
                }))
                .concat(offlineAdds.map(a => ({
                    ...a,
                    synced: false,
                    backorder: backOrderMap.get(a.backorderLocalId),
                    stockin: stockinMap.get(a.stockinId)
                })))
                .sort((a, b) => a.synced - b.synced);

            const convertedStockIns = Array.from(stockinMap.values());

            return {
                combinedStockOuts,
                convertedStockIns
            };
        } catch (error) {
            console.error('Error loading stock-outs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStockIns = async () => {
        try {
            if (isOnline) {
                const response = await stockInService.getAllStockIns();
                for (const si of response) {
                    await db.stockins_all.put({
                        id: si.id,
                        productId: si.productId,
                        quantity: si.quantity,
                        price: si.price,
                        sellingPrice: si.sellingPrice,
                        supplier: si.supplier,
                        sku: si.sku,
                        barcodeUrl: si.barcodeUrl,
                        lastModified: new Date(),
                        updatedAt: si.updatedAt || new Date()
                    });
                    if (si.product && !(await db.products_all.get(si.product.id))) {
                        await db.products_all.put({
                            id: si.product.id,
                            productName: si.product.productName,
                            categoryId: si.product.categoryId,
                            description: si.product.description,
                            brand: si.product.brand,
                            lastModified: new Date(),
                            updatedAt: new Date()
                        });
                    }
                }
            }
            const [allStockin, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
                db.stockins_all.toArray(),
                db.stockins_offline_add.toArray(),
                db.stockins_offline_update.toArray(),
                db.stockins_offline_delete.toArray()
            ]);
            const deleteIds = new Set(offlineDeletes.map(d => d.id));
            const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));
            const combinedStockin = allStockin
                .filter(c => !deleteIds.has(c.id))
                .map(c => ({ ...c, ...updateMap.get(c.id), synced: true }))
                .concat(offlineAdds.map(a => ({ ...a, synced: false })))
                .sort((a, b) => a.synced - b.synced);
            return combinedStockin;
        } catch (error) {
            console.error('Error fetching stock-ins:', error);
            if (!error.response) {
                return await db.stockins_all.toArray();
            }
        }
    };

    const fetchBackorders = async () => {
        try {
            if (isOnline) {
                const response = await backOrderService.getAllBackOrders();
                for (const b of response.backorders || response) {
                    await db.backorders_all.put({
                        id: b.id,
                        quantity: b.quantity,
                        soldPrice: b.soldPrice,
                        productName: b.productName,
                        adminId: b.adminId,
                        employeeId: b.employeeId,
                        lastModified: b.lastModified || new Date(),
                        createdAt: b.createdAt || new Date(),
                        updatedAt: b.updatedAt || new Date()
                    });
                }
            }
            const [allBackOrder, offlineAdds] = await Promise.all([
                db.backorders_all.toArray(),
                db.backorders_offline_add.toArray(),
            ]);
            const combinedBackOrder = allBackOrder
                .map(c => ({ ...c, synced: true }))
                .concat(offlineAdds.map(a => ({ ...a, synced: false })))
                .sort((a, b) => a.synced - b.synced);
            return combinedBackOrder;
        } catch (error) {
            console.error('Error fetching backorders:', error);
            if (!error?.response) {
                const [allBackOrder, offlineAdds] = await Promise.all([
                    db.backorders_all.toArray(),
                    db.backorders_offline_add.toArray(),
                ]);
                const combinedBackOrder = allBackOrder
                    .map(c => ({ ...c, synced: true }))
                    .concat(offlineAdds.map(a => ({ ...a, synced: false })))
                    .sort((a, b) => a.synced - b.synced);
                return combinedBackOrder;
            }
        }
    };

    const fetchProducts = async () => {
        try {
            if (isOnline) {
                const response = await productService.getAllProducts();
                for (const p of response.products || response) {
                    await db.products_all.put({
                        id: p.id,
                        productName: p.productName,
                        categoryId: p.categoryId,
                        description: p.description,
                        brand: p.brand,
                        lastModified: p.createdAt || new Date(),
                        updatedAt: p.updatedAt || new Date()
                    });
                }
            }
            const [allProducts, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
                db.products_all.toArray(),
                db.products_offline_add.toArray(),
                db.products_offline_update.toArray(),
                db.products_offline_delete.toArray()
            ]);
            const deleteIds = new Set(offlineDeletes.map(d => d.id));
            const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));
            const combinedProducts = allProducts
                .filter(c => !deleteIds.has(c.id))
                .map(c => ({ ...c, ...updateMap.get(c.id), synced: true }))
                .concat(offlineAdds.map(a => ({ ...a, synced: false })))
                .sort((a, b) => a.synced - b.synced);
            return combinedProducts;
        } catch (error) {
            console.error('Error fetching products:', error);
            if (!error?.response) {
                const [allProducts, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
                    db.products_all.toArray(),
                    db.products_offline_add.toArray(),
                    db.products_offline_update.toArray(),
                    db.products_offline_delete.toArray()
                ]);
                const deleteIds = new Set(offlineDeletes.map(d => d.id));
                const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));
                const combinedProducts = allProducts
                    .filter(c => !deleteIds.has(c.id))
                    .map(c => ({ ...c, ...updateMap.get(c.id), synced: true }))
                    .concat(offlineAdds.map(a => ({ ...a, synced: false })))
                    .sort((a, b) => a.synced - b.synced);
                return combinedProducts;
            }
        }
    };

    const validateStockInId = (stockinId) => {
        if (!stockinId) {
            return 'Please select a stock-in entry';
        }
        return '';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'RWF'
        }).format(amount);
    };

    const validateQuantity = (quantity, stockinId) => {
        if (!quantity) {
            return 'Quantity is required';
        }

        const numQuantity = Number(quantity);

        if (isNaN(numQuantity) || numQuantity <= 0) {
            return 'Quantity must be a positive number';
        }

        if (!Number.isInteger(numQuantity)) {
            return 'Quantity must be a whole number';
        }

        // Check if quantity exceeds available stock (only for stock-in, not Non-Stock Sales)
        if (stockinId && stockIns) {
            const selectedStockIn = stockIns.find(stock => stock.id === stockinId || stock.localId === stockinId);
            if (selectedStockIn) {
                const availableQty = selectedStockIn.offlineQuantity ?? selectedStockIn.quantity;

                if (numQuantity > availableQty) {
                    return `Quantity cannot exceed available stock (${availableQty})`;
                }
            }
        }

        return '';
    };

    const validateEmail = (email) => {
        if (!email) return ''; // Email is optional
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) ? '' : 'Please enter a valid email address';
    };

    const validateBackOrder = (backOrder) => {
        if (!backOrder) return 'Non-Stock Sale information is required';
        if (!backOrder.productName?.trim()) return 'Product name is required for Non-Stock Sale';
        if (!backOrder.sellingPrice || backOrder.sellingPrice <= 0) return 'Selling price is required for Non-Stock Sale';
        return '';
    };

    const onClose = (closeForm) => {
        if (closeForm) {
            Swal.fire({
                icon: "success",
                title: "Closed successfully",
                showConfirmButton: false,
                timer: 1500,
            }).then(() => {
                navigate("/admin/dashboard/stockout");
            });
            return;
        }

        Swal.fire({
            title: "Are you sure?",
            text: "Do you really want to close this form?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, close it!",
        }).then((result) => {
            if (result.isConfirmed) {
                navigate("/admin/dashboard/stockout");
            }
        });
    };

    // Calculate suggested quantity (half of available stock, minimum 1)
    const calculateSuggestedQuantity = (availableQuantity) => {
        if (!availableQuantity || availableQuantity <= 0) return 1;
        const halfQuantity = Math.floor(availableQuantity / 2);
        return halfQuantity > 0 ? halfQuantity : 1;
    };

    // Get stock information for display
    const getStockInfo = (stockinId) => {
        if (!stockinId || !stockIns) return null;
        return stockIns.find(stock => stock.id === stockinId || stock.localId === stockinId);
    };

    // Single entry handlers (for update mode)
    const handleStockInChange = (e) => {
        const value = e.target.value;
        // Auto-fill quantity and soldPrice when stock is selected
        if (value && stockIns) {
            const selectedStock = stockIns.find(stock => stock.id === value || stock.localId === value);
            if (selectedStock) {
                const suggestedQuantity = calculateSuggestedQuantity(selectedStock.offlineQuantity ?? selectedStock.quantity);
                setFormData(prev => ({
                    ...prev,
                    stockinId: value,
                    quantity: suggestedQuantity.toString(),
                    soldPrice: selectedStock.sellingPrice.toString()
                }));
            }
        } else if (!value) {
            // Clear quantity and soldPrice when stock selection is cleared
            setFormData(prev => ({
                ...prev,
                stockinId: value,
                quantity: '',
                soldPrice: ''
            }));
        }

        const stockinError = validateStockInId(value);
        setValidationErrors(prev => ({
            ...prev,
            stockinId: stockinError
        }));
    };

    const handleQuantityChange = (e) => {
        const value = e.target.value;
        setFormData({ ...formData, quantity: value });

        const quantityError = validateQuantity(value, formData.stockinId);
        setValidationErrors(prev => ({
            ...prev,
            quantity: quantityError
        }));
    };

    // Multiple entries handlers (for create mode)
    const addSalesEntry = () => {
        setFormData(prev => ({
            ...prev,
            salesEntries: [...prev.salesEntries, { stockinId: '', quantity: '', soldPrice: '', isBackOrder: false, backOrder: null }]
        }));
        setValidationErrors(prev => ({
            ...prev,
            salesEntries: [...prev.salesEntries, {}]
        }));
    };

    const removeSalesEntry = (index) => {
        if (formData.salesEntries.length > 1) {
            setFormData(prev => ({
                ...prev,
                salesEntries: prev.salesEntries.filter((_, i) => i !== index)
            }));
            setValidationErrors(prev => ({
                ...prev,
                salesEntries: prev.salesEntries.filter((_, i) => i !== index)
            }));
        }
    };

    // Toggle entry type between stock-in and Non-Stock Sale
    const toggleEntryType = (index) => {
        const updatedEntries = [...formData.salesEntries];
        const currentEntry = updatedEntries[index];

        updatedEntries[index] = {
            ...currentEntry,
            isBackOrder: !currentEntry.isBackOrder,
            // Reset fields when switching types
            stockinId: '',
            quantity: '',
            soldPrice: '',
            backOrder: !currentEntry.isBackOrder ? {
                productName: '',
                sellingPrice: ''
            } : null
        };

        setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));

        // Clear validation errors for this entry
        const updatedErrors = [...validationErrors.salesEntries];
        updatedErrors[index] = {};
        setValidationErrors(prev => ({ ...prev, salesEntries: updatedErrors }));
    };

    // Handle Non-Stock Sale field changes
    const handleBackOrderChange = (index, field, value) => {
        const updatedEntries = [...formData.salesEntries];
        updatedEntries[index] = {
            ...updatedEntries[index],
            backOrder: {
                ...updatedEntries[index].backOrder,
                [field]: value
            }
        };
        setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));

        // Clear validation errors when user starts typing
        const updatedErrors = [...validationErrors.salesEntries];
        if (updatedErrors[index]) {
            updatedErrors[index] = { ...updatedErrors[index], backOrder: '' };
            setValidationErrors(prev => ({ ...prev, salesEntries: updatedErrors }));
        }
    };

    const handleSalesEntryChange = (index, field, value) => {
        const updatedEntries = [...formData.salesEntries];
        updatedEntries[index] = { ...updatedEntries[index], [field]: value };

        setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));

        // Validate the changed field
        let error = '';
        if (field === 'stockinId') {
            error = validateStockInId(value);

            // Also re-validate quantity if it exists
            const quantityError = updatedEntries[index].quantity
                ? validateQuantity(updatedEntries[index].quantity, value)
                : '';

            const updatedErrors = [...validationErrors.salesEntries];
            updatedErrors[index] = {
                ...updatedErrors[index],
                stockinId: error,
                quantity: quantityError
            };
            setValidationErrors(prev => ({ ...prev, salesEntries: updatedErrors }));

            // Auto-fill quantity and sold price when stock is selected
            if (value && stockIns) {
                const selectedStock = stockIns.find(stock => stock.id === value || stock.localId === value);
                if (selectedStock) {
                    const suggestedQuantity = calculateSuggestedQuantity(selectedStock.offlineQuantity ?? selectedStock.quantity);
                    updatedEntries[index].quantity = suggestedQuantity.toString();
                    updatedEntries[index].soldPrice = selectedStock.sellingPrice.toString();
                    setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));
                }
            }
        } else if (field === 'quantity') {
            error = validateQuantity(value, updatedEntries[index].stockinId);

            const updatedErrors = [...validationErrors.salesEntries];
            updatedErrors[index] = { ...updatedErrors[index], quantity: error };
            setValidationErrors(prev => ({ ...prev, salesEntries: updatedErrors }));
        }
    };

    // Helper function to set suggested quantity for a specific entry
    const setSuggestedQuantity = (index) => {
        const entry = formData.salesEntries[index];
        if (!entry.stockinId) return;

        const stockInfo = getStockInfo(entry.stockinId);
        if (!stockInfo) return;

        const suggestedQuantity = calculateSuggestedQuantity(stockInfo.offlineQuantity ?? stockInfo.quantity);
        handleSalesEntryChange(index, 'quantity', suggestedQuantity.toString());
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setFormData({ ...formData, clientEmail: value });

        const emailError = validateEmail(value);
        setValidationErrors(prev => ({
            ...prev,
            clientEmail: emailError
        }));
    };


    const handleAddStockOut = async (stockOutData) => {
        setIsLoading(true);
        try {
            const userInfo = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
            const now = new Date();
            const salesArray = stockOutData.salesEntries || [{
                stockinId: stockOutData.stockinId,
                quantity: stockOutData.quantity,
                soldPrice: stockOutData.soldPrice,
                isBackOrder: false,
                backOrder: null
            }];
            const clientInfo = {
                clientName: stockOutData.clientName,
                clientEmail: stockOutData.clientEmail,
                clientPhone: stockOutData.clientPhone,
                paymentMethod: stockOutData.paymentMethod
            };
            let localTransactionId = `local-trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            let createdStockouts = [];

            for (const sale of salesArray) {
                let newStockout;
                let backorderLocalId = null;

                if (sale.isBackOrder) {
                    const backOrderRecord = {
                        quantity: sale.quantity,
                        soldPrice: sale.soldPrice,
                        sellingPrice: sale.soldPrice,
                        productName: sale.backOrder.productName,
                        ...userInfo,
                        lastModified: now,
                        createdAt: now,
                        updatedAt: now
                    };
                    backorderLocalId = await db.backorders_offline_add.add(backOrderRecord);
                    newStockout = {
                        stockinId: null,
                        quantity: sale.quantity,
                        offlineQuantity: sale.quantity,
                        soldPrice: sale.soldPrice,
                        clientName: clientInfo.clientName,
                        clientEmail: clientInfo.clientEmail,
                        clientPhone: clientInfo.clientPhone,
                        paymentMethod: clientInfo.paymentMethod,
                        ...userInfo,
                        transactionId: localTransactionId,
                        isBackOrder: true,
                        backorderLocalId,
                        lastModified: now,
                        createdAt: now,
                        updatedAt: now
                    };
                    const localId = await db.stockouts_offline_add.add(newStockout);
                    createdStockouts.push({ ...newStockout, localId, synced: false });
                } else {
                    const stockins = await fetchStockIns();
                    const stockin = stockins.find(s => s.id === sale.stockinId || s.localId === sale.stockinId);
                    if (!stockin) throw new Error(`Stock-in not found for ID: ${sale.stockinId}`);
                    if (stockin.quantity < sale.quantity) {
                        throw new Error(`Not enough stock for ID: ${sale.stockinId}. Available: ${stockin.quantity}, Requested: ${sale.quantity}`);
                    }
                    const soldPrice = sale.soldPrice || (stockin.sellingPrice * sale.quantity);
                    newStockout = {
                        stockinId: sale.stockinId,
                        quantity: sale.quantity,
                        offlineQuantity: sale.quantity,
                        soldPrice,
                        clientName: clientInfo.clientName,
                        clientEmail: clientInfo.clientEmail,
                        clientPhone: clientInfo.clientPhone,
                        paymentMethod: clientInfo.paymentMethod,
                        ...userInfo,
                        transactionId: localTransactionId,
                        isBackOrder: false,
                        lastModified: now,
                        createdAt: now,
                        updatedAt: now
                    };
                    const localId = await db.stockouts_offline_add.add(newStockout);
                    createdStockouts.push({ ...newStockout, localId, synced: false });
                    const newQuantity = (stockin.offlineQuantity ?? stockin.quantity) - sale.quantity;
                    const existingStockin = await db.stockins_all.get(sale.stockinId);
                    if (existingStockin) {
                        await db.stockins_all.update(sale.stockinId, { quantity: newQuantity });
                    } else {
                        const offlineStockin = await db.stockins_offline_add.get(sale.stockinId);
                        if (offlineStockin) {
                            await db.stockins_offline_add.update(sale.stockinId, { offlineQuantity: newQuantity });
                        }
                    }
                }
            }

            if (isOnline) {
                try {
                    const response = await stockOutService.createMultipleStockOut(salesArray, clientInfo, userInfo);
                    await Promise.all(
                        response.data.map(async (serverSo, idx) => {
                            const local = createdStockouts[idx];
                            await db.synced_stockout_ids.add({
                                localId: local.localId,
                                serverId: serverSo.id,
                                syncedAt: now,
                            });
                            await db.stockouts_all.put({
                                id: serverSo.id,
                                stockinId: serverSo.stockinId,
                                backorderId: serverSo.backorderId || null,
                                quantity: serverSo.quantity,
                                soldPrice: serverSo.soldPrice,
                                clientName: serverSo.clientName,
                                transactionId: serverSo.transactionId,
                                clientEmail: serverSo.clientEmail,
                                clientPhone: serverSo.clientPhone,
                                paymentMethod: serverSo.paymentMethod,
                                lastModified: serverSo.lastModified || now,
                                updatedAt: serverSo.updatedAt || now,
                            });
                            await db.stockouts_offline_add.delete(local.localId);
                            if (serverSo.backorderId && local.backorderLocalId) {
                                await db.backorders_all.put({
                                    id: serverSo.backorderId,
                                    quantity: serverSo.quantity,
                                    soldPrice: serverSo.soldPrice,
                                    productName: serverSo.productName,
                                    ...userInfo,
                                    lastModified: now,
                                    createdAt: serverSo.createdAt || now,
                                    updatedAt: serverSo.updatedAt || now,
                                });
                                await db.backorders_offline_add.delete(local.backorderLocalId);
                            }
                        })
                    );
                    navigate(`/admin/dashboard/stockout?transactionId=${response.transactionId}`);
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: `Stock out transaction created successfully with ${salesArray.length} entries!`,
                        customClass: {
                            popup: 'swal-text-xs'
                        },
                        showConfirmButton: false,
                        timer: 1500,
                    });

                } catch (error) {
                    console.warn('Error posting to server, keeping offline:', error);
                    Swal.fire({
                        icon: 'warning',
                        title: 'Offline Save',
                        text: 'Stock out saved offline (will sync when online)',
                        customClass: {
                            popup: 'swal-text-xs'
                        },
                        showConfirmButton: false,
                        timer: 1500,
                    });
                }
            } else {

                Swal.fire({
                    icon: 'warning',
                    title: 'Offline Save',
                    text: 'Stock out saved offline (will sync when online)',
                    customClass: {
                        popup: 'swal-text-xs'
                    },
                    showConfirmButton: false,
                    timer: 1500,
                });
                navigate(`/admin/dashboard/stockout?transactionId=${localTransactionId}`);
            }




            // Reset form after submission
            setFormData({
                stockinId: '',
                backorderId: '',
                quantity: '',
                clientName: '',
                clientEmail: '',
                clientPhone: '',
                paymentMethod: '',
                salesEntries: [{ stockinId: '', quantity: '', soldPrice: '', isBackOrder: false, backOrder: null }]
            });

            setValidationErrors({
                stockinId: '',
                quantity: '',
                clientEmail: '',
                salesEntries: []
            });


        } catch (error) {
            console.error('Error adding stock out:', error);
            setCloseForm(false);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Failed to add stock out: ${error.message}`,
                customClass: {
                    popup: 'swal-text-xs'
                },
                showConfirmButton: false,
                timer: 1500,
            });
        } finally {
            setIsLoading(false);
        }
    };

    
      const handleUpdateStockOut = async (stockOutData) => {
        setIsLoading(true);
        try {
          const userInfo = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
          const now = new Date();
          const updatedData = {
            ...stockOutData,
            id: stockOutData.id,
            quantity: stockOutData.quantity,
            offlineQuantity: stockOutData.quantity,
            soldPrice: stockOutData.soldPrice,
            clientName: stockOutData.clientName,
            clientEmail: stockOutData.clientEmail,
            clientPhone: stockOutData.clientPhone,
            paymentMethod: stockOutData.paymentMethod,
            ...userInfo,
            lastModified: now,
            updatedAt: now
          };
    
          if (isOnline) {
            try {
              const response = await stockOutService.updateStockOut(stockOutData.id, { ...stockOutData, ...userInfo });
              await db.stockouts_all.put({
                id: response.id,
                stockinId: response.stockinId,
                quantity: response.quantity,
                soldPrice: response.soldPrice,
                clientName: response.clientName,
                clientEmail: response.clientEmail,
                clientPhone: response.clientPhone,
                paymentMethod: response.paymentMethod,
                adminId: response.adminId,
                backorderId: response.backorderId,
                employeeId: response.employeeId,
                transactionId: response.transactionId,
                lastModified: response.createdAt || new Date(),
                createdAt: response.createdAt,
                updatedAt: response.updatedAt || new Date()
              });
              await db.stockouts_offline_update.delete(selectedStockOut.id);
            //   setNotification({
            //     type: 'success',
            //     message: 'Stock out updated successfully!'
            //   });
            } catch (error) {
              await db.stockouts_offline_update.put(updatedData);
            //   setNotification({
            //     type: 'warning',
            //     message: 'Stock out updated offline (will sync when online)'
            //   });
            }
          } else {
            await db.stockouts_offline_update.put(updatedData);
            // setNotification({
            //   type: 'warning',
            //   message: 'Stock out updated offline (will sync when online)'
            // });
          }
          if (stockOutData.stockinId) {
            const stockin = await db.stockins_all.get(stockOutData.stockinId);
            if (stockin) {
              const oldQuantity = stockOutData.quantity;
              const quantityDelta = stockOutData.quantity - oldQuantity;
              const newStockQuantity = stockin.quantity - quantityDelta;
              await db.stockins_all.update(stockOutData.stockinId, { quantity: newStockQuantity });
            }
          }
    
          await loadStockOuts();
         onClose(true)
        } catch (error) {
          console.error('Error updating stock out:', error);
          setNotification({
            type: 'error',
            message: `Failed to update stock out: ${error.message}`
          });
        } finally {
          setIsLoading(false);
        }
      };




    const handleSubmit = (e) => {
        e.preventDefault();

        if (isUpdateMode) {
            // Single entry validation for update mode
            const emailError = validateEmail(formData.clientEmail);

            // Validate based on whether it's a stock-in or Non-Stock Sale
            let stockinError = '';
            let quantityError = '';

            if (stockOut.backorderId) {
                // Non-Stock Sale update - only validate quantity
                quantityError = !formData.quantity ? 'Quantity is required' : '';
                if (formData.quantity) {
                    const numQuantity = Number(formData.quantity);
                    if (isNaN(numQuantity) || numQuantity <= 0) {
                        quantityError = 'Quantity must be a positive number';
                    } else if (!Number.isInteger(numQuantity)) {
                        quantityError = 'Quantity must be a whole number';
                    }
                }
            } else {
                // Stock-in update
                stockinError = validateStockInId(formData.stockinId);
                quantityError = validateQuantity(formData.quantity, formData.stockinId);
            }

            setValidationErrors({
                stockinId: stockinError,
                quantity: quantityError,
                clientEmail: emailError,
                salesEntries: []
            });

            if (stockinError || quantityError || emailError) {
                return;
            }

            // Prepare single entry data for update
            const submitData = {
                ...stockOut,
            };
            if (formData.stockinId) submitData.stockinId = formData.stockinId;
            if (formData.quantity) submitData.quantity = Number(formData.quantity);
            if (formData.soldPrice) submitData.soldPrice = Number(formData.soldPrice);
            if (formData.clientName.trim()) submitData.clientName = formData.clientName.trim();
            if (formData.clientEmail.trim()) submitData.clientEmail = formData.clientEmail.trim();
            if (formData.clientPhone.trim()) submitData.clientPhone = formData.clientPhone.trim();
            if (formData.paymentMethod) submitData.paymentMethod = formData.paymentMethod;
            setCloseForm(true);
            handleUpdateStockOut(submitData);

           
        } else {
            // Multiple entries validation for create mode
            const emailError = validateEmail(formData.clientEmail);
            const salesErrors = formData.salesEntries.map(entry => {
                if (entry.isBackOrder) {
                    return {
                        quantity: !entry.quantity ? 'Quantity is required' : '',
                        backOrder: validateBackOrder(entry.backOrder)
                    };
                } else {
                    return {
                        stockinId: validateStockInId(entry.stockinId),
                        quantity: validateQuantity(entry.quantity, entry.stockinId)
                    };
                }
            });

            setValidationErrors({
                stockinId: '',
                quantity: '',
                clientEmail: emailError,
                salesEntries: salesErrors
            });

            // Check if there are any validation errors
            const hasEmailError = !!emailError;
            const hasSalesErrors = salesErrors.some(error => error.stockinId || error.quantity || error.backOrder);

            if (hasEmailError || hasSalesErrors) {
                return;
            }

            // Check for duplicate stock entries (only for stock-in entries)
            const stockinIds = formData.salesEntries
                .filter(entry => !entry.isBackOrder && entry.stockinId)
                .map(entry => entry.stockinId);
            const uniqueStockinIds = new Set(stockinIds);
            if (stockinIds.length !== uniqueStockinIds.size) {
                alert('Cannot select the same stock-in entry multiple times');
                return;
            }

            // Prepare multiple entries data in the new format
            const salesArray = formData.salesEntries.map(entry => {
                if (entry.isBackOrder) {
                    return {
                        stockinId: null,
                        quantity: Number(entry.quantity),
                        soldPrice: Number(entry.backOrder.sellingPrice),
                        isBackOrder: true,
                        backOrder: {
                            productName: entry.backOrder.productName,
                            quantity: Number(entry.quantity),
                            sellingPrice: Number(entry.backOrder.sellingPrice)
                        }
                    };
                } else {
                    return {
                        stockinId: entry.stockinId,
                        quantity: Number(entry.quantity),
                        soldPrice: Number(entry.soldPrice),
                        isBackOrder: false,
                        backOrder: null
                    };
                }
            });

            // Prepare client info
            const clientInfo = {};
            if (formData.clientName.trim()) clientInfo.clientName = formData.clientName.trim();
            if (formData.clientEmail.trim()) clientInfo.clientEmail = formData.clientEmail.trim();
            if (formData.clientPhone.trim()) clientInfo.clientPhone = formData.clientPhone.trim();
            if (formData.paymentMethod) clientInfo.paymentMethod = formData.paymentMethod;

            setCloseForm(true);

            // Submit data in the format expected by the backend
            handleAddStockOut({
                salesEntries: salesArray,
                ...clientInfo
            });
        }



    };

    const isFormValid = () => {
        if (isUpdateMode) {
            // For update mode, check if it's a Non-Stock Sale or stock-in
            if (stockOut.backorderId) {
                // Non-Stock Sale: only quantity is required
                return formData.quantity && !validationErrors.quantity && !validationErrors.clientEmail;
            } else {
                // Stock-in: stockinId and quantity required
                return formData.stockinId &&
                    formData.quantity &&
                    !validationErrors.stockinId &&
                    !validationErrors.quantity &&
                    !validationErrors.clientEmail;
            }
        } else {
            // Create mode: validate all entries
            const allEntriesValid = formData.salesEntries.every(entry => {
                if (entry.isBackOrder) {
                    return entry.quantity && entry.backOrder?.productName && entry.backOrder?.sellingPrice;
                } else {
                    return entry.stockinId && entry.quantity;
                }
            });

            const noValidationErrors = validationErrors.salesEntries.every(error =>
                !error.stockinId && !error.quantity && !error.backOrder
            );

            return allEntriesValid && !validationErrors.clientEmail && noValidationErrors;
        }
    };

    
    return (
        <div className="flex items-center justify-center bg-white text-sm">
            <div className="rounded-lg p-4 w-full mx-3 max-h-[90vh]">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold mb-3">{title}</h2>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                    {isUpdateMode ? (
                        // Single entry form for update mode
                        <>
                            {stockOut.backorderId ? (
                                // Non-Stock Sale update form
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <ShoppingCart size={16} className="text-orange-600" />
                                        <h3 className="font-medium text-orange-800 text-sm">Updating Non-Stock Sale</h3>
                                    </div>

                                    {/* Display Non-Stock Sale info if available */}
                                    {stockOut.backorder && (
                                        <div className="mb-3 p-2 bg-white rounded border text-xs">
                                            <div className="space-y-0.5">
                                                <div><strong>Product:</strong> {stockOut.backorder.productName}</div>
                                                <div><strong>Price:</strong> {formatCurrency(stockOut.backorder.soldPrice || 0)}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Quantity for Non-Stock Sale */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Quantity Sold <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.quantity}
                                            onChange={handleQuantityChange}
                                            min="1"
                                            className={`w-full px-2 py-1.5 border rounded-lg focus:ring-2 ${validationErrors.quantity
                                                ? 'border-red-300 focus:ring-red-500'
                                                : 'border-gray-300 focus:ring-blue-500'
                                                } text-sm`}
                                            placeholder="Enter quantity sold"
                                        />
                                        {validationErrors.quantity && (
                                            <p className="text-red-500 text-xs mt-0.5">{validationErrors.quantity}</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // Stock-in update form
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Package size={16} className="text-blue-600" />
                                        <h3 className="font-medium text-blue-800 text-sm">Updating Stock-In Transaction</h3>
                                    </div>

                                    {/* Sold Price */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Sold Price <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.soldPrice}
                                            onChange={(e) => setFormData({ ...formData, soldPrice: e.target.value })}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                            placeholder="Enter sold price"
                                        />
                                        {formData.stockinId && stockIns && (
                                            <p className="text-gray-500 text-xs mt-0.5">
                                                Original price: {formatCurrency(stockIns.find(stock => stock.id === formData.stockinId || stock.localId === formData.stockinId)?.sellingPrice || 0)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Stock-In Selection */}
                                    <div className="mb-3">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Stock-In Entry <span className="text-red-500">*</span>
                                        </label>
                                        <SearchableStockInDropdown
                                            stockIns={stockIns}
                                            value={formData.stockinId}
                                            onChange={handleStockInChange}
                                            error={!!validationErrors.stockinId}
                                            formatCurrency={formatCurrency}
                                        />
                                        {validationErrors.stockinId && (
                                            <p className="text-red-500 text-xs mt-0.5">{validationErrors.stockinId}</p>
                                        )}
                                    </div>

                                    {/* Quantity */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Quantity Sold <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.quantity}
                                            onChange={handleQuantityChange}
                                            min="1"
                                            className={`w-full px-2 py-1.5 border rounded-lg focus:ring-2 ${validationErrors.quantity
                                                ? 'border-red-300 focus:ring-red-500'
                                                : 'border-gray-300 focus:ring-blue-500'
                                                } text-sm`}
                                            placeholder="Enter quantity sold"
                                        />
                                        {validationErrors.quantity && (
                                            <p className="text-red-500 text-xs mt-0.5">{validationErrors.quantity}</p>
                                        )}
                                        {formData.stockinId && stockIns && (
                                            <p className="text-gray-500 text-xs mt-0.5">
                                                Available stock: {stockIns.find(stock => stock.id === formData.stockinId || stock.localId === formData.stockinId)?.offlineQuantity
                                                    ?? stockIns.find(stock => stock.id === formData.stockinId)?.quantity
                                                    ?? 0}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        // Multiple entries form for create mode
                        <div className="min-h-[50vh] max-h-96 overflow-y-auto">
                            <div className="mb-3">
                                <h3 className="text-base font-medium text-gray-800">Sales Entries</h3>
                                <p className="text-xs text-gray-600">Add stock-in items or Non-Stock Sales for this transaction</p>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                {formData.salesEntries.map((entry, index) => {
                                    const stockInfo = getStockInfo(entry.stockinId);

                                    return (
                                        <div key={index} className={`border rounded-lg p-3 mb-3 ${entry.isBackOrder ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-1.5">
                                                    {entry.isBackOrder ? (
                                                        <ShoppingCart size={14} className="text-orange-600" />
                                                    ) : (
                                                        <Package size={14} className="text-blue-600" />
                                                    )}
                                                    <h4 className="font-medium text-gray-700 text-sm">
                                                        Entry #{index + 1} - {entry.isBackOrder ? 'Non-Stock Sale' : 'Stock Item'}
                                                    </h4>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleEntryType(index)}
                                                        className={`px-2 py-0.5 text-xs rounded-full transition-colors ${entry.isBackOrder
                                                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                            }`}
                                                    >
                                                        Switch to {entry.isBackOrder ? 'Stock Item' : 'Non-Stock Sale'}
                                                    </button>
                                                    {formData.salesEntries.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSalesEntry(index)}
                                                            className="text-red-500 hover:text-red-700 text-xs"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {entry.isBackOrder ? (
                                                // Non-Stock Sale Form
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Product Name <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={entry.backOrder?.productName || ''}
                                                            onChange={(e) => handleBackOrderChange(index, 'productName', e.target.value)}
                                                            className={`w-full px-2 py-1.5 border rounded-lg focus:ring-2 ${validationErrors.salesEntries[index]?.backOrder
                                                                ? 'border-red-300 focus:ring-red-500'
                                                                : 'border-gray-300 focus:ring-blue-500'
                                                                } text-sm`}
                                                            placeholder="Enter product name"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Selling Price <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={entry.backOrder?.sellingPrice || ''}
                                                            onChange={(e) => handleBackOrderChange(index, 'sellingPrice', e.target.value)}
                                                            min="0"
                                                            step="0.01"
                                                            className={`w-full px-2 py-1.5 border rounded-lg focus:ring-2 ${validationErrors.salesEntries[index]?.backOrder
                                                                ? 'border-red-300 focus:ring-red-500'
                                                                : 'border-gray-300 focus:ring-blue-500'
                                                                } text-sm`}
                                                            placeholder="Enter selling price"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Quantity <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={entry.quantity}
                                                            onChange={(e) => handleSalesEntryChange(index, 'quantity', e.target.value)}
                                                            min="1"
                                                            className={`w-full px-2 py-1.5 border rounded-lg focus:ring-2 ${validationErrors.salesEntries[index]?.quantity
                                                                ? 'border-red-300 focus:ring-red-500'
                                                                : 'border-gray-300 focus:ring-blue-500'
                                                                } text-sm`}
                                                            placeholder="Enter quantity"
                                                        />
                                                        {validationErrors.salesEntries[index]?.quantity && (
                                                            <p className="text-red-500 text-xs mt-0.5">
                                                                {validationErrors.salesEntries[index].quantity}
                                                            </p>
                                                        )}
                                                        {entry.backOrder?.sellingPrice && entry.quantity && (
                                                            <p className="text-green-600 text-xs mt-0.5">
                                                                Total: {formatCurrency(entry.backOrder.sellingPrice * Number(entry.quantity || 0))}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {validationErrors.salesEntries[index]?.backOrder && (
                                                        <div className="md:col-span-3">
                                                            <p className="text-red-500 text-xs">{validationErrors.salesEntries[index].backOrder}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                // Stock-In Form
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {/* Stock-In Selection */}
                                                    <div className="col-span-1">
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Stock-In Entry <span className="text-red-500">*</span>
                                                        </label>
                                                        <SearchableStockInDropdown
                                                            stockIns={stockIns}
                                                            value={entry.stockinId}
                                                            onChange={(e) => handleSalesEntryChange(index, 'stockinId', e.target.value)}
                                                            error={!!validationErrors.salesEntries[index]?.stockinId}
                                                            formatCurrency={formatCurrency}
                                                            placeholder="Select a stock-in entry"
                                                        />
                                                        {validationErrors.salesEntries[index]?.stockinId && (
                                                            <p className="text-red-500 text-xs mt-0.5">
                                                                {validationErrors.salesEntries[index].stockinId}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Quantity */}
                                                    <div className="col-span-1">
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Quantity Sold <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                value={entry.quantity}
                                                                onChange={(e) => handleSalesEntryChange(index, 'quantity', e.target.value)}
                                                                min="1"
                                                                className={`w-full px-2 py-1.5 pr-7 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${validationErrors.salesEntries[index]?.quantity
                                                                    ? 'border-red-300 focus:ring-red-500'
                                                                    : 'border-gray-300 focus:ring-blue-500'
                                                                    } text-sm`}
                                                                placeholder="Qty"
                                                            />
                                                            {entry.stockinId && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSuggestedQuantity(index)}
                                                                    className="absolute right-1 top-1 bottom-1 px-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-blue-300"
                                                                    title="Fill half quantity"
                                                                >
                                                                    ½
                                                                </button>
                                                            )}
                                                        </div>
                                                        {validationErrors.salesEntries[index]?.quantity && (
                                                            <p className="text-red-500 text-xs mt-0.5">
                                                                {validationErrors.salesEntries[index].quantity}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Sold Price */}
                                                    <div className="col-span-1">
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Sold Price <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                value={entry.soldPrice}
                                                                onChange={(e) => handleSalesEntryChange(index, 'soldPrice', e.target.value)}
                                                                min="0"
                                                                step="0.01"
                                                                className="w-full px-2 py-1.5 pr-7 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                                                                placeholder="Price"
                                                            />
                                                            {entry.stockinId && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const stockInfo = getStockInfo(entry.stockinId);
                                                                        if (stockInfo) {
                                                                            handleSalesEntryChange(index, 'soldPrice', stockInfo.sellingPrice.toString());
                                                                        }
                                                                    }}
                                                                    className="absolute right-1 top-1 bottom-1 px-1.5 text-xs bg-green-100 hover:bg-green-200 text-green-600 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-green-300"
                                                                    title="Use original selling price"
                                                                >
                                                                    $
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Stock Information Display */}
                                                    <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Stock Information
                                                        </label>
                                                        {stockInfo ? (
                                                            <div className="bg-gray-50 rounded-lg p-2 text-xs space-y-1 h-full">
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-gray-600">Available:</span>
                                                                        <span className="font-medium">{stockInfo.offlineQuantity ?? stockInfo.quantity}</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-gray-600">Suggested:</span>
                                                                        <span className="font-medium text-blue-600">
                                                                            {calculateSuggestedQuantity(stockInfo.offlineQuantity ?? stockInfo.quantity)} (½)
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-gray-600">Price:</span>
                                                                        <span className="font-medium text-green-600">
                                                                            {formatCurrency(stockInfo.sellingPrice)}
                                                                        </span>
                                                                    </div>
                                                                    {entry.quantity && (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-gray-600">Total:</span>
                                                                            <span className="font-bold text-blue-600">
                                                                                {formatCurrency(stockInfo.sellingPrice * Number(entry.quantity || 0))}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-500 h-full min-h-[60px] flex items-center justify-center">
                                                                Select a stock item
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add Sales Entry Button */}
                            <div className="flex justify-center mb-3 gap-2">
                                <button
                                    type="button"
                                    onClick={addSalesEntry}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-sm"
                                >
                                    <Package size={14} />
                                    Add Stock Item
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newEntry = { stockinId: '', quantity: '', soldPrice: '', isBackOrder: true, backOrder: { productName: '', sellingPrice: '' } };
                                        setFormData(prev => ({
                                            ...prev,
                                            salesEntries: [...prev.salesEntries, newEntry]
                                        }));
                                        setValidationErrors(prev => ({
                                            ...prev,
                                            salesEntries: [...prev.salesEntries, {}]
                                        }));
                                    }}
                                    className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-1.5 text-sm"
                                >
                                    <ShoppingCart size={14} />
                                    Add Non-Stock Sale
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Client Information Section */}
                    <div className="border-t pt-3">
                        <h3 className="text-base font-medium text-gray-800 mb-2">Client Information</h3>

                        {/* Better layout for client info inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Client Name */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Client Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="Enter client name"
                                />
                            </div>

                            {/* Client Email */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Client Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.clientEmail}
                                    onChange={handleEmailChange}
                                    className={`w-full px-2 py-1.5 border rounded-lg focus:ring-2 ${validationErrors.clientEmail
                                        ? 'border-red-300 focus:ring-red-500'
                                        : 'border-gray-300 focus:ring-blue-500'
                                        } text-sm`}
                                    placeholder="Enter client email"
                                />
                                {validationErrors.clientEmail && (
                                    <p className="text-red-500 text-xs mt-0.5">{validationErrors.clientEmail}</p>
                                )}
                            </div>

                            {/* Client Phone */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Client Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.clientPhone}
                                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="Enter client phone number"
                                />
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Payment Method
                                </label>
                                <select
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="" disabled>Choose payment method</option>
                                    <option value="CARD">Card</option>
                                    <option value="MOMO">Mobile Money</option>
                                    <option value="CASH">Cash</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Form Buttons */}
                    <div className="flex gap-2 pt-3">
                        <button
                            type="button"
                            onClick={() => onClose()}
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={closeForm || isLoading || !isFormValid()}
                            className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                            {isLoading ? 'Processing...' : stockOut ? 'Update' : 'Create Transaction'}
                        </button>
                    </div>
                </form>

                {/* Help Text */}
                <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700">
                        <strong>Create Mode:</strong> Add multiple stock items and Non-Stock Sales to create a single transaction.
                        <br />
                        <strong>Stock Items:</strong> Select stock items from the dropdown with auto-filled quantity (half of available stock).
                        <br />
                        <strong>Non-Stock Sales:</strong> For items not in stock, manually enter product details and pricing.
                        <br />
                        <strong>Update Mode:</strong> {isUpdateMode && stockOut?.backorderId ? 'Updating a Non-Stock Sale - only quantity can be modified.' : 'Updating a stock transaction - modify stock selection and quantity.'}
                        <br />
                        <strong>Required fields:</strong> Quantity is always required. For stock items: Stock-In selection. For Non-Stock Sales: Product name and selling price.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UpsertStockOutPage;