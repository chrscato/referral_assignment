// Global variables
let allOrders = [];
let selectedOrderId = null;
let isEditing = false;

// Document ready handler
document.addEventListener('DOMContentLoaded', function() {
    loadOrders();
    
    // Check for selected order from query params
    const urlParams = new URLSearchParams(window.location.search);
    const selectedOrder = urlParams.get('order');
    if (selectedOrder) {
        loadOrderDetails(selectedOrder);
    }
});

// Function to load orders
function loadOrders() {
    fetch('/api/orders')
        .then(response => response.json())
        .then(data => {
            allOrders = data;
            renderOrders(data);
        })
        .catch(error => {
            console.error('Error loading orders:', error);
            document.getElementById('orders-container').innerHTML = 
                '<div class="text-center py-4 text-red-500">Error loading orders. Please try again.</div>';
        });
}

// Function to render orders in sidebar
function renderOrders(orders) {
    const container = document.getElementById('orders-container');
    
    if (orders.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-gray-500">No orders found</div>';
        return;
    }
    
    let html = '';
    orders.forEach(order => {
        const statusClass = getStatusBadgeColor(order.status);
        const isSelected = order.order_id === selectedOrderId ? 'border-blue-500 bg-blue-50' : 'border-gray-200';
        
        html += `
            <div 
                class="p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${isSelected}"
                onclick="loadOrderDetails('${order.order_id}')"
            >
                <div class="flex justify-between items-start">
                    <div>
                        <div class="font-medium">${order.order_id}</div>
                        <div class="text-sm text-gray-600">${order.patient_name || 'Unknown Patient'}</div>
                    </div>
                    <div class="text-xs px-2 py-1 rounded-full font-medium ${statusClass}">
                        ${order.status || 'Pending'}
                    </div>
                </div>
                <div class="text-xs text-gray-500 mt-1">
                    ${order.processed_date || 'Not processed yet'}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Function to load order details
function loadOrderDetails(orderId) {
    selectedOrderId = orderId;
    
    // Update selected order in sidebar
    const allOrderElements = document.querySelectorAll('#orders-container > div');
    allOrderElements.forEach(el => {
        el.classList.remove('border-blue-500', 'bg-blue-50');
        el.classList.add('border-gray-200');
    });
    
    const selectedElement = document.querySelector(`#orders-container > div[onclick="loadOrderDetails('${orderId}')"]`);
    if (selectedElement) {
        selectedElement.classList.remove('border-gray-200');
        selectedElement.classList.add('border-blue-500', 'bg-blue-50');
    }
    
    // Show loading state
    document.getElementById('order-details').innerHTML = `
        <div class="flex justify-center items-center h-full">
            <div class="loader"></div>
            <span class="ml-2">Loading order details...</span>
        </div>
    `;
    
    // Reset map if it exists
    if (window.map) {
        window.map.remove();
        window.map = null;
    }
    
    // Fetch order details
    fetch(`/api/orders/${orderId}`)
        .then(response => response.json())
        .then(data => {
            renderOrderDetails(data);
        })
        .catch(error => {
            console.error('Error loading order details:', error);
            document.getElementById('order-details').innerHTML = `
                <div class="flex items-center justify-center h-full text-red-500">
                    <div class="text-center">
                        <div class="text-lg">Error loading order details</div>
                        <div class="text-sm mt-2">${error.message || 'Please try again'}</div>
                    </div>
                </div>
            `;
        });
}

// Function to render order details
function renderOrderDetails(order) {
    const container = document.getElementById('order-details');
    isEditing = false;
    
    let html = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-2xl font-bold">${order.order_id}</h1>
                    <div class="flex items-center mt-1">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}">
                            ${order.status || 'Pending'}
                        </span>
                    </div>
                </div>
                
                <div class="flex space-x-3">
                    <button 
                        class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        onclick="processOrder('${order.order_id}')"
                        id="process-btn"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg> 
                        Process
                    </button>
    `;
    
    if (order.extracted_data) {
        html += `
            <button 
                class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                onclick="toggleEditing()"
                id="edit-btn"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
            </button>
            
            <button 
                class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                onclick="approveOrder('${order.order_id}')"
                id="approve-btn"
                style="display: ${order.status === 'Approved' ? 'none' : 'flex'}"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Approve for CRM
            </button>
        `;
    }
    
    html += `
                </div>
            </div>
    `;
    
    // Document preview section
    html += `
        <div class="mb-6">
            <div class="document-preview">
                <div class="document-preview-header">
                    <h2 class="text-lg font-medium">Documents</h2>
                </div>
                
                <div class="document-preview-content">
                    <div class="document-grid">
                        <!-- Document List -->
                        <div class="document-list" id="document-list">
                            <div class="flex justify-center py-8">
                                <div class="loader"></div>
                            </div>
                        </div>

                        <!-- Preview Area -->
                        <div class="preview-area" id="preview-area">
                            <div class="preview-placeholder">Loading documents...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (order.extracted_data) {
        html += renderExtractedData(order);
    } else {
        html += `
            <div class="bg-white shadow rounded-lg p-6">
                <p class="text-gray-600">
                    This order has not been processed yet. 
                    Click the "Process" button to extract information from the documents.
                </p>
            </div>
        `;
    }
    
    html += `</div>`;
    container.innerHTML = html;
    
    // Load documents
    if (order.order_id) {
        loadDocumentsWithProgress(order.order_id);
        
        // Load providers if we have extracted data
        if (order.extracted_data) {
            loadProviders(order.order_id);
        }
    }
}

// Render extracted data
function renderExtractedData(order) {
    let html = `
        <div class="bg-white shadow overflow-hidden sm:rounded-lg">
            <div class="px-4 py-5 sm:px-6">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Extracted Information</h3>
                <p class="mt-1 max-w-2xl text-sm text-gray-500" id="edit-mode-text">
                    Review the extracted information for accuracy
                </p>
            </div>
            
            <div class="border-t border-gray-200">
                <dl id="extracted-data-container">
    `;
    
    let idx = 0;
    for (const [key, data] of Object.entries(order.extracted_data)) {
        const bgClass = idx % 2 === 0 ? 'bg-gray-50' : 'bg-white';
        
        html += `
            <div class="${bgClass} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6" data-field="${key}">
                <dt class="text-sm font-medium text-gray-500 capitalize">
                    ${key.replace(/_/g, ' ')}
                </dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <div class="view-mode">
                        <div>${data.value || 'Not provided'}</div>
                        ${data.source && data.confidence ? `
                            <div class="mt-1 flex items-center text-xs text-gray-500">
                                <span class="inline-block w-2 h-2 rounded-full mr-1 ${getConfidenceColor(data.confidence)}"></span>
                                <span>${data.confidence} confidence</span>
                                <span class="mx-1">•</span>
                                <span>source: ${data.source}</span>
                                ${data.edited ? '<span class="ml-1 text-blue-500">• (edited)</span>' : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="edit-mode" style="display: none;">
                        <input 
                            type="text" 
                            class="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            value="${data.value || ''}"
                            data-field="${key}"
                        />
                    </div>
                </dd>
            </div>
        `;
        idx++;
    }
    
    html += `
                </dl>
            </div>
        </div>
        
        <div class="mt-4 flex justify-end" id="edit-controls" style="display: none;">
            <button 
                class="mr-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                onclick="cancelEditing()"
            >
                Cancel
            </button>
            <button 
                class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                onclick="saveChanges('${order.order_id}')"
            >
                Save Changes
            </button>
        </div>

        <!-- Provider Section -->
        <div id="providers-section" class="bg-white shadow overflow-hidden sm:rounded-lg mt-6">
            <div class="px-4 py-5 sm:px-6">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Nearby Providers</h3>
                <p class="mt-1 max-w-2xl text-sm text-gray-500" id="patient-location">
                    Loading providers...
                </p>
                <!-- Add procedure code input -->
                <div class="mt-3 flex items-center">
                    <label for="proc-code" class="block text-sm font-medium text-gray-700 mr-2">
                        Procedure Code:
                    </label>
                    <input
                        type="text"
                        id="proc-code"
                        class="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-32 sm:text-sm border-gray-300 rounded-md"
                        placeholder="e.g. 99213"
                        onchange="refreshProviders()"
                        value="${order.extracted_data.cpt_code?.value || ''}"
                    />
                </div>
            </div>
            
            <!-- Map -->
            <div id="map"></div>
            
            <!-- Provider List -->
            <ul class="divide-y divide-gray-200" id="provider-list">
                <!-- Providers will be inserted here -->
            </ul>
        </div>
    `;
    
    return html;
}

// Filter orders
function filterOrders() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filteredOrders = allOrders.filter(order => 
        order.order_id.toLowerCase().includes(searchTerm) ||
        (order.patient_name && order.patient_name.toLowerCase().includes(searchTerm))
    );
    
    renderOrders(filteredOrders);
}