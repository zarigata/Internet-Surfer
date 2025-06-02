/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * Internet Server - Network Throttling Module
 * 
 * ╔══════════════════════════════════════════════════════════════╗
 * ║ Advanced bandwidth limiting and network throttling system    ║
 * ║ Allows users to limit download/upload speeds for all tabs    ║
 * ║ Implements a full HTTP/HTTPS proxy with stream throttling    ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * FEATURES:
 * - [+] Throttle download/upload independently
 * - [+] Per-tab bandwidth limits
 * - [+] Simulate different network conditions
 * - [+] Real-time bandwidth monitoring
 * - [+] Configurable throttling profiles
 * 
 * Copyright (c) 2025 ZARI CORP
 */

const http = require('http');
const https = require('https');
const net = require('net');
const url = require('url');
const { Throttle } = require('stream-throttle');
const { ipcMain } = require('electron');

class NetworkThrottler {
    constructor() {
        // Default settings
        this.settings = {
            enabled: false,
            downloadKbps: 0, // 0 = unlimited
            uploadKbps: 0,   // 0 = unlimited
            latencyMs: 0,    // Additional latency
            packetLossRate: 0, // 0-1 (percentage as decimal)
            proxyPort: 8888,  // Local proxy port
            excludedDomains: [] // Domains to exclude from throttling
        };
        
        // Proxy server reference
        this.proxyServer = null;
        
        // Active connection tracking
        this.activeConnections = new Set();
        
        // Bandwidth statistics
        this.stats = {
            totalBytesDownloaded: 0,
            totalBytesUploaded: 0,
            bytesDownloadedPerSecond: 0,
            bytesUploadedPerSecond: 0,
            activeConnections: 0
        };
        
        // Stats interval
        this.statsInterval = null;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Initializes the network throttler                           █
     * █ Sets up IPC handlers and starts proxy if enabled            █
     * ███████████████████████████████████████████████████████████████
     */
    init() {
        // Register IPC handlers
        this._registerIpcHandlers();
        
        // Start stats collection
        this._startStatsCollection();
        
        console.log('Network throttler initialized');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Starts the proxy server                                     █
     * █ Creates HTTP server that intercepts and throttles traffic   █
     * ███████████████████████████████████████████████████████████████
     */
    startProxy() {
        if (this.proxyServer) {
            // Already running
            return;
        }
        
        // Create HTTP proxy server
        this.proxyServer = http.createServer();
        
        // Handle HTTP CONNECT method (for HTTPS)
        this.proxyServer.on('connect', (req, clientSocket, head) => {
            this._handleHttpsRequest(req, clientSocket, head);
        });
        
        // Handle regular HTTP requests
        this.proxyServer.on('request', (req, res) => {
            this._handleHttpRequest(req, res);
        });
        
        // Handle errors
        this.proxyServer.on('error', (err) => {
            console.error('Proxy server error:', err);
            
            // Try to restart with a different port if address in use
            if (err.code === 'EADDRINUSE') {
                this.settings.proxyPort++;
                console.log(`Port in use, trying new port: ${this.settings.proxyPort}`);
                this.startProxy();
            }
        });
        
        // Start listening
        this.proxyServer.listen(this.settings.proxyPort, '127.0.0.1', () => {
            console.log(`Proxy server started on port ${this.settings.proxyPort}`);
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Stops the proxy server                                      █
     * █ Closes all active connections and shuts down server         █
     * ███████████████████████████████████████████████████████████████
     */
    stopProxy() {
        if (!this.proxyServer) {
            return;
        }
        
        // Close all active connections
        for (const socket of this.activeConnections) {
            socket.destroy();
        }
        
        this.activeConnections.clear();
        
        // Close server
        this.proxyServer.close(() => {
            console.log('Proxy server stopped');
            this.proxyServer = null;
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Enables or disables network throttling                      █
     * █ Starts or stops proxy server based on enabled state         █
     * ███████████████████████████████████████████████████████████████
     */
    setEnabled(enabled) {
        if (enabled === this.settings.enabled) {
            return; // No change
        }
        
        this.settings.enabled = enabled;
        
        if (enabled) {
            this.startProxy();
        } else {
            this.stopProxy();
        }
        
        return {
            enabled: this.settings.enabled,
            proxyPort: this.settings.proxyPort
        };
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Updates throttling settings                                 █
     * █ Applies new download/upload limits and network conditions   █
     * ███████████████████████████████████████████████████████████████
     */
    updateSettings(newSettings) {
        // Update settings
        Object.assign(this.settings, newSettings);
        
        // If proxy is running, restart it to apply new settings
        if (this.settings.enabled && this.proxyServer) {
            this.stopProxy();
            this.startProxy();
        }
        
        return this.settings;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Gets current network statistics                             █
     * █ Returns bandwidth usage and connection count                █
     * ███████████████████████████████████████████████████████████████
     */
    getStats() {
        return {
            ...this.stats,
            throttlingEnabled: this.settings.enabled,
            downloadLimit: this.settings.downloadKbps,
            uploadLimit: this.settings.uploadKbps,
            latency: this.settings.latencyMs
        };
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Sets a predefined network profile                           █
     * █ Contains presets for different connection types             █
     * ███████████████████████████████████████████████████████████████
     */
    setNetworkProfile(profileName) {
        // Predefined network profiles
        const profiles = {
            'unlimited': {
                downloadKbps: 0,
                uploadKbps: 0,
                latencyMs: 0,
                packetLossRate: 0
            },
            'fast-4g': {
                downloadKbps: 20000, // 20 Mbps
                uploadKbps: 10000,   // 10 Mbps
                latencyMs: 50,
                packetLossRate: 0.01
            },
            '3g': {
                downloadKbps: 1500,  // 1.5 Mbps
                uploadKbps: 750,     // 750 Kbps
                latencyMs: 100,
                packetLossRate: 0.03
            },
            '2g': {
                downloadKbps: 250,   // 250 Kbps
                uploadKbps: 100,     // 100 Kbps
                latencyMs: 300,
                packetLossRate: 0.05
            },
            'slow-2g': {
                downloadKbps: 50,    // 50 Kbps
                uploadKbps: 20,      // 20 Kbps
                latencyMs: 500,
                packetLossRate: 0.08
            },
            'dial-up': {
                downloadKbps: 30,    // 30 Kbps
                uploadKbps: 10,      // 10 Kbps
                latencyMs: 200,
                packetLossRate: 0.02
            },
            'satellite': {
                downloadKbps: 2000,  // 2 Mbps
                uploadKbps: 1000,    // 1 Mbps
                latencyMs: 600,      // High latency
                packetLossRate: 0.04
            }
        };
        
        // Get profile settings
        const profile = profiles[profileName];
        if (!profile) {
            throw new Error(`Unknown network profile: ${profileName}`);
        }
        
        // Apply profile settings
        return this.updateSettings(profile);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Gets proxy configuration for Electron                       █
     * █ Used to set browser proxy settings                          █
     * ███████████████████████████████████████████████████████████████
     */
    getProxyConfig() {
        if (!this.settings.enabled) {
            return { mode: 'direct' };
        }
        
        return {
            mode: 'fixed_servers',
            proxyRules: `http=127.0.0.1:${this.settings.proxyPort};https=127.0.0.1:${this.settings.proxyPort}`
        };
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Dispose of the network throttler                            █
     * █ Cleans up resources and stops proxy server                  █
     * ███████████████████████████████████████████████████████████████
     */
    dispose() {
        // Stop stats collection
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
        
        // Stop proxy
        this.stopProxy();
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Registers IPC handlers                             █
     * █ Handles communication with renderer process                 █
     * ███████████████████████████████████████████████████████████████
     */
    _registerIpcHandlers() {
        // Enable/disable throttling
        ipcMain.handle('set-network-throttling', (event, { enabled }) => {
            return this.setEnabled(enabled);
        });
        
        // Update settings
        ipcMain.handle('update-network-settings', (event, settings) => {
            return this.updateSettings(settings);
        });
        
        // Get current stats
        ipcMain.handle('get-network-stats', () => {
            return this.getStats();
        });
        
        // Set network profile
        ipcMain.handle('set-network-profile', (event, { profile }) => {
            return this.setNetworkProfile(profile);
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Starts statistics collection                       █
     * █ Measures bandwidth usage over time                          █
     * ███████████████████████████████████████████████████████████████
     */
    _startStatsCollection() {
        // Reset counters
        let lastDownloadedBytes = this.stats.totalBytesDownloaded;
        let lastUploadedBytes = this.stats.totalBytesUploaded;
        
        // Update stats every second
        this.statsInterval = setInterval(() => {
            // Calculate bytes per second
            const downloadedBytesPerSecond = this.stats.totalBytesDownloaded - lastDownloadedBytes;
            const uploadedBytesPerSecond = this.stats.totalBytesUploaded - lastUploadedBytes;
            
            // Update last values
            lastDownloadedBytes = this.stats.totalBytesDownloaded;
            lastUploadedBytes = this.stats.totalBytesUploaded;
            
            // Update stats
            this.stats.bytesDownloadedPerSecond = downloadedBytesPerSecond;
            this.stats.bytesUploadedPerSecond = uploadedBytesPerSecond;
            this.stats.activeConnections = this.activeConnections.size;
        }, 1000);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Handles HTTP requests                              █
     * █ Throttles HTTP traffic based on settings                    █
     * ███████████████████████████████████████████████████████████████
     */
    _handleHttpRequest(clientReq, clientRes) {
        // Parse the requested URL
        const parsedUrl = url.parse(clientReq.url);
        
        // Check if domain is excluded from throttling
        const isExcluded = this._isDomainExcluded(parsedUrl.hostname);
        
        // Options for the outgoing request
        const options = {
            protocol: parsedUrl.protocol,
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.path,
            method: clientReq.method,
            headers: clientReq.headers
        };
        
        // Create request to the target server
        const proxyReq = http.request(options, (proxyRes) => {
            // Set response headers
            clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
            
            // Add artificial latency if configured
            if (this.settings.latencyMs > 0 && !isExcluded) {
                setTimeout(() => {
                    this._pipeResponse(proxyRes, clientRes, isExcluded);
                }, this.settings.latencyMs);
            } else {
                this._pipeResponse(proxyRes, clientRes, isExcluded);
            }
        });
        
        // Handle request errors
        proxyReq.on('error', (err) => {
            console.error(`Error proxying request to ${parsedUrl.hostname}:`, err);
            clientRes.writeHead(500);
            clientRes.end(`Proxy error: ${err.message}`);
        });
        
        // Pipe client request to proxy request with upload throttling
        this._pipeRequest(clientReq, proxyReq, isExcluded);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Handles HTTPS requests                             █
     * █ Sets up secure tunnel with throttling                       █
     * ███████████████████████████████████████████████████████████████
     */
    _handleHttpsRequest(req, clientSocket, head) {
        // Parse the connect string
        const parsedUrl = url.parse(`https://${req.url}`);
        const hostname = parsedUrl.hostname;
        const port = parsedUrl.port || 443;
        
        // Check if domain is excluded from throttling
        const isExcluded = this._isDomainExcluded(hostname);
        
        // Create connection to target server
        const serverSocket = net.connect(port, hostname, () => {
            // Send connection established response
            clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                                'Proxy-agent: Internet-Server-Proxy\r\n' +
                                '\r\n');
            
            // Add artificial latency if configured
            if (this.settings.latencyMs > 0 && !isExcluded) {
                setTimeout(() => {
                    this._setupTunnel(clientSocket, serverSocket, isExcluded);
                }, this.settings.latencyMs);
            } else {
                this._setupTunnel(clientSocket, serverSocket, isExcluded);
            }
        });
        
        // Track active connection
        this.activeConnections.add(clientSocket);
        this.activeConnections.add(serverSocket);
        
        // Handle connection errors
        serverSocket.on('error', (err) => {
            console.error(`Error connecting to ${hostname}:${port}:`, err);
            clientSocket.end();
            
            this.activeConnections.delete(clientSocket);
            this.activeConnections.delete(serverSocket);
        });
        
        clientSocket.on('error', (err) => {
            console.error('Client socket error:', err);
            serverSocket.end();
            
            this.activeConnections.delete(clientSocket);
            this.activeConnections.delete(serverSocket);
        });
        
        // Clean up when either socket closes
        clientSocket.on('close', () => {
            serverSocket.end();
            this.activeConnections.delete(clientSocket);
            this.activeConnections.delete(serverSocket);
        });
        
        serverSocket.on('close', () => {
            clientSocket.end();
            this.activeConnections.delete(clientSocket);
            this.activeConnections.delete(serverSocket);
        });
        
        // Send head data if present
        if (head && head.length > 0) {
            serverSocket.write(head);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Sets up tunnel between client and server sockets   █
     * █ Applies throttling to both directions                       █
     * ███████████████████████████████████████████████████████████████
     */
    _setupTunnel(clientSocket, serverSocket, isExcluded) {
        // Apply download throttling (server -> client)
        if (this.settings.downloadKbps > 0 && !isExcluded) {
            const downloadThrottle = new Throttle({ rate: this.settings.downloadKbps * 1024 / 8 });
            
            // Track downloaded bytes
            downloadThrottle.on('data', (chunk) => {
                this.stats.totalBytesDownloaded += chunk.length;
            });
            
            // Pipe through throttle
            serverSocket.pipe(downloadThrottle).pipe(clientSocket);
        } else {
            // Direct pipe with byte counting
            serverSocket.on('data', (chunk) => {
                this.stats.totalBytesDownloaded += chunk.length;
                
                // Simulate packet loss
                if (!isExcluded && this.settings.packetLossRate > 0 && 
                    Math.random() < this.settings.packetLossRate) {
                    // Drop packet
                    return;
                }
                
                clientSocket.write(chunk);
            });
        }
        
        // Apply upload throttling (client -> server)
        if (this.settings.uploadKbps > 0 && !isExcluded) {
            const uploadThrottle = new Throttle({ rate: this.settings.uploadKbps * 1024 / 8 });
            
            // Track uploaded bytes
            uploadThrottle.on('data', (chunk) => {
                this.stats.totalBytesUploaded += chunk.length;
            });
            
            // Pipe through throttle
            clientSocket.pipe(uploadThrottle).pipe(serverSocket);
        } else {
            // Direct pipe with byte counting
            clientSocket.on('data', (chunk) => {
                this.stats.totalBytesUploaded += chunk.length;
                
                // Simulate packet loss
                if (!isExcluded && this.settings.packetLossRate > 0 && 
                    Math.random() < this.settings.packetLossRate) {
                    // Drop packet
                    return;
                }
                
                serverSocket.write(chunk);
            });
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Pipes request with throttling                      █
     * █ Used for HTTP request bodies (client -> server)             █
     * ███████████████████████████████████████████████████████████████
     */
    _pipeRequest(clientReq, proxyReq, isExcluded) {
        // Apply upload throttling
        if (this.settings.uploadKbps > 0 && !isExcluded) {
            const uploadThrottle = new Throttle({ rate: this.settings.uploadKbps * 1024 / 8 });
            
            // Track uploaded bytes
            uploadThrottle.on('data', (chunk) => {
                this.stats.totalBytesUploaded += chunk.length;
            });
            
            // Pipe through throttle
            clientReq.pipe(uploadThrottle).pipe(proxyReq);
        } else {
            // Direct pipe with byte counting
            clientReq.on('data', (chunk) => {
                this.stats.totalBytesUploaded += chunk.length;
                
                // Simulate packet loss
                if (!isExcluded && this.settings.packetLossRate > 0 && 
                    Math.random() < this.settings.packetLossRate) {
                    // Drop packet
                    return;
                }
                
                proxyReq.write(chunk);
            });
            
            clientReq.on('end', () => {
                proxyReq.end();
            });
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Pipes response with throttling                     █
     * █ Used for HTTP response bodies (server -> client)            █
     * ███████████████████████████████████████████████████████████████
     */
    _pipeResponse(proxyRes, clientRes, isExcluded) {
        // Apply download throttling
        if (this.settings.downloadKbps > 0 && !isExcluded) {
            const downloadThrottle = new Throttle({ rate: this.settings.downloadKbps * 1024 / 8 });
            
            // Track downloaded bytes
            downloadThrottle.on('data', (chunk) => {
                this.stats.totalBytesDownloaded += chunk.length;
            });
            
            // Pipe through throttle
            proxyRes.pipe(downloadThrottle).pipe(clientRes);
        } else {
            // Direct pipe with byte counting
            proxyRes.on('data', (chunk) => {
                this.stats.totalBytesDownloaded += chunk.length;
                
                // Simulate packet loss
                if (!isExcluded && this.settings.packetLossRate > 0 && 
                    Math.random() < this.settings.packetLossRate) {
                    // Drop packet
                    return;
                }
                
                clientRes.write(chunk);
            });
            
            proxyRes.on('end', () => {
                clientRes.end();
            });
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Checks if domain is excluded from throttling       █
     * █ Allows certain domains to bypass throttling                 █
     * ███████████████████████████████████████████████████████████████
     */
    _isDomainExcluded(hostname) {
        if (!hostname || !this.settings.excludedDomains.length) {
            return false;
        }
        
        return this.settings.excludedDomains.some(domain => {
            // Exact match
            if (hostname === domain) {
                return true;
            }
            
            // Wildcard match (*.example.com)
            if (domain.startsWith('*.') && hostname.endsWith(domain.substring(1))) {
                return true;
            }
            
            return false;
        });
    }
}

module.exports = NetworkThrottler;
