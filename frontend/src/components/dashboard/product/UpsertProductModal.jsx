import { X, Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import productService from "../../../services/productService";
import categoryService from "../../../services/categoryService";

// update or create Product Modal Component
const UpsertProductModal = ({ isOpen, onClose, onSubmit, product, isLoading, title }) => {
    const [formData, setFormData] = useState({
        productName: '',
        brand: '',
        categoryId: '',
        description: ''
    });
    const [images, setImages] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({});
    const [imagePreview, setImagePreview] = useState([]);

    // React Quill modules configuration
    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['link'],
            ['clean']
        ],
    };

    const quillFormats = [
        'header', 'bold', 'italic', 'underline', 'strike',
        'list', 'bullet', 'color', 'background', 'link'
    ];

    useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            try {
                const data = await categoryService.getAllCategories();
                setCategories(data);
            } catch (error) {
                console.error(`Failed to fetch categories: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        if (product) {
            setFormData({
                productName: product.productName || '',
                brand: product.brand || '',
                categoryId: product.categoryId || '',
                description: parseDescription(product.description) || ''
            });
            setExistingImages(product.imageUrls || []);
            setImages([]);
            setImagePreview([]);
        } else {
            setFormData({
                productName: '',
                brand: '',
                categoryId: '',
                description: ''
            });
            setExistingImages([]);
            setImages([]);
            setImagePreview([]);
        }
        setErrors({});
    }, [product, isOpen]);

  const parseDescription = (description) => {
    if (!description) return '';
    
    // Add debugging to see what we're receiving
    console.log('Description received:', description, 'Type:', typeof description);
    
    // If it's already a string and not JSON, return as is
    if (typeof description === 'string') {
        try {
            const parsed = JSON.parse(description);
            console.log('Parsed JSON:', parsed);
            
            // If it's a JSON object with details property, return the details
            if (parsed && typeof parsed === 'object' && parsed.details) {
                console.log('Returning details:', parsed.details);
                return parsed.details;
            }
            // If it's a JSON string, return the parsed string
            if (typeof parsed === 'string') {
                console.log('Returning parsed string:', parsed);
                return parsed;
            }
            // If it's some other object, stringify it
            console.log('Returning stringified object:', JSON.stringify(parsed));
            return JSON.stringify(parsed);
        } catch (error) {
            // If JSON.parse fails, it's probably just a plain string/HTML
            console.log('Not JSON, returning as-is:', description);
            return description;
        }
    }
    
    // If it's already an object
    if (typeof description === 'object' && description !== null) {
        if (description.details) {
            console.log('Object with details:', description.details);
            return description.details;
        }
        console.log('Object without details, stringifying:', JSON.stringify(description));
        return JSON.stringify(description);
    }
    
    // Fallback
    console.log('Fallback, converting to string:', String(description));
    return String(description);
};

    const validateForm = () => {
        const newErrors = {};

        if (!formData.productName.trim()) newErrors.productName = 'Product name is required';
        
        if (!formData.categoryId) newErrors.categoryId = 'Category is required';
        
        // Check if description has content (strip HTML tags for validation)
        const plainTextDescription = formData.description.replace(/<[^>]*>/g, '').trim();
        // if (!plainTextDescription) newErrors.description = 'Description is required';


        // Check total images (existing + new) don't exceed limit
        const totalImages = existingImages.length + images.length;
        if (totalImages > 4) {
            newErrors.images = 'Maximum 4 images allowed';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            const submissionData = {
                productName: formData.productName.trim(),
                brand: formData.brand.trim(),
                categoryId: formData.categoryId,
                // Send as HTML string - backend will handle JSON wrapping
                description: formData.description,
                images: images,
                keepImages: existingImages,
                newImages: images
            };
            onSubmit(submissionData);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleDescriptionChange = (content) => {
        handleChange('description', content);
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        const validation = productService.validateImages(files);

        if (!validation.isValid) {
            setErrors(prev => ({ ...prev, images: validation.errors.join(', ') }));
            return;
        }

        setImages(files);

        // Create preview URLs
        const previews = files.map(file => URL.createObjectURL(file));
        setImagePreview(previews);

        if (errors.images) {
            setErrors(prev => ({ ...prev, images: '' }));
        }
    };

    const removeExistingImage = (indexToRemove) => {
        setExistingImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const removeNewImage = (indexToRemove) => {
        setImages(prev => prev.filter((_, index) => index !== indexToRemove));
        setImagePreview(prev => {
            // Revoke the URL to prevent memory leaks
            URL.revokeObjectURL(prev[indexToRemove]);
            return prev.filter((_, index) => index !== indexToRemove);
        });
    };

    if (!isOpen) return null;

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                        </div>
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Product Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.productName}
                                    onChange={(e) => handleChange('productName', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.productName ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="Enter product name"
                                />
                                {errors.productName && <p className="text-red-500 text-xs mt-1">{errors.productName}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Brand *
                                </label>
                                <input
                                    type="text"
                                    value={formData.brand}
                                    onChange={(e) => handleChange('brand', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.brand ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="Enter brand name"
                                />
                                {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category *
                            </label>
                            <select
                                value={formData.categoryId}
                                onChange={(e) => handleChange('categoryId', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.categoryId ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            >
                                <option value="">Select a category</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Product Images {!product && '*'} <span className="text-gray-500 text-xs">(Max 4 images, 5MB each)</span>
                            </label>

                            {/* Existing Images */}
                            {existingImages.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-sm text-gray-600 mb-2">Current Images:</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {existingImages.map((imageUrl, index) => (
                                            <div key={index} className="relative">
                                                <img
                                                    src={productService.getFullImageUrl(imageUrl)}
                                                    alt={`Product ${index + 1}`}
                                                    className="w-full h-24 object-cover rounded-lg border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingImage(index)}
                                                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* New Images Upload */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    id="image-upload"
                                />
                                <label htmlFor="image-upload" className="cursor-pointer">
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">
                                        Click to upload images or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        PNG, JPG, GIF up to 5MB each
                                    </p>
                                </label>
                            </div>

                            {/* New Image Previews */}
                            {imagePreview.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm text-gray-600 mb-2">New Images:</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {imagePreview.map((preview, index) => (
                                            <div key={index} className="relative">
                                                <img
                                                    src={preview}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-full h-24 object-cover rounded-lg border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeNewImage(index)}
                                                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description *
                            </label>
                            <div className={`border rounded-lg ${errors.description ? 'border-red-500' : 'border-gray-300'}`}>
                                <ReactQuill
                                    theme="snow"
                                    value={formData.description}
                                    onChange={handleDescriptionChange}
                                    modules={quillModules}
                                    formats={quillFormats}
                                    placeholder="Enter product description..."
                                    style={{ height: '200px' }}
                                />
                            </div>
                            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                        </div>

                        <div className="flex gap-3 pt-4 mt-16">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Saving...' : (product ? 'Update' : 'Add')} Product
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default UpsertProductModal