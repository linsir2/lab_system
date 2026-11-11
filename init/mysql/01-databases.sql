CREATE DATABASE IF NOT EXISTS lab_person CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS lab_borrow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS lab_material CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS lab_borrow_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS lab_material_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'lab'@'%' IDENTIFIED WITH mysql_native_password BY 'labpass';
GRANT ALL PRIVILEGES ON lab_person.* TO 'lab'@'%';
GRANT ALL PRIVILEGES ON lab_borrow.* TO 'lab'@'%';
GRANT ALL PRIVILEGES ON lab_material.* TO 'lab'@'%';
GRANT ALL PRIVILEGES ON lab_borrow_test.* TO 'lab'@'%';
GRANT ALL PRIVILEGES ON lab_material_test.* TO 'lab'@'%';
FLUSH PRIVILEGES;
