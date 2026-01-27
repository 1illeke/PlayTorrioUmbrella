// UI Interaction Functions
// This file handles UI interactions, notifications, modals, etc.

// Persistent notification state
let persistentUpdateNotification = null;
let persistentDownloadNotification = null;

// ===== NOTIFICATION SYSTEM =====

function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    // Clear any existing notification classes
    notification.className = 'notification';
    
    // Add the type class for styling
    if (type) {
        notification.classList.add(type);
    }
    
    // Set the message (text content to avoid HTML injection)
    notification.textContent = message;
    notification.classList.add('show');
    
    // Clear any existing timeout
    if (window.notificationTimeout) {
        clearTimeout(window.notificationTimeout);
    }
    
    // Auto-hide notification after duration
    window.notificationTimeout = setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
    
    // Log notification for debugging
    console.log(`[NOTIFICATION] ${type.toUpperCase()}: ${message}`);
}

// ===== UPDATE NOTIFICATIONS =====

function showPersistentUpdateNotification() {
    // Remove any existing persistent notification
    hideUpdateNotification();
    
    // Create persistent notification element
    persistentUpdateNotification = document.createElement('div');
    persistentUpdateNotification.id = 'persistentUpdateNotification';
    persistentUpdateNotification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(34, 197, 94, 0.3);
            z-index: 10000;
            font-weight: 600;
            font-size: 14px;
            max-width: 320px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideInRight 0.4s ease-out;
        ">
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-rocket" style="font-size: 18px; color: #dcfce7;"></i>
                <div>
                    <div style="font-size: 15px; margin-bottom: 4px;">🎉 Update Ready!</div>
                    <div style="font-size: 13px; opacity: 0.9;">Restart the app to complete the update</div>
                </div>
                <button onclick="restartForUpdate()" style="
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 600;
                    transition: all 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    Restart
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(persistentUpdateNotification);
    
    // Also show a regular notification
    showNotification('🎉 Update ready! Restart to complete installation.', 'success', 6000);
}

function hideUpdateNotification() {
    if (persistentUpdateNotification) {
        persistentUpdateNotification.remove();
        persistentUpdateNotification = null;
    }
    if (persistentDownloadNotification) {
        persistentDownloadNotification.remove();
        persistentDownloadNotification = null;
    }
}

function restartForUpdate() {
    hideUpdateNotification();
    // Trigger restart via the existing restart button in the overlay
    document.getElementById('updateRestartBtn')?.click();
}

// ===== DOWNLOAD PROGRESS NOTIFICATIONS =====

function showPersistentDownloadNotification(percent = 0) {
    // Remove old download notification if any
    if (persistentDownloadNotification) {
        try { persistentDownloadNotification.remove(); } catch(_) {}
        persistentDownloadNotification = null;
    }
    persistentDownloadNotification = document.createElement('div');
    persistentDownloadNotification.id = 'persistentDownloadNotification';
    persistentDownloadNotification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(124, 58, 237, 0.35);
            z-index: 10000;
            font-weight: 600;
            font-size: 14px;
            max-width: 340px;
            min-width: 280px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            animation: slideInRight 0.4s ease-out;
        ">
            <div style="display:flex; align-items:center; gap:12px;">
                <i class="fas fa-download" style="font-size:18px; color:#ede9fe;"></i>
                <div style="flex:1;">
                    <div style="font-size:15px; margin-bottom:6px;">Downloading update...</div>
                    <div id="dlNotifText" style="font-size:13px; opacity:0.95;">${percent}% complete</div>
                    <div style="margin-top:10px; height:6px; background:rgba(255,255,255,0.2); border-radius:6px; overflow:hidden;">
                        <div id="dlNotifBar" style="height:100%; width:${percent}%; background:#c4b5fd; transition: width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(persistentDownloadNotification);
}

function updatePersistentDownloadNotification(percent = 0) {
    if (!persistentDownloadNotification) return;
    const text = persistentDownloadNotification.querySelector('#dlNotifText');
    const bar = persistentDownloadNotification.querySelector('#dlNotifBar');
    if (text) text.textContent = `${percent}% complete`;
    if (bar) bar.style.width = `${percent}%`;
}

// ===== MODAL MANAGEMENT =====

function hideUpdateModal() {
    const updateModal = document.getElementById('updateModal');
    if (updateModal) {
        updateModal.style.display = 'none';
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Export functions for use in other modules
window.showNotification = showNotification;
window.showPersistentUpdateNotification = showPersistentUpdateNotification;
window.hideUpdateNotification = hideUpdateNotification;
window.restartForUpdate = restartForUpdate;
window.showPersistentDownloadNotification = showPersistentDownloadNotification;
window.updatePersistentDownloadNotification = updatePersistentDownloadNotification;
window.hideUpdateModal = hideUpdateModal;
window.showModal = showModal;
window.hideModal = hideModal;

console.log('[UI] UI functions module loaded');
