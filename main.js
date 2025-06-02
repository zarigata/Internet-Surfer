/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * Internet Server - Main Process
 * 
 * This file serves as the entry point for the Electron application,
 * handling the main process logic, window creation, and IPC communication.
 * 
 * Copyright (c) 2025 ZARI CORP
 */

const { app, BrowserWindow, ipcMain, shell, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { autoUpdater } = require('electron-updater');
const pidusage = require('pidusage');
const http = require('http');
const httpProxy = require('http-proxy');

// ==== SYSTEM CONSTANTS ====
const IS_DEV = process.argv.includes('--debug');
const IS_WINDOWS = process.platform === 'win32';
const IS_LINUX = process.platform === 'linux';
const APP_DATA_PATH = app.getPath('userData');
const CONFIG_PATH = path.join(APP_DATA_PATH, 'config.json');

// ==== DEFAULT CONFIGURATION ====
let config = {
  theme: 'xp_classic',
  sounds: true,
  limiter: {
    cpu: 70, // percentage
    ram: 1024, // MB
    network: 0 // 0 = unlimited, otherwise kbps
  },
  ollama: {
    model: "llama3.2",
    ip: "127.0.0.1",
    port: "11434",
    style: "default"
  }
};

// Main browser window reference
let mainWindow = null;

// Resource manager
let limiterManager = null;

// Import our limiter modules
const { LimiterManager } = require('./src/limiters/limiter-manager');
const { PluginSystem } = require('./src/plugins/plugin-loader');
let networkThrottle = null;

/**
 * Loads user configuration from disk or creates default if not exists
 * Configuration includes themes, sounds, and resource limiters
 */
function loadConfiguration() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const userConfig = JSON.parse(data);
      config = { ...config, ...userConfig };
      console.log('✅ Configuration loaded successfully');
    } else {
      // Create default config if none exists
      saveConfiguration();
      console.log('⚠️ No configuration found, created default');
    }
  } catch (error) {
    console.error('❌ Error loading configuration:', error);
  }
}

/**
 * Saves current configuration to disk
 */
function saveConfiguration() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('✅ Configuration saved successfully');
  } catch (error) {
    console.error('❌ Error saving configuration:', error);
  }
}

/**
 * Creates the main browser window with Windows XP styling
 * Sets up frameless window with custom frame rendering
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Disable default frame for custom XP-style frame
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      enableRemoteModule: false,
      webviewTag: true,
      webSecurity: !IS_DEV // Disable web security in dev mode
    },
    icon: path.join(__dirname, 'assets', 'icons', IS_WINDOWS ? 'win/icon.ico' : 'png/256x256.png'),
    show: false // Don't show until ready
  });

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, 'src', 'ui', 'index.html'));

  // Show window when ready to avoid flashing
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check for updates (except in dev mode)
    if (!IS_DEV) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });

  // Handle window controls through IPC
  ipcMain.on('window-control', (event, action) => {
    switch (action) {
      case 'minimize':
        mainWindow.minimize();
        break;
      case 'maximize':
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        break;
      case 'close':
        mainWindow.close();
        break;
    }
  });

  // Send configuration to renderer
  ipcMain.handle('get-config', () => config);
  
  // Update configuration from renderer
  ipcMain.on('update-config', (event, newConfig) => {
    config = { ...config, ...newConfig };
    saveConfiguration();
    
    // Apply new resource limits if changed
    if (newConfig.limiter) {
      applyResourceLimits();
    }
  });

  // New tab creation
  ipcMain.on('new-tab', (event, url) => {
    mainWindow.webContents.send('create-tab', url || 'about:blank');
  });

  // Open links in default browser if not in our domain
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // If external link, open in default browser
    if (!url.startsWith('file://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Plugin system initialization
  initPluginSystem();
}

/**
 * ███████████████████████████████████████████████████████████████
 * █ Initialize Resource Limiter Manager                        █
 * █ Sets up CPU, RAM, and network throttling based on config   █
 * ███████████████████████████████████████████████████████████████
 */
function initLimiterManager() {
  console.log('Initializing Resource Limiter Manager...');
  
  // Create the limiter manager instance
  limiterManager = new LimiterManager(mainWindow);
  
  // Initialize with settings from config (if available)
  if (config.limiter) {
    // Convert legacy config format to new format if needed
    const limiterSettings = {
      enabled: true,
      profiles: {
        current: 'custom',
        available: ['performance', 'balanced', 'efficiency', 'gaming', 'streaming', 'custom']
      },
      cpu: {
        enabled: config.limiter.cpu > 0,
        maxCpuPercent: config.limiter.cpu || 70,
        priority: 'normal'
      },
      memory: {
        enabled: config.limiter.ram > 0,
        maxMemoryMB: config.limiter.ram || 1024,
        perTabLimitMB: 200,
        aggressiveGC: false
      },
      network: {
        enabled: config.limiter.network > 0,
        downloadKbps: config.limiter.network || 0,
        uploadKbps: config.limiter.network || 0,
        latencyMs: 0,
        packetLossRate: 0,
        profile: config.limiter.network > 0 ? 'custom' : 'unlimited'
      },
      advanced: {
        startupMode: 'auto',
        startWithProfile: 'balanced',
        monitoringInterval: 2000,
        notificationsEnabled: true,
        showResourceWarnings: true,
        debugMode: IS_DEV,
        autoCleanupThreshold: 90,
        enableDiagnostics: false,
        exclusions: []
      }
    };
    
    // Apply the settings
    limiterManager.updateSettings(limiterSettings);
  }
  
  console.log('Resource Limiter Manager initialized successfully');
  return limiterManager;
}

/**
 * Initializes the plugin system
 * Loads plugin modules from the plugins directory
 */
function initPluginSystem() {
  const pluginsDir = path.join(__dirname, 'src', 'plugins');
  
  if (!fs.existsSync(pluginsDir)) {
    return;
  }
  
  try {
    const pluginFiles = fs.readdirSync(pluginsDir);
    
    pluginFiles.forEach(file => {
      if (file.endsWith('.js')) {
        try {
          const pluginPath = path.join(pluginsDir, file);
          const plugin = require(pluginPath);
          
          if (typeof plugin.init === 'function') {
            plugin.init({
              app,
              ipcMain,
              mainWindow: () => mainWindow, // Wrapper function to avoid circular reference
              config
            });
            console.log(`✅ Loaded plugin: ${file}`);
          }
        } catch (err) {
          console.error(`❌ Failed to load plugin ${file}:`, err);
        }
      }
    });
  } catch (err) {
    console.error('❌ Error loading plugins:', err);
  }
}

// ===== APP LIFECYCLE EVENTS =====

// When Electron has initialized and is ready to create browser windows
app.whenReady().then(() => {
  // Load user configuration
  loadConfiguration();
  
  // Create the browser window
  createMainWindow();
  
  // Initialize plugin system
  const pluginSystem = new PluginSystem(mainWindow);
  pluginSystem.loadPlugins();
  
  // Initialize the resource limiter manager
  initLimiterManager();
  
  // Log startup details
  console.log(`
    █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
    █▄▄ █▄█ █▄▀ ██▄ █░█
    
    Internet Server Browser - Alpha Version
    Platform: ${process.platform}
    Electron: ${process.versions.electron}
    Chrome: ${process.versions.chrome}
    Node.js: ${process.versions.node}
    Debug Mode: ${IS_DEV ? 'Enabled' : 'Disabled'}
  `);
  
  // macOS specific: re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
  
  // Set up auto-updater events
  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update-available');
  });
  
  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-downloaded');
  });
  
  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall();
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Save configuration when app is about to quit
app.on('before-quit', () => {
  // Save user configuration
  saveConfiguration();
  
  // Clean up resource limiters
  if (limiterManager) {
    // Update config with current limiter settings
    const limiterSettings = limiterManager.settings;
    
    // Convert to legacy format for backward compatibility
    config.limiter = {
      cpu: limiterSettings.cpu.enabled ? limiterSettings.cpu.maxCpuPercent : 0,
      ram: limiterSettings.memory.enabled ? limiterSettings.memory.maxMemoryMB : 0,
      network: limiterSettings.network.enabled ? limiterSettings.network.downloadKbps : 0
    };
    
    // Save updated config
    saveConfiguration();
    
    console.log('Resource limiters cleaned up');
  }
  
  console.log('Application shutting down gracefully...');
});
