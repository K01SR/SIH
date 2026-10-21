# Demo Screenshots

Drop captured screenshots here and reference them from the pitch docs and README.

Suggested captures (PNG, 1440×900 or 1920×1080, browser at 100% zoom):

| File name | Screen | Why |
|---|---|---|
| `01-login.png` | Login page (blue gradient with demo accounts) | First impression / RBAC entry |
| `02-dashboard.png` | Dashboard with ageing, region-wise pendency, predictive panel | Pendency visibility |
| `03-workflow-stepper.png` | Application detail with workflow stepper + timeline | End-to-end workflow |
| `04-human-oversight.png` | Human-oversight confirmation modal (mandatory reason) | Regulatory safeguard ★ |
| `05-evc-conflict.png` | EVC scheduling conflict warning | Differentiator ★ |
| `06-rules-editor.png` | Rules Configuration JSON editor + version history | Rules as data ★ |
| `07-realtime-alert.png` | Toast / live alert badge | Real-time operations |

## How to capture

1. Start the app: `npm run install:all && npm run db:setup && npm run dev` → http://localhost:5173
2. Sign in with the relevant demo account (password `password123`):
   - Dashboard / EVC / realtime: `ro.west@aicte.gov.in`
   - Human-oversight modal: `ca@aicte.gov.in`
   - Rules editor: `admin@aicte.gov.in`
3. Use your OS screenshot tool, or in Chromium DevTools: **Ctrl+Shift+P → "Capture full size
   screenshot"** for full-page shots.
4. Save with the names above so the docs can link them.

> Optional automation: a Playwright script could capture these headlessly, but it is not
> included to keep the project dependency-free. Manual capture takes ~5 minutes.
