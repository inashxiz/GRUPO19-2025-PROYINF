document.addEventListener("DOMContentLoaded", () => {
    const creditForm = document.getElementById('creditForm');
    const sueldoInput = document.getElementById('sueldo');
    const deudasInput = document.getElementById('deudas');
    const carnetInput = document.getElementById('carnet');

    // --- 1. FUNCIÓN DE MÁSCARA (DINERO) ---
    function maskCurrency(e) {
        let value = e.target.value.replace(/\D/g, ""); // Solo números
        if (value === "") {
            e.target.value = "";
            return;
        }
        // Formatear con puntos (clásico chileno)
        value = new Intl.NumberFormat('es-CL').format(value);
        e.target.value = "$" + value;
    }

    // --- 2. LISTENERS DE INTERACCIÓN ---
    [sueldoInput, deudasInput].forEach(input => {
        input.addEventListener('input', maskCurrency);
    });

    carnetInput.addEventListener('change', () => {
        if (typeof clearError === "function") clearError('carnet');
    });

    // --- 3. LÓGICA DE ENVÍO (SUBMIT) ---
    creditForm.addEventListener('submit', (e) => {
        let isValid = true;

        // Limpiar valores para validación numérica
        const sueldoRaw = sueldoInput.value.replace(/\D/g, "");
        const deudasRaw = deudasInput.value.replace(/\D/g, "");
        
        const liquidacion = document.getElementById('liquidacion').files[0];
        const cotizaciones = document.getElementById('cotizaciones').files[0];
        const carnet = carnetInput.files[0];

        // Validación de Sueldo
        if (!sueldoRaw || parseInt(sueldoRaw) <= 0) {
            alert("El sueldo debe ser un valor positivo.");
            isValid = false;
        }

        // Validación de Liquidación (Tamaño 5MB)
        if (liquidacion && liquidacion.size > 5 * 1024 * 1024) {
            alert("El archivo de liquidación es muy pesado (máx 5MB).");
            isValid = false;
        }

        // Validación de Archivos Obligatorios
        if (!carnet) {
            if (typeof showError === "function") showError('carnet', 'La foto del carnet es obligatoria');
            else alert("La foto del carnet es obligatoria");
            isValid = false;
        }

        if (!cotizaciones) {
            alert("El certificado de cotizaciones es obligatorio");
            isValid = false;
        }

        // --- EL MOMENTO DE LA VERDAD ---
        if (!isValid) {
            e.preventDefault(); // Detenemos todo si algo falló
        } else {
            // Antes de que se vaya al backend, quitamos los puntos y el $
            // para que Node.js reciba solo números
            sueldoInput.value = sueldoRaw;
            deudasInput.value = deudasRaw;
        }
    });
});