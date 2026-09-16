# Workflow (MERN)

A team issue tracker: teams own boards, boards hold issues, and any issue can be
broken down into sub-issues. Every issue gets a readable identifier like `ENG-1`
that increments per team.

Built with MongoDB, Express, React and Node — the same stack and the same
folder layout as the reference project.

---

## What it does

- Email and password sign-in backed by JWT
- A board per team with columns for Backlog, Todo, In Progress, In Review and Done
- Create an issue from anywhere with the **New issue** button or the `c` key
- Identifiers in the form `TEAM_KEY-NUMBER`, counted separately for each team
- Sub-issues with a real parent-child link, listed on the parent's detail page
- Change status, priority and assignee inline; each change is written to the activity feed
- Comments per issue
- Searchable list views for all issues and for the ones assigned to you

---

## Running it

You need Node 18 or newer and a MongoDB you can reach (a local `mongod`, or a
MongoDB Atlas connection string).

```bash
# 1. install everything
npm run install:all

# 2. point the backend at your database
cp backend/.env.example backend/.env
#    then edit MONGO_URI if you are not using a local mongod

# 3. start the API and the web app together
npm run dev
```

The API listens on <http://localhost:5000> and the web app on
<http://localhost:5173>. Vite proxies `/api` to the backend, so the browser only
ever talks to one origin and there is nothing to configure for CORS in dev.

**Sign in with:**

```
Email:    sanjoy@workflow.dev
Password: Password@123
```

Every seeded account uses the same password. If sign-in fails the first time,
the API is probably still seeding — wait a second and reload.

### Running the halves separately

```bash
npm run server   # API only, with nodemon
npm run client   # web app only
npm run seed     # reload the demo data
npm test         # backend test suite
```

---

## Environment variables

`backend/.env`:

| Variable | What it does | Default |
| --- | --- | --- |
| `PORT` | Port the API listens on | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/WorkflowDB` |
| `JWT_SECRET` | Secret used to sign tokens — change this for anything real | — |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `SEED_ON_START` | Reseed the database on every server start | `true` |

Set `SEED_ON_START=false` once you want your own data to survive a restart.
While it is `true`, restarting the server wipes the database and reloads the
demo dataset, which keeps the sample board predictable.

---

## Project layout

```
workflow-mern/
├── package.json              scripts that drive both halves
├── backend/
│   ├── app.js                Express app — exported, does not listen
│   ├── server.js             connects to Mongo, seeds, then listens
│   ├── config/
│   │   ├── db.js             Mongoose connection
│   │   └── seed.js           demo users, teams and issues
│   ├── controllers/          request handlers, one file per resource
│   ├── middleware/
│   │   ├── auth.js           Bearer-token guard
│   │   └── errorHandler.js   404 and central error handling
│   ├── models/               Mongoose schemas
│   ├── routes/               route tables, one file per resource
│   ├── utils/generateToken.js
│   └── test/app.spec.js      Mocha + Chai integration tests
└── frontend/
    ├── vite.config.js        dev server and /api proxy
    └── src/
        ├── api/client.js     fetch wrapper that attaches the token
        ├── components/       layout, board card, composer, dropdown, icons
        ├── context/          auth state
        ├── pages/            login, board, issue detail, issue lists
        └── styles/app.css
```

`app.js` and `server.js` are deliberately separate: the test suite imports the
app and drives it in-process, so the app itself must never open a port.

---

## API

All routes except `/api/auth/*` need an `Authorization: Bearer <token>` header.

### Auth

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account, returns a token |
| POST | `/api/auth/login` | Sign in, returns a token |
| GET | `/api/auth/me` | The signed-in user |

### Issues

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/issues` | Every issue; supports `?search=`, `?status=`, `?assignee=` |
| POST | `/api/issues` | Create an issue or sub-issue |
| GET | `/api/issues/team/:teamId` | Issues for one team; supports `?status=`, `?parentIssue=` |
| GET | `/api/issues/:identifier` | One issue plus its sub-issues |
| GET | `/api/issues/:identifier/sub-issues` | Sub-issues only |
| PATCH | `/api/issues/:identifier` | Update; logs an activity per changed field |
| DELETE | `/api/issues/:identifier` | Delete the issue, its sub-issues, comments and activity |

### Teams, users, comments, activity

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/teams` | All teams |
| POST | `/api/teams` | Create a team |
| GET | `/api/teams/:key` | One team by key, e.g. `ENG` |
| GET | `/api/teams/:key/stats` | Issue counts grouped by status |
| GET | `/api/users` | All users, for the assignee pickers |
| GET | `/api/comments/:identifier` | Comments on an issue |
| POST | `/api/comments/:identifier` | Add a comment |
| GET | `/api/activities/:identifier` | Activity feed for an issue |

### POST /api/issues

Request:

```json
{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication system",
  "teamId": "team_id",
  "status": "todo",
  "priority": "high",
  "assignee": "user_id",
  "parentIssue": "parent_issue_id",
  "labels": ["backend", "security"]
}
```

Only `title` and `teamId` are required. `status` defaults to `todo`, `priority`
to `no_priority`, and `parentIssue` to `null`.

Response, `201`:

```json
{
  "issue": {
    "_id": "issue_id",
    "identifier": "ENG-1",
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication system",
    "status": "todo",
    "priority": "high",
    "team": { "_id": "team_id", "name": "Engineering", "key": "ENG", "icon": "E" },
    "assignee": "user_id",
    "creator": "user_id",
    "parentIssue": null,
    "labels": ["backend", "security"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

Errors:

| Status | Body | When |
| --- | --- | --- |
| 400 | `{ "message": "Title is required" }` | Title missing or blank |
| 404 | `{ "message": "Team not found" }` | Team id unknown or malformed |
| 404 | `{ "message": "Parent issue not found" }` | `parentIssue` points at nothing |
| 401 | `{ "message": "..." }` | Token missing, expired or invalid |

`parentIssue` comes back as a raw id rather than an expanded object, so clients
can compare it against the id they sent without unwrapping anything.

---

## How identifiers work

Each team document carries an `issueCounter`. Creating an issue increments it
with a single atomic `$inc` and uses the returned value:

```js
const team = await Team.findByIdAndUpdate(
  teamId,
  { $inc: { issueCounter: 1 } },
  { new: true }
);
const identifier = `${team.key}-${team.issueCounter}`;
```

Counting existing documents instead would be wrong twice over: two simultaneous
requests would read the same count and collide, and deleting an issue would make
the next one reuse a retired identifier. The counter only ever moves forward,
and because it lives on the team, `ENG` and `DES` number themselves
independently.

---

## Data model

**User** — name, email (unique), password hash, avatar, role. `matchPassword()`
compares a plaintext attempt against the hash; `toJSON()` strips the hash so it
can never leak through a response.

**Team** — name, key (unique, uppercase), icon, color, description, members,
`issueCounter`.

**Issue** — identifier (unique), title, description, status, priority, team,
assignee, creator, `parentIssue`, labels, timestamps. `parentIssue` is `null` for
a top-level issue and holds an Issue id for a sub-issue, which is the whole
parent-child mechanism.

**Activity** — issue, user, action (`created`, `updated_status`, `commented`, …),
changes, timestamps.

**Comment** — issue, user, body, timestamps.

---

## Tests

```bash
npm test
```

Mocha and Chai drive the Express app in-process with `chai-http`. Each run
creates its own database (`WorkflowDB_Test_<random>`) and drops it afterwards, so
tests never touch your development data. The suite covers issue creation,
sub-issue linking, identifier auto-increment, the validation and auth failure
paths, activity logging, and that a created issue really does come back from the
board endpoint.

A running MongoDB is required.

---

## Notes

- The board only renders top-level issues. Sub-issues appear on their parent's
  detail page, which keeps a broken-down task from cluttering the column.
- Deleting an issue removes its sub-issues, comments and activity together, so
  no orphaned rows are left behind.
- `SEED_ON_START` is on by default for demo convenience. Turn it off before you
  put real data in.
- `JWT_SECRET` in `.env.example` is a placeholder. Replace it before deploying.
