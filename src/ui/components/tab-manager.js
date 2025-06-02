/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * Internet Server - Tab Manager Component
 * 
 * This class handles all tab-related operations in the browser:
 * - Creating, switching, and closing tabs
 * - Navigation within tabs (back, forward, refresh)
 * - Tab content loading and URL handling
 * - Tab state management and persistence
 * 
 * Copyright (c) 2025 ZARI CORP
 */

class TabManager {
    constructor() {
        // Store tab references and state
        this.tabs = new Map();
        this.activeTabId = null;
        this.tabCounter = 0;
        
        // DOM element references
        this.tabBar = document.getElementById('tab-bar');
        this.browserContainer = document.getElementById('browser-container');
        this.urlInput = document.getElementById('url-input');
        
        // Bind event handlers
        this._bindEvents();
        
        // Register for tab suspension events
        window.electronAPI.onSuspendInactiveTabs(() => {
            this._suspendInactiveTabs();
        });
    }
    
    /**
     * ███████████████████████████████████████████████████
     * █ Creates a new browser tab with optional URL     █
     * █ Generates unique ID and sets up event handlers  █
     * █ Activates the new tab automatically             █
     * ███████████████████████████████████████████████████
     */
    createTab(url = 'about:blank') {
        // Generate unique tab ID
        this.tabCounter++;
        const tabId = `tab-${this.tabCounter}`;
        
        // Create tab DOM element
        const tabElement = document.createElement('div');
        tabElement.className = 'xp-tab';
        tabElement.dataset.tabId = tabId;
        tabElement.innerHTML = `
            <span class="tab-title">New Tab</span>
            <button class="tab-close">✕</button>
        `;
        
        // Insert before the new tab button
        const newTabButton = document.getElementById('new-tab-button');
        this.tabBar.insertBefore(tabElement, newTabButton);
        
        // Create browser view for this tab
        const viewElement = document.createElement('div');
        viewElement.className = 'browser-view';
        viewElement.id = `${tabId}-view`;
        
        // Create webview for this tab
        const webview = document.createElement('webview');
        webview.id = `webview-${tabId}`;
        webview.className = 'browser-webview';
        webview.src = url;
        webview.setAttribute('webpreferences', 'contextIsolation=yes, javascript=yes');
        webview.setAttribute('allowpopups', 'yes');
        
        // Add to browser container
        viewElement.appendChild(webview);
        this.browserContainer.appendChild(viewElement);
        
        // Store tab data
        this.tabs.set(tabId, {
            id: tabId,
            element: tabElement,
            view: viewElement,
            webview: webview,
            title: 'New Tab',
            url: url,
            favicon: null,
            isSuspended: false
        });
        
        // Set up event listeners for this tab
        this._setupTabEventListeners(tabId);
        
        // Switch to this new tab
        this.switchToTab(tabId);
        
        return tabId;
    }
    
    /**
     * ███████████████████████████████████████████████████
     * █ Switches to a specified tab by ID               █
     * █ Updates active states and URL display           █
     * █ Resumes tab if it was suspended                 █
     * ███████████████████████████████████████████████████
     */
    switchToTab(tabId) {
        if (!this.tabs.has(tabId)) return;
        
        // Deactivate current active tab
        if (this.activeTabId && this.tabs.has(this.activeTabId)) {
            const currentTab = this.tabs.get(this.activeTabId);
            currentTab.element.classList.remove('active');
            currentTab.view.classList.remove('active');
        }
        
        // Activate requested tab
        const tab = this.tabs.get(tabId);
        tab.element.classList.add('active');
        tab.view.classList.add('active');
        
        // Update address bar with tab URL
        this.urlInput.value = tab.url;
        
        // Resume tab if it was suspended
        if (tab.isSuspended) {
            this._resumeTab(tabId);
        }
        
        // Update active tab reference
        this.activeTabId = tabId;
        
        // Update window title with tab title
        document.title = `${tab.title} - Internet Server`;
    }
    
    /**
     * ███████████████████████████████████████████████████
     * █ Closes a tab by ID                             █
     * █ Switches to next available tab if needed       █
     * █ Prevents closing the last tab                  █
     * ███████████████████████████████████████████████████
     */
    closeTab(tabId) {
        if (!this.tabs.has(tabId)) return;
        
        const tab = this.tabs.get(tabId);
        
        // Don't close the last tab
        if (this.tabs.size === 1) {
            // Navigate to blank page instead
            tab.webview.src = 'about:blank';
            tab.title = 'New Tab';
            tab.url = 'about:blank';
            this._updateTabTitle(tabId, 'New Tab');
            this.urlInput.value = '';
            return;
        }
        
        // If closing active tab, switch to another tab
        if (tabId === this.activeTabId) {
            // Find next or previous tab to activate
            let newTabId = null;
            let foundCurrent = false;
            
            // Try to find next tab
            for (const id of this.tabs.keys()) {
                if (foundCurrent) {
                    newTabId = id;
                    break;
                }
                if (id === tabId) {
                    foundCurrent = true;
                }
            }
            
            // If no next tab, try to find previous tab
            if (!newTabId) {
                let prevTabId = null;
                for (const id of this.tabs.keys()) {
                    if (id === tabId) {
                        break;
                    }
                    prevTabId = id;
                }
                newTabId = prevTabId;
            }
            
            // Switch to the new tab before removing the current one
            if (newTabId) {
                this.switchToTab(newTabId);
            }
        }
        
        // Remove tab DOM elements
        tab.element.remove();
        tab.view.remove();
        
        // Remove from tabs collection
        this.tabs.delete(tabId);
    }
    
    /**
     * ███████████████████████████████████████████████████
     * █ Navigates to a URL in the active tab           █
     * █ Handles URL formatting and protocol detection  █
     * █ Updates UI elements after navigation           █
     * ███████████████████████████████████████████████████
     */
    navigateTo(url) {
        if (!this.activeTabId) return;
        
        const tab = this.tabs.get(this.activeTabId);
        
        // Format URL (add http:// if no protocol specified)
        let formattedUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://') && !url.startsWith('about:')) {
            // Check if it's a valid domain name or IP
            if (url.includes('.') || url.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
                formattedUrl = `http://${url}`;
            } else {
                // Treat as a search query
                formattedUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            }
        }
        
        // Update webview source
        tab.webview.src = formattedUrl;
        
        // Update address bar
        this.urlInput.value = formattedUrl;
        
        // Update tab data
        tab.url = formattedUrl;
    }
    
    /**
     * ███████████████████████████████████████████████████
     * █ Refreshes the current active tab               █
     * █ Reloads the webview content                    █
     * ███████████████████████████████████████████████████
     */
    refreshCurrentTab() {
        if (!this.activeTabId) return;
        
        const tab = this.tabs.get(this.activeTabId);
        tab.webview.reload();
    }
    
    /**
     * ███████████████████████████████████████████████████
     * █ Navigates backward in the active tab           █
     * █ Uses webview's back() method if available      █
     * ███████████████████████████████████████████████████
     */
    goBack() {
        if (!this.activeTabId) return;
        
        const tab = this.tabs.get(this.activeTabId);
        if (tab.webview.canGoBack()) {
            tab.webview.goBack();
        }
    }
    
    /**
     * ███████████████████████████████████████████████████
     * █ Navigates forward in the active tab            █
     * █ Uses webview's forward() method if available   █
     * ███████████████████████████████████████████████████
     */
    goForward() {
        if (!this.activeTabId) return;
        
        const tab = this.tabs.get(this.activeTabId);
        if (tab.webview.canGoForward()) {
            tab.webview.goForward();
        }
    }
    
    /**
     * ███████████████████████████████████████████████████
     * █ Navigates to the configured home page          █
     * █ Default is about:blank if no home configured   █
     * ███████████████████████████████████████████████████
     */
    goHome() {
        // Get home page from config or use default
        window.electronAPI.getConfig().then(config => {
            const homePage = config.homePage || 'about:blank';
            this.navigateTo(homePage);
        });
    }
    
    /**
     * ███████████████████████████████████████████████████
     * █ Private: Sets up event listeners for tabs      █
     * █ Handles webview navigation events              █
     * █ Updates tab UI based on content loading        █
     * ███████████████████████████████████████████████████
     */
    _setupTabEventListeners(tabId) {
        const tab = this.tabs.get(tabId);
        
        // Tab element click - switch to this tab
        tab.element.addEventListener('click', (event) => {
            // Ignore if click was on close button
            if (event.target.closest('.tab-close')) return;
            
            this.switchToTab(tabId);
        });
        
        // Tab close button
        const closeButton = tab.element.querySelector('.tab-close');
        closeButton.addEventListener('click', () => {
            this.closeTab(tabId);
            
            // Play sound when tab is closed
            if (window.soundManager && window.soundManager.isEnabled()) {
                window.soundManager.play('tab-close');
            }
        });
        
        // Webview events
        tab.webview.addEventListener('did-start-loading', () => {
            // Show loading indicator
            const tabTitle = tab.element.querySelector('.tab-title');
            tabTitle.textContent = 'Loading...';
            
            // Update status bar
            document.querySelector('.status-text').textContent = `Loading: ${tab.url}`;
        });
        
        tab.webview.addEventListener('did-finish-load', () => {
            // Update URL in address bar if this is the active tab
            if (tabId === this.activeTabId) {
                this.urlInput.value = tab.webview.getURL();
            }
            
            // Update tab URL
            tab.url = tab.webview.getURL();
            
            // Update status bar
            document.querySelector('.status-text').textContent = 'Ready';
        });
        
        tab.webview.addEventListener('page-title-updated', (event) => {
            const title = event.title;
            tab.title = title;
            this._updateTabTitle(tabId, title);
            
            // Update window title if this is the active tab
            if (tabId === this.activeTabId) {
                document.title = `${title} - Internet Server`;
            }
        });
        
        tab.webview.addEventListener('page-favicon-updated', (event) => {
            const favicon = event.favicons[0];
            tab.favicon = favicon;
            
            // TODO: Implement favicon display in tabs
        });
        
        tab.webview.addEventListener('new-window', (event) => {
            // Create a new tab for the requested popup/link
            const newTabId = this.createTab(event.url);
            
            // Play sound when new tab is created
            if (window.soundManager && window.soundManager.isEnabled()) {
                window.soundManager.play('tab-open');
            }
        });
    }
    
    /**
     * ███████████████████████████████████████████████████
     * █ Private: Updates the displayed tab title       █
     * █ Truncates title if too long                    █
     * █ Updates DOM element with new title             █
     * ███████████████████████████████████████████████████
     */
    _updateTabTitle(tabId, title) {
        const tab = this.tabs.get(tabId);
        const tabTitle = tab.element.querySelector('.tab-title');
        
        // Truncate title if too long
        const maxLength = 20;
        let displayTitle = title;
        if (title.length > maxLength) {
            displayTitle = title.substring(0, maxLength) + '...';
        }
        
        tabTitle.textContent = displayTitle;
        tabTitle.title = title; // Full title on hover
    }
    
    /**
     * ███████████████████████████████████████████████████
     * █ Private: Suspends inactive tabs to save memory █
     * █ Preserves tab state for later resumption       █
     * █ Called when system memory is under pressure    █
     * ███████████████████████████████████████████████████
     */
    _suspendInactiveTabs() {
        // Skip active tab, suspend all others
        for (const [tabId, tab] of this.tabs.entries()) {
            if (tabId !== this.activeTabId && !tab.isSuspended) {
                // Store current tab state
                tab.suspendedUrl = tab.webview.getURL();
                
                // Replace webview content with placeholder
                tab.webview.src = 'about:blank';
                tab.isSuspended = true;
                
                // Add visual indicator that tab is suspended
                tab.element.classList.add('suspended');
                
                console.log(`Suspended tab: ${tabId} (${tab.title})`);
            }
        }
    }
    
    /**
     * ███████████████████████████████████████████████████
     * █ Private: Resumes a suspended tab               █
     * █ Restores previous URL and state                █
     * █ Called when switching to a suspended tab       █
     * ███████████████████████████████████████████████████
     */
    _resumeTab(tabId) {
        const tab = this.tabs.get(tabId);
        
        if (tab && tab.isSuspended) {
            // Restore the previous URL
            tab.webview.src = tab.suspendedUrl;
            tab.isSuspended = false;
            
            // Remove suspended visual indicator
            tab.element.classList.remove('suspended');
            
            console.log(`Resumed tab: ${tabId} (${tab.title})`);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████
     * █ Private: Binds global events for tab management█
     * █ Sets up tab bar event handling                 █
     * █ Handles messages from main process             █
     * ███████████████████████████████████████████████████
     */
    _bindEvents() {
        // Handle tabs created from main process
        window.electronAPI.onCreateTab((url) => {
            this.createTab(url);
        });
        
        // Handle tab closing from main process
        window.electronAPI.onCloseTab((tabId) => {
            this.closeTab(tabId);
        });
    }
}

// Make TabManager globally available
window.tabManager = window.tabManager || new TabManager();
