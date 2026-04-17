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

async function proceedWithLoan() {
    const rutInput = document.getElementById('solicitudRut');
    const rentaInput = document.getElementById('solicitudRenta');
    
    const simulationData = {
        rut: rutInput ? rutInput.value : '',
        renta: rentaInput ? rentaInput.value : '',
        monto: document.getElementById('monto')?.textContent.trim().replace(/\./g, '').replace('$', '') || '',
        cuotas: document.getElementById('cuotas')?.textContent.trim() || '',
        fechaPrimerPago: document.getElementById('fechaPrimerPago')?.textContent.trim() || '',
        tasaInteres: document.getElementById('tasaInteres')?.textContent.trim().replace('%', '').replace(',', '.') || '',
        cuotaMensual: document.getElementById('cuotaMensual')?.textContent.trim().replace(/\./g, '').replace('$', '') || '',
        ctc: document.getElementById('ctc')?.textContent.trim().replace(/\./g, '').replace('$', '') || '',
        cae: document.getElementById('cae')?.textContent.trim().replace('%', '').replace(',', '.') || ''
    };

    console.log('Datos de simulación enviados:', simulationData);

    try {
        const res = await fetch('/solicitud/prepare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(simulationData)
        });
        const result = await res.json();
        if (result.ok) {
            showToast('Redirigiendo a solicitud...', 'success');
            setTimeout(() => {
                window.location.href = '/solicitud';
            }, 1500);
        } else {
            showToast('Error al preparar solicitud', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        await fetch('/session/pending-sim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(simulationData)
        });
        showToast('Debe iniciar sesión', 'info');
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
    }
}
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('adjustForm');
    const amountInput = document.getElementById('adjustAmount');
    const quotasInput = document.getElementById('adjustQuotas');
    const viewBtn = document.getElementById('viewSimBtn');
    const panel = document.getElementById('historyPanel');
    const requestLoanBtn = document.getElementById('requestLoanBtn');
    
    var monto = document.getElementById('monto').textContent.trim();
    var cuotaMensual = document.getElementById('cuotaMensual').textContent.trim();
    var ctc = document.getElementById('ctc').textContent.trim();
    
    // 1. Corregimos la captura de tasas para asegurar 2 decimales
    var tasaInteresRaw = parseFloat(document.getElementById('tasaInteres').textContent.replace(',', '.'));
    var caeRaw = parseFloat(document.getElementById('cae').textContent.replace(',', '.'));
    
    // --- FORMATEO DEL HISTORIAL ---
    document.querySelectorAll('.format-history').forEach(el => {
        const num = el.textContent.trim();
        if (num) {
            el.textContent = formatNumber(num);
        }
    });

    // 2. Aplicamos formato de dinero a los montos principales
    document.getElementById('monto').textContent = '$' + formatNumber(monto);
    document.getElementById('cuotaMensual').textContent = '$' + formatNumber(cuotaMensual);
    document.getElementById('ctc').textContent = '$' + formatNumber(ctc);

    // 3. Formateamos a 2 decimales (Eliminé las líneas redundantes que sobreescribían esto)
    document.getElementById('tasaInteres').textContent = tasaInteresRaw.toFixed(2).replace('.', ',') + '%';
    document.getElementById('cae').textContent = caeRaw.toFixed(2).replace('.', ',') + '%';

    // 4. Formateo de montos en el Historial (busca elementos con clase 'history-amount')
    document.querySelectorAll('.history-amount').forEach(el => {
        let valor = el.textContent.trim().replace(/\D/g, ''); // Deja solo números
        el.textContent = '$' + formatNumber(valor);
    });

    viewBtn?.addEventListener('click', async () => {
        panel.hidden = !panel.hidden;
    });

    requestLoanBtn?.addEventListener('click', async () => {
        await proceedWithLoan();
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
            
            // Limpiamos los puntos antes de enviar al backend
            amountInput.value = amountInput.value.replace(/\./g, '');
            
            form.submit();
        }
    });
    console.log('Simulation Results page loaded');
});