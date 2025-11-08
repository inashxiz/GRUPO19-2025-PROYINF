document.addEventListener("DOMContentLoaded", () => {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const loginForm = document.getElementById('loginForm');



    loginForm.addEventListener('submit', (e) => {
        const rut = document.getElementById('rut').value.trim();
        const password = passwordInput.value.trim();

        if (!rut || !password) {
            e.preventDefault();
            alert("Por favor completa todos los campos.");
        }
    });

    document.getElementById('rut').focus();
});
