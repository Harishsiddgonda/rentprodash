# RentPro — Rental Management App

RentPro is a full-stack rental management system featuring flat/tenant tracking, utility meter billing (electricity, water, sanitation), monthly invoice generation, payment ledger, monthly CSV exports, and downloadable PDF bills.

## Project Structure

- `frontend/` (`mobile/`) — React Native / Expo application supporting Web, Android, and iOS (`App.js`)
- `backend/` — Express REST API with billing calculation engines, PDF generation (`pdfkit`), and CSV exports
- `database/` — Persistent JSON document store schema, documentation, and preconfigured sample dataset (`data.json`)
- `TEST_REPORT.md` — Test suite execution report and QA verification checklist

## Requirements

- Node.js 18+ (20 LTS recommended), npm
- Any modern web browser (for Web UI) or Expo Go / emulator (for Android/iOS)

## Quick Start (Run Locally)

### 1. Install Dependencies
```bash
# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../mobile && npm install
```

### 2. Start the Backend & Web App
```bash
# Run from repository root:
npm start
```
The unified server will start at **http://localhost:4000**.
- **Web App**: Open [http://localhost:4000](http://localhost:4000) in your browser.
- **API Health Check**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

### 3. Start Expo Dev Server (For Mobile / Hot Reload)
```bash
npm run start:frontend
```
Metro Dev Server runs at **http://localhost:8081** with QR code support for Expo Go.

## Database

The application persists data in a lightweight JSON document store located at `backend/data.json` (mirrored in `database/data.json`).
- Pre-seeded with 4 flats, October 2026 billing history, and custom utility rates.
- Automatic carry-forward validation for meter readings across months.

## API Overview

- `GET /api/health` — Service health check
- `GET/PUT /api/settings` — Get / update utility unit tariffs
- `GET/POST /api/flats` — Flat directory & tenant management
- `PUT/DELETE /api/flats/:id` — Update or remove flat
- `GET /api/bills?month=YYYY-MM` — List monthly bills
- `POST /api/bills/generate` — Calculate & issue bills for all flats
- `POST /api/bills/:id/payment` — Record UPI / cash payment towards bill balance
- `GET /api/export/:month.csv` — Export billing summary as CSV spreadsheet
- `GET /api/bills/:id/pdf` — Generate and stream PDF invoice
- `GET /api/dashboard?month=YYYY-MM` — Aggregated income, collections, and vacancy metrics

## Automated Testing

```bash
npm test
```
All 9 unit and API integration tests run through the native Node.js test runner and Supertest.
