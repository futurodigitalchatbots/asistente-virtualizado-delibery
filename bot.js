const express = require('express');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const uuid = require('uuid');
const QRCode = require('qrcode');
const bodyParser = require('body-parser');

const app = express();

// Configura la carpeta 'public' como directorio de archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para la página de inicio
app.get('/', (req, res) => {
    // Envía el archivo 'index.html' como respuesta cuando se accede a la raíz del servidor
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/orders', (req, res) => {
    // Envía el archivo 'pedidos.json' como respuesta al solicitar la lista de pedidos
    res.sendFile(path.join(__dirname, 'pedidos.json'));
});

// Inicializa el cliente de WhatsApp con autenticación local
const client = new Client({ authStrategy: new LocalAuth() });
// Carga el menú de productos desde 'productos.json'
const menu = JSON.parse(fs.readFileSync('productos.json', 'utf8'));

let stopSendingProducts = false;

// Función para calcular el precio total de un pedido
const calculateTotalPrice = (order) => {
    let total = 0;
    // Itera sobre los elementos del pedido para calcular el precio total
    order.items.forEach(item => {
        // Busca el producto en el menú basado en el ID
        const product = menu.flatMap(c => c.productos).find(p => p.id === item.productId);
        if (product) {
            // Suma el precio del producto multiplicado por la cantidad al total
            total += product.precio * item.quantity;
        }
    });
    return total; // Devuelve el precio total calculado
};

// Middleware para parsear cuerpos JSON en las solicitudes
app.use(express.json());

app.get('/api/products', (req, res) => {
    // Lee el archivo 'productos.json' y lo envía como respuesta
    fs.readFile(path.join(__dirname, 'productos.json'), 'utf8', (err, data) => {
        if (err) {
            // Maneja errores de lectura
            res.status(500).send('Error al leer los productos.');
            return;
        }
        // Envía el contenido de 'productos.json' como respuesta
        res.send(JSON.parse(data));
    });
});

app.put('/api/products/:id', (req, res) => {
    // Actualiza un producto basado en su ID
    const productId = parseInt(req.params.id);
    const updatedProduct = req.body;

    fs.readFile(path.join(__dirname, 'productos.json'), 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error al leer los productos.');
            return;
        }

        let products = JSON.parse(data);
        let productFound = false;

        // Busca el producto en el archivo JSON para actualizarlo
        for (const category of products) {
            const productIndex = category.productos.findIndex(p => p.id === productId);
            if (productIndex > -1) {
                // Actualiza el producto con los nuevos datos
                category.productos[productIndex] = { ...category.productos[productIndex], ...updatedProduct };
                productFound = true;
                break;
            }
        }

        if (!productFound) {
            res.status(404).send('Producto no encontrado.');
            return;
        }

        // Guarda el archivo actualizado de vuelta en 'productos.json'
        fs.writeFile(path.join(__dirname, 'productos.json'), JSON.stringify(products, null, 2), (err) => {
            if (err) {
                res.status(500).send('Error al guardar el producto.');
                return;
            }
            res.send('Producto actualizado.');
        });
    });
});

app.delete('/api/products/:id', (req, res) => {
    // Elimina un producto basado en su ID
    const productId = req.params.id;

    fs.readFile(path.join(__dirname, 'productos.json'), 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error al leer los productos.');
            return;
        }
        
        let products = JSON.parse(data);
        let categoryFound = false;

        // Busca y elimina el producto del archivo JSON
        for (const category of products) {
            const productIndex = category.productos.findIndex(p => p.id === productId);
            if (productIndex > -1) {
                category.productos.splice(productIndex, 1);
                categoryFound = true;
                break;
            }
        }

        if (!categoryFound) {
            res.status(404).send('Producto no encontrado.');
            return;
        }

        // Guarda el archivo actualizado de vuelta en 'productos.json'
        fs.writeFile(path.join(__dirname, 'productos.json'), JSON.stringify(products, null, 2), (err) => {
            if (err) {
                res.status(500).send('Error al guardar los productos.');
                return;
            }
            res.send('Producto eliminado.');
        });
    });
});

// Función de utilidad para crear un retraso (usada para evitar spam de mensajes)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));



app.post('/api/orders/finish', async (req, res) => {
    const orderNumber = req.body.orderNumber;
    let orders = JSON.parse(fs.readFileSync('pedidos.json', 'utf8') || '[]');
    let orderIndex = orders.findIndex(order => order.orderNumber === orderNumber);

    if (orderIndex === -1) {
        res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
        return;
    }

    const order = orders[orderIndex];

    try {
        // Envía el mensaje "su pedido está en camino" al cliente
        await client.sendMessage(order.customer, '🚚 Su pedido está en camino.');

        // Guarda una copia del pedido en 'historial.json'
        let historial = JSON.parse(fs.readFileSync('historial.json', 'utf8') || '[]');
        historial.push(order);
        fs.writeFileSync('historial.json', JSON.stringify(historial, null, 2));

        // Elimina el pedido del archivo 'pedidos.json'
        orders.splice(orderIndex, 1);
        fs.writeFileSync('pedidos.json', JSON.stringify(orders, null, 2));

        res.json({ success: true, message: 'Pedido finalizado y archivado en el historial.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al procesar el pedido.' });
        console.error('Error finalizando el pedido:', error);
    }
});

app.get('/api/sales-data', (req, res) => {
    fs.readFile('historial.json', 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error al leer el historial.');
            return;
        }

        let historial = JSON.parse(data);
        let totalSales = historial.reduce((acc, order) => acc + order.totalPrice, 0);

        // Función para formatear fechas
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return {
                day: date.toISOString().split('T')[0],
                week: `${date.getFullYear()}-W${Math.ceil((date.getDate() + 1) / 7)}`,
                month: `${date.getFullYear()}-${date.getMonth() + 1}`
            };
        };

        // Inicialización de datos para ventas por período
        let dailySales = {};
        let weeklySales = {};
        let monthlySales = {};

        historial.forEach(order => {
            if (order.date) {
                let dates = formatDate(order.date);
                dailySales[dates.day] = (dailySales[dates.day] || 0) + order.totalPrice;
                weeklySales[dates.week] = (weeklySales[dates.week] || 0) + order.totalPrice;
                monthlySales[dates.month] = (monthlySales[dates.month] || 0) + order.totalPrice;
            }
        });

        // Obtener ventas del período más reciente
        let now = new Date();
        let today = formatDate(now.toISOString().split('T')[0]).day;
        let currentWeek = formatDate(now.toISOString().split('T')[0]).week;
        let currentMonth = formatDate(now.toISOString().split('T')[0]).month;

        let dailyTotal = dailySales[today] || 0;
        let weeklyTotal = weeklySales[currentWeek] || 0;
        let monthlyTotal = monthlySales[currentMonth] || 0;

        // Procesar productos más vendidos
        let productQuantities = {};
        historial.forEach(order => {
            order.items.forEach(item => {
                if (productQuantities[item.productId]) {
                    productQuantities[item.productId] += item.quantity;
                } else {
                    productQuantities[item.productId] = item.quantity;
                }
            });
        });

        let topProducts = Object.entries(productQuantities)
            .map(([id, quantity]) => ({ id, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        // Obtener nombres de productos y actualizar las cantidades
        fs.readFile(path.join(__dirname, 'productos.json'), 'utf8', (err, productData) => {
            if (err) {
                res.status(500).send('Error al leer los productos.');
                return;
            }

            let products = JSON.parse(productData);
            topProducts = topProducts.map(product => {
                let productInfo = products.flatMap(c => c.productos).find(p => p.id === parseInt(product.id));
                return {
                    name: productInfo ? productInfo.nombre : 'Desconocido',
                    quantity: product.quantity
                };
            });

            res.json({
                totalSales,
                dailyTotal,
                weeklyTotal,
                monthlyTotal,
                topProducts
            });
        });
    });
});


const almacenFile = path.join(__dirname, 'public', 'almacen.json');
const gastosFile = path.join(__dirname, 'public', 'gastos.json');

// Middleware para parsear JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Inicializar inventario
let inventory = [];

// Cargar inventario al iniciar el servidor
fs.readFile(almacenFile, 'utf8', (err, data) => {
    if (!err) {
        inventory = JSON.parse(data);
    } else {
        console.error('Error al cargar el inventario:', err);
    }
});

// Función para guardar el inventario en el archivo JSON
function saveInventory() {
    fs.writeFile(almacenFile, JSON.stringify(inventory, null, 2), err => {
        if (err) {
            console.error('Error al guardar el inventario:', err);
        }
    });
}

// Obtener inventario
app.get('/get-inventory', (req, res) => {
    res.json(inventory);
});

// Agregar producto
app.post('/add-product', (req, res) => {
    const newProduct = req.body;
    const existingProduct = inventory.find(p => p.name === newProduct.name);

    if (existingProduct) {
        return res.status(400).send('El producto ya existe.');
    }

    newProduct.id = inventory.length ? inventory[inventory.length - 1].id + 1 : 1;
    inventory.push(newProduct);

    saveInventory();
    res.json(newProduct);
});

// Actualizar producto
app.post('/update-product', (req, res) => {
    const updatedProduct = req.body;

    const index = inventory.findIndex(product => product.id === updatedProduct.id);
    if (index !== -1) {
        inventory[index] = updatedProduct;
        saveInventory();
        res.json(updatedProduct);
    } else {
        res.status(404).send('Producto no encontrado.');
    }
});

// Eliminar producto
app.delete('/delete-product/:id', (req, res) => {
    const productId = parseInt(req.params.id);

    inventory = inventory.filter(product => product.id !== productId);
    saveInventory();

    res.sendStatus(204);
});

// Registrar gasto
app.post('/register-expense', (req, res) => {
    const newExpense = req.body;

    fs.readFile(gastosFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error leyendo gastos.json:', err);
            return res.status(500).send('Error al registrar gasto.');
        }

        const expenses = JSON.parse(data);

        // Calcula el precio total basado en la cantidad y el tipo
        newExpense.total = newExpense.cost * newExpense.quantity;

        expenses.push(newExpense);

        fs.writeFile(gastosFile, JSON.stringify(expenses, null, 2), (err) => {
            if (err) {
                console.error('Error escribiendo gastos.json:', err);
                return res.status(500).send('Error al guardar el gasto.');
            }
            res.json(newExpense);
        });
    });
});

app.post('/register-expense', (req, res) => {
    const newExpense = req.body;
    newExpense.total = parseFloat(newExpense.expense-cost) * parseFloat(newExpense.expense-quantity);

    fs.readFile(gastosFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error leyendo gastos.json:', err);
            return res.status(500).send('Error al registrar gasto.');
        }

        const expenses = JSON.parse(data);
        expenses.push(newExpense);

        fs.writeFile(gastosFile, JSON.stringify(expenses, null, 2), (err) => {
            if (err) {
                console.error('Error escribiendo gastos.json:', err);
                return res.status(500).send('Error al guardar el gasto.');
            }
            res.json(newExpense);
        });
    });
});


// Evento cuando se genera un código QR para WhatsApp Web
client.on('qr', async (qr) => {
    try {
        // Generar el archivo PNG con el código QR
        await QRCode.toFile(path.join(__dirname, 'public', 'images', 'qr.png'), qr);
        console.log('QR code saved to public/images/qr.png');
    } catch (error) {
        console.error('Error generating QR code:', error);
    }
});

client.on('ready', () => {
    console.log('Client is ready!');
});

// Evento cuando se recibe un mensaje en WhatsApp
client.on('message', async message => {
    const contact = await message.getContact();
    const lowerCaseBody = message.body.toLowerCase();
    let orders = JSON.parse(fs.readFileSync('pedidos.json', 'utf8') || '[]');
    let userOrder = orders.find(order => order.customer === message.from);

    if (lowerCaseBody.includes('hola') || lowerCaseBody.includes('buenos días') || lowerCaseBody.includes('buenas tardes') || lowerCaseBody.includes('buenas noches')) {
        const name = contact.pushname || 'cliente';
        if (userOrder) {
            await message.reply(`👋 ¡Hola de nuevo, ${name}! Parece que ya has hecho un pedido. Escribe "modificar [detalle]" para modificarlo o "confirmar pedido" para finalizar.`);
        } else {
            await message.reply(`👋 ¡Hola, ${name}! Escribe *menu* para ver la carta y hacer tu pedido. 📝`);
        }
        return;
    }

    if (lowerCaseBody === 'menu') {
        await message.reply('📋 Elige la categoría que deseas ver:\n\n🏡 *Especiales de la Casa*\n🥪 *Sándwiches*\n🍔 *Hamburguesas*\n🥟 *Empanadas*\n🍕 *Pizzas*\n🍝 *Pastas*\n🍰 *Postres*\n   \n');
        await message.reply('🛒 Para agregar un producto al pedido\n\n📝 Escribe: "quiero seguido de la cantidad seguido del producto"\n\nEjemplo: *quiero 1 Coca Cola*');
        stopSendingProducts = false;
        return;
    }

    const showCategory = async (category) => {
        const cat = menu.find(c => c.nombre.toLowerCase() === category.toLowerCase());
        if (cat) {
            await message.reply(`🗂️ *${cat.nombre}*`);
            await delay(3000);

            for (const product of cat.productos) {
                if (stopSendingProducts) break;
                const productMessage = `• ${product.nombre}: ${product.descripcion} - $${product.precio}`;
                await message.reply(productMessage);
                await delay(3000);
            }

            if (!stopSendingProducts) {
                await message.reply('🛒 Para agregar un producto al pedido\n   \n📝 Escribe: "quiero seguido de la cantidad seguido del producto"\n   \nEjemplo: *quiero 1 Coca Cola*');
                await message.reply('¿Desea agregar más productos? 🤔\nEscribe *menu* para ver la carta.\n\n¿Desea confirmar el pedido? Escribe *confirmar pedido*');
            }
        } else {
            await message.reply(`🛑 Error: Categoría "${category}" no encontrada. Por favor, verifica el nombre de la categoría.`);
        }
    };

    if (lowerCaseBody === 'especiales de la casa') {
        await showCategory('Especiales de la Casa');
    } else if (lowerCaseBody === 'sándwiches') {
        await showCategory('Sándwiches');
    } else if (lowerCaseBody === 'hamburguesas') {
        await showCategory('Hamburguesas');
    } else if (lowerCaseBody === 'empanadas') {
        await showCategory('Empanadas');
    } else if (lowerCaseBody === 'pizzas') {
        await showCategory('Pizzas');
    } else if (lowerCaseBody === 'pastas') {
        await showCategory('Pastas');
    } else if (lowerCaseBody === 'postres') {
        await showCategory('Postres');
    } else if (lowerCaseBody.startsWith('quiero')) {
        stopSendingProducts = true;

        const moment = require('moment');

        if (!userOrder) {
            userOrder = {
                customer: message.from,
                orderNumber: uuid.v4(),
                items: [],
                summary: '',
                location: '',
                totalPrice: 0,
                date: moment().format('YYYY-MM-DD HH:mm:ss')  // Formatear la fecha del pedido
            };
            orders.push(userOrder);
        }

        const [_, quantity, ...productNameParts] = lowerCaseBody.split(' ');
        const productName = productNameParts.join(' ');
        const product = menu.flatMap(c => c.productos).find(p => p.nombre.toLowerCase() === productName);
        if (product) {
            userOrder.items.push({ productId: product.id, quantity: parseInt(quantity) });
            userOrder.summary += `\n${quantity} x ${product.nombre}`;
            fs.writeFileSync('pedidos.json', JSON.stringify(orders, null, 2));
            await message.reply(`✅ Agregado: ${quantity} x ${product.nombre}\n\n¿Desea agregar más productos? 🤔\nEscribe *menu* para ver la carta.\n   \n¿Desea confirmar el pedido? Escribe *confirmar pedido*`);
        } else {
            await message.reply(`🛑 Error: Producto "${productName}" no encontrado. Por favor, verifica el nombre del producto.`);
        }
    } else if (lowerCaseBody === 'confirmar pedido') {
        if (!userOrder || userOrder.items.length === 0) {
            await message.reply('🛑 Error: No tienes productos en tu pedido. Escribe *menu* para agregar productos.');
            return;
        }

        userOrder.totalPrice = calculateTotalPrice(userOrder);
        fs.writeFileSync('pedidos.json', JSON.stringify(orders, null, 2));
        await message.reply(`📝 Resumen de tu pedido: ${userOrder.summary}\n\nTotal a pagar: $${userOrder.totalPrice}`);
        await message.reply('🏠 ¿Cuál es la dirección para el envío?\n   \nEscribe: *mi dirección es seguido de tu dirección*.\n   \nEjemplo: *mi dirección es Belgrano 448 piso 3 puerta C*.');
    } else if (lowerCaseBody.startsWith('mi dirección es')) {
        if (userOrder) {
            userOrder.location = lowerCaseBody.replace('mi dirección es', '').trim();
            fs.writeFileSync('pedidos.json', JSON.stringify(orders, null, 2));

            // Solicitud del medio de pago
            await message.reply(`¿Cómo desea pagar? 
🏦 - Transferencia Bancaria.
💸 - Efectivo.
💰 Total a pagar: $${userOrder.totalPrice}`);
        }
    } else if (lowerCaseBody === 'transferencia') {
        if (userOrder && userOrder.location) {
            await message.reply(`💳Medio de pago seleccionado: transferencia
🕵🏻️‍♂️ALIAS: arrapar.talque.lemon
🏦CVU: 10001548996655478523489
🪪TITULAR: Facundo Maximiliano Cercuetti.`);

            const orderDetails = `
            📝 Número de pedido: ${userOrder.orderNumber}
            🛒 Listado de productos: 
                ${userOrder.summary}
            💰 Total a pagar:
                $${userOrder.totalPrice}
            📍 Dirección de envío: 
                ${userOrder.location}
            💰 Medio de pago:
                transferencia
            `;
            
            await message.reply(orderDetails);
            await message.reply('✅ ¡Su pedido ha sido enviado! Gracias por su compra.');
        }
    } else if (lowerCaseBody === 'efectivo') {
        if (userOrder && userOrder.location) {
            await message.reply('¿Con cuánto abona💰?');
            await message.reply('ejemplo: pago con $15000 ');
        }
    } else if (lowerCaseBody.startsWith('pago con')) {
        const paymentAmount = lowerCaseBody.replace('pago con', '').trim();
        if (userOrder && userOrder.location) {
            // Almacenar el medio de pago
            userOrder.paymentMethod = `Efectivo: ${paymentAmount}`;
            fs.writeFileSync('pedidos.json', JSON.stringify(orders, null, 2));

            await message.reply(`
            📝 Número de pedido: ${userOrder.orderNumber}
            🛒 Listado de productos: 
                ${userOrder.summary}
            💰 Total a pagar:
                $${userOrder.totalPrice}
            📍 Dirección de envío: 
                ${userOrder.location}
            💰 Medio de pago:
                Efectivo: ${paymentAmount}
            `);

            await message.reply('Para terminar su pedido, escribe "enviar pedido".');
        }
    } else if (lowerCaseBody === 'enviar pedido') {
        if (userOrder && userOrder.location) {
            fs.writeFileSync('pedidos.json', JSON.stringify(orders, null, 2));
            await message.reply('✅ ¡Su pedido ha sido enviado! Gracias por su compra.');
        } else {
            await message.reply('🛑 Error: Por favor, envía tu dirección para completar el pedido.');
        }
    }
});

client.initialize();

// Iniciar servidor Express
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
