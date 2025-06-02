#!/usr/bin/env python3
"""
█▀▀ █▀█ █▀▄ █▀▀ ▀▄▀
█▄▄ █▄█ █▄▀ ██▄ █░█

██╗███╗   ██╗████████╗███████╗██████╗ ███╗   ██╗███████╗████████╗    ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗ 
██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗████╗  ██║██╔════╝╚══██╔══╝    ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗
██║██╔██╗ ██║   ██║   █████╗  ██████╔╝██╔██╗ ██║█████╗     ██║       ███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝
██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██║╚██╗██║██╔══╝     ██║       ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗
██║██║ ╚████║   ██║   ███████╗██║  ██║██║ ╚████║███████╗   ██║       ███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║
╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝       ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝
                                                                                                                     
Alpha Testing Launcher for Internet Server Browser - Cross-platform XP Style Browser
Copyright (c) 2025 ZARI CORP - All Rights Reserved

[+] Simplified launcher for alpha testing
[+] Cross-platform support for Windows and Linux
[+] Resource limiter integration verification
[+] Development and packaging options
"""

import os
import sys
import platform
import subprocess
import json
import argparse
from pathlib import Path
import time

# ███████████████████████████████████████████████████████████████
# █ CONFIGURATION VARIABLES                                     █
# █ Adjust these settings to match your environment             █
# ███████████████████████████████████████████████████████████████

# Base directory is the script location
BASE_DIR = Path(__file__).resolve().parent
PACKAGE_JSON = BASE_DIR / "package.json"

# OS detection
IS_WINDOWS = platform.system() == "Windows"
IS_LINUX = platform.system() == "Linux"

# Command prefixes
NPM_CMD = "npm.cmd" if IS_WINDOWS else "npm"

# ███████████████████████████████████████████████████████████████
# █ CONSOLE COLORS                                              █
# █ ANSI color codes for terminal output styling                █
# ███████████████████████████████████████████████████████████████
class Colors:
    HEADER = '\033[95m'    # Purple
    BLUE = '\033[94m'      # Blue
    CYAN = '\033[96m'      # Cyan
    GREEN = '\033[92m'     # Green
    YELLOW = '\033[93m'    # Yellow
    WARNING = '\033[93m'   # Yellow (same as YELLOW, for backwards compatibility)
    RED = '\033[91m'       # Red
    END = '\033[0m'        # Reset all formatting
    BOLD = '\033[1m'       # Bold text
    UNDERLINE = '\033[4m'  # Underlined text

# ███████████████████████████████████████████████████████████████
# █ HELPER FUNCTIONS                                            █
# █ Utility functions for setup and configuration               █
# ███████████████████████████████████████████████████████████████

def print_banner():
    """Display the application banner"""
    banner = f"""
{Colors.CYAN}╔═══════════════════════════════════════════════════════════════════════════╗{Colors.END}
{Colors.CYAN}║{Colors.END} {Colors.BOLD}Internet Server Browser - ALPHA TEST{Colors.END}                                {Colors.CYAN}║{Colors.END}
{Colors.CYAN}║{Colors.END} {Colors.BLUE}Cross-platform Electron-based browser with Windows XP aesthetics{Colors.END}    {Colors.CYAN}║{Colors.END}
{Colors.CYAN}║{Colors.END} {Colors.GREEN}Version: 1.0.0-alpha{Colors.END}                                               {Colors.CYAN}║{Colors.END}
{Colors.CYAN}╚═══════════════════════════════════════════════════════════════════════════╝{Colors.END}
"""
    print(banner)

def run_command(cmd, cwd=None, shell=False, env=None, capture_output=True):
    """Execute a command and return the result"""
    print(f"{Colors.CYAN}[EXEC]{Colors.END} {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    try:
        if isinstance(cmd, str) and not shell:
            cmd = cmd.split()
        
        if env is None:
            env = os.environ.copy()

        if capture_output:
            process = subprocess.run(
                cmd, 
                cwd=cwd or BASE_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                shell=shell,
                env=env
            )
        else:
            # Run without capturing output (directly to terminal)
            process = subprocess.run(
                cmd, 
                cwd=cwd or BASE_DIR,
                shell=shell,
                env=env
            )
        
        return process.returncode == 0
    except Exception as e:
        print(f"{Colors.RED}[ERROR]{Colors.END} {str(e)}")
        return False

def check_dependencies():
    """Check if Node.js dependencies are installed"""
    node_modules = BASE_DIR / "node_modules"
    
    if not node_modules.exists():
        print(f"{Colors.YELLOW}[WARN]{Colors.END} Node modules not found, installing dependencies...")
        if not run_command([NPM_CMD, "install"]):
            print(f"{Colors.RED}[ERROR]{Colors.END} Failed to install Node.js dependencies")
            return False
        print(f"{Colors.GREEN}[+]{Colors.END} Node.js dependencies installed successfully")
    else:
        print(f"{Colors.BLUE}[INFO]{Colors.END} Node.js dependencies already installed")
    
    return True

def verify_limiter_components():
    """Verify resource limiter components are properly installed"""
    try:
        # Check for required limiter files
        limiter_manager = BASE_DIR / "src" / "limiters" / "limiter-manager.js"
        cpu_limiter = BASE_DIR / "src" / "limiters" / "cpu-limiter.js"
        memory_limiter = BASE_DIR / "src" / "limiters" / "memory-limiter.js"
        network_throttler = BASE_DIR / "src" / "limiters" / "network-throttler.js"
        
        # Check UI components
        limiter_settings_panel = BASE_DIR / "src" / "ui" / "components" / "limiter-settings-panel.js"
        
        missing_files = []
        for file_path in [limiter_manager, cpu_limiter, memory_limiter, network_throttler]:
            if not file_path.exists():
                missing_files.append(file_path)
        
        if missing_files:
            print(f"{Colors.YELLOW}[WARN]{Colors.END} Some resource limiter components are missing:")
            for file in missing_files:
                print(f"{Colors.YELLOW}  - {file.relative_to(BASE_DIR)}{Colors.END}")
            
            # Install required packages even if files exist
            print(f"{Colors.YELLOW}[ACTION]{Colors.END} Installing resource limiter dependencies...")
            run_command([NPM_CMD, "install", "--save", "pidusage", "throttle", "http-proxy"])
            
            return len(missing_files) == 0
        
        print(f"{Colors.GREEN}[+]{Colors.END} Resource limiter components verified")
        return True
    except Exception as e:
        print(f"{Colors.RED}[ERROR]{Colors.END} Failed to check resource limiter components: {str(e)}")
        return False

def configure_ollama():
    """Configure Ollama integration with llama3.2 model"""
    try:
        if not PACKAGE_JSON.exists():
            print(f"{Colors.RED}[ERROR]{Colors.END} package.json not found!")
            return False
            
        with open(PACKAGE_JSON, 'r') as f:
            package_data = json.load(f)
            
        # Ensure config section exists
        if 'config' not in package_data:
            package_data['config'] = {}
            
        # Ensure ollama section exists
        if 'ollama' not in package_data['config']:
            package_data['config']['ollama'] = {}
            
        # Set defaults according to user rules
        ollama_config = package_data['config']['ollama']
        if 'model' not in ollama_config or ollama_config['model'] != 'llama3.2':
            ollama_config['model'] = 'llama3.2'
            
        if 'ip' not in ollama_config:
            ollama_config['ip'] = '127.0.0.1'
            
        if 'port' not in ollama_config:
            ollama_config['port'] = '11434'
            
        if 'style' not in ollama_config:
            ollama_config['style'] = 'default'
            
        # Write back any changes
        with open(PACKAGE_JSON, 'w') as f:
            json.dump(package_data, f, indent=2)
            
        print(f"{Colors.GREEN}[+]{Colors.END} Ollama configured: using {ollama_config['model']} model")
        return True
    except Exception as e:
        print(f"{Colors.RED}[ERROR]{Colors.END} Failed to configure Ollama: {str(e)}")
        return False

# ███████████████████████████████████████████████████████████████
# █ MAIN EXECUTION FUNCTIONS                                    █
# █ Core functionality for launching the application            █
# ███████████████████████████████████████████████████████████████

def start_browser(dev_mode=False):
    """Start the Electron browser application"""
    # Set development flag to enable debugging tools if needed
    os.environ['BROWSER_DEV_MODE'] = '1' if dev_mode else '0'
    
    # Print startup information
    print(f"{Colors.GREEN}[+]{Colors.END} Starting Internet Server Browser - Alpha Version")
    print(f"{Colors.BLUE}[INFO]{Colors.END} Mode: {'Development' if dev_mode else 'Normal'}")
    print(f"{Colors.BLUE}[INFO]{Colors.END} Platform: {platform.system()} {platform.release()}")
    print(f"{Colors.BLUE}[INFO]{Colors.END} Resource limiters: Enabled")
    
    # Notify user about alpha version
    print(f"{Colors.YELLOW}\n[ALPHA TEST VERSION]{Colors.END} Please report any issues or feedback")
    print(f"{Colors.YELLOW}[INFO]{Colors.END} Use the limiter settings panel to manage system resources\n")
    time.sleep(1)  # Short pause for user to read the message
    
    # Command to run the browser
    cmd = [NPM_CMD, "run", "dev" if dev_mode else "start"]
    
    # Execute in a subprocess, showing output directly in the terminal
    return run_command(cmd, capture_output=False)

def build_package(platform_name):
    """Build packages for specified platform"""
    if platform_name not in ['win', 'linux']:
        print(f"{Colors.RED}[ERROR]{Colors.END} Invalid platform: {platform_name}")
        return False
        
    print(f"{Colors.GREEN}[+]{Colors.END} Building packages for {platform_name}...")
    return run_command([NPM_CMD, "run", f"build:{platform_name}"], capture_output=False)

def main():
    """Main entry point for the launcher"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Internet Server Browser Alpha Launcher")
    parser.add_argument("--dev", action="store_true", help="Start in development mode with DevTools")
    parser.add_argument("--build", choices=['win', 'linux'], help="Build packages for specified platform")
    parser.add_argument("--verify", action="store_true", help="Verify all components without starting the browser")
    args = parser.parse_args()
    
    print_banner()
    
    # Check Node.js dependencies
    if not check_dependencies():
        print(f"{Colors.RED}[FATAL]{Colors.END} Failed to install Node.js dependencies")
        return 1
    
    # Configure Ollama with llama3.2 model
    if not configure_ollama():
        print(f"{Colors.YELLOW}[WARN]{Colors.END} Ollama configuration issues detected")
    
    # Verify resource limiter components
    verify_limiter_components()
    
    # If only verification was requested, exit here
    if args.verify:
        print(f"{Colors.GREEN}[SUCCESS]{Colors.END} Verification completed")
        return 0
    
    # Build packages if requested
    if args.build:
        if build_package(args.build):
            print(f"{Colors.GREEN}[SUCCESS]{Colors.END} Build completed successfully")
            return 0
        else:
            print(f"{Colors.RED}[ERROR]{Colors.END} Build failed")
            return 1
    
    # Start the browser
    return 0 if start_browser(dev_mode=args.dev) else 1

# ███████████████████████████████████████████████████████████████
# █ EXECUTION ENTRY POINT                                       █
# █ Execute the main function when script is run directly       █
# ███████████████████████████████████████████████████████████████

if __name__ == "__main__":
    sys.exit(main())
