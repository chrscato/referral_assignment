import React, { useState, useEffect } from 'react';
import { fetchOrders, fetchOrderDetails, processOrder, updateOrder, approveOrder } from './services/api';
import { Search, Edit2, Check, RefreshCw, Info } from 'lucide-react';
import './App.css';

function App() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingOrder, setProcessingOrder] = useState(false);

  useEffect(() => {
    // Load orders when component mounts
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = async (orderId) => {
    setSelectedOrder(null);
    setIsEditing(false);
    
    try {
      const orderData = await fetchOrderDetails(orderId);
      setSelectedOrder(orderData);
    } catch (error) {
      console.error(`Failed to load order ${orderId}:`, error);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleFieldUpdate = (field, value) => {
    if (!isEditing) return;
    
    setSelectedOrder({
      ...selectedOrder,
      extracted_data: {
        ...selectedOrder.extracted_data,
        [field]: {
          ...selectedOrder.extracted_data[field],
          value: value,
          edited: true
        }
      }
    });
  };

  const handleSaveChanges = async () => {
    if (!selectedOrder) return;
    
    try {
      await updateOrder(selectedOrder.order_id, {
        extracted_data: selectedOrder.extracted_data
      });
      
      setIsEditing(false);
      // Refresh order details
      await handleOrderSelect(selectedOrder.order_id);
      
      alert('Changes saved successfully');
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save changes');
    }
  };

  const handleProcessOrder = async (orderId) => {
    setProcessingOrder(true);
    
    try {
      await processOrder(orderId);
      await loadOrders();
      await handleOrderSelect(orderId);
      alert(`Order ${orderId} processed successfully`);
    } catch (error) {
      console.error(`Failed to process order ${orderId}:`, error);
      alert(`Failed to process order: ${error.message}`);
    } finally {
      setProcessingOrder(false);
    }
  };

  const handleApproveOrder = async (orderId) => {
    try {
      await approveOrder(orderId);
      await handleOrderSelect(orderId);
      await loadOrders();
      alert(`Order ${orderId} approved for CRM insertion`);
    } catch (error) {
      console.error(`Failed to approve order ${orderId}:`, error);
      alert(`Failed to approve order: ${error.message}`);
    }
  };

  const filteredOrders = orders.filter(order => 
    order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.patient_name && order.patient_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadgeColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch(status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'processed': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'error': 
      case 'processing error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with order list */}
      <div className="w-1/3 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">Workers Comp Orders</h2>
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="pl-10 block w-full rounded-md border border-gray-300 shadow-sm p-2"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrders.map((order) => (
                <div 
                  key={order.order_id}
                  className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${selectedOrder?.order_id === order.order_id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                  onClick={() => handleOrderSelect(order.order_id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{order.order_id}</div>
                      <div className="text-sm text-gray-600">{order.patient_name || 'Unknown Patient'}</div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeColor(order.status)}`}>
                      {order.status || 'Unknown'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {order.processed_date || 'Not processed yet'}
                  </div>
                </div>
              ))}
              
              {filteredOrders.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No orders found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        {selectedOrder ? (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold">{selectedOrder.order_id}</h1>
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedOrder.status)}`}>
                    {selectedOrder.status || 'Pending'}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button 
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  onClick={() => handleProcessOrder(selectedOrder.order_id)}
                  disabled={processingOrder}
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> 
                  {processingOrder ? 'Processing...' : 'Process'}
                </button>
                
                {selectedOrder.extracted_data && (
                  <>
                    <button 
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      onClick={handleEditToggle}
                    >
                      <Edit2 className="h-4 w-4 mr-2" /> {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                    
                    {isEditing ? (
                      <button 
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        onClick={handleSaveChanges}
                      >
                        Save Changes
                      </button>
                    ) : (
                      <button 
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleApproveOrder(selectedOrder.order_id)}
                        disabled={selectedOrder.status === 'Approved'}
                      >
                        <Check className="h-4 w-4 mr-2" /> Approve for CRM
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {selectedOrder.extracted_data ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Extracted Information</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    {isEditing ? 'Edit fields as needed before approving' : 'Review the extracted information for accuracy'}
                  </p>
                </div>
                
                <div className="border-t border-gray-200">
                  <dl>
                    {Object.entries(selectedOrder.extracted_data).map(([key, data], idx) => (
                      <div className={`${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`} key={key}>
                        <dt className="text-sm font-medium text-gray-500 capitalize">
                          {key.replace(/_/g, ' ')}
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {isEditing ? (
                            <input 
                              type="text" 
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              value={data.value || ''}
                              onChange={(e) => handleFieldUpdate(key, e.target.value)}
                            />
                          ) : (
                            <div>
                              <div>{data.value || 'Not provided'}</div>
                              {data.source && data.confidence && (
                                <div className="mt-1 flex items-center text-xs text-gray-500">
                                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${data.confidence === 'high' ? 'bg-green-400' : data.confidence === 'medium' ? 'bg-yellow-400' : 'bg-red-400'}`}></span>
                                  <span>{data.confidence} confidence</span>
                                  <span className="mx-1">•</span>
                                  <span>source: {data.source}</span>
                                  {data.edited && <span className="ml-1 text-blue-500">• (edited)</span>}
                                </div>
                              )}
                            </div>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-6">
                <p className="text-gray-600">
                  This order has not been processed yet. 
                  Click the "Process" button to extract information from the documents.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-lg">Select an order from the sidebar to view details</div>
              <div className="text-sm mt-2">You can review, edit, and approve extracted information</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;