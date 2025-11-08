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

-- Usuario de prueba
INSERT INTO users (rut, password, nombre, email) 
VALUES ('12345678-9', '12345', 'usuario_test', 'test@usm.cl')
ON CONFLICT (rut) DO NOTHING;