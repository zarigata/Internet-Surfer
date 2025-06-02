/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * Internet Server - Resource Monitor Component
 * 
 * This class handles monitoring and displaying system resource usage:
 * - CPU usage tracking and limiting
 * - RAM consumption monitoring
 * - Network bandwidth tracking
 * - Visual meter displays and updates
 * 
 * Copyright (c) 2025 ZARI CORP
 */

class ResourceMonitor {
    constructor() {
        // Initialize resource usage values
        this.cpuUsage = 0;
        this.ramUsage = 0;
        this.networkUsage = 0;
        
        // Limits from config
        this.cpuLimit = 70; // Default 70%
        this.ramLimit = 1024; // Default 1024MB
        this.networkLimit = 0; // Default unlimited
        
        // DOM elements
        this.cpuMeterFill = null;
        this.ramMeterFill = null;
        this.networkMeterFill = null;
        this.cpuValue = null;
        this.ramValue = null;
        this.networkValue = null;
        
        // Resource usage history for graphs
        this.cpuHistory = new Array(60).fill(0);
        this.ramHistory = new Array(60).fill(0);
        this.networkHistory = new Array(60).fill(0);
        
        // Update interval in ms
        this.updateInterval = 2000;
        this.updateTimer = null;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Initializes the resource monitor                            █
     * █ Gets reference to DOM elements and sets up event listeners  █
     * █ Starts the update timer for real-time monitoring            █
     * ███████████████████████████████████████████████████████████████
     */
    init() {
        // Get DOM element references
        this.cpuMeterFill = document.getElementById('cpu-meter-fill');
        this.ramMeterFill = document.getElementById('ram-meter-fill');
        this.networkMeterFill = document.getElementById('network-meter-fill');
        this.cpuValue = document.getElementById('cpu-value');
        this.ramValue = document.getElementById('ram-value');
        this.networkValue = document.getElementById('network-value');
        
        // Set up event listeners for resource updates from main process
        window.electronAPI.onCpuUsageUpdate((usage) => {
            this.updateCpuUsage(usage);
        });
        
        window.electronAPI.onRamUsageUpdate((usage) => {
            this.updateRamUsage(usage);
        });
        
        // Load configuration
        this.loadConfig();
        
        // Initialize limiters in dialog
        this.initLimiterControls();
        
        // Start update timer for network usage (simulated in renderer for demo)
        this.updateTimer = setInterval(() => {
            this.simulateNetworkUsage();
        }, this.updateInterval);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Loads resource limiter configuration from main process       █
     * █ Updates UI elements with current limit values                █
     * ███████████████████████████████████████████████████████████████
     */
    async loadConfig() {
        try {
            const config = await window.electronAPI.getConfig();
            
            if (config && config.limiter) {
                this.cpuLimit = config.limiter.cpu || 70;
                this.ramLimit = config.limiter.ram || 1024;
                this.networkLimit = config.limiter.network || 0;
                
                // Update limiter controls if they exist
                this.updateLimiterControls();
            }
        } catch (error) {
            console.error('Failed to load resource monitor config:', error);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Initializes the resource limiter controls in settings dialog █
     * █ Sets up sliders and value displays                           █
     * █ Adds event listeners for real-time updates                   █
     * ███████████████████████████████████████████████████████████████
     */
    initLimiterControls() {
        const cpuLimitSlider = document.getElementById('cpu-limit');
        const ramLimitSlider = document.getElementById('ram-limit');
        const networkLimitSlider = document.getElementById('network-limit');
        
        const cpuLimitValue = document.getElementById('cpu-limit-value');
        const ramLimitValue = document.getElementById('ram-limit-value');
        const networkLimitValue = document.getElementById('network-limit-value');
        
        if (cpuLimitSlider && cpuLimitValue) {
            cpuLimitSlider.value = this.cpuLimit;
            cpuLimitValue.textContent = `${this.cpuLimit}%`;
            
            cpuLimitSlider.addEventListener('input', () => {
                const value = cpuLimitSlider.value;
                cpuLimitValue.textContent = `${value}%`;
            });
        }
        
        if (ramLimitSlider && ramLimitValue) {
            ramLimitSlider.value = this.ramLimit;
            ramLimitValue.textContent = `${this.ramLimit}MB`;
            
            ramLimitSlider.addEventListener('input', () => {
                const value = ramLimitSlider.value;
                ramLimitValue.textContent = `${value}MB`;
            });
        }
        
        if (networkLimitSlider && networkLimitValue) {
            networkLimitSlider.value = this.networkLimit;
            networkLimitValue.textContent = this.networkLimit > 0 ? `${this.networkLimit}kbps` : 'Unlimited';
            
            networkLimitSlider.addEventListener('input', () => {
                const value = networkLimitSlider.value;
                networkLimitValue.textContent = value > 0 ? `${value}kbps` : 'Unlimited';
            });
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Updates the limiter control UI with current config values    █
     * █ Called after loading config from main process                █
     * ███████████████████████████████████████████████████████████████
     */
    updateLimiterControls() {
        const cpuLimitSlider = document.getElementById('cpu-limit');
        const ramLimitSlider = document.getElementById('ram-limit');
        const networkLimitSlider = document.getElementById('network-limit');
        
        const cpuLimitValue = document.getElementById('cpu-limit-value');
        const ramLimitValue = document.getElementById('ram-limit-value');
        const networkLimitValue = document.getElementById('network-limit-value');
        
        if (cpuLimitSlider && cpuLimitValue) {
            cpuLimitSlider.value = this.cpuLimit;
            cpuLimitValue.textContent = `${this.cpuLimit}%`;
        }
        
        if (ramLimitSlider && ramLimitValue) {
            ramLimitSlider.value = this.ramLimit;
            ramLimitValue.textContent = `${this.ramLimit}MB`;
        }
        
        if (networkLimitSlider && networkLimitValue) {
            networkLimitSlider.value = this.networkLimit;
            networkLimitValue.textContent = this.networkLimit > 0 ? `${this.networkLimit}kbps` : 'Unlimited';
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Updates CPU usage display                                    █
     * █ Called when receiving update from main process               █
     * █ Updates meter and numerical value                            █
     * ███████████████████████████████████████████████████████████████
     */
    updateCpuUsage(usage) {
        this.cpuUsage = usage;
        
        // Update history array
        this.cpuHistory.shift();
        this.cpuHistory.push(usage);
        
        // Update meter display
        if (this.cpuMeterFill && this.cpuValue) {
            // Calculate percentage of limit
            const percentOfLimit = Math.min(100, (usage / this.cpuLimit) * 100);
            
            // Set meter fill
            this.cpuMeterFill.style.width = `${percentOfLimit}%`;
            
            // Set color based on usage
            if (usage > this.cpuLimit) {
                this.cpuMeterFill.style.backgroundColor = '#FF4444';
            } else if (usage > this.cpuLimit * 0.8) {
                this.cpuMeterFill.style.backgroundColor = '#FFAA00';
            } else {
                this.cpuMeterFill.style.backgroundColor = '#44AA44';
            }
            
            // Update text value
            this.cpuValue.textContent = `${Math.round(usage)}%`;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Updates RAM usage display                                    █
     * █ Called when receiving update from main process               █
     * █ Updates meter and numerical value                            █
     * ███████████████████████████████████████████████████████████████
     */
    updateRamUsage(usage) {
        this.ramUsage = usage;
        
        // Update history array
        this.ramHistory.shift();
        this.ramHistory.push(usage);
        
        // Update meter display
        if (this.ramMeterFill && this.ramValue) {
            // Calculate percentage of limit
            const percentOfLimit = Math.min(100, (usage / this.ramLimit) * 100);
            
            // Set meter fill
            this.ramMeterFill.style.width = `${percentOfLimit}%`;
            
            // Set color based on usage
            if (usage > this.ramLimit) {
                this.ramMeterFill.style.backgroundColor = '#FF4444';
            } else if (usage > this.ramLimit * 0.8) {
                this.ramMeterFill.style.backgroundColor = '#FFAA00';
            } else {
                this.ramMeterFill.style.backgroundColor = '#44AA44';
            }
            
            // Update text value
            this.ramValue.textContent = `${Math.round(usage)}MB`;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Simulates network usage for demonstration                    █
     * █ In a production app, this would receive data from main process █
     * █ Updates based on active browsing activity                    █
     * ███████████████████████████████████████████████████████████████
     */
    simulateNetworkUsage() {
        // Generate somewhat realistic network usage pattern
        // In a real implementation, this would come from the main process
        
        // Base usage - random low value
        let usage = Math.random() * 20;
        
        // Check if any webviews are loading content
        const activeTab = window.tabManager && window.tabManager.activeTabId;
        if (activeTab) {
            const tab = window.tabManager.tabs.get(activeTab);
            if (tab && tab.webview) {
                // Check if webview is loading (very simplified)
                const isLoading = tab.webview.isLoading && tab.webview.isLoading();
                if (isLoading) {
                    // Simulate higher network usage during page load
                    usage += Math.random() * 200 + 100;
                }
            }
        }
        
        // Apply network limit if configured
        if (this.networkLimit > 0 && usage > this.networkLimit) {
            usage = this.networkLimit;
        }
        
        this.networkUsage = usage;
        
        // Update history array
        this.networkHistory.shift();
        this.networkHistory.push(usage);
        
        // Update meter display
        if (this.networkMeterFill && this.networkValue) {
            // Calculate percentage (if limit is 0, use 1000 as reference)
            const referenceLimit = this.networkLimit > 0 ? this.networkLimit : 1000;
            const percentOfLimit = Math.min(100, (usage / referenceLimit) * 100);
            
            // Set meter fill
            this.networkMeterFill.style.width = `${percentOfLimit}%`;
            
            // Set color based on usage
            if (this.networkLimit > 0 && usage > this.networkLimit * 0.8) {
                this.networkMeterFill.style.backgroundColor = '#FFAA00';
            } else {
                this.networkMeterFill.style.backgroundColor = '#44AAFF';
            }
            
            // Update text value
            if (usage >= 1000) {
                this.networkValue.textContent = `${(usage/1000).toFixed(1)}MB/s`;
            } else {
                this.networkValue.textContent = `${Math.round(usage)}KB/s`;
            }
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Cleans up resources used by the monitor                      █
     * █ Clears timers and event listeners                            █
     * █ Called when component is being destroyed                     █
     * ███████████████████████████████████████████████████████████████
     */
    dispose() {
        // Clear update timer
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
}

// Make ResourceMonitor globally available
window.resourceMonitor = window.resourceMonitor || new ResourceMonitor();
