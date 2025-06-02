/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * Internet Server - Preload Script
 * 
 * This script runs in a privileged context before the renderer process starts.
 * It provides a secure bridge between the renderer process and the main process
 * through contextBridge and exposes only the necessary APIs.
 * 
 * Copyright (c) 2025 ZARI CORP
 */

const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-control', 'minimize'),
  maximizeWindow: () => ipcRenderer.send('window-control', 'maximize'),
  closeWindow: () => ipcRenderer.send('window-control', 'close'),
  
  // Tab management
  createTab: (url) => ipcRenderer.send('new-tab', url),
  closeTab: (tabId) => ipcRenderer.send('close-tab', tabId),
  
  // Configuration management
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (config) => ipcRenderer.send('update-config', config),
  
  // System information
  getSystemInfo: () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.getSystemVersion(),
      cpuCount: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemory: Math.round(os.freemem() / (1024 * 1024))
    };
  },
  
  // Resource usage listeners
  onCpuUsageUpdate: (callback) => {
    ipcRenderer.on('update-cpu-usage', (event, usage) => callback(usage));
  },
  onRamUsageUpdate: (callback) => {
    ipcRenderer.on('update-ram-usage', (event, usage) => callback(usage));
  },
  onNetworkUsageUpdate: (callback) => {
    ipcRenderer.on('update-network-usage', (event, usage) => callback(usage));
  },
  
  // Resource Limiter Settings Panel IPC channels
  // Get current limiter settings
  getLimiterSettings: () => ipcRenderer.invoke('get-limiter-settings'),
  
  // Update limiter settings
  updateLimiterSettings: (settings) => ipcRenderer.send('update-limiter-settings', settings),
  
  // Get real-time resource stats
  getResourceStats: () => ipcRenderer.invoke('get-resource-stats'),
  
  // Subscribe to resource stats updates
  onResourceStatsUpdate: (callback) => {
    ipcRenderer.on('resource-stats-update', (event, stats) => callback(stats));
  },
  
  // Profile management
  applyLimiterProfile: (profileId) => ipcRenderer.send('apply-limiter-profile', profileId),
  getCustomProfiles: () => ipcRenderer.invoke('get-custom-profiles'),
  saveCustomProfiles: (profiles) => ipcRenderer.send('save-custom-profiles', profiles),
  
  // Advanced settings
  getAdvancedLimiterSettings: () => ipcRenderer.invoke('get-advanced-limiter-settings'),
  updateAdvancedLimiterSettings: (settings) => ipcRenderer.send('update-advanced-limiter-settings', settings),
  forceGarbageCollection: () => ipcRenderer.send('force-garbage-collection'),
  runLimiterDiagnostics: () => ipcRenderer.invoke('run-limiter-diagnostics'),
  resetLimiterSettings: () => ipcRenderer.send('reset-limiter-settings'),
  
  // Toggle Resource Limiter Settings Panel
  toggleLimiterSettingsPanel: () => ipcRenderer.send('toggle-limiter-settings-panel'),
  
  // Tab suspension for memory management
  onSuspendInactiveTabs: (callback) => {
    ipcRenderer.on('suspend-inactive-tabs', () => callback());
  },
  
  // Plugin system
  registerPluginUI: (pluginId, uiElement) => {
    ipcRenderer.send('register-plugin-ui', { pluginId, uiElement });
  },
  
  // Auto-updater
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', () => callback());
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', () => callback());
  },
  installUpdate: () => ipcRenderer.send('install-update'),
  
  // Sound system
  playSound: (soundId) => ipcRenderer.send('play-sound', soundId),
  setSoundsEnabled: (enabled) => ipcRenderer.send('set-sounds-enabled', enabled)
});
