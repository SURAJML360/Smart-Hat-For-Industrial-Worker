# Sample Payloads & Testing Commands

> Ready-to-run curl and PowerShell commands for testing every system flow.

---

## 1. Device Telemetry Ingestion (POST /api/telemetry)

### Using PowerShell
```powershell
$headers = @{
    "Content-Type"   = "application/json"
    "X-Device-Token" = "dev-device-token"
}

$body = @{
    did = "HELMET-001"
    seq = 101
    tc  = 35.2
    tr  = 720
    fd  = $false
    fr  = 1
    up  = 184500
    fv  = "1.0.0"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/telemetry" `
  -Method Post `
  -Headers $headers `
  -Body $body
```

### Using cURL (Bash / Command Prompt)
```bash
curl -X POST http://localhost:3001/api/telemetry \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: dev-device-token" \
  -d '{
    "did": "HELMET-001",
    "seq": 102,
    "tc": 48.5,
    "tr": 990,
    "fd": false,
    "fr": 1,
    "up": 186500,
    "fv": "1.0.0"
  }'
```

---

## 2. Simulate Optical Flame Hazard (Trigger Evacuation Alert)

```bash
curl -X POST http://localhost:3001/api/telemetry \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: dev-device-token" \
  -d '{
    "did": "HELMET-001",
    "seq": 103,
    "tc": 65.0,
    "tr": 1023,
    "fd": true,
    "fr": 0,
    "up": 188500,
    "fv": "1.0.0"
  }'
```

---

## 3. Operator Authentication (POST /api/auth/login)

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@smarthelmet.local",
    "password": "Admin@12345"
  }'
```

---

## 4. Query Dashboard Summary (Authenticated)

```bash
curl -X GET http://localhost:3001/api/dashboard/summary \
  -H "Authorization: Bearer <PASTE_JWT_TOKEN_HERE>"
```

---

## 5. Query Helmet Telemetry History

```bash
curl -X GET "http://localhost:3001/api/telemetry/history/HELMET-001?limit=20" \
  -H "Authorization: Bearer <PASTE_JWT_TOKEN_HERE>"
```

---

## 6. Acknowledge and Resolve Incidents

```bash
# Acknowledge incident
curl -X PATCH http://localhost:3001/api/alerts/<ALERT_ID>/acknowledge \
  -H "Authorization: Bearer <PASTE_JWT_TOKEN_HERE>" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Worker advised to exit high temperature zone"}'

# Resolve incident
curl -X PATCH http://localhost:3001/api/alerts/<ALERT_ID>/resolve \
  -H "Authorization: Bearer <PASTE_JWT_TOKEN_HERE>" \
  -H "Content-Type: application/json" \
  -d '{"resolutionNote": "Worker safely clear of area; verified with site lead"}'
```

