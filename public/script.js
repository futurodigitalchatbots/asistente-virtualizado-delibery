    async function fetchQR() {
        try {
            const response = await fetch('/qr');
            const status = await response.text();
            const statusMessage = document.getElementById('status-message');
            const qrImage = document.querySelector('.qr-code img');

            if (status === 'Asistente virtual listo') {
                statusMessage.textContent = 'El asistente está listo para ayudarte. 🟢';
                // Oculta la imagen QR después de 30 segundos
                setTimeout(() => {
                    qrImage.style.display = 'none';
                }, 30000);
            } else {
                statusMessage.textContent = status;
            }
        } catch (error) {
            console.error('Error al obtener el estado del QR:', error);
            document.getElementById('status-message').textContent = 'Error al obtener el estado del QR.';
        }
    }

    fetchQR();

