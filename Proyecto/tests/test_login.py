import unittest
import requests

class TestLogin(unittest.TestCase):
    @classmethod
    def setUpClass(cls):

        cls.base_url = "http://127.0.0.1:3000/login"
        cls.test_data = {
            "rut": "12345678-9", 
            "password": "password123"
        }

    def test_login_exitoso(self):
        response = requests.post(self.base_url, data=self.test_data, allow_redirects=False)
        self.assertIn(response.status_code, [200, 302])

    def test_login_fallido(self):
        data_error = self.test_data.copy()
        data_error["password"] = "wrong_pass"
        response = requests.post(self.base_url, data=data_error)
        # El servidor renderiza la página de login con un error si falla
        self.assertEqual(response.status_code, 200)

    @classmethod
    def tearDownClass(cls):
        print("\nPruebas de Login finalizadas.")

if __name__ == "__main__":
    unittest.main()