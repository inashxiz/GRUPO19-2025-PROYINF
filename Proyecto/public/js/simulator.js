function validateRUT(rut) {
    const cleanRUT = rut.replace(/[.-]/g, '');
    if (cleanRUT.length < 8) return false;
    
    const rutBody = cleanRUT.slice(0, -1);
    const rutDigit = cleanRUT.slice(-1).toUpperCase();

    let sum = 0;
    let multiplier = 2;
    for (let i = rutBody.length - 1; i >= 0; i--) {
        sum += Number.parseInt(rutBody[i], 10) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    
    const expectedDigit = 11 - (sum % 11);
    let finalDigit;
    
    if (expectedDigit === 11) {
        finalDigit = '0';
    } else if (expectedDigit === 10) {
        finalDigit = 'K';
    } else {
        finalDigit = expectedDigit.toString();
    }
    
    return rutDigit === finalDigit;
}

function formatNumber(value) {
    const numbers = value.replace(/\D/g, '');
    return numbers ? Number.parseInt(numbers, 10).toLocaleString('es-CL') : '';
}

function formatRUT(value) {
    const numbers = value.replace(/[^0-9kK]/g, '');
    if (numbers.length <= 1) return numbers;
    
    const body = numbers.slice(0, -1);
    const digit = numbers.slice(-1);
    
    const formattedBody = body ? Number.parseInt(body, 10).toLocaleString('es-CL') : '';
    return `${formattedBody}-${digit}`;
}

function showError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}-error`);
    
    input.classList.add('error');
    errorElement.textContent = message;
}

function clearError(fieldId) {
    const input = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}-error`);
    
    input.classList.remove('error');
    errorElement.textContent = '';
}

function validateForm() {
    let isValid = true;
    ['rut', 'monto', 'renta', 'cuotas', 'fechaPrimerPago'].forEach(clearError);
    
    const monto = document.getElementById('monto').value;
    const montoClean = monto.replaceAll('.', '');
    const montoNumber = Number.parseInt(montoClean, 10);
    
    if (!monto) {
        showError('monto', 'El monto es requerido');
        isValid = false;
    } else if (Number.isNaN(montoNumber) || montoNumber < 500000) {
        showError('monto', 'El monto debe ser mayor a $500.000');
        isValid = false;
    }

    const rentaRaw = document.getElementById('renta').value.trim();
    const rentaClean = rentaRaw.replaceAll('.', '');

    if (rentaClean) {
        const rentaNumber = Number.parseFloat(rentaClean);
        if (Number.isNaN(rentaNumber) || rentaNumber <= 0) {
            showError('renta', 'Ingresa una renta válida');
            isValid = false;
        }
    } else {
        showError('renta', 'La renta es requerida');
        isValid = false;
    }
    
    const cuotas = document.getElementById('cuotas').value;
    const cuotasNumber = Number.parseInt(cuotas, 10);
    
    if (!cuotas) {
        showError('cuotas', 'Las cuotas son requeridas');
        isValid = false;
    } else if (Number.isNaN(cuotasNumber) || cuotasNumber < 6 || cuotasNumber > 60) {
        showError('cuotas', 'Ingresa entre 6 y 60 cuotas');
        isValid = false;
    }
    
    const fechaPrimerPago = document.getElementById('fechaPrimerPago').value;
    if(!fechaPrimerPago) {
        showError('fechaPrimerPago', 'La fecha es requerida');
        isValid = false;
    }
    
    return isValid;
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('creditForm');
    const rutInput = document.getElementById('rut');
    const montoInput = document.getElementById('monto');
    const rentaInput = document.getElementById('renta');
    const fechaPrimerPago = document.getElementById('fechaPrimerPago');


    if (montoInput?.value) {
        montoInput.value = formatNumber(montoInput.value);
    }
    if (rentaInput?.value) {
        rentaInput.value = formatNumber(rentaInput.value);
    }
    if (rutInput?.value) {
        rutInput.value = formatRUT(rutInput.value);
    }

    const minDate = new Date();
    const maxDate = new Date();
    maxDate.setMonth(minDate.getMonth() + 1);

    const formatDate = (date) => date.toISOString().substring(0, 10);

    fechaPrimerPago.min = formatDate(minDate);
    fechaPrimerPago.max = formatDate(maxDate);

    rutInput.addEventListener('input', function(e) {
        const cursorPosition = e.target.selectionStart;
        const oldLength = e.target.value.length;
        e.target.value = formatRUT(e.target.value);
        const diff = e.target.value.length - oldLength;
        e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
        clearError('rut');
    });

    montoInput.addEventListener('input', function(e) {
        const cursorPosition = e.target.selectionStart;
        const oldLength = e.target.value.length;
        e.target.value = formatNumber(e.target.value);
        const diff = e.target.value.length - oldLength;
        e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
        clearError('monto');
    });

    rentaInput.addEventListener('input', function(e) {
        const cursorPosition = e.target.selectionStart;
        const oldLength = e.target.value.length;
        e.target.value = formatNumber(e.target.value);
        const diff = e.target.value.length - oldLength;
        e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
        clearError('renta');
    });

    document.getElementById('cuotas').addEventListener('input', () => clearError('cuotas'));

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            const submitBtn = document.getElementById('submitBtn');
            
            montoInput.value = montoInput.value.replaceAll('.', '');
            rentaInput.value = rentaInput.value.replaceAll('.', '');

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';
            
            form.submit();
        }
    });
});