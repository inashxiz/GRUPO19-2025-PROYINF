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
    

    const rentaRaw = document.getElementById('renta').value.trim();
    

    const rentaClean = rentaRaw.replace(/\./g, '');

    if (!rentaClean) { // Usamos la variable limpia
        showError('renta', 'La renta es requerida');
        isValid = false;
    } else {
        const rentaNumber = parseFloat(rentaClean);
        if (isNaN(rentaNumber) || rentaNumber <= 0) {
            showError('renta', 'Ingresa una renta válida');
            isValid = false;
        }
    }
    
    const cuotas = document.getElementById('cuotas').value;
    const cuotasNumber = parseInt(cuotas);
    if (!cuotas) {
        showError('cuotas', 'Las cuotas son requeridas');
        isValid = false;
    } else if (isNaN(cuotasNumber) || cuotasNumber < 6 || cuotasNumber > 60) {
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

    const minDate = new Date();
    const maxDate = new Date();
    maxDate.setMonth(minDate.getMonth()+1);


    const formatDate = (date) => {
        return date.toISOString().substring(0, 10);
    }

    fechaPrimerPago.min = formatDate(minDate);
    fechaPrimerPago.max = formatDate(maxDate);
    
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
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            const submitBtn = document.getElementById('submitBtn');
            

            const montoInput = document.getElementById('monto');
            const rentaInput = document.getElementById('renta');
            
            montoInput.value = montoInput.value.replace(/\./g, '');
            rentaInput.value = rentaInput.value.replace(/\./g, '');

            submitBtn.disabled = true;
            submitBtn.textContent = 'PROCESANDO...';
            
            // Quitamos el setTimeout para el submit real, o se enviará tarde
            form.submit();
        }
    });
});