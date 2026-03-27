document.addEventListener("DOMContentLoaded", () => {
    const togglePassword = document.getElementById('togglePassword');
    const toggleIcon = document.getElementById('icon');
    const passwordInput = document.getElementById('password');
    const loginForm = document.getElementById('loginForm');

    togglePassword.addEventListener('click', function(e){
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);

        if (toggleIcon.className === "fa-solid fa-eye-slash") {
                toggleIcon.className = "fa-solid fa-eye";
            } else {
                toggleIcon.className = "fa-solid fa-eye-slash";
            }
    })

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