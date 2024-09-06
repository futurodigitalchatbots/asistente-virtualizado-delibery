document.addEventListener('DOMContentLoaded', function() {
    fetch('/api/sales-data')
        .then(response => response.json())
        .then(data => {
            renderTotalSales(data);
            renderPieChart(data.topProducts);
            renderBarChart(data.topProducts);
            renderTableChart(data.topProducts);
        })
        .catch(error => console.error('Error fetching sales data:', error));
});

function renderTotalSales(data) {
    document.getElementById('daily-sales-total').innerHTML = `$${data.dailyTotal}`;
    document.getElementById('weekly-sales-total').innerHTML = `$${data.weeklyTotal}`;
    document.getElementById('monthly-sales-total').innerHTML = `$${data.monthlyTotal}`;
}

// Renderizar gráfico de torta para los productos más elegidos
function renderPieChart(topProducts) {
    const ctx = document.getElementById('pie-chart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: topProducts.map(product => product.name),
            datasets: [{
                label: 'Productos Más Elegidos',
                data: topProducts.map(product => product.quantity),
                backgroundColor: topProducts.map(() => `#${Math.floor(Math.random()*16777215).toString(16)}`),
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (context.parsed) {
                                label += `: ${context.parsed} ventas`;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Renderizar gráfico de columnas para los productos más elegidos
function renderBarChart(topProducts) {
    const ctx = document.getElementById('bar-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topProducts.map(product => product.name),
            datasets: [{
                label: 'Productos Más Elegidos',
                data: topProducts.map(product => product.quantity),
                backgroundColor: '#007bff',
                borderColor: '#0056b3',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: '#495057',
                    },
                    grid: {
                        color: '#dee2e6'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#495057',
                    },
                    grid: {
                        color: '#dee2e6'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (context.parsed.y !== null) {
                                label += `: ${context.parsed.y} ventas`;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Renderizar tabla de productos más elegidos
function renderTableChart(topProducts) {
    const tableBody = document.querySelector('#table-chart tbody');
    tableBody.innerHTML = topProducts.map(product => `
        <tr>
            <td>${product.name}</td>
            <td>${product.quantity}</td>
        </tr>
    `).join('');
}

// Renderizar gráficos de ventas diarias, semanales y mensuales
function renderSalesBreakdown(salesBreakdown) {
    const dailyCtx = document.getElementById('daily-sales-chart').getContext('2d');
    const weeklyCtx = document.getElementById('weekly-sales-chart').getContext('2d');
    const monthlyCtx = document.getElementById('monthly-sales-chart').getContext('2d');

    function createChart(ctx, data, label) {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.period),
                datasets: [{
                    label: label,
                    data: data.map(item => item.quantity),
                    backgroundColor: '#007bff',
                    borderColor: '#0056b3',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: '#495057',
                        },
                        grid: {
                            color: '#dee2e6'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#495057',
                        },
                        grid: {
                            color: '#dee2e6'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (context.parsed.y !== null) {
                                    label += `: ${context.parsed.y} ventas`;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    createChart(dailyCtx, salesBreakdown.daily, 'Ventas Diarias');
    createChart(weeklyCtx, salesBreakdown.weekly, 'Ventas Semanales');
    createChart(monthlyCtx, salesBreakdown.monthly, 'Ventas Mensuales');
}
