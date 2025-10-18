function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

function formatNumber(value) {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatPercentage(value){
    if (typeof value !== 'string') value = String(value);
    return value.replace(/\./g, ',')
}

function parseFormattedNumber(str) {
    return parseInt(str.replace(/\./g, ''), 10);
}

function formatInputField(input) {
    input.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value) {
            e.target.value = formatNumber(parseInt(value, 10));
        }
    });
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
    ['adjustAmount', 'adjustQuotas'].forEach(clearError);
    
    const amount = document.getElementById('adjustAmount').value;
    const amountNumber = parseFloat(amount.replace(/\./g, ''));
    if (!amount) {
        showError('adjustAmount', 'El monto es requerido.');
        isValid = false;
    } else if (isNaN(amountNumber) || amountNumber <= 500000) {
        showError('adjustAmount', 'Ingrese un monto válido. El mínimo es 500.000');
        isValid = false;
    }
    
    const quotas = document.getElementById('adjustQuotas').value;
    const cuotasNumber = parseInt(quotas);
    if (!quotas) {
        showError('adjustQuotas', 'Las cuotas son requeridas');
        isValid = false;
    } else if (isNaN(cuotasNumber) || cuotasNumber < 6 || cuotasNumber > 60) {
        showError('adjustQuotas', 'Ingresa entre 6 y 60 cuotas');
        isValid = false;
    }
    
    return isValid;
}

function proceedWithLoan() {
    showToast('Procediendo con la solicitud del crédito...', 'success');
    setTimeout(() => {
        console.log('Redirecting to loan application with data:', simulationData);
        // window.location.href = '/loan-application';
    }, 1500);
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('adjustForm');
    const amountInput = document.getElementById('adjustAmount');
    const quotasInput = document.getElementById('adjustQuotas');
    const viewBtn = document.getElementById('viewSimBtn');
    const panel = document.getElementById('historyPanel');
    
    var monto = document.getElementById('monto').textContent.trim();
    var cuotaMensual = document.getElementById('cuotaMensual').textContent.trim();
    var ctc = document.getElementById('ctc').textContent.trim();
    var tasaInteres = document.getElementById('tasaInteres').textContent.trim();
    var cae = document.getElementById('cae').textContent.trim();
    document.getElementById('monto').textContent = '$'+formatNumber(monto);
    document.getElementById('cuotaMensual').textContent = '$'+formatNumber(cuotaMensual);
    document.getElementById('ctc').textContent = '$'+formatNumber(ctc);
    document.getElementById('tasaInteres').textContent = formatPercentage(tasaInteres)+'%';
    document.getElementById('cae').textContent = formatPercentage(cae)+'%';

    viewBtn?.addEventListener('click', async () => {
        panel.hidden = !panel.hidden;
    });

    amountInput.addEventListener('input', function(e) {
        const cursorPosition = e.target.selectionStart;
        const oldLength = e.target.value.length;
        e.target.value = formatNumber(e.target.value);
        const newLength = e.target.value.length;
        
        const diff = newLength - oldLength;
        e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
        
        clearError('amountInput');
    });
    quotasInput.addEventListener('input', () => clearError('quotas'));
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if(validateForm()){
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'PROCESANDO...';
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'SIMULAR';
            }, 1500);
            form.submit();
        }
    });
    console.log('Simulation Results page loaded');
});
