CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  rut VARCHAR(10) UNIQUE NOT NULL,
  password VARCHAR(50) NOT NULL,
  nombre VARCHAR(100),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prestamos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  rut VARCHAR(10) NOT NULL,
  monto BIGINT NOT NULL,
  cuotas INTEGER NOT NULL,
  renta BIGINT,
  fecha_primer_pago DATE,
  estado VARCHAR(20) DEFAULT 'EN EVALUACIÓN',
  tasa_interes DECIMAL(5,4),
  cuota_mensual BIGINT,
  ctc BIGINT,
  cae DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prestamos_user_id ON prestamos(user_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_rut ON prestamos(rut);
CREATE INDEX IF NOT EXISTS idx_users_rut ON users(rut);

--user de prueba
INSERT INTO users (rut, password, nombre, email) 
VALUES (' ', '12345', 'usuario_test', 'test@usm.cl')
ON CONFLICT (rut) DO NOTHING;

--prueba
INSERT INTO users (rut, password, nombre, email) VALUES
('11111111-1', 'pass1', 'Ana Torres', 'ana.torres@example.com'),
('22222222-2', 'pass2', 'Luis Ramírez', 'luis.ramirez@example.com'),
('33333333-3', 'pass3', 'Sofía González', 'sofia.gonzalez@example.com');

INSERT INTO prestamos (user_id, rut, monto, cuotas, renta, fecha_primer_pago, estado, tasa_interes, cuota_mensual, ctc, cae)
VALUES
(1, '11111111-1', 4500000, 24, 1200000, '2025-12-01', 'APROBADO', 0.0219, 210000, 5040000, 2.3),
(2, '22222222-2', 3200000, 18, 900000, '2025-12-01', 'FIRMADO', 0.0219, 180000, 3240000, 2.1),
(3, '33333333-3', 7000000, 36, 1500000, '2025-12-01', 'VIGENTE', 0.0134, 210000, 7560000, 1.8);