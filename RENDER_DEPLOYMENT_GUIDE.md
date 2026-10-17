# Free Deployment Guide for Render (MedConsult Platform)

This guide provides a step-by-step walkthrough to deploy the **Online Medical Consultation Platform** on **Render.com** for **100% free**, with **zero complex configuration** or struggle.

---

## Architecture Overview on Render

Because our platform uses both **PHP 8.2** (backend & frontend routing) and **Python 3.12** (Flask AI NLP Symptom Triage Microservice) alongside a **MySQL 8.0** database, we use a **Single Unified Docker Container**:

```
+-------------------------------------------------------------------------+
| Render Free Web Service (1 Single Container - 512 MB RAM)                |
|                                                                         |
|  +---------------------------+       +-------------------------------+  |
|  |   PHP 8.2 Web Server      |       | Python 3.12 Flask Service     |  |
|  | (Port: $PORT from Render) | ----> | (127.0.0.1:5000 /predict)     |  |
|  |   Handles HTML/CSS/APIs   |       | Scikit-learn TF-IDF Model     |  |
|  +---------------------------+       +-------------------------------+  |
+-------------------------------------------------------------------------+
                               |
                               v (PDO MySQL)
+-------------------------------------------------------------------------+
| Free Cloud MySQL Database (TiDB Cloud Serverless or Aiven - 5GB Free)   |
+-------------------------------------------------------------------------+
```

### Why this approach is the easiest:
1. **One Web Service = 100% Free**: Uses only 1 service slot on Render's 750 free hours/month tier.
2. **Local Internal Communication**: PHP talks directly to Python on `127.0.0.1:5000` inside the same container. No public API exposure, no network latency, no CORS issues.
3. **No Apache/Nginx Complex Setup**: Uses the built-in PHP high-concurrency worker server (`PHP_CLI_SERVER_WORKERS=4`), which is already tested with [`router.php`](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/router.php).
4. **Persistent Cloud Database**: Render's free tier has PostgreSQL but not MySQL. Using a free cloud MySQL (TiDB Cloud Serverless) gives you 5GB permanent storage with zero expiration and no credit card required.

---

## Step 1: Create a Free Cloud MySQL Database (2 Minutes)

We recommend **TiDB Cloud Serverless** (fully MySQL 8.0 compatible, 100% free forever, no credit card):

1. Go to **[https://tidbcloud.com](https://tidbcloud.com)** and sign up with your Google or GitHub account.
2. Click **Create Cluster**, select **Serverless**, choose your nearest region (e.g. AWS / Oregon or Frankfurt), and click **Create**.
3. In your cluster dashboard:
   - Click the **SQL Editor** tab on the left menu.
   - Open [`database/schema_mysql.sql`](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/database/schema_mysql.sql), copy its entire text, paste it into the SQL Editor, and click **Run**.
   - This creates all tables (`users`, `appointments`, `messages`, `prescriptions`, `invoices`, `symptoms`) and seeds default accounts:
     - Admin: `admin@medconsult.com` / `admin123`
     - Doctor: `dr.sarah@medconsult.com` / `admin123`
4. Click the **Connect** button on top right to get your credentials:
   - **Host** (e.g., `gateway01.us-east-1.prod.aws.tidbcloud.com`)
   - **Port** (usually `4000`)
   - **User** (e.g., `xxxxxx.root`)
   - **Password** (your cluster password)
   - **Database Name** (`medconsult_db` or `test`)

---

## Step 2: Push Your Project to GitHub

1. Initialize git and commit your files (if not already done):
   ```bash
   git init
   git add .
   git commit -m "MedConsult ready for Render deployment"
   ```
2. Create a new repository on **GitHub** (public or private).
3. Push your code to GitHub:
   ```bash
   git remote add origin https://github.com/<your-username>/medconsult-platform.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 3: Deploy to Render (1-Click)

1. Go to **[https://render.com](https://render.com)** and log in with your GitHub account.
2. Click **New +** on the top right and select **Web Service**.
3. Select **Build and deploy from a Git repository**, and choose your `medconsult-platform` repository.
4. Render will automatically detect the [`Dockerfile`](file:///home/bolt/projects/Online%20Medical%20Consultation%20Platform/Dockerfile):
   - **Name**: `medconsult-platform` (or any name you choose)
   - **Region**: Nearest to your TiDB cluster
   - **Branch**: `main`
   - **Runtime**: `Docker`
   - **Instance Type**: `Free` ($0/month)
5. Scroll down to **Environment Variables** and add your 5 database credentials from Step 1:

| Environment Variable | Example Value | Description |
| :--- | :--- | :--- |
| `DB_HOST` | `gateway01.us-east-1.prod.aws.tidbcloud.com` | Your TiDB or MySQL host |
| `DB_PORT` | `4000` (or `3306`) | Database port |
| `DB_NAME` | `medconsult_db` (or `test`) | Database name |
| `DB_USER` | `xxxxxx.root` | Database username |
| `DB_PASS` | `YourPassword123` | Database password |

6. Click **Create Web Service**.

---

## Step 4: Verification & Live Access

Render will start building the Docker container (approx. 2-3 minutes). Once build finishes:
* You will see the log:
  ```
  [1/2] Launching Python Flask AI Triage Microservice (port 5000)...
  ✓ AI microservice started successfully
  [2/2] Launching PHP Web Server on 0.0.0.0:10000...
  ```
* Your live URL will appear at the top:
  `https://medconsult-platform.onrender.com`

### Verification Checklist:
1. Open the URL in your browser -> Public landing page and doctor directory load immediately.
2. Sign in as a Patient (`ali.khan@example.com` / `password123`) -> Go to **AI Triage**, input symptoms (e.g., *"severe chest pain and shortness of breath"*), click **Analyze Symptoms** -> Verified: returns **Cardiologist** recommendation in <50ms.
3. Sign in as Doctor (`dr.sarah@medconsult.com` / `admin123`) -> Verified: displays **"Welcome, Dr. Sarah Ahmed"** and clinical dashboard.
4. Sign in as Administrator (`admin@medconsult.com` / `admin123`) -> Verified: access control panel, doctor PMC verification, and audit logs.

---

## Cold Start Note (Render Free Tier)
Render's free tier spins down web services after 15 minutes of inactivity. When a user visits the link after a cold period, Render takes about **45 to 50 seconds** to wake up the container. Once awake, all interactions (pages, AJAX chat, AI predictions) respond in milliseconds.
