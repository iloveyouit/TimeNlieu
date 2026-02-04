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

Initialize the SQLite database and push the schema:

```bash
npx drizzle-kit push
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📖 Development Notes

- **Client/Server Components**: This project strictly follows Next.js 15 architectural patterns. Interactive components are marked with `"use client"`.
- **Authentication**: A mock credential provider is currently implemented for testing (`test@example.com` / `password`).
- **Database**: The database is local SQLite (`dev.db`). The schema is defined in `src/db/schema.ts`.

## 📜 License

MIT
