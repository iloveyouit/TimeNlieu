# TimeNlieu

**TimeNlieu** is a modern timesheet management application built with **Next.js 15**, focusing on tracking work hours and managing **Time in Lieu** (accrued overtime).

## 🚀 Features

- **Dashboard**: High-level overview of hours and lieu balance.
- **Timesheet Entries**: Log and manage daily work activities.
- **Calendar View**: Visual representation of your work month.
- **Reports**: Weekly and monthly hour summaries.
- **Authentication**: Secure login via NextAuth.js (implemented with Drizzle adapter).
- **Responsive Design**: Polished UI using Tailwind CSS 4 and Shadcn UI.

## 🛠 Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Database**: [SQLite](https://www.sqlite.org/) (Better-SQLite3)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Auth**: [NextAuth.js v4](https://next-auth.js.org/)
- **Analytics**: [Recharts](https://recharts.org/)

## 🏁 Getting Started

### 1. Prerequisites

- Node.js (v20 or higher recommended)
- npm or yarn

### 2. Installation

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory based on `.env.example`:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Database Setup

Migrations run automatically when the dev server starts. To run
them manually:

```bash
npm run db:migrate
```

A seed admin account (`test@example.com` / `password`) is created
on first run if the users table is empty.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🐳 Docker

The application ships as a single container with SQLite on a named
volume. No external database is required.

```bash
docker compose up -d
```

Migrations and the seed admin account are handled automatically on
container start. The database persists at `/app/data/dev.db` inside
the container across restarts.

---

## 📖 Development Notes

- **Client/Server Components**: This project strictly follows Next.js 15 architectural patterns. Interactive components are marked with `"use client"`.
- **Authentication**: Credentials are verified against the `users` table using bcrypt. A seed admin account (`test@example.com` / `password`) is created automatically on first run.
- **Database**: The database is local SQLite (`dev.db`). The schema is defined in `src/db/schema.ts`.

## ❓ Troubleshooting

### Database Migration Errors

If you encounter `SqliteError: table ... already exists` when starting the server, it usually means your local `dev.db` is out of sync with the migration history.

**Solution: Reset the Local Database**

1.  Stop the development server.
2.  Delete the local database files:
    ```bash
    rm dev.db dev.db-shm dev.db-wal
    ```
3.  Restart the server:
    ```bash
    npm run dev
    ```

The application will automatically recreate the database and seed it with the default admin account.

## 📜 License

MIT
