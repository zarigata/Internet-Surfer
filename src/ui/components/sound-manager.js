/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * Internet Server - Sound Manager Component
 * 
 * This class handles all audio for the browser:
 * - UI sound effects (button clicks, tab open/close)
 * - Theme sound packs management
 * - Volume control and muting
 * - Custom user sound theme support
 * 
 * Copyright (c) 2025 ZARI CORP
 */

class SoundManager {
    constructor() {
        // Sound enabled state
        this.enabled = true;
        
        // Current sound theme
        this.currentTheme = 'xp_classic';
        
        // Volume level (0.0 to 1.0)
        this.volume = 0.5;
        
        // Mapping of sound IDs to file paths
        this.sounds = {
            // UI Sounds
            'startup': '/src/sounds/xp_classic/startup.mp3',
            'shutdown': '/src/sounds/xp_classic/shutdown.mp3',
            'navigation': '/src/sounds/xp_classic/navigation.mp3',
            'refresh': '/src/sounds/xp_classic/refresh.mp3',
            'tab-open': '/src/sounds/xp_classic/tab_open.mp3',
            'tab-close': '/src/sounds/xp_classic/tab_close.mp3',
            'menu-open': '/src/sounds/xp_classic/menu_open.mp3',
            'menu-close': '/src/sounds/xp_classic/menu_close.mp3',
            'dialog-open': '/src/sounds/xp_classic/dialog_open.mp3',
            'dialog-close': '/src/sounds/xp_classic/dialog_close.mp3',
            'minimize': '/src/sounds/xp_classic/minimize.mp3',
            'maximize': '/src/sounds/xp_classic/maximize.mp3',
            'close': '/src/sounds/xp_classic/close.mp3',
            'error': '/src/sounds/xp_classic/error.mp3',
            'apply': '/src/sounds/xp_classic/apply.mp3',
            'hover': '/src/sounds/xp_classic/hover.mp3'
        };
        
        // Cache of loaded audio objects
        this.audioCache = new Map();
        
        // Currently playing sounds
        this.playingSounds = new Set();
        
        // Settings panel element
        this.settingsPanel = null;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Initializes the sound manager                               █
     * █ Loads configuration and preloads essential sounds           █
     * █ Sets up event listeners for UI sound triggers               █
     * ███████████████████████████████████████████████████████████████
     */
    async init() {
        try {
            // Load configuration
            const config = await window.electronAPI.getConfig();
            this.enabled = config.sounds !== false;
            this.currentTheme = config.soundTheme || 'xp_classic';
            this.volume = config.soundVolume || 0.5;
            
            // Preload common sounds
            this._preloadSounds(['navigation', 'tab-open', 'tab-close', 'menu-open', 'menu-close']);
            
            // Setup hover sound effect for buttons
            if (this.enabled) {
                this._setupHoverSounds();
            }
            
            console.log(`Sound manager initialized. Enabled: ${this.enabled}, Theme: ${this.currentTheme}`);
        } catch (error) {
            console.error('Failed to initialize sound manager:', error);
            this.enabled = false;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Plays a sound by ID                                         █
     * █ Loads the sound if not already cached                       █
     * █ Applies volume settings and manages playback                █
     * ███████████████████████████████████████████████████████████████
     */
    play(soundId) {
        if (!this.enabled || !this.sounds[soundId]) {
            return;
        }
        
        try {
            // Get or create audio object
            let audio = this.audioCache.get(soundId);
            
            if (!audio) {
                // Load and cache the sound
                audio = new Audio();
                audio.src = this.sounds[soundId];
                this.audioCache.set(soundId, audio);
            } else {
                // Reset existing audio to beginning
                audio.currentTime = 0;
            }
            
            // Set volume
            audio.volume = this.volume;
            
            // Play the sound
            const playPromise = audio.play();
            
            // Track playing sound
            this.playingSounds.add(audio);
            
            // Handle play promise (required for some browsers)
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        // Sound started playing successfully
                    })
                    .catch(error => {
                        console.error(`Error playing sound ${soundId}:`, error);
                        this.playingSounds.delete(audio);
                    });
            }
            
            // Remove from playing sounds when finished
            audio.onended = () => {
                this.playingSounds.delete(audio);
            };
        } catch (error) {
            console.error(`Failed to play sound ${soundId}:`, error);
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Stops all currently playing sounds                          █
     * █ Used when navigating away or closing browser                █
     * ███████████████████████████████████████████████████████████████
     */
    stopAllSounds() {
        this.playingSounds.forEach(audio => {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (error) {
                console.error('Error stopping sound:', error);
            }
        });
        
        this.playingSounds.clear();
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Enables or disables sound effects                           █
     * █ Updates configuration and saves to main process             █
     * ███████████████████████████████████████████████████████████████
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        // Stop any playing sounds if disabled
        if (!enabled) {
            this.stopAllSounds();
        }
        
        // Save to config
        window.electronAPI.updateConfig({ sounds: enabled });
        
        return this.enabled;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Toggles sound on/off                                        █
     * █ Returns the new state                                       █
     * ███████████████████████████████████████████████████████████████
     */
    toggle() {
        return this.setEnabled(!this.enabled);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Sets the sound volume                                       █
     * █ Clamps to 0.0-1.0 range                                     █
     * █ Updates configuration                                       █
     * ███████████████████████████████████████████████████████████████
     */
    setVolume(volume) {
        // Clamp volume between 0 and 1
        this.volume = Math.max(0, Math.min(1, volume));
        
        // Save to config
        window.electronAPI.updateConfig({ soundVolume: this.volume });
        
        return this.volume;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Changes the current sound theme                             █
     * █ Updates sound file paths                                    █
     * █ Clears cache and reloads sounds                             █
     * ███████████████████████████████████████████████████████████████
     */
    setTheme(themeName) {
        if (themeName === this.currentTheme) {
            return;
        }
        
        // Stop all sounds
        this.stopAllSounds();
        
        // Clear cache
        this.audioCache.clear();
        
        // Update theme
        this.currentTheme = themeName;
        
        // Update sound paths
        Object.keys(this.sounds).forEach(soundId => {
            const fileName = this.sounds[soundId].split('/').pop();
            this.sounds[soundId] = `/src/sounds/${themeName}/${fileName}`;
        });
        
        // Save to config
        window.electronAPI.updateConfig({ soundTheme: themeName });
        
        // Preload common sounds again
        this._preloadSounds(['navigation', 'tab-open', 'tab-close']);
        
        // Play theme changed sound
        this.play('apply');
        
        return this.currentTheme;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Checks if sounds are currently enabled                      █
     * █ Returns the enabled state                                   █
     * ███████████████████████████████████████████████████████████████
     */
    isEnabled() {
        return this.enabled;
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Shows or creates the sound settings panel                   █
     * █ Allows the user to configure sound options                  █
     * █ Includes theme selection and volume control                 █
     * ███████████████████████████████████████████████████████████████
     */
    toggleSettingsPanel() {
        // If panel already exists, toggle visibility
        if (this.settingsPanel) {
            if (this.settingsPanel.classList.contains('active')) {
                this.settingsPanel.classList.remove('active');
                return;
            } else {
                this.settingsPanel.classList.add('active');
                return;
            }
        }
        
        // Create the settings panel
        this.settingsPanel = document.createElement('div');
        this.settingsPanel.className = 'xp-dialog sound-settings-dialog active';
        this.settingsPanel.innerHTML = `
            <div class="xp-dialog-titlebar">
                <span class="xp-dialog-title">Sound Settings</span>
                <button class="xp-dialog-close">✕</button>
            </div>
            <div class="xp-dialog-content">
                <div class="sound-setting">
                    <label for="sound-enabled">
                        <input type="checkbox" id="sound-enabled" ${this.enabled ? 'checked' : ''}>
                        Enable sound effects
                    </label>
                </div>
                
                <div class="sound-setting">
                    <label for="sound-volume">Volume</label>
                    <input type="range" id="sound-volume" min="0" max="100" value="${this.volume * 100}">
                    <span id="sound-volume-value">${Math.round(this.volume * 100)}%</span>
                </div>
                
                <div class="sound-setting">
                    <label>Sound Theme</label>
                    <div class="sound-themes">
                        <div class="sound-theme">
                            <input type="radio" name="sound-theme" id="theme-xp-classic" value="xp_classic" ${this.currentTheme === 'xp_classic' ? 'checked' : ''}>
                            <label for="theme-xp-classic">Windows XP Classic</label>
                        </div>
                        <div class="sound-theme">
                            <input type="radio" name="sound-theme" id="theme-modern" value="modern" ${this.currentTheme === 'modern' ? 'checked' : ''}>
                            <label for="theme-modern">Modern</label>
                        </div>
                        <div class="sound-theme">
                            <input type="radio" name="sound-theme" id="theme-retro" value="retro" ${this.currentTheme === 'retro' ? 'checked' : ''}>
                            <label for="theme-retro">Retro Computing</label>
                        </div>
                        <div class="sound-theme">
                            <input type="radio" name="sound-theme" id="theme-gamer" value="gamer" ${this.currentTheme === 'gamer' ? 'checked' : ''}>
                            <label for="theme-gamer">Gamer</label>
                        </div>
                    </div>
                </div>
                
                <div class="sound-setting sound-test">
                    <label>Test Sounds</label>
                    <div class="sound-test-buttons">
                        <button class="xp-button sound-test-btn" data-sound="navigation">Navigation</button>
                        <button class="xp-button sound-test-btn" data-sound="tab-open">Tab Open</button>
                        <button class="xp-button sound-test-btn" data-sound="error">Error</button>
                        <button class="xp-button sound-test-btn" data-sound="apply">Notification</button>
                    </div>
                </div>
            </div>
            <div class="xp-dialog-buttons">
                <button id="sound-settings-apply" class="xp-button">Apply</button>
                <button id="sound-settings-cancel" class="xp-button">Cancel</button>
            </div>
        `;
        
        // Add to modal container
        const modalContainer = document.getElementById('modal-container');
        modalContainer.appendChild(this.settingsPanel);
        modalContainer.classList.add('active');
        
        // Set up event handlers
        const closeBtn = this.settingsPanel.querySelector('.xp-dialog-close');
        const cancelBtn = this.settingsPanel.querySelector('#sound-settings-cancel');
        const applyBtn = this.settingsPanel.querySelector('#sound-settings-apply');
        const enabledCheckbox = this.settingsPanel.querySelector('#sound-enabled');
        const volumeSlider = this.settingsPanel.querySelector('#sound-volume');
        const volumeValue = this.settingsPanel.querySelector('#sound-volume-value');
        const themeRadios = this.settingsPanel.querySelectorAll('input[name="sound-theme"]');
        const testButtons = this.settingsPanel.querySelectorAll('.sound-test-btn');
        
        // Close/Cancel button
        const closePanel = () => {
            this.settingsPanel.classList.remove('active');
            modalContainer.classList.remove('active');
            this.play('dialog-close');
        };
        
        closeBtn.addEventListener('click', closePanel);
        cancelBtn.addEventListener('click', closePanel);
        
        // Apply button
        applyBtn.addEventListener('click', () => {
            // Get current values
            const enabled = enabledCheckbox.checked;
            const volume = volumeSlider.value / 100;
            
            // Find selected theme
            let selectedTheme = this.currentTheme;
            themeRadios.forEach(radio => {
                if (radio.checked) {
                    selectedTheme = radio.value;
                }
            });
            
            // Apply settings
            this.setEnabled(enabled);
            this.setVolume(volume);
            this.setTheme(selectedTheme);
            
            // Close panel
            closePanel();
        });
        
        // Volume slider
        volumeSlider.addEventListener('input', () => {
            const value = volumeSlider.value;
            volumeValue.textContent = `${value}%`;
        });
        
        // Test sound buttons
        testButtons.forEach(button => {
            button.addEventListener('click', () => {
                const soundId = button.dataset.sound;
                this.play(soundId);
            });
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Preloads a list of sounds into cache               █
     * █ Improves responsiveness for commonly used sounds            █
     * ███████████████████████████████████████████████████████████████
     */
    _preloadSounds(soundIds) {
        if (!this.enabled) return;
        
        soundIds.forEach(soundId => {
            if (this.sounds[soundId] && !this.audioCache.has(soundId)) {
                const audio = new Audio();
                audio.src = this.sounds[soundId];
                this.audioCache.set(soundId, audio);
                
                // Preload by triggering a load but not playing
                audio.load();
            }
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Sets up hover sound effects for UI elements        █
     * █ Adds mouseenter event listeners to buttons                  █
     * █ Uses a debounce to prevent sound spam                       █
     * ███████████████████████████████████████████████████████████████
     */
    _setupHoverSounds() {
        let lastHover = 0;
        const hoverDelay = 50; // ms between hover sounds
        
        // Function to play hover sound with debounce
        const playHoverSound = () => {
            const now = Date.now();
            if (now - lastHover > hoverDelay) {
                this.play('hover');
                lastHover = now;
            }
        };
        
        // Add hover sound to all buttons
        document.addEventListener('mouseover', (event) => {
            const target = event.target;
            
            // Check if target is a button or has button class
            if (
                target.tagName === 'BUTTON' || 
                target.classList.contains('xp-button') ||
                target.classList.contains('xp-menu-item') ||
                target.classList.contains('xp-menu-dropdown-item')
            ) {
                // Don't play for tab close buttons (too annoying)
                if (target.classList.contains('tab-close')) {
                    return;
                }
                
                playHoverSound();
            }
        });
    }
}

// Make SoundManager globally available
window.soundManager = window.soundManager || new SoundManager();
