// Document viewer and preview functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize PDF.js if available
    if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';
    }
    
    // Check for selected order from query params
    const urlParams = new URLSearchParams(window.location.search);
    const selectedOrderId = urlParams.get('order');
    if (selectedOrderId) {
        loadOrderDetails(selectedOrderId);
    }
});

// Document preview with search functionality
function setupDocumentSearch(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Add search input
    const searchDiv = document.createElement('div');
    searchDiv.className = 'mb-4 relative';
    searchDiv.innerHTML = `
        <input type="text" id="document-search" 
            class="pl-10 block w-full rounded-md border border-gray-300 shadow-sm p-2"
            placeholder="Search in document...">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
    `;
    
    // Find the preview area to insert before it
    const previewArea = container.querySelector('.preview-area') || 
                       container.querySelector('#preview-area');
    if (previewArea && previewArea.parentNode) {
        previewArea.parentNode.insertBefore(searchDiv, previewArea);
        
        // Add event listener for search
        const searchInput = searchDiv.querySelector('#document-search');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                highlightSearchTerms(this.value);
            });
        }
    }
}

// Function to highlight search terms in document preview
function highlightSearchTerms(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        removeHighlights();
        return;
    }
    
    const previewArea = document.querySelector('.preview-text') || 
                       document.querySelector('#preview-area pre');
    if (!previewArea) return;
    
    // Remove existing highlights
    removeHighlights();
    
    // Create regex for search
    const searchRegex = new RegExp(searchTerm, 'gi');
    
    // Get text content
    let content = previewArea.innerHTML;
    
    // Replace with highlighted version
    content = content.replace(searchRegex, match => 
        `<span class="bg-yellow-200">${match}</span>`);
    
    // Update content
    previewArea.innerHTML = content;
}

// Remove highlights
function removeHighlights() {
    const previewArea = document.querySelector('.preview-text') || 
                       document.querySelector('#preview-area pre');
    if (!previewArea) return;
    
    // Get original text
    const highlighted = previewArea.querySelectorAll('.bg-yellow-200');
    
    highlighted.forEach(el => {
        const textNode = document.createTextNode(el.textContent);
        el.parentNode.replaceChild(textNode, el);
    });
}

// Global variables for document handling
let currentOrderId = null;

// Enhanced document loading with progress indicator
function loadDocumentsWithProgress(orderId) {
    currentOrderId = orderId;
    const documentList = document.getElementById('document-list');
    const previewArea = document.getElementById('preview-area');
    const documentPreview = document.getElementById('document-preview');
    
    // Show the document preview section
    documentPreview.style.display = 'block';
    
    // Clear previous content
    documentList.innerHTML = '';
    
    // Show loading indicator
    previewArea.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full">
            <div class="loader"></div>
            <div class="mt-3 text-gray-600">Loading documents...</div>
        </div>
    `;
    
    // Fetch documents
    fetch(`/api/orders/${orderId}/documents`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load documents');
            }
            return response.json();
        })
        .then(documents => {
            // Clear loading state
            previewArea.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>Select a document to preview</p>
                </div>
            `;
            
            // Show document count
            const documentCount = document.createElement('div');
            documentCount.className = 'text-sm text-gray-500 mb-2';
            documentCount.textContent = `${documents.length} document${documents.length !== 1 ? 's' : ''} found`;
            documentList.appendChild(documentCount);
            
            // Populate document list
            if (documents.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'text-center py-4 text-gray-500';
                emptyMessage.textContent = 'No documents found for this order';
                documentList.appendChild(emptyMessage);
            } else {
                documents.forEach(doc => {
                    const docElement = createDocumentElement(doc);
                    documentList.appendChild(docElement);
                });
            }
            
            // Set up document search
            setupDocumentSearch('document-preview');
            
            // Show success notification
            showNotification('success', 'Documents Loaded', `Successfully loaded ${documents.length} document${documents.length !== 1 ? 's' : ''}`);
        })
        .catch(error => {
            console.error('Error loading documents:', error);
            previewArea.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p>Error loading documents</p>
                    <p class="text-sm mt-1">${error.message}</p>
                </div>
            `;
            
            // Show error notification
            showNotification('error', 'Error', 'Failed to load documents');
        });
}

// Create document list item element
function createDocumentElement(doc) {
    const div = document.createElement('div');
    div.className = 'document-item';
    div.onclick = function() { previewDocument(doc); };
    
    // Create icon
    const icon = document.createElement('span');
    icon.className = 'document-icon';
    icon.innerHTML = getFileIcon(doc.type);
    
    // Create info container
    const info = document.createElement('div');
    info.className = 'document-info';
    
    // Create name
    const name = document.createElement('div');
    name.className = 'document-name';
    name.textContent = doc.name;
    
    // Create meta info
    const meta = document.createElement('div');
    meta.className = 'document-meta';
    meta.textContent = `${formatFileSize(doc.size)} • ${doc.type}`;
    
    // Assemble
    info.appendChild(name);
    info.appendChild(meta);
    div.appendChild(icon);
    div.appendChild(info);
    
    return div;
}

// Get icon based on file type
function getFileIcon(type) {
    switch (type) {
        case '.pdf':
            return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>`;
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.gif':
        case '.bmp':
        case '.tif':
        case '.tiff':
            return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>`;
        case '.eml':
            return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>`;
        default:
            return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>`;
    }
}

// Format file size for display
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Preview document
function previewDocument(doc) {
    const previewArea = document.getElementById('preview-area');
    
    // Update selected state
    document.querySelectorAll('.document-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Clear previous preview
    previewArea.innerHTML = `
        <div class="flex justify-center items-center h-full">
            <div class="loader"></div>
        </div>
    `;
    
    // Create preview based on file type
    if (doc.type === '.pdf') {
        // Enhanced PDF viewing with PDF.js if available
        if (window.pdfjsLib) {
            const container = document.createElement('div');
            container.className = 'h-full';
            previewArea.innerHTML = '';
            previewArea.appendChild(container);
            
            // Create PDF viewer
            const loadingTask = window.pdfjsLib.getDocument(`/api/orders/${currentOrderId}/documents/${doc.name}`);
            loadingTask.promise.then(function(pdf) {
                // Create a PDF viewer container
                const viewer = document.createElement('div');
                viewer.className = 'pdf-viewer h-full overflow-auto';
                container.appendChild(viewer);
                
                // Load first page
                pdf.getPage(1).then(function(page) {
                    const scale = 1.2;
                    const viewport = page.getViewport({scale: scale});
                    
                    // Prepare canvas for rendering
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    canvas.className = 'mx-auto';
                    
                    // Add page info
                    const pageInfo = document.createElement('div');
                    pageInfo.className = 'text-center text-sm text-gray-500 my-2';
                    pageInfo.textContent = `Page 1 of ${pdf.numPages}`;
                    
                    // Add navigation controls if there are multiple pages
                    if (pdf.numPages > 1) {
                        const controls = document.createElement('div');
                        controls.className = 'flex justify-center items-center space-x-4 my-2';
                        
                        const prevBtn = document.createElement('button');
                        prevBtn.className = 'px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50';
                        prevBtn.textContent = 'Previous';
                        prevBtn.disabled = true;
                        
                        const nextBtn = document.createElement('button');
                        nextBtn.className = 'px-3 py-1 bg-gray-200 rounded hover:bg-gray-300';
                        nextBtn.textContent = 'Next';
                        
                        // Page number display
                        const pageNumContainer = document.createElement('div');
                        pageNumContainer.className = 'text-sm';
                        
                        const currentPage = document.createElement('span');
                        currentPage.textContent = '1';
                        
                        pageNumContainer.appendChild(document.createTextNode('Page '));
                        pageNumContainer.appendChild(currentPage);
                        pageNumContainer.appendChild(document.createTextNode(` of ${pdf.numPages}`));
                        
                        // Add event listeners
                        let pageNum = 1;
                        
                        nextBtn.addEventListener('click', function() {
                            if (pageNum < pdf.numPages) {
                                pageNum++;
                                renderPage(pageNum);
                                prevBtn.disabled = false;
                                if (pageNum === pdf.numPages) {
                                    nextBtn.disabled = true;
                                }
                            }
                        });
                        
                        prevBtn.addEventListener('click', function() {
                            if (pageNum > 1) {
                                pageNum--;
                                renderPage(pageNum);
                                nextBtn.disabled = false;
                                if (pageNum === 1) {
                                    prevBtn.disabled = true;
                                }
                            }
                        });
                        
                        // Add to controls
                        controls.appendChild(prevBtn);
                        controls.appendChild(pageNumContainer);
                        controls.appendChild(nextBtn);
                        
                        // Add controls to viewer
                        viewer.appendChild(controls);
                    }
                    
                    // Add canvas to viewer
                    viewer.appendChild(canvas);
                    
                    // Render the page
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    
                    page.render(renderContext);
                    
                    // Function to render a specific page
                    function renderPage(num) {
                        // Update page info
                        currentPage.textContent = num;
                        
                        // Get the page
                        pdf.getPage(num).then(function(page) {
                            const viewport = page.getViewport({scale: scale});
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            
                            // Render the page
                            const renderContext = {
                                canvasContext: context,
                                viewport: viewport
                            };
                            
                            page.render(renderContext);
                        });
                    }
                });
            }).catch(function(error) {
                console.error('Error loading PDF:', error);
                previewArea.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full text-red-500">
                        <p>Error loading PDF</p>
                        <p class="text-sm mt-1">${error.message}</p>
                    </div>
                `;
            });
        } else {
            // Fallback to iframe if PDF.js not available
            const iframe = document.createElement('iframe');
            iframe.className = 'w-full h-full border-0';
            iframe.src = `/api/orders/${currentOrderId}/documents/${doc.name}`;
            previewArea.innerHTML = '';
            previewArea.appendChild(iframe);
        }
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff'].includes(doc.type)) {
        const img = document.createElement('img');
        img.className = 'max-w-full h-auto mx-auto';
        img.src = `/api/orders/${currentOrderId}/documents/${doc.name}`;
        img.alt = doc.name;
        
        // Error handling for images
        img.onerror = function() {
            previewArea.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p>Error loading image</p>
                </div>
            `;
        };
        
        previewArea.innerHTML = '';
        previewArea.appendChild(img);
    } else if (doc.type === '.txt' || doc.type === '.eml') {
        const pre = document.createElement('pre');
        pre.className = 'preview-text whitespace-pre-wrap text-sm p-4 h-full overflow-auto';
        
        if (doc.type === '.eml') {
            // For email files, fetch the formatted content
            fetch(`/api/orders/${currentOrderId}/documents/${doc.name}`)
                .then(response => response.text())
                .then(content => {
                    pre.textContent = content.trim() || 'Email content is empty or could not be extracted.';
                    previewArea.innerHTML = '';
                    previewArea.appendChild(pre);
                })
                .catch(error => {
                    console.error('Error loading email content:', error);
                    previewArea.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full text-red-500">
                            <p>Error loading email content</p>
                            <p class="text-sm mt-1">${error.message}</p>
                        </div>
                    `;
                });
        } else {
            // For text files, use OCR text
            pre.textContent = doc.ocr_text || 'No OCR text available';
            previewArea.innerHTML = '';
            previewArea.appendChild(pre);
        }
    } else {
        previewArea.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Preview not available for this file type</p>
                <p class="text-sm mt-2">File type: ${doc.type}</p>
            </div>
        `;
    }
}

// Function to show notifications
function showNotification(type, title, message) {
    const notification = document.getElementById('notification');
    const iconContainer = document.getElementById('notification-icon');
    const titleElement = document.getElementById('notification-title');
    const messageElement = document.getElementById('notification-message');
    
    // Set content
    titleElement.textContent = title;
    messageElement.textContent = message;
    
    // Set type-specific properties
    notification.className = 'notification';
    iconContainer.innerHTML = '';
    
    if (type === 'success') {
        notification.classList.add('notification-success');
        iconContainer.innerHTML = `
            <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
        `;
    } else if (type === 'error') {
        notification.classList.add('notification-error');
        iconContainer.innerHTML = `
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
        `;
    }
    
    // Show notification
    notification.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

function hideNotification() {
    const notification = document.getElementById('notification');
    notification.classList.remove('show');
}

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

// Helper function for status colors
function getStatusBadgeColor(status) {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch(status.toLowerCase()) {
        case 'approved': return 'bg-green-100 text-green-800';
        case 'processed': return 'bg-yellow-100 text-yellow-800';
        case 'pending': return 'bg-blue-100 text-blue-800';
        case 'error': 
        case 'processing error': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getConfidenceColor(confidence) {
    if (!confidence) return 'bg-gray-400';
    
    switch(confidence.toLowerCase()) {
        case 'high': return 'bg-green-400';
        case 'medium': return 'bg-yellow-400';
        case 'low': return 'bg-red-400';
        default: return 'bg-gray-400';
    }
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

// Refresh providers list
function refreshProviders() {
    if (selectedOrderId) {
        loadProviders(selectedOrderId);
    }
}