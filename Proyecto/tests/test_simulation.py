import unittest
import requests
import psycopg2
from datetime import datetime, timedelta

class TestSimulation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db_config = {
            "dbname": "mydb",
            "user": "user",
            "password": "password",
            "host": "localhost",
            "port": "5432"
        }
        cls.base_url = "http://localhost:3000"
        cls.test_rut = "8821873-6"
        cls.test_pass = "admin123"
        
        try:
            conn = psycopg2.connect(**cls.db_config)
            cur = conn.cursor()
            
            # 1. Insertar Usuario
            cur.execute(
                "INSERT INTO users (rut, password, nombre, email, created_at) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (rut) DO NOTHING",
                (cls.test_rut, cls.test_pass, "Usuario Test Unittest", "test@unittest.com", datetime.now())
            )
            
            # 2. Insertar Documentos y obtener sus IDs 
            doc_ids = []
            tipos = ["liquidacion", "cotizaciones", "carnet"]
            for tipo in tipos:
                nombre_archivo = f"{tipo}.pdf"
                ruta_ficticia = f"/uploads/{nombre_archivo}"

                cur.execute(
                    """INSERT INTO documento 
                       (rut_usuario, tipo_documento, nombre_original, nombre_sistema, ruta_archivo, metodo_ingreso, estado_validacion) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s) 
                       ON CONFLICT DO NOTHING RETURNING id_documento""",
                    (cls.test_rut, tipo, nombre_archivo, nombre_archivo, ruta_ficticia, 'Manual', 'Pendiente')
                )
                res = cur.fetchone()
                
                if res:
                    doc_ids.append(res[0])
                else:
                    cur.execute("SELECT id_documento FROM documento WHERE rut_usuario = %s AND tipo_documento = %s", 
                                (cls.test_rut, tipo))
                    doc_ids.append(cur.fetchone()[0])
            
            print(f"IDs de documentos recuperados: {doc_ids}")

            # 3. Insertar Antecedentes
            cur.execute("DELETE FROM antecedentes WHERE rut_usuario = %s", (cls.test_rut,))
            
            cur.execute(
                """INSERT INTO antecedentes 
                (rut_usuario, sueldo_declarado, antiguedad_laboral, deudas_totales, id_doc_liquidacion, id_doc_cotizaciones, id_doc_carnet, fecha_ingreso) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (cls.test_rut, 1500000, 24, 500000, doc_ids[0], doc_ids[1], doc_ids[2], datetime.now())
            )
            
            conn.commit()
            cur.close()
            conn.close()
            print("--- ¡DATOS INYECTADOS! ---")
        except Exception as e:
            print(f"Error crítico en setUpClass: {e}")

        cls.session = requests.Session()
        cls.session.post(f"{cls.base_url}/login", data={"rut": cls.test_rut, "password": cls.test_pass})

    def test_simulation_monto_normal(self):
        """CP01: Monto válido (1.500.000). Debe retornar 200 y no mostrar error."""
        fecha_dinamica = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        
        # Paso 1
        self.session.post(f"{self.base_url}/simulator", data={
            "rut": self.test_rut, "monto": "1000000", "cuotas": "30", "fechaPrimerPago": fecha_dinamica
        })
        
        # Paso 2: Recálculo normal
        response = self.session.post(f"{self.base_url}/simulation", data={
            "monto": "1500000", "cuotas": "30"
        })

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("La puntuación de la simulación no es suficiente", response.text)

    def test_simulation_monto_exceso(self):
        """CP02: Monto excesivo. Debe gatillar el mensaje de error de puntuación."""
        fecha_dinamica = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        
        # Paso 1
        self.session.post(f"{self.base_url}/simulator", data={
            "rut": self.test_rut, "monto": "1000000", "cuotas": "30", "fechaPrimerPago": fecha_dinamica
        })
        
        # Paso 2: Recálculo excesivo
        response = self.session.post(f"{self.base_url}/simulation", data={
            "monto": "999999999999", "cuotas": "30"
        })
        
        self.assertTrue(
            "La puntuación de la simulación no es suficiente" in response.text or 
            "Error al procesar la simulación" in response.text,
            f"El mensaje de error no fue el esperado. Recibido: {response.text[:100]}"
        )

    @classmethod
    def tearDownClass(cls):
        try:
            conn = psycopg2.connect(**cls.db_config)
            cur = conn.cursor()
            cur.execute("DELETE FROM antecedentes WHERE rut_usuario = %s", (cls.test_rut,))
            cur.execute("DELETE FROM documento WHERE rut_usuario = %s", (cls.test_rut,))
            cur.execute("DELETE FROM users WHERE rut = %s", (cls.test_rut,))
            conn.commit()
            cur.close()
            conn.close()
        except:
            pass

if __name__ == '__main__':
    unittest.main()