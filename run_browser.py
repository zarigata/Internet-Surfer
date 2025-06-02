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
                                                                                                                     
Launch script for Internet Server Browser - Cross-platform XP Style Browser
Copyright (c) 2025 ZARI CORP - All Rights Reserved

[+] Cross-platform launcher for Windows and Linux
[+] Virtual environment setup and dependency management
[+] Electron application wrapper
[+] Development environment configuration
"""

import os
import sys
import platform
import subprocess
import json
import argparse
import shutil
from pathlib import Path
import venv
import time

# ███████████████████████████████████████████████████████████████
# █ CONFIGURATION VARIABLES                                     █
# █ Adjust these settings to match your environment             █
# ███████████████████████████████████████████████████████████████

# Base directory is the script location
BASE_DIR = Path(__file__).resolve().parent
VENV_DIR = BASE_DIR / ".venv"
NODE_MODULES = BASE_DIR / "node_modules"
PACKAGE_JSON = BASE_DIR / "package.json"

# OS detection
IS_WINDOWS = platform.system() == "Windows"
IS_LINUX = platform.system() == "Linux"

# Command prefixes
VENV_PYTHON = str(VENV_DIR / ("Scripts" if IS_WINDOWS else "bin") / "python")
VENV_PIP = str(VENV_DIR / ("Scripts" if IS_WINDOWS else "bin") / "pip")
NPM_CMD = "npm.cmd" if IS_WINDOWS else "npm"

# Console colors for better UX
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# ███████████████████████████████████████████████████████████████
# █ HELPER FUNCTIONS                                            █
# █ Utility functions for setup and configuration               █
# ███████████████████████████████████████████████████████████████

def print_banner():
    """Display the application banner"""
    banner = f"""
{Colors.CYAN}╔═══════════════════════════════════════════════════════════════════════════╗{Colors.END}
{Colors.CYAN}║{Colors.END} {Colors.BOLD}Internet Server Browser{Colors.END}                                              {Colors.CYAN}║{Colors.END}
{Colors.CYAN}║{Colors.END} {Colors.BLUE}Cross-platform Electron-based browser with Windows XP aesthetics{Colors.END}    {Colors.CYAN}║{Colors.END}
{Colors.CYAN}║{Colors.END} {Colors.GREEN}Version: 1.0.0{Colors.END}                                                      {Colors.CYAN}║{Colors.END}
{Colors.CYAN}╚═══════════════════════════════════════════════════════════════════════════╝{Colors.END}
"""
    print(banner)

def run_command(cmd, cwd=None, shell=False, env=None):
    """Execute a command and return the result"""
    print(f"{Colors.CYAN}[EXEC]{Colors.END} {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    try:
        if isinstance(cmd, str) and not shell:
            cmd = cmd.split()
        
        if env is None:
            env = os.environ.copy()

        process = subprocess.run(
            cmd, 
            cwd=cwd or BASE_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            shell=shell,
            env=env
        )
        
        if process.returncode != 0:
            print(f"{Colors.RED}[ERROR] Command failed with code {process.returncode}{Colors.END}")
            print(f"{Colors.RED}[STDERR] {process.stderr}{Colors.END}")
            return False, process.stdout, process.stderr
        
        return True, process.stdout, process.stderr
    except Exception as e:
        print(f"{Colors.RED}[EXCEPTION] {str(e)}{Colors.END}")
        return False, "", str(e)

def setup_virtual_environment():
    """Create and configure the Python virtual environment"""
    if VENV_DIR.exists():
        print(f"{Colors.BLUE}[INFO]{Colors.END} Virtual environment already exists at {VENV_DIR}")
        return True
    
    print(f"{Colors.GREEN}[+]{Colors.END} Creating Python virtual environment...")
    try:
        venv.create(VENV_DIR, with_pip=True)
        print(f"{Colors.GREEN}[+]{Colors.END} Virtual environment created successfully")
        
        # Install Python dependencies
        success, out, err = run_command([VENV_PIP, "install", "electron-python", "requests", "psutil"])
        if not success:
            return False
            
        print(f"{Colors.GREEN}[+]{Colors.END} Python dependencies installed successfully")
        return True
    except Exception as e:
        print(f"{Colors.RED}[ERROR]{Colors.END} Failed to create virtual environment: {str(e)}")
        return False

def check_node_dependencies():
    """Check if Node.js dependencies are installed"""
    if not NODE_MODULES.exists():
        print(f"{Colors.YELLOW}[WARN]{Colors.END} Node modules not found, installing dependencies...")
        success, out, err = run_command([NPM_CMD, "install"])
        if not success:
            print(f"{Colors.RED}[ERROR]{Colors.END} Failed to install Node.js dependencies")
            return False
        print(f"{Colors.GREEN}[+]{Colors.END} Node.js dependencies installed successfully")
    else:
        print(f"{Colors.BLUE}[INFO]{Colors.END} Node.js dependencies already installed")
    
    return True

def check_ollama_configuration():
    """Check and update Ollama configuration"""
    try:
        if not PACKAGE_JSON.exists():
            print(f"{Colors.RED}[ERROR]{Colors.END} package.json not found!")
            return False
            
        with open(PACKAGE_JSON, 'r') as f:
            package_data = json.load(f)
            
        # Ensure Ollama settings exist and are correct
        if 'config' not in package_data:
            package_data['config'] = {}
            
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
            
        print(f"{Colors.GREEN}[+]{Colors.END} Ollama configuration verified: using {ollama_config['model']} model")
        return True
    except Exception as e:
        print(f"{Colors.RED}[ERROR]{Colors.END} Failed to check Ollama configuration: {str(e)}")
        return False

def check_limiter_components():
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
        for file_path in [limiter_manager, cpu_limiter, memory_limiter, network_throttler, limiter_settings_panel]:
            if not file_path.exists():
                missing_files.append(file_path)
        
        if missing_files:
            print(f"{Colors.YELLOW}[WARN]{Colors.END} Some resource limiter components are missing:")
            for file in missing_files:
                print(f"{Colors.YELLOW}  - {file.relative_to(BASE_DIR)}{Colors.END}")
            return False
        
        print(f"{Colors.GREEN}[+]{Colors.END} Resource limiter components verified")
        return True
    except Exception as e:
        print(f"{Colors.RED}[ERROR]{Colors.END} Failed to check resource limiter components: {str(e)}")
        return False

# ███████████████████████████████████████████████████████████████
# █ MAIN EXECUTION FUNCTIONS                                    █
# █ Core functionality for launching the application            █
# ███████████████████████████████████████████████████████████████

def start_browser(dev_mode=False):
    """Start the Electron browser application"""
    try:
        # Command to run the browser
        cmd = [NPM_CMD, "run", "dev" if dev_mode else "start"]
        
        # Set development flag to enable debugging tools if needed
        os.environ['BROWSER_DEV_MODE'] = '1' if dev_mode else '0'
        
        # Print startup information
        print(f"{Colors.GREEN}[+]{Colors.END} Starting Internet Server Browser - Alpha Version")
        print(f"{Colors.BLUE}[INFO]{Colors.END} Mode: {'Development' if dev_mode else 'Normal'}")
        print(f"{Colors.BLUE}[INFO]{Colors.END} Platform: {platform.system()} {platform.release()}")
        print(f"{Colors.BLUE}[INFO]{Colors.END} Resource limiters: Enabled")
        print(f"{Colors.CYAN}[RUN]{Colors.END} {' '.join(cmd)}")
        
        # Notify user about alpha version
        print(f"{Colors.YELLOW}\n[ALPHA TEST VERSION]{Colors.END} Please report any issues or feedback")
        print(f"{Colors.YELLOW}[INFO]{Colors.END} Use the limiter settings panel to manage system resources\n")
        time.sleep(1)  # Short pause for user to read the message
        
        # Execute in a subprocess so that it doesn't block Python
        env = os.environ.copy()
        if dev_mode:
            env["DEBUG"] = "1"
            
        if IS_WINDOWS:
            # Use subprocess.Popen for Windows
            process = subprocess.Popen(cmd, cwd=BASE_DIR, env=env)
        else:
            # For Linux, start in a separate process group
            process = subprocess.Popen(cmd, cwd=BASE_DIR, env=env, preexec_fn=os.setsid)
            
        print(f"{Colors.GREEN}[+]{Colors.END} Browser started with PID: {process.pid}")
        
        # Wait a moment to ensure the process starts
        time.sleep(2)
        
        # Check if the process is still running
        if process.poll() is None:
            print(f"{Colors.GREEN}[+]{Colors.END} Internet Server Browser is running")
            return True
        else:
            print(f"{Colors.RED}[ERROR]{Colors.END} Browser process terminated unexpectedly with code: {process.returncode}")
            return False
    except Exception as e:
        print(f"{Colors.RED}[ERROR]{Colors.END} Failed to start browser: {str(e)}")
        return False

def main():
    """Main entry point for the launcher"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Internet Server Browser Launcher")
    parser.add_argument("--dev", action="store_true", help="Start in development mode with DevTools")
    parser.add_argument("--reset", action="store_true", help="Reset virtual environment and reinstall dependencies")
    parser.add_argument("--build", choices=['win', 'linux'], help="Build packages for specified platform")
    args = parser.parse_args()
    
    print_banner()
    
    # Reset if requested
    if args.reset:
        print(f"{Colors.YELLOW}[WARN]{Colors.END} Resetting environment as requested...")
        if VENV_DIR.exists():
            shutil.rmtree(VENV_DIR)
        if NODE_MODULES.exists():
            shutil.rmtree(NODE_MODULES)
    
    # Check and setup virtual environment
    if not setup_virtual_environment():
        print(f"{Colors.RED}[FATAL]{Colors.END} Failed to setup Python virtual environment")
        return 1
    
    # Check Node.js dependencies
    if not check_node_dependencies():
        print(f"{Colors.RED}[FATAL]{Colors.END} Failed to install Node.js dependencies")
        return 1
    
    # Check Ollama configuration
    if not check_ollama_configuration():
        print(f"{Colors.YELLOW}[WARN]{Colors.END} Ollama configuration issues detected")
    
    # Verify resource limiter components
    if not check_limiter_components():
        print(f"{Colors.YELLOW}[WARN]{Colors.END} Some resource limiter components may be missing")
        print(f"{Colors.YELLOW}[ACTION]{Colors.END} Installing missing resource limiter dependencies...")
        # Install necessary packages for resource limiters
        success, out, err = run_command([NPM_CMD, "install", "pidusage", "throttle", "http-proxy"])
        if not success:
            print(f"{Colors.RED}[ERROR]{Colors.END} Failed to install resource limiter dependencies")
    
    # Build packages if requested
    if args.build:
        print(f"{Colors.GREEN}[+]{Colors.END} Building packages for {args.build}...")
        success, out, err = run_command([NPM_CMD, "run", f"build:{args.build}"])
        if not success:
            print(f"{Colors.RED}[ERROR]{Colors.END} Build failed")
            return 1
        print(f"{Colors.GREEN}[+]{Colors.END} Build completed successfully")
        return 0
    
    # Start the browser
    start_browser(dev_mode=args.dev)
    
    return 0

# ███████████████████████████████████████████████████████████████
# █ EXECUTION ENTRY POINT                                       █
# █ Execute the main function when script is run directly       █
# ███████████████████████████████████████████████████████████████

if __name__ == "__main__":
    sys.exit(main())
