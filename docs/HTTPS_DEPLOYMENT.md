# Windows Server HTTPS deployment with PM2

SATP runs in PM2 on the private Node port 3000. Caddy listens publicly on ports 80 and 443, manages the TLS certificate, redirects HTTP to HTTPS, and proxies requests to Node.

```text
Browser -> HTTPS :443 -> Caddy -> HTTP 127.0.0.1:3000 -> PM2/SATP
```

Port 3000 can remain accessible in-house, but Windows Firewall must restrict it to the institution's trusted LAN subnet and the router must not expose or forward it publicly.

## 1. Configure SATP

Create the production `.env` in the SATP project directory. It is ignored by Git:

```env
NODE_ENV=production
PORT=3000
BASE_URL=https://satp.ndmu.edu.ph
SECRET_KEY=replace-with-a-long-random-secret
TRUST_PROXY=true
HTTPS_ONLY=true
ALLOW_DIRECT_HTTP=true
COOKIE_SECURE=true
API_JSON_LIMIT=10mb
```

Use a cryptographically secure random value for `SECRET_KEY`. Do not reuse a database or administrator password.

Install production dependencies and start the included PM2 declaration from PowerShell:

```powershell
Set-Location C:\Apps\SATP
npm ci --omit=dev
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 status
pm2 logs satp
```

For later deployments:

```powershell
Set-Location C:\Apps\SATP
npm ci --omit=dev
pm2 reload ecosystem.config.cjs --env production
pm2 save
```

`pm2 save` stores the current process list. On Windows Server, also run PM2 through your existing Windows startup/service integration so the saved process list is restored after reboot. Run that service under the same Windows account that owns the PM2 process list.

## 2. Configure Caddy on Windows

Create `C:\Caddy\Caddyfile`:

```caddyfile
satp.example.edu {
    reverse_proxy 127.0.0.1:3000
}
```

Point the hostname's DNS record to the server and allow inbound TCP ports 80 and 443 in Windows Firewall. Add a separate inbound rule for TCP 3000 whose **Remote IP address** scope contains only the institution's trusted subnet (for example `192.168.1.0/24`). Never use `Any IP address` for this rule. Run Caddy as a Windows service so it starts after reboot. Caddy automatically sends the forwarded HTTPS protocol that SATP uses for redirects, secure cookies, and HSTS.

Do not configure Caddy to proxy to `https://127.0.0.1:3000`; the private Caddy-to-Node connection is HTTP.

## 3. Verify the deployment

1. Run `pm2 status` and confirm `satp` is online.
2. On the server, run `Invoke-WebRequest http://127.0.0.1:3000` to confirm Node responds.
3. From an in-house computer, open `http://SERVER-LAN-IP:3000` and confirm SATP loads.
4. Open `http://satp.example.edu` and confirm it redirects to HTTPS.
5. Open `https://satp.example.edu` and confirm the certificate is valid.
6. Sign in through HTTPS and confirm `satp_session` is `Secure`, `HttpOnly`, and `SameSite=Lax`.
7. Reboot the server and confirm both PM2/SATP and Caddy return automatically.
8. Confirm port 3000 cannot be reached from outside the trusted LAN.

Public certificate authorities normally require a DNS hostname rather than a private IP address. For an intranet-only hostname, use an institution-managed certificate and deploy its issuing CA to client devices.
