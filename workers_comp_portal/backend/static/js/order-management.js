// Enhanced order processing with feedback
function processOrder(orderId) {
    // Show loading state
    const processBtn = document.getElementById('process-btn');
    if (processBtn) {
        processBtn.disabled = true;
        processBtn.innerHTML = `
            <svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg> Processing...
        `;
    }
    
    fetch(`/api/orders/${orderId}/process`, {
        method: 'POST'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to process order');
            });
        }
        return response.json();
    })
    .then(data => {
        // Re-enable button
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg> Process
            `;
        }
        
        // Reload orders and details
        loadOrders();
        loadOrderDetails(orderId);
        
        // Show success notification
        showNotification('success', 'Order Processed', `Order ${orderId} was processed successfully`);
    })
    .catch(error => {
        console.error(`Error processing order ${orderId}:`, error);
        
        // Re-enable button
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg> Process
            `;
        }
        
        // Show error notification
        showNotification('error', 'Processing Failed', error.message || 'Failed to process order');
    });
}

// Enhanced order approval
function approveOrder(orderId) {
    // Show loading state
    const approveBtn = document.getElementById('approve-btn');
    if (approveBtn) {
        approveBtn.disabled = true;
        approveBtn.innerHTML = `
            <svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg> Approving...
        `;
    }
    
    fetch(`/api/orders/${orderId}/approve`, {
        method: 'POST'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to approve order');
            });
        }
        return response.json();
    })
    .then(data => {
        // Reload orders and details
        loadOrders();
        loadOrderDetails(orderId);
        
        // Show success notification
        showNotification('success', 'Order Approved', `Order ${orderId} was approved for CRM insertion`);
    })
    .catch(error => {
        console.error(`Error approving order ${orderId}:`, error);
        
        // Re-enable button if it still exists
        if (approveBtn) {
            approveBtn.disabled = false;
            approveBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg> Approve for CRM
            `;
        }
        
        // Show error notification
        showNotification('error', 'Approval Failed', error.message || 'Failed to approve order');
    });
}

// Save edited data
function saveChanges(orderId) {
    // Collect all edited values
    const extractedData = {};
    const inputs = document.querySelectorAll('.edit-mode input');
    
    inputs.forEach(input => {
        const field = input.getAttribute('data-field');
        extractedData[field] = {
            value: input.value
        };
    });
    
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

// Toggle editing mode
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
        
        // Hide approve button
        const approveBtn = document.getElementById('approve-btn');
        if (approveBtn) {
            approveBtn.style.display = 'none';
        }
    }
}

// Cancel editing
function cancelEditing() {
    toggleEditing();
}