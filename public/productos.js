document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/products')
        .then(response => response.json())
        .then(products => {
            const productMenuContainer = document.getElementById('product-menu');
            productMenuContainer.innerHTML = ''; // Limpia el contenedor

            products.forEach(category => {
                const categoryDiv = document.createElement('div');
                categoryDiv.classList.add('category');

                let categoryHtml = `<h2>${category.nombre}</h2>`;
                categoryHtml += '<ul>';
                category.productos.forEach(product => {
                    categoryHtml += `
                        <li>
                            ${product.nombre}: ${product.descripcion} - $${product.precio}
                            <button class="edit-btn" data-id="${product.id}" style="background-color: #28a72cde;">Editar</button>
                            <button class="delete-btn" data-id="${product.id}" style="background-color: #a72828e7;">Eliminar</button>
                        </li>
                        <div id="edit-form-${product.id}" class="edit-form" style="display: none;">
                            <h2>Editar Producto</h2>
                            <form id="product-form-${product.id}">
                                <input type="hidden" id="product-id-${product.id}" value="${product.id}">
                                <label for="product-name-${product.id}">Nombre:</label>
                                <input type="text" id="product-name-${product.id}" value="${product.nombre}" required>
                                <label for="product-description-${product.id}">Descripción:</label>
                                <input type="text" id="product-description-${product.id}" value="${product.descripcion}" required>
                                <label for="product-price-${product.id}">Precio:</label>
                                <input type="number" id="product-price-${product.id}" value="${product.precio}" step="0.01" required>
                                <button type="submit" style="background-color: #28a72cde;">Guardar</button>
                                <button type="button" class="cancel-edit" style="background-color: #a72828e7;" data-id="${product.id}">Cerrar</button>
                            </form>
                        </div>
                    `;
                });
                categoryHtml += '</ul>';
                categoryDiv.innerHTML = categoryHtml;
                productMenuContainer.appendChild(categoryDiv);
            });

            // Agregar eventos a los botones de editar y eliminar
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', handleEditClick);
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', handleDeleteClick);
            });

            // Manejar el formulario de edición
            document.querySelectorAll('.edit-form form').forEach(form => {
                form.addEventListener('submit', handleFormSubmit);
            });

            document.querySelectorAll('.cancel-edit').forEach(btn => {
                btn.addEventListener('click', function() {
                    const formId = this.dataset.id;
                    document.getElementById(`edit-form-${formId}`).style.display = 'none';
                });
            });
        })
        .catch(error => console.error('Error al cargar los productos:', error));
});

function handleEditClick(event) {
    const productId = event.target.dataset.id;
    document.getElementById(`edit-form-${productId}`).style.display = 'block';
}

function handleFormSubmit(event) {
    event.preventDefault();
    const productId = event.target.querySelector('input[type="hidden"]').value;
    const updatedProduct = {
        nombre: document.getElementById(`product-name-${productId}`).value,
        descripcion: document.getElementById(`product-description-${productId}`).value,
        precio: parseFloat(document.getElementById(`product-price-${productId}`).value),
    };

    fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedProduct)
    })
    .then(response => response.json())
    .then(data => {
        alert('Producto actualizado exitosamente');
        document.getElementById(`edit-form-${productId}`).style.display = 'none';
        location.reload(); // Recargar la página para reflejar los cambios
    })
    .catch(error => console.error('Error al actualizar el producto:', error));
}

function handleDeleteClick(event) {
    const productId = event.target.dataset.id;

    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
        fetch(`/api/products/${productId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            alert('Producto eliminado exitosamente');
            location.reload(); // Recargar la página para reflejar los cambios
        })
        .catch(error => console.error('Error al eliminar el producto:', error));
    }
}

function handleFormSubmit(event) {
    event.preventDefault();
    const productId = event.target.querySelector('input[type="hidden"]').value;
    const updatedProduct = {
        nombre: document.getElementById(`product-name-${productId}`).value,
        descripcion: document.getElementById(`product-description-${productId}`).value,
        precio: parseFloat(document.getElementById(`product-price-${productId}`).value),
    };

    // Mostrar mensaje de confirmación temporalmente
    const confirmationMessage = document.getElementById('confirmation-message');
    confirmationMessage.style.display = 'block';

    setTimeout(() => {
        confirmationMessage.style.display = 'none';
    }, 3000);

    // Continuar con la lógica existente
    fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProduct),
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById(`edit-form-${productId}`).style.display = 'none';
        
        // Actualizar la página después de 3 segundos
        setTimeout(() => {
            location.reload();
        }, 3000);
    })
    .catch(error => console.error('Error al actualizar el producto:', error));
}
