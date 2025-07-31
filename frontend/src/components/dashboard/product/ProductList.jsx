import React from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';

const ProductList = ({ filteredData, getStatusColor }) => {
  return (
    <div>
      {/* Table view for large screens */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{item.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.sku}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.category}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`font-medium ${item.stock === 0 ? 'text-red-600' : item.stock <= 5 ? 'text-amber-600' : 'text-gray-900'}`}>
                    {item.stock}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">${item.price}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  <div className="flex space-x-2">
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card view for small screens */}
      <div className="lg:hidden grid gap-4 p-4">
        {filteredData.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-600">SKU: {item.sku}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Category</p>
                  <p className="text-sm text-gray-600">{item.category}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Stock</p>
                  <p className={`text-sm font-medium ${item.stock === 0 ? 'text-red-600' : item.stock <= 5 ? 'text-amber-600' : 'text-gray-900'}`}>
                    {item.stock}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Price</p>
                  <p className="text-sm font-medium text-gray-900">${item.price}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <Eye className="w-4 h-4 text-gray-500" />
                </button>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <Edit className="w-4 h-4 text-gray-500" />
                </button>
                <button className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList;