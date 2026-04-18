document.addEventListener("DOMContentLoaded", () => {
    const creditForm = document.getElementById('creditForm');
    const sueldoInput = document.getElementById('sueldo');
    const deudasInput = document.getElementById('deudas');
    const carnetInput = document.getElementById('carnet');


    function maskCurrency(e) {
        let value = e.target.value.replace(/\D/g, "");
        if (value === "") {
            e.target.value = "";
            return;
        }
        value = new Intl.NumberFormat('es-CL').format(value);
        e.target.value = "$" + value;
    }

    [sueldoInput, deudasInput].forEach(input => {
        input.addEventListener('input', maskCurrency);
    });

    carnetInput.addEventListener('change', () => {
        if (typeof clearError === "function") clearError('carnet');
    });

    creditForm.addEventListener('submit', (e) => {
        let isValid = true;

        const sueldoRaw = sueldoInput.value.replace(/\D/g, "");
        const deudasRaw = deudasInput.value.replace(/\D/g, "");
        
        const liquidacion = document.getElementById('liquidacion').files[0];
        const cotizaciones = document.getElementById('cotizaciones').files[0];
        const carnet = carnetInput.files[0];

        if (!sueldoRaw || parseInt(sueldoRaw) <= 0) {
            alert("El sueldo debe ser un valor positivo.");
            isValid = false;
        }

        if (liquidacion && liquidacion.size > 5 * 1024 * 1024) {
            alert("El archivo de liquidación es muy pesado (máx 5MB).");
            isValid = false;
        }

        if (!carnet) {
            if (typeof showError === "function") showError('carnet', 'La foto del carnet es obligatoria');
            else alert("La foto del carnet es obligatoria");
            isValid = false;
        }

        if (!cotizaciones) {
            alert("El certificado de cotizaciones es obligatorio");
            isValid = false;
        }

        if (!isValid) {
            e.preventDefault();
        } else {
            sueldoInput.value = sueldoRaw;
            deudasInput.value = deudasRaw;
        }
    });
});