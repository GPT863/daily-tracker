# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal health/daily-activity tracker with a vanilla JS frontend (PWA) and an optional .NET 8 backend for cloud sync. The frontend works standalone via LocalStorage; the backend adds multi-user cloud sync over MySQL.

## Frontend

**Run locally:**
```bash
python -m http.server 8000
# or
npx http-server
```

**Deploy:** Static files only — `index.html`, `style.css`, `app.js`, `sw.js`, `manifest.json`, `vendor/chart.umd.min.js`. Configured for Vercel via `vercel.json`.

**Architecture:**
- Single-page app with no framework. All pages are `<section>` elements toggled by `currentPage` state in `app.js`.
- Data flows: user action → modal form → `app.js` function → LocalStorage write + optional API call → re-render timeline/section.
- Cloud sync is an overlay: `app.js` calls backend REST endpoints if a sync URL is configured; otherwise everything stays in LocalStorage.
- Chart.js 4.4.1 is vendored at `vendor/chart.umd.min.js` (no CDN dependency).

**Key global state in `app.js`:** `activities`, `healthRecords`, `symptomRecords`, `reminders`, `profile`, `familyMembers`, `aiConfig`, `currentPage`, `currentDate`.

## Backend

**Project:** `backend/src/DailyTracker.Api/` (.NET 8 Minimal API)

**Build & run:**
```bash
cd backend/src/DailyTracker.Api
dotnet run
# Swagger UI at http://localhost:<port>/swagger
```

**Publish:**
```bash
dotnet publish -c Release -o backend/publish
```

**Configuration** (`appsettings.json`):
- `ConnectionStrings:MySql` — shared MySQL connection string (腾讯云 CynosDB); individual store sections can override.
- `SnapshotStore:Provider` — `"mysql"` or `"file"`. File mode uses `SnapshotFileStore`; MySQL mode uses `SnapshotMySqlStore`. Selected via DI factory in `Program.cs`.
- `Auth` — JWT issuer/audience/signing key/expiry.
- Each domain store (`ActivityStore`, `HealthRecordStore`, etc.) has a `DefaultUserId` used when no JWT is present (legacy/anonymous mode).

**API groups (all in `Program.cs`):**
| Group | Path prefix | Notes |
|---|---|---|
| Auth | `/api/auth` | register, login, SMS login, `/me` |
| Activities | `/api/activities` | CRUD by date |
| Health Records | `/api/health-records` | CRUD by date |
| Symptom Records | `/api/symptom-records` | CRUD by date |
| Reminders | `/api/reminders` | CRUD + complete/reopen/snooze/today/upcoming |
| Profile | `/api/profile` | GET + PUT upsert |
| Daily Notes | `/api/daily-notes` | GET/PUT/DELETE by date |
| Snapshot | `/snapshot` | Legacy whole-DB blob sync (GET + PUT) |

All stores are `Singleton` services. Soft-delete pattern (`is_deleted` flag) is used throughout.

**Authentication:** JWT Bearer. Routes not explicitly guarded with `.RequireAuthorization()` accept anonymous access and fall back to `DefaultUserId` — this is intentional for backward compatibility.
