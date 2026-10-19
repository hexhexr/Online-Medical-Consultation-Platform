# Online Medical Consultation Platform (MedConsult)

[![PHP Version](https://img.shields.io/badge/PHP-8.2-777BB4?logo=php&logoColor=white)](https://www.php.net/)
[![Python Version](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Database](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Frontend](https://img.shields.io/badge/Bootstrap-5.3-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![License](https://img.shields.io/badge/License-Academic-blue.svg)](#)

An intelligent, web-based outpatient telemedicine platform featuring a self-hosted Three-Tier Architecture and an AI-driven Natural Language Processing (NLP) Symptom Triage Microservice.

---

## 1. Project Information

* **Project Title**: Online Medical Consultation Platform (MedConsult)
* **Degree Program**: Bachelor of Science in Computer Science (BSCS) | Session 2024–2026
* **Institution**: Department of Computer Science & Information Technology, University of Southern Punjab (USP), Multan
* **Supervisor**: Majid Khawar
* **Project Team**:
  * **Muhammad Danial** (Reg No: `BSCSW-2.5Y-021R24-4`)
  * **Muhammad Bilal** (Reg No: `BSCSW-2.5Y-021R24-1`)
  * **Muhammad Mudassar Javed** (Reg No: `BSCSW-2.5Y-021R24-5`)

---

## 2. System Overview

The **Online Medical Consultation Platform (MedConsult)** addresses structural outpatient care disparities and clinical misdirection by providing a verifiable, end-to-end telemedicine workflow. Non-clinical patients often struggle to navigate medical departments, booking consultations with unsuitable specialists and experiencing diagnostic delays. 

MedConsult resolves this by integrating a dedicated machine learning microservice that analyzes free-text symptom descriptions and routes patients to the appropriate medical specialty in under 50ms.

### Key Subsystems
* **AI NLP Symptom Triage**: Preprocesses free-text clinical complaints using TF-IDF vectorization and classifies the target specialty via an optimized Random Forest classifier.
* **Specialist Directory & Scheduling**: Searchable catalog of licensed physicians with real-time specialty filtering and transactional conflict-free appointment booking.
* **Consultation Messaging**: Appointment-scoped asynchronous chat with 3-second AJAX polling.
* **Digital Clinical Records**: Standardized authoring and archival of digital prescriptions and billing invoices with real-time settlement tracking.
* **Administrative Governance**: Credential verification auditing Pakistan Medical Commission (PMC) license numbers and centralized system audit logging.

---

## 3. Technology Stack

| Tier | Technologies | System Responsibilities |
| :--- | :--- | :--- |
| **Presentation Tier** | HTML5, CSS3, JavaScript (ES6+), Bootstrap 5.3, Bootstrap Icons | Role-based responsive dashboards for Patients, Doctors, and Administrators |
| **Application Tier** | PHP 8.x, PDO, Prepared Statements, Session Management, cURL | REST API controllers, business logic, RBAC, and microservice proxying |
| **AI Triage Tier** | Python 3.9+, Flask, scikit-learn, TF-IDF, Random Forest, pandas | Natural language preprocessing, clinical keyword extraction, specialty inference |
| **Persistence Tier** | MySQL 8.0 / MariaDB, 3NF Relational Schema, TLS/SSL | Relational storage, referential integrity, foreign key cascading, indexing |
| **Runtime & Hosting** | Apache 2.4 / PHP Built-in Server / Docker Engine | Local development, multi-platform hosting, containerized cloud deployment |

---

## 4. Directory Structure

```text
Online Medical Consultation Platform/
├── ai_engine/                         # Python AI NLP Triage Microservice
│   ├── dataset/
│   │   └── training_data.csv          # Clinical training benchmark dataset (4,920 records)
│   ├── service.py                     # Flask REST microservice listening on 127.0.0.1:5000
│   ├── train.py                       # Model training pipeline (TF-IDF + Random Forest)
│   ├── triage.py                      # Standalone CLI inference helper
│   └── triage_model.pkl               # Serialized production machine learning model
├── api/                               # Client-Facing API Routing Layer
│   ├── admin.php                      # Admin verification & audit log endpoints
│   ├── appointments.php               # Slot reservation & status management
│   ├── auth.php                       # Sign-up, login, logout, and session check
│   ├── contact.php                    # Public contact inquiry handler
│   ├── index.php                      # Default API router
│   ├── messaging.php                  # 3-second AJAX chat polling & message posting
│   ├── public.php                     # Verified doctor directory search & filters
│   ├── records.php                    # Digital prescriptions & billing invoices
│   ├── triage.php                     # Gateway proxying input to Python microservice
│   └── user.php                       # User profile retrieval and updates
├── backend/                           # Server-Side Business Logic Controllers
│   ├── admin.php                      # Doctor credential auditing logic
│   ├── api.php                        # Shared API response helper functions
│   ├── appointments.php               # Conflict detection and appointment lifecycle
│   ├── auth.php                       # Bcrypt password hashing (cost 12) & RBAC
│   ├── db.php                         # Centralized PDO connection with TLS/SSL
│   ├── isrgrootx1.pem                 # ISRG Root X1 CA certificate for cloud databases
│   ├── messaging.php                  # Appointment-scoped conversation controller
│   ├── public.php                     # Filter queries for verified practitioners
│   ├── records.php                    # Digital prescription & invoice management
│   ├── triage.php                     # cURL client communicating with Python service
│   └── user.php                       # User management routines
├── database/                          # Relational Database Persistence
│   └── schema_mysql.sql               # MySQL 8.0 schema DDL and pre-seeded test data
├── public/                            # Frontend Web Pages & Assets
│   ├── css/style.css                  # Custom application stylesheet
│   ├── images/                        # Platform icons and UI hero graphics
│   ├── js/                            # Client-side JavaScript controllers
│   │   ├── admin.js                   # Admin dashboard UI interactions
│   │   ├── app.js                     # Global utilities and alerts
│   │   ├── auth.js                    # Modal authentication and validation
│   │   ├── doctor.js                  # Doctor dashboard, chat, and prescriptions
│   │   ├── patient.js                 # Patient appointments, chat, and triage modal
│   │   └── public.js                  # Doctor catalog filters and search
│   ├── vendor/                        # Bootstrap 5.3 CSS, JS, and Icon libraries
│   ├── 404.html                       # Custom Not Found error page
│   ├── about.html                     # Platform mission and architecture overview
│   ├── admin_dashboard.html           # Administrator control panel
│   ├── contact.html                   # User inquiries page
│   ├── doctor_dashboard.html          # Doctor clinical management dashboard
│   ├── doctors.html                   # Searchable doctor directory
│   ├── faq.html                       # Platform help and documentation
│   ├── index.html                     # Public home landing page
│   ├── login.html                     # Unified role-based authentication portal
│   ├── patient_dashboard.html         # Patient overview, triage, and appointments
│   ├── privacy.html                   # Patient data privacy statement
│   └── terms.html                     # Service terms and clinical disclaimers
├── .dockerignore                      # Docker build exclusions
├── .gitignore                         # Git tracking exclusions
├── .htaccess                          # Apache URL rewrite and routing rules
├── docker-entrypoint.sh               # Dual-service container startup entrypoint
├── Dockerfile                         # Production multi-stage Docker container specification
├── FINAL_FYDP_PROJECT_REPORT.docx     # Complete FYDP Final Report (Microsoft Word)
├── FINAL_FYDP_PROJECT_REPORT.pdf      # Complete FYDP Final Report (Compiled PDF)
├── README.md                          # Project documentation and codebase guide
├── render.yaml                        # Render Cloud Infrastructure as Code blueprint
├── RENDER_DEPLOYMENT_GUIDE.md         # Production cloud deployment guide
├── requirements.txt                   # Python package dependencies
├── router.php                         # PHP built-in web server router
├── run_linux.sh                       # One-click Linux development launcher
├── run_windows.bat                    # One-click Windows development launcher
└── standee_poster.pdf                 # Exhibition Standee Poster (Print Vector PDF)
```

---

## 5. System Requirements & Prerequisites

### Hardware Requirements
* **Processor**: Dual-Core 2.0 GHz or higher (x86_64 or ARM64)
* **Memory (RAM)**: 4 GB minimum (8 GB recommended)
* **Storage**: 500 MB available disk space

### Software Prerequisites
* **Operating System**: Linux (Ubuntu 20.04+), Windows 10/11, or macOS
* **PHP Runtime**: PHP 8.0+ with `pdo_mysql`, `curl`, `json`, and `session` extensions
* **Python Runtime**: Python 3.9+ with `pip`
* **Database Engine**: MySQL 8.0+ or MariaDB 10.4+ (local or managed cloud instance)
* **Browser**: Chrome, Firefox, Edge, or Safari (modern versions supporting ES6)

---

## 6. Dependencies & Installation

### Python Dependencies (AI Triage Microservice)
Dependencies are specified in `requirements.txt`:
```bash
pip install -r requirements.txt
```

Package specifications:
* `flask >= 3.0.0` (REST microservice framework)
* `scikit-learn >= 1.3.0` (TF-IDF vectorizer and Random Forest classifier)
* `pandas >= 2.0.0` (Data loading and matrix operations)
* `numpy >= 1.24.0` (Numerical computation)

> **Note**: A serialized production model (`ai_engine/triage_model.pkl`) trained on 4,920 clinical symptom records is pre-packaged. To retrain the model on the raw benchmark dataset:
> ```bash
> python ai_engine/train.py
> ```

### PHP Dependencies
The PHP application layer uses native standard library extensions (`pdo`, `session`, `curl`, `json`, `filter`). No third-party package managers (e.g., Composer) or external runtime libraries are required.

---

## 7. Database Configuration

* **Database Name**: `medconsult_db`
* **Character Set / Collation**: `utf8mb4 / utf8mb4_unicode_ci`
* **Schema DDL**: `database/schema_mysql.sql` (defines 8 relational tables in 3NF with foreign key cascading and pre-seeded seed data)

### Default Connection Parameters
Connection parameters are defined in `backend/db.php` and can be overridden via environment variables:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DB_HOST` | `127.0.0.1` | MySQL server host address |
| `DB_PORT` | `3306` | MySQL server port |
| `DB_NAME` | `medconsult_db` | Target database name |
| `DB_USER` | `root` | Database user account |
| `DB_PASS` | `""` (empty) | Database user password |

### Schema Initialization
Import the schema via CLI:
```bash
mysql -u root -p medconsult_db < database/schema_mysql.sql
```

---

## 8. Service Execution & Networking

The system operates across two concurrent services:

```text
[ Client Browser ]
        │
        ├─── HTTP :8000 ────► [ PHP Application Server ] ────► [ MySQL Persistence :3306 ]
        │                            │
        │                       Internal cURL
        │                            ▼
        └────────────────────► [ Flask AI Microservice :5000 ]
```

### Launch Options

#### Option A: Quick Launch Scripts
* **Linux**:
  ```bash
  ./run_linux.sh
  ```
* **Windows**:
  ```cmd
  run_windows.bat
  ```

#### Option B: Standalone Process Execution
1. **Python AI Triage Microservice**:
   ```bash
   python ai_engine/service.py
   # Listening on http://127.0.0.1:5000
   ```
2. **PHP Application Server**:
   ```bash
   php -S 127.0.0.1:8000 router.php
   # Listening on http://127.0.0.1:8000
   ```

#### Option C: Docker Containerization
```bash
docker build -t medconsult:latest .
docker run -p 8000:80 -e PORT=80 medconsult:latest
```

---

## 9. Pre-Configured Test Accounts

The schema includes pre-seeded accounts for evaluation:

| Role | Name | Email | Password | Scope & Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | System Admin | `admin@medconsult.com` | `admin123` | PMC license verification, user lifecycle management, audit logs |
| **Doctor** | Dr. Sarah Ahmed | `dr.sarah@medconsult.com` | `admin123` | Cardiologist (`PMC-48291-C`), consultation schedule, prescriptions, invoices |
| **Doctor** | Dr. Usman Ali | `dr.usman@medconsult.com` | `admin123` | Dermatologist (`PMC-39182-D`), appointment reviews |
| **Doctor** | Dr. Ayesha Malik | `dr.ayesha@medconsult.com` | `admin123` | General Practitioner (`PMC-77123-G`), consultation management |
| **Patient** | Ali Khan | `ali.khan@example.com` | `password123` | Symptom triage, appointment booking, real-time messaging, records |

---

## 10. API Route Reference

| Method | Endpoint Route | Controller | Functionality |
| :---: | :--- | :--- | :--- |
| `POST` | `/api/auth.php?action=login` | `backend/auth.php` | Authenticates user credentials via bcrypt verification |
| `POST` | `/api/auth.php?action=register` | `backend/auth.php` | Registers new Patient or Doctor account |
| `POST` | `/api/triage.php` | `backend/triage.php` | Proxies symptom payload to AI microservice `/predict` |
| `GET` | `/api/public.php?action=list_doctors` | `backend/public.php` | Retrieves verified doctor directory with specialty filters |
| `POST` | `/api/appointments.php?action=book` | `backend/appointments.php` | Atomic appointment booking with schedule conflict checking |
| `GET` | `/api/messaging.php?action=fetch` | `backend/messaging.php` | Polling endpoint for consultation chat messages |
| `POST` | `/api/messaging.php?action=send` | `backend/messaging.php` | Sends chat message within an active consultation |
| `POST` | `/api/records.php?action=issue_rx` | `backend/records.php` | Creates digital prescription for completed consultation |
| `POST` | `/api/records.php?action=pay_invoice` | `backend/records.php` | Settles consultation invoice and records audit trail |
| `POST` | `/api/admin.php?action=verify_doctor`| `backend/admin.php` | Audits PMC license and updates doctor verification status |

---

## 11. Project Deliverables

1. **Academic Project Report**: Complete final report in [FINAL_FYDP_PROJECT_REPORT.pdf](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/FINAL_FYDP_PROJECT_REPORT.pdf) and editable source [FINAL_FYDP_PROJECT_REPORT.docx](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/FINAL_FYDP_PROJECT_REPORT.docx).
2. **Exhibition Standee Poster**: Vector print graphic [standee_poster.pdf](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/standee_poster.pdf).
3. **Application Source Code**: Modular Three-Tier PHP backend, JavaScript presentation layer, and Python AI NLP microservice.
4. **Persistence & Data Assets**: Relational schema DDL [database/schema_mysql.sql](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/database/schema_mysql.sql) and benchmark dataset [ai_engine/dataset/training_data.csv](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/ai_engine/dataset/training_data.csv).
5. **Deployment Specifications**: Multi-stage [Dockerfile](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/Dockerfile) and [render.yaml](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/render.yaml) Cloud IaC configuration.
