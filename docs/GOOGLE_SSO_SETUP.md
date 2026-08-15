# SATP Google Workspace SSO setup manual

This guide configures the existing **Sign in with Google** button in SATP for the school's Google Workspace accounts. SATP uses Google Identity Services to obtain an ID token in the browser and verifies that token on the SATP server. It requests only basic identity information and does not read Gmail, Drive, Calendar, or other Google data.

## Requirements

- Access to the school's Google Cloud organization or a project approved by the Google Workspace administrator
- Access to Google Cloud Console and, when required, Google Admin Console
- A production SATP hostname with HTTPS, such as `https://satp.ndmu.edu.ph`
- Access to the SATP Windows Server, `.env`, MySQL database, and PM2 process
- The exact institutional domain, such as `ndmu.edu.ph`

The production hostname must use HTTPS. `http://localhost:3000` may be used for local testing, but a LAN IP such as `http://192.168.1.10:3000` should not be registered as the production Google origin.

### Local IP and in-house access

Google does not allow a raw LAN IP such as `http://192.168.1.18:3000` or `https://192.168.1.18` as an authorized JavaScript origin for a Web application Client ID. Only loopback origins such as `http://localhost:3000` and `http://127.0.0.1:3000` receive the localhost exception.

For Google login on the campus network, configure internal DNS so the registered SATP hostname resolves to the server's LAN IP:

```text
satp.ndmu.edu.ph -> 192.168.1.18
```

Users should then open `https://satp.ndmu.edu.ph`. Direct `http://SERVER-LAN-IP:3000` access may remain available to trusted in-house clients for username/password login, but Google login will not work from that raw-IP origin.

## 1. Create or select a Google Cloud project

1. Sign in to [Google Cloud Console](https://console.cloud.google.com/) using an authorized institutional administrator account.
2. Create a project named **SATP**, or select the institution's existing project for SATP.
3. Confirm that the project belongs to the correct Google Workspace organization.

Using a project owned by the institution makes it possible to configure the app for internal use. An internal app used only inside the same Google Workspace organization normally does not require Google's external-app verification.

## 2. Configure the Google Auth Platform

The current Google Cloud interface may show these settings under **Google Auth Platform**.

1. Open **Google Auth Platform** for the SATP project.
2. Under **Branding**, enter:
   - App name: `SATP`
   - User support email: the MIS support address
   - Developer contact email: the MIS or system administrator address
3. Under **Audience**, select **Internal** when the project belongs to the school's Google Workspace organization and only institutional users should sign in.
4. Under **Data Access**, keep only the basic sign-in scopes: `openid`, `email`, and `profile`.
5. Save the configuration.

If **Internal** is unavailable, the project is probably not attached to the school's Google Workspace organization. Ask the Workspace administrator to create or move the project into the organization. A project left in **Testing** is limited to its configured test users and is unsuitable for institution-wide production login.

## 3. Create the OAuth web client

1. In **Google Auth Platform**, open **Clients**.
2. Select **Create client**.
3. Choose **Web application**.
4. Name it `SATP Web`.
5. Under **Authorized JavaScript origins**, add the exact SATP origins:

   ```text
   https://satp.ndmu.edu.ph
   http://localhost:3000
   ```

   Replace the example production hostname with the real SATP hostname. An origin contains only the scheme, hostname, and optional port. Do not add `/login/index.html`, a trailing path, or a wildcard.

6. Leave **Authorized redirect URIs** empty. SATP uses the Google Identity Services JavaScript callback flow and posts the returned credential to `/api/login/google`; it does not use an OAuth redirect callback.
7. Create the client and copy its **Client ID**. It should resemble:

   ```text
   1234567890-example.apps.googleusercontent.com
   ```

SATP does not require or use a Google client secret for this login flow. Do not place a client secret in browser code.

## 4. Allow the app in Google Workspace, if required

Google Workspace for Education can restrict third-party and internal applications, particularly for users under 18.

1. Sign in to [Google Admin Console](https://admin.google.com/).
2. Open **Security > Access and data control > API controls**.
3. Review **App access control** and the settings for third-party applications.
4. Locate the SATP OAuth client using its Client ID, or configure a new app by OAuth client ID.
5. Allow the app for the organizational units that must use SATP.
6. Verify the policy separately for SHS/student organizational units if age-based Google Workspace for Education restrictions are enabled.

SATP requests only basic sign-in identity. If Workspace policy allows basic information for Sign in with Google, additional Google API access is not required.

## 5. Run the SATP database migrations

Back up the production database first. Then run these migrations once, in order:

```sql
SOURCE C:/Apps/SATP/database/migrations/2026-08-15_google_workspace_sso.sql;
SOURCE C:/Apps/SATP/database/migrations/2026-08-15_users_optional_password.sql;
```

If the MySQL client does not accept `SOURCE` from the current context, open each file in the database administration tool and execute its SQL manually.

The migrations add a unique, nullable `google_email` field and allow Google-only accounts to have a `NULL` local password. Do not run a migration again after it has succeeded.

## 6. Configure the production environment

Edit the production `.env` in the SATP application directory:

```env
NODE_ENV=production
PORT=3000
BASE_URL=https://satp.ndmu.edu.ph
SECRET_KEY=replace-with-a-long-random-secret
TRUST_PROXY=true
HTTPS_ONLY=true
ALLOW_DIRECT_HTTP=true
COOKIE_SECURE=true

GOOGLE_CLIENT_ID=1234567890-example.apps.googleusercontent.com
GOOGLE_WORKSPACE_DOMAIN=ndmu.edu.ph
```

Important:

- Use the complete web Client ID in `GOOGLE_CLIENT_ID`.
- Enter only the domain in `GOOGLE_WORKSPACE_DOMAIN`; do not include `@`, `https://`, or a path.
- Keep `.env` out of Git.
- `ALLOW_DIRECT_HTTP=true` preserves approved in-house access to port 3000, while public users should use the HTTPS hostname.

Restart SATP so PM2 loads the new environment:

```powershell
Set-Location C:\Apps\SATP
pm2 reload ecosystem.config.cjs --env production --update-env
pm2 save
pm2 logs satp --lines 100
```

## 7. Link SATP accounts to institutional email addresses

Google authentication succeeds only when the verified Google email exactly matches an active SATP user's `google_email` value.

Use **User Management** or **Students Maintenance** to enter the institutional email. Bulk imports may use the optional `google_email` column.

Account rules:

| Account configuration | Available login method |
| --- | --- |
| Institutional email and no password | Google only |
| No institutional email and bcrypt password | Username and password only |
| Institutional email and bcrypt password | Google or username and password |

For existing accounts, a normal user or student import never changes the stored password. Use the dedicated **Update Password** import when a local password must be changed.

Each institutional email must be unique. Use lowercase addresses and remove leading or trailing spaces. SHS students without institutional email can continue using username and password.

## 8. Verify the setup

1. Open `https://satp.ndmu.edu.ph/login/index.html` in a private browser window.
2. Confirm that **Sign in with Google** appears. If it does not, inspect `https://satp.ndmu.edu.ph/api/login/google/config`; `data.enabled` should be `true`.
3. Select a linked institutional account.
4. Confirm that SATP redirects the user to the correct student or administrative page.
5. Open Activity Log and confirm an entry similar to `Logged in with Google: user@ndmu.edu.ph`.
6. Test an account from another domain and confirm it is rejected.
7. Test an active institutional account not linked in SATP and confirm it is rejected with instructions to contact the administrator.
8. Test an inactive SATP account and confirm it cannot sign in.
9. Test username/password login for an account that has a local bcrypt password.
10. Test both the public HTTPS hostname and the authorized `localhost` development origin when applicable.

## Troubleshooting

### The Google button is missing

- Confirm `GOOGLE_CLIENT_ID` and `GOOGLE_WORKSPACE_DOMAIN` are present in the production `.env`.
- Reload PM2 with `--update-env`.
- Open `/api/login/google/config` and confirm `enabled` is `true`.
- Confirm the browser can load `https://accounts.google.com/gsi/client`.

### `The given origin is not allowed for the given client ID`

- Add the exact browser origin to **Authorized JavaScript origins**.
- Match `http` versus `https`, hostname, and port exactly.
- Do not include a page path in the origin.
- Allow several minutes for Google configuration changes to propagate.

### SATP says to use an authorized school account

- Confirm the Google account belongs to the exact `GOOGLE_WORKSPACE_DOMAIN`.
- Confirm the Workspace account reports the institutional hosted domain.
- Confirm the account's email is verified.

### The email is not linked to an active SATP account

- Find the user in User Management or Students Maintenance.
- Confirm `google_email` exactly matches the Google Workspace email.
- Confirm the user and assigned SATP permission are active.
- Confirm no other SATP user already owns that email.

### Students are blocked by Google Workspace

- Review App access control in Google Admin Console.
- Check organizational-unit and under-18 policies for Google Workspace for Education.
- Explicitly allow the SATP OAuth Client ID for the affected student organizational units.

### The popup is blank or closes unexpectedly

- Confirm SATP is accessed through its registered HTTPS origin.
- Check reverse-proxy security headers. If a Cross-Origin-Opener-Policy header is manually configured and FedCM is unavailable, Google may require `same-origin-allow-popups`.
- Review browser console and PM2 logs without copying ID tokens or session cookies into tickets.

## Security and maintenance notes

- Never log or store the Google credential/ID token received by the browser.
- Never expose `.env`, `SECRET_KEY`, database credentials, cookies, or OAuth secrets.
- Keep institutional email ownership controlled by authorized administrators.
- Deactivate departed users in SATP even if their Workspace account is also suspended.
- Review OAuth clients and Workspace app access periodically.
- Use HTTPS for production and keep direct port 3000 access restricted to the trusted LAN.
- Record the Google Cloud project owner, Workspace approver, Client ID, production origin, and renewal/review contact in MIS documentation.

## Official references

- [Google Identity Services web setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Google Identity Services JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference)
- [Google Workspace app access control](https://support.google.com/a/answer/7281227)
- [When OAuth verification is not required](https://support.google.com/cloud/answer/13464323)
- SATP HTTPS deployment: [HTTPS_DEPLOYMENT.md](./HTTPS_DEPLOYMENT.md)
