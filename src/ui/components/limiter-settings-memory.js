/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║ Memory Limiter Settings Controller                            ║
 * ║ Handles memory limit configuration and real-time usage display ║
 * ║ Part of the XP-style Resource Limiter Settings Panel          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * FEATURES:
 * - [+] Memory usage limit slider
 * - [+] Per-tab memory controls
 * - [+] Garbage collection triggers
 * - [+] Real-time memory usage monitoring
 * - [+] XP-style UI integration
 * - [+] Cross-platform compatibility
 * 
 * Copyright (c) 2025 ZARI CORP - All Rights Reserved
 */

const { ipcRenderer } = require('electron');

/**
 * ███████████████████████████████████████████████████████████████
 * █ Memory Limiter Settings Controller                          █
 * █ Manages memory settings tab in the limiter settings panel   █
 * ███████████████████████████████████████████████████████████████
 */
class MemoryLimiterSettings {
    constructor() {
        // Element references
        this.enabledCheckbox = document.getElementById('memory-limiter-enabled');
        this.maxMemorySlider = document.getElementById('memory-max-percent');
        this.maxMemoryValue = document.getElementById('memory-max-value');
        this.perTabLimitCheckbox = document.getElementById('memory-per-tab-limit');
        this.perTabLimitSlider = document.getElementById('memory-per-tab-mb');
        this.perTabLimitValue = document.getElementById('memory-per-tab-value');
        this.autoGcCheckbox = document.getElementById('memory-auto-gc');
        this.gcIntervalSlider = document.getElementById('memory-gc-interval');
        this.gcIntervalValue = document.getElementById('memory-gc-interval-value');
        this.forceGcButton = document.getElementById('memory-force-gc');
        
        // Memory usage elements
        this.memoryUsageBar = document.getElementById('memory-usage-bar');
        this.memoryUsageValue = document.getElementById('memory-usage-value');
        this.totalMemoryValue = document.getElementById('total-memory');
        this.availableMemoryValue = document.getElementById('available-memory');
        this.browserMemoryValue = document.getElementById('browser-memory');
        this.tabMemoryList = document.getElementById('tab-memory-list');
        
        // Current settings
        this.settings = {
            enabled: false,
            maxMemoryPercent: 60,
            perTabLimit: false,
            perTabLimitMB: 200,
            autoGcEnabled: true,
            gcIntervalMinutes: 5
        };
        
        // Memory stats
        this.memoryStats = null;
        
        // Initialize
        this.init();
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Initialize memory settings controller                       █
     * █ Sets up event listeners and loads current settings          █
     * ███████████████████████████████████████████████████████████████
     */
    init() {
        // Load initial settings
        this._loadSettings();
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Start stats updates
        this._startStatsUpdates();
        
        console.log('[Memory Settings] Initialized');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Apply settings to UI                                        █
     * █ Updates UI controls to reflect current settings             █
     * ███████████████████████████████████████████████████████████████
     */
    applySettingsToUI() {
        // Update enabled state
        this.enabledCheckbox.checked = this.settings.enabled;
        
        // Update memory percentage
        this.maxMemorySlider.value = this.settings.maxMemoryPercent;
        this.maxMemoryValue.textContent = this.settings.maxMemoryPercent;
        
        // Update per-tab limit
        this.perTabLimitCheckbox.checked = this.settings.perTabLimit;
        this.perTabLimitSlider.value = this.settings.perTabLimitMB;
        this.perTabLimitValue.textContent = this.settings.perTabLimitMB;
        
        // Per-tab controls visibility
        this._updatePerTabControlsVisibility();
        
        // Update GC settings
        this.autoGcCheckbox.checked = this.settings.autoGcEnabled;
        this.gcIntervalSlider.value = this.settings.gcIntervalMinutes;
        this.gcIntervalValue.textContent = this.settings.gcIntervalMinutes;
        
        // GC interval slider visibility
        this._updateGcControlsVisibility();
        
        console.log('[Memory Settings] Applied settings to UI');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Update settings from UI                                     █
     * █ Reads current UI control values and updates settings        █
     * ███████████████████████████████████████████████████████████████
     */
    updateSettingsFromUI() {
        // Get enabled state
        this.settings.enabled = this.enabledCheckbox.checked;
        
        // Get memory percentage
        this.settings.maxMemoryPercent = parseInt(this.maxMemorySlider.value);
        
        // Get per-tab limit settings
        this.settings.perTabLimit = this.perTabLimitCheckbox.checked;
        this.settings.perTabLimitMB = parseInt(this.perTabLimitSlider.value);
        
        // Get GC settings
        this.settings.autoGcEnabled = this.autoGcCheckbox.checked;
        this.settings.gcIntervalMinutes = parseInt(this.gcIntervalSlider.value);
        
        // Send settings to main process
        this._saveSettings();
        
        console.log('[Memory Settings] Updated settings from UI:', this.settings);
        return this.settings;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Update memory usage stats                                   █
     * █ Updates UI with latest memory usage information             █
     * ███████████████████████████████████████████████████████████████
     */
    updateStats(stats) {
        if (!stats || !stats.memory) return;
        
        this.memoryStats = stats.memory;
        
        // Update memory usage bar and value
        const usagePercent = this.memoryStats.usagePercent || 0;
        this.memoryUsageBar.style.width = `${usagePercent}%`;
        this.memoryUsageValue.textContent = usagePercent.toFixed(1);
        
        // Set color based on usage
        if (usagePercent > 85) {
            this.memoryUsageBar.style.background = 'linear-gradient(to bottom, #C00000, #FF6060)';
        } else if (usagePercent > 70) {
            this.memoryUsageBar.style.background = 'linear-gradient(to bottom, #C06000, #FFA060)';
        } else {
            this.memoryUsageBar.style.background = 'linear-gradient(to bottom, var(--xp-progress-fill-start), var(--xp-progress-fill-end))';
        }
        
        // Update detailed stats
        const totalMB = Math.round(this.memoryStats.totalMemoryMB || 0);
        const availableMB = Math.round(this.memoryStats.availableMemoryMB || 0);
        const browserMB = Math.round(this.memoryStats.browserMemoryMB || 0);
        
        this.totalMemoryValue.textContent = `${totalMB} MB`;
        this.availableMemoryValue.textContent = `${availableMB} MB`;
        this.browserMemoryValue.textContent = `${browserMB} MB`;
        
        // Update tab memory list
        this._updateTabMemoryList();
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Force garbage collection                                    █
     * █ Triggers manual garbage collection process                  █
     * ███████████████████████████████████████████████████████████████
     */
    async forceGarbageCollection() {
        try {
            this.forceGcButton.disabled = true;
            this.forceGcButton.textContent = 'Running...';
            
            // Trigger GC in main process
            await ipcRenderer.invoke('force-garbage-collection');
            
            // Update button with temporary message
            this.forceGcButton.textContent = 'Completed!';
            
            // Reset button after delay
            setTimeout(() => {
                this.forceGcButton.textContent = 'Run Garbage Collection';
                this.forceGcButton.disabled = false;
            }, 2000);
            
            console.log('[Memory Settings] Manual garbage collection triggered');
        } catch (error) {
            console.error('[Memory Settings] Error triggering garbage collection:', error);
            this.forceGcButton.textContent = 'Error!';
            
            setTimeout(() => {
                this.forceGcButton.textContent = 'Run Garbage Collection';
                this.forceGcButton.disabled = false;
            }, 2000);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Set up event listeners                             █
     * █ Attaches event handlers to UI controls                      █
     * ███████████████████████████████████████████████████████████████
     */
    _setupEventListeners() {
        // Memory limiter enabled checkbox
        this.enabledCheckbox.addEventListener('change', () => {
            this.settings.enabled = this.enabledCheckbox.checked;
            this._saveSettings();
        });
        
        // Max memory percentage slider
        this.maxMemorySlider.addEventListener('input', () => {
            // Update display value while dragging
            this.maxMemoryValue.textContent = this.maxMemorySlider.value;
        });
        
        this.maxMemorySlider.addEventListener('change', () => {
            // Save when slider is released
            this.settings.maxMemoryPercent = parseInt(this.maxMemorySlider.value);
            this._saveSettings();
        });
        
        // Per-tab limit checkbox
        this.perTabLimitCheckbox.addEventListener('change', () => {
            this.settings.perTabLimit = this.perTabLimitCheckbox.checked;
            this._updatePerTabControlsVisibility();
            this._saveSettings();
        });
        
        // Per-tab limit slider
        this.perTabLimitSlider.addEventListener('input', () => {
            // Update display value while dragging
            this.perTabLimitValue.textContent = this.perTabLimitSlider.value;
        });
        
        this.perTabLimitSlider.addEventListener('change', () => {
            // Save when slider is released
            this.settings.perTabLimitMB = parseInt(this.perTabLimitSlider.value);
            this._saveSettings();
        });
        
        // Auto GC checkbox
        this.autoGcCheckbox.addEventListener('change', () => {
            this.settings.autoGcEnabled = this.autoGcCheckbox.checked;
            this._updateGcControlsVisibility();
            this._saveSettings();
        });
        
        // GC interval slider
        this.gcIntervalSlider.addEventListener('input', () => {
            // Update display value while dragging
            this.gcIntervalValue.textContent = this.gcIntervalSlider.value;
        });
        
        this.gcIntervalSlider.addEventListener('change', () => {
            // Save when slider is released
            this.settings.gcIntervalMinutes = parseInt(this.gcIntervalSlider.value);
            this._saveSettings();
        });
        
        // Force GC button
        this.forceGcButton.addEventListener('click', () => {
            this.forceGarbageCollection();
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Update per-tab controls visibility                 █
     * █ Shows/hides per-tab memory limit controls based on setting  █
     * ███████████████████████████████████████████████████████████████
     */
    _updatePerTabControlsVisibility() {
        const perTabControlsDiv = document.getElementById('memory-per-tab-controls');
        if (perTabControlsDiv) {
            perTabControlsDiv.style.display = this.settings.perTabLimit ? 'block' : 'none';
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Update GC controls visibility                      █
     * █ Shows/hides GC interval controls based on setting           █
     * ███████████████████████████████████████████████████████████████
     */
    _updateGcControlsVisibility() {
        const gcIntervalDiv = document.getElementById('memory-gc-interval-controls');
        if (gcIntervalDiv) {
            gcIntervalDiv.style.display = this.settings.autoGcEnabled ? 'block' : 'none';
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Update tab memory list                             █
     * █ Creates and updates the list of tabs with memory usage      █
     * ███████████████████████████████████████████████████████████████
     */
    _updateTabMemoryList() {
        if (!this.memoryStats || !this.memoryStats.tabMemory || !this.tabMemoryList) {
            return;
        }
        
        // Clear current list
        this.tabMemoryList.innerHTML = '';
        
        // Add tabs
        for (const tab of this.memoryStats.tabMemory) {
            const listItem = document.createElement('div');
            listItem.className = 'xp-stats-row';
            
            // Truncate title if needed
            let title = tab.title || 'Unknown Tab';
            if (title.length > 30) {
                title = title.substring(0, 27) + '...';
            }
            
            // Format tab info
            const usage = Math.round(tab.memoryMB || 0);
            
            // Create label and value elements
            const tabLabel = document.createElement('span');
            tabLabel.className = 'xp-stats-label';
            tabLabel.textContent = title;
            
            const tabValue = document.createElement('span');
            tabValue.className = 'xp-stats-data';
            tabValue.textContent = `${usage} MB`;
            
            // Add elements to list item
            listItem.appendChild(tabLabel);
            listItem.appendChild(tabValue);
            
            // Add to the list
            this.tabMemoryList.appendChild(listItem);
        }
        
        // Add message if no tabs
        if (this.memoryStats.tabMemory.length === 0) {
            const noTabsMessage = document.createElement('div');
            noTabsMessage.textContent = 'No tabs open';
            noTabsMessage.style.fontStyle = 'italic';
            noTabsMessage.style.color = '#666666';
            this.tabMemoryList.appendChild(noTabsMessage);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Load memory limiter settings                       █
     * █ Requests current settings from main process                 █
     * ███████████████████████████████████████████████████████████████
     */
    async _loadSettings() {
        try {
            // Get current settings from main process
            const limiterSettings = await ipcRenderer.invoke('get-limiter-settings');
            
            // Update memory settings
            if (limiterSettings && limiterSettings.memory) {
                this.settings.enabled = limiterSettings.memory.enabled;
                this.settings.maxMemoryPercent = limiterSettings.memory.maxMemoryPercent;
                this.settings.perTabLimit = limiterSettings.memory.perTabLimit;
                this.settings.perTabLimitMB = limiterSettings.memory.perTabLimitMB;
                this.settings.autoGcEnabled = limiterSettings.memory.autoGcEnabled;
                this.settings.gcIntervalMinutes = limiterSettings.memory.gcIntervalMinutes;
                
                // Apply to UI
                this.applySettingsToUI();
                
                console.log('[Memory Settings] Loaded settings:', this.settings);
            }
        } catch (error) {
            console.error('[Memory Settings] Error loading settings:', error);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Save memory limiter settings                       █
     * █ Sends current settings to main process                      █
     * ███████████████████████████████████████████████████████████████
     */
    async _saveSettings() {
        try {
            // Send updated settings to main process
            await ipcRenderer.invoke('update-limiter-settings', {
                memory: {
                    enabled: this.settings.enabled,
                    maxMemoryPercent: this.settings.maxMemoryPercent,
                    perTabLimit: this.settings.perTabLimit,
                    perTabLimitMB: this.settings.perTabLimitMB,
                    autoGcEnabled: this.settings.autoGcEnabled,
                    gcIntervalMinutes: this.settings.gcIntervalMinutes
                }
            });
            
            console.log('[Memory Settings] Saved settings:', this.settings);
        } catch (error) {
            console.error('[Memory Settings] Error saving settings:', error);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Start memory stats updates                         █
     * █ Sets up IPC listener for resource stats updates             █
     * ███████████████████████████████████████████████████████████████
     */
    _startStatsUpdates() {
        // Listen for resource stats updates from main process
        ipcRenderer.on('resource-stats-update', (event, stats) => {
            this.updateStats(stats);
        });
        
        // Request initial stats
        ipcRenderer.invoke('get-resource-stats')
            .then(stats => this.updateStats(stats))
            .catch(error => console.error('[Memory Settings] Error getting initial stats:', error));
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Clean up resources                                          █
     * █ Removes event listeners and stops updates                   █
     * ███████████████████████████████████████████████████████████████
     */
    dispose() {
        // Remove IPC listener
        ipcRenderer.removeAllListeners('resource-stats-update');
        
        console.log('[Memory Settings] Disposed');
    }
}

module.exports = MemoryLimiterSettings;
