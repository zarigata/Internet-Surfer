/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║ Resource Limiter Advanced Settings Controller                 ║
 * ║ Handles advanced configuration for CPU, memory, and network   ║
 * ║ Part of the XP-style Resource Limiter Settings Panel          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * FEATURES:
 * - [+] Advanced monitoring controls
 * - [+] Process management options
 * - [+] Startup configuration
 * - [+] Diagnostics and troubleshooting
 * - [+] XP-style UI integration
 * - [+] Cross-platform compatibility
 * 
 * Copyright (c) 2025 ZARI CORP - All Rights Reserved
 */

const { ipcRenderer } = require('electron');
const os = require('os');

/**
 * ███████████████████████████████████████████████████████████████
 * █ Resource Limiter Advanced Settings Controller                █
 * █ Manages advanced limiter configuration options               █
 * ███████████████████████████████████████████████████████████████
 */
class LimiterAdvancedSettings {
    constructor() {
        // Element references
        this.monitoringIntervalInput = document.getElementById('monitoring-interval');
        this.startWithBrowserToggle = document.getElementById('start-with-browser');
        this.showInStatusBarToggle = document.getElementById('show-in-status-bar');
        this.notifyOnLimitToggle = document.getElementById('notify-on-limit');
        this.processManagementToggle = document.getElementById('enable-process-management');
        this.debugModeToggle = document.getElementById('enable-debug-mode');
        this.triggerGcButton = document.getElementById('trigger-gc-button');
        this.runDiagnosticsButton = document.getElementById('run-diagnostics-button');
        this.resetSettingsButton = document.getElementById('reset-settings-button');
        this.saveSettingsButton = document.getElementById('save-advanced-settings');
        
        // OS info display
        this.osInfoContainer = document.getElementById('os-info-container');
        
        // Log output
        this.logOutput = document.getElementById('limiter-log-output');
        
        // Settings
        this.settings = {
            monitoringIntervalMs: 1000,
            startWithBrowser: true,
            showInStatusBar: true,
            notifyOnLimit: true,
            enableProcessManagement: true,
            debugMode: false
        };
        
        // Initialize
        this.init();
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Initialize advanced settings controller                     █
     * █ Sets up event listeners and loads settings                  █
     * ███████████████████████████████████████████████████████████████
     */
    async init() {
        // Load current settings
        await this.loadSettings();
        
        // Apply settings to UI
        this.applySettingsToUI();
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Display OS info
        this._displayOsInfo();
        
        console.log('[Advanced] Initialized');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Load settings                                               █
     * █ Loads advanced settings from main process                   █
     * ███████████████████████████████████████████████████████████████
     */
    async loadSettings() {
        try {
            // Get settings from main process
            const advancedSettings = await ipcRenderer.invoke('get-advanced-limiter-settings');
            
            // Update settings object with received values
            if (advancedSettings) {
                this.settings = {
                    ...this.settings,
                    ...advancedSettings
                };
            }
            
            console.log('[Advanced] Loaded settings:', this.settings);
        } catch (error) {
            console.error('[Advanced] Error loading settings:', error);
            this._appendToLog('Error loading settings: ' + error.message);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Apply settings to UI                                        █
     * █ Updates UI controls with current settings                   █
     * ███████████████████████████████████████████████████████████████
     */
    applySettingsToUI() {
        // Update input fields with current settings
        if (this.monitoringIntervalInput) {
            this.monitoringIntervalInput.value = this.settings.monitoringIntervalMs;
        }
        
        // Update toggles
        if (this.startWithBrowserToggle) {
            this.startWithBrowserToggle.checked = this.settings.startWithBrowser;
        }
        
        if (this.showInStatusBarToggle) {
            this.showInStatusBarToggle.checked = this.settings.showInStatusBar;
        }
        
        if (this.notifyOnLimitToggle) {
            this.notifyOnLimitToggle.checked = this.settings.notifyOnLimit;
        }
        
        if (this.processManagementToggle) {
            this.processManagementToggle.checked = this.settings.enableProcessManagement;
        }
        
        if (this.debugModeToggle) {
            this.debugModeToggle.checked = this.settings.debugMode;
            
            // Show/hide log output based on debug mode
            if (this.logOutput) {
                this.logOutput.parentElement.style.display = 
                    this.settings.debugMode ? 'block' : 'none';
            }
        }
        
        console.log('[Advanced] Applied settings to UI');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Save settings                                               █
     * █ Saves advanced settings to main process                     █
     * ███████████████████████████████████████████████████████████████
     */
    async saveSettings() {
        try {
            // Update settings from UI
            this._updateSettingsFromUI();
            
            // Send settings to main process
            await ipcRenderer.invoke('update-advanced-limiter-settings', this.settings);
            
            console.log('[Advanced] Saved settings:', this.settings);
            this._appendToLog('Settings saved successfully');
            
            // Show confirmation message
            this._showMessage('Advanced settings saved successfully!');
        } catch (error) {
            console.error('[Advanced] Error saving settings:', error);
            this._appendToLog('Error saving settings: ' + error.message);
            
            // Show error message
            this._showMessage('Error saving settings: ' + error.message, 'error');
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Trigger garbage collection                                  █
     * █ Requests a force garbage collection in all processes        █
     * ███████████████████████████████████████████████████████████████
     */
    async triggerGarbageCollection() {
        try {
            // Display feedback
            this._appendToLog('Requesting garbage collection...');
            
            // Request GC in all processes
            const result = await ipcRenderer.invoke('force-garbage-collection', { allProcesses: true });
            
            console.log('[Advanced] Triggered garbage collection:', result);
            this._appendToLog('Garbage collection completed: ' + JSON.stringify(result));
            
            // Show confirmation message
            this._showMessage('Garbage collection completed successfully!');
        } catch (error) {
            console.error('[Advanced] Error triggering GC:', error);
            this._appendToLog('Error triggering garbage collection: ' + error.message);
            
            // Show error message
            this._showMessage('Error triggering garbage collection', 'error');
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Run diagnostics                                             █
     * █ Performs diagnostic tests on limiters                       █
     * ███████████████████████████████████████████████████████████████
     */
    async runDiagnostics() {
        try {
            // Clear previous diagnostics
            this._appendToLog('Running limiter diagnostics...');
            
            // Run diagnostics
            const diagnosticsResults = await ipcRenderer.invoke('run-limiter-diagnostics');
            
            // Display results
            console.log('[Advanced] Diagnostics results:', diagnosticsResults);
            
            // Format and display each test result
            if (diagnosticsResults && Array.isArray(diagnosticsResults.tests)) {
                diagnosticsResults.tests.forEach(test => {
                    const status = test.passed ? 'PASS' : 'FAIL';
                    const statusClass = test.passed ? 'success' : 'error';
                    
                    this._appendToLog(
                        `[${status}] ${test.name}: ${test.message}`, 
                        statusClass
                    );
                });
                
                // Show summary
                const passCount = diagnosticsResults.tests.filter(t => t.passed).length;
                const totalCount = diagnosticsResults.tests.length;
                
                this._appendToLog(
                    `Diagnostics complete: ${passCount}/${totalCount} tests passed.`,
                    passCount === totalCount ? 'success' : 'warning'
                );
                
                // Show confirmation message
                this._showMessage(`Diagnostics complete: ${passCount}/${totalCount} tests passed`);
            } else {
                this._appendToLog('No diagnostic results returned');
                this._showMessage('No diagnostic results returned', 'warning');
            }
        } catch (error) {
            console.error('[Advanced] Error running diagnostics:', error);
            this._appendToLog('Error running diagnostics: ' + error.message, 'error');
            
            // Show error message
            this._showMessage('Error running diagnostics', 'error');
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Reset settings                                              █
     * █ Resets all limiter settings to default values               █
     * ███████████████████████████████████████████████████████████████
     */
    async resetSettings() {
        try {
            // Confirm reset
            if (!confirm('Are you sure you want to reset all limiter settings to default values? This cannot be undone.')) {
                return;
            }
            
            this._appendToLog('Resetting all limiter settings to defaults...');
            
            // Reset settings
            await ipcRenderer.invoke('reset-limiter-settings');
            
            console.log('[Advanced] Reset all settings to defaults');
            this._appendToLog('All settings reset to defaults successfully');
            
            // Reload settings
            await this.loadSettings();
            
            // Apply to UI
            this.applySettingsToUI();
            
            // Notify other tabs about reset
            window.dispatchEvent(new CustomEvent('limiter-settings-reset'));
            
            // Show confirmation message
            this._showMessage('All settings have been reset to defaults');
        } catch (error) {
            console.error('[Advanced] Error resetting settings:', error);
            this._appendToLog('Error resetting settings: ' + error.message, 'error');
            
            // Show error message
            this._showMessage('Error resetting settings', 'error');
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Update settings from UI                            █
     * █ Gets current values from UI controls                        █
     * ███████████████████████████████████████████████████████████████
     */
    _updateSettingsFromUI() {
        // Get values from input fields
        if (this.monitoringIntervalInput) {
            const interval = parseInt(this.monitoringIntervalInput.value, 10);
            this.settings.monitoringIntervalMs = isNaN(interval) ? 1000 : Math.max(100, interval);
        }
        
        // Get toggle states
        if (this.startWithBrowserToggle) {
            this.settings.startWithBrowser = this.startWithBrowserToggle.checked;
        }
        
        if (this.showInStatusBarToggle) {
            this.settings.showInStatusBar = this.showInStatusBarToggle.checked;
        }
        
        if (this.notifyOnLimitToggle) {
            this.settings.notifyOnLimit = this.notifyOnLimitToggle.checked;
        }
        
        if (this.processManagementToggle) {
            this.settings.enableProcessManagement = this.processManagementToggle.checked;
        }
        
        if (this.debugModeToggle) {
            this.settings.debugMode = this.debugModeToggle.checked;
            
            // Show/hide log output based on debug mode
            if (this.logOutput) {
                this.logOutput.parentElement.style.display = 
                    this.settings.debugMode ? 'block' : 'none';
            }
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Display OS info                                    █
     * █ Shows OS and system information                             █
     * ███████████████████████████████████████████████████████████████
     */
    _displayOsInfo() {
        if (!this.osInfoContainer) return;
        
        try {
            // Get OS info
            const platform = os.platform();
            const release = os.release();
            const totalMem = Math.round(os.totalmem() / (1024 * 1024 * 1024) * 10) / 10; // GB
            const cpuModel = os.cpus()[0].model;
            const cpuCores = os.cpus().length;
            
            // Create table
            const table = document.createElement('table');
            table.className = 'xp-system-info-table';
            
            // Platform row
            const platformRow = document.createElement('tr');
            const platformLabel = document.createElement('th');
            platformLabel.textContent = 'Platform:';
            const platformValue = document.createElement('td');
            platformValue.textContent = this._formatPlatform(platform, release);
            platformRow.appendChild(platformLabel);
            platformRow.appendChild(platformValue);
            table.appendChild(platformRow);
            
            // CPU row
            const cpuRow = document.createElement('tr');
            const cpuLabel = document.createElement('th');
            cpuLabel.textContent = 'Processor:';
            const cpuValue = document.createElement('td');
            cpuValue.textContent = `${cpuModel} (${cpuCores} cores)`;
            cpuRow.appendChild(cpuLabel);
            cpuRow.appendChild(cpuValue);
            table.appendChild(cpuRow);
            
            // Memory row
            const memRow = document.createElement('tr');
            const memLabel = document.createElement('th');
            memLabel.textContent = 'Total Memory:';
            const memValue = document.createElement('td');
            memValue.textContent = `${totalMem} GB`;
            memRow.appendChild(memLabel);
            memRow.appendChild(memValue);
            table.appendChild(memRow);
            
            // Add table to container
            this.osInfoContainer.innerHTML = '';
            this.osInfoContainer.appendChild(table);
            
            console.log('[Advanced] Displayed OS info');
        } catch (error) {
            console.error('[Advanced] Error displaying OS info:', error);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Format platform name                               █
     * █ Converts OS platform to readable name                       █
     * ███████████████████████████████████████████████████████████████
     */
    _formatPlatform(platform, release) {
        switch (platform) {
            case 'win32':
                // Parse Windows version
                if (release.startsWith('10.')) {
                    return `Windows 10/11 (${release})`;
                } else if (release.startsWith('6.3')) {
                    return `Windows 8.1 (${release})`;
                } else if (release.startsWith('6.2')) {
                    return `Windows 8 (${release})`;
                } else if (release.startsWith('6.1')) {
                    return `Windows 7 (${release})`;
                } else {
                    return `Windows (${release})`;
                }
            case 'darwin':
                return `macOS (${release})`;
            case 'linux':
                return `Linux (${release})`;
            default:
                return `${platform} (${release})`;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Append to log                                      █
     * █ Adds a message to the log output                            █
     * ███████████████████████████████████████████████████████████████
     */
    _appendToLog(message, type = 'info') {
        if (!this.logOutput) return;
        
        // Create log entry
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        
        // Add timestamp
        const timestamp = new Date().toLocaleTimeString();
        
        // Format message
        entry.textContent = `[${timestamp}] ${message}`;
        
        // Add to log output
        this.logOutput.appendChild(entry);
        
        // Scroll to bottom
        this.logOutput.scrollTop = this.logOutput.scrollHeight;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Show message                                       █
     * █ Displays a notification message                             █
     * ███████████████████████████████████████████████████████████████
     */
    _showMessage(text, type = 'success') {
        const messageDiv = document.getElementById('advanced-message');
        if (!messageDiv) return;
        
        // Set message text and type
        messageDiv.textContent = text;
        messageDiv.className = `xp-message ${type}`;
        
        // Show message
        messageDiv.classList.remove('hidden');
        
        // Auto-hide after timeout
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 3000);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Set up event listeners                             █
     * █ Attaches event handlers to UI controls                      █
     * ███████████████████████████████████████████████████████████████
     */
    _setupEventListeners() {
        // Save settings button
        if (this.saveSettingsButton) {
            this.saveSettingsButton.addEventListener('click', () => {
                this.saveSettings();
            });
        }
        
        // Trigger GC button
        if (this.triggerGcButton) {
            this.triggerGcButton.addEventListener('click', () => {
                this.triggerGarbageCollection();
            });
        }
        
        // Run diagnostics button
        if (this.runDiagnosticsButton) {
            this.runDiagnosticsButton.addEventListener('click', () => {
                this.runDiagnostics();
            });
        }
        
        // Reset settings button
        if (this.resetSettingsButton) {
            this.resetSettingsButton.addEventListener('click', () => {
                this.resetSettings();
            });
        }
        
        // Debug mode toggle
        if (this.debugModeToggle && this.logOutput) {
            this.debugModeToggle.addEventListener('change', () => {
                // Show/hide log output based on debug mode
                this.logOutput.parentElement.style.display = 
                    this.debugModeToggle.checked ? 'block' : 'none';
            });
        }
        
        // Listen for IPC messages from main process
        ipcRenderer.on('limiter-log', (event, data) => {
            if (data && data.message) {
                this._appendToLog(data.message, data.type || 'info');
            }
        });
        
        console.log('[Advanced] Set up event listeners');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Dispose resources                                           █
     * █ Removes event listeners                                     █
     * ███████████████████████████████████████████████████████████████
     */
    dispose() {
        // Remove IPC listeners
        ipcRenderer.removeAllListeners('limiter-log');
        
        console.log('[Advanced] Disposed');
    }
}

module.exports = LimiterAdvancedSettings;
