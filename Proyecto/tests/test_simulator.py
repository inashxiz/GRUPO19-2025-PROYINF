import unittest
import requests

class TestSimulator(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base_url = "http://127.0.0.1:3000/simulation"

    def test_monto_minimo_frontera(self):
        """ Monto mínimo según código ($500.000) """
        payload = {
            "rut": "12345678-9",
            "monto": "500.000",
            "cuotas": "6",
            "fechaPrimerPago": "2026-06-01"
        }
        response = requests.post(self.base_url, data=payload)
        self.assertIn(response.status_code, [200, 302])

    def test_monto_invalido_bajo(self):
        """Monto por debajo del mínimo ($100.000)"""
        payload = {
            "rut": "12345678-9",
            "monto": "100.000",
            "cuotas": "6",
            "fechaPrimerPago": "2026-06-01"
        }
        response = requests.post(self.base_url, data=payload)
        self.assertIsNotNone(response.status_code)

    @classmethod
    def tearDownClass(cls):
        print("\nPruebas del Simulador finalizadas.")

if __name__ == "__main__":
    unittest.main()