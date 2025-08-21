import api, { API_URL } from '../api/api'; // Adjust the import path as needed

class ProductService {
  constructor() {
    this.apiPath = '/product';
  }

  /**
   * Create a new product with optional image uploads
   * @param {Object} productData - Product information
   * @param {string} productData.productName - Name of the product
   * @param {string} productData.brand - Brand of the product
   * @param {string} productData.categoryId - Category ID
   * @param {Object} productData.description - Product description (will be JSON stringified)
   * @param {FileList|File[]} productData.images - Array of image files (max 4)
   * @returns {Promise<Object>} Created product response
   */
  async createProduct(productData) {
    try {
      const formData = new FormData();
      
      // Add text fields
      if (productData.productName) {
        formData.append('productName', productData.productName);
      }
      if (productData.brand) {
        formData.append('brand', productData.brand);
      }
      if (productData.categoryId) {
        formData.append('categoryId', productData.categoryId);
      }
      if (productData.description) {
        formData.append('description', productData.description);
      }

      // Add image files
      if (productData.images && productData.images.length > 0) {
        Array.from(productData.images).forEach(file => {
          formData.append('imageurls', file);
        });
      }

      if (productData.adminId) {
        formData.append('adminId', productData.adminId)
      }
      if (productData.employeeId) {
        formData.append('employeeId', productData.employeeId)
      }

      const response = await api.post(`${this.apiPath}/create`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create product';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get all products
   * @returns {Promise<Array>} Array of all products with categories
   */
  async getAllProducts() {
    try {
      const response = await api.get(`${this.apiPath}/all`);
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch products';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get a single product by ID
   * @param {string} id - Product ID
   * @returns {Promise<Object>} Product data with category
   */
  async getProductById(id) {
    try {
      const response = await api.get(`${this.apiPath}/getone/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Product not found';
      throw new Error(errorMessage);
    }
  }


  // Helper to parse description from backend response
  parseDescription (description) {
    if (!description) return '';
    
    // If description is already a JSON object with details
    if (typeof description === 'object' && description.details) {
      return description.details;
    }
    
    // If description is a string, try parsing as JSON
    if (typeof description === 'string') {
      try {
        const parsed = JSON.parse(description);
        return parsed.details || parsed;
      } catch {
        // If parsing fails, return as-is (plain HTML string)
        return description;
      }
    }
    
    return description;
  }
  /**
   * Update an existing product
   * @param {string} id - Product ID
   * @param {Object} productData - Updated product information
   * @param {string} productData.productName - Name of the product
   * @param {string} productData.brand - Brand of the product
   * @param {string} productData.categoryId - Category ID
   * @param {Object} productData.description - Product description
   * @param {string[]} productData.keepImages - Array of existing image URLs to keep
   * @param {FileList|File[]} productData.newImages - Array of new image files to add
   * @returns {Promise<Object>} Updated product response
   */
  async updateProduct(id, productData) {
    try {
      const formData = new FormData();
      
      // Add text fields
      if (productData.productName) {
        formData.append('productName', productData.productName);
      }
      if (productData.brand) {
        formData.append('brand', productData.brand);
      }
      if (productData.categoryId) {
        formData.append('categoryId', productData.categoryId);
      }
      if (productData.description) {
        console.log('description data : ',productData.description)
        formData.append('description', productData.description);
      }

      if (productData.adminId) {
        formData.append('adminId', productData.adminId)
      }
      if (productData.employeeId) {
        formData.append('employeeId', productData.employeeId)
      }

      // Add images to keep
      if (productData.keepImages && productData.keepImages.length > 0) {
      
          formData.append('keepImages', JSON.stringify(productData.keepImages) );
        
      }

      // Add new image files
      if (productData.newImages && productData.newImages.length > 0) {
        Array.from(productData.newImages).forEach(file => {
          formData.append('imageurls', file);
        });
      }

      const response = await api.put(`${this.apiPath}/update/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error updating product:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update product';
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a product by ID
   * @param {string} id - Product ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteProduct(id,data) {
    try {
      const response = await api.delete(`${this.apiPath}/${id}`,{
        data:{
...data
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting product:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete product';
      throw new Error(errorMessage);
    }
  }

  /**
   * Helper method to validate image files
   * @param {FileList|File[]} files - Files to validate
   * @param {number} maxFiles - Maximum number of files allowed (default: 4)
   * @param {number} maxSizeBytes - Maximum file size in bytes (default: 5MB)
   * @returns {Object} Validation result
   */
  validateImages(files, maxFiles = 4, maxSizeBytes = 5 * 1024 * 1024) {
    const errors = [];
    
    if (!files || files.length === 0) {
      return { isValid: true, errors: [] };
    }

    if (files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} images allowed`);
    }

    Array.from(files).forEach((file, index) => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        errors.push(`File ${index + 1} is not an image`);
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        errors.push(`File ${index + 1} is too large (max ${maxSizeBytes / (1024 * 1024)}MB)`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Helper method to get full image URL
   * @param {string} imageUrl - Relative image URL from backend
   * @returns {string} Full image URL
   */
  getFullImageUrl(imageUrl) {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${import.meta.env.VITE_API_URL}${imageUrl}`;
  }
}

// Create and export a singleton instance
const productService = new ProductService();
export default productService;

// Usage Examples:
/*
import productService from './services/productService';

// Create a product
const createProductExample = async () => {
  try {
    const productData = {
      productName: 'New Product',
      brand: 'Brand Name',
      categoryId: 'category-uuid',
      description: { details: 'Product details', features: ['feature1', 'feature2'] },
      images: fileInput.files // from an HTML file input
    };
    
    const result = await productService.createProduct(productData);
    console.log('Product created:', result);
  } catch (error) {
    console.error('Failed to create product:', error.message);
  }
};

// Get all products
const getAllProductsExample = async () => {
  try {
    const products = await productService.getAllProducts();
    console.log('All products:', products);
  } catch (error) {
    console.error('Failed to fetch products:', error.message);
  }
};

// Get single product
const getProductExample = async (productId) => {
  try {
    const product = await productService.getProductById(productId);
    console.log('Product:', product);
  } catch (error) {
    console.error('Failed to fetch product:', error.message);
  }
};

// Update product
const updateProductExample = async (productId) => {
  try {
    const updateData = {
      productName: 'Updated Product Name',
      brand: 'Updated Brand',
      keepImages: ['/uploads/product_images/existing1.jpg'], // Keep these images
      newImages: newFileInput.files // Add these new images
    };
    
    const result = await productService.updateProduct(productId, updateData);
    console.log('Product updated:', result);
  } catch (error) {
    console.error('Failed to update product:', error.message);
  }
};

// Delete product
const deleteProductExample = async (productId) => {
  try {
    const result = await productService.deleteProduct(productId);
    console.log('Product deleted:', result);
  } catch (error) {
    console.error('Failed to delete product:', error.message);
  }
};

// Validate images before upload
const validateImagesExample = (files) => {
  const validation = productService.validateImages(files);
  if (!validation.isValid) {
    console.log('Validation errors:', validation.errors);
    return false;
  }
  return true;
};

// In React components:
import { useState, useEffect } from 'react';
import productService from '../services/productService';

const ProductComponent = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await productService.getAllProducts();
        setProducts(data);
      } catch (error) {
        console.error('Error:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleCreateProduct = async (formData) => {
    try {
      await productService.createProduct(formData);
      // Refresh products list
      const updatedProducts = await productService.getAllProducts();
      setProducts(updatedProducts);
    } catch (error) {
      console.error('Error creating product:', error.message);
    }
  };

  return (
    <div>
      {loading ? <div>Loading...</div> : (
        <div>
          {products.map(product => (
            <div key={product.id}>
              <h3>{product.productName}</h3>
              <p>{product.brand}</p>
              {product.imageUrls?.map((url, index) => (
                <img 
                  key={index} 
                  src={productService.getFullImageUrl(url)} 
                  alt={product.productName}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
*/