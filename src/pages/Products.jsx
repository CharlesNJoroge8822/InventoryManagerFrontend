import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, faPlus, faEdit, faTrash, faEye, 
  faBoxOpen, faBoxes, faExclamationTriangle, 
  faChevronLeft, faChevronRight, faFilter, faTimes
} from '@fortawesome/free-solid-svg-icons';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    stock: 'all',
    category: 'all',
    supplier: 'all'
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    product_index: '',
    name: '',
    buying_price: '',
    selling_price: '',
    quantity: '',
    alert_config: { min_quantity: 5 },
    description: '',
    supplier_name: '',
    category: ''
  });

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("https://inventorymanager-uigs.onrender.com/api/products/");
        const json = await response.json();
        setProducts(json.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Failed to load products. Please try again later.");
        setLoading(false);
      }
    };
  
    fetchProducts();
  }, []);
  
  // Filter and search products
  useEffect(() => {
    let result = [...products];
  
    // Apply search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(product =>
        (product.name && product.name.toLowerCase().includes(lowerTerm)) ||
        (product.product_index && product.product_index.toString().includes(searchTerm)) ||
        (product.description && product.description.toLowerCase().includes(lowerTerm)) ||
        (product.supplier_name && product.supplier_name.toLowerCase().includes(lowerTerm))
      );
    }
  
    // Apply stock filter
    if (filters.stock === 'low') {
      result = result.filter(product => {
        try {
          const alertConfig = typeof product.alert_config === 'string' 
            ? JSON.parse(product.alert_config) 
            : product.alert_config;
          const lowStockThreshold = alertConfig?.min_quantity ?? 5;
          return product.quantity <= lowStockThreshold && product.quantity > 0;
        } catch (e) {
          return false;
        }
      });
    } else if (filters.stock === 'out') {
      result = result.filter(product => product.quantity === 0);
    } else if (filters.stock === 'average') {
      result = result.filter(product => product.quantity > 0 && product.quantity < 50);
    }
  
    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      result = result.filter(product => product.category === filters.category);
    }
  
    // Apply supplier filter
    if (filters.supplier && filters.supplier !== 'all') {
      result = result.filter(product => product.supplier_name === filters.supplier);
    }
  
    setFilteredProducts(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [products, searchTerm, filters]);
  
  // Get current products for pagination
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  // Handle page change
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle product creation
  const handleCreateProduct = async () => {
    try {
      const response = await fetch('https://inventorymanager-uigs.onrender.com/api/products/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      
      if (!response.ok) throw new Error('Failed to create product');
      
      const createdProduct = await response.json();
      setProducts([createdProduct.data, ...products]);
      setShowCreateModal(false);
      setNewProduct({
        product_index: '',
        name: '',
        buying_price: '',
        selling_price: '',
        quantity: '',
        alert_config: { min_quantity: 5 },
        description: '',
        supplier_name: '',
        category: ''
      });
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle product update
  const handleUpdateProduct = async (productId, updatedFields) => {
    try {
      const response = await fetch(`https://inventorymanager-uigs.onrender.com/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      
      if (!response.ok) throw new Error('Failed to update product');
      
      const updatedProduct = await response.json();
      setProducts(products.map(p => 
        p.id === productId ? updatedProduct.data : p));
      setEditingProduct(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle product deletion
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await fetch(`https://inventorymanager-uigs.onrender.com/api/products/${productId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete product');
      
      setProducts(products.filter(p => p.id !== productId));
    } catch (err) {
      setError(err.message);
    }
  };

  // Get unique categories for filter
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  // Get unique suppliers for filter
  const suppliers = [...new Set(products.map(p => p.supplier_name).filter(Boolean))];

  // Get stock status for a product
  const getStockStatus = (product) => {
    if (product.quantity === 0) return 'out';
    
    try {
      const alertConfig = typeof product.alert_config === 'string' 
        ? JSON.parse(product.alert_config) 
        : product.alert_config;
      const lowStockThreshold = alertConfig?.min_quantity ?? 5;
      
      if (product.quantity <= lowStockThreshold) return 'low';
      if (product.quantity < 50) return 'average';
      return 'healthy';
    } catch (e) {
      return 'healthy';
    }
  };

  // Get stock status message
  const getStockMessage = (product) => {
    const status = getStockStatus(product);
    switch (status) {
      case 'out':
        return { text: 'Out of stock', class: 'bg-red-100 text-red-800' };
      case 'low':
        return { text: 'Low stock - Reorder now', class: 'bg-yellow-100 text-yellow-800' };
      case 'average':
        return { text: 'Average stock - Consider restocking', class: 'bg-blue-100 text-blue-800' };
      default:
        return { text: 'In stock', class: 'bg-green-100 text-green-800' };
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 bg-blue-200 rounded-full mb-4"></div>
        <p className="text-gray-600">Loading products...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-red-50 border-l-4 border-red-500 p-4 max-w-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue shadow-sm">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-light text-gray-900">Product Inventory</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your product stock efficiently</p>
              <h3 className='text-gray-500 bg-blue-300'>Managed by : Ann </h3>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Add Product
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filter Bar */}
        <div className="bg-green rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search products by name, ID, description or supplier"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-12 py-2 border-gray-300 rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="stock-filter" className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
              <select
                id="stock-filter"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={filters.stock}
                onChange={(e) => setFilters({...filters, stock: e.target.value})}
              >
                <option value="all">All Stock Levels</option>
                <option value="out">Out of Stock</option>
                <option value="low">Low Stock</option>
                <option value="average">Average Stock (Below 50)</option>
              </select>
            </div>

            {categories.length > 0 && (
              <div>
                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  id="category-filter"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            )}

            {suppliers.length > 0 && (
              <div>
                <label htmlFor="supplier-filter" className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  id="supplier-filter"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={filters.supplier}
                  onChange={(e) => setFilters({...filters, supplier: e.target.value})}
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map(supplier => (
                    <option key={supplier} value={supplier}>{supplier}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-blue shadow overflow-hidden sm:rounded-lg relative w-[90%">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-300">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buy Price (Ksh)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sell Price (Ksh)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentProducts.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center justify-center py-8">
                        <FontAwesomeIcon icon={faBoxOpen} className="h-12 w-12 text-gray-400 mb-2" />
                        <p>No products found matching your criteria</p>
                        <button 
                          onClick={() => {
                            setSearchTerm('');
                            setFilters({ stock: 'all', category: 'all', supplier: 'all' });
                          }}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentProducts.map((product) => (
                    <tr 
                      key={product.id} 
                      className={getStockStatus(product) === 'out' ? 'bg-red-50' : getStockStatus(product) === 'low' ? 'bg-yellow-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {product.product_index}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.category || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.supplier_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingProduct?.id === product.id ? (
                          <input
                            type="number"
                            value={editingProduct.buying_price}
                            onChange={(e) => setEditingProduct({
                              ...editingProduct,
                              buying_price: e.target.value
                            })}
                            className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        ) : (
                          `Ksh ${parseFloat(product.buying_price).toLocaleString()}`
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingProduct?.id === product.id ? (
                          <input
                            type="number"
                            value={editingProduct.selling_price}
                            onChange={(e) => setEditingProduct({
                              ...editingProduct,
                              selling_price: e.target.value
                            })}
                            className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        ) : (
                          `Ksh ${parseFloat(product.selling_price).toLocaleString()}`
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingProduct?.id === product.id ? (
                          <input
                            type="number"
                            value={editingProduct.quantity}
                            onChange={(e) => setEditingProduct({
                              ...editingProduct,
                              quantity: e.target.value
                            })}
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        ) : (
                          product.quantity
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStockMessage(product).class}`}>
                          {getStockMessage(product).text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingProduct?.id === product.id ? (
                          <>
                            <button
                              onClick={() => handleUpdateProduct(product.id, {
                                name: editingProduct.name,
                                buying_price: editingProduct.buying_price,
                                selling_price: editingProduct.selling_price,
                                quantity: editingProduct.quantity,
                                category: editingProduct.category,
                                supplier_name: editingProduct.supplier_name
                              })}
                              className="text-green-600 hover:text-green-900 mr-3"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingProduct(null)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <div className="flex space-x-2 justify-end">
                            <button
                              onClick={() => setViewingProduct(product)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View details"
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </button>
                            <button
                              onClick={() => setEditingProduct({...product})}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Edit"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {filteredProducts.length > productsPerPage && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-b-lg">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstProduct + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastProduct, filteredProducts.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredProducts.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show pages around current page
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => paginate(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <FontAwesomeIcon icon={faChevronRight} />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Product View Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-800 text-white p-4 rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-light">Product Details</h2>
              <button 
                onClick={() => setViewingProduct(null)}
                className="text-white hover:text-gray-300"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Basic Information</h3>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-2">
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Product ID</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">{viewingProduct.product_index}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{viewingProduct.name}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Category</dt>
                      <dd className="mt-1 text-sm text-gray-900">{viewingProduct.category || '-'}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Supplier</dt>
                      <dd className="mt-1 text-sm text-gray-900">{viewingProduct.supplier_name || '-'}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Pricing & Stock</h3>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-2">
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Buy Price</dt>
                      <dd className="mt-1 text-sm text-gray-900">Ksh {parseFloat(viewingProduct.buying_price).toLocaleString()}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Sell Price</dt>
                      <dd className="mt-1 text-sm text-gray-900">Ksh {parseFloat(viewingProduct.selling_price).toLocaleString()}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Current Stock</dt>
                      <dd className="mt-1 text-sm text-gray-900">{viewingProduct.quantity}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Stock Status</dt>
                      <dd className="mt-1">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStockMessage(viewingProduct).class}`}>
                          {getStockMessage(viewingProduct).text}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
                
                {viewingProduct.description && (
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{viewingProduct.description}</p>
                  </div>
                )}
              </div>
              
              {getStockStatus(viewingProduct) !== 'healthy' && (
                <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        {getStockStatus(viewingProduct) === 'out' 
                          ? 'This product is out of stock!' 
                          : getStockStatus(viewingProduct) === 'low' 
                            ? 'This product is running low on stock!' 
                            : 'This product has average stock levels'}
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          {getStockStatus(viewingProduct) === 'out' 
                            ? 'Consider ordering more inventory from the supplier.' 
                            : getStockStatus(viewingProduct) === 'low' 
                              ? 'You should reorder soon to avoid stockouts.' 
                              : 'Monitor this product to ensure adequate stock levels.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => {
                  setViewingProduct(null);
                  setEditingProduct({...viewingProduct});
                }}
              >
                Edit Product
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => setViewingProduct(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-800 text-white p-4 rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-light">Create New Product</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-white hover:text-gray-300"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={newProduct.product_index}
                    onChange={(e) => setNewProduct({...newProduct, product_index: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buy Price (Ksh)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={newProduct.buying_price}
                    onChange={(e) => setNewProduct({...newProduct, buying_price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sell Price (Ksh)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={newProduct.selling_price}
                    onChange={(e) => setNewProduct({...newProduct, selling_price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Quantity</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert At</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={newProduct.alert_config.min_quantity}
                    onChange={(e) => setNewProduct({
                      ...newProduct, 
                      alert_config: { min_quantity: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={newProduct.supplier_name}
                    onChange={(e) => setNewProduct({...newProduct, supplier_name: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProduct}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-gray-700 pt-8">
            <div className="text-center">
              <h3 className="text-lg font-light">Inventory Management System</h3>
              <p className="mt-1 text-sm text-gray-400">
                "Efficiency is doing better what is already being done." — Peter Drucker
              </p>
              <p className="mt-4 text-xs text-gray-500">
                © {new Date().getFullYear()} Tyde Homes. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProductManagement;