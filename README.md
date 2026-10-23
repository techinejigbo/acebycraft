# AceByCraft (ABC Nigeria) — Weekly Continuous Assessment Platform

A multi-subject weekly continuous assessment (CA) platform for Nigerian secondary school students. Students take a timed weekly assessment across their chosen subjects. Students who reach the score benchmark compete for airtime rewards ranked by completion speed.

---

## Portals

| Portal | Folder | Who uses it | Purpose |
| --- | --- | --- | --- |
| Student | `student-portal/` | Students | Sign up, pick subjects, take the weekly assessment, review feedback and rewards |
| Admin | `admin-portal/` | Platform administrator | Manage subjects, schools, teachers, assessments, students, and the airtime ledger |
| School | `school-portal/` | Registered schools | View their own students' results and frequently missed questions |
| Teacher | `teacher-portal/` | Volunteer educators | Contribute questions for administrator review |

All four are separate Next.js apps that share one Firebase project. Server-side API routes use the Firebase Admin SDK.

---

## Setup

### 1. Firebase
1. Create a Firebase project and a Firestore database (production mode).
2. Publish the rules in `firestore.rules` (Firestore → Rules).
3. Project Settings → Service Accounts → **Generate New Private Key**.
4. Put the key JSON into `FIREBASE_SERVICE_ACCOUNT_KEY`.

### 2. Environment variables
Copy `.env.example` to `.env` inside each portal folder and fill in the Firebase values.

### 3. Run locally
```bash
cd student-portal && npm run dev            # http://localhost:3000
cd admin-portal   && npm run dev -- -p 3001 # http://localhost:3001
cd school-portal  && npm run dev -- -p 3002 # http://localhost:3002
cd teacher-portal && npm run dev -- -p 3003 # http://localhost:3003
```

---

## Airtime rewards

Rewards are not sent automatically. After each weekly cycle closes, the administrator reviews the qualifying students in the admin portal, sends airtime manually, and records each payment.
