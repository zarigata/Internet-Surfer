# Internet Server Browser
## Cross-Platform XP-Style Browser with Advanced Resource Management

```
█▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
█▄▄ █▄█ █▄▀ ██▄ █░█

██╗███╗   ██╗████████╗███████╗██████╗ ███╗   ██╗███████╗████████╗    ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗ 
██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗████╗  ██║██╔════╝╚══██╔══╝    ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗
██║██╔██╗ ██║   ██║   █████╗  ██████╔╝██╔██╗ ██║█████╗     ██║       ███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝
██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██║╚██╗██║██╔══╝     ██║       ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗
██║██║ ╚████║   ██║   ███████╗██║  ██║██║ ╚████║███████╗   ██║       ███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║
╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝       ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝
```

## Project Vision

Internet Server is a full-featured, cross-platform desktop web browser built with Electron, featuring Windows XP retro aesthetics and advanced resource management capabilities. The browser aims to combine nostalgia with modern browsing features, extensive customization options, and a powerful plugin system.

### Core Principles

1. **Retro Aesthetics with Modern Functionality**: Windows XP-inspired interface with modern web browsing capabilities
2. **Resource Control**: Fine-grained control over CPU, RAM, and network usage
3. **Extensibility**: Comprehensive plugin system for unlimited customization
4. **Cross-Platform**: Fully functional on both Windows and Linux systems
5. **Gaming-Friendly**: Features optimized for gamers including overlays and stream integration

## Technical Architecture

### Technology Stack

- **Core Framework**: Electron (JavaScript/HTML/CSS)
- **Backend**: Node.js
- **Environment Management**: Python virtual environment
- **Plugin System**: Custom JavaScript plugin architecture
- **AI Integration**: Ollama with llama3.2 model
- **Packaging**: Electron Builder

### Component Architecture

```
╔════════════════════════════════════════╗
║             Main Process                ║
║ ┌──────────────┐     ┌───────────────┐ ║
║ │ Core Browser │     │ Plugin Loader │ ║
║ └──────────────┘     └───────────────┘ ║
║ ┌──────────────┐     ┌───────────────┐ ║
║ │ Resource     │     │ IPC Bridge    │ ║
║ │ Limiters     │     │               │ ║
║ └──────────────┘     └───────────────┘ ║
╚════════════════════════════════════════╝
                  │
                  ▼
╔════════════════════════════════════════╗
║           Renderer Process              ║
║ ┌──────────────┐     ┌───────────────┐ ║
║ │ Browser UI   │     │ Plugin UI     │ ║
║ └──────────────┘     └───────────────┘ ║
║ ┌──────────────┐     ┌───────────────┐ ║
║ │ Resource     │     │ Sound Manager │ ║
║ │ Monitor      │     │               │ ║
║ └──────────────┘     └───────────────┘ ║
╚════════════════════════════════════════╝
```

## Core Features

### 1. Resource Management System

The browser includes sophisticated resource limiters for precise control over system resource usage:

#### CPU Limiter
- Real-time CPU monitoring
- Configurable CPU percentage cap
- Intelligent throttling algorithm
- Process priority control
- Cross-platform implementation (Windows/Linux)

#### Memory Limiter
- Advanced memory management
- Per-tab memory limiting
- Garbage collection optimization
- Memory leak detection
- Tab memory usage visualization

#### Network Throttler
- Full HTTP/HTTPS proxy implementation
- Download/upload speed limiting
- Network conditions simulation (latency, packet loss)
- Predefined network profiles (4G, 3G, dial-up, etc.)
- Domain exclusion support

### 2. Sound Management System

The browser features a complete sound system for UI events and notifications:

- Multiple sound themes support
- Volume control and theme switching
- Sound settings dialog UI
- Hover sound effects with debounce
- Custom sound theme creation

### 3. Plugin System

A powerful and extensible plugin architecture allows for unlimited customization:

- Plugin discovery and loading
- Permission-based API access
- Isolated storage per plugin
- UI component integration (sidebars, toolbars, etc.)
- Messaging system between plugins and browser

#### Sample Plugins

**Weather Plugin**
- Real-time weather information
- 5-day forecast display
- Weather alerts as notifications
- Customizable location settings
- XP-styled sidebar and toolbar components

**Future Planned Plugins**
- Twitch/Discord integration
- Gaming overlays
- Performance monitoring
- Theme editor
- Note-taking system

### 4. Windows XP Interface

The browser faithfully recreates the Windows XP aesthetic:

- Classic XP window controls
- Start menu-inspired navigation
- Luna blue theme as default
- Skeuomorphic UI elements
- Classic XP sound effects
- Customizable themes

### 5. Cross-Platform Support

The browser is designed to work seamlessly on multiple platforms:

- Windows support (primary target)
- Linux compatibility
- Platform-specific optimizations
- Unified codebase
- Python launcher for cross-platform setup

## Technical Implementation Details

### Resource Limiters

The resource limiting system uses several advanced techniques:

- CPU limiting via process priority and throttling
- Memory management through garbage collection forcing and tab monitoring
- Network limiting via a custom HTTP/HTTPS proxy

### Plugin Architecture

Plugins are loaded dynamically and run in a sandboxed environment:

```javascript
// Plugin API exposure
{
  storage: {
    get: (key) => { /* ... */ },
    set: (key, value) => { /* ... */ }
  },
  browser: {
    createTab: (url) => { /* ... */ },
    notify: (options) => { /* ... */ }
  },
  ui: {
    registerSidebar: (path) => { /* ... */ },
    registerToolbar: (path) => { /* ... */ }
  }
}
```

### IPC Communication

The browser uses Electron's IPC for communication between processes:

- Main to renderer: Resource usage updates, plugin events
- Renderer to main: User configuration, browser controls
- Plugin to browser: API requests, UI registration

### Ollama Integration

The browser integrates with Ollama for AI features:

- Default model: llama3.2
- Configurable settings (IP, port, model selection)
- Editable configuration via settings panel
- Customizable pre-prompt options

## Development Setup

### Prerequisites

- Node.js 16+
- Python 3.8+
- Electron development tools

### Quick Start

1. Clone the repository
2. Run the Python launcher script:

```bash
python run_browser.py
```

The launcher will automatically:
- Set up a Python virtual environment
- Install necessary dependencies
- Configure Ollama settings
- Launch the browser application

### Development Mode

For development with hot-reloading and debugging:

```bash
python run_browser.py --dev
```

## Project Roadmap

See [STEPS.md](./STEPS.md) for a detailed development roadmap and progress tracking.

## Contributing

The Internet Server Browser welcomes contributions in several areas:

- **Plugin Development**: Create new plugins for added functionality
- **Theme Development**: Design new visual themes for the browser
- **Performance Optimization**: Help improve browser performance
- **Cross-Platform Testing**: Test and improve platform compatibility

## License

MIT License - Copyright © 2025 ZARI CORP
