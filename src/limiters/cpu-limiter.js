/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * Internet Server - CPU Limiter Module
 * 
 * ╔══════════════════════════════════════════════════════════════╗
 * ║ Intelligent CPU usage limiting system                        ║
 * ║ Monitors and controls browser CPU consumption                ║
 * ║ Compatible with both Windows and Linux platforms             ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * FEATURES:
 * - [+] Real-time CPU monitoring
 * - [+] Process throttling when exceeding limits
 * - [+] Configurable CPU percentage cap
 * - [+] Gradual throttling mechanism
 * - [+] Cross-platform implementation
 * 
 * Copyright (c) 2025 ZARI CORP
 */

const os = require('os');
const { ipcMain } = require('electron');
const osUtils = require('os-utils');
const { execSync } = require('child_process');

class CpuLimiter {
    constructor() {
        // Settings
        this.settings = {
            enabled: false,
            maxCpuPercent: 70, // Default max CPU usage (70%)
            throttleCheckInterval: 1000, // Check interval in ms
            monitorInterval: 2000, // Monitor interval in ms
            processPriority: 'normal' // Process priority (high, normal, low)
        };
        
        // State
        this.isThrottling = false;
        this.currentCpuPercent = 0;
        this.systemCpuPercent = 0;
        this.cpuHistory = []; // Store last 10 readings
        
        // Intervals
        this.monitorInterval = null;
        this.throttleInterval = null;
        
        // CPU info
        this.numCpuCores = os.cpus().length;
        this.platform = os.platform();
        
        // Event callback for renderer
        this.onCpuUpdate = null;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Initializes the CPU limiter                                 █
     * █ Sets up monitoring intervals and IPC handlers               █
     * ███████████████████████████████████████████████████████████████
     */
    init(mainWindow) {
        this.mainWindow = mainWindow;
        
        // Register IPC handlers
        this._registerIpcHandlers();
        
        // Start CPU monitoring
        this._startMonitoring();
        
        console.log(`CPU limiter initialized with ${this.numCpuCores} CPU cores detected`);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Enables or disables CPU limiting                            █
     * █ Starts or stops throttling mechanism                        █
     * ███████████████████████████████████████████████████████████████
     */
    setEnabled(enabled) {
        this.settings.enabled = enabled;
        
        if (enabled) {
            this._startThrottling();
            this._setPriority(this.settings.processPriority);
        } else {
            this._stopThrottling();
            this._setPriority('normal');
        }
        
        console.log(`CPU limiter ${enabled ? 'enabled' : 'disabled'}`);
        return this.settings.enabled;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Updates CPU limiter settings                                █
     * █ Applies new CPU percentage limits and intervals             █
     * ███████████████████████████████████████████████████████████████
     */
    updateSettings(newSettings) {
        const oldSettings = { ...this.settings };
        
        // Update settings
        Object.assign(this.settings, newSettings);
        
        // Validate CPU percent
        this.settings.maxCpuPercent = Math.max(10, Math.min(100, this.settings.maxCpuPercent));
        
        // If intervals changed, restart monitoring
        if (oldSettings.monitorInterval !== this.settings.monitorInterval) {
            this._stopMonitoring();
            this._startMonitoring();
        }
        
        // If throttle interval changed, restart throttling
        if (this.settings.enabled && 
            oldSettings.throttleCheckInterval !== this.settings.throttleCheckInterval) {
            this._stopThrottling();
            this._startThrottling();
        }
        
        // Update process priority if changed
        if (oldSettings.processPriority !== this.settings.processPriority) {
            this._setPriority(this.settings.processPriority);
        }
        
        console.log('CPU limiter settings updated:', this.settings);
        return this.settings;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Gets current CPU statistics                                 █
     * █ Returns usage percentages and throttling status             █
     * ███████████████████████████████████████████████████████████████
     */
    getStats() {
        return {
            current: this.currentCpuPercent,
            system: this.systemCpuPercent,
            limit: this.settings.maxCpuPercent,
            isThrottling: this.isThrottling,
            enabled: this.settings.enabled,
            cpuCores: this.numCpuCores,
            history: this.cpuHistory
        };
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Disposes of the CPU limiter                                 █
     * █ Cleans up intervals and resources                           █
     * ███████████████████████████████████████████████████████████████
     */
    dispose() {
        this._stopMonitoring();
        this._stopThrottling();
        
        // Reset process priority
        this._setPriority('normal');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Registers IPC handlers                             █
     * █ Handles communication with renderer process                 █
     * ███████████████████████████████████████████████████████████████
     */
    _registerIpcHandlers() {
        // Enable/disable CPU limiting
        ipcMain.handle('set-cpu-limiting', (event, { enabled }) => {
            return this.setEnabled(enabled);
        });
        
        // Update settings
        ipcMain.handle('update-cpu-settings', (event, settings) => {
            return this.updateSettings(settings);
        });
        
        // Get current stats
        ipcMain.handle('get-cpu-stats', () => {
            return this.getStats();
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Starts CPU usage monitoring                        █
     * █ Periodically checks CPU usage and sends to renderer         █
     * ███████████████████████████████████████████████████████████████
     */
    _startMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }
        
        this.monitorInterval = setInterval(() => {
            this._updateCpuUsage();
        }, this.settings.monitorInterval);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Stops CPU monitoring                               █
     * █ Clears monitor interval                                     █
     * ███████████████████████████████████████████████████████████████
     */
    _stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Starts CPU throttling                              █
     * █ Sets up interval to check and throttle CPU when needed      █
     * ███████████████████████████████████████████████████████████████
     */
    _startThrottling() {
        if (this.throttleInterval) {
            clearInterval(this.throttleInterval);
        }
        
        this.throttleInterval = setInterval(() => {
            this._throttleCpuIfNeeded();
        }, this.settings.throttleCheckInterval);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Stops CPU throttling                               █
     * █ Clears throttle interval                                    █
     * ███████████████████████████████████████████████████████████████
     */
    _stopThrottling() {
        if (this.throttleInterval) {
            clearInterval(this.throttleInterval);
            this.throttleInterval = null;
        }
        
        this.isThrottling = false;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Updates CPU usage                                  █
     * █ Gets process and system CPU usage percentages               █
     * ███████████████████████████████████████████████████████████████
     */
    _updateCpuUsage() {
        // Get system CPU usage
        osUtils.cpuUsage((systemUsage) => {
            this.systemCpuPercent = Math.round(systemUsage * 100);
            
            // Get own process CPU usage (implementation varies by platform)
            this._getProcessCpuUsage().then(processUsage => {
                this.currentCpuPercent = processUsage;
                
                // Update history (keep last 10 entries)
                this.cpuHistory.push(processUsage);
                if (this.cpuHistory.length > 10) {
                    this.cpuHistory.shift();
                }
                
                // Send update to renderer if window exists
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.webContents.send('cpu-usage-update', {
                        process: processUsage,
                        system: this.systemCpuPercent,
                        isThrottling: this.isThrottling
                    });
                }
            }).catch(err => {
                console.error('Error getting process CPU usage:', err);
            });
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Gets process CPU usage                             █
     * █ Implementation varies by platform (Windows vs Linux)        █
     * ███████████████████████████████████████████████████████████████
     */
    async _getProcessCpuUsage() {
        const pid = process.pid;
        
        try {
            if (this.platform === 'win32') {
                // Windows implementation
                return this._getWindowsProcessCpu(pid);
            } else if (this.platform === 'linux') {
                // Linux implementation
                return this._getLinuxProcessCpu(pid);
            } else {
                // Fallback for other platforms
                return this._getFallbackProcessCpu();
            }
        } catch (err) {
            console.error('Error getting process CPU usage:', err);
            return 0;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Gets Windows process CPU usage                     █
     * █ Uses PowerShell to get process CPU                          █
     * ███████████████████████████████████████████████████████████████
     */
    _getWindowsProcessCpu(pid) {
        try {
            // Use PowerShell to get CPU usage for specific process
            const cmd = `powershell "Get-Process -Id ${pid} | Select-Object -ExpandProperty CPU"`;
            const output = execSync(cmd, { timeout: 1000 }).toString().trim();
            
            // Convert CPU time to percentage (approximately)
            const cpuTime = parseFloat(output);
            const cpuPercent = Math.min(100, (cpuTime / this.numCpuCores));
            
            return Math.round(cpuPercent);
        } catch (err) {
            // Fallback if powershell command fails
            return this._getFallbackProcessCpu();
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Gets Linux process CPU usage                       █
     * █ Uses top command to get process CPU                         █
     * ███████████████████████████████████████████████████████████████
     */
    _getLinuxProcessCpu(pid) {
        try {
            // Use top to get CPU usage for specific process
            const cmd = `top -b -n 1 -p ${pid} | grep ${pid}`;
            const output = execSync(cmd, { timeout: 1000 }).toString().trim();
            
            // Parse the CPU percentage from output
            const cpuMatch = output.match(/(\d+\.\d+)\s+/);
            if (cpuMatch && cpuMatch[1]) {
                return Math.round(parseFloat(cpuMatch[1]));
            }
            
            return 0;
        } catch (err) {
            // Fallback if top command fails
            return this._getFallbackProcessCpu();
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Fallback CPU usage calculation                     █
     * █ Uses Node.js process.cpuUsage() as fallback                 █
     * ███████████████████████████████████████████████████████████████
     */
    _getFallbackProcessCpu() {
        // Get CPU usage using Node.js process module
        const startUsage = process.cpuUsage();
        
        // Wait a short time to measure usage
        const now = Date.now();
        while (Date.now() - now < 100) {
            // Busy wait to ensure CPU measurement
        }
        
        const endUsage = process.cpuUsage(startUsage);
        
        // Calculate percentage based on user + system time
        const totalUsage = endUsage.user + endUsage.system;
        const cpuPercent = (totalUsage / 1000 / 100) * (100 / this.numCpuCores);
        
        return Math.min(100, Math.round(cpuPercent));
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Throttles CPU if usage exceeds limit               █
     * █ Uses sleep and process priority to reduce CPU usage         █
     * ███████████████████████████████████████████████████████████████
     */
    _throttleCpuIfNeeded() {
        if (!this.settings.enabled) {
            this.isThrottling = false;
            return;
        }
        
        // Check if current usage exceeds limit
        if (this.currentCpuPercent > this.settings.maxCpuPercent) {
            // Calculate how much we're over the limit
            const overagePercent = this.currentCpuPercent - this.settings.maxCpuPercent;
            
            // Set throttling flag
            this.isThrottling = true;
            
            // Throttle CPU based on overage amount
            this._applyCpuThrottle(overagePercent);
        } else {
            this.isThrottling = false;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Applies CPU throttling                             █
     * █ Uses sleep technique to reduce CPU usage                    █
     * ███████████████████████████████████████████████████████████████
     */
    _applyCpuThrottle(overagePercent) {
        // Calculate sleep time based on overage (more overage = more sleep)
        // This is a simple algorithm that can be tuned
        const baseMs = 5;
        const maxMs = 50;
        
        // Sleep time increases with overage percentage
        const sleepMs = Math.min(maxMs, baseMs + (overagePercent / 5));
        
        // Force the JavaScript thread to sleep
        // This reduces CPU usage by pausing execution
        const start = Date.now();
        while (Date.now() - start < sleepMs) {
            // Busy wait
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Sets process priority                              █
     * █ Changes the priority of the Electron process                █
     * █ Implementation varies by platform                           █
     * ███████████████████████████████████████████████████████████████
     */
    _setPriority(priority) {
        const pid = process.pid;
        
        // Map priority string to platform-specific values
        let priorityValue;
        
        try {
            if (this.platform === 'win32') {
                // Windows implementation (uses wmic)
                let winPriority;
                
                switch (priority) {
                    case 'high':
                        winPriority = 'high';
                        break;
                    case 'low':
                        winPriority = 'below normal';
                        break;
                    case 'normal':
                    default:
                        winPriority = 'normal';
                        break;
                }
                
                execSync(`wmic process where ProcessId=${pid} CALL setpriority "${winPriority}"`, { timeout: 1000 });
            } else if (this.platform === 'linux') {
                // Linux implementation (uses nice)
                let niceValue;
                
                switch (priority) {
                    case 'high':
                        niceValue = -10;
                        break;
                    case 'low':
                        niceValue = 10;
                        break;
                    case 'normal':
                    default:
                        niceValue = 0;
                        break;
                }
                
                execSync(`renice -n ${niceValue} -p ${pid}`, { timeout: 1000 });
            }
            
            console.log(`Process priority set to ${priority}`);
        } catch (err) {
            console.error('Error setting process priority:', err);
        }
    }
}

module.exports = CpuLimiter;
