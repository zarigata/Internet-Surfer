/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║ Resource Limiter Settings Panel Controller                    ║
 * ║ Main controller for the Windows XP styled settings panel      ║
 * ║ Manages CPU, Memory, Network limiters and resource profiles   ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
 * ▓ FEATURES:                                                     ▓
 * ▓ [+] Windows XP styled resource control panel                  ▓
 * ▓ [+] Tabbed interface for profiles, CPU, memory, and network   ▓
 * ▓ [+] Real-time resource usage monitoring                       ▓
 * ▓ [+] Profile management system                                 ▓
 * ▓ [+] Cross-platform compatibility                              ▓
 * ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
 * 
 * Copyright (c) 2025 ZARI CORP - All Rights Reserved
 */

const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Import tab controllers
const LimiterProfilesSettings = require('./limiter-settings-profiles');
const CpuLimiterSettings = require('./limiter-settings-cpu');
const MemoryLimiterSettings = require('./limiter-settings-memory');
const NetworkLimiterSettings = require('./limiter-settings-network');

/**
 * ███████████████████████████████████████████████████████████████
 * █ Resource Limiter Settings Panel                             █
 * █ Main controller for the XP-style resource settings panel    █
 * ███████████████████████████████████████████████████████████████
 */
class LimiterSettingsPanel {
    constructor() {
        // Panel elements
        this.panelContainer = null;
        this.activeTab = 'profiles';
        
        // Tab controllers
        this.profilesController = null;
        this.cpuController = null;
        this.memoryController = null;
        this.networkController = null;
        
        // Panel state
        this.isVisible = false;
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        // Initialize
        this.init();
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Initialize settings panel                                   █
     * █ Loads HTML template and sets up panel                       █
     * ███████████████████████████████████████████████████████████████
     */
    async init() {
        try {
            // Create panel container if it doesn't exist
            if (!this.panelContainer) {
                this.panelContainer = document.createElement('div');
                this.panelContainer.id = 'limiter-settings-panel-container';
                document.body.appendChild(this.panelContainer);
            }
            
            // Load HTML template
            const templatePath = path.join(__dirname, '../templates/limiter-settings-panel.html');
            const template = await this._loadTemplate(templatePath);
            this.panelContainer.innerHTML = template;
            
            // Load CSS
            this._loadStyles();
            
            // Set up event listeners
            this._setupEventListeners();
            
            // Initialize tab controllers
            this._initTabControllers();
            
            console.log('[Limiter Panel] Initialized');
        } catch (error) {
            console.error('[Limiter Panel] Error initializing:', error);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Show panel                                                  █
     * █ Displays the settings panel                                 █
     * ███████████████████████████████████████████████████████████████
     */
    show() {
        if (!this.panelContainer) return;
        
        // Make panel visible
        this.panelContainer.classList.remove('hidden');
        this.isVisible = true;
        
        // Center panel if not positioned before
        const panel = this.panelContainer.querySelector('.xp-window');
        if (panel && (!panel.style.left || !panel.style.top)) {
            this._centerPanel(panel);
        }
        
        // Switch to active tab
        this.switchTab(this.activeTab);
        
        console.log('[Limiter Panel] Showing panel');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Hide panel                                                  █
     * █ Hides the settings panel                                    █
     * ███████████████████████████████████████████████████████████████
     */
    hide() {
        if (!this.panelContainer) return;
        
        // Hide panel
        this.panelContainer.classList.add('hidden');
        this.isVisible = false;
        
        console.log('[Limiter Panel] Hiding panel');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Toggle panel                                                █
     * █ Shows or hides the settings panel                           █
     * ███████████████████████████████████████████████████████████████
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Switch tab                                                  █
     * █ Changes the active tab in the settings panel                █
     * ███████████████████████████████████████████████████████████████
     */
    switchTab(tabId) {
        if (!this.panelContainer) return;
        
        // Get all tabs and content sections
        const tabs = this.panelContainer.querySelectorAll('.xp-tab');
        const contents = this.panelContainer.querySelectorAll('.xp-tab-content');
        
        // Deactivate all tabs and content
        tabs.forEach(tab => tab.classList.remove('active'));
        contents.forEach(content => content.classList.add('hidden'));
        
        // Activate selected tab and content
        const selectedTab = this.panelContainer.querySelector(`.xp-tab[data-tab="${tabId}"]`);
        const selectedContent = this.panelContainer.querySelector(`.xp-tab-content[data-tab="${tabId}"]`);
        
        if (selectedTab && selectedContent) {
            selectedTab.classList.add('active');
            selectedContent.classList.remove('hidden');
            this.activeTab = tabId;
            
            console.log(`[Limiter Panel] Switched to ${tabId} tab`);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Update all settings                                         █
     * █ Synchronizes all controllers with current settings          █
     * ███████████████████████████████████████████████████████████████
     */
    async updateAllSettings() {
        try {
            // Get current settings
            const settings = await ipcRenderer.invoke('get-limiter-settings');
            
            // Update each controller
            if (this.cpuController && settings.cpu) {
                this.cpuController.settings = settings.cpu;
                this.cpuController.applySettingsToUI();
            }
            
            if (this.memoryController && settings.memory) {
                this.memoryController.settings = settings.memory;
                this.memoryController.applySettingsToUI();
            }
            
            if (this.networkController && settings.network) {
                this.networkController.settings = settings.network;
                this.networkController.applySettingsToUI();
            }
            
            console.log('[Limiter Panel] Updated all settings');
        } catch (error) {
            console.error('[Limiter Panel] Error updating settings:', error);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Load HTML template                                 █
     * █ Loads the panel HTML template from file                     █
     * ███████████████████████████████████████████████████████████████
     */
    async _loadTemplate(templatePath) {
        return new Promise((resolve, reject) => {
            fs.readFile(templatePath, 'utf8', (err, data) => {
                if (err) {
                    console.error('[Limiter Panel] Error loading template:', err);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Load CSS styles                                    █
     * █ Loads the Windows XP styled CSS for the panel               █
     * ███████████████████████████████████████████████████████████████
     */
    _loadStyles() {
        // Check if the style is already loaded
        if (document.getElementById('xp-control-panel-css')) {
            return;
        }
        
        // Create style element
        const style = document.createElement('link');
        style.id = 'xp-control-panel-css';
        style.rel = 'stylesheet';
        style.type = 'text/css';
        style.href = '../styles/xp-control-panel.css';
        
        // Add to document head
        document.head.appendChild(style);
        
        console.log('[Limiter Panel] Loaded CSS styles');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Setup event listeners                              █
     * █ Attaches event handlers to panel elements                   █
     * ███████████████████████████████████████████████████████████████
     */
    _setupEventListeners() {
        // Get panel elements
        const panel = this.panelContainer.querySelector('.xp-window');
        const titleBar = this.panelContainer.querySelector('.xp-window-title');
        const closeButton = this.panelContainer.querySelector('.xp-window-close');
        const tabs = this.panelContainer.querySelectorAll('.xp-tab');
        
        // Close button
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hide();
            });
        }
        
        // Window dragging
        if (titleBar && panel) {
            titleBar.addEventListener('mousedown', (e) => {
                // Start dragging
                this.isDragging = true;
                
                // Calculate offset from panel position
                const rect = panel.getBoundingClientRect();
                this.dragOffsetX = e.clientX - rect.left;
                this.dragOffsetY = e.clientY - rect.top;
                
                // Prevent text selection during drag
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!this.isDragging) return;
                
                // Calculate new position
                const x = e.clientX - this.dragOffsetX;
                const y = e.clientY - this.dragOffsetY;
                
                // Update panel position
                panel.style.left = `${x}px`;
                panel.style.top = `${y}px`;
            });
            
            document.addEventListener('mouseup', () => {
                // Stop dragging
                this.isDragging = false;
            });
        }
        
        // Tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                this.switchTab(tabId);
            });
        });
        
        // Handle ESC key to close panel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
        
        // Listen for IPC messages
        ipcRenderer.on('toggle-limiter-settings', () => {
            this.toggle();
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Initialize tab controllers                         █
     * █ Creates controller instances for each settings tab          █
     * ███████████████████████████████████████████████████████████████
     */
    _initTabControllers() {
        // Create controllers if they don't exist
        if (!this.profilesController) {
            this.profilesController = new LimiterProfilesSettings();
        }
        
        if (!this.cpuController) {
            this.cpuController = new CpuLimiterSettings();
        }
        
        if (!this.memoryController) {
            this.memoryController = new MemoryLimiterSettings();
        }
        
        if (!this.networkController) {
            this.networkController = new NetworkLimiterSettings();
        }
        
        console.log('[Limiter Panel] Initialized tab controllers');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Center panel                                       █
     * █ Centers the panel in the viewport                           █
     * ███████████████████████████████████████████████████████████████
     */
    _centerPanel(panel) {
        if (!panel) return;
        
        // Get viewport and panel dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const panelWidth = panel.offsetWidth;
        const panelHeight = panel.offsetHeight;
        
        // Calculate center position
        const left = Math.max(0, (viewportWidth - panelWidth) / 2);
        const top = Math.max(0, (viewportHeight - panelHeight) / 2);
        
        // Set panel position
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Dispose resources                                           █
     * █ Clean up event listeners and controllers                    █
     * ███████████████████████████████████████████████████████████████
     */
    dispose() {
        // Remove the panel from DOM
        if (this.panelContainer && this.panelContainer.parentNode) {
            this.panelContainer.parentNode.removeChild(this.panelContainer);
        }
        
        // Dispose tab controllers
        if (this.profilesController) {
            this.profilesController.dispose();
        }
        
        if (this.cpuController) {
            this.cpuController.dispose();
        }
        
        if (this.memoryController) {
            this.memoryController.dispose();
        }
        
        if (this.networkController) {
            this.networkController.dispose();
        }
        
        // Remove IPC listeners
        ipcRenderer.removeAllListeners('toggle-limiter-settings');
        
        console.log('[Limiter Panel] Disposed');
    }
}

module.exports = LimiterSettingsPanel;
