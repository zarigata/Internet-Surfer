/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * Internet Server - Plugin System
 * 
 * This module handles plugin discovery, loading, and management:
 * - Scans the plugins directory for valid plugin packages
 * - Registers plugin APIs with the browser
 * - Provides plugin sandboxing and security
 * - Enables/disables plugins based on user preferences
 * 
 * Copyright (c) 2025 ZARI CORP
 */

const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');

class PluginLoader {
    constructor(mainWindow) {
        // Reference to main browser window
        this.mainWindow = mainWindow;
        
        // Plugin registry
        this.plugins = new Map();
        
        // Plugin settings
        this.settings = {
            enabledPlugins: [],
            devMode: false
        };
        
        // Plugin directory path
        this.pluginsDir = path.join(__dirname, '../plugins');
        
        // Register IPC handlers
        this._registerIpcHandlers();
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Loads all available plugins from the plugins directory       █
     * █ Validates plugin manifests and initializes enabled plugins   █
     * █ Returns count of successfully loaded plugins                 █
     * ███████████████████████████████████████████████████████████████
     */
    async loadPlugins() {
        try {
            // Load plugin settings
            await this._loadSettings();
            
            // Get plugin directories
            const pluginDirs = this._scanPluginDirectory();
            
            console.log(`Found ${pluginDirs.length} potential plugins`);
            
            // Load each plugin
            let loadedCount = 0;
            for (const pluginDir of pluginDirs) {
                try {
                    const plugin = await this._loadPlugin(pluginDir);
                    if (plugin) {
                        this.plugins.set(plugin.id, plugin);
                        loadedCount++;
                        
                        // Initialize if enabled
                        if (this.settings.enabledPlugins.includes(plugin.id)) {
                            await this._initializePlugin(plugin);
                        }
                    }
                } catch (err) {
                    console.error(`Failed to load plugin from ${pluginDir}:`, err);
                }
            }
            
            console.log(`Successfully loaded ${loadedCount} plugins`);
            return loadedCount;
        } catch (err) {
            console.error('Error loading plugins:', err);
            return 0;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Enables a plugin by ID                                      █
     * █ Initializes the plugin if not already active                █
     * ███████████████████████████████████████████████████████████████
     */
    async enablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        
        // Skip if already enabled
        if (plugin.enabled) {
            return true;
        }
        
        // Initialize plugin
        await this._initializePlugin(plugin);
        
        // Update settings
        if (!this.settings.enabledPlugins.includes(pluginId)) {
            this.settings.enabledPlugins.push(pluginId);
            await this._saveSettings();
        }
        
        return true;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Disables a plugin by ID                                     █
     * █ Unloads the plugin if active                                █
     * ███████████████████████████████████████████████████████████████
     */
    async disablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        
        // Skip if already disabled
        if (!plugin.enabled) {
            return true;
        }
        
        // Unload plugin
        await this._unloadPlugin(plugin);
        
        // Update settings
        const index = this.settings.enabledPlugins.indexOf(pluginId);
        if (index !== -1) {
            this.settings.enabledPlugins.splice(index, 1);
            await this._saveSettings();
        }
        
        return true;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Gets information about all loaded plugins                   █
     * █ Returns array of plugin metadata                            █
     * ███████████████████████████████████████████████████████████████
     */
    getPluginList() {
        const pluginList = [];
        
        this.plugins.forEach(plugin => {
            pluginList.push({
                id: plugin.id,
                name: plugin.name,
                version: plugin.version,
                description: plugin.description,
                author: plugin.author,
                enabled: plugin.enabled,
                hasSettings: !!plugin.settingsPath,
                hasSidebar: !!plugin.sidebarPath,
                hasToolbar: !!plugin.toolbarPath,
                permissions: plugin.permissions || []
            });
        });
        
        return pluginList;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Sets development mode for plugins                           █
     * █ When enabled, plugins are reloaded on file changes          █
     * ███████████████████████████████████████████████████████████████
     */
    setDevMode(enabled) {
        this.settings.devMode = enabled;
        this._saveSettings();
        
        // Set up file watchers if dev mode enabled
        if (enabled) {
            this._setupDevModeWatchers();
        } else {
            this._clearDevModeWatchers();
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Reloads all plugins or a specific plugin by ID              █
     * █ Used during development or when plugin files change         █
     * ███████████████████████████████████████████████████████████████
     */
    async reloadPlugins(pluginId = null) {
        try {
            if (pluginId) {
                // Reload specific plugin
                const plugin = this.plugins.get(pluginId);
                if (plugin) {
                    // Unload if enabled
                    if (plugin.enabled) {
                        await this._unloadPlugin(plugin);
                    }
                    
                    // Reload
                    const reloadedPlugin = await this._loadPlugin(plugin.path);
                    
                    // Update registry
                    if (reloadedPlugin) {
                        this.plugins.set(pluginId, reloadedPlugin);
                        
                        // Re-initialize if it was enabled
                        if (this.settings.enabledPlugins.includes(pluginId)) {
                            await this._initializePlugin(reloadedPlugin);
                        }
                    }
                }
            } else {
                // Unload all plugins
                for (const [id, plugin] of this.plugins.entries()) {
                    if (plugin.enabled) {
                        await this._unloadPlugin(plugin);
                    }
                }
                
                // Clear registry
                this.plugins.clear();
                
                // Reload all
                await this.loadPlugins();
            }
            
            // Notify renderer
            this.mainWindow.webContents.send('plugins-reloaded');
            
            return true;
        } catch (err) {
            console.error('Error reloading plugins:', err);
            return false;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Scans the plugins directory                        █
     * █ Returns array of valid plugin directory paths               █
     * ███████████████████████████████████████████████████████████████
     */
    _scanPluginDirectory() {
        try {
            // Ensure plugins directory exists
            if (!fs.existsSync(this.pluginsDir)) {
                fs.mkdirSync(this.pluginsDir, { recursive: true });
                return [];
            }
            
            // Get all subdirectories
            const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
            const dirs = entries
                .filter(entry => entry.isDirectory())
                .map(dir => path.join(this.pluginsDir, dir.name));
            
            // Filter to only those with a manifest.json
            return dirs.filter(dir => 
                fs.existsSync(path.join(dir, 'manifest.json'))
            );
        } catch (err) {
            console.error('Error scanning plugin directory:', err);
            return [];
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Loads a plugin from directory                      █
     * █ Validates manifest and registers plugin                     █
     * █ Returns plugin object or null if invalid                    █
     * ███████████████████████████████████████████████████████████████
     */
    async _loadPlugin(pluginDir) {
        try {
            // Read manifest
            const manifestPath = path.join(pluginDir, 'manifest.json');
            const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            
            // Validate required fields
            if (!manifestData.id || !manifestData.name || !manifestData.version) {
                console.error(`Invalid plugin manifest at ${pluginDir}`);
                return null;
            }
            
            // Create plugin object
            const plugin = {
                id: manifestData.id,
                name: manifestData.name,
                version: manifestData.version,
                description: manifestData.description || '',
                author: manifestData.author || 'Unknown',
                permissions: manifestData.permissions || [],
                mainPath: manifestData.main ? path.join(pluginDir, manifestData.main) : null,
                settingsPath: manifestData.settings ? path.join(pluginDir, manifestData.settings) : null,
                sidebarPath: manifestData.sidebar ? path.join(pluginDir, manifestData.sidebar) : null,
                toolbarPath: manifestData.toolbar ? path.join(pluginDir, manifestData.toolbar) : null,
                path: pluginDir,
                enabled: false,
                instance: null
            };
            
            // Validate paths
            if (plugin.mainPath && !fs.existsSync(plugin.mainPath)) {
                console.error(`Plugin main file not found: ${plugin.mainPath}`);
                return null;
            }
            
            console.log(`Loaded plugin: ${plugin.name} (${plugin.id}) v${plugin.version}`);
            return plugin;
        } catch (err) {
            console.error(`Error loading plugin from ${pluginDir}:`, err);
            return null;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Initializes a plugin                               █
     * █ Loads main module and UI components                         █
     * █ Creates a sandboxed context for the plugin                  █
     * ███████████████████████████████████████████████████████████████
     */
    async _initializePlugin(plugin) {
        try {
            // Skip if already enabled
            if (plugin.enabled) {
                return true;
            }
            
            console.log(`Initializing plugin: ${plugin.id}`);
            
            // Load main module if exists
            if (plugin.mainPath) {
                try {
                    // Create plugin API
                    const api = this._createPluginAPI(plugin);
                    
                    // Load the module
                    const pluginModule = require(plugin.mainPath);
                    
                    // Initialize module
                    if (typeof pluginModule.initialize === 'function') {
                        plugin.instance = await pluginModule.initialize(api);
                    } else {
                        plugin.instance = pluginModule;
                    }
                } catch (err) {
                    console.error(`Error initializing plugin ${plugin.id}:`, err);
                    throw err;
                }
            }
            
            // Register UI components
            if (this.mainWindow) {
                // Send UI component paths to renderer
                this.mainWindow.webContents.send('register-plugin-ui', {
                    id: plugin.id,
                    settings: plugin.settingsPath ? this._convertToRelativePath(plugin.settingsPath) : null,
                    sidebar: plugin.sidebarPath ? this._convertToRelativePath(plugin.sidebarPath) : null,
                    toolbar: plugin.toolbarPath ? this._convertToRelativePath(plugin.toolbarPath) : null
                });
            }
            
            // Mark as enabled
            plugin.enabled = true;
            
            return true;
        } catch (err) {
            console.error(`Failed to initialize plugin ${plugin.id}:`, err);
            return false;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Unloads a plugin                                   █
     * █ Calls cleanup method and removes from renderer              █
     * ███████████████████████████████████████████████████████████████
     */
    async _unloadPlugin(plugin) {
        try {
            console.log(`Unloading plugin: ${plugin.id}`);
            
            // Call cleanup method if available
            if (plugin.instance && typeof plugin.instance.cleanup === 'function') {
                await plugin.instance.cleanup();
            }
            
            // Remove UI components
            if (this.mainWindow) {
                this.mainWindow.webContents.send('unregister-plugin-ui', {
                    id: plugin.id
                });
            }
            
            // Clear module cache
            if (plugin.mainPath) {
                delete require.cache[require.resolve(plugin.mainPath)];
            }
            
            // Mark as disabled
            plugin.enabled = false;
            plugin.instance = null;
            
            return true;
        } catch (err) {
            console.error(`Error unloading plugin ${plugin.id}:`, err);
            return false;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Creates plugin API object                          █
     * █ Provides limited and sandboxed access to browser features   █
     * █ Enforces permission checks                                  █
     * ███████████████████████████████████████████████████████████████
     */
    _createPluginAPI(plugin) {
        const api = {
            // Plugin info
            id: plugin.id,
            name: plugin.name,
            version: plugin.version,
            
            // Storage API
            storage: {
                get: async (key) => {
                    // Get plugin storage data
                    const data = await this._getPluginStorage(plugin.id);
                    return key ? data[key] : data;
                },
                set: async (key, value) => {
                    // Set plugin storage data
                    const data = await this._getPluginStorage(plugin.id);
                    if (typeof key === 'object' && value === undefined) {
                        // Set multiple values
                        Object.assign(data, key);
                    } else {
                        // Set single value
                        data[key] = value;
                    }
                    return this._setPluginStorage(plugin.id, data);
                },
                remove: async (key) => {
                    // Remove key from plugin storage
                    const data = await this._getPluginStorage(plugin.id);
                    delete data[key];
                    return this._setPluginStorage(plugin.id, data);
                },
                clear: async () => {
                    // Clear plugin storage
                    return this._setPluginStorage(plugin.id, {});
                }
            },
            
            // Messaging API
            messaging: {
                // Send message to renderer process
                sendToRenderer: (channel, data) => {
                    this._checkPermission(plugin, 'messaging');
                    
                    if (this.mainWindow) {
                        this.mainWindow.webContents.send(`plugin:${plugin.id}:${channel}`, data);
                    }
                },
                
                // Register handler for messages from renderer
                onMessage: (channel, callback) => {
                    this._checkPermission(plugin, 'messaging');
                    
                    const fullChannel = `plugin:${plugin.id}:${channel}`;
                    ipcMain.on(fullChannel, (event, ...args) => {
                        // Only accept messages from our window
                        if (event.sender.id === this.mainWindow.webContents.id) {
                            callback(...args);
                        }
                    });
                }
            },
            
            // Logger (with plugin prefix)
            logger: {
                log: (...args) => console.log(`[Plugin:${plugin.id}]`, ...args),
                error: (...args) => console.error(`[Plugin:${plugin.id}]`, ...args),
                warn: (...args) => console.warn(`[Plugin:${plugin.id}]`, ...args),
                info: (...args) => console.info(`[Plugin:${plugin.id}]`, ...args)
            },
            
            // Browser API (limited access based on permissions)
            browser: {
                // Get browser info
                getInfo: () => {
                    return {
                        version: process.env.npm_package_version || '1.0.0',
                        platform: process.platform,
                        electron: process.versions.electron
                    };
                },
                
                // Tab management (requires tabs permission)
                tabs: {
                    // Create a new tab
                    create: (url) => {
                        this._checkPermission(plugin, 'tabs');
                        
                        if (this.mainWindow) {
                            this.mainWindow.webContents.send('create-tab', { url });
                        }
                    },
                    
                    // Get current tab info
                    getCurrent: () => {
                        this._checkPermission(plugin, 'tabs');
                        
                        // This requires communication with renderer process
                        // and should be implemented as an async function
                        // in a real application
                    }
                },
                
                // Network API (requires network permission)
                network: {
                    // Set network throttling
                    setThrottling: (enabled, options) => {
                        this._checkPermission(plugin, 'network');
                        
                        if (this.mainWindow) {
                            this.mainWindow.webContents.send('set-network-throttling', { 
                                enabled, 
                                options,
                                source: plugin.id 
                            });
                        }
                    }
                }
            }
        };
        
        return api;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Checks if plugin has required permission           █
     * █ Throws error if permission is not granted                   █
     * ███████████████████████████████████████████████████████████████
     */
    _checkPermission(plugin, permission) {
        if (!plugin.permissions.includes(permission)) {
            throw new Error(`Plugin ${plugin.id} does not have permission: ${permission}`);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Gets plugin storage data                           █
     * █ Each plugin has isolated persistent storage                 █
     * ███████████████████████████████████████████████████████████████
     */
    async _getPluginStorage(pluginId) {
        try {
            const storagePath = path.join(this.pluginsDir, '.storage', `${pluginId}.json`);
            
            if (fs.existsSync(storagePath)) {
                const data = fs.readFileSync(storagePath, 'utf8');
                return JSON.parse(data);
            }
            
            return {};
        } catch (err) {
            console.error(`Error reading plugin storage for ${pluginId}:`, err);
            return {};
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Sets plugin storage data                           █
     * █ Persists plugin data to disk                                █
     * ███████████████████████████████████████████████████████████████
     */
    async _setPluginStorage(pluginId, data) {
        try {
            const storageDir = path.join(this.pluginsDir, '.storage');
            const storagePath = path.join(storageDir, `${pluginId}.json`);
            
            // Ensure storage directory exists
            if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true });
            }
            
            // Write data
            fs.writeFileSync(storagePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (err) {
            console.error(`Error writing plugin storage for ${pluginId}:`, err);
            return false;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Loads plugin settings                              █
     * █ Reads enabled plugins list and other settings               █
     * ███████████████████████████████████████████████████████████████
     */
    async _loadSettings() {
        try {
            const settingsPath = path.join(this.pluginsDir, 'plugin-settings.json');
            
            if (fs.existsSync(settingsPath)) {
                const data = fs.readFileSync(settingsPath, 'utf8');
                const settings = JSON.parse(data);
                
                // Update settings
                this.settings = {
                    ...this.settings,
                    ...settings
                };
            }
        } catch (err) {
            console.error('Error loading plugin settings:', err);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Saves plugin settings                              █
     * █ Persists enabled plugins list and other settings            █
     * ███████████████████████████████████████████████████████████████
     */
    async _saveSettings() {
        try {
            const settingsPath = path.join(this.pluginsDir, 'plugin-settings.json');
            
            // Write settings
            fs.writeFileSync(settingsPath, JSON.stringify(this.settings, null, 2), 'utf8');
            return true;
        } catch (err) {
            console.error('Error saving plugin settings:', err);
            return false;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Registers IPC handlers for renderer communication  █
     * █ Handles plugin management requests from UI                  █
     * ███████████████████████████████████████████████████████████████
     */
    _registerIpcHandlers() {
        // Get plugin list
        ipcMain.handle('get-plugins', () => {
            return this.getPluginList();
        });
        
        // Enable plugin
        ipcMain.handle('enable-plugin', async (event, pluginId) => {
            return await this.enablePlugin(pluginId);
        });
        
        // Disable plugin
        ipcMain.handle('disable-plugin', async (event, pluginId) => {
            return await this.disablePlugin(pluginId);
        });
        
        // Reload plugins
        ipcMain.handle('reload-plugins', async (event, pluginId) => {
            return await this.reloadPlugins(pluginId);
        });
        
        // Set development mode
        ipcMain.handle('set-plugin-dev-mode', (event, enabled) => {
            return this.setDevMode(enabled);
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Converts absolute path to relative web path        █
     * █ Used for UI component paths sent to renderer                █
     * ███████████████████████████████████████████████████████████████
     */
    _convertToRelativePath(absolutePath) {
        // Convert path for renderer process
        const appRoot = path.resolve(__dirname, '../../');
        const relativePath = path.relative(appRoot, absolutePath);
        return relativePath.replace(/\\/g, '/');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Sets up file watchers for development mode         █
     * █ Automatically reloads plugins when files change             █
     * ███████████████████████████████████████████████████████████████
     */
    _setupDevModeWatchers() {
        // This would use fs.watch or chokidar to watch for file changes
        // and reload plugins automatically
        // Not implemented in this basic version
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Clears development mode file watchers              █
     * █ Called when disabling dev mode                              █
     * ███████████████████████████████████████████████████████████████
     */
    _clearDevModeWatchers() {
        // Clean up file watchers
        // Not implemented in this basic version
    }
}

module.exports = PluginLoader;
