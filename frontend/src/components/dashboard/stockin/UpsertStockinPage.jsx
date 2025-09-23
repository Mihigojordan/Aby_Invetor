import { Package } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useEmployeeAuth from "../../../context/EmployeeAuthContext";
import useAdminAuth from "../../../context/AdminAuthContext";
import { useNetworkStatusContext } from "../../../context/useNetworkContext";
import { db } from "../../../db/database";
import productService from "../../../services/productService";
import stockInService from "../../../services/stockinService";

// Searchable Product Select Component
const SearchableProductSelect = ({
    value,
    onChange,
    products,
    error,
    placeholder = "Select a product",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredProducts, setFilteredProducts] = useState(products || []);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Filter products based on search term
    useEffect(() => {
        if (!products) return;

        if (!searchTerm.trim()) {
            setFilteredProducts(products);
        } else {
            const filtered = products.filter(product =>
                product.productName.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredProducts(filtered);
        }
    }, [searchTerm, products]);

    // Get selected product name
    const selectedProduct = products?.find(p => p.id === value || p.localId === value);
    const displayText = selectedProduct ? selectedProduct.productName : '';

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

    const handleInputClick = () => {
        setIsOpen(true);
        setSearchTerm('');
    };

    const handleProductSelect = (product) => {
        onChange({ target: { value: product.id || product?.localId } });
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm('');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredProducts.length === 1) {
                handleProductSelect(filteredProducts[0]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
            }
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={isOpen ? searchTerm : displayText}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClick={handleInputClick}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 ${error
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                        } ${className}`}
                    autoComplete="off"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.length > 0 ? (
                        <>
                            {searchTerm && (
                                <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b">
                                    {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                                </div>
                            )}
                            {filteredProducts.map((product, key) => (
                                <div
                                    key={key}
                                    onClick={() => handleProductSelect(product)}
                                    className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${(value === product.id || value === product.localId) ? 'bg-blue-100 text-blue-800' : 'text-gray-900'
                                        }`}
                                >
                                    {product.productName}  {!product.synced && (
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                            Pending
                                        </span>
                                    )}
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="px-3 py-2 text-gray-500 text-center">
                            {searchTerm ? 'No products found' : 'No products available'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Updated UpsertStockInPage with SearchableProductSelect
const UpsertStockInPage = ({ role }) => {
    const { id } = useParams();
    const [stockIn, setStockIn] = useState(null);
    const [products, setProducts] = useState([]);
    const { user: employeeData } = useEmployeeAuth();
    const { user: adminData } = useAdminAuth();
    const [isLoading, setIsLoading] = useState(false); // Start with loading true
    const [loading, setLoading] = useState(true); // Start with loading true
    const [title, setTitle] = useState('');
    const [isPageLoading, setIsPageLoading] = useState(true); // New state for page loading

    const [formData, setFormData] = useState({
        // Single entry fields (for update mode)
        productId: '',
        quantity: '',
        price: '',
        supplier: '',
        sellingPrice: '',
        // Multiple entries fields (for create mode)
        purchases: []
    });

    const [closeForm, setCloseForm] = useState(false);
    const { isOnline } = useNetworkStatusContext();
    const navigate = useNavigate();

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'RWF'
        }).format(amount);
    };

    const [validationErrors, setValidationErrors] = useState({
        productId: '',
        quantity: '',
        price: '',
        sellingPrice: '',
        purchases: []
    });

    const isUpdateMode = !!stockIn;

    const onClose = () => {
        const url =  role == 'admin' ? '/admin/dashboard/stockin' : '/employee/dashboard/stockin'
        navigate(url, { replace: true });
    };

    useEffect(() => {
        const fetchData = async () => {
            setIsPageLoading(true); // Set page loading to true
            try {
                if (id) {
                    const StockIns = await loadData();
                    const stockin = StockIns.combinedStockIns.find(s => s.id === id || s.localId === id);
                    setStockIn(stockin);
                    setTitle('Update Stock-In');
                } else {
                    const StockInsData = await loadData();
                    setProducts(StockInsData.productData);
                    setTitle('Create Stock-In');
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsPageLoading(false); // Set page loading to false
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    useEffect(() => {
        if (stockIn) {
            // Update mode - single entry
            setFormData({
                productId: stockIn.productId || '',
                quantity: stockIn.offlineQuantity ?? stockIn.quantity ?? '',
                price: stockIn.price || '',
                supplier: stockIn.supplier || '',
                sellingPrice: stockIn.sellingPrice || '',
                purchases: []
            });
        } else {
            // Create mode - multiple entries
            setFormData({
                productId: '',
                quantity: '',
                price: '',
                supplier: '',
                sellingPrice: '',
                purchases: [{ productId: '', quantity: '', price: '', supplier: '', sellingPrice: '' }]
            });
        }
        setCloseForm(false);
        // Clear validation errors when modal opens/closes
        setValidationErrors({
            productId: '',
            quantity: '',
            price: '',
            sellingPrice: '',
            purchases: []
        });
    }, [stockIn, id]);

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
                .map(c => ({
                    ...c,
                    ...updateMap.get(c.id),
                    synced: true
                }))
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
                    .map(c => ({
                        ...c,
                        ...updateMap.get(c.id),
                        synced: true
                    }))
                    .concat(offlineAdds.map(a => ({ ...a, synced: false })))
                    .sort((a, b) => a.synced - b.synced);
                return combinedProducts;
            }
        }
    };

    const loadData = async () => {
        try {
            const productData = await fetchProducts();
            setProducts(productData);

            const [allStockIns, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
                db.stockins_all.toArray(),
                db.stockins_offline_add.toArray(),
                db.stockins_offline_update.toArray(),
                db.stockins_offline_delete.toArray()
            ]);
            const deleteIds = new Set(offlineDeletes.map(d => d.id));
            const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));
            const combinedStockIns = allStockIns
                .filter(s => !deleteIds.has(s.id))
                .map(s => ({
                    ...s,
                    ...updateMap.get(s.id),
                    synced: true,
                    product: productData.find(p => p.id === s.productId) || { productName: 'Unknown Product' }
                }))
                .concat(offlineAdds.map(a => ({
                    ...a,
                    synced: false,
                    product: productData.find(p => p.id === a.productId || p.localId === a.productId) || { productName: 'Unknown Product' }
                }))).sort((a, b) => a.synced - b.synced);

            return {
                combinedStockIns,
                productData
            };
        } catch (error) {
            console.error('Error loading stock-ins:', error);
        }
    };

    const validateProduct = (productId) => {
        if (!productId) {
            return 'Please select a product';
        }
        return '';
    };

    const validateQuantity = (quantity) => {
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

        return '';
    };

    const validatePrice = (price) => {
        if (!price) {
            return 'Price is required';
        }

        const numPrice = Number(price);

        if (isNaN(numPrice) || numPrice <= 0) {
            return 'Price must be a positive number';
        }

        return '';
    };

    const validateSellingPrice = (sellingPrice) => {
        if (!sellingPrice) {
            return 'Selling price is required';
        }

        const numPrice = Number(sellingPrice);

        if (isNaN(numPrice) || numPrice <= 0) {
            return 'Selling price must be a positive number';
        }

        return '';
    };

    // Single entry handlers (for update mode)
    const handleProductChange = (e) => {
        const value = e.target.value;
        setFormData({ ...formData, productId: value });

        const productError = validateProduct(value);
        setValidationErrors(prev => ({ ...prev, productId: productError }));
    };

    const handleQuantityChange = (e) => {
        const value = e.target.value;
        setFormData({ ...formData, quantity: value });

        const quantityError = validateQuantity(value);
        setValidationErrors(prev => ({ ...prev, quantity: quantityError }));
    };

    const handlePriceChange = (e) => {
        const value = e.target.value;
        setFormData({ ...formData, price: value });

        const priceError = validatePrice(value);
        setValidationErrors(prev => ({ ...prev, price: priceError }));
    };

    const handleSellingPriceChange = (e) => {
        const value = e.target.value;
        setFormData({ ...formData, sellingPrice: value });

        const sellingPriceError = validateSellingPrice(value);
        setValidationErrors(prev => ({ ...prev, sellingPrice: sellingPriceError }));
    };

    // Multiple entries handlers (for create mode)
    const addPurchase = () => {
        setFormData(prev => ({
            ...prev,
            purchases: [...prev.purchases, { productId: '', quantity: '', price: '', supplier: '', sellingPrice: '' }]
        }));

        setValidationErrors(prev => ({
            ...prev,
            purchases: [...prev.purchases, {}]
        }));
    };

    const removePurchase = (index) => {
        if (formData.purchases.length > 1) {
            setFormData(prev => ({
                ...prev,
                purchases: prev.purchases.filter((_, i) => i !== index)
            }));

            setValidationErrors(prev => ({
                ...prev,
                purchases: prev.purchases.filter((_, i) => i !== index)
            }));
        }
    };

    const handlePurchaseChange = (index, field, value) => {
        const updatedPurchases = [...formData.purchases];
        updatedPurchases[index] = { ...updatedPurchases[index], [field]: value };

        setFormData(prev => ({ ...prev, purchases: updatedPurchases }));

        // Validate the changed field
        let error = '';
        if (field === 'productId') {
            error = validateProduct(value);
        } else if (field === 'quantity') {
            error = validateQuantity(value);
        } else if (field === 'price') {
            error = validatePrice(value);
        } else if (field === 'sellingPrice') {
            error = validateSellingPrice(value);
        }

        const updatedErrors = [...validationErrors.purchases];
        updatedErrors[index] = { ...updatedErrors[index], [field]: error };
        setValidationErrors(prev => ({ ...prev, purchases: updatedErrors }));
    };

    const handleAddStockIn = async (stockInData) => {
        setIsLoading(true);
        try {
            if (!adminData?.id && !employeeData?.id) {
                throw new Error('User authentication required');
            }
            const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
            const now = new Date();
            if (stockInData.purchases && Array.isArray(stockInData.purchases)) {
                const purchases = stockInData.purchases.map(purchase => ({
                    ...purchase,
                    ...userData,
                    lastModified: now,
                    createdAt: now,
                    updatedAt: now
                }));
                const localIds = [];
                for (const purchase of purchases) {
                    const localId = await db.stockins_offline_add.add({ ...purchase, offlineQuantity: purchase.quantity });
                    localIds.push(localId);
                }
                if (isOnline) {
                    try {
                        const response = await stockInService.createMultipleStockIn(purchases, userData);
                        await db.transaction('rw', db.stockins_all, db.stockins_offline_add, db.synced_stockin_ids, async () => {
                            for (let i = 0; i < response.stockIn.data.length; i++) {
                                const serverStockIn = response.stockIn.data[i];
                                await db.stockins_all.put({
                                    id: serverStockIn.id,
                                    productId: serverStockIn.productId,
                                    quantity: serverStockIn.quantity,
                                    price: serverStockIn.price,
                                    sellingPrice: serverStockIn.sellingPrice,
                                    supplier: serverStockIn.supplier,
                                    sku: serverStockIn.sku,
                                    barcodeUrl: serverStockIn.barcodeUrl,
                                    lastModified: now,
                                    updatedAt: serverStockIn.updatedAt || now
                                });
                                await db.synced_stockin_ids.add({
                                    localId: localIds[i],
                                    serverId: serverStockIn.id,
                                    syncedAt: now
                                });
                                await db.stockins_offline_add.delete(localIds[i]);
                            }
                        });
                        onClose();
                    } catch (error) {
                        // Handle offline case
                    }
                } else {
                    onClose();
                }
            } else {
                const newStockIn = {
                    ...stockInData,
                    ...userData,
                    lastModified: now,
                    createdAt: now,
                    updatedAt: now
                };
                if (!newStockIn.productId || !newStockIn.quantity || !newStockIn.price || !newStockIn.sellingPrice) {
                    throw new Error('Missing required fields');
                }
                const localId = await db.stockins_offline_add.add({ ...newStockIn, offlineQuantity: newStockIn.quantity });
                if (isOnline) {
                    try {
                        const response = await stockInService.createStockIn(newStockIn);
                        await db.transaction('rw', db.stockins_all, db.stockins_offline_add, db.synced_stockin_ids, async () => {
                            const serverStockInId = response.stockIn.data?.[0]?.id || response.id;
                            await db.stockins_all.put({
                                id: serverStockInId,
                                productId: newStockIn.productId,
                                quantity: newStockIn.quantity,
                                price: newStockIn.price,
                                sellingPrice: newStockIn.sellingPrice,
                                supplier: newStockIn.supplier,
                                sku: response.stockIn.data?.[0]?.sku,
                                barcodeUrl: response.stockIn.data?.[0]?.barcodeUrl,
                                lastModified: now,
                                updatedAt: response.updatedAt || now
                            });
                            await db.synced_stockin_ids.add({
                                localId: localId,
                                serverId: serverStockInId,
                                syncedAt: now
                            });
                            await db.stockins_offline_add.delete(localId);
                        });
                        onClose();
                    } catch (error) {
                        // Handle offline case
                    }
                } else {
                    onClose();
                }
            }
            await loadData();
        } catch (error) {
            console.error('Error adding stock-in:', error);
            let errorMessage = 'Failed to add stock entry';
            if (error.message.includes('required')) {
                errorMessage = 'Please fill in all required fields';
            } else if (error.message.includes('authentication')) {
                errorMessage = 'Please log in again';
            } else {
                errorMessage = `Failed to add stock entry: ${error.message}`;
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditStockIn = async (stockInData) => {
        setIsLoading(true);
        try {
            const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
            const now = new Date();

            if (!isOnline && stockInData && stockInData.localId && !stockInData.synced) {
                await db.stockins_offline_add.update(stockInData.localId, {
                    ...stockInData,
                    ...userData,
                    lastModified: now,
                    updatedAt: now
                });
                await loadData();
                onClose();
                return;
            }

            const updatedData = {
                id: stockInData.id,
                quantity: stockInData.quantity,
                price: stockInData.price,
                sellingPrice: stockInData.sellingPrice,
                supplier: stockInData.supplier,
                ...userData,
                lastModified: now,
                updatedAt: now
            };

            if (isOnline) {
                try {
                    const serverData = await stockInService.updateStockIn(stockInData.id, updatedData);
                    await db.transaction('rw', db.stockins_all, db.stockins_offline_update, async () => {
                        await db.stockins_all.put({
                            id: serverData.id,
                            productId: serverData.productId,
                            quantity: serverData.quantity,
                            price: serverData.price,
                            sellingPrice: serverData.sellingPrice,
                            supplier: serverData.supplier,
                            sku: serverData.sku,
                            barcodeUrl: serverData.barcodeUrl,
                            lastModified: serverData.createdAt,
                            updatedAt: serverData.updatedAt || now
                        });
                        await db.stockins_offline_update.delete(serverData.id);
                    });
                } catch (error) {
                    await db.stockins_offline_update.put(updatedData);
                }
            } else {
                await db.stockins_offline_update.put(updatedData);
            }

            await loadData();
            onClose();
        } catch (error) {
            console.error('Error updating stock-in:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isUpdateMode) {
            // Single entry validation for update mode
            const productError = validateProduct(formData.productId);
            const quantityError = validateQuantity(formData.quantity);
            const priceError = validatePrice(formData.price);
            const sellingPriceError = validateSellingPrice(formData.sellingPrice);

            setValidationErrors({
                productId: productError,
                quantity: quantityError,
                price: priceError,
                sellingPrice: sellingPriceError,
                purchases: []
            });

            if (productError || quantityError || priceError || sellingPriceError) {
                return;
            }

            // Prepare single entry data
            const submitData = {
                ...stockIn,
                productId: formData.productId,
                quantity: Number(formData.quantity),
                offlineQuantity: Number(formData.quantity),
                price: Number(formData.price),
                sellingPrice: Number(formData.sellingPrice)
            };

            if (formData.supplier.trim()) {
                submitData.supplier = formData.supplier.trim();
            }

            setCloseForm(true);
            await handleEditStockIn(submitData);
        } else {
            // Multiple entries validation for create mode
            const purchaseErrors = formData.purchases.map(purchase => ({
                productId: validateProduct(purchase.productId),
                quantity: validateQuantity(purchase.quantity),
                price: validatePrice(purchase.price),
                sellingPrice: validateSellingPrice(purchase.sellingPrice)
            }));

            setValidationErrors({
                productId: '',
                quantity: '',
                price: '',
                sellingPrice: '',
                purchases: purchaseErrors
            });

            // Check if there are any validation errors
            const hasPurchaseErrors = purchaseErrors.some(error =>
                error.productId || error.quantity || error.price || error.sellingPrice
            );

            if (hasPurchaseErrors) {
                return;
            }

            // Check for duplicate products
            const productIds = formData.purchases.map(purchase => purchase.productId);
            const uniqueProductIds = new Set(productIds);
            if (productIds.length !== uniqueProductIds.size) {
                alert('Cannot select the same product multiple times');
                return;
            }

            // Prepare multiple entries data
            const purchasesArray = formData.purchases.map(purchase => ({
                productId: purchase.productId,
                quantity: Number(purchase.quantity),
                price: Number(purchase.price),
                sellingPrice: Number(purchase.sellingPrice),
                ...(purchase.supplier.trim() && { supplier: purchase.supplier.trim() })
            }));

            setCloseForm(true);
            await handleAddStockIn({ purchases: purchasesArray });
        }

        // Reset form after submission
        setFormData({
            productId: '',
            quantity: '',
            price: '',
            supplier: '',
            sellingPrice: '',
            purchases: [{ productId: '', quantity: '', price: '', supplier: '', sellingPrice: '' }]
        });

        setValidationErrors({
            productId: '',
            quantity: '',
            price: '',
            sellingPrice: '',
            purchases: []
        });
    };

    const isFormValid = () => {
        if (isUpdateMode) {
            return formData.productId &&
                formData.quantity &&
                formData.price &&
                formData.sellingPrice &&
                !validationErrors.productId &&
                !validationErrors.quantity &&
                !validationErrors.price &&
                !validationErrors.sellingPrice;
        } else {
            const allPurchasesValid = formData.purchases.every(purchase =>
                purchase.productId && purchase.quantity && purchase.price && purchase.sellingPrice
            ) && validationErrors.purchases.every(error =>
                !error.productId && !error.quantity && !error.price && !error.sellingPrice
            );

            return allPurchasesValid;
        }
    };

    if(loading){
        return (
            <div className="flex flex-col items-center justify-center h-[90vh]">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
        )
    }

    return (
        <div className="flex items-center justify-center bg-white max-h-[90vh] overflow-y-auto">
            {isPageLoading ? (
                <div className="flex flex-col items-center justify-center h-[90vh]">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            ) : (
                <div className="bg-white p-6 w-full mx-4">
                    <h2 className="text-xl font-semibold mb-4">{title}</h2>
                    <div className="space-y-4">
                        {isUpdateMode ? (
                            // Single entry fields for update mode
                            <>
                                {/* Product Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Product <span className="text-red-500">*</span>
                                    </label>
                                    <SearchableProductSelect
                                        value={formData.productId}
                                        onChange={handleProductChange}
                                        products={products}
                                        error={validationErrors.productId}
                                        placeholder="Search and select a product"
                                    />
                                    {validationErrors.productId && (
                                        <p className="text-red-500 text-xs mt-1">{validationErrors.productId}</p>
                                    )}
                                </div>

                                {/* Quantity */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.quantity}
                                        onChange={handleQuantityChange}
                                        min="1"
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${validationErrors.quantity
                                            ? 'border-red-300 focus:ring-red-500'
                                            : 'border-gray-300 focus:ring-blue-500'
                                            }`}
                                        placeholder="Enter quantity"
                                    />
                                    {validationErrors.quantity && (
                                        <p className="text-red-500 text-xs mt-1">{validationErrors.quantity}</p>
                                    )}
                                </div>

                                {/* Price per Unit */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Price per Unit <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={handlePriceChange}
                                        min="0"
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${validationErrors.price
                                            ? 'border-red-300 focus:ring-red-500'
                                            : 'border-gray-300 focus:ring-blue-500'
                                            }`}
                                        placeholder="Enter price per unit"
                                    />
                                    {validationErrors.price && (
                                        <p className="text-red-500 text-xs mt-1">{validationErrors.price}</p>
                                    )}
                                </div>

                                {/* Selling Price */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Selling Price <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.sellingPrice}
                                        onChange={handleSellingPriceChange}
                                        min="0"
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${validationErrors.sellingPrice
                                            ? 'border-red-300 focus:ring-red-500'
                                            : 'border-gray-300 focus:ring-blue-500'
                                            }`}
                                        placeholder="Enter selling price"
                                    />
                                    {validationErrors.sellingPrice && (
                                        <p className="text-red-500 text-xs mt-1">{validationErrors.sellingPrice}</p>
                                    )}
                                    {formData.price && formData.sellingPrice && (
                                        <p className={`text-xs mt-1 ${Number(formData.sellingPrice) > Number(formData.price)
                                            ? 'text-green-600'
                                            : 'text-red-600'
                                            }`}>
                                            Profit margin: {((Number(formData.sellingPrice) - Number(formData.price)) / Number(formData.price) * 100).toFixed(1)}%
                                        </p>
                                    )}
                                </div>

                                {/* Supplier */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Supplier
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.supplier}
                                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter supplier name (optional)"
                                    />
                                </div>
                            </>
                        ) : (
                            // Multiple entries fields for create mode
                            <div className="min-h-[50vh] max-h-[60vh] overflow-y-auto">
                                <div className="mb-4 flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-gray-800">Stock Purchases</h3>
                                </div>

                                {formData.purchases.map((purchase, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-medium text-gray-700">Purchase #{index + 1}</h4>
                                            {formData.purchases.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removePurchase(index)}
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                            {/* Product Selection */}
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Product <span className="text-red-500">*</span>
                                                </label>
                                                <SearchableProductSelect
                                                    value={purchase.productId}
                                                    onChange={(e) => handlePurchaseChange(index, 'productId', e.target.value)}
                                                    products={products}
                                                    error={validationErrors.purchases[index]?.productId}
                                                    placeholder="Search and select a product"
                                                />
                                                {validationErrors.purchases[index]?.productId && (
                                                    <p className="text-red-500 text-xs mt-1">
                                                        {validationErrors.purchases[index].productId}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Supplier */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Supplier
                                                </label>
                                                <input
                                                    type="text"
                                                    value={purchase.supplier}
                                                    onChange={(e) => handlePurchaseChange(index, 'supplier', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Enter supplier name (optional)"
                                                />
                                            </div>

                                            {/* Quantity */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Quantity <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={purchase.quantity}
                                                    onChange={(e) => handlePurchaseChange(index, 'quantity', e.target.value)}
                                                    min="1"
                                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${validationErrors.purchases[index]?.quantity
                                                        ? 'border-red-300 focus:ring-red-500'
                                                        : 'border-gray-300 focus:ring-blue-500'
                                                        }`}
                                                    placeholder="Enter quantity"
                                                />
                                                {validationErrors.purchases[index]?.quantity && (
                                                    <p className="text-red-500 text-xs mt-1">
                                                        {validationErrors.purchases[index].quantity}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Price per Unit */}
                                            <div>
                                                <label className="md:hidden text-sm font-medium text-gray-700 mb-1">
                                                    Price <span className="text-red-500">*</span>
                                                </label>
                                                <label className="hidden md:block text-sm font-medium text-gray-700 mb-1">
                                                    Price per Unit <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={purchase.price}
                                                    onChange={(e) => handlePurchaseChange(index, 'price', e.target.value)}
                                                    min="0"
                                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${validationErrors.purchases[index]?.price
                                                        ? 'border-red-300 focus:ring-red-500'
                                                        : 'border-gray-300 focus:ring-blue-500'
                                                        }`}
                                                    placeholder="Enter price per unit"
                                                />
                                                {validationErrors.purchases[index]?.price && (
                                                    <p className="text-red-500 text-xs mt-1">
                                                        {validationErrors.purchases[index].price}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Selling Price */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Selling Price <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={purchase.sellingPrice}
                                                    onChange={(e) => handlePurchaseChange(index, 'sellingPrice', e.target.value)}
                                                    min="0"
                                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${validationErrors.purchases[index]?.sellingPrice
                                                        ? 'border-red-300 focus:ring-red-500'
                                                        : 'border-gray-300 focus:ring-blue-500'
                                                        }`}
                                                    placeholder="Enter selling price"
                                                />
                                                {validationErrors.purchases[index]?.sellingPrice && (
                                                    <p className="text-red-500 text-xs mt-1">
                                                        {validationErrors.purchases[index].sellingPrice}
                                                    </p>
                                                )}
                                                {purchase.price && purchase.sellingPrice && (
                                                    <p className={`text-xs mt-1 ${Number(purchase.sellingPrice) > Number(purchase.price)
                                                        ? 'text-green-600'
                                                        : 'text-red-600'
                                                        }`}>
                                                        Profit margin: {((Number(purchase.sellingPrice) - Number(purchase.price)) / Number(purchase.price) * 100).toFixed(1)}%
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Purchase Summary */}
                                        {purchase.quantity && purchase.price && (
                                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium text-gray-700">Total Cost:</span>
                                                    <span className="font-bold text-blue-600">
                                                        {formatCurrency((Number(purchase.quantity) * Number(purchase.price)).toFixed(2))}
                                                    </span>
                                                </div>
                                                {purchase.sellingPrice && (
                                                    <div className="flex justify-between items-center text-sm mt-1">
                                                        <span className="font-medium text-gray-700">Potential Revenue:</span>
                                                        <span className="font-bold text-green-600">
                                                            {formatCurrency((Number(purchase.quantity) * Number(purchase.sellingPrice)).toFixed(2))}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div className="flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={addPurchase}
                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-sm"
                                    >
                                        <Package size={14} />
                                        Add Stock Ins
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={closeForm || isLoading || !isFormValid()}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mr-2"></div>
                                        Processing...
                                    </div>
                                ) : stockIn ? 'Update' : `Create ${formData.purchases?.length || 1} Purchase${formData.purchases?.length > 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>

                    {/* Help Text */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-700">
                            <strong>Required fields:</strong> Product, Quantity, Price per Unit, and Selling Price are required for each purchase.
                            <br />
                            <strong>Product Search:</strong> Click on the product field and start typing to search for products by name.
                            <br />
                            {!isUpdateMode && (
                                <>
                                    <strong>Multiple purchases:</strong> You can add multiple products to create stock entries in one go.
                                    <br />
                                </>
                            )}
                            <strong>Note:</strong> The profit margin is calculated automatically based on your cost and selling prices.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UpsertStockInPage;