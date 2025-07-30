// services/categoryService.js
import api from '../api/api'; // Adjust the import path as needed

class CategoryService {
  async createCategory(categoryData) {
    try {
      const response = await api.post('/category/create', categoryData);
      return response.data;
    } catch (error) {
      console.error('Error creating category:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to create category';
      throw new Error(errorMessage);
    }
  }

  async getAllCategories() {
    try {
      const response = await api.get('/category/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch categories';
      throw new Error(errorMessage);
    }
  }

  async getCategoryById(id) {
    try {
      const response = await api.get(`/category/getone/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching category by ID:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch category';
      throw new Error(errorMessage);
    }
  }

  async updateCategory(id, categoryData) {
    try {
      const response = await api.put(`/category/update/${id}`, categoryData);
      return response.data;
    } catch (error) {
      console.error('Error updating category:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to update category';
      throw new Error(errorMessage);
    }
  }

  async deleteCategory(id) {
    try {
      const response = await api.delete(`/category/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting category:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to delete category';
      throw new Error(errorMessage);
    }
  }

  async assignTasksToCategory(assignmentData) {
    try {
      const response = await api.post('/category/assign-task', assignmentData);
      return response.data;
    } catch (error) {
      console.error('Error assigning tasks to category:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to assign tasks to category';
      throw new Error(errorMessage);
    }
  }

  validateCategoryData(categoryData) {
    const errors = [];
    if (!categoryData.name?.trim()) {
      errors.push('Category name is required');
    }
    if (categoryData.description && !categoryData.description.trim()) {
      errors.push('Description cannot be empty if provided');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

const categoryService = new CategoryService();
export default categoryService;

export const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  assignTasksToCategory,
  validateCategoryData
} = categoryService;