-- Jalankan file ini sekali di database MySQL Anda (lewat phpMyAdmin / mysql CLI / dashboard provider)

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('Admin','Pengurus') NOT NULL DEFAULT 'Pengurus',
  status ENUM('Aktif','Nonaktif') NOT NULL DEFAULT 'Aktif',
  created_at DATE NOT NULL DEFAULT (CURRENT_DATE)
);

CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  judul VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  kategori VARCHAR(150) NOT NULL,
  tanggal DATE NOT NULL,
  uploaded_by VARCHAR(150),
  file_name VARCHAR(255),
  file_url VARCHAR(500),
  file_type VARCHAR(150),
  file_size INT,
  created_at DATE NOT NULL DEFAULT (CURRENT_DATE)
);

-- Akun demo awal (password sebaiknya diganti / di-hash lewat aplikasi nanti)
INSERT INTO users (nama, email, password, role, status) VALUES
  ('Admin Plosodoyong', 'admin@plosodoyong.id', 'admin123', 'Admin', 'Aktif'),
  ('Pengurus 1', 'pengurus@plosodoyong.id', 'pengurus123', 'Pengurus', 'Aktif');
