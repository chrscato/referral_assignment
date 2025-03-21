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

// Format file size for display
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}