# HungerHub

HungerHub is a simple food ordering web app (React + Vite frontend, Node/Express + MongoDB backend).

This repository contains two main parts:
- `frontend/` — Vite + React application
- `backend/` — Node.js + Express API (MongoDB + Mongoose)

This README explains how to run, build, and deploy the project safely and how to handle secrets.

## Table of contents
- Requirements
- Quick start (local)
- Backend: run & tests
- Frontend: run & build
- Creating a local `.env`
- Deploying the frontend (GitHub Pages / gh-pages)
- Security: secrets & rotation
- Troubleshooting (Windows / OneDrive / esbuild)
- Tests & CI
- Contributing
- License

## Requirements
- Node.js 18+ recommended
- npm (comes with Node)
- MongoDB (local or remote URI)
- Git

On Windows, use PowerShell (the commands below assume PowerShell).

## Quick start (local)

1. Clone the repo
```powershell
git clone https://github.com/<your-username>/HungerHub.git
cd HungerHub
```

2. Create a local backend `.env` (see section below) — do NOT commit it.

3. Install and start backend:
```powershell
cd backend
npm ci
npm run dev   # or npm run server if your package.json uses that
```

4. Install and start frontend (in a new terminal):
```powershell
cd frontend
npm ci
npm run dev
# open http://localhost:5173
```

## Backend: run & tests

Install and run:
```powershell
cd backend
npm ci
# create local .env from .env.example first
npm run dev
```

Run tests (if present):
```powershell
cd backend
npm test
```

Notes:
- The API uses environment variables (see the `backend/.env.example` file). Make sure `JWT_SECRET`, `MONGO_URI` (or your DB config), `GOOGLE_CLIENT_ID/SECRET` are set for local testing.
- Do not commit `backend/.env`.

## Frontend: run & build

Local dev:
```powershell
cd frontend
npm ci
npm run dev
# open http://localhost:5173
```

Build for production:
```powershell
cd frontend
npm run build
# Preview the build locally:
npm run preview
```

If you deploy the frontend to a GitHub Pages repository site under `https://username.github.io/HungerHub`, configure Vite `base` or use relative paths (see Deploying section). Otherwise absolute `/` paths assume root deployment.

## Creating a local `.env`

Your repo contains `backend/.env.example`. Copy it and fill secrets locally:

PowerShell (recommended):
```powershell
cd .\backend
Copy-Item .\.env.example .\.env
# Then open .env in an editor and replace placeholders with real values
notepad .\.env
```

Or create it with a heredoc:
```powershell
cd .\backend
@"
JWT_SECRET=your_jwt_secret_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/user/auth/google/callback
FRONTEND_URL=http://localhost:5173
PORT=4000
"@ | Out-File -Encoding utf8 .\.env
```

Important: Ensure `backend/.env` is listed in `.gitignore` and never commit it.

## Deploying the frontend (example: GitHub Pages)

When you deploy to a repository subpath (e.g. `https://username.github.io/HungerHub`), Vite must be told the base path:

1. Update `frontend/vite.config.js`:
```js
export default defineConfig({
  base: '/HungerHub/', // <-- set to repository name
  plugins: [react()],
})
```

2. Make sure `index.html` uses relative paths (avoid leading `/`):
```html
<link rel="icon" href="vite.svg" />
<script type="module" src="src/main.jsx"></script>
```

3. Build & publish — example GitHub Actions step (in `.github/workflows/deploy.yml`):
```yaml
- name: Build frontend
  run: npm ci && npm run build
  working-directory: ./frontend

- name: Deploy to gh-pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./frontend/dist
```

If you deploy on a root domain (user/organization page) use `base: '/'` and absolute paths are fine.

## Security: secrets & rotation

- Treat client secrets as fully compromised if they were ever committed. History rewrite is not enough — rotate/regenerate the credentials in the provider console (Google Cloud Console for OAuth).
- Do immediately:
  1. Go to Google Cloud Console → APIs & Services → Credentials.
  2. Find the OAuth 2.0 Client IDs entry and revoke/regenerate the client secret (or delete and create a new client).
  3. Update your `backend/.env` or CI secrets with the new value.
  4. Revoke tokens if needed (user sessions).

- Use environment variables or CI secret stores (GitHub Actions Secrets) in production and CI. Never commit secrets to VCS.

## Troubleshooting (Windows / OneDrive / esbuild)

Symptoms: build fails with errors such as:
- `EPERM unlink ... esbuild.exe` or
- `'vite' is not recognized` or
- native module unlink failures (bcrypt .node files).

Fixes:
1. Close VS Code and any terminal windows that might be running Node/Vite.
2. Pause OneDrive or stop file sync for the project folder — OneDrive can lock files.
3. Reboot if a process is locking a native binary.
4. Delete `node_modules` with elevated PowerShell or `npx rimraf`:
```powershell
Remove-Item -LiteralPath .\frontend\node_modules -Recurse -Force -ErrorAction SilentlyContinue
npx rimraf frontend/node_modules backend/node_modules
```
5. Then reinstall:
```powershell
cd frontend
npm ci
cd ../backend
npm ci
```
6. If native modules fail, rebuild:
```powershell
npm rebuild
npm rebuild bcrypt
```

## Tests & CI

- There is a basic GitHub Actions workflow scaffold in `.github/workflows/` (if present). Ensure you configure secrets for production keys in GitHub repository settings (Settings → Secrets & variables → Actions).
- Recommended tests:
  - Backend: Jest + supertest for endpoints and auth flows.
  - Frontend: Vitest + React Testing Library for components and pages.

## Contributing
- Keep secrets out of commits.
- Open an issue or a PR for features/bugfixes.
- When changing public behavior, add or update tests.

## Repository hygiene (notes from recent maintenance)
- The repository recently had history rewritten to remove committed secrets and `node_modules` directories. After a history rewrite:
  - Collaborators should re-clone the repository.
  - Do not attempt to reintroduce removed files like `backend/.env` into commits.
  - Use branches for large changes and prefer pushing to feature branches first.

## License
- Check `LICENSE` in repository root for licensing details.
