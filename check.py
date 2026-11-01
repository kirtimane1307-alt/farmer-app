"""Farm Management System - Environment & Diagnostics Checker.

Run this script to verify your development environment readiness:
python check.py
"""

import sys
import subprocess
import shutil
import socket

def check_command(cmd, name):
    path = shutil.which(cmd)
    if path:
        try:
            output = subprocess.check_output([cmd, "--version"], stderr=subprocess.STDOUT, text=True).strip()
            print(f"  [OK] {name}: {output.splitlines()[0]} ({path})")
            return True
        except Exception:
            print(f"  [OK] {name}: Found at {path}")
            return True
    else:
        print(f"  [MISSING] {name} is not found in PATH.")
        return False

def check_port(port, service_name):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1.0)
    result = sock.connect_ex(("127.0.0.1", port))
    sock.close()
    if result == 0:
        print(f"  [ACTIVE] Port {port} ({service_name}) is listening.")
    else:
        print(f"  [STANDBY] Port {port} ({service_name}) is free.")

def main():
    print("=" * 60)
    print(" Farm Management System - Diagnostic Environment Check")
    print("=" * 60)
    
    print("\n1. Python Environment:")
    print(f"  Version: {sys.version.split()[0]}")
    print(f"  Executable: {sys.executable}")
    
    print("\n2. CLI Tools:")
    check_command("git", "Git")
    check_command("node", "Node.js")
    check_command("npm", "NPM")
    check_command("docker", "Docker")
    
    print("\n3. Default Port Status:")
    check_port(3000, "Next.js Frontend")
    check_port(8000, "FastAPI Backend")
    check_port(5432, "PostgreSQL Database")

    print("\n" + "=" * 60)
    print(" Diagnostic Check Complete.")
    print("=" * 60)

if __name__ == "__main__":
    main()
