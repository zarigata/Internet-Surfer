/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * Internet Server - Renderer Process
 * 
 * This file handles all the UI interactions and rendering logic for the browser.
 * It communicates with the main process via the electronAPI bridge.
 * 
 * Copyright (c) 2025 ZARI CORP
 */

// Import UI components
const BrowserIntegration = require('./browser-integration');

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', async () => {
    // ==== INITIALIZE COMPONENTS ====
    const tabManager = new TabManager();
    const resourceMonitor = new ResourceMonitor();
    const soundManager = new SoundManager();
    const browserIntegration = new BrowserIntegration();
    
    // Store browser integration instance globally for access by other components
    window.browserIntegration = browserIntegration;
    
    // ==== LOAD USER CONFIGURATION ====
    const config = await window.electronAPI.getConfig();
    applyTheme(config.theme || 'xp_classic');
    
    // Initialize window controls
    initWindowControls();
    
    // Initialize menu system
    initMenuSystem();
    
    // Initialize toolbar
    initToolbar();
    
    // Create initial tab if none exists
    if (document.querySelectorAll('.xp-tab').length === 0) {
        tabManager.createTab();
    }
    
    // Initialize resource monitoring displays
    resourceMonitor.init();
    
    // Initialize sound effects if enabled
    if (config.sounds) {
        soundManager.init();
        // Play startup sound
        soundManager.play('startup');
    }
    
    // Register event handlers for auto-updater
    registerUpdateHandlers();
    
    // Update status bar
    updateStatusBar('Ready');
});

/**
 * Initializes the custom window controls (minimize, maximize, close)
 * Maps clicks to electronAPI functions in preload.js
 */
function initWindowControls() {
    // Minimize button
    document.getElementById('minimize-btn').addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
        playUISound('minimize');
    });
    
    // Maximize/Restore button
    document.getElementById('maximize-btn').addEventListener('click', () => {
        window.electronAPI.maximizeWindow();
        playUISound('maximize');
    });
    
    // Close button
    document.getElementById('close-btn').addEventListener('click', () => {
        playUISound('close');
        window.electronAPI.closeWindow();
    });
}

/**
 * Initializes the XP-style menu system with dropdown functionality
 */
function initMenuSystem() {
    const menuItems = document.querySelectorAll('.xp-menu-item');
    
    // Toggle dropdown menus on click
    menuItems.forEach(item => {
        item.addEventListener('click', (event) => {
            const parent = item.parentElement;
            const isActive = parent.classList.contains('active');
            
            // Close all other menus
            document.querySelectorAll('.xp-menu').forEach(menu => {
                menu.classList.remove('active');
            });
            
            // Toggle current menu
            if (!isActive) {
                parent.classList.add('active');
                playUISound('menu-open');
            } else {
                playUISound('menu-close');
            }
            
            event.stopPropagation();
        });
    });
    
    // Close menus when clicking elsewhere
    document.addEventListener('click', () => {
        document.querySelectorAll('.xp-menu').forEach(menu => {
            if (menu.classList.contains('active')) {
                menu.classList.remove('active');
                playUISound('menu-close');
            }
        });
    });
    
    // Menu item click handlers
    document.getElementById('new-tab-btn').addEventListener('click', () => {
        tabManager.createTab();
        playUISound('tab-open');
    });
    
    document.getElementById('exit-btn').addEventListener('click', () => {
        window.electronAPI.closeWindow();
    });
    
    document.getElementById('refresh-btn').addEventListener('click', () => {
        tabManager.refreshCurrentTab();
        playUISound('refresh');
    });
    
    document.getElementById('settings-btn').addEventListener('click', () => {
        showDialog('settings-dialog');
        playUISound('dialog-open');
    });
    
    document.getElementById('themes-btn').addEventListener('click', () => {
        showDialog('theme-dialog');
        playUISound('dialog-open');
    });
    
    document.getElementById('limiter-btn').addEventListener('click', () => {
        // Use the new browser integration component for limiter settings
        if (window.browserIntegration) {
            window.browserIntegration.toggleLimiterSettingsPanel();
        } else {
            // Fallback to old dialog if integration not available
            showDialog('limiter-dialog');
        }
        playUISound('dialog-open');
    });
    
    document.getElementById('sounds-btn').addEventListener('click', () => {
        soundManager.toggleSettingsPanel();
        playUISound('dialog-open');
    });
}

/**
 * Initializes toolbar buttons and address bar functionality
 */
function initToolbar() {
    // Back button
    document.getElementById('back-btn').addEventListener('click', () => {
        tabManager.goBack();
        playUISound('navigation');
    });
    
    // Forward button
    document.getElementById('forward-btn').addEventListener('click', () => {
        tabManager.goForward();
        playUISound('navigation');
    });
    
    // Refresh button in toolbar
    document.getElementById('refresh-btn-toolbar').addEventListener('click', () => {
        tabManager.refreshCurrentTab();
        playUISound('refresh');
    });
    
    // Home button
    document.getElementById('home-btn').addEventListener('click', () => {
        tabManager.goHome();
        playUISound('navigation');
    });
    
    // Address bar navigation
    const urlInput = document.getElementById('url-input');
    const goBtn = document.getElementById('go-btn');
    
    const navigate = () => {
        const url = urlInput.value.trim();
        if (url) {
            tabManager.navigateTo(url);
            playUISound('navigation');
        }
    };
    
    // Navigate on Enter key
    urlInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            navigate();
        }
    });
    
    // Navigate on Go button click
    goBtn.addEventListener('click', navigate);
    
    // New tab button in tab bar
    document.getElementById('new-tab-button').addEventListener('click', () => {
        tabManager.createTab();
        playUISound('tab-open');
    });
}

/**
 * Displays a modal dialog by ID
 * @param {string} dialogId - The ID of the dialog to show
 */
function showDialog(dialogId) {
    const modalContainer = document.getElementById('modal-container');
    const dialog = document.getElementById(dialogId);
    
    // Hide any currently open dialogs
    document.querySelectorAll('.xp-dialog').forEach(dlg => {
        dlg.classList.remove('active');
    });
    
    // Show modal container and target dialog
    modalContainer.classList.add('active');
    dialog.classList.add('active');
    
    // Add close handlers
    const closeButtons = dialog.querySelectorAll('.xp-dialog-close, [id$="-cancel"]');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            closeDialog(dialogId);
        });
    });
    
    // Handle dialog-specific apply buttons
    const applyBtn = dialog.querySelector('[id$="-apply"]');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            if (dialogId === 'theme-dialog') {
                applyThemeSettings();
            } else if (dialogId === 'limiter-dialog') {
                applyLimiterSettings();
            }
            closeDialog(dialogId);
        });
    }
}

/**
 * Closes a dialog by ID
 * @param {string} dialogId - The ID of the dialog to close
 */
function closeDialog(dialogId) {
    const modalContainer = document.getElementById('modal-container');
    const dialog = document.getElementById(dialogId);
    
    dialog.classList.remove('active');
    modalContainer.classList.remove('active');
    playUISound('dialog-close');
}

/**
 * Applies theme settings from the theme dialog
 */
function applyThemeSettings() {
    const selectedTheme = document.querySelector('input[name="theme"]:checked').value;
    applyTheme(selectedTheme);
    
    // Save to config
    window.electronAPI.updateConfig({ theme: selectedTheme });
    playUISound('apply');
}

/**
 * Applies limiter settings from the limiter dialog
 * @deprecated This function is deprecated and will be removed in a future version.
 * Use the LimiterSettingsPanel component from BrowserIntegration instead.
 */
function applyLimiterSettings() {
    // This function is kept for backwards compatibility
    // New settings are handled by the LimiterSettingsPanel component
    
    // If we have browser integration, use it
    if (window.browserIntegration) {
        window.browserIntegration.toggleLimiterSettingsPanel();
        return;
    }
    
    // Legacy fallback
    const cpuLimit = document.getElementById('cpu-limit-input').value;
    const memoryLimit = document.getElementById('memory-limit-input').value;
    const networkLimit = document.getElementById('network-limit-input').value;
    
    const settings = {
        cpu: {
            enabled: document.getElementById('cpu-limit-toggle').checked,
            limit: parseInt(cpuLimit, 10) || 100
        },
        memory: {
            enabled: document.getElementById('memory-limit-toggle').checked,
            limit: parseInt(memoryLimit, 10) || 100
        },
        network: {
            enabled: document.getElementById('network-limit-toggle').checked,
            limit: parseInt(networkLimit, 10) || 100
        }
    };
    
    window.electronAPI.updateLimiterSettings(settings);
    closeDialog('limiter-dialog');
    updateStatusBar('Resource limits updated');
    playUISound('apply');
}

/**
 * Applies a theme to the browser
 * @param {string} themeName - The name of the theme to apply
 */
function applyTheme(themeName) {
    const body = document.body;
    
    // Remove all theme classes
    body.classList.remove('xp-theme', 'luna', 'dark', 'hacker');
    
    // Add appropriate theme classes
    body.classList.add('xp-theme');
    
    switch (themeName) {
        case 'xp_luna':
            body.classList.add('luna');
            break;
        case 'dark':
            body.classList.add('dark');
            break;
        case 'hacker':
            body.classList.add('hacker');
            break;
        // Default is xp_classic, no additional class needed
    }
    
    // Update status bar to show theme change
    updateStatusBar(`Theme changed to ${themeName.replace('_', ' ')}`);
}

/**
 * Updates the status bar text
 * @param {string} message - The message to display in the status bar
 */
function updateStatusBar(message) {
    const statusText = document.querySelector('.status-text');
    statusText.textContent = message;
}

/**
 * Plays a UI sound if sounds are enabled
 * @param {string} soundId - The ID of the sound to play
 */
function playUISound(soundId) {
    if (window.soundManager && window.soundManager.isEnabled()) {
        window.soundManager.play(soundId);
    }
}

/**
 * Registers handlers for auto-update events
 */
function registerUpdateHandlers() {
    window.electronAPI.onUpdateAvailable(() => {
        updateStatusBar('Update available! Downloading...');
    });
    
    window.electronAPI.onUpdateDownloaded(() => {
        // Show update notification
        const notification = document.createElement('div');
        notification.className = 'xp-notification';
        notification.innerHTML = `
            <div class="notification-title">Update Ready</div>
            <div class="notification-message">An update has been downloaded. Restart to install?</div>
            <div class="notification-buttons">
                <button id="install-update-btn" class="xp-button">Install Now</button>
                <button id="install-later-btn" class="xp-button">Later</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        document.getElementById('install-update-btn').addEventListener('click', () => {
            window.electronAPI.installUpdate();
        });
        
        document.getElementById('install-later-btn').addEventListener('click', () => {
            notification.remove();
        });
    });
}
