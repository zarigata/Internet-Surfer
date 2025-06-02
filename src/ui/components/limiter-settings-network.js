/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║ Network Limiter Settings Controller                           ║
 * ║ Handles network throttling configuration and real-time display ║
 * ║ Part of the XP-style Resource Limiter Settings Panel          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * FEATURES:
 * - [+] Download/upload bandwidth limiting
 * - [+] Network condition simulation (latency, packet loss)
 * - [+] Domain exclusion management
 * - [+] Network profile selection
 * - [+] Real-time network usage monitoring
 * - [+] XP-style UI integration
 * - [+] Cross-platform compatibility
 * 
 * Copyright (c) 2025 ZARI CORP - All Rights Reserved
 */

const { ipcRenderer } = require('electron');

/**
 * ███████████████████████████████████████████████████████████████
 * █ Network Limiter Settings Controller                         █
 * █ Manages network settings tab in the limiter settings panel  █
 * ███████████████████████████████████████████████████████████████
 */
class NetworkLimiterSettings {
    constructor() {
        // Element references
        this.enabledCheckbox = document.getElementById('network-limiter-enabled');
        this.profileSelect = document.getElementById('network-profile');
        
        // Bandwidth controls
        this.downloadLimitSlider = document.getElementById('network-download-limit');
        this.downloadLimitValue = document.getElementById('network-download-value');
        this.uploadLimitSlider = document.getElementById('network-upload-limit');
        this.uploadLimitValue = document.getElementById('network-upload-value');
        
        // Network condition controls
        this.latencySlider = document.getElementById('network-latency');
        this.latencyValue = document.getElementById('network-latency-value');
        this.packetLossSlider = document.getElementById('network-packet-loss');
        this.packetLossValue = document.getElementById('network-packet-loss-value');
        
        // Domain exclusion controls
        this.exclusionList = document.getElementById('network-exclusion-list');
        this.exclusionInput = document.getElementById('network-exclusion-input');
        this.addExclusionButton = document.getElementById('network-add-exclusion');
        
        // Network usage displays
        this.downloadUsageBar = document.getElementById('network-download-usage-bar');
        this.downloadUsageValue = document.getElementById('network-download-usage-value');
        this.uploadUsageBar = document.getElementById('network-upload-usage-bar');
        this.uploadUsageValue = document.getElementById('network-upload-usage-value');
        this.activeConnectionsValue = document.getElementById('network-active-connections');
        this.throttledConnectionsValue = document.getElementById('network-throttled-connections');
        
        // Current settings
        this.settings = {
            enabled: false,
            profileName: 'custom',
            downloadKBps: 1024,
            uploadKBps: 512,
            latencyMs: 0,
            packetLossPercent: 0,
            domainExclusions: []
        };
        
        // Network profiles
        this.profiles = {
            '3g': { name: '3G Mobile', downloadKBps: 768, uploadKBps: 256, latencyMs: 100, packetLossPercent: 0 },
            '4g': { name: '4G Mobile', downloadKBps: 4096, uploadKBps: 1024, latencyMs: 50, packetLossPercent: 0 },
            'dsl': { name: 'DSL', downloadKBps: 2048, uploadKBps: 512, latencyMs: 30, packetLossPercent: 0 },
            'cable': { name: 'Cable', downloadKBps: 10240, uploadKBps: 2048, latencyMs: 15, packetLossPercent: 0 },
            'fiber': { name: 'Fiber', downloadKBps: 51200, uploadKBps: 20480, latencyMs: 5, packetLossPercent: 0 },
            'satellite': { name: 'Satellite', downloadKBps: 5120, uploadKBps: 1024, latencyMs: 500, packetLossPercent: 1 },
            'custom': { name: 'Custom', downloadKBps: 1024, uploadKBps: 512, latencyMs: 0, packetLossPercent: 0 }
        };
        
        // Network stats
        this.networkStats = null;
        
        // Initialize
        this.init();
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Initialize network settings controller                      █
     * █ Sets up event listeners and loads current settings          █
     * ███████████████████████████████████████████████████████████████
     */
    init() {
        // Populate profile dropdown
        this._populateProfileDropdown();
        
        // Load initial settings
        this._loadSettings();
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Start stats updates
        this._startStatsUpdates();
        
        console.log('[Network Settings] Initialized');
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
        
        // Update profile selection
        this.profileSelect.value = this.settings.profileName;
        
        // Update bandwidth sliders
        this.downloadLimitSlider.value = this.settings.downloadKBps;
        this.downloadLimitValue.textContent = this._formatBandwidth(this.settings.downloadKBps);
        this.uploadLimitSlider.value = this.settings.uploadKBps;
        this.uploadLimitValue.textContent = this._formatBandwidth(this.settings.uploadKBps);
        
        // Update network condition sliders
        this.latencySlider.value = this.settings.latencyMs;
        this.latencyValue.textContent = `${this.settings.latencyMs} ms`;
        this.packetLossSlider.value = this.settings.packetLossPercent;
        this.packetLossValue.textContent = `${this.settings.packetLossPercent}%`;
        
        // Update domain exclusion list
        this._refreshExclusionList();
        
        console.log('[Network Settings] Applied settings to UI');
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
        
        // Get profile name
        this.settings.profileName = this.profileSelect.value;
        
        // Get bandwidth limits
        this.settings.downloadKBps = parseInt(this.downloadLimitSlider.value);
        this.settings.uploadKBps = parseInt(this.uploadLimitSlider.value);
        
        // Get network conditions
        this.settings.latencyMs = parseInt(this.latencySlider.value);
        this.settings.packetLossPercent = parseFloat(this.packetLossSlider.value);
        
        // Domain exclusions are updated in real-time
        
        // Send settings to main process
        this._saveSettings();
        
        console.log('[Network Settings] Updated settings from UI:', this.settings);
        return this.settings;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Update network usage stats                                  █
     * █ Updates UI with latest network usage information            █
     * ███████████████████████████████████████████████████████████████
     */
    updateStats(stats) {
        if (!stats || !stats.network) return;
        
        this.networkStats = stats.network;
        
        // Update download usage
        const downloadKBps = this.networkStats.downloadKBps || 0;
        const downloadPercent = Math.min(100, Math.round((downloadKBps / this.settings.downloadKBps) * 100)) || 0;
        this.downloadUsageBar.style.width = `${downloadPercent}%`;
        this.downloadUsageValue.textContent = this._formatBandwidth(downloadKBps);
        
        // Update upload usage
        const uploadKBps = this.networkStats.uploadKBps || 0;
        const uploadPercent = Math.min(100, Math.round((uploadKBps / this.settings.uploadKBps) * 100)) || 0;
        this.uploadUsageBar.style.width = `${uploadPercent}%`;
        this.uploadUsageValue.textContent = this._formatBandwidth(uploadKBps);
        
        // Set color based on usage
        if (downloadPercent > 90) {
            this.downloadUsageBar.style.background = 'linear-gradient(to bottom, #C00000, #FF6060)';
        } else if (downloadPercent > 75) {
            this.downloadUsageBar.style.background = 'linear-gradient(to bottom, #C06000, #FFA060)';
        } else {
            this.downloadUsageBar.style.background = 'linear-gradient(to bottom, var(--xp-progress-fill-start), var(--xp-progress-fill-end))';
        }
        
        if (uploadPercent > 90) {
            this.uploadUsageBar.style.background = 'linear-gradient(to bottom, #C00000, #FF6060)';
        } else if (uploadPercent > 75) {
            this.uploadUsageBar.style.background = 'linear-gradient(to bottom, #C06000, #FFA060)';
        } else {
            this.uploadUsageBar.style.background = 'linear-gradient(to bottom, var(--xp-progress-fill-start), var(--xp-progress-fill-end))';
        }
        
        // Update connection counts
        this.activeConnectionsValue.textContent = this.networkStats.activeConnections || 0;
        this.throttledConnectionsValue.textContent = this.networkStats.throttledConnections || 0;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Load profile settings                                       █
     * █ Updates UI with selected profile settings                   █
     * ███████████████████████████████████████████████████████████████
     */
    loadProfile(profileName) {
        // Get profile settings
        const profile = this.profiles[profileName];
        if (!profile) {
            console.error('[Network Settings] Profile not found:', profileName);
            return;
        }
        
        // Update settings with profile values
        this.settings.profileName = profileName;
        this.settings.downloadKBps = profile.downloadKBps;
        this.settings.uploadKBps = profile.uploadKBps;
        this.settings.latencyMs = profile.latencyMs;
        this.settings.packetLossPercent = profile.packetLossPercent;
        
        // Apply to UI
        this.applySettingsToUI();
        
        // Save settings
        this._saveSettings();
        
        console.log('[Network Settings] Loaded profile:', profileName);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Add domain exclusion                                        █
     * █ Adds a domain to the exclusion list                         █
     * ███████████████████████████████████████████████████████████████
     */
    addDomainExclusion(domain) {
        // Validate domain
        domain = domain.trim().toLowerCase();
        if (!domain) {
            return false;
        }
        
        // Check if already in list
        if (this.settings.domainExclusions.includes(domain)) {
            return false;
        }
        
        // Add to list
        this.settings.domainExclusions.push(domain);
        
        // Refresh display
        this._refreshExclusionList();
        
        // Save settings
        this._saveSettings();
        
        console.log('[Network Settings] Added domain exclusion:', domain);
        return true;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Remove domain exclusion                                     █
     * █ Removes a domain from the exclusion list                    █
     * ███████████████████████████████████████████████████████████████
     */
    removeDomainExclusion(domain) {
        // Remove from list
        const index = this.settings.domainExclusions.indexOf(domain);
        if (index !== -1) {
            this.settings.domainExclusions.splice(index, 1);
            
            // Refresh display
            this._refreshExclusionList();
            
            // Save settings
            this._saveSettings();
            
            console.log('[Network Settings] Removed domain exclusion:', domain);
            return true;
        }
        
        return false;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Set up event listeners                             █
     * █ Attaches event handlers to UI controls                      █
     * ███████████████████████████████████████████████████████████████
     */
    _setupEventListeners() {
        // Network limiter enabled checkbox
        this.enabledCheckbox.addEventListener('change', () => {
            this.settings.enabled = this.enabledCheckbox.checked;
            this._saveSettings();
        });
        
        // Profile selection
        this.profileSelect.addEventListener('change', () => {
            this.loadProfile(this.profileSelect.value);
        });
        
        // Download limit slider
        this.downloadLimitSlider.addEventListener('input', () => {
            // Update display value while dragging
            this.downloadLimitValue.textContent = this._formatBandwidth(parseInt(this.downloadLimitSlider.value));
        });
        
        this.downloadLimitSlider.addEventListener('change', () => {
            // Save when slider is released
            this.settings.downloadKBps = parseInt(this.downloadLimitSlider.value);
            this.settings.profileName = 'custom'; // Switch to custom profile
            this.profileSelect.value = 'custom';
            this._saveSettings();
        });
        
        // Upload limit slider
        this.uploadLimitSlider.addEventListener('input', () => {
            // Update display value while dragging
            this.uploadLimitValue.textContent = this._formatBandwidth(parseInt(this.uploadLimitSlider.value));
        });
        
        this.uploadLimitSlider.addEventListener('change', () => {
            // Save when slider is released
            this.settings.uploadKBps = parseInt(this.uploadLimitSlider.value);
            this.settings.profileName = 'custom'; // Switch to custom profile
            this.profileSelect.value = 'custom';
            this._saveSettings();
        });
        
        // Latency slider
        this.latencySlider.addEventListener('input', () => {
            // Update display value while dragging
            this.latencyValue.textContent = `${this.latencySlider.value} ms`;
        });
        
        this.latencySlider.addEventListener('change', () => {
            // Save when slider is released
            this.settings.latencyMs = parseInt(this.latencySlider.value);
            this.settings.profileName = 'custom'; // Switch to custom profile
            this.profileSelect.value = 'custom';
            this._saveSettings();
        });
        
        // Packet loss slider
        this.packetLossSlider.addEventListener('input', () => {
            // Update display value while dragging
            this.packetLossValue.textContent = `${this.packetLossSlider.value}%`;
        });
        
        this.packetLossSlider.addEventListener('change', () => {
            // Save when slider is released
            this.settings.packetLossPercent = parseFloat(this.packetLossSlider.value);
            this.settings.profileName = 'custom'; // Switch to custom profile
            this.profileSelect.value = 'custom';
            this._saveSettings();
        });
        
        // Domain exclusion controls
        this.addExclusionButton.addEventListener('click', () => {
            const domain = this.exclusionInput.value.trim();
            if (this.addDomainExclusion(domain)) {
                this.exclusionInput.value = '';
            }
        });
        
        this.exclusionInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const domain = this.exclusionInput.value.trim();
                if (this.addDomainExclusion(domain)) {
                    this.exclusionInput.value = '';
                }
            }
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Populate profile dropdown                          █
     * █ Fills the profile dropdown with available options           █
     * ███████████████████████████████████████████████████████████████
     */
    _populateProfileDropdown() {
        // Clear existing options
        this.profileSelect.innerHTML = '';
        
        // Add profiles
        for (const [id, profile] of Object.entries(this.profiles)) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = profile.name;
            this.profileSelect.appendChild(option);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Refresh exclusion list                             █
     * █ Updates the domain exclusion list display                   █
     * ███████████████████████████████████████████████████████████████
     */
    _refreshExclusionList() {
        // Clear current list
        this.exclusionList.innerHTML = '';
        
        // Add domains
        for (const domain of this.settings.domainExclusions) {
            const listItem = document.createElement('div');
            listItem.className = 'xp-exclusion-item';
            
            // Create domain text
            const domainText = document.createElement('span');
            domainText.textContent = domain;
            
            // Create remove button
            const removeButton = document.createElement('button');
            removeButton.className = 'xp-button xp-remove-button';
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', () => {
                this.removeDomainExclusion(domain);
            });
            
            // Add elements to list item
            listItem.appendChild(domainText);
            listItem.appendChild(removeButton);
            
            // Add to the list
            this.exclusionList.appendChild(listItem);
        }
        
        // Add message if no domains
        if (this.settings.domainExclusions.length === 0) {
            const noDomainsMessage = document.createElement('div');
            noDomainsMessage.textContent = 'No domains excluded';
            noDomainsMessage.style.fontStyle = 'italic';
            noDomainsMessage.style.color = '#666666';
            this.exclusionList.appendChild(noDomainsMessage);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Format bandwidth                                   █
     * █ Formats bandwidth value with appropriate units              █
     * ███████████████████████████████████████████████████████████████
     */
    _formatBandwidth(kbps) {
        if (kbps >= 1024) {
            return `${(kbps / 1024).toFixed(1)} MB/s`;
        } else {
            return `${kbps} KB/s`;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Load network limiter settings                      █
     * █ Requests current settings from main process                 █
     * ███████████████████████████████████████████████████████████████
     */
    async _loadSettings() {
        try {
            // Get current settings from main process
            const limiterSettings = await ipcRenderer.invoke('get-limiter-settings');
            
            // Update network settings
            if (limiterSettings && limiterSettings.network) {
                this.settings.enabled = limiterSettings.network.enabled;
                this.settings.profileName = limiterSettings.network.profileName;
                this.settings.downloadKBps = limiterSettings.network.downloadKBps;
                this.settings.uploadKBps = limiterSettings.network.uploadKBps;
                this.settings.latencyMs = limiterSettings.network.latencyMs;
                this.settings.packetLossPercent = limiterSettings.network.packetLossPercent;
                this.settings.domainExclusions = limiterSettings.network.domainExclusions || [];
                
                // Apply to UI
                this.applySettingsToUI();
                
                console.log('[Network Settings] Loaded settings:', this.settings);
            }
        } catch (error) {
            console.error('[Network Settings] Error loading settings:', error);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Save network limiter settings                      █
     * █ Sends current settings to main process                      █
     * ███████████████████████████████████████████████████████████████
     */
    async _saveSettings() {
        try {
            // Send updated settings to main process
            await ipcRenderer.invoke('update-limiter-settings', {
                network: {
                    enabled: this.settings.enabled,
                    profileName: this.settings.profileName,
                    downloadKBps: this.settings.downloadKBps,
                    uploadKBps: this.settings.uploadKBps,
                    latencyMs: this.settings.latencyMs,
                    packetLossPercent: this.settings.packetLossPercent,
                    domainExclusions: this.settings.domainExclusions
                }
            });
            
            console.log('[Network Settings] Saved settings:', this.settings);
        } catch (error) {
            console.error('[Network Settings] Error saving settings:', error);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Start network stats updates                        █
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
            .catch(error => console.error('[Network Settings] Error getting initial stats:', error));
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
        
        console.log('[Network Settings] Disposed');
    }
}

module.exports = NetworkLimiterSettings;
