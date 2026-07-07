# 🏥 MediQR – Smart Hospital Management System

A full-stack QR-based hospital management system built with **Angular** (frontend), **Node.js + Express** (backend), and **MongoDB** (database).

---

## ✨ Features

| Module | Status |
|---|---|
| Patient Registration + QR Generation | ✅ Complete |
| QR Scanning (Camera + File Upload + Manual) | ✅ Complete |
| Vitals Entry (6 vital signs) | ✅ Complete |
| Automatic Health Status Evaluation | ✅ Complete |
| Doctor Feedback | ✅ Complete |
| Visit History with Timeline | ✅ Complete |
| Prescription Management | ✅ Complete |
| Pharmacy Dispense Tracking | ✅ Complete |
| Dashboard with Stats | ✅ Complete |
| Role-Based Access | ✅ Complete |
| PDF Report Generator | ✅ Complete |

---

## 🏗 Tech Stack

- **Frontend**: Angular 17, SCSS, html5-qrcode
- **Backend**: Node.js, Express.js, Mongoose
- **Database**: MongoDB (local or Atlas)
- **QR**: qrcode npm package (backend generation)

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB running locally OR a MongoDB Atlas connection string
- Angular CLI (`npm install -g @angular/cli`)

---

### 1. Clone / Extract

```bash
cd hospital-qr-system
```

---

### 2. Backend Setup

```bash
cd backend
npm install

# Create your .env file
cp .env.example .env
# Edit .env and set MONGODB_URI

npm start
# Server runs on http://localhost:5000
# Health check: http://localhost:5000/api/health
```

**`.env` example:**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hospital_qr_db
```

For **MongoDB Atlas**:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hospital_qr_db
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
ng serve
# App runs on http://localhost:4200
```

---

## 📡 API Reference

### Patients

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/patients` | Register new patient |
| `GET` | `/api/patients` | List all patients (search, paginate) |
| `GET` | `/api/patients/:id` | Get patient by patientId |
| `PUT` | `/api/patients/:id` | Update patient info |
| `GET` | `/api/patients/:id/qr` | Get patient QR code |

### Vitals

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/patients/:id/vitals` | Add vitals + auto-evaluate health |
| `PUT` | `/api/patients/:id/vitals/:vitalsId/feedback` | Update doctor feedback |

### Prescriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/patients/:id/prescriptions` | Add prescription |
| `PUT` | `/api/patients/:id/prescriptions/:rxId/dispense` | Mark medicine dispensed |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patients/stats/summary` | Dashboard statistics |

---

## 🩺 Health Evaluation Logic

The system automatically classifies vitals using medical reference ranges:

| Vital | Normal Range | Low Critical | High Critical |
|-------|-------------|--------------|---------------|
| Temperature | 36.5 – 37.5 °C | < 35°C | > 39°C |
| Systolic BP | 90 – 120 mmHg | < 80 | ≥ 140 |
| Diastolic BP | 60 – 80 mmHg | < 50 | ≥ 90 |
| Heart Rate | 60 – 100 bpm | < 40 | > 150 |
| Pulse Rate | 60 – 100 bpm | < 40 | > 150 |
| SpO₂ | 95 – 100 % | < 90% | — |

**Status levels:** `Normal` → `Low` / `High` → `Critical`

---

## 🌐 Deployment

### Backend → Render

1. Push `backend/` to a GitHub repo
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set environment variables: `MONGODB_URI`, `PORT=10000`
4. Build: `npm install` · Start: `node server.js`

### Frontend → Vercel / Netlify

1. Update `src/environments/environment.prod.ts`:
   ```typescript
   apiUrl: 'https://your-backend.onrender.com/api'
   ```
2. Build: `ng build --configuration production`
3. Deploy `dist/hospital-qr-frontend/` to Vercel or Netlify

---

## 📱 Workflow

```
Reception → Register Patient
              ↓
         QR Code Generated
              ↓
      Doctor Scans QR Code
              ↓
    Patient Details Loaded
              ↓
       Vitals Entered
              ↓
  System Evaluates Health →  Normal / Low / High / Critical
              ↓
    Doctor Adds Feedback
              ↓
    Visit History Updated
              ↓
  Prescriptions Written
              ↓
  Pharmacist Dispenses Medicine
```

---

## 📂 Project Structure

```
hospital-qr-system/
├── backend/
│   ├── models/
│   │   └── Patient.js          # Mongoose schema
│   ├── routes/
│   │   └── patients.js         # All API endpoints
│   ├── utils/
│   │   └── healthEvaluator.js  # Medical constraint logic
│   ├── server.js               # Express entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/
    └── src/app/
        ├── components/
        │   ├── navbar/          # Top navigation
        │   ├── dashboard/       # Patient list + stats
        │   ├── register/        # Patient registration + QR
        │   ├── scanner/         # QR camera/upload/manual
        │   ├── patient-detail/  # Full patient record
        │   ├── vitals-entry/    # Vital signs form
        │   ├── visit-history/   # Timeline of visits
        │   └── prescription/    # Rx management
        ├── models/
        │   └── patient.model.ts
        ├── services/
        │   └── patient.service.ts
        └── app.module.ts
```

---

## 🎨 UI Design

- **Theme**: Clean medical blue (`#1a5fa8`) with teal accents
- **Font**: Plus Jakarta Sans (modern, professional)
- **Layout**: Card-based, responsive, mobile-friendly
- **Status colors**: Green (Normal) · Amber (Low) · Orange (High) · Red (Critical)
- Real-time status dot indicators while entering vitals

---

## 📝 License

MIT – Free for educational and commercial use.
