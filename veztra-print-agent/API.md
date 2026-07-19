# Veztra Print Agent - API Documentation

## Base URL

```
http://localhost:5050/api/v1
```

## Response Format

All endpoints return JSON in this format:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

## Endpoints

### 1. Health & Status

#### GET /health
Service health check and status.

**Response:**
```json
{
  "success": true,
  "data": {
    "uptime": 3600,
    "version": "1.0.0",
    "platform": "windows|linux",
    "port": 5050,
    "printers": [
      {
        "printerId": "uuid",
        "printerName": "Receipt Printer",
        "status": "online|offline|error",
        "lastCheck": "2024-01-01T12:00:00Z"
      }
    ],
    "queueLength": 5,
    "totalJobsProcessed": 124
  }
}
```

#### GET /system/info
System information and resource usage.

**Response:**
```json
{
  "success": true,
  "data": {
    "platform": "windows|linux",
    "arch": "x64",
    "cpus": 8,
    "memory": 16000000000,
    "freeMemory": 8000000000,
    "uptime": 86400,
    "hostname": "WORKSTATION"
  }
}
```

#### GET /logs?lines=100
Get recent application logs.

**Query Parameters:**
- `lines` (optional): Number of log lines to retrieve (default: 100, max: 1000)

**Response:**
```json
{
  "success": true,
  "data": [
    "2024-01-01 12:00:00 [info] Service started",
    "2024-01-01 12:00:01 [debug] Loaded 3 printers"
  ]
}
```

### 2. Printer Management

#### GET /printers
List all configured printers.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Receipt Printer",
      "type": "receipt|kitchen|bar|custom",
      "brand": "xprinter|epson|rongta|vmax|generic",
      "connectionType": "usb|network",
      "host": "192.168.1.100",
      "port": 9100,
      "timeout": 10000,
      "enabled": true,
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

#### GET /printers/:id
Get specific printer configuration.

**Parameters:**
- `id` (path): Printer UUID

**Response:** Single printer object (see GET /printers)

#### POST /printers
Add new printer configuration.

**Request Body:**
```json
{
  "name": "Receipt Printer",
  "type": "receipt",
  "brand": "xprinter",
  "connectionType": "usb",
  "vendorId": "0x0b3a",
  "productId": "0x0010",
  "enabled": true
}
```

**For Network Printers:**
```json
{
  "name": "Kitchen Printer",
  "type": "kitchen",
  "brand": "epson",
  "connectionType": "network",
  "host": "192.168.1.100",
  "port": 9100,
  "timeout": 10000,
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "generated-uuid",
    "name": "Receipt Printer",
    ...
  }
}
```

**Errors:**
- 400: Invalid printer configuration
- 409: Printer already exists

#### PUT /printers/:id
Update printer configuration.

**Parameters:**
- `id` (path): Printer UUID

**Request Body:** Any printer fields to update

**Response:** Updated printer object

**Errors:**
- 404: Printer not found
- 400: Invalid configuration

#### DELETE /printers/:id
Delete printer configuration.

**Parameters:**
- `id` (path): Printer UUID

**Response:**
```json
{
  "success": true,
  "message": "Printer deleted"
}
```

**Errors:**
- 404: Printer not found

#### POST /printers/:id/test
Test printer connection.

**Parameters:**
- `id` (path): Printer UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "printerId": "uuid",
    "status": "online|offline"
  }
}
```

#### GET /printers/detect/usb
Detect connected USB printers.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "vendorId": "0x0b3a",
      "productId": "0x0010",
      "manufacturer": "XPrinter",
      "product": "Thermal Printer"
    }
  ]
}
```

### 3. Print Jobs

#### POST /print
Submit a print job to the queue.

**Request Body:**
```json
{
  "printerId": "printer-uuid",
  "printerName": "Receipt Printer",
  "data": "Order #123\nTotal: $29.99\n[CUT]"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "job-uuid",
    "printerId": "printer-uuid",
    "printerName": "Receipt Printer",
    "status": "pending",
    "attempts": 0,
    "maxAttempts": 3,
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
}
```

**Status Codes:**
- 202: Job accepted and queued
- 400: Invalid printer ID or data
- 404: Printer not found

**Job Statuses:**
- `pending`: Waiting to print
- `printing`: Currently printing
- `success`: Print completed
- `failed`: Print failed after max retries

#### GET /print/:jobId
Get print job status.

**Parameters:**
- `jobId` (path): Job UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "job-uuid",
    "printerId": "printer-uuid",
    "printerName": "Receipt Printer",
    "status": "success|pending|failed",
    "attempts": 1,
    "maxAttempts": 3,
    "lastError": null,
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:01Z",
    "completedAt": "2024-01-01T12:00:02Z"
  }
}
```

**Errors:**
- 404: Job not found

### 4. Queue Management

#### GET /queue/stats
Get print queue statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "pending": 2,
    "failed": 1,
    "completed": 7,
    "averageRetries": 0.3
  }
}
```

## ESC/POS Print Format

The print data should be valid ESC/POS format. Supported commands:

```
[CENTER]        - Center align
[LEFT]          - Left align
[RIGHT]         - Right align
[BOLD]          - Bold text
[/BOLD]         - End bold
[CUT]           - Full cut
                - Line feed (blank line)
```

### Example Receipt

```
[CENTER]
Restaurant Name
1234 Main St
[/CENTER]

Order #123
Date: 01/01/2024

[LEFT]
Item 1          $10.00
Item 2          $15.00
Item 3           $4.99
--------------------
Subtotal        $29.99
Tax              $2.40
--------------------
[BOLD]
Total           $32.39
[/BOLD]

[CENTER]
Thank you!
[CUT]
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required fields: printerId, data"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Printer not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to initialize printer connection"
}
```

## Rate Limiting

No rate limiting is enforced in the current version. Configure via reverse proxy for production.

## Authentication

Currently no authentication is enforced. The service binds to `localhost:5050` by default for local access only. For remote access:

1. Use a reverse proxy with authentication (nginx, Apache)
2. Restrict firewall access to trusted IPs
3. Use VPN or SSH tunneling

## CORS

CORS is enabled for:
- `http://localhost:3000` (development)
- `http://localhost:5050` (service itself)

Configure in `src/routes/api.ts` for additional origins.

## Retry Logic

Failed print jobs are automatically retried with exponential backoff:

- Attempt 1: Immediate
- Attempt 2: After 5 seconds (default)
- Attempt 3: After 10 seconds
- Max retries: 3 (configurable)

After max retries are exceeded, the job status is set to `failed`.

## Timeout Handling

- USB connections: Depends on driver
- Network connections: 10 seconds (configurable per printer)
- Queue processing: 2 seconds interval (configurable)

## Webhooks

Webhooks are not currently supported. Poll `/api/v1/print/:jobId` for job status.

## Pagination

Not currently implemented. All endpoints return complete data sets. For production with large datasets, consider:

- Implementing offset/limit parameters
- Using a pagination middleware
- Archiving old jobs regularly

## Versioning

Current API version: `v1`

Future versions will maintain backward compatibility with v1 endpoints.
