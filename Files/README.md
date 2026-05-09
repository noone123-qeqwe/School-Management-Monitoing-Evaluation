# SMME Portal – School Management Monitoring & Evaluation

A full-stack web portal for private schools to submit documents to the Division Office.

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | HTML, CSS, Vanilla JS             |
| Backend  | Node.js + Express                 |
| Database | PostgreSQL                        |
| Hosting  | Render (web service + PostgreSQL) |
| Auth     | JWT (JSON Web Tokens)             |
| Files    | Multer (disk storage)             |

---

## Project Structure

```
smme-portal/
├── public/               # Frontend (served as static files)
│   ├── index.html
│   ├── login.html
│   ├── school-dashboard.html
│   ├── admin-dashboard.html
│   ├── api.js            # API client (replaces localStorage)
│   ├── login.js
│   ├── dashboard.js
│   ├── admin-dashboard.js
│   └── *.css
├── server/
│   ├── index.js          # Express app entry point
│   ├── db/
│   │   ├── pool.js       # PostgreSQL connection pool
│   │   ├── migrate.js    # Run schema migrations
│   │   └── seed.js       # Seed default data
│   ├── middleware/
│   │   └── auth.js       # JWT auth middleware
│   └── routes/
│       ├── auth.js       # Login, register, schools list
│       ├── submissions.js # Submit, list, review, download
│       ├── staff.js      # Staff management
│       ├── admin.js      # Admin stats, notices, deadlines, audit
│       └── notifications.js
├── uploads/              # Uploaded files (auto-created)
├── render.yaml           # One-click Render deployment
├── package.json
└── .env.example
```

---

## Local Development

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env and fill in your local DATABASE_URL, JWT_SECRET, SESSION_SECRET
```

### 4. Run database migrations & seed
```bash
npm run db:migrate
npm run db:seed
```

### 5. Start the server
```bash
npm run dev        # development (nodemon auto-reload)
# or
npm start          # production
```

Open **http://localhost:3000**

### Default credentials (after seeding)
| Role  | Username / Email                    | Password   |
|-------|-------------------------------------|------------|
| Admin | `admin`                             | `admin123` |
| Staff | `maria.santos@stmarys.edu.ph`       | `staff123` |
| Staff | `jose.reyes@stmarys.edu.ph`         | `staff123` |

---

## Deploy to Render (One-Click)

### Option A – Using render.yaml (recommended)

1. Push this project to a **GitHub repository**
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect your GitHub repo
4. Render reads `render.yaml` and automatically creates:
   - A **PostgreSQL** database (`smme-db`)
   - A **Web Service** (`smme-portal`) with the database URL injected
5. Click **Apply** — Render will build, migrate, seed, and deploy

### Option B – Manual setup

1. **Create PostgreSQL database** on Render:
   - Dashboard → New → PostgreSQL
   - Name: `smme-db`, Plan: Free
   - Copy the **Internal Database URL**

2. **Create Web Service** on Render:
   - Dashboard → New → Web Service
   - Connect your GitHub repo
   - Runtime: **Node**
   - Build Command: `npm install && npm run db:migrate && npm run db:seed`
   - Start Command: `npm start`

3. **Set Environment Variables** on the Web Service:
   | Key              | Value                                      |
   |------------------|--------------------------------------------|
   | `DATABASE_URL`   | Internal Database URL from step 1          |
   | `JWT_SECRET`     | Any long random string (32+ chars)         |
   | `SESSION_SECRET` | Any long random string (32+ chars)         |
   | `NODE_ENV`       | `production`                               |

4. Click **Deploy** — the app will be live at `https://smme-portal.onrender.com`

---

## API Endpoints

### Auth
| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| POST   | `/api/auth/staff/login`   | Staff login              |
| POST   | `/api/auth/staff/register`| Staff registration       |
| POST   | `/api/auth/admin/login`   | Admin login              |
| GET    | `/api/auth/schools`       | List schools (public)    |
| GET    | `/api/auth/me`            | Verify token             |

### Submissions
| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| POST   | `/api/submissions`                | Submit documents         |
| GET    | `/api/submissions`                | List submissions         |
| GET    | `/api/submissions/:ref`           | Get single submission    |
| PATCH  | `/api/submissions/:ref/review`    | Approve or return        |
| GET    | `/api/submissions/:ref/files/:id` | Download file            |

### Admin
| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| GET    | `/api/admin/stats`        | Dashboard statistics     |
| GET    | `/api/admin/schools`      | Schools with counts      |
| GET    | `/api/admin/audit`        | Audit log                |
| GET    | `/api/admin/notices`      | Division notices         |
| POST   | `/api/admin/notices`      | Post notice              |
| DELETE | `/api/admin/notices/:id`  | Delete notice            |
| GET    | `/api/admin/deadlines`    | Submission deadlines     |
| POST   | `/api/admin/deadlines`    | Add deadline             |
| DELETE | `/api/admin/deadlines/:id`| Delete deadline          |

---

## Notes

- **File uploads** are stored in the `uploads/` folder on the server disk.  
  On Render's free plan, the disk is ephemeral (resets on redeploy).  
  For production, integrate **Cloudinary** or **AWS S3** for persistent file storage.

- The **free Render PostgreSQL** database expires after 90 days.  
  Upgrade to a paid plan or use an external provider (Supabase, Neon, Railway) for production.

- JWT tokens expire after **8 hours**. Users are redirected to login automatically.
