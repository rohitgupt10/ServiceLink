# Local ServiceLink development

The default development command uses a persistent project-local MongoDB database:

```powershell
npm install
npm run dev
```

Local data is stored in `.local-data/mongodb` and survives normal restarts. The folder is ignored by Git.
The local database listens only on `127.0.0.1:27018`. During a quick nodemon restart, ServiceLink reuses an already-running local database instead of competing for its lock file.

Only run one ServiceLink web server on port `3000` at a time. If that port is already in use, press `Ctrl+C` in the older ServiceLink terminal before starting again.

Demo accounts:

- Admin: `admin@servicelink.local` / `Admin123456!`
- Customer: `user@servicelink.local` / `User12345!`
- Provider: `provider@servicelink.local` / `Provider123!`

To use the Atlas connection from `.env` instead, run:

```powershell
npm run dev:atlas
```
