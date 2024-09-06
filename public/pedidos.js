document.addEventListener('DOMContentLoaded', () => {
    // Cargar los pedidos
    fetch('/api/orders')
        .then(response => response.json())
        .then(orders => {
            const orderDetailsContainer = document.getElementById('order-details');
            orderDetailsContainer.innerHTML = '';

            // Cargar los productos
            fetch('/api/products')
                .then(response => response.json())
                .then(productData => {
                    orders.forEach(order => {
                        const orderCard = document.createElement('div');
                        orderCard.classList.add('order-card');

                        // Generar el HTML de la orden
                        let orderHtml = `
                            <h2>Pedido N°: ${order.orderNumber}</h2>
                            <div class="order-info">
                                <p><strong>Cliente:</strong> ${order.customer}</p>
                                <p><strong>Dirección de Envío:</strong> ${order.location || 'No especificada'}</p>
                                <p><strong>Fecha de Pedido:</strong> ${order.date}</p>
                                <p><strong>Metodo de Pago:</strong> ${order.paymentMethod}</p>
                            </div>
                            <div class="items-list">
                                <h3>Detalles del Pedido:</h3>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Cantidad</th>
                                            <th>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody id="order-${order.orderNumber}">
                                    </tbody>
                                </table>
                                <p><strong>Total:</strong> $${order.totalPrice.toFixed(2)}</p>
                            </div>
                            <div class="order-finish">
                                <p>Cuando salga el<strong> repartidor</strong> Por favor termine el pedido. Esto informará al cliente que <strong> su pedido esta en camino.</strong></p>
                                <button class="finish" data-order-number="${order.orderNumber}" data-customer="${order.customer}">Terminado</button>
                            </div>
                        `;

                        orderCard.innerHTML = orderHtml;
                        orderDetailsContainer.appendChild(orderCard);

                        // Obtener el contenedor del cuerpo de la tabla
                        const orderBody = document.getElementById(`order-${order.orderNumber}`);

                        // Iterar sobre los items del pedido
                        order.items.forEach(item => {
                            let foundProduct = null;

                            // Buscar el producto en productos.json
                            productData.forEach(category => {
                                const product = category.productos.find(prod => prod.id === item.productId);
                                if (product) {
                                    foundProduct = product;
                                }
                            });

                            // Si el producto se encuentra, se agrega a la tabla
                            if (foundProduct) {
                                const subtotal = foundProduct.precio * item.quantity;
                                const productRow = `
                                    <tr>
                                        <td>${foundProduct.nombre}</td>
                                        <td>${item.quantity}</td>
                                        <td>$${subtotal.toFixed(2)}</td>
                                    </tr>
                                `;
                                orderBody.innerHTML += productRow;
                            } else {
                                // Si no se encuentra, mostrar como desconocido
                                const productRow = `
                                    <tr>
                                        <td>Desconocido</td>
                                        <td>${item.quantity}</td>
                                        <td>$0.00</td>
                                    </tr>
                                `;
                                orderBody.innerHTML += productRow;
                            }
                        });
                    });

                    // Agregar manejador de eventos a los botones "Terminado"
                    document.querySelectorAll('.finish').forEach(button => {
                        button.addEventListener('click', (event) => {
                            const orderNumber = event.target.getAttribute('data-order-number');
                            const customer = event.target.getAttribute('data-customer');

                            fetch('/api/orders/finish', {  // Asegúrate de que esta ruta coincida con la ruta en el servidor
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ orderNumber, customer }),
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    alert('Pedido finalizado y movido a historial.');
                                    location.reload(); // Recargar la página para reflejar los cambios
                                } else {
                                    alert(data.message || 'Error al finalizar el pedido.');
                                }
                            })
                            .catch(error => console.error('Error al finalizar el pedido:', error));
                        });
                    });
                })
                .catch(error => console.error('Error al cargar los productos:', error));
        })
        .catch(error => console.error('Error al cargar los pedidos:', error));
});
