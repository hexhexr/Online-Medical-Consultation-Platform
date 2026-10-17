# ==============================================================================
# Online Medical Consultation Platform (MedConsult)
# Unified Production Dockerfile for Render Free Web Service
# Combines PHP 8.2 (PDO MySQL) + Python 3.12 (AI NLP Symptom Triage Microservice)
# ==============================================================================

FROM php:8.2-cli-bookworm

# 1. Install system utilities, Python 3, pip, venv, and MySQL PDO extension
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    default-mysql-client \
    curl \
    ca-certificates \
    && docker-php-ext-install pdo pdo_mysql \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 2. Set container working directory
WORKDIR /app

# 3. Setup Python virtual environment and install AI/ML dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy application source files
COPY . .

# 5. Make startup entrypoint executable
RUN chmod +x docker-entrypoint.sh

# 6. Default port (Render injects $PORT dynamically, e.g. 10000)
EXPOSE 8000

# 7. Start both Python microservice and PHP server via entrypoint
ENTRYPOINT ["./docker-entrypoint.sh"]
