#!/bin/bash

# Veztra Print Agent - Linux Installation Script
# Usage: sudo bash install.sh

set -e

echo "=== Veztra Print Agent - Linux Installation ==="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
else
    echo "Cannot detect Linux distribution"
    exit 1
fi

echo "Detected OS: $OS $VER"

# Check Node.js installation
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Installing Node.js 18+..."
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt-get update
        apt-get install -y curl gnupg2 lsb-release
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        yum install -y nodejs
    else
        echo "Unsupported distribution: $OS"
        exit 1
    fi
fi

NODE_VERSION=$(node --version)
echo "Found Node.js: $NODE_VERSION"

# Create veztra user and group
echo "Creating veztra user and group..."
if ! id -u veztra > /dev/null 2>&1; then
    useradd -r -s /bin/bash -d /var/lib/veztra-print-agent -m veztra
    echo "Created user: veztra"
else
    echo "User veztra already exists"
fi

# Create directories
echo "Creating directories..."
mkdir -p /opt/veztra-print-agent
mkdir -p /etc/veztra-print-agent
mkdir -p /var/lib/veztra-print-agent
mkdir -p /var/log/veztra-print-agent

# Set permissions
chown -R veztra:veztra /opt/veztra-print-agent
chown -R veztra:veztra /etc/veztra-print-agent
chown -R veztra:veztra /var/lib/veztra-print-agent
chown -R veztra:veztra /var/log/veztra-print-agent
chmod 755 /opt/veztra-print-agent
chmod 755 /etc/veztra-print-agent
chmod 755 /var/lib/veztra-print-agent
chmod 755 /var/log/veztra-print-agent

# Install application files
echo "Installing application files..."
cp -r ./* /opt/veztra-print-agent/
cd /opt/veztra-print-agent

# Install dependencies
echo "Installing npm dependencies..."
npm install --production
npm run build

# Copy systemd service file
echo "Installing systemd service..."
cp platforms/linux/veztra-print-agent.service /etc/systemd/system/
systemctl daemon-reload

# Set correct permissions
chown -R veztra:veztra /opt/veztra-print-agent
chown root:root /etc/systemd/system/veztra-print-agent.service
chmod 644 /etc/systemd/system/veztra-print-agent.service

# Enable and start the service
echo "Enabling systemd service..."
systemctl enable veztra-print-agent.service

echo ""
echo "=== Installation Complete ==="
echo "Service location: /opt/veztra-print-agent"
echo "Config path: /etc/veztra-print-agent"
echo "Logs path: /var/log/veztra-print-agent"
echo "Service URL: http://localhost:5050"
echo ""
echo "To start the service:"
echo "  sudo systemctl start veztra-print-agent"
echo ""
echo "To check status:"
echo "  sudo systemctl status veztra-print-agent"
echo ""
echo "To view logs:"
echo "  sudo journalctl -u veztra-print-agent -f"
echo ""
echo "The service is configured to auto-start on boot."
