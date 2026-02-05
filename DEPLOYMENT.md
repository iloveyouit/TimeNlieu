# Deployment Guide

This application is containerized using Docker and is ready for deployment to any environment that supports Docker Compose (VPS, DigitalOcean Droplet, AWS EC2, etc.).

## Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- A domain name (optional, but recommended for production)
- A reverse proxy (Nginx, Traefik) if running on port 80/443 (optional)

## Quick Start (Production)

1.  **Clone the repository** to your server.
2.  **Create a production environment file**:
    ```bash
    cp .env.example .env.production
    ```
3.  **Configure secrets** in `.env.production`:
    - `NEXTAUTH_SECRET`: Generate a secure string (e.g., `openssl rand -base64 32`).
    - `NEXTAUTH_URL`: The full URL of your deployed app (e.g., `https://timesheets.example.com`).
    - `DATABASE_URL`: Keep as `file:./dev.db` (Docker overrides this internally to `/app/data/dev.db`).

4.  **Start the container**:

    ```bash
    docker-compose up -d --build
    ```

5.  **Verify**: The app will be available at `http://localhost:3000`.

## Architecture & Persistence

- **Database**: SQLite is used. Data is persisted in a Docker volume named `timenlieu_data`.
- **Migrations**: The app automatically attempts to migrate the database on startup using `src/instrumentation.ts`.
- **Build**: The `Dockerfile` uses a multi-stage `runner` build, producing a standalone Node.js bundle for minimal footprint.

## Managing Data

### Backups

To backup your database, you can copy the file from the volume:

```bash
# Find the container ID
docker ps

# Copy database out
docker cp <container_id>:/app/data/dev.db ./backup_dev.db
```

### Resetting Data (Caution)

To completely wipe the database and start fresh:

```bash
docker-compose down -v
docker-compose up -d
```

The `-v` flag removes the named volume.

## Troubleshooting

### "Table already exists" Error

If you encounter migration errors on startup, ensuring the volume is clean often fixes it (see Resetting Data).

### Healthcheck Fails

Check logs:

```bash
docker-compose logs -f
```

Ensure `NEXTAUTH_URL` matches the internal or external network access.
