import React, { useEffect, useState } from 'react';
import { Eye, Package, DollarSign, User, Calendar, Barcode, TrendingUp, AlertCircle, Edit, Trash2, Plus, StepBack } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import productService from '../../../services/productService';
import { API_URL } from '../../../api/api';
import not_found_image from '../../../assets/images/not_found.png'

const ProductViewPage = ({role}) => {

    const {id} = useParams()
  // Sample product data based on your schema
  const [product,setProduct] = useState({});


  const [isLoading,setIsLoading] = useState(true)

  
  
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedImage, setSelectedImage] = useState(0);
  const navigate  = useNavigate()

  useEffect(()=>{

    if(!id && role){
        navigate(`/${role}/dashboard/product/`)
    }
    
  },[id])

  useEffect(()=>{

    const fetchProducts = async () => {
  
      setIsLoading(true);
    

    try {
      const data = await productService.getProductById(id);
      console.log('response from baceknd', data);
      
      setProduct(data);
      setFilteredProducts(data);

    
    } catch (error) {
    console.log('');
    
    } finally {
      setIsLoading(false);
     
    }
  };

  fetchProducts()

  },[id])

  const totalStock = product?.stockIn?.reduce((sum, stock) => sum + stock.quantity, 0);
  const avgPrice = product?.stockIn?.reduce((sum, stock) => sum + stock.price, 0) / product?.stockIn?.length;
  const totalValue = product?.stockIn?.reduce((sum, stock) => sum + stock.totalPrice, 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  if(isLoading){
   return <p>loadding...</p>
  }
  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-50 p-6">
      <div className=" mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{product.productName}</h1>
                
              </div>
            </div>
            <div className="flex space-x-3">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2" onClick={()=> role== 'admin' ?  navigate(`/admin/dashboard/product/`) : navigate(`/employee/dashboard/product/`) }>
                <StepBack className="h-4 w-4" />
                <span>Go back</span>
              </button>
            
            </div>
          </div>
        </div>

        {/* Large Product Images */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className=" bg-gray-100 rounded-xl mb-6 overflow-hidden">
            <img
              src={`${API_URL}${product.imageUrls[selectedImage]}`}
              alt={product.productName}
                onError={(e) => {
    e.currentTarget.src = not_found_image; // ✅ safer than e.target
  }}
              className="w-full h-[60vh] object-cover"
            />
          </div>
          <div className="flex justify-center space-x-4">
            {product.imageUrls.map((url, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`w-24 h-24 rounded-lg overflow-hidden border-3 transition-all ${
                  selectedImage === index ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
               <img
  src={`${API_URL}${url}`}
  alt={`View ${index + 1}`}
  onError={(e) => {
    e.currentTarget.src = not_found_image; // ✅ safer than e.target
  }}
  className="w-full h-full object-cover"
/>

              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Stock</p>
                <p className="text-2xl font-bold text-gray-900">{totalStock}</p>
                <p className="text-xs text-gray-500">units</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgPrice)}</p>
                <p className="text-xs text-gray-500">per unit</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
                <p className="text-xs text-gray-500">inventory</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Created</p>
                <p className="text-lg font-bold text-gray-900">{new Date(product.createdAt).toLocaleDateString()}</p>
                <p className="text-xs text-gray-500">{new Date(product.createdAt).toLocaleDateString('en-US', { weekday: 'long' })}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8">
              {['overview', 'stock'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-6 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">Product Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                      <p className="text-lg font-medium text-gray-900">{product.productName}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                      <p className="text-lg font-medium text-gray-900">{product.brand}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <p className="text-lg font-medium text-gray-900">{product.category.name}</p>
                    </div>
                   
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Description</h4>
                  <div className="p-6 bg-gray-50 rounded-lg">
                    <div className="text-gray-600 text-sm" 
                      dangerouslySetInnerHTML={{__html : productService.parseDescription(product.description)}} />
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Responsible Personnel</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {product.admin && (
                      <div className="flex items-center space-x-4 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="p-3 bg-blue-100 rounded-full">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-900">{product.admin.adminName}</p>
                          <p className="text-sm font-medium text-blue-600">Administrator</p>
                          <p className="text-sm text-gray-600">{product.admin.adminEmail}</p>
                        </div>
                      </div>
                    )}
                    {product.employee && (
                      <div className="flex items-center space-x-4 p-6 bg-green-50 border border-green-200 rounded-lg">
                        <div className="p-3 bg-green-100 rounded-full">
                          <User className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-900">{product.employee.firstname} {product.employee.lastname}</p>
                          <p className="text-sm font-medium text-green-600">Employee</p>
                          <p className="text-sm text-gray-600">{product.employee.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stock' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Stock Information</h3>
                  
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added By</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {product.stockIn.map((stock) => (
                        <tr key={stock.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 bg-gray-50">{stock.sku}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stock.supplier}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stock.quantity} units</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(stock.price)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(stock.sellingPrice)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">{formatCurrency(stock.totalPrice)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {stock.admin ? stock.admin.adminName : `${stock.employee.firstname} ${stock.employee.lastname}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(stock.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

           
        
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductViewPage;