# Quick start

## 1. Prerequisites

- Node.js 18 or newer  (`node -v`)
- MongoDB running locally, or a MongoDB Atlas connection string

### Getting MongoDB

**Option A — local install**

- Windows/macOS: install MongoDB Community Server, then make sure the service is running.
- Ubuntu/Debian: `sudo systemctl start mongod`
- Check it is up: `mongosh` should connect.

**Option B — MongoDB Atlas (no local install)**

1. Create a free cluster at mongodb.com/atlas
2. Add a database user and allow your IP under Network Access
3. Copy the connection string and put it in `backend/.env` as `MONGO_URI`

## 2. Install

```bash
npm run install:all
```

If that fails, install the three parts by hand:

```bash
npm install
cd backend  && npm install && cd ..
cd frontend && npm install && cd ..
```

## 3. Configure

```bash
cp backend/.env.example backend/.env
```

Windows PowerShell: `Copy-Item backend\.env.example backend\.env`

Open `backend/.env` and set `MONGO_URI` if you are not on a local mongod.

## 4. Run

```bash
npm run dev
```

Open <http://localhost:5173> and sign in:

```
alex@workflow.dev
Password@123
```

## Troubleshooting

**"Connecting to Workflow..." never finishes**
The API is not reachable. Check the terminal running the backend for an error,
and confirm it says it is listening on port 5000.

**Login fails right after starting**
The database is still seeding. Wait a moment and reload.

**`MongooseServerSelectionError`**
MongoDB is not running, or `MONGO_URI` is wrong. Start mongod, or fix the string.

**Port 5000 already in use**
Change `PORT` in `backend/.env`, then update the proxy target in
`frontend/vite.config.js` to match.

**Port 5173 already in use**
Vite will offer the next free port; use the URL it prints.

**My data disappears when I restart the server**
That is `SEED_ON_START=true` doing its job. Set it to `false` in `backend/.env`.
