/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * Internet Server - Resource Limiter Manager
 * 
 * ╔══════════════════════════════════════════════════════════════╗
 * ║ Centralized management of all resource limiters               ║
 * ║ Coordinates CPU, memory, and network limiting                 ║
 * ║ Provides unified interface for browser integration            ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * FEATURES:
 * - [+] Unified resource limit configuration
 * - [+] Profiles for different usage scenarios
 * - [+] IPC-based UI integration
 * - [+] Configuration persistence
 * - [+] Cross-platform implementation
 * 
 * Copyright (c) 2025 ZARI CORP
 */

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Import individual limiters
const CpuLimiter = require('./cpu-limiter');
const MemoryLimiter = require('./memory-limiter');
const NetworkThrottler = require('./network-throttler');

class LimiterManager {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        
        // Resource limiter instances
        this.cpuLimiter = new CpuLimiter();
        this.memoryLimiter = new MemoryLimiter();
        this.networkThrottler = new NetworkThrottler();
        
        // Configuration path
        this.configPath = path.join(
            require('electron').app.getPath('userData'),
            'limiter-config.json'
        );
        
        // Custom profiles storage path
        this.profilesPath = path.join(
            require('electron').app.getPath('userData'),
            'limiter-profiles.json'
        );
        
        // Advanced settings path
        this.advancedSettingsPath = path.join(
            require('electron').app.getPath('userData'),
            'limiter-advanced.json'
        );
        
        // Default settings
        this.settings = {
            enabled: false,
            profiles: {
                current: 'balanced',
                available: ['performance', 'balanced', 'efficiency', 'gaming', 'streaming', 'custom']
            },
            cpu: {
                enabled: false,
                maxCpuPercent: 70,
                priority: 'normal'
            },
            memory: {
                enabled: false,
                maxMemoryMB: 1024,
                perTabLimitMB: 200,
                aggressiveGC: false
            },
            network: {
                enabled: false,
                downloadKbps: 0,
                uploadKbps: 0,
                latencyMs: 0,
                packetLossRate: 0,
                profile: 'unlimited'
            },
            advanced: {
                startupMode: 'auto', // 'auto', 'enabled', 'disabled'
                startWithProfile: 'balanced',
                monitoringInterval: 2000,  // in milliseconds
                notificationsEnabled: true,
                showResourceWarnings: true,
                debugMode: false,
                autoCleanupThreshold: 90,  // percentage
                enableDiagnostics: false,
                exclusions: []  // apps or domains to exclude
            }
        };
        
        // Custom profiles storage
        this.customProfiles = {};
        
        // Settings panel visibility state
        this.panelVisible = false;
        
        // Predefined profiles
        this.profiles = {
            'performance': {
                cpu: { enabled: false, maxCpuPercent: 100, priority: 'high' },
                memory: { enabled: false, maxMemoryMB: 2048, perTabLimitMB: 300, aggressiveGC: false },
                network: { enabled: false, downloadKbps: 0, uploadKbps: 0, latencyMs: 0, profile: 'unlimited' }
            },
            'balanced': {
                cpu: { enabled: true, maxCpuPercent: 70, priority: 'normal' },
                memory: { enabled: true, maxMemoryMB: 1024, perTabLimitMB: 200, aggressiveGC: false },
                network: { enabled: false, downloadKbps: 0, uploadKbps: 0, latencyMs: 0, profile: 'unlimited' }
            },
            'efficiency': {
                cpu: { enabled: true, maxCpuPercent: 50, priority: 'below normal' },
                memory: { enabled: true, maxMemoryMB: 768, perTabLimitMB: 150, aggressiveGC: true },
                network: { enabled: true, downloadKbps: 5000, uploadKbps: 1000, latencyMs: 0, profile: 'fast-4g' }
            },
            'gaming': {
                cpu: { enabled: true, maxCpuPercent: 30, priority: 'low' },
                memory: { enabled: true, maxMemoryMB: 512, perTabLimitMB: 100, aggressiveGC: true },
                network: { enabled: true, downloadKbps: 1000, uploadKbps: 500, latencyMs: 0, profile: '3g' }
            },
            'streaming': {
                cpu: { enabled: true, maxCpuPercent: 40, priority: 'below normal' },
                memory: { enabled: true, maxMemoryMB: 768, perTabLimitMB: 150, aggressiveGC: true },
                network: { enabled: true, downloadKbps: 2000, uploadKbps: 8000, latencyMs: 0, profile: 'satellite' }
            }
        };
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Initializes all resource limiters                           █
     * █ Sets up IPC handlers and loads saved configuration          █
     * ███████████████████████████████████████████████████████████████
     */
    init() {
        console.log('Initializing resource limiter manager');
        
        // Load saved configuration
        this._loadConfiguration();
        
        // Initialize individual limiters
        this.cpuLimiter.init(this.mainWindow);
        this.memoryLimiter.init(this.mainWindow);
        this.networkThrottler.init();
        
        // Register IPC handlers
        this._registerIpcHandlers();
        
        // Apply settings
        this.applySettings();
        
        // Start status updates to renderer
        this._startStatusUpdates();
        
        console.log('Resource limiter manager initialized successfully');
        return this;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Applies current settings to all limiters                    █
     * █ Updates each limiter with its specific configuration        █
     * ███████████████████████████████████████████████████████████████
     */
    applySettings() {
        // Master enable/disable
        const isEnabled = this.settings.enabled;
        
        // Apply CPU settings
        this.cpuLimiter.setEnabled(isEnabled && this.settings.cpu.enabled);
        this.cpuLimiter.updateSettings({
            maxCpuPercent: this.settings.cpu.maxCpuPercent,
            processPriority: this.settings.cpu.priority
        });
        
        // Apply memory settings
        this.memoryLimiter.setEnabled(isEnabled && this.settings.memory.enabled);
        this.memoryLimiter.updateSettings({
            maxMemoryMB: this.settings.memory.maxMemoryMB,
            perTabLimitMB: this.settings.memory.perTabLimitMB,
            aggressiveGC: this.settings.memory.aggressiveGC
        });
        
        // Apply network settings
        this.networkThrottler.setEnabled(isEnabled && this.settings.network.enabled);
        
        if (this.settings.network.profile !== 'custom') {
            // Apply predefined profile
            this.networkThrottler.setNetworkProfile(this.settings.network.profile);
        } else {
            // Apply custom settings
            this.networkThrottler.updateSettings({
                downloadKbps: this.settings.network.downloadKbps,
                uploadKbps: this.settings.network.uploadKbps,
                latencyMs: this.settings.network.latencyMs,
                packetLossRate: this.settings.network.packetLossRate
            });
        }
        
        // Apply browser proxy settings if network throttling is enabled
        if (isEnabled && this.settings.network.enabled) {
            const proxyConfig = this.networkThrottler.getProxyConfig();
            session.defaultSession.setProxy(proxyConfig);
        } else {
            // Reset proxy settings
            session.defaultSession.setProxy({ mode: 'direct' });
        }
        
        console.log('Applied resource limiter settings');
        
        // Save configuration
        this._saveConfiguration();
        
        return this.settings;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Sets the active profile                                     █
     * █ Loads predefined settings based on profile name             █
     * ███████████████████████████████████████████████████████████████
     */
    setProfile(profileName) {
        if (!this.profiles[profileName] && profileName !== 'custom') {
            console.error(`Profile "${profileName}" not found`);
            return false;
        }
        
        // Update current profile name
        this.settings.profiles.current = profileName;
        
        // For non-custom profiles, load predefined settings
        if (profileName !== 'custom') {
            const profile = this.profiles[profileName];
            
            // Update settings with profile values
            this.settings.cpu = { ...this.settings.cpu, ...profile.cpu };
            this.settings.memory = { ...this.settings.memory, ...profile.memory };
            this.settings.network = { ...this.settings.network, ...profile.network };
            
            // Apply the new settings
            this.applySettings();
            
            console.log(`Applied "${profileName}" resource profile`);
        }
        
        // Notify renderer of profile change
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('limiter-profile-changed', {
                profile: profileName,
                settings: this.settings
            });
        }
        
        return true;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Updates limiter settings                                    █
     * █ Applies new settings and saves configuration                █
     * ███████████████████████████████████████████████████████████████
     */
    updateSettings(newSettings) {
        // Update settings object with new values
        if (newSettings.enabled !== undefined) {
            this.settings.enabled = newSettings.enabled;
        }
        
        // Update CPU settings
        if (newSettings.cpu) {
            this.settings.cpu = { ...this.settings.cpu, ...newSettings.cpu };
        }
        
        // Update memory settings
        if (newSettings.memory) {
            this.settings.memory = { ...this.settings.memory, ...newSettings.memory };
        }
        
        // Update network settings
        if (newSettings.network) {
            this.settings.network = { ...this.settings.network, ...newSettings.network };
            
            // If custom settings provided, set profile to custom
            if (newSettings.network.downloadKbps !== undefined || 
                newSettings.network.uploadKbps !== undefined ||
                newSettings.network.latencyMs !== undefined) {
                this.settings.network.profile = 'custom';
            }
        }
        
        // If a profile is specified, apply that profile
        if (newSettings.profile) {
            this.setProfile(newSettings.profile);
        } else {
            // Otherwise just apply current settings
            this.applySettings();
        }
        
        // When custom settings are applied, set to custom profile
        if (newSettings.cpu || newSettings.memory || newSettings.network) {
            this.settings.profiles.current = 'custom';
        }
        
        // Return updated settings
        return this.settings;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Gets the current resource usage statistics                  █
     * █ Collects data from all limiters                             █
     * ███████████████████████████████████████████████████████████████
     */
    getStats() {
        return {
            enabled: this.settings.enabled,
            profile: this.settings.profiles.current,
            cpu: this.cpuLimiter.getStats(),
            memory: this.memoryLimiter.getStats(),
            network: this.networkThrottler.getStats()
        };
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Forces resource cleanup                                     █
     * █ Calls garbage collection and other cleanup methods          █
     * ███████████████████████████████████████████████████████████████
     */
    forceCleanup() {
        console.log('Forcing resource cleanup');
        
        // Force memory garbage collection
        this.memoryLimiter.forceGarbageCollection(true);
        
        // Reset network stats
        this.networkThrottler.resetStats();
        
        return true;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Disposes of all limiters                                    █
     * █ Cleans up resources and stops monitoring                    █
     * ███████████████████████████████████████████████████████████████
     */
    dispose() {
        console.log('Disposing resource limiter manager');
        
        // Stop status updates
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
        
        // Dispose individual limiters
        this.cpuLimiter.dispose();
        this.memoryLimiter.dispose();
        this.networkThrottler.dispose();
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Gets all custom profiles                                    █
     * █ Returns user-created resource limiting profiles             █
     * ███████████████████████████████████████████████████████████████
     */
    getCustomProfiles() {
        this._loadCustomProfiles();
        return this.customProfiles;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Saves a custom profile                                      █
     * █ Adds or updates a user-defined resource profile             █
     * ███████████████████████████████████████████████████████████████
     */
    saveCustomProfile(profileId, profileData) {
        // Load existing profiles first
        this._loadCustomProfiles();
        
        // Add or update the profile
        this.customProfiles[profileId] = {
            ...profileData,
            lastModified: new Date().toISOString()
        };
        
        // Save to disk
        this._saveCustomProfiles();
        
        // Add to available profiles if not already there
        if (!this.settings.profiles.available.includes(profileId)) {
            this.settings.profiles.available.push(profileId);
            this._saveConfiguration();
        }
        
        return this.customProfiles[profileId];
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Deletes a custom profile                                    █
     * █ Removes a user-defined resource profile                     █
     * ███████████████████████████████████████████████████████████████
     */
    deleteCustomProfile(profileId) {
        // Load existing profiles first
        this._loadCustomProfiles();
        
        // Check if profile exists
        if (!this.customProfiles[profileId]) {
            return false;
        }
        
        // Delete the profile
        delete this.customProfiles[profileId];
        
        // Save to disk
        this._saveCustomProfiles();
        
        // Remove from available profiles
        const index = this.settings.profiles.available.indexOf(profileId);
        if (index !== -1) {
            this.settings.profiles.available.splice(index, 1);
            this._saveConfiguration();
        }
        
        // If current profile was deleted, switch to balanced
        if (this.settings.profiles.current === profileId) {
            this.setProfile('balanced');
        }
        
        return true;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Gets advanced limiter settings                              █
     * █ Returns configuration for monitoring and diagnostics        █
     * ███████████████████████████████████████████████████████████████
     */
    getAdvancedSettings() {
        return this.settings.advanced;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Updates advanced limiter settings                           █
     * █ Applies new monitoring and diagnostic configuration         █
     * ███████████████████████████████████████████████████████████████
     */
    updateAdvancedSettings(advancedSettings) {
        // Update advanced settings
        this.settings.advanced = {
            ...this.settings.advanced,
            ...advancedSettings
        };
        
        // Apply monitoring interval changes
        if (advancedSettings.monitoringInterval && this.statusInterval) {
            clearInterval(this.statusInterval);
            this._startStatusUpdates();
        }
        
        // Save configuration
        this._saveConfiguration();
        
        return this.settings.advanced;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Runs diagnostics on all limiters                            █
     * █ Tests CPU, memory, and network limiting functionality       █
     * ███████████████████████████████████████████████████████████████
     */
    runDiagnostics() {
        console.log('Running limiter diagnostics');
        
        const results = {
            timestamp: new Date().toISOString(),
            system: {
                platform: process.platform,
                arch: process.arch,
                cpuCount: require('os').cpus().length,
                totalMemory: Math.round(require('os').totalmem() / (1024 * 1024)),
                freeMemory: Math.round(require('os').freemem() / (1024 * 1024))
            },
            tests: {}
        };
        
        // CPU Limiter test
        try {
            const cpuEnabled = this.cpuLimiter.isEnabled();
            const cpuStats = this.cpuLimiter.getStats();
            results.tests.cpu = {
                status: 'success',
                enabled: cpuEnabled,
                maxLimit: this.settings.cpu.maxCpuPercent,
                currentUsage: cpuStats.usage,
                priority: this.settings.cpu.priority
            };
        } catch (error) {
            results.tests.cpu = {
                status: 'error',
                message: error.message
            };
        }
        
        // Memory Limiter test
        try {
            const memEnabled = this.memoryLimiter.isEnabled();
            const memStats = this.memoryLimiter.getStats();
            results.tests.memory = {
                status: 'success',
                enabled: memEnabled,
                maxLimit: this.settings.memory.maxMemoryMB,
                currentUsage: memStats.usedMB,
                gcEnabled: this.settings.memory.aggressiveGC
            };
        } catch (error) {
            results.tests.memory = {
                status: 'error',
                message: error.message
            };
        }
        
        // Network Throttler test
        try {
            const netEnabled = this.networkThrottler.isEnabled();
            const netStats = this.networkThrottler.getStats();
            results.tests.network = {
                status: 'success',
                enabled: netEnabled,
                downloadLimit: this.settings.network.downloadKbps,
                uploadLimit: this.settings.network.uploadKbps,
                currentDownload: netStats.downloadKbps,
                currentUpload: netStats.uploadKbps,
                proxyStatus: netStats.proxyRunning ? 'running' : 'stopped'
            };
        } catch (error) {
            results.tests.network = {
                status: 'error',
                message: error.message
            };
        }
        
        console.log('Diagnostics complete:', results);
        return results;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Resets all limiter settings to defaults                     █
     * █ Restores factory configuration                              █
     * ███████████████████████████████████████████████████████████████
     */
    resetSettings() {
        console.log('Resetting all limiter settings to defaults');
        
        // Backup current enabled state
        const wasEnabled = this.settings.enabled;
        
        // Reset to default settings (keeping custom profiles in available list)
        const customProfileIds = Object.keys(this.customProfiles);
        
        // Create new settings object with defaults
        this.settings = {
            enabled: false,
            profiles: {
                current: 'balanced',
                available: ['performance', 'balanced', 'efficiency', 'gaming', 'streaming', 'custom', ...customProfileIds]
            },
            cpu: {
                enabled: false,
                maxCpuPercent: 70,
                priority: 'normal'
            },
            memory: {
                enabled: false,
                maxMemoryMB: 1024,
                perTabLimitMB: 200,
                aggressiveGC: false
            },
            network: {
                enabled: false,
                downloadKbps: 0,
                uploadKbps: 0,
                latencyMs: 0,
                packetLossRate: 0,
                profile: 'unlimited'
            },
            advanced: {
                startupMode: 'auto',
                startWithProfile: 'balanced',
                monitoringInterval: 2000,
                notificationsEnabled: true,
                showResourceWarnings: true,
                debugMode: false,
                autoCleanupThreshold: 90,
                enableDiagnostics: false,
                exclusions: []
            }
        };
        
        // Save configuration
        this._saveConfiguration();
        
        // Apply settings
        this.applySettings();
        
        // Notify renderer
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('limiter-settings-reset');
        }
        
        return this.settings;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Toggles settings panel visibility                           █
     * █ Shows or hides the limiter settings UI                      █
     * ███████████████████████████████████████████████████████████████
     */
    toggleSettingsPanel() {
        this.panelVisible = !this.panelVisible;
        
        // Notify renderer
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('limiter-settings-panel-visibility', {
                visible: this.panelVisible
            });
        }
        
        return this.panelVisible;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Loads custom profiles from disk                    █
     * █ Restores user-created resource profiles                     █
     * ███████████████████████████████████████████████████████████████
     */
    _loadCustomProfiles() {
        try {
            if (fs.existsSync(this.profilesPath)) {
                const data = fs.readFileSync(this.profilesPath, 'utf8');
                this.customProfiles = JSON.parse(data);
                console.log('Loaded custom profiles configuration');
            } else {
                console.log('No custom profiles found, using empty object');
                this.customProfiles = {};
                this._saveCustomProfiles();
            }
        } catch (error) {
            console.error('Error loading custom profiles:', error);
            this.customProfiles = {};
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Saves custom profiles to disk                      █
     * █ Persists user-created resource profiles                     █
     * ███████████████████████████████████████████████████████████████
     */
    _saveCustomProfiles() {
        try {
            fs.writeFileSync(this.profilesPath, JSON.stringify(this.customProfiles, null, 2));
            console.log('Saved custom profiles configuration');
        } catch (error) {
            console.error('Error saving custom profiles:', error);
        }
    }

    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Registers IPC handlers                             █
     * █ Handles communication with renderer process                 █
     * ███████████████████████████████████████████████████████████████
     */
    _registerIpcHandlers() {
        // Get current limiter settings
        ipcMain.handle('get-limiter-settings', () => {
            return this.settings;
        });
        
        // Update limiter settings
        ipcMain.on('update-limiter-settings', (event, settings) => {
            this.updateSettings(settings);
            
            // Send update confirmation
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('limiter-settings-updated', this.settings);
            }
        });
        
        // Apply limiter profile
        ipcMain.on('apply-limiter-profile', (event, profileId) => {
            this.setProfile(profileId);
            
            // Send confirmation
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('limiter-profile-applied', {
                    profile: profileId,
                    settings: this.settings
                });
            }
        });
        
        // Get current resource stats
        ipcMain.handle('get-resource-stats', () => {
            return this.getStats();
        });
        
        // Get custom profiles
        ipcMain.handle('get-custom-profiles', () => {
            return this.getCustomProfiles();
        });
        
        // Save custom profiles
        ipcMain.on('save-custom-profiles', (event, profiles) => {
            // Save each profile
            Object.keys(profiles).forEach(profileId => {
                this.saveCustomProfile(profileId, profiles[profileId]);
            });
            
            // Send confirmation
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('custom-profiles-saved', this.customProfiles);
            }
        });
        
        // Get advanced limiter settings
        ipcMain.handle('get-advanced-limiter-settings', () => {
            return this.getAdvancedSettings();
        });
        
        // Update advanced limiter settings
        ipcMain.on('update-advanced-limiter-settings', (event, settings) => {
            this.updateAdvancedSettings(settings);
            
            // Send confirmation
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('advanced-limiter-settings-updated', 
                    this.settings.advanced);
            }
        });
        
        // Force garbage collection
        ipcMain.on('force-garbage-collection', () => {
            this.memoryLimiter.forceGarbageCollection(true);
            
            // Send confirmation
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('garbage-collection-complete');
            }
        });
        
        // Run limiter diagnostics
        ipcMain.handle('run-limiter-diagnostics', () => {
            return this.runDiagnostics();
        });
        
        // Reset limiter settings
        ipcMain.on('reset-limiter-settings', () => {
            this.resetSettings();
        });
        
        // Toggle limiter settings panel
        ipcMain.on('toggle-limiter-settings-panel', () => {
            this.toggleSettingsPanel();
        });
        
        // Legacy handlers for backward compatibility
        
        // Set limiter profile (legacy)
        ipcMain.handle('set-limiter-profile', (event, { profile }) => {
            return this.setProfile(profile);
        });
        
        // Force resource cleanup (legacy)
        ipcMain.handle('force-resource-cleanup', () => {
            return this.forceCleanup();
        });
        
        // Master enable/disable (legacy)
        ipcMain.handle('set-limiters-enabled', (event, { enabled }) => {
            this.settings.enabled = enabled;
            this.applySettings();
            return this.settings.enabled;
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Starts regular status updates                      █
     * █ Sends resource stats to renderer periodically               █
     * ███████████████████████████████████████████████████████████████
     */
    _startStatusUpdates() {
        // Clear existing interval if any
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }
        
        // Send updates every 2 seconds
        this.statusInterval = setInterval(() => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                const stats = this.getStats();
                this.mainWindow.webContents.send('resource-stats-update', stats);
            }
        }, 2000);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Loads configuration from disk                      █
     * █ Restores saved limiter settings                             █
     * ███████████████████████████████████████████████████████████████
     */
    _loadConfiguration() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                const savedConfig = JSON.parse(data);
                
                // Merge saved config with default settings
                this.settings = {
                    ...this.settings,
                    ...savedConfig
                };
                
                console.log('Loaded limiter configuration');
            } else {
                console.log('No limiter configuration found, using defaults');
                this._saveConfiguration();
            }
        } catch (error) {
            console.error('Error loading limiter configuration:', error);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Saves configuration to disk                        █
     * █ Persists current limiter settings                           █
     * ███████████████████████████████████████████████████████████████
     */
    _saveConfiguration() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2));
            console.log('Saved limiter configuration');
        } catch (error) {
            console.error('Error saving limiter configuration:', error);
        }
    }
}

module.exports = LimiterManager;
