/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * Internet Server - Memory Limiter Module
 * 
 * ╔══════════════════════════════════════════════════════════════╗
 * ║ Advanced memory management and limiting system               ║
 * ║ Monitors and controls browser memory consumption             ║
 * ║ Performs garbage collection when limits are exceeded         ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * FEATURES:
 * - [+] Real-time memory monitoring
 * - [+] Automatic garbage collection
 * - [+] Tab-based memory limiting
 * - [+] Memory leak detection
 * - [+] Cross-platform implementation
 * 
 * Copyright (c) 2025 ZARI CORP
 */

const { ipcMain, app, webContents } = require('electron');
const os = require('os');

class MemoryLimiter {
    constructor() {
        // Default settings
        this.settings = {
            enabled: false,
            maxMemoryMB: 1024, // Default 1GB memory limit
            warningThresholdPercent: 80, // Warn at 80% of limit
            checkIntervalMs: 5000, // Check every 5 seconds
            aggressiveGC: false, // Aggressive garbage collection
            perTabLimitMB: 200, // Per-tab memory limit (200MB)
            leakDetectionEnabled: true, // Enable memory leak detection
            leakThresholdPercent: 10 // 10% growth in 1 minute = potential leak
        };
        
        // State tracking
        this.isLimiting = false;
        this.currentMemoryUsage = {
            total: 0,     // Total process memory (MB)
            main: 0,      // Main process memory (MB)
            renderer: 0,  // Renderer processes memory (MB)
            system: {     // System memory
                total: 0, // Total system memory (MB)
                free: 0,  // Free system memory (MB)
                usage: 0  // System memory usage (percent)
            }
        };
        
        // Memory history for leak detection
        this.memoryHistory = [];
        
        // Interval reference
        this.monitorInterval = null;
        
        // Platform detection
        this.platform = os.platform();
        
        // Tab memory tracking
        this.tabMemory = new Map(); // webContentsId -> memory usage
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Initializes the memory limiter                              █
     * █ Sets up monitoring intervals and IPC handlers               █
     * ███████████████████████████████████████████████████████████████
     */
    init(mainWindow) {
        this.mainWindow = mainWindow;
        
        // Register IPC handlers
        this._registerIpcHandlers();
        
        // Start memory monitoring
        this._startMonitoring();
        
        // Setup event listeners for tabs
        this._setupTabListeners();
        
        console.log('Memory limiter initialized');
        console.log(`System memory: ${Math.round(os.totalmem() / (1024 * 1024))} MB`);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Enables or disables memory limiting                         █
     * █ Starts or stops memory monitoring and limiting              █
     * ███████████████████████████████████████████████████████████████
     */
    setEnabled(enabled) {
        this.settings.enabled = enabled;
        
        if (enabled && !this.monitorInterval) {
            this._startMonitoring();
        } else if (!enabled && this.monitorInterval) {
            this._stopMonitoring();
        }
        
        console.log(`Memory limiter ${enabled ? 'enabled' : 'disabled'}`);
        return this.settings.enabled;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Updates memory limiter settings                             █
     * █ Applies new memory limits and monitoring intervals          █
     * ███████████████████████████████████████████████████████████████
     */
    updateSettings(newSettings) {
        const oldSettings = { ...this.settings };
        
        // Update settings
        Object.assign(this.settings, newSettings);
        
        // Validate memory limit (minimum 256MB)
        this.settings.maxMemoryMB = Math.max(256, this.settings.maxMemoryMB);
        
        // Validate per-tab limit (minimum 50MB)
        this.settings.perTabLimitMB = Math.max(50, this.settings.perTabLimitMB);
        
        // If interval changed, restart monitoring
        if (this.settings.enabled && 
            oldSettings.checkIntervalMs !== this.settings.checkIntervalMs) {
            this._stopMonitoring();
            this._startMonitoring();
        }
        
        console.log('Memory limiter settings updated:', this.settings);
        return this.settings;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Forces garbage collection                                   █
     * █ Requests all renderer processes to perform GC               █
     * ███████████████████████████████████████████████████████████████
     */
    forceGarbageCollection(aggressive = false) {
        console.log(`Forcing ${aggressive ? 'aggressive' : 'normal'} garbage collection`);
        
        // Force GC in main process
        if (global.gc) {
            global.gc();
        }
        
        // Force GC in all renderer processes
        webContents.getAllWebContents().forEach(contents => {
            contents.send('force-garbage-collection', { aggressive });
        });
        
        // Run additional memory cleanup in main process
        this._cleanupMainProcessMemory();
        
        return true;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Gets current memory statistics                              █
     * █ Returns detailed memory usage information                   █
     * ███████████████████████████████████████████████████████████████
     */
    getStats() {
        return {
            ...this.currentMemoryUsage,
            limit: this.settings.maxMemoryMB,
            isLimiting: this.isLimiting,
            enabled: this.settings.enabled,
            percentUsed: Math.round((this.currentMemoryUsage.total / this.settings.maxMemoryMB) * 100),
            tabCount: this.tabMemory.size,
            memoryLeakDetected: this._detectMemoryLeak(),
            tabMemory: Array.from(this.tabMemory.entries()).map(([id, mem]) => ({ 
                id, 
                memory: mem,
                percentOfLimit: Math.round((mem / this.settings.perTabLimitMB) * 100)
            }))
        };
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Disposes of the memory limiter                              █
     * █ Cleans up intervals and resources                           █
     * ███████████████████████████████████████████████████████████████
     */
    dispose() {
        this._stopMonitoring();
        this.tabMemory.clear();
        this.memoryHistory = [];
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Registers IPC handlers                             █
     * █ Handles communication with renderer process                 █
     * ███████████████████████████████████████████████████████████████
     */
    _registerIpcHandlers() {
        // Enable/disable memory limiting
        ipcMain.handle('set-memory-limiting', (event, { enabled }) => {
            return this.setEnabled(enabled);
        });
        
        // Update settings
        ipcMain.handle('update-memory-settings', (event, settings) => {
            return this.updateSettings(settings);
        });
        
        // Get current stats
        ipcMain.handle('get-memory-stats', () => {
            return this.getStats();
        });
        
        // Force garbage collection
        ipcMain.handle('force-garbage-collection', (event, { aggressive }) => {
            return this.forceGarbageCollection(aggressive);
        });
        
        // Get memory usage for a specific tab
        ipcMain.handle('get-tab-memory-usage', (event) => {
            const webContentsId = event.sender.id;
            return this.tabMemory.get(webContentsId) || 0;
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Starts memory monitoring                           █
     * █ Sets up interval to check memory usage regularly            █
     * ███████████████████████████████████████████████████████████████
     */
    _startMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }
        
        this.monitorInterval = setInterval(() => {
            this._checkMemoryUsage();
        }, this.settings.checkIntervalMs);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Stops memory monitoring                            █
     * █ Clears monitoring interval                                  █
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
     * █ Private: Sets up tab monitoring                             █
     * █ Tracks when tabs are created and destroyed                  █
     * ███████████████████████████████████████████████████████████████
     */
    _setupTabListeners() {
        // Listen for new webContents (tabs)
        app.on('web-contents-created', (event, contents) => {
            // Only track browser windows and webviews
            if (contents.getType() === 'window' || contents.getType() === 'webview') {
                // Initialize memory tracking for this tab
                this.tabMemory.set(contents.id, 0);
                
                // Listen for tab being destroyed
                contents.on('destroyed', () => {
                    this.tabMemory.delete(contents.id);
                });
                
                // Listen for crashed tabs
                contents.on('crashed', () => {
                    console.log(`Tab ${contents.id} crashed, possibly due to memory issues`);
                    this.tabMemory.delete(contents.id);
                });
                
                // Track memory usage
                contents.on('console-message', (event, level, message) => {
                    // Look for memory reporting messages from renderer
                    if (message.startsWith('MEMORY_USAGE:')) {
                        try {
                            const memoryMB = parseFloat(message.split(':')[1]);
                            this.tabMemory.set(contents.id, memoryMB);
                        } catch (err) {
                            console.error('Error parsing tab memory usage:', err);
                        }
                    }
                });
            }
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Checks memory usage                                █
     * █ Gathers memory stats and applies limits if needed           █
     * ███████████████████████████████████████████████████████████████
     */
    _checkMemoryUsage() {
        // Get memory usage for main process
        const mainProcessMem = process.memoryUsage();
        const mainProcessRssMB = Math.round(mainProcessMem.rss / (1024 * 1024));
        const mainProcessHeapMB = Math.round(mainProcessMem.heapUsed / (1024 * 1024));
        
        // Get system memory info
        const systemMemory = {
            total: Math.round(os.totalmem() / (1024 * 1024)),
            free: Math.round(os.freemem() / (1024 * 1024))
        };
        systemMemory.usage = Math.round(((systemMemory.total - systemMemory.free) / systemMemory.total) * 100);
        
        // Request memory usage from renderer processes
        this._getRendererMemoryUsage().then(rendererMemoryMB => {
            // Calculate total memory usage
            const totalMemoryMB = mainProcessRssMB + rendererMemoryMB;
            
            // Update current memory usage
            this.currentMemoryUsage = {
                total: totalMemoryMB,
                main: mainProcessRssMB,
                renderer: rendererMemoryMB,
                system: systemMemory
            };
            
            // Add to history (keep last 12 entries for 1 minute with 5s intervals)
            this.memoryHistory.push({
                timestamp: Date.now(),
                total: totalMemoryMB
            });
            
            if (this.memoryHistory.length > 12) {
                this.memoryHistory.shift();
            }
            
            // Check if we need to limit memory
            this._limitMemoryIfNeeded(totalMemoryMB);
            
            // Check for memory leaks
            if (this.settings.leakDetectionEnabled) {
                const leakDetected = this._detectMemoryLeak();
                if (leakDetected) {
                    console.warn('Potential memory leak detected');
                    
                    // Notify renderer about memory leak
                    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                        this.mainWindow.webContents.send('memory-leak-detected', {
                            growth: leakDetected.growthPercent,
                            duration: 'last minute'
                        });
                    }
                }
            }
            
            // Send memory update to renderer
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('memory-usage-update', {
                    ...this.currentMemoryUsage,
                    percentUsed: Math.round((totalMemoryMB / this.settings.maxMemoryMB) * 100),
                    isLimiting: this.isLimiting
                });
            }
        }).catch(err => {
            console.error('Error getting memory usage:', err);
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Gets renderer process memory usage                 █
     * █ Collects memory usage from all tabs via IPC                 █
     * ███████████████████████████████████████████████████████████████
     */
    async _getRendererMemoryUsage() {
        // We'll inject code into each renderer to report its memory usage
        const contents = webContents.getAllWebContents();
        let totalMemoryMB = 0;
        
        // Request memory info from each renderer via executeJavaScript
        const memoryPromises = contents.map(webContent => {
            // Skip devtools windows
            if (webContent.getType() === 'webview' && webContent.getURL().startsWith('devtools://')) {
                return Promise.resolve(0);
            }
            
            return new Promise((resolve) => {
                // Set a timeout to avoid hanging
                const timeout = setTimeout(() => resolve(0), 1000);
                
                try {
                    webContent.executeJavaScript(`
                        (function() {
                            const memory = performance.memory;
                            if (memory) {
                                const memoryMB = Math.round(memory.usedJSHeapSize / (1024 * 1024));
                                console.log('MEMORY_USAGE:' + memoryMB);
                                return memoryMB;
                            }
                            return 0;
                        })()
                    `).then(memoryMB => {
                        clearTimeout(timeout);
                        // Store memory usage for this tab
                        this.tabMemory.set(webContent.id, memoryMB);
                        resolve(memoryMB);
                    }).catch(() => {
                        clearTimeout(timeout);
                        resolve(0);
                    });
                } catch (err) {
                    clearTimeout(timeout);
                    resolve(0);
                }
            });
        });
        
        // Wait for all memory info to be collected
        const memoryUsages = await Promise.all(memoryPromises);
        
        // Sum up the total
        totalMemoryMB = memoryUsages.reduce((sum, mem) => sum + mem, 0);
        
        return totalMemoryMB;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Limits memory if needed                            █
     * █ Performs actions to reduce memory usage when above limit    █
     * ███████████████████████████████████████████████████████████████
     */
    _limitMemoryIfNeeded(totalMemoryMB) {
        if (!this.settings.enabled) {
            this.isLimiting = false;
            return;
        }
        
        const memoryPercent = (totalMemoryMB / this.settings.maxMemoryMB) * 100;
        
        // Check if we need to take action
        if (memoryPercent >= 100) {
            // We're over the limit, take drastic action
            console.warn(`Memory usage (${totalMemoryMB}MB) exceeds limit (${this.settings.maxMemoryMB}MB)`);
            this.isLimiting = true;
            
            // Force garbage collection (aggressive)
            this.forceGarbageCollection(true);
            
            // Find and limit high-memory tabs
            this._limitHighMemoryTabs();
        } else if (memoryPercent >= this.settings.warningThresholdPercent) {
            // We're approaching the limit, take preventative action
            console.log(`Memory usage (${totalMemoryMB}MB) approaching limit (${this.settings.maxMemoryMB}MB)`);
            this.isLimiting = true;
            
            // Force normal garbage collection
            this.forceGarbageCollection(false);
        } else {
            this.isLimiting = false;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Limits high memory tabs                            █
     * █ Identifies and acts on tabs using excessive memory          █
     * ███████████████████████████████████████████████████████████████
     */
    _limitHighMemoryTabs() {
        // Find tabs using more than their allocation
        const highMemoryTabs = [];
        
        for (const [id, memoryMB] of this.tabMemory.entries()) {
            if (memoryMB > this.settings.perTabLimitMB) {
                highMemoryTabs.push({ id, memoryMB });
            }
        }
        
        // Sort by memory usage (highest first)
        highMemoryTabs.sort((a, b) => b.memoryMB - a.memoryMB);
        
        // Take action on high memory tabs
        for (const { id, memoryMB } of highMemoryTabs) {
            console.log(`Tab ${id} using ${memoryMB}MB (limit: ${this.settings.perTabLimitMB}MB)`);
            
            // Find the WebContents for this tab
            const contents = webContents.fromId(id);
            if (contents && !contents.isDestroyed()) {
                // Force tab to reduce memory
                contents.send('reduce-memory-usage', {
                    currentUsage: memoryMB,
                    limit: this.settings.perTabLimitMB
                });
                
                // Optionally reload the tab if it's using excessive memory
                // (more than 2x the limit)
                if (memoryMB > this.settings.perTabLimitMB * 2) {
                    console.warn(`Tab ${id} using excessive memory (${memoryMB}MB), reloading`);
                    
                    try {
                        // Soft reload (from cache)
                        contents.reload();
                    } catch (err) {
                        console.error(`Error reloading tab ${id}:`, err);
                    }
                }
            }
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Detects memory leaks                               █
     * █ Analyzes memory growth patterns over time                   █
     * ███████████████████████████████████████████████████████████████
     */
    _detectMemoryLeak() {
        if (this.memoryHistory.length < 2) {
            return false;
        }
        
        // Get oldest and newest memory readings
        const oldest = this.memoryHistory[0];
        const newest = this.memoryHistory[this.memoryHistory.length - 1];
        
        // Calculate time elapsed
        const timeElapsedMs = newest.timestamp - oldest.timestamp;
        
        // Only analyze if we have at least 30 seconds of data
        if (timeElapsedMs < 30000) {
            return false;
        }
        
        // Calculate growth
        const growthMB = newest.total - oldest.total;
        
        // Only consider positive growth
        if (growthMB <= 0) {
            return false;
        }
        
        // Calculate growth percent
        const growthPercent = Math.round((growthMB / oldest.total) * 100);
        
        // Check if growth exceeds threshold
        if (growthPercent >= this.settings.leakThresholdPercent) {
            return {
                growthMB,
                growthPercent,
                timeElapsedMs
            };
        }
        
        return false;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Cleans up main process memory                      █
     * █ Performs additional memory cleanup tasks                    █
     * ███████████████████████████████████████████████████████████████
     */
    _cleanupMainProcessMemory() {
        // Clear module caches that might be holding references
        Object.keys(require.cache).forEach(cacheKey => {
            // Don't clear critical modules
            if (!cacheKey.includes('node_modules') && 
                !cacheKey.includes('electron') &&
                !cacheKey.includes('limiters')) {
                delete require.cache[cacheKey];
            }
        });
        
        // Suggest V8 to do GC soon
        if (global.gc) {
            setTimeout(() => {
                global.gc();
            }, 500);
        }
    }
}

module.exports = MemoryLimiter;
