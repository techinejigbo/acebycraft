# BioAir: Biology Continuous Assessment & Automated Airtime Reward Platform 🧬📱

An automated platform designed for biology educators to host weekly continuous assessment (CA) quizzes on weekends and instantly credit top-performing students with mobile airtime rewards via **Reloadly**.

---

## 🌟 Key Features

### 🎓 Student Portal (`/student-portal`)
- **Verified Mobile Login**: Firebase Phone Authentication ensures airtime is sent directly to the student's verified device.
- **Weekend-Only Assessment Window**: Smart timer locks assessments outside the configured weekend testing window.
- **Anti-Cheat Engine**:
  - Live visibility detection (`document.hidden` / tab-switch strikes).
  - Copy/paste lockout on question content.
  - Strict countdown timer with automatic force-submission on zero.
- **Zero-Trust Client Security**: Question options never expose correct answers in client payloads or DOM. Grading occurs exclusively on the Next.js serverless backend.
- **Instant CA Grade & Airtime Modal**: Instant calculation of continuous assessment scores + automatic mobile airtime disbursement via Reloadly.

### 🛡️ Admin Command Dashboard (`/admin-portal`)
- **Assessment Management**: Create, schedule, activate/deactivate weekly biology quizzes.
- **Question Authoring & Secure Answer Keys**: Add questions with topic tags, choices A-D, and correct answers. Correct answers are automatically stored in the secure `answerKeys` collection that clients cannot read.
- **Bulk Import**: Upload biology quizzes instantly using JSON or CSV format.
- **Student Registry & CA Export**: View registered students, cumulative CA marks, and export official grade sheets to CSV for school records.
- **Airtime Transaction Log**: Monitor Reloadly airtime delivery status, sandbox balance, and trigger manual re-attempts if a student's network fails.

---

## 🏗️ Architecture & Security

```
bio/
├── student-portal/            # Student assessment Next.js app
│   ├── src/app/
│   │   ├── page.tsx           # Landing & login entry
│   │   ├── dashboard/         # CA scores, weekend quiz list
│   │   ├── assessment/[id]/   # Quiz engine (anti-cheat, timer)
│   │   └── api/grade-quiz/    # Serverless grading & Reloadly airtime dispatch
│   └── ...
├── admin-portal/              # Instructor dashboard Next.js app
│   ├── src/app/
│   │   ├── dashboard/         # Metrics, student list, CA export
│   │   ├── assessments/       # Quiz creator & question authoring
│   │   ├── airtime/           # Reloadly monitor & transactions
│   │   └── api/               # Admin privileged API endpoints
│   └── ...
├── firestore.rules            # Production-grade Firestore lockdown
├── sample_biology_assessments.json # 10 curated biology questions
└── README.md
```

---

## 🚀 Setup & Installation

### Step 1: Firebase Project Setup (Free Spark Tier)
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project (e.g. `bio-ca-airtime`).
2. **Authentication**: Enable **Phone** provider (or Email/Password for testing).
3. **Firestore Database**: Create database in production mode.
4. **Deploy Security Rules**: Copy the contents of `firestore.rules` into Firebase Console > Firestore Database > Rules > Publish.
5. **Generate Service Account**:
   - Go to Project Settings > **Service Accounts**.
   - Click **Generate New Private Key** (downloads a `.json` file).
   - This powers the serverless backend (`FIREBASE_SERVICE_ACCOUNT_KEY`).

### Step 2: Reloadly Account Setup (Airtime Provider)
1. Register for a free developer account at [Reloadly](https://www.reloadly.com/).
2. In the Reloadly Dashboard, switch to **Sandbox Mode** for free testing.
3. Go to **Developers > API Settings** and copy:
   - `Client ID`
   - `Client Secret`
4. Sandbox test phone numbers receive simulated top-ups without spending real money.

### Step 3: Environment Variables
Create `.env.local` inside `student-portal/` and `admin-portal/` based on the `.env.example` templates provided in each directory.

---

## 🧪 Testing the Platform

1. **Start the Student Portal**:
   ```bash
   cd student-portal
   npm run dev
   # Opens on http://localhost:3000
   ```
2. **Start the Admin Portal**:
   ```bash
   cd admin-portal
   npm run dev -- -p 3001
   # Opens on http://localhost:3001
   ```
