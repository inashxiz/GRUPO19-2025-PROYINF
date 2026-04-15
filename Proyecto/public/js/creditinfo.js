document.addEventListener("DOMContentLoaded", () => {
    const creditForm = document.getElementById('creditForm');

    creditForm.addEventListener('submit', (e) => {
        const sueldo = document.getElementById('sueldo').value;
        const liquidacion = document.getElementById('liquidacion').files[0];

        if (sueldo <= 0) {
            e.preventDefault();
            alert("El sueldo debe ser un valor positivo.");
            return;
        }

        // Validación de tamaño de archivo (ej: max 5MB)
        if (liquidacion && liquidacion.size > 5 * 1024 * 1024) {
            e.preventDefault();
            alert("El archivo de liquidación es muy pesado (máx 5MB).");
        }
    });
});