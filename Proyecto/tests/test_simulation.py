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
            #Cración usuario de prueba
            conn = psycopg2.connect(**cls.db_config)
            cur = conn.cursor()
            
            cur.execute(
                "INSERT INTO users (rut, password, nombre, email, created_at) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (rut) DO NOTHING",
                (cls.test_rut, cls.test_pass, "usuario de prueba", "aaa@aaa.com", datetime.now())
            )
            

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
            
            # Para evitar duplicar, eliminamos antecedentes y luegio insertamos nuevos
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
        except Exception as e:
            print(f"Error crítico en setUpClass: {e}")

        cls.session = requests.Session()
        cls.session.post(f"{cls.base_url}/login", data={"rut": cls.test_rut, "password": cls.test_pass})

    def test_simulation_monto_normal(self):
        """CP001"""
        fecha_dinamica = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        

        self.session.post(f"{self.base_url}/simulator", data={
            "rut": self.test_rut, "monto": "1000000", "cuotas": "30", "fechaPrimerPago": fecha_dinamica
        })
        

        response = self.session.post(f"{self.base_url}/simulation", data={
            "monto": "1500000", "cuotas": "30"
        })

        self.assertIn(response.status_code, [200, 302])

    def test_simulation_monto_exceso(self):
        """CP002"""
        fecha_dinamica = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        

        self.session.post(f"{self.base_url}/simulator", data={
            "rut": self.test_rut, "monto": "1000000", "cuotas": "30", "fechaPrimerPago": fecha_dinamica
        })
        
        response = self.session.post(f"{self.base_url}/simulation", data={
            "monto": "999999999999", "cuotas": "30"
        })
        

        self.assertEqual(response.status_code, 400)

        self.assertIn(
            "Monto excede el máximo permitido",
            response.text
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
            print("\nPruebas de Simulación finalizadas.")
        except:
            pass


class TestCreditInfo(unittest.TestCase):
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
            # Creación usuario de prueba, tal como en test anterior
            conn = psycopg2.connect(**cls.db_config)
            cur = conn.cursor()

            cur.execute(
                "INSERT INTO users (rut, password, nombre, email, created_at) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (rut) DO NOTHING",
                (cls.test_rut, cls.test_pass, "usuario de prueba",
                 "aaa@aaa.com", datetime.now())
            )

            doc_ids = []
            tipos = ["liquidacion", "cotizaciones", "carnet"] #Si quiere que no se suban documentos, dejar esta lista vacía o eliminar un tipo específico !
            for tipo in tipos:
                nombre_archivo = f"{tipo}.pdf" #Si quiere que de error en el test3, cambiar a .txt o algo que no sea pdf !
                ruta_ficticia = f"/uploads/{nombre_archivo}"

                cur.execute(
                    """INSERT INTO documento 
                       (rut_usuario, tipo_documento, nombre_original, nombre_sistema, ruta_archivo, metodo_ingreso, estado_validacion) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s) 
                       ON CONFLICT DO NOTHING RETURNING id_documento""",
                    (cls.test_rut, tipo, nombre_archivo, nombre_archivo,
                     ruta_ficticia, 'Manual', 'Pendiente')
                )
                res = cur.fetchone()

                if res:
                    doc_ids.append(res[0])
                else:
                    cur.execute("SELECT id_documento FROM documento WHERE rut_usuario = %s AND tipo_documento = %s",
                                (cls.test_rut, tipo))
                    doc_ids.append(cur.fetchone()[0])

            # Para evitar duplicar, eliminamos antecedentes y luegio insertamos nuevos
            cur.execute(
                "DELETE FROM antecedentes WHERE rut_usuario = %s", (cls.test_rut,))

            cur.execute(
                """INSERT INTO antecedentes 
                (rut_usuario, sueldo_declarado, antiguedad_laboral, deudas_totales, id_doc_liquidacion, id_doc_cotizaciones, id_doc_carnet, fecha_ingreso) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (cls.test_rut, 1500000, 24, 500000,
                 doc_ids[0], doc_ids[1], doc_ids[2], datetime.now())
            )

            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Error en setUpClass CreditInfo: {e}")


        cls.session = requests.Session()

        cls.session.post(
            f"{cls.base_url}/login",
            data={
                "rut": cls.test_rut,
                "password": cls.test_pass
            }
        )

    def test_documentos_son_pdf(self):
        """CP03"""

        files = {
            "liquidacion": ("liquidacion.pdf", b"contenido"),
            "cotizaciones": ("cotizaciones.pdf", b"contenido"),
            "carnet": ("carnet.pdf", b"contenido")
        }

        response = self.session.post(
            f"{self.base_url}/creditinfo",
            files=files,
            data={"rut": self.test_rut}
        )

        self.assertIn(response.status_code, [200, 302])

        conn = psycopg2.connect(**self.db_config)
        cur = conn.cursor()

        cur.execute(
            """
            SELECT nombre_original
            FROM documento
            WHERE rut_usuario = %s
            """,
            (self.test_rut,)
        )

        docs = cur.fetchall()

        cur.close()
        conn.close()

        for (nombre,) in docs:
            if not nombre.endswith(".pdf"):
                self.fail(
                    f"Uno de los archivos subidos no era en formato PDF: {nombre}")

    def test_documentos_en_BDD(self):
        """CP4"""
        conn = psycopg2.connect(**self.db_config)
        cur = conn.cursor()

        cur.execute("""
            SELECT tipo_documento, nombre_original 
            FROM documento 
            WHERE rut_usuario = %s
        """, (self.test_rut,))

        docs = cur.fetchall()
        conn.close()

        tipos_esperados = {"liquidacion", "cotizaciones", "carnet"}
        tipos_encontrados = {tipo for tipo, _ in docs}

        self.assertTrue(tipos_esperados.issubset(tipos_encontrados),
                        f"No se encontraron todos los tipos de documentos esperados. Encontrados: {tipos_encontrados}")
        
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
                print("\nPruebas de Credit Info finalizadas.")
            except:
                pass




if __name__ == '__main__':
    unittest.main()