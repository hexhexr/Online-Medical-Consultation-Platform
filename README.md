# Online Medical Consultation Platform (MedConsult)

Final Year Project (FYP-II) — Department of Computer Science & IT, University of Southern Punjab (USP), Multan.

---

## 1. Project Title & Brief Description

* **Project Title**: Online Medical Consultation Platform
* **Supervised by**: Majid Khawar
* **Submitted by**:
  * Muhammad Danial (Reg No: BSCSW-2.5Y-021R24-4)
  * Muhammad Bilal (Reg No: BSCSW-2.5Y-021R24-1)
  * Muhammad Mudassar Javed (Reg No: BSCSW-2.5Y-021R24-5)

### Description
The **Online Medical Consultation Platform** is an intelligent web-based telemedicine system designed to address healthcare accessibility barriers in Pakistan, where the doctor-to-patient ratio is approximately 1:1,000 and rural populations face significant specialist shortages. 

The platform features an **AI-driven NLP Symptom Triage Engine** that enables patients to describe their symptoms in free-text natural language. The system predicts the appropriate medical specialty and shortlists matching verified doctors. It then coordinates the complete consultation lifecycle: appointment scheduling with slot conflict detection, asynchronous chat via 3-second AJAX polling, external video session integration (Google Meet), digital prescription management, offline billing invoice generation, and an administrator verification control panel.

---

## 2. Tools, Technologies, and Software Used

### Architecture
* **Design Pattern**: Three-Tier Client-Server Architecture
* **Stack**: Standard LAMP / XAMPP Stack (Self-Hosted & Academic Deployment)

### Technologies
* **Presentation Layer (Frontend)**: HTML5, CSS3, Vanilla JavaScript (ES6+), Bootstrap 5.3, Bootstrap Icons
* **Application Layer (Backend)**: PHP 8.x, Native PHP Sessions, PHP Data Objects (PDO) with Prepared Statements, bcrypt Password Hashing
* **AI & NLP Micro-Module**: Python 3.x, scikit-learn, TF-IDF Vectorizer, Random Forest Classifier, pandas, Flask REST API
* **Data Layer (Database)**: MySQL 8.0 (Primary via PDO) / SQLite (Zero-Configuration Fallback)
* **Web Server**: Apache 2.4 (via XAMPP) / PHP Built-in Server

---

## 3. System Requirements and Prerequisites

### Hardware Requirements
* **Processor**: Intel Core i3 / i5 (or AMD equivalent) 2.0 GHz or higher
* **Memory (RAM)**: 4 GB minimum (8 GB recommended)
* **Storage**: 500 MB free hard drive space
* **Display**: Minimum screen resolution 1024 × 768 pixels

### Software Prerequisites
* **Operating System**: Windows 10/11 or Linux (Ubuntu 20.04+) or macOS
* **Web Browser**: Google Chrome, Mozilla Firefox, or Microsoft Edge (modern versions)
* **PHP Runtime**: PHP 8.0 or higher with `pdo_mysql` and `pdo_sqlite` extensions (included with standard XAMPP)
* **Python Runtime**: Python 3.9 or higher with `pip`
* **Database**: MySQL 8.0 (via XAMPP) or built-in SQLite

---

## 4. Step-by-Step Installation and Configuration Instructions

### Step 1: Extract or Place Project Files
* **On Windows (XAMPP)**: Copy the project folder into your XAMPP web root:
  ```text
  C:\xampp\htdocs\medconsult
  ```
* **Or Any Local Directory**: Keep the project in any working folder (e.g. `C:\Users\<YourUser>\Desktop\MedConsult`).

### Step 2: Environment Verification
Ensure PHP and Python are added to your system PATH:
```bash
php -v
python --version
```

---

## 5. Required Dependencies and Instructions for Installing Them

### Python AI Engine Dependencies
The AI symptom triage engine uses `scikit-learn`, `pandas`, and `flask`. Install them using pip:

```bash
pip install -r requirements.txt
```

*(Note: The pre-trained machine learning model `triage_model.pkl` is already included and ready to use. If you wish to retrain the model on the Kaggle dataset, run: `python ai_engine/train.py`)*

### PHP Dependencies
None required. The backend uses native PHP 8.x standard libraries (`session`, `pdo`, `json`, `filter`) without heavy external composer packages, ensuring maximum reliability and transparency.

---

## 6. Database Setup and Configuration Instructions

You can use either the official **MySQL** setup (standard for XAMPP) or the zero-configuration **SQLite** fallback.

### Option A: MySQL 8.0 via XAMPP (University Submission Standard)
1. Launch **XAMPP Control Panel** and start **Apache** and **MySQL**.
2. Open **phpMyAdmin** in your browser: `http://localhost/phpmyadmin/`.
3. Create a new database named `medconsult_db` with collation `utf8mb4_unicode_ci`.
4. Click the **Import** tab, browse for `database/schema_mysql.sql`, and click **Go**.
5. The tables (`users`, `appointments`, `messages`, `prescriptions`, `invoices`, `audit_log`, `symptoms`, `contact_messages`) and pre-seeded verified doctor accounts will be created automatically.

*Default database credentials in `backend/db.php` match standard XAMPP (`127.0.0.1:3306`, user: `root`, password: empty).*

### Option B: SQLite (Zero-Setup Automatic Fallback)
If MySQL is not installed or running, the system automatically detects and uses `database/medconsult.sqlite` via PDO SQLite. No manual setup is required.

---

## 7. Step-by-Step Instructions for Running the Project

### Method A: Quick One-Click Run on Windows
1. Double-click **`run_windows.bat`** located in the project root directory.
2. The server will start and automatically open the application in your browser at:
   ```text
   http://127.0.0.1:8000
   ```

### Method B: Running via PHP Built-in Server (Command Line)
Open Command Prompt / Terminal inside the project directory and execute:
```bash
php -S 127.0.0.1:8000 router.php
```
Then navigate to `http://127.0.0.1:8000` in your web browser.

### Method C: Running via Apache / XAMPP
Navigate to:
```text
http://localhost/medconsult/public/
```

---

## 8. Pre-Configured Test Accounts

| Role | Email | Password | Access Details |
|---|---|---|---|
| **Administrator** | `admin@medconsult.com` | `admin123` | Platform metrics, doctor credential verifications, audit logs |
| **Doctor (Cardiology)** | `dr.sarah@medconsult.com` | `admin123` | Verified consultant cardiologist, appointment management |
| **Doctor (Dermatology)**| `dr.usman@medconsult.com` | `admin123` | Verified dermatologist |
| **Doctor (General)**    | `dr.ayesha@medconsult.com`| `admin123` | Verified general physician |
| **Patient**             | `ali.khan@example.com`    | `password123` | Patient triage, booking, chat, prescriptions, invoices |

---

## 9. Viva Defense Quick Reference (Frequently Asked Questions)

### Q1: What is the system architecture?
> **Answer**: *"Our system implements a classic Three-Tier Architecture as defined in Section 5.2 of our SRS:
> 1. **Presentation Layer**: HTML5, CSS3, JavaScript, and Bootstrap 5 in the browser.
> 2. **Application Layer**: PHP 8.x for business logic, sessions, and access control, integrated with a Python micro-module for AI symptom triage.
> 3. **Data Layer**: MySQL 8.0 database accessed via PDO prepared statements."*

### Q2: How does PHP communicate with the Python AI module?
> **Answer**: *"As explicitly mandated by FR-07 of our approved SRS: 'The system shall pass the sanitised input from PHP to the Python NLP module via an internal REST API HTTP request.' In `backend/triage.php`, when a patient describes symptoms, PHP passes the JSON payload via an HTTP POST request to the internal Python Flask microservice running on port 5000 (`/predict`). The Python service extracts TF-IDF features, evaluates the trained Random Forest classifier, and returns the specialty recommendation and confidence score as JSON. PHP then queries MySQL for verified doctors in that specialty and returns the complete result to the frontend."*

### Q3: How is SQL Injection prevented?
> **Answer**: *"We strictly use PHP PDO with parameter binding (`$stmt->prepare()` and `$stmt->execute([$params])`) for all SQL operations in `backend/db.php` and throughout all controller scripts. No user input is ever concatenated into SQL query strings."*

### Q4: How is real-time chat implemented without WebSockets?
> **Answer**: *"As specified in Section 2.6 and Section 3.5 of our SRS, we use **AJAX polling** every 3 seconds. The frontend calls `GET /api/messaging?action=fetch&appointment_id=X&last_id=Y` which only retrieves new messages where `message_id > last_id`, minimizing server load while providing seamless chat."*

### Q5: How does appointment conflict detection work?
> **Answer**: *"In `backend/appointments.php`, when an appointment is requested, we query the `appointments` table for the same doctor, date, and time where the status is `Pending` or `Confirmed`. If a matching record exists, the system rejects the booking with an HTTP 409 Conflict status and prompts the patient to choose another time."*

---

## 10. Cloud Deployment (Render.com)

For full instructions on deploying this platform to **Render** for **100% free** using our unified Dockerfile and TiDB Cloud Serverless MySQL, see:
* [RENDER_DEPLOYMENT_GUIDE.md](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/RENDER_DEPLOYMENT_GUIDE.md)

