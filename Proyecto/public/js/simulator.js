function validateRUT(rut) {
    const cleanRUT = rut.replace(/[.-]/g, '');
    if (cleanRUT.length < 8) return false;
    
    const rutBody = cleanRUT.slice(0, -1);
    const rutDigit = cleanRUT.slice(-1).toUpperCase();

    var sum = 0;
    var multiplier = 2;
    for (var i = rutBody.length - 1; i >= 0; i--) {
        sum += parseInt(rutBody[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    
    const expectedDigit = 11 - (sum % 11);
    const finalDigit = expectedDigit === 11 ? '0' : expectedDigit === 10 ? 'K' : expectedDigit.toString();
    
    return rutDigit === finalDigit;
}

function formatNumber(value) {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatRUT(value) {
    const numbers = value.replace(/[^0-9kK]/g, '');
    if (numbers.length <= 1) return numbers;
    
    const body = numbers.slice(0, -1);
    const digit = numbers.slice(-1);
    
    return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${digit}`;
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
    var isValid = true;
    ['rut', 'monto', 'renta', 'cuotas', 'fechaPrimerPago'].forEach(clearError);
    
    const rut = document.getElementById('rut').value;
    if (!rut) {
        showError('rut', 'El RUT es requerido');
        isValid = false;
    } else if (!validateRUT(rut)) {
        showError('rut', 'RUT inválido. Formato: 12345678-9');
        isValid = false;
    }
    
    const monto = document.getElementById('monto').value;
    const montoNumber = parseFloat(monto.replace(/\./g, ''));
    if (!monto) {
        showError('monto', 'El monto es requerido');
        isValid = false;
    } else if (isNaN(montoNumber) || montoNumber <= 0) {
        showError('monto', 'Ingresa un monto válido');
        isValid = false;
    }
    
    const renta = document.getElementById('renta').value;
    const rentaNumber = parseFloat(renta.replace(/\./g, ''));
    if (!renta) {
        showError('renta', 'La renta es requerida');
        isValid = false;
    } else if (isNaN(rentaNumber) || rentaNumber <= 0) {
        showError('renta', 'Ingresa una renta válida');
        isValid = false;
    }
    
    const cuotas = document.getElementById('cuotas').value;
    const cuotasNumber = parseInt(cuotas);
    if (!cuotas) {
        showError('cuotas', 'Las cuotas son requeridas');
        isValid = false;
    } else if (isNaN(cuotasNumber) || cuotasNumber < 1 || cuotasNumber > 60) {
        showError('cuotas', 'Ingresa entre 1 y 60 cuotas');
        isValid = false;
    }
    
    const fecha = document.getElementById('fechaPrimerPago').value;
    if (!fecha) {
        showError('fechaPrimerPago', 'Selecciona la fecha del primer pago');
        isValid = false;
    } else {
        const selectedDate = new Date(fecha);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            showError('fechaPrimerPago', 'La fecha debe ser hoy o posterior');
            isValid = false;
        }
    }
    
    return isValid;
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('creditForm');
    const rutInput = document.getElementById('rut');
    const montoInput = document.getElementById('monto');
    const rentaInput = document.getElementById('renta');
    const fechaInput = document.getElementById('fechaPrimerPago');

    const today = new Date().toISOString().split('T')[0];
    fechaInput.setAttribute('min', today);
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    fechaInput.setAttribute('max', maxDate.toISOString().split('T')[0]);
    
    rutInput.addEventListener('input', function(e) {
        const cursorPosition = e.target.selectionStart;
        const oldLength = e.target.value.length;
        e.target.value = formatRUT(e.target.value);
        const newLength = e.target.value.length;
        const diff = newLength - oldLength;
        e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
        
        clearError('rut');
    });
    
    montoInput.addEventListener('input', function(e) {
        const cursorPosition = e.target.selectionStart;
        const oldLength = e.target.value.length;
        e.target.value = formatNumber(e.target.value);
        const newLength = e.target.value.length;
        
        const diff = newLength - oldLength;
        e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
        
        clearError('monto');
    });
    
    rentaInput.addEventListener('input', function(e) {
        const cursorPosition = e.target.selectionStart;
        const oldLength = e.target.value.length;
        e.target.value = formatNumber(e.target.value);
        const newLength = e.target.value.length;
        
        const diff = newLength - oldLength;
        e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
        
        clearError('renta');
    });
    
    document.getElementById('cuotas').addEventListener('input', () => clearError('cuotas'));
    fechaInput.addEventListener('input', () => clearError('fechaPrimerPago'));
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'PROCESANDO...';
            setTimeout(() => {
                const formData = {
                    rut: rutInput.value,
                    monto: montoInput.value,
                    renta: rentaInput.value,
                    cuotas: document.getElementById('cuotas').value,
                    fechaPrimerPago: fechaInput.value
                };
                
                console.log('Form data:', formData);
                
                showToast();
                submitBtn.disabled = false;
                submitBtn.textContent = 'SIMULAR';
            }, 1500);
            form.submit();
        }
    });
});
