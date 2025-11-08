function formatNumber(value) {
    const numbers = String(value).replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function showMessage(type, content) {
    const messageDiv = document.getElementById('message');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = content;
}

function clearMessage() {
    const messageDiv = document.getElementById('message');
    messageDiv.className = 'message';
    messageDiv.textContent = '';
}

function getFormData(form) {
    const formData = new FormData(form);
    return Object.fromEntries(formData);
}

async function submitSolicitud(data) {
    try {
        const res = await fetch('/solicitud', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        return result;
    } catch (error) {
        console.error('Error en la petición:', error);
        throw error;
    }
}

function handleSuccess(prestamo) {
    const successMessage = `
        <strong>Solicitud enviada con éxito</strong><br>
        ID de solicitud: ${prestamo.id}<br>
        Estado: <strong>${prestamo.estado}</strong>
    `;
    showMessage('success', successMessage);
    
    setTimeout(() => {
        window.location.href = '/simulator';
    }, 2000);
}

function handleError(errorMessage) {
    showMessage('error', `❌ Error: ${errorMessage}`);
}

function handleConnectionError() {
    showMessage('error', '❌ Error de conexión con el servidor');
}

function disableSubmitButton(button) {
    button.disabled = true;
    button.textContent = 'PROCESANDO...';
}

function enableSubmitButton(button) {
    button.disabled = false;
    button.textContent = 'CONFIRMAR SOLICITUD';
}

document.addEventListener('DOMContentLoaded', function() {
    // Formatear números con puntos
    const displayMonto = document.getElementById('displayMonto');
    const displayCuota = document.getElementById('displayCuota');
    const displayCtc = document.getElementById('displayCtc');
    
    if (displayMonto) {
        const monto = displayMonto.textContent.replace('$', '').trim();
        displayMonto.textContent = '$' + formatNumber(monto);
    }
    
    if (displayCuota) {
        const cuota = displayCuota.textContent.replace('$', '').trim();
        displayCuota.textContent = '$' + formatNumber(cuota);
    }
    
    if (displayCtc) {
        const ctc = displayCtc.textContent.replace('$', '').trim();
        displayCtc.textContent = '$' + formatNumber(ctc);
    }

    const form = document.getElementById('solicitud-form');
    
    if (!form) {
        console.error('No se encontró el formulario con id "solicitud-form"');
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearMessage();

        if (submitBtn) {
            disableSubmitButton(submitBtn);
        }
        const data = getFormData(form);
        console.log('Datos del formulario enviados:', data);
        try {
            const result = await submitSolicitud(data);

            if (result.ok) {
                handleSuccess(result.prestamo);
            } else {
                handleError(result.error);
                if (submitBtn) {
                    enableSubmitButton(submitBtn);
                }
            }
        } catch (error) {
            handleConnectionError();
            if (submitBtn) {
                enableSubmitButton(submitBtn);
            }
        }
    });
});
