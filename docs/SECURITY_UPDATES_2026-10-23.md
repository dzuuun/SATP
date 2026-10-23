# Security updates — October 23, 2026

The installed system Node.js version was 24.14.0. The October 21 Node.js security release fixes high-severity DNS, TLS and Brotli issues in 24.22.1. This review establishes applicable versions and patches; it does not establish that SATP has been attacked.

Official advisories:

- [Node.js October 2026 security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
- [Multer 2.5.0 security fix](https://github.com/expressjs/multer/security/advisories/GHSA-q7qp-rjg7-q26m)
- [SheetJS spreadsheet parsing advisory](https://cdn.sheetjs.com/advisories/CVE-2024-22363)
- [html2pdf.js text-source sanitization fix](https://github.com/eKoopmans/html2pdf.js/security/advisories/GHSA-w8x4-x68c-m6fc)

## Applied updates

| Component | Previous version | Updated version |
| --- | --- | --- |
| SATP Node.js runtime | 24.14.0 (system) | 24.22.1 (project-local) |
| Express | 4.22.2 | 4.22.3 |
| body-parser | 1.20.6 | 1.20.9 |
| Multer | 1.4.5-lts.2 | 2.5.0 |
| Morgan | 1.11.0 | 1.12.1 |
| mysql2 | 3.20.0 | 3.24.6 |
| DOMPurify | 3.4.13 | 3.4.17 |
| Browser jsPDF | 2.5.2 | 4.2.1 |
| Browser jsPDF AutoTable | 3.8.4 | 5.0.8 |
| Browser SheetJS | 0.18.5 / 0.20.1 | 0.20.3 |
| Autoprefixer | 10.4.27 | 10.6.1 |
| PostCSS | 8.5.26 | 8.5.31 |

Compatible transitive packages were updated too. The initial npm audit reported 14 affected dependency entries (2 critical, 7 high, 5 moderate); the final audit reported zero. This result covers npm's advisory database, not every possible application vulnerability.

Nodemon was removed because its dependency chain has an advisory without a currently patched compatible release. It was not used by the project scripts. `npm run start:watch` now uses Node.js's built-in watch mode.

## Runtime and deployment

The Windows system-wide Node.js upgrade failed with installer error 1730: administrator rights are required to replace the existing installation. The system executable at `C:\Program Files\nodejs\node.exe` therefore remains 24.14.0 and must still be upgraded by an administrator. The official 24.22.1 MSI was downloaded and verified against the official SHA256 manifest and its valid OpenJS Foundation signature.

A separate official Node.js 24.22.1 runtime was installed under `.runtime/node-v24.22.1-win-x64`. Its ZIP checksum and executable signature were verified too. `.runtime` is ignored by Git. The npm start, watch, test, QA and vendor-build commands select this runtime; PM2's ecosystem configuration selects the same executable directly. A version check rejects older runtimes instead of starting SATP on them. `.nvmrc` and `package.json` record the minimum fixed release.

On another Windows machine, install the local runtime before starting SATP:

```powershell
powershell -NoProfile -File scripts/install-node.ps1
npm ci
npm start
```

For installations using a system runtime or another OS, install Node.js 24.22.1 or a newer 24.x security release. Restart the existing SATP service or PM2 process using `ecosystem.config.cjs` so an already running process does not retain the older interpreter. Review and update any other Node.js services on the host separately.

## Browser assets

All spreadsheet import pages now load the local official SheetJS 0.20.3 asset. Its SHA256 is `cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41`. The source is [the official SheetJS distribution](https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js), rather than the outdated npm `xlsx` distribution.

The PDF bundle is built from html2pdf.js 0.14.0 source with the installed jsPDF 4.2.1 and DOMPurify 3.4.17 dependencies. Copying upstream's prebuilt bundle can reintroduce embedded older dependencies. After updating the lockfile, rebuild and verify with:

```powershell
npm run build:vendor
npm run test:vendor
```

The browser verification uses Chrome in headless mode and creates no user records. Set `CHROME_PATH` if Chrome is installed somewhere else. Commit the regenerated vendor assets and license file along with dependency updates. Refresh open browser pages after deployment.

## Verification

- Final `npm audit`: zero known vulnerabilities.
- 176 focused runtime, upload, authentication, presence, page and server checks passed.
- Browser verification passed for HTML-to-PDF rendering, AutoTable PDF generation, spreadsheet write/read and ZIP generation.
- Full suite: 265 passed, 10 failed. The same 10 test failures were present before these updates; no new failures were introduced. Their unrelated assertions are in `test/workflow_contracts.test.js`.
