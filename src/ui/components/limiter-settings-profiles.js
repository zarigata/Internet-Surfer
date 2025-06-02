/**
 * █▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
 * █▄▄ █▄█ █▄▀ ██▄ █░█
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║ Resource Limiter Profiles Controller                          ║
 * ║ Handles resource profiles for CPU, memory, and network limits ║
 * ║ Part of the XP-style Resource Limiter Settings Panel          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * FEATURES:
 * - [+] Predefined profile management
 * - [+] Custom profile creation and saving
 * - [+] Profile selection and application
 * - [+] Profile details display
 * - [+] XP-style UI integration
 * - [+] Cross-platform compatibility
 * 
 * Copyright (c) 2025 ZARI CORP - All Rights Reserved
 */

const { ipcRenderer } = require('electron');

/**
 * ███████████████████████████████████████████████████████████████
 * █ Resource Limiter Profiles Controller                        █
 * █ Manages resource profiles in the limiter settings panel     █
 * ███████████████████████████████████████████████████████████████
 */
class LimiterProfilesSettings {
    constructor() {
        // Element references
        this.profileList = document.getElementById('profile-list');
        this.profileDetails = document.getElementById('profile-details');
        this.saveProfileButton = document.getElementById('save-profile-button');
        this.newProfileButton = document.getElementById('new-profile-button');
        this.profileNameInput = document.getElementById('profile-name');
        this.profileDescriptionInput = document.getElementById('profile-description');
        
        // Current profile selection
        this.selectedProfile = null;
        this.isNewProfile = false;
        
        // Predefined profiles
        this.predefinedProfiles = {
            'performance': {
                name: 'Performance',
                description: 'Maximizes browser performance with minimal resource restrictions.',
                icon: 'performance',
                settings: {
                    cpu: { enabled: false, maxCpuPercent: 100, priority: 'high' },
                    memory: { enabled: false, maxMemoryPercent: 80, perTabLimit: false, perTabLimitMB: 500 },
                    network: { enabled: false, profileName: 'fiber' }
                }
            },
            'balanced': {
                name: 'Balanced',
                description: 'Provides a balance between performance and resource usage.',
                icon: 'balanced',
                settings: {
                    cpu: { enabled: true, maxCpuPercent: 70, priority: 'normal' },
                    memory: { enabled: true, maxMemoryPercent: 60, perTabLimit: true, perTabLimitMB: 300 },
                    network: { enabled: false, profileName: 'cable' }
                }
            },
            'efficiency': {
                name: 'Efficiency',
                description: 'Optimizes for reduced resource usage and extended battery life.',
                icon: 'efficiency',
                settings: {
                    cpu: { enabled: true, maxCpuPercent: 50, priority: 'below_normal' },
                    memory: { enabled: true, maxMemoryPercent: 40, perTabLimit: true, perTabLimitMB: 150 },
                    network: { enabled: true, profileName: 'dsl' }
                }
            },
            'gaming': {
                name: 'Gaming Mode',
                description: 'Restricts browser resources to prioritize gaming performance.',
                icon: 'gaming',
                settings: {
                    cpu: { enabled: true, maxCpuPercent: 30, priority: 'below_normal' },
                    memory: { enabled: true, maxMemoryPercent: 30, perTabLimit: true, perTabLimitMB: 100 },
                    network: { enabled: true, profileName: '3g' }
                }
            },
            'streaming': {
                name: 'Streaming Mode',
                description: 'Prioritizes network for video streaming while limiting other resources.',
                icon: 'streaming',
                settings: {
                    cpu: { enabled: true, maxCpuPercent: 60, priority: 'normal' },
                    memory: { enabled: true, maxMemoryPercent: 50, perTabLimit: false, perTabLimitMB: 300 },
                    network: { enabled: false, profileName: 'fiber' }
                }
            },
            'custom': {
                name: 'Custom',
                description: 'User-defined resource limits.',
                icon: 'custom',
                settings: {}
            }
        };
        
        // Custom profiles
        this.customProfiles = {};
        
        // Initialize
        this.init();
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Initialize profiles controller                              █
     * █ Sets up event listeners and loads profiles                  █
     * ███████████████████████████████████████████████████████████████
     */
    init() {
        // Load custom profiles
        this._loadCustomProfiles();
        
        // Populate profile list
        this._populateProfileList();
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Select default profile
        this.selectProfile('balanced');
        
        console.log('[Profiles] Initialized');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Select profile                                              █
     * █ Selects and displays a profile                              █
     * ███████████████████████████████████████████████████████████████
     */
    selectProfile(profileId) {
        // Clear new profile flag
        this.isNewProfile = false;
        
        // Get profile data
        let profile;
        if (this.predefinedProfiles[profileId]) {
            profile = this.predefinedProfiles[profileId];
            this.selectedProfile = { id: profileId, isPredefined: true, ...profile };
        } else if (this.customProfiles[profileId]) {
            profile = this.customProfiles[profileId];
            this.selectedProfile = { id: profileId, isPredefined: false, ...profile };
        } else {
            console.error('[Profiles] Profile not found:', profileId);
            return;
        }
        
        // Update selected item in list
        const items = this.profileList.querySelectorAll('.xp-profile-item');
        for (const item of items) {
            item.classList.toggle('selected', item.dataset.profileId === profileId);
        }
        
        // Display profile details
        this._displayProfileDetails(profile, profileId);
        
        console.log('[Profiles] Selected profile:', profileId);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Apply profile                                               █
     * █ Applies selected profile settings to all limiters           █
     * ███████████████████████████████████████████████████████████████
     */
    async applyProfile() {
        if (!this.selectedProfile) {
            console.error('[Profiles] No profile selected');
            return;
        }
        
        try {
            // Apply profile settings to all limiters
            await ipcRenderer.invoke('apply-limiter-profile', {
                profileId: this.selectedProfile.id,
                settings: this.selectedProfile.settings
            });
            
            console.log('[Profiles] Applied profile:', this.selectedProfile.id);
            
            // Refresh other tabs
            window.dispatchEvent(new CustomEvent('profile-applied', {
                detail: { profileId: this.selectedProfile.id }
            }));
            
            // Show confirmation message
            this._showMessage(`Profile "${this.selectedProfile.name}" applied successfully!`);
        } catch (error) {
            console.error('[Profiles] Error applying profile:', error);
            this._showMessage('Error applying profile.', 'error');
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ New profile                                                 █
     * █ Sets up UI for creating a new custom profile                █
     * ███████████████████████████████████████████████████████████████
     */
    newProfile() {
        // Set new profile flag
        this.isNewProfile = true;
        
        // Clear selection in list
        const items = this.profileList.querySelectorAll('.xp-profile-item');
        for (const item of items) {
            item.classList.remove('selected');
        }
        
        // Set up empty profile
        const emptyProfile = {
            name: '',
            description: '',
            icon: 'custom',
            settings: {}
        };
        
        // Display empty profile details for editing
        this._displayProfileDetails(emptyProfile, 'new', true);
        
        console.log('[Profiles] Setting up new profile');
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Save profile                                                █
     * █ Saves current profile settings                              █
     * ███████████████████████████████████████████████████████████████
     */
    async saveProfile() {
        // Get profile name and description
        const name = this.profileNameInput.value.trim();
        const description = this.profileDescriptionInput.value.trim();
        
        // Validate
        if (!name) {
            this._showMessage('Profile name is required.', 'error');
            return;
        }
        
        try {
            // Get current limiter settings
            const currentSettings = await ipcRenderer.invoke('get-limiter-settings');
            
            // Create profile object
            const profile = {
                name,
                description,
                icon: 'custom',
                settings: currentSettings
            };
            
            // Generate ID from name
            let profileId;
            if (this.isNewProfile) {
                // For new profile, create ID from name
                profileId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                
                // Check for duplicate ID
                if (this.predefinedProfiles[profileId] || this.customProfiles[profileId]) {
                    // Append timestamp to ensure uniqueness
                    profileId += '_' + Date.now();
                }
            } else {
                // For existing profile, use current ID
                profileId = this.selectedProfile.id;
            }
            
            // Add to custom profiles
            this.customProfiles[profileId] = profile;
            
            // Save custom profiles
            await this._saveCustomProfiles();
            
            // Update profile list
            this._populateProfileList();
            
            // Select the saved profile
            this.selectProfile(profileId);
            
            console.log('[Profiles] Saved profile:', profileId);
            
            // Show confirmation
            this._showMessage(`Profile "${name}" saved successfully!`);
        } catch (error) {
            console.error('[Profiles] Error saving profile:', error);
            this._showMessage('Error saving profile.', 'error');
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Delete profile                                              █
     * █ Deletes the selected custom profile                         █
     * ███████████████████████████████████████████████████████████████
     */
    async deleteProfile() {
        if (!this.selectedProfile || this.selectedProfile.isPredefined) {
            this._showMessage('Cannot delete predefined profiles.', 'error');
            return;
        }
        
        try {
            // Confirm deletion
            if (!confirm(`Are you sure you want to delete the profile "${this.selectedProfile.name}"?`)) {
                return;
            }
            
            // Remove from custom profiles
            delete this.customProfiles[this.selectedProfile.id];
            
            // Save custom profiles
            await this._saveCustomProfiles();
            
            // Update profile list
            this._populateProfileList();
            
            // Select default profile
            this.selectProfile('balanced');
            
            console.log('[Profiles] Deleted profile:', this.selectedProfile.id);
            
            // Show confirmation
            this._showMessage('Profile deleted successfully!');
        } catch (error) {
            console.error('[Profiles] Error deleting profile:', error);
            this._showMessage('Error deleting profile.', 'error');
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Display profile details                            █
     * █ Updates UI with profile information                         █
     * ███████████████████████████████████████████████████████████████
     */
    _displayProfileDetails(profile, profileId, isEditing = false) {
        // Clear previous content
        this.profileDetails.innerHTML = '';
        
        // Create profile description section
        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'xp-profile-description';
        
        // Profile icon
        const iconDiv = document.createElement('div');
        iconDiv.className = `xp-profile-icon ${profile.icon}`;
        descriptionDiv.appendChild(iconDiv);
        
        // Profile details container
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'xp-profile-details';
        
        // If editing mode, show input fields
        if (isEditing) {
            // Name input
            const nameLabel = document.createElement('label');
            nameLabel.textContent = 'Profile Name:';
            nameLabel.className = 'xp-form-label';
            detailsDiv.appendChild(nameLabel);
            
            this.profileNameInput = document.createElement('input');
            this.profileNameInput.type = 'text';
            this.profileNameInput.value = profile.name;
            this.profileNameInput.className = 'xp-input';
            this.profileNameInput.maxLength = 50;
            detailsDiv.appendChild(this.profileNameInput);
            
            // Description input
            const descLabel = document.createElement('label');
            descLabel.textContent = 'Description:';
            descLabel.className = 'xp-form-label';
            detailsDiv.appendChild(descLabel);
            
            this.profileDescriptionInput = document.createElement('textarea');
            this.profileDescriptionInput.value = profile.description;
            this.profileDescriptionInput.className = 'xp-textarea';
            this.profileDescriptionInput.rows = 3;
            this.profileDescriptionInput.maxLength = 200;
            detailsDiv.appendChild(this.profileDescriptionInput);
            
            // Add note about profile settings
            const noteDiv = document.createElement('div');
            noteDiv.textContent = 'Current limiter settings will be saved with this profile.';
            noteDiv.style.marginTop = '10px';
            noteDiv.style.fontSize = '11px';
            noteDiv.style.fontStyle = 'italic';
            noteDiv.style.color = '#666666';
            detailsDiv.appendChild(noteDiv);
        } else {
            // Display name and description
            const nameHeader = document.createElement('h3');
            nameHeader.textContent = profile.name;
            detailsDiv.appendChild(nameHeader);
            
            const descPara = document.createElement('p');
            descPara.textContent = profile.description;
            detailsDiv.appendChild(descPara);
            
            // Add profile specs table if we have settings
            if (profile.settings && Object.keys(profile.settings).length > 0) {
                const specsTable = document.createElement('table');
                specsTable.className = 'xp-profile-specs';
                
                // CPU settings
                if (profile.settings.cpu) {
                    const cpuRow = document.createElement('tr');
                    const cpuLabel = document.createElement('th');
                    cpuLabel.textContent = 'CPU Limit:';
                    cpuRow.appendChild(cpuLabel);
                    
                    const cpuValue = document.createElement('td');
                    if (profile.settings.cpu.enabled) {
                        cpuValue.textContent = `${profile.settings.cpu.maxCpuPercent}%`;
                    } else {
                        cpuValue.textContent = 'Disabled';
                    }
                    cpuRow.appendChild(cpuValue);
                    specsTable.appendChild(cpuRow);
                }
                
                // Memory settings
                if (profile.settings.memory) {
                    const memRow = document.createElement('tr');
                    const memLabel = document.createElement('th');
                    memLabel.textContent = 'Memory Limit:';
                    memRow.appendChild(memLabel);
                    
                    const memValue = document.createElement('td');
                    if (profile.settings.memory.enabled) {
                        memValue.textContent = `${profile.settings.memory.maxMemoryPercent}%`;
                    } else {
                        memValue.textContent = 'Disabled';
                    }
                    memRow.appendChild(memValue);
                    specsTable.appendChild(memRow);
                }
                
                // Network settings
                if (profile.settings.network) {
                    const netRow = document.createElement('tr');
                    const netLabel = document.createElement('th');
                    netLabel.textContent = 'Network:';
                    netRow.appendChild(netLabel);
                    
                    const netValue = document.createElement('td');
                    if (profile.settings.network.enabled) {
                        netValue.textContent = profile.settings.network.profileName.charAt(0).toUpperCase() + 
                                            profile.settings.network.profileName.slice(1);
                    } else {
                        netValue.textContent = 'Unlimited';
                    }
                    netRow.appendChild(netValue);
                    specsTable.appendChild(netRow);
                }
                
                detailsDiv.appendChild(specsTable);
            }
        }
        
        descriptionDiv.appendChild(detailsDiv);
        this.profileDetails.appendChild(descriptionDiv);
        
        // Add buttons
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'xp-buttons';
        
        if (isEditing) {
            // Save button
            const saveButton = document.createElement('button');
            saveButton.textContent = 'Save Profile';
            saveButton.className = 'xp-button';
            saveButton.addEventListener('click', () => this.saveProfile());
            buttonsDiv.appendChild(saveButton);
            
            // Cancel button
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.className = 'xp-button';
            cancelButton.addEventListener('click', () => {
                if (this.isNewProfile) {
                    this.selectProfile('balanced');
                } else {
                    this.selectProfile(this.selectedProfile.id);
                }
            });
            buttonsDiv.appendChild(cancelButton);
        } else {
            // Apply button
            const applyButton = document.createElement('button');
            applyButton.textContent = 'Apply Profile';
            applyButton.className = 'xp-button';
            applyButton.addEventListener('click', () => this.applyProfile());
            buttonsDiv.appendChild(applyButton);
            
            // Edit button (only for custom profiles)
            if (!this.predefinedProfiles[profileId]) {
                const editButton = document.createElement('button');
                editButton.textContent = 'Edit';
                editButton.className = 'xp-button';
                editButton.addEventListener('click', () => {
                    this._displayProfileDetails(profile, profileId, true);
                });
                buttonsDiv.appendChild(editButton);
                
                // Delete button (only for custom profiles)
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.className = 'xp-button';
                deleteButton.addEventListener('click', () => this.deleteProfile());
                buttonsDiv.appendChild(deleteButton);
            }
        }
        
        this.profileDetails.appendChild(buttonsDiv);
        
        // Message area for notifications
        const messageDiv = document.createElement('div');
        messageDiv.id = 'profile-message';
        messageDiv.className = 'hidden';
        this.profileDetails.appendChild(messageDiv);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Populate profile list                              █
     * █ Creates profile list items in the sidebar                   █
     * ███████████████████████████████████████████████████████████████
     */
    _populateProfileList() {
        // Clear existing items
        this.profileList.innerHTML = '';
        
        // Add predefined profiles
        for (const [id, profile] of Object.entries(this.predefinedProfiles)) {
            this._addProfileListItem(id, profile, true);
        }
        
        // Add divider if we have custom profiles
        if (Object.keys(this.customProfiles).length > 0) {
            const divider = document.createElement('div');
            divider.className = 'xp-list-divider';
            this.profileList.appendChild(divider);
            
            // Add custom profiles
            for (const [id, profile] of Object.entries(this.customProfiles)) {
                this._addProfileListItem(id, profile, false);
            }
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Add profile list item                              █
     * █ Creates and adds a single profile item to the list          █
     * ███████████████████████████████████████████████████████████████
     */
    _addProfileListItem(id, profile, isPredefined) {
        const item = document.createElement('div');
        item.className = 'xp-profile-item';
        item.dataset.profileId = id;
        
        // If this is the currently selected profile, mark as selected
        if (this.selectedProfile && this.selectedProfile.id === id) {
            item.classList.add('selected');
        }
        
        // Create icon
        const icon = document.createElement('div');
        icon.className = `xp-profile-item-icon ${profile.icon}`;
        item.appendChild(icon);
        
        // Create name
        const name = document.createElement('div');
        name.className = 'xp-profile-item-name';
        name.textContent = profile.name;
        item.appendChild(name);
        
        // Add click handler
        item.addEventListener('click', () => {
            this.selectProfile(id);
        });
        
        // Add to list
        this.profileList.appendChild(item);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Show message                                       █
     * █ Displays a notification message                             █
     * ███████████████████████████████████████████████████████████████
     */
    _showMessage(text, type = 'success') {
        const messageDiv = document.getElementById('profile-message');
        if (!messageDiv) return;
        
        // Set message text and type
        messageDiv.textContent = text;
        messageDiv.className = `xp-message ${type}`;
        
        // Show message
        messageDiv.classList.remove('hidden');
        
        // Auto-hide after timeout
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 3000);
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Set up event listeners                             █
     * █ Attaches event handlers to UI controls                      █
     * ███████████████████████████████████████████████████████████████
     */
    _setupEventListeners() {
        // New profile button
        if (this.newProfileButton) {
            this.newProfileButton.addEventListener('click', () => {
                this.newProfile();
            });
        }
        
        // Listen for profile-applied events from other tabs
        window.addEventListener('profile-applied', (event) => {
            console.log('[Profiles] Profile applied event received:', event.detail.profileId);
        });
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Load custom profiles                               █
     * █ Loads saved custom profiles from main process               █
     * ███████████████████████████████████████████████████████████████
     */
    async _loadCustomProfiles() {
        try {
            // Get custom profiles from main process
            const profiles = await ipcRenderer.invoke('get-custom-profiles');
            
            if (profiles && typeof profiles === 'object') {
                this.customProfiles = profiles;
                console.log('[Profiles] Loaded custom profiles:', Object.keys(profiles));
            }
        } catch (error) {
            console.error('[Profiles] Error loading custom profiles:', error);
            this.customProfiles = {};
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Private: Save custom profiles                               █
     * █ Saves custom profiles to main process                       █
     * ███████████████████████████████████████████████████████████████
     */
    async _saveCustomProfiles() {
        try {
            // Send custom profiles to main process
            await ipcRenderer.invoke('save-custom-profiles', this.customProfiles);
            console.log('[Profiles] Saved custom profiles');
            return true;
        } catch (error) {
            console.error('[Profiles] Error saving custom profiles:', error);
            return false;
        }
    }
    
    /**
     * ███████████████████████████████████████████████████████████████
     * █ Clean up resources                                          █
     * █ Removes event listeners                                     █
     * ███████████████████████████████████████████████████████████████
     */
    dispose() {
        // Remove event listeners
        window.removeEventListener('profile-applied', () => {});
        
        console.log('[Profiles] Disposed');
    }
}

module.exports = LimiterProfilesSettings;
