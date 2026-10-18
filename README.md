# Online Medical Consultation Platform (MedConsult)

[![PHP Version](https://img.shields.io/badge/PHP-8.2-777BB4?logo=php&logoColor=white)](https://www.php.net/)
[![Python Version](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Database](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Frontend](https://img.shields.io/badge/Bootstrap-5.3-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![License](https://img.shields.io/badge/License-Academic-blue.svg)](#)

An intelligent, web-based outpatient telemedicine platform featuring a self-hosted Three-Tier Architecture and an AI-driven Natural Language Processing (NLP) Symptom Triage Microservice.

---

## 1. Project Title & Brief Description

* **Project Title**: Online Medical Consultation Platform (MedConsult)
* **Academic Program**: Bachelor of Science in Computer Science (BSCS) | Session 2024–2026
* **Institution**: Department of Computer Science & Information Technology, University of Southern Punjab (USP), Multan
* **Supervisor**: Majid Khawar
* **Developed by**:
  * **Muhammad Danial** (Reg No: `BSCSW-2.5Y-021R24-4`)
  * **Muhammad Bilal** (Reg No: `BSCSW-2.5Y-021R24-1`)
  * **Muhammad Mudassar Javed** (Reg No: `BSCSW-2.5Y-021R24-5`)

### Brief Description
The **Online Medical Consultation Platform (MedConsult)** is an end-to-end telemedicine web application designed to overcome healthcare distribution disparities and patient misdirection. In conventional outpatient workflows, non-clinical patients experiencing complex symptoms often book appointments with inappropriate departments, leading to wasted consultation fees and treatment delays.

MedConsult solves this through an integrated machine learning microservice that analyzes free-text patient symptom descriptions and predicts the appropriate medical specialty in under 50ms. The platform orchestrates the complete outpatient consultation lifecycle:
* **AI NLP Symptom Triage**: Converts unstructured patient text into clinical term frequencies (TF-IDF) and classifies the target medical specialty using a Random Forest model.
* **Doctor Discovery & Scheduling**: Public searchable directory of certified doctors with an atomic booking engine preventing double-booking.
* **Asynchronous Consultation Chat**: Real-time messaging updated via 3-second AJAX polling.
* **Digital Clinical Records**: Clinician authoring of digital prescriptions and consultation invoices.
* **Regulatory Governance**: Administrator verification portal auditing Pakistan Medical Commission (PMC) license numbers and tracking security access logs.

---

## 2. Tools, Technologies, and Software Used

| Layer | Technologies & Tools | Key Role in Codebase |
| :--- | :--- | :--- |
| **Frontend (Presentation)** | HTML5, CSS3, JavaScript (ES6+), Bootstrap 5.3, Bootstrap Icons | Responsive UI dashboards for Patients, Doctors, and Administrators |
| **Backend (Application)** | PHP 8.x, PHP PDO, Prepared Statements, Native Sessions, cURL | REST controllers, session state, authentication, and microservice proxy |
| **AI / NLP Microservice** | Python 3.9+, Flask, scikit-learn, TF-IDF Vectorizer, Random Forest, pandas | Natural language preprocessing, model inference (`POST /predict`) |
| **Database (Persistence)** | MySQL 8.0 (InnoDB), 3NF Relational Schema, TLS/SSL (TiDB Cloud) | Relational persistence, foreign key cascading, composite indexes |
| **Web Server / Runtime** | Apache 2.4 (XAMPP) / PHP Built-in Server / Docker Engine | Local development, multi-platform hosting, container runtime |

---

## 3. Codebase Directory Structure

```text
Online Medical Consultation Platform/
├── ai_engine/                         # Python AI NLP Triage Microservice
│   ├── dataset/
│   │   └── training_data.csv          # Clinical training benchmark dataset (4,920 records)
│   ├── service.py                     # Flask REST microservice listening on 127.0.0.1:5000
│   ├── train.py                       # Model training pipeline (TF-IDF + Random Forest)
│   ├── triage.py                      # Standalone CLI inference helper
│   └── triage_model.pkl               # Serialized production machine learning model
├── api/                               # Client-Facing API Routing Endpoints
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
├── poster/                            # Exhibition Standee Poster
│   ├── erd_diagram.jpg                # High-resolution database ERD diagram
│   ├── standee_poster.html            # Standee poster source code (1200x1930px)
│   ├── standee_poster.pdf             # Standee poster vector print document
│   ├── standee_poster.png             # Standee poster high-resolution preview
│   └── university_logo.png            # University of Southern Punjab crest
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
├── FINAL_FYDP_PROJECT_REPORT.md       # Complete FYDP Final Report (Markdown)
├── FINAL_FYDP_PROJECT_REPORT.pdf      # Complete FYDP Final Report (Compiled PDF)
├── README.md                          # Project documentation and codebase guide
├── render.yaml                        # Render Cloud Infrastructure as Code blueprint
├── RENDER_DEPLOYMENT_GUIDE.md         # Production cloud deployment guide
├── requirements.txt                   # Python package dependencies
├── router.php                         # PHP built-in web server router
└── run_windows.bat                    # One-click Windows development launcher
```

---

## 4. System Requirements and Prerequisites

### Hardware Requirements
* **Processor**: Intel Core i3 / i5 (or AMD equivalent) 2.0 GHz or higher
* **Memory (RAM)**: 4 GB minimum (8 GB recommended for simultaneous development)
* **Storage**: 500 MB free disk space
* **Display**: Minimum screen resolution `1024 × 768` pixels

### Software Prerequisites
* **Operating System**: Windows 10/11, Linux (Ubuntu 20.04+), or macOS
* **Web Browser**: Google Chrome, Mozilla Firefox, or Microsoft Edge (recent versions)
* **PHP Runtime**: PHP 8.0 or higher with `pdo_mysql`, `curl`, and `json` extensions (standard in XAMPP)
* **Python Runtime**: Python 3.9, 3.10, 3.11, or 3.12 with `pip`
* **Database Server**: MySQL 8.0 / MariaDB (via XAMPP) or remote cloud database (TiDB Serverless)

---

## 5. Required Dependencies and Instructions for Installing Them

### 5.1 Python Dependencies (AI Triage Microservice)
Install the required Python packages into your environment using `pip`:

```bash
pip install -r requirements.txt
```

*Contents of `requirements.txt`:*
```text
flask>=3.0.0
scikit-learn>=1.3.0
pandas>=2.0.0
numpy>=1.24.0
```

> **Note**: A pre-trained production model (`ai_engine/triage_model.pkl`) is already bundled in the repository. If you wish to retrain the model on the raw benchmark dataset, simply execute:
> ```bash
> python ai_engine/train.py
> ```

### 5.2 PHP Dependencies
No third-party packages (e.g. Composer) are required. The codebase uses native PHP 8.x standard library extensions (`pdo`, `session`, `curl`, `json`, `filter`), ensuring zero package bloat and turnkey execution.

---

## 6. Database Setup and Configuration Instructions

### Setting up MySQL via phpMyAdmin (Standard XAMPP)
1. Start **Apache** and **MySQL** modules from the **XAMPP Control Panel**.
2. Open your web browser and navigate to phpMyAdmin:
   ```text
   http://localhost/phpmyadmin/
   ```
3. Click **New** in the left sidebar and create a database named:
   * **Database name**: `medconsult_db`
   * **Collation**: `utf8mb4_unicode_ci`
4. Select the newly created `medconsult_db` database, click the **Import** tab at the top.
5. Click **Choose File**, select `database/schema_mysql.sql` from the project repository, and click **Import** (or **Go**).
6. The import will create all 8 relational tables and pre-populate verified clinician accounts, sample appointments, and symptoms.

### Database Connection Configuration
Default credentials in `backend/db.php` connect to local MySQL on standard ports:
```php
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'medconsult_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
```
If using custom MySQL credentials, update `backend/db.php` or set the corresponding environment variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`).

---

## 7. Step-by-Step Instructions for Running the Project

### Method A: One-Click Launcher
* **Linux**: Run the launcher script in terminal:
  ```bash
  ./run_linux.sh
  ```
* **Windows**: Double-click **`run_windows.bat`**.

The launcher starts both the Python AI microservice (port 5000) and the PHP web server (port 8000), accessible at:
```text
http://127.0.0.1:8000
```

### Method B: Manual CLI Execution (Linux / macOS / Windows)
To run both the PHP web server and the Python AI triage microservice concurrently:

1. **Terminal 1 — Start the Python AI Microservice**:
   ```bash
   python ai_engine/service.py
   ```
   *(Listens on `http://127.0.0.1:5000`)*

2. **Terminal 2 — Start the PHP Application Server**:
   ```bash
   php -S 127.0.0.1:8000 router.php
   ```

3. Open your browser and navigate to:
   ```text
   http://127.0.0.1:8000
   ```

### Method C: Running via Apache (XAMPP `htdocs`)
1. Move or clone the project folder into:
   ```text
   C:\xampp\htdocs\medconsult
   ```
2. Start the Python microservice in a terminal: `python ai_engine/service.py`.
3. Access the web interface in your browser:
   ```text
   http://localhost/medconsult/public/
   ```

---

## 8. Pre-Configured Test Accounts

The database comes pre-seeded with verified test accounts across all roles:

| Role | Name | Email | Password | Access Details |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | System Admin | `admin@medconsult.com` | `admin123` | Doctor PMC licensing verification, system audit logs, metrics |
| **Doctor** | Dr. Sarah Ahmed | `dr.sarah@medconsult.com` | `admin123` | Cardiologist (`PMC-77123-C`), clinical dashboard, prescriptions |
| **Doctor** | Dr. Usman Tariq | `dr.usman@medconsult.com` | `admin123` | Dermatologist (`PMC-88451-D`), appointment reviews |
| **Doctor** | Dr. Ayesha Malik | `dr.ayesha@medconsult.com` | `admin123` | General Practitioner (`PMC-99234-G`), consultation room |
| **Patient** | Ali Khan | `ali.khan@example.com` | `password123` | AI NLP symptom triage, appointment bookings, consultation chat |

---

## 9. Primary API Routes & Controllers

| Endpoint Route | Method | Backend Controller | Description |
| :--- | :---: | :--- | :--- |
| `/api/auth.php?action=login` | `POST` | `backend/auth.php` | Authenticates credentials with bcrypt verification |
| `/api/auth.php?action=register` | `POST` | `backend/auth.php` | Registers new Patient or Doctor account |
| `/api/triage.php` | `POST` | `backend/triage.php` | Proxies symptom text to Python Flask `/predict` microservice |
| `/api/public.php?action=doctors` | `GET` | `backend/public.php` | Retrieves verified doctor catalog with specialty filtering |
| `/api/appointments.php?action=book` | `POST` | `backend/appointments.php` | Atomic appointment booking with conflict checking |
| `/api/messaging.php?action=fetch` | `GET` | `backend/messaging.php` | 3-second AJAX polling for new consultation messages |
| `/api/messaging.php?action=send` | `POST` | `backend/messaging.php` | Dispatches new chat message to verified consultation |
| `/api/records.php?action=issue_rx` | `POST` | `backend/records.php` | Clinician digital prescription creation |
| `/api/admin.php?action=verify_doctor`| `POST` | `backend/admin.php` | Verifies doctor PMC license and updates public visibility |

---

## 10. Container & Cloud Deployment (Docker / Render)

The project includes a production-ready, multi-stage `Dockerfile` bundling PHP 8.2 CLI, Python 3.12, scikit-learn, and required dependencies into a unified container.

To build and run locally with Docker:
```bash
# Build Docker image
docker build -t medconsult:latest .

# Run container bound to host port 8000
docker run -p 8000:80 -e PORT=80 medconsult:latest
```

For automated deployment to **Render.com** backed by **TiDB Cloud Serverless MySQL**, refer to the included [RENDER_DEPLOYMENT_GUIDE.md](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/RENDER_DEPLOYMENT_GUIDE.md).

---

## 11. Final Submission Deliverables

As mandated by the Department of Computer Science & IT guidelines, the final submission package contains:
1. **Printed & Bound Final Report**: Complete, ring-bound physical report copy.
2. **Digital FYDP Report**: [FINAL_FYDP_PROJECT_REPORT.pdf](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/FINAL_FYDP_PROJECT_REPORT.pdf) and [FINAL_FYDP_PROJECT_REPORT.docx](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/FINAL_FYDP_PROJECT_REPORT.docx).
3. **Standee Exhibition Poster**: Vector print file [poster/standee_poster.pdf](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/poster/standee_poster.pdf) and high-resolution graphic [poster/standee_poster.png](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/poster/standee_poster.png).
4. **Complete Source Code**: Modular PHP presentation & application tiers, Python AI triage microservice, and Docker assets.
5. **Database & Dataset**: Complete relational schema [database/schema_mysql.sql](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/database/schema_mysql.sql) and benchmark dataset [ai_engine/dataset/training_data.csv](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/ai_engine/dataset/training_data.csv).
6. **Codebase README**: This [README.md](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/README.md) file.
