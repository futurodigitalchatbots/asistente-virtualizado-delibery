document.addEventListener("DOMContentLoaded", () => {
    const addProductBtn = document.getElementById("add-product-btn");
    const addProductModal = document.getElementById("add-product-modal");
    const addProductForm = document.getElementById("add-product-form");

    const registerExpenseBtn = document.getElementById("register-expense-btn");
    const registerExpenseModal = document.getElementById("register-expense-modal");
    const registerExpenseForm = document.getElementById("register-expense-form");

    const closeButtons = document.querySelectorAll(".close");

    const inventoryList = document.getElementById("inventory-list");

    // Abre el modal de agregar producto
    addProductBtn.addEventListener("click", () => {
        addProductModal.style.display = "flex";
    });

    // Abre el modal de registrar gasto
    registerExpenseBtn.addEventListener("click", () => {
        registerExpenseModal.style.display = "flex";
    });

    // Cierra los modales
    closeButtons.forEach(button => {
        button.addEventListener("click", () => {
            addProductModal.style.display = "none";
            registerExpenseModal.style.display = "none";
        });
    });

    // Agregar Producto
    addProductForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const productName = document.getElementById("name").value;
        const productCost = parseFloat(document.getElementById("cost").value).toFixed(2);
        const productType = document.getElementById("type").value;
        const productQuantity = parseFloat(document.getElementById("quantity").value).toFixed(2);

        const newRow = document.createElement("tr");

        newRow.innerHTML = `
            <td>${productName}</td>
            <td>${productQuantity} ${productType}</td>
            <td>$${productCost}</td>
            <td><button class="delete-btn">Eliminar</button></td>
        `;

        // Agregar fila al inventario
        inventoryList.appendChild(newRow);

        // Limpiar formulario
        addProductForm.reset();

        // Cerrar el modal
        addProductModal.style.display = "none";
    });

    // Registrar Gasto
    registerExpenseForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const expenseName = document.getElementById("expense-name").value;
        const expenseCost = parseFloat(document.getElementById("expense-cost").value).toFixed(2);

        console.log(`Gasto registrado: ${expenseName} - $${expenseCost}`);

        registerExpenseForm.reset();
        registerExpenseModal.style.display = "none";
    });
});
