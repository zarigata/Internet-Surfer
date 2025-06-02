/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║ CPU Limiter Settings Controller                               ║
 * ║ Handles CPU limit configuration and real-time usage display   ║
 * ║ Part of the XP-style Resource Limiter Settings Panel          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * FEATURES:
 * - [+] CPU usage limit slider
 * - [+] Process priority selection
 * - [+] Real-time CPU usage monitoring
 * - [+] XP-style UI integration
 * - [+] Cross-platform compatibility
 * 
 * Copyright (c) 2025 ZARI CORP - All Rights Reserved
 */

const { ipcRenderer } = require('electron');

/**
 * ███████████████████████████████████████████████████████████████
 * █ CPU Limiter Settings Controller                             █
 * █ Manages CPU settings tab in the limiter settings panel      █
 * ███████████████████████████████████████████████████████████████
 */
class CpuLimiterSettings {
    constructor() {
        // Element references
        this.enabledCheckbox = document.getElementById('cpu-limiter-enabled');
        this.maxCpuSlider = document.getElementById('cpu-max-percent');
        this.maxCpuValue = document.getElementById('cpu-max-value');
        this.priorityRadios = document.getElementsByName('cpu-priority');
        this.cpuUsageBar = document.getElementById('cpu-usage-bar');
        this.cpuUsageValue = document.getElementById('cpu-usage-value');
        this.browserCpuValue = document.getElementById('browser-cpu');
        this.systemCpuValue = document.getElementById('system-cpu');
        this.cpuThrottlingValue = document.getElementById('cpu-throttling');
        
        // Current settings
        this.settings = {
            enabled: false,
            maxCpuPercent: 70,
            priority: 'normal'
        };
        
        // Stat update interval
        this.updateInterval = null;
        
        // Initialize
        this.init();
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Initialize CPU settings controller                          █
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
        
        console.log('[CPU Settings] Initialized');
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
        
        // Update CPU percentage
        this.maxCpuSlider.value = this.settings.maxCpuPercent;
        this.maxCpuValue.textContent = this.settings.maxCpuPercent;
        
        // Update priority radio buttons
        for (const radio of this.priorityRadios) {
            radio.checked = (radio.value === this.settings.priority);
        }
        
        console.log('[CPU Settings] Applied settings to UI');
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
        
        // Get CPU percentage
        this.settings.maxCpuPercent = parseInt(this.maxCpuSlider.value);
        
        // Get selected priority
        for (const radio of this.priorityRadios) {
            if (radio.checked) {
                this.settings.priority = radio.value;
                break;
            }
        }
        
        // Send settings to main process
        this._saveSettings();
        
        console.log('[CPU Settings] Updated settings from UI:', this.settings);
        return this.settings;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Update CPU usage stats                                      █
     * █ Updates UI with latest CPU usage information                █
     * ███████████████████████████████████████████████████████████████
     */
    updateStats(stats) {
        if (!stats || !stats.cpu) return;
        
        const cpuStats = stats.cpu;
        
        // Update CPU usage bar and value
        const usage = cpuStats.currentUsage || 0;
        this.cpuUsageBar.style.width = `${usage}%`;
        this.cpuUsageValue.textContent = usage.toFixed(1);
        
        // Set color based on usage
        if (usage > 80) {
            this.cpuUsageBar.style.background = 'linear-gradient(to bottom, #C00000, #FF6060)';
        } else if (usage > 60) {
            this.cpuUsageBar.style.background = 'linear-gradient(to bottom, #C06000, #FFA060)';
        } else {
            this.cpuUsageBar.style.background = 'linear-gradient(to bottom, var(--xp-progress-fill-start), var(--xp-progress-fill-end))';
        }
        
        // Update detailed stats
        this.browserCpuValue.textContent = `${cpuStats.browserCpuUsage || 0}%`;
        this.systemCpuValue.textContent = `${cpuStats.systemCpuUsage || 0}%`;
        
        // Update throttling status
        if (this.settings.enabled && cpuStats.isThrottling) {
            this.cpuThrottlingValue.textContent = 'Active';
            this.cpuThrottlingValue.style.color = '#C00000';
        } else {
            this.cpuThrottlingValue.textContent = 'Inactive';
            this.cpuThrottlingValue.style.color = '';
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Set up event listeners                             █
     * █ Attaches event handlers to UI controls                      █
     * ███████████████████████████████████████████████████████████████
     */
    _setupEventListeners() {
        // CPU limiter enabled checkbox
        this.enabledCheckbox.addEventListener('change', () => {
            this.settings.enabled = this.enabledCheckbox.checked;
            this._saveSettings();
        });
        
        // Max CPU percentage slider
        this.maxCpuSlider.addEventListener('input', () => {
            // Update display value while dragging
            this.maxCpuValue.textContent = this.maxCpuSlider.value;
        });
        
        this.maxCpuSlider.addEventListener('change', () => {
            // Save when slider is released
            this.settings.maxCpuPercent = parseInt(this.maxCpuSlider.value);
            this._saveSettings();
        });
        
        // Process priority radio buttons
        for (const radio of this.priorityRadios) {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.settings.priority = radio.value;
                    this._saveSettings();
                }
            });
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Load CPU limiter settings                          █
     * █ Requests current settings from main process                 █
     * ███████████████████████████████████████████████████████████████
     */
    async _loadSettings() {
        try {
            // Get current settings from main process
            const limiterSettings = await ipcRenderer.invoke('get-limiter-settings');
            
            // Update CPU settings
            if (limiterSettings && limiterSettings.cpu) {
                this.settings.enabled = limiterSettings.cpu.enabled;
                this.settings.maxCpuPercent = limiterSettings.cpu.maxCpuPercent;
                this.settings.priority = limiterSettings.cpu.priority;
                
                // Apply to UI
                this.applySettingsToUI();
                
                console.log('[CPU Settings] Loaded settings:', this.settings);
            }
        } catch (error) {
            console.error('[CPU Settings] Error loading settings:', error);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Save CPU limiter settings                          █
     * █ Sends current settings to main process                      █
     * ███████████████████████████████████████████████████████████████
     */
    async _saveSettings() {
        try {
            // Send updated settings to main process
            await ipcRenderer.invoke('update-limiter-settings', {
                cpu: {
                    enabled: this.settings.enabled,
                    maxCpuPercent: this.settings.maxCpuPercent,
                    priority: this.settings.priority
                }
            });
            
            console.log('[CPU Settings] Saved settings:', this.settings);
        } catch (error) {
            console.error('[CPU Settings] Error saving settings:', error);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Start CPU stats updates                            █
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
            .catch(error => console.error('[CPU Settings] Error getting initial stats:', error));
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
        
        console.log('[CPU Settings] Disposed');
    }
}

module.exports = CpuLimiterSettings;
