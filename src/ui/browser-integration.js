/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║ Browser UI Integration                                        ║
 * ║ Integrates Resource Limiter and other components with browser ║
 * ║ Provides UI controls for opening settings panels and monitors ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
 * ▓ FEATURES:                                                     ▓
 * ▓ [+] Resource limiter UI integration                           ▓
 * ▓ [+] Status bar resource monitor indicators                    ▓
 * ▓ [+] Menu items for limiter settings                           ▓
 * ▓ [+] Keyboard shortcuts for quick access                       ▓
 * ▓ [+] Windows XP style integration                              ▓
 * ▓ [+] Cross-platform compatibility                              ▓
 * ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
 * 
 * Copyright (c) 2025 ZARI CORP - All Rights Reserved
 */

const { ipcRenderer } = require('electron');

// Import UI components
const LimiterSettingsPanel = require('./components/limiter-settings-panel');

/**
 * ███████████████████████████████████████████████████████████████
 * █ Browser UI Integration                                      █
 * █ Integrates various components with the main browser UI      █
 * ███████████████████████████████████████████████████████████████
 */
class BrowserIntegration {
    constructor() {
        // UI Component instances
        this.limiterSettingsPanel = null;
        
        // Status bar elements
        this.statusBarContainer = null;
        this.cpuIndicator = null;
        this.memoryIndicator = null;
        this.networkIndicator = null;
        
        // Resource stats
        this.resourceStats = {
            cpu: { usage: 0, limit: 100 },
            memory: { usage: 0, limit: 100 },
            network: { download: 0, upload: 0 }
        };
        
        // Stats update interval
        this.statsUpdateInterval = null;
        
        // Initialize
        this.init();
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Initialize browser integration                              █
     * █ Sets up UI components and event listeners                   █
     * ███████████████████████████████████████████████████████████████
     */
    init() {
        // Create limiter settings panel
        this.limiterSettingsPanel = new LimiterSettingsPanel();
        
        // Create status bar if it doesn't exist
        this._createStatusBar();
        
        // Add menu items
        this._setupMenuItems();
        
        // Set up keyboard shortcuts
        this._setupKeyboardShortcuts();
        
        // Set up IPC listeners
        this._setupIpcListeners();
        
        // Start stats update interval
        this._startStatsUpdate();
        
        console.log('[Browser Integration] Initialized');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Toggle limiter settings panel                               █
     * █ Shows or hides the resource limiter settings panel          █
     * ███████████████████████████████████████████████████████████████
     */
    toggleLimiterSettingsPanel() {
        if (this.limiterSettingsPanel) {
            this.limiterSettingsPanel.toggle();
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Create status bar                                  █
     * █ Creates or gets the browser status bar and adds indicators  █
     * ███████████████████████████████████████████████████████████████
     */
    _createStatusBar() {
        // Try to find existing status bar
        this.statusBarContainer = document.getElementById('status-bar');
        
        // Create status bar if it doesn't exist
        if (!this.statusBarContainer) {
            this.statusBarContainer = document.createElement('div');
            this.statusBarContainer.id = 'status-bar';
            this.statusBarContainer.className = 'xp-status-bar';
            document.body.appendChild(this.statusBarContainer);
        }
        
        // Create resource indicators
        this._createResourceIndicators();
        
        console.log('[Browser Integration] Created status bar');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Create resource indicators                         █
     * █ Adds CPU, memory, and network indicators to the status bar  █
     * ███████████████████████████████████████████████████████████████
     */
    _createResourceIndicators() {
        // Create container for resource indicators
        const indicatorsContainer = document.createElement('div');
        indicatorsContainer.className = 'xp-resource-indicators';
        
        // CPU indicator
        this.cpuIndicator = document.createElement('div');
        this.cpuIndicator.className = 'xp-resource-indicator cpu';
        this.cpuIndicator.innerHTML = `
            <div class="xp-resource-icon cpu"></div>
            <div class="xp-resource-bar">
                <div class="xp-resource-bar-fill" style="width: 0%"></div>
            </div>
            <div class="xp-resource-value">0%</div>
        `;
        this.cpuIndicator.title = 'CPU Usage (Click to open Resource Limiter)';
        this.cpuIndicator.addEventListener('click', () => this.toggleLimiterSettingsPanel());
        indicatorsContainer.appendChild(this.cpuIndicator);
        
        // Memory indicator
        this.memoryIndicator = document.createElement('div');
        this.memoryIndicator.className = 'xp-resource-indicator memory';
        this.memoryIndicator.innerHTML = `
            <div class="xp-resource-icon memory"></div>
            <div class="xp-resource-bar">
                <div class="xp-resource-bar-fill" style="width: 0%"></div>
            </div>
            <div class="xp-resource-value">0 MB</div>
        `;
        this.memoryIndicator.title = 'Memory Usage (Click to open Resource Limiter)';
        this.memoryIndicator.addEventListener('click', () => this.toggleLimiterSettingsPanel());
        indicatorsContainer.appendChild(this.memoryIndicator);
        
        // Network indicator
        this.networkIndicator = document.createElement('div');
        this.networkIndicator.className = 'xp-resource-indicator network';
        this.networkIndicator.innerHTML = `
            <div class="xp-resource-icon network"></div>
            <div class="xp-resource-text">↓ 0 KB/s ↑ 0 KB/s</div>
        `;
        this.networkIndicator.title = 'Network Activity (Click to open Resource Limiter)';
        this.networkIndicator.addEventListener('click', () => this.toggleLimiterSettingsPanel());
        indicatorsContainer.appendChild(this.networkIndicator);
        
        // Add indicators to status bar
        this.statusBarContainer.appendChild(indicatorsContainer);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Setup menu items                                   █
     * █ Adds menu items for resource limiter settings               █
     * ███████████████████████████████████████████████████████████████
     */
    _setupMenuItems() {
        // Create custom event to request menu items
        const event = new CustomEvent('register-menu-items', {
            detail: {
                items: [
                    {
                        id: 'tools-menu',
                        label: 'Tools',
                        submenu: [
                            {
                                id: 'resource-limiter',
                                label: 'Resource Limiter Settings',
                                accelerator: 'CmdOrCtrl+Shift+R',
                                click: () => this.toggleLimiterSettingsPanel()
                            }
                        ]
                    }
                ]
            }
        });
        
        // Dispatch event
        document.dispatchEvent(event);
        
        console.log('[Browser Integration] Setup menu items');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Setup keyboard shortcuts                           █
     * █ Adds keyboard shortcuts for resource limiter                █
     * ███████████████████████████████████████████████████████████████
     */
    _setupKeyboardShortcuts() {
        // Add keyboard shortcut listener
        document.addEventListener('keydown', (event) => {
            // Ctrl+Shift+R - Open Resource Limiter Settings
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
                event.preventDefault();
                this.toggleLimiterSettingsPanel();
            }
        });
        
        console.log('[Browser Integration] Setup keyboard shortcuts');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Setup IPC listeners                                █
     * █ Sets up IPC communication with main process                 █
     * ███████████████████████████████████████████████████████████████
     */
    _setupIpcListeners() {
        // Listen for resource stats updates
        ipcRenderer.on('resource-stats-update', (event, stats) => {
            // Update resource stats
            this.resourceStats = stats;
            
            // Update indicators
            this._updateResourceIndicators();
        });
        
        // Listen for limiter settings panel toggle request
        ipcRenderer.on('toggle-limiter-settings', () => {
            this.toggleLimiterSettingsPanel();
        });
        
        console.log('[Browser Integration] Setup IPC listeners');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Start stats update                                 █
     * █ Starts interval to update resource stats                    █
     * ███████████████████████████████████████████████████████████████
     */
    _startStatsUpdate() {
        // Clear previous interval
        if (this.statsUpdateInterval) {
            clearInterval(this.statsUpdateInterval);
        }
        
        // Start new interval
        this.statsUpdateInterval = setInterval(() => {
            // Request resource stats from main process
            ipcRenderer.invoke('get-resource-stats')
                .then(stats => {
                    // Update resource stats
                    this.resourceStats = stats;
                    
                    // Update indicators
                    this._updateResourceIndicators();
                })
                .catch(error => {
                    console.error('[Browser Integration] Error getting resource stats:', error);
                });
        }, 1000); // Update every second
        
        console.log('[Browser Integration] Started stats update interval');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Update resource indicators                         █
     * █ Updates status bar indicators with current resource stats   █
     * ███████████████████████████████████████████████████████████████
     */
    _updateResourceIndicators() {
        // Update CPU indicator
        if (this.cpuIndicator) {
            const cpuUsage = this.resourceStats.cpu.usage;
            const cpuLimit = this.resourceStats.cpu.limit;
            const cpuPercent = Math.min(100, Math.round(cpuUsage));
            
            // Update bar fill
            const cpuBarFill = this.cpuIndicator.querySelector('.xp-resource-bar-fill');
            if (cpuBarFill) {
                cpuBarFill.style.width = `${cpuPercent}%`;
                
                // Change color based on usage
                cpuBarFill.className = 'xp-resource-bar-fill';
                if (cpuPercent > 90) {
                    cpuBarFill.classList.add('critical');
                } else if (cpuPercent > 70) {
                    cpuBarFill.classList.add('warning');
                }
                
                // Add limited indicator if CPU is limited
                if (cpuLimit < 100) {
                    cpuBarFill.classList.add('limited');
                }
            }
            
            // Update value text
            const cpuValue = this.cpuIndicator.querySelector('.xp-resource-value');
            if (cpuValue) {
                cpuValue.textContent = `${cpuPercent}%`;
                
                // Add limited indicator in text if CPU is limited
                if (cpuLimit < 100) {
                    cpuValue.textContent += ` (Limit: ${cpuLimit}%)`;
                }
            }
            
            // Update tooltip
            this.cpuIndicator.title = `CPU Usage: ${cpuPercent}%${cpuLimit < 100 ? ` (Limited to ${cpuLimit}%)` : ''}\nClick to open Resource Limiter`;
        }
        
        // Update Memory indicator
        if (this.memoryIndicator) {
            const memUsage = this.resourceStats.memory.usage;
            const memLimit = this.resourceStats.memory.limit;
            const memUsageMB = Math.round(memUsage);
            const memPercent = Math.min(100, Math.round(memUsage / memLimit * 100));
            
            // Update bar fill
            const memBarFill = this.memoryIndicator.querySelector('.xp-resource-bar-fill');
            if (memBarFill) {
                memBarFill.style.width = `${memPercent}%`;
                
                // Change color based on usage
                memBarFill.className = 'xp-resource-bar-fill';
                if (memPercent > 90) {
                    memBarFill.classList.add('critical');
                } else if (memPercent > 70) {
                    memBarFill.classList.add('warning');
                }
                
                // Add limited indicator if memory is limited
                if (memLimit < this.resourceStats.memory.total) {
                    memBarFill.classList.add('limited');
                }
            }
            
            // Update value text
            const memValue = this.memoryIndicator.querySelector('.xp-resource-value');
            if (memValue) {
                // Format memory value
                let displayValue = '';
                if (memUsageMB < 1024) {
                    displayValue = `${memUsageMB} MB`;
                } else {
                    displayValue = `${(memUsageMB / 1024).toFixed(1)} GB`;
                }
                
                memValue.textContent = displayValue;
            }
            
            // Update tooltip
            let memLimitDisplay = '';
            if (memLimit < this.resourceStats.memory.total) {
                if (memLimit < 1024) {
                    memLimitDisplay = `${memLimit} MB`;
                } else {
                    memLimitDisplay = `${(memLimit / 1024).toFixed(1)} GB`;
                }
            }
            
            this.memoryIndicator.title = `Memory Usage: ${memUsageMB} MB (${memPercent}%)${memLimitDisplay ? `\nLimited to ${memLimitDisplay}` : ''}\nClick to open Resource Limiter`;
        }
        
        // Update Network indicator
        if (this.networkIndicator) {
            const downloadSpeed = this.resourceStats.network.download;
            const uploadSpeed = this.resourceStats.network.upload;
            
            // Format network speeds
            const formattedDownload = this._formatNetworkSpeed(downloadSpeed);
            const formattedUpload = this._formatNetworkSpeed(uploadSpeed);
            
            // Update text
            const networkText = this.networkIndicator.querySelector('.xp-resource-text');
            if (networkText) {
                networkText.textContent = `↓ ${formattedDownload} ↑ ${formattedUpload}`;
            }
            
            // Update tooltip
            this.networkIndicator.title = `Network Activity:\nDownload: ${formattedDownload}\nUpload: ${formattedUpload}\nClick to open Resource Limiter`;
            
            // Show active indicator if there's significant network activity
            if (downloadSpeed > 10 * 1024 || uploadSpeed > 5 * 1024) {
                this.networkIndicator.classList.add('active');
            } else {
                this.networkIndicator.classList.remove('active');
            }
            
            // Show limited indicator if network is throttled
            if (this.resourceStats.network.isThrottled) {
                this.networkIndicator.classList.add('limited');
            } else {
                this.networkIndicator.classList.remove('limited');
            }
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Format network speed                               █
     * █ Formats network speed in bytes to readable format           █
     * ███████████████████████████████████████████████████████████████
     */
    _formatNetworkSpeed(bytesPerSecond) {
        if (bytesPerSecond < 1024) {
            return `${bytesPerSecond.toFixed(0)} B/s`;
        } else if (bytesPerSecond < 1024 * 1024) {
            return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
        } else {
            return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Dispose resources                                           █
     * █ Clean up event listeners and intervals                      █
     * ███████████████████████████████████████████████████████████████
     */
    dispose() {
        // Clear stats update interval
        if (this.statsUpdateInterval) {
            clearInterval(this.statsUpdateInterval);
            this.statsUpdateInterval = null;
        }
        
        // Dispose limiter settings panel
        if (this.limiterSettingsPanel) {
            this.limiterSettingsPanel.dispose();
            this.limiterSettingsPanel = null;
        }
        
        // Remove IPC listeners
        ipcRenderer.removeAllListeners('resource-stats-update');
        ipcRenderer.removeAllListeners('toggle-limiter-settings');
        
        console.log('[Browser Integration] Disposed');
    }
}

module.exports = BrowserIntegration;
