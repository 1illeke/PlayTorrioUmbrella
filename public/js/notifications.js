// Notification System

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    // Remove existing type classes
    notification.classList.remove('success', 'error', 'info', 'warning');
    
    // Add new type class
    if (type) {
        notification.classList.add(type);
    }
    
    // Set message
    notification.textContent = message;
    
    // Show notification
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Export for use in other modules
window.showNotification = showNotification;
