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

    // Sidebar toggle functionality
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('toggle-sidebar');
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

    // Set initial state
    if (isCollapsed) {
        sidebar.classList.add('w-16');
        sidebar.classList.remove('w-64');
    }

    toggleButton.addEventListener('click', function() {
        sidebar.classList.toggle('w-64');
        sidebar.classList.toggle('w-16');
        
        // Save state to localStorage
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('w-16'));
    });
});


function renderPatientInfoFields(patientInfo) {
    let html = '';
    let idx = 0;
    
    for (const [key, data] of Object.entries(patientInfo)) {
        const bgClass = idx % 2 === 0 ? 'bg-gray-50' : 'bg-white';
        const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        html += `
            <div class="${bgClass} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6" data-field="${key}" data-section="patient_info">
                <dt class="text-sm font-medium text-gray-500">
                    ${displayName}
                    ${renderConfidenceBadge(data.confidence)}
                </dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <div class="view-mode">
                        <div>${data.value || 'Not provided'}</div>
                        ${data.source ? `
                            <div class="mt-1 text-xs text-gray-500">
                                <span>Source: ${data.source}</span>
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
                            data-section="patient_info"
                        />
                    </div>
                </dd>
            </div>
        `;
        idx++;
    }
    
    return html;
}

function renderProcedures(procedures) {
    if (!procedures || procedures.length === 0) {
        return `<div class="px-4 py-5 text-sm text-gray-500">No procedures found</div>`;
    }
    
    let html = '';
    
    procedures.forEach((procedure, index) => {
        html += `
            <div class="procedure-item border-t border-gray-200" data-index="${index}">
                <div class="px-4 py-3 bg-gray-50 flex justify-between items-center">
                    <h5 class="text-sm font-medium text-gray-700">Procedure ${index + 1}</h5>
                    <button 
                        class="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded text-red-700 bg-white hover:bg-red-50 delete-procedure-btn"
                        style="display: none;"
                        onclick="deleteProcedure(${index})"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                    </button>
                </div>
                ${renderProcedureFields(procedure)}
            </div>
        `;
    });
    
    return html;
}

function renderProcedureFields(procedure) {
    let html = '';
    let idx = 0;
    
    for (const [key, data] of Object.entries(procedure)) {
        const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        html += `
            <div class="${bgClass} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6" data-field="${key}" data-section="procedure">
                <dt class="text-sm font-medium text-gray-500">
                    ${displayName}
                    ${renderConfidenceBadge(data.confidence)}
                </dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <div class="view-mode">
                        <div>${data.value || 'Not provided'}</div>
                        ${data.source ? `
                            <div class="mt-1 text-xs text-gray-500">
                                <span>Source: ${data.source}</span>
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
                            data-section="procedure"
                        />
                    </div>
                </dd>
            </div>
        `;
        idx++;
    }
    
    return html;
}

function renderConfidenceBadge(confidence) {
    if (!confidence) return '';
    
    let color = 'gray';
    if (confidence === 'high') color = 'green';
    else if (confidence === 'medium') color = 'yellow';
    else if (confidence === 'low') color = 'red';
    
    return `
        <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800">
            ${confidence}
        </span>
    `;
}

// Add new procedure
function addNewProcedure() {
    const procedureTemplate = {
        service_description: { value: "", source: "user_added", confidence: "high" },
        cpt_code: { value: "", source: "user_added", confidence: "high" },
        icd10_code: { value: "", source: "user_added", confidence: "high" },
        location_request: { value: "", source: "user_added", confidence: "high" },
        referring_provider: { value: "", source: "user_added", confidence: "high" },
        additional_considerations: { value: "", source: "user_added", confidence: "high" }
    };
    
    // Add procedure to DOM
    const proceduresContainer = document.getElementById('procedures-container');
    const newProcedureDiv = document.createElement('div');
    
    const procIndex = document.querySelectorAll('.procedure-item').length;
    newProcedureDiv.className = 'procedure-item border-t border-gray-200';
    newProcedureDiv.dataset.index = procIndex;
    
    newProcedureDiv.innerHTML = `
        <div class="px-4 py-3 bg-gray-50 flex justify-between items-center">
            <h5 class="text-sm font-medium text-gray-700">Procedure ${procIndex + 1}</h5>
            <button 
                class="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded text-red-700 bg-white hover:bg-red-50 delete-procedure-btn"
                onclick="deleteProcedure(${procIndex})"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
            </button>
        </div>
        ${renderProcedureFields(procedureTemplate)}
    `;
    
    proceduresContainer.appendChild(newProcedureDiv);
}

// Delete procedure
function deleteProcedure(index) {
    if (confirm('Are you sure you want to delete this procedure?')) {
        const procedureToRemove = document.querySelector(`.procedure-item[data-index="${index}"]`);
        if (procedureToRemove) {
            procedureToRemove.remove();
            
            // Renumber remaining procedures
            document.querySelectorAll('.procedure-item').forEach((item, idx) => {
                item.dataset.index = idx;
                item.querySelector('h5').textContent = `Procedure ${idx + 1}`;
                
                // Update delete button onclick
                const deleteBtn = item.querySelector('.delete-procedure-btn');
                if (deleteBtn) {
                    deleteBtn.setAttribute('onclick', `deleteProcedure(${idx})`);
                }
            });
        }
    }
}

// Modified toggleEditing to show/hide procedure buttons
function toggleEditing() {
    const isCurrentlyEditing = document.getElementById('edit-controls').style.display !== 'none';
    
    if (isCurrentlyEditing) {
        // Exit edit mode
        document.getElementById('edit-controls').style.display = 'none';
        document.getElementById('edit-mode-text').textContent = 'Review the extracted information for accuracy';
        document.getElementById('edit-btn').textContent = 'Edit';
        
        // Hide input fields, show display values
        document.querySelectorAll('.edit-mode').forEach(el => {
            el.style.display = 'none';
        });
        
        document.querySelectorAll('.view-mode').forEach(el => {
            el.style.display = 'block';
        });
        
        // Hide procedure buttons
        document.getElementById('add-procedure-btn').style.display = 'none';
        document.querySelectorAll('.delete-procedure-btn').forEach(btn => {
            btn.style.display = 'none';
        });
        
        // Show approve button
        const approveBtn = document.getElementById('approve-btn');
        if (approveBtn) {
            approveBtn.style.display = 'flex';
        }
    } else {
        // Enter edit mode
        document.getElementById('edit-controls').style.display = 'flex';
        document.getElementById('edit-mode-text').textContent = 'Edit fields as needed before saving';
        document.getElementById('edit-btn').textContent = 'Cancel';
        
        // Show input fields, hide display values
        document.querySelectorAll('.edit-mode').forEach(el => {
            el.style.display = 'block';
        });
        
        document.querySelectorAll('.view-mode').forEach(el => {
            el.style.display = 'none';
        });
        
        // Show procedure buttons
        document.getElementById('add-procedure-btn').style.display = 'inline-flex';
        document.querySelectorAll('.delete-procedure-btn').forEach(btn => {
            btn.style.display = 'inline-flex';
        });
        
        // Hide approve button
        const approveBtn = document.getElementById('approve-btn');
        if (approveBtn) {
            approveBtn.style.display = 'none';
        }
    }
}

// Modified saveChanges to handle procedures
function saveChanges(orderId) {
    // Collect all patient info values
    const patientInfo = {};
    const patientInfoInputs = document.querySelectorAll('[data-section="patient_info"] input');
    
    patientInfoInputs.forEach(input => {
        const field = input.getAttribute('data-field');
        patientInfo[field] = {
            value: input.value,
            source: input.value ? 'user_edited' : 'not found',
            confidence: 'high',
            edited: true
        };
    });
    
    // Collect all procedures
    const procedures = [];
    const procedureItems = document.querySelectorAll('.procedure-item');
    
    procedureItems.forEach(procedureItem => {
        const procedureInputs = procedureItem.querySelectorAll('[data-section="procedure"] input');
        const procedure = {};
        
        procedureInputs.forEach(input => {
            const field = input.getAttribute('data-field');
            procedure[field] = {
                value: input.value,
                source: input.value ? 'user_edited' : 'not found',
                confidence: 'high',
                edited: true
            };
        });
        
        procedures.push(procedure);
    });
    
    // Prepare data for API
    const extractedData = {
        patient_info: patientInfo,
        procedures: procedures
    };
    
    // Show loading state
    const editControls = document.getElementById('edit-controls');
    if (editControls) {
        const saveBtn = editControls.querySelector('button:last-child');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `
                <svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg> Saving...
            `;
        }
    }
    
    fetch(`/api/orders/${orderId}/update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            extracted_data: extractedData
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to save changes');
            });
        }
        return response.json();
    })
    .then(data => {
        // Exit edit mode
        toggleEditing();
        
        // Reload order details
        loadOrderDetails(orderId);
        
        // Show success notification
        showNotification('success', 'Changes Saved', 'Changes were saved successfully');
    })
    .catch(error => {
        console.error(`Error saving changes for order ${orderId}:`, error);
        
        // Re-enable save button
        if (editControls) {
            const saveBtn = editControls.querySelector('button:last-child');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Save Changes';
            }
        }
        
        // Show error notification
        showNotification('error', 'Save Failed', error.message || 'Failed to save changes');
    });
}

// Package for CRM function
function packageForCRM(orderId) {
    if (!confirm('Are you sure you want to package this order for CRM insertion?')) {
        return;
    }
    
    // Show loading notification
    showNotification('info', 'Processing', 'Packaging order for CRM insertion...');
    
    fetch(`/api/orders/${orderId}/package-for-crm`, {
        method: 'POST'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to package order for CRM');
            });
        }
        return response.json();
    })
    .then(data => {
        // Show success notification
        showNotification('success', 'Success', `Order ${orderId} has been packaged for CRM insertion`);
        
        // Reload order details to reflect status change
        loadOrderDetails(orderId);
    })
    .catch(error => {
        console.error(`Error packaging order ${orderId} for CRM:`, error);
        
        // Show error notification
        showNotification('error', 'Packaging Failed', error.message || 'Failed to package order for CRM');
    });
}

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

function renderExtractedData(order) {
    let html = `
        <div class="bg-white shadow overflow-hidden sm:rounded-lg">
            <div class="px-4 py-5 sm:px-6">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Extracted Information</h3>
                <p class="mt-1 max-w-2xl text-sm text-gray-500" id="edit-mode-text">
                    Review the extracted information for accuracy
                </p>
                <div class="mt-2">
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
                </div>
            </div>
            
            <!-- Patient Info Section -->
            <div class="border-t border-gray-200">
                <h4 class="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-500">Patient Information</h4>
                <dl id="patient-info-container">
                    ${renderPatientInfoFields(order.extracted_data.patient_info)}
                </dl>
            </div>
            
            <!-- Procedures Section -->
            <div class="border-t border-gray-200">
                <div class="px-4 py-2 bg-gray-50 flex justify-between items-center">
                    <h4 class="text-sm font-medium text-gray-500">Procedures</h4>
                    <button 
                        id="add-procedure-btn"
                        class="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50"
                        style="display: none;"
                        onclick="addNewProcedure()"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Procedure
                    </button>
                </div>
                <div id="procedures-container">
                    ${renderProcedures(order.extracted_data.procedures)}
                </div>
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

        <!-- Provider Section - Only show if mapping data exists -->
            ${order.mapping_data && order.mapping_data.geocode_data ? `
            <div id="providers-section" class="bg-white shadow overflow-hidden sm:rounded-lg mt-6">
                <div class="px-4 py-5 sm:px-6">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">Nearby Providers</h3>
                    <p class="mt-1 max-w-2xl text-sm text-gray-500" id="patient-location">
                        ${order.mapping_data.geocode_data.display_name || 'Patient location found'}
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
                            value="${order.extracted_data.procedures[0]?.cpt_code?.value || ''}"
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
            ` : ''}
        </div>
        
        <!-- Edit controls and Package for CRM button as before -->
    

        <!-- Package for CRM Button -->
        <div class="mt-6 flex justify-end">
            <button 
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                onclick="packageForCRM('${order.order_id}')"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Package for CRM
            </button>
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