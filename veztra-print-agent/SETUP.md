# Veztra Print Agent - Setup Guide

## Quick Start

### Windows Installation (5 minutes)

1. **Prerequisites**
   - Node.js 18+ from https://nodejs.org/
   - Administrator privileges

2. **Installation**
   ```powershell
   # Run PowerShell as Administrator
   cd C:\Your\Download\Path
   powershell -ExecutionPolicy Bypass -File platforms\windows\install.ps1
   ```

3. **Verify Installation**
   ```bash
   curl http://localhost:5050/health
   ```

4. **Access Configuration**
   - Shortcut created on Desktop: "Veztra Print Agent"
   - Config path: `%APPDATA%\VeztraPrintAgent`
   - Service runs automatically on Windows startup

### Linux Installation (Ubuntu/Debian)

1. **Prerequisites**
   ```bash
   # Ensure you have sudo access
   sudo apt-get update
   sudo apt-get install -y curl
   ```

2. **Installation**
   ```bash
   cd /tmp
   # Extract the application
   tar -xzf veztra-print-agent-1.0.0.tar.gz
   
   # Run installation script
   sudo bash platforms/linux/install.sh
   ```

3. **Start Service**
   ```bash
   # Start the service
   sudo systemctl start veztra-print-agent
   
   # Verify it's running
   sudo systemctl status veztra-print-agent
   
   # View logs
   sudo journalctl -u veztra-print-agent -f
   ```

4. **Access Configuration**
   - Service path: `/opt/veztra-print-agent`
   - Config path: `/etc/veztra-print-agent`
   - Logs path: `/var/log/veztra-print-agent`
   - Service URL: `http://localhost:5050`

## Service Directory Structure

```
/opt/veztra-print-agent/          # Application (Linux)
├── dist/                         # Compiled TypeScript
│   ├── index.js                 # Main server
│   ├── core/                    # Core services
│   ├── drivers/                 # Printer drivers
│   ├── services/                # Business logic
│   └── routes/                  # API endpoints
├── src/                         # TypeScript sources
├── package.json
└── tsconfig.json

%APPDATA%\VeztraPrintAgent\       # User config (Windows)
├── config.json                  # Service configuration
├── veztra.db                    # SQLite database
└── logs/
    └── service.log              # Application logs

/etc/veztra-print-agent/          # System config (Linux)
└── config.json

/var/lib/veztra-print-agent/      # Data directory (Linux)
└── veztra.db

/var/log/veztra-print-agent/      # Logs (Linux)
└── service.log
```

## Configuration

### Default Configuration

The service uses sensible defaults:
- **Port**: 5050
- **Host**: localhost (for security)
- **Database**: SQLite (local storage)
- **Max Retries**: 3 attempts
- **Retry Delay**: 5 seconds
- **Health Check Interval**: 60 seconds

### Environment Variables

Override defaults using environment variables:

```bash
# Windows PowerShell
$env:PORT = 8080
$env:LOG_LEVEL = "debug"
node dist/index.js

# Linux Bash
export PORT=8080
export LOG_LEVEL=debug
node dist/index.js
```

### Configuration File

Edit configuration at:
- **Windows**: `%APPDATA%\VeztraPrintAgent\config.json`
- **Linux**: `/etc/veztra-print-agent/config.json`

```json
{
  "service": {
    "port": 5050,
    "host": "localhost",
    "apiVersion": "v1"
  },
  "database": {
    "path": "/path/to/veztra.db"
  },
  "logging": {
    "level": "info",
    "maxSize": "10m",
    "maxFiles": 10
  },
  "print": {
    "defaultRetries": 3,
    "defaultRetryDelay": 5000,
    "queueCheckInterval": 2000
  }
}
```

## Supported Printers

### Thermal Printer Brands

- **VMAX** - Generic ESC/POS compatible
- **XPrinter** - ESC/POS compatible, USB & Network
- **Epson** - ESC/POS compatible
- **Rongta** - ESC/POS compatible
- **Generic ESC/POS** - Any thermal printer with ESC/POS support

### Connection Types

1. **USB Connection**
   - Plug & Play detection
   - Auto-detection of vendor/product IDs
   - Fallback to manual VID/PID configuration

2. **Network Connection**
   - TCP/IP protocol (80, 9100, or custom port)
   - Configurable timeout (default 10 seconds)
   - Automatic reconnection on failure

## API Endpoints

### Health & Status

```bash
# Service health check
GET http://localhost:5050/api/v1/health

# System information
GET http://localhost:5050/api/v1/system/info

# Recent logs
GET http://localhost:5050/api/v1/logs?lines=100
```

### Printer Management

```bash
# Get all printers
GET http://localhost:5050/api/v1/printers

# Add printer
POST http://localhost:5050/api/v1/printers
Body: {
  "name": "Receipt Printer",
  "type": "receipt",
  "brand": "xprinter",
  "connectionType": "usb",
  "vendorId": "0x0b3a",
  "productId": "0x0010"
}

# Update printer
PUT http://localhost:5050/api/v1/printers/{id}

# Delete printer
DELETE http://localhost:5050/api/v1/printers/{id}

# Test printer
POST http://localhost:5050/api/v1/printers/{id}/test

# Detect USB printers
GET http://localhost:5050/api/v1/printers/detect/usb
```

### Print Jobs

```bash
# Submit print job
POST http://localhost:5050/api/v1/print
Body: {
  "printerId": "printer-id",
  "data": "Receipt content...\n[CUT]"
}

# Get job status
GET http://localhost:5050/api/v1/print/{jobId}

# Get queue statistics
GET http://localhost:5050/api/v1/queue/stats
```

## Troubleshooting

### Service Won't Start (Windows)

1. **Check Node.js**
   ```powershell
   node --version
   ```

2. **Check Port 5050**
   ```powershell
   netstat -an | findstr 5050
   ```

3. **Check Logs**
   ```
   %APPDATA%\VeztraPrintAgent\logs\service.log
   ```

### Service Won't Start (Linux)

1. **Check systemd status**
   ```bash
   sudo systemctl status veztra-print-agent
   ```

2. **Check logs**
   ```bash
   sudo journalctl -u veztra-print-agent -n 50
   ```

3. **Verify file permissions**
   ```bash
   ls -la /opt/veztra-print-agent
   ls -la /var/lib/veztra-print-agent
   ```

### Printer Not Found

1. **USB Printers**
   ```bash
   # Detect available USB printers
   curl http://localhost:5050/api/v1/printers/detect/usb
   ```

2. **Network Printers**
   - Verify IP and port are correct
   - Test connectivity: `ping printer-ip`
   - Check printer web interface

3. **Connection Test**
   ```bash
   curl -X POST http://localhost:5050/api/v1/printers/{id}/test
   ```

### Print Jobs Failing

1. **Check job status**
   ```bash
   curl http://localhost:5050/api/v1/print/{jobId}
   ```

2. **View logs**
   ```bash
   tail -f %APPDATA%\VeztraPrintAgent\logs\service.log  # Windows
   sudo journalctl -u veztra-print-agent -f             # Linux
   ```

3. **Common issues**
   - Printer offline or disconnected
   - Invalid ESC/POS format in print data
   - Port or firewall blocking (network printers)
   - Insufficient permissions (Linux)

## Production Deployment

### Windows

1. Install as scheduled task instead of registry for more control
2. Set up Windows Firewall rules for API access
3. Configure log rotation in config.json
4. Use network printer shares for enterprise deployments

### Linux

1. systemd service is automatically configured with:
   - Auto-restart on failure
   - 5-second retry interval
   - Automatic startup on boot
   - Security hardening (restricted filesystem)

2. Enable automatic log rotation
   ```bash
   sudo apt-get install logrotate
   # Configure in /etc/logrotate.d/veztra-print-agent
   ```

3. Monitor service health
   ```bash
   # Set up Prometheus monitoring
   curl http://localhost:5050/api/v1/health
   ```

## Security Notes

- Service binds to `localhost:5050` by default (local only)
- For remote access, use a reverse proxy (nginx, Apache)
- Store sensitive configs in protected directories
- Disable unnecessary API endpoints in production
- Keep Node.js and dependencies updated

## Support

For issues and feature requests, please refer to documentation or logs.
