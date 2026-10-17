-- ==============================================================================
-- Online Medical Consultation Platform
-- Database Schema for MySQL 8.0 (XAMPP / LAMP Stack)
-- Matches SRS Section 4.5 and Section 5.8 Entity Relationship Diagram (ERD)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS medconsult_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medconsult_db;

-- 1. Users Table (Patient, Doctor, Administrator)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Patient', 'Doctor', 'Administrator') NOT NULL,
    specialty VARCHAR(255) NULL,
    qualification VARCHAR(255) NULL,
    license_number VARCHAR(100) NULL,
    experience_years INT DEFAULT 0,
    biography TEXT NULL,
    is_verified TINYINT(1) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_doctor_lookup (role, is_verified, specialty, status)
) ENGINE=InnoDB;

-- 2. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    status ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled') DEFAULT 'Pending',
    meeting_link VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_conflict_check (doctor_id, preferred_date, preferred_time, status)
) ENGINE=InnoDB;

-- 3. Messages Table (Secure Asynchronous Messaging with 3-second Polling)
CREATE TABLE IF NOT EXISTS messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_body TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_appointment_messages (appointment_id, message_id)
) ENGINE=InnoDB;

-- 4. Prescriptions Table (Linked 1-to-1 with Completed Consultations)
CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL UNIQUE,
    doctor_id INT NOT NULL,
    prescription_body TEXT NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Invoices Table (Linked 1-to-1 with Completed Consultations)
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL UNIQUE,
    doctor_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('Pending', 'Paid') DEFAULT 'Pending',
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Audit Log Table (Tracking Administrative & Security Events)
CREATE TABLE IF NOT EXISTS audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. Symptoms Reference Table (From SRS ERD Figure 5.8)
CREATE TABLE IF NOT EXISTS symptoms (
    symptom_id INT AUTO_INCREMENT PRIMARY KEY,
    symptom_name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

-- 8. Contact Inquiries Table
CREATE TABLE IF NOT EXISTS contact_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message_body TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'New',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==============================================================================
-- Seed Data: Default Admin & Initial Verified Doctors
-- Admin credentials: admin@medconsult.com / admin123 (bcrypt hashed)
-- Doctor credentials: doctor@medconsult.com / doctor123
-- ==============================================================================

INSERT INTO users (user_id, name, email, password_hash, role, specialty, qualification, license_number, experience_years, biography, is_verified, status)
VALUES
(1, 'System Administrator', 'admin@medconsult.com', '$2y$12$Q34piv1Co7BqlfllwFi3W.cR0J8gTEEp0goLdqctn9ppcgUweSBo.', 'Administrator', NULL, NULL, NULL, 0, 'Platform Administrator account.', 1, 'Active'),
(2, 'Dr. Sarah Ahmed', 'dr.sarah@medconsult.com', '$2y$12$Q34piv1Co7BqlfllwFi3W.cR0J8gTEEp0goLdqctn9ppcgUweSBo.', 'Doctor', 'Cardiologist', 'MBBS, FCPS (Cardiology)', 'PMC-48291-C', 10, 'Consultant Cardiologist specializing in cardiovascular health, hypertension, and preventive cardiology.', 1, 'Active'),
(3, 'Dr. Usman Ali', 'dr.usman@medconsult.com', '$2y$12$Q34piv1Co7BqlfllwFi3W.cR0J8gTEEp0goLdqctn9ppcgUweSBo.', 'Doctor', 'Dermatologist', 'MBBS, MCPS (Dermatology)', 'PMC-39182-D', 8, 'Experienced Dermatologist providing treatment for skin conditions, allergies, and cosmetic dermatology.', 1, 'Active'),
(4, 'Dr. Ayesha Malik', 'dr.ayesha@medconsult.com', '$2y$12$Q34piv1Co7BqlfllwFi3W.cR0J8gTEEp0goLdqctn9ppcgUweSBo.', 'Doctor', 'General Practitioner', 'MBBS, RMP', 'PMC-77123-G', 6, 'General Physician providing primary care, fever management, routine checkups, and triage advice.', 1, 'Active'),
(5, 'Dr. Tariq Mahmood', 'dr.tariq@medconsult.com', '$2y$12$Q34piv1Co7BqlfllwFi3W.cR0J8gTEEp0goLdqctn9ppcgUweSBo.', 'Doctor', 'Neurologist', 'MBBS, FCPS (Neurology)', 'PMC-66129-N', 12, 'Consultant Neurologist specializing in headache disorders, epilepsy, and peripheral neuropathy.', 1, 'Active'),
(6, 'Dr. Fatima Noor', 'dr.fatima@medconsult.com', '$2y$12$Q34piv1Co7BqlfllwFi3W.cR0J8gTEEp0goLdqctn9ppcgUweSBo.', 'Doctor', 'Pulmonologist', 'MBBS, DTCD, FCPS (Pulmonology)', 'PMC-55198-P', 9, 'Chest and respiratory specialist focusing on asthma, bronchitis, pneumonia, and allergy treatments.', 1, 'Active')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Sample Symptoms Mapping (SRS ERD Table)
INSERT INTO symptoms (symptom_name, specialty) VALUES
('chest pain', 'Cardiologist'),
('shortness of breath', 'Cardiologist'),
('skin rash', 'Dermatologist'),
('itching', 'Dermatologist'),
('joint pain', 'Orthopedist'),
('migraine headache', 'Neurologist'),
('stomach ache', 'Gastroenterologist'),
('fever and cough', 'Pulmonologist'),
('fatigue and excessive thirst', 'Endocrinologist')
ON DUPLICATE KEY UPDATE specialty = VALUES(specialty);
