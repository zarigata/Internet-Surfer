# Internet Server Browser - Alpha Test Version

```
█▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
█▄▄ █▄█ █▄▀ ██▄ █░█
```

A cross-platform Electron-based web browser with Windows XP aesthetics and advanced resource management features. This alpha version includes fully integrated resource limiters for CPU, memory, and network throttling.

## Features

- 🎮 **Gaming-Focused Resource Management**: Control CPU, RAM, and network usage to optimize performance
- 🎨 **Windows XP Luna Blue Theme**: Classic interface with modern capabilities
- 🛠️ **Customizable Resource Profiles**: Pre-configured profiles for different usage scenarios
- 🧩 **Plugin System**: Extensible architecture with plugin support
- 🔧 **Advanced Diagnostics**: Built-in tools to analyze and optimize performance
- 🔄 **Cross-Platform Compatibility**: Works on both Windows and Linux systems

## Quick Start Guide

### Windows Setup

1. **Prerequisites:**
   - Node.js 18+ (LTS recommended)
   - Windows 10/11 (also runs on Windows 7/8 with limitations)

2. **Installation:**
   ```powershell
   # Clone or extract the repository
   # Navigate to the project directory
   cd path\to\Internet-Server
   
   # Install dependencies
   npm install
   
   # Start the browser
   npm start
   ```

### Linux Setup

1. **Prerequisites:**
   - Node.js 18+ (LTS recommended)
   - Electron dependencies (on Debian/Ubuntu):
     ```bash
     sudo apt-get install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libdrm2 libgbm1
     ```

2. **Installation:**
   ```bash
   # Clone or extract the repository
   # Navigate to the project directory
   cd path/to/Internet-Server
   
   # Install dependencies
   npm install
   
   # Start the browser
   npm start
   ```

### Virtual Environment Setup (Recommended)

For Python-based features, we recommend using a virtual environment:

```bash
# Create a virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate

# Activate it (Linux)
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

## Using the Resource Limiter

1. Click the limiter icon in the toolbar to open the Resource Limiter Settings Panel
2. Choose a preset profile or customize your own settings
3. Adjust CPU, memory, and network limitations based on your needs
4. Monitor real-time resource usage through the status indicators

### Resource Profiles

- **Performance**: Minimal limitations for maximum browser speed
- **Balanced**: Moderate resource usage suitable for daily browsing
- **Efficiency**: Strict limitations to reduce system impact
- **Gaming**: Optimized for background usage while gaming
- **Streaming**: Configured for optimal video streaming performance
- **Custom**: Create your own resource limitation profile

## Development Tools

For developers contributing to or testing the browser:

```bash
# Run in development mode with DevTools
npm run dev

# Build packages
npm run build:win    # For Windows
npm run build:linux  # For Linux
```

## Ollama Integration

The browser includes integration with Ollama for AI-powered features:

```javascript
// Default configuration in package.json
"ollama": {
  "model": "llama3.2",
  "ip": "127.0.0.1", 
  "port": "11434",
  "style": "default"
}
```

You can modify these settings in the Advanced Settings panel.

## Known Issues in Alpha

- Network throttling may require manual proxy configuration on some systems
- Plugin hot-reloading is not fully implemented
- Some UI elements may not perfectly match Windows XP theme on Linux

## Feedback and Testing Focus

During alpha testing, please focus on:

1. Resource limiter functionality and accuracy
2. Cross-platform compatibility issues
3. Plugin system stability
4. UI rendering and performance
5. Memory management effectiveness

Report any issues through the designated feedback channels.

## License

MIT License - Copyright (c) 2025 ZARI CORP
