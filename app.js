// Estructura de datos principal
let financesData = {
    balance: 0,
    transactions: [],
    categories: {
        income: ['Salario', 'Freelance', 'Inversiones', 'Regalo', 'Otros ingresos'],
        expense: ['Comida', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Educación', 'Ropa', 'Otros gastos']
    },
    settings: {
        currency: '$',
        theme: 'light',
        lastDayBalance: null
    }
};

// Elementos del DOM
const DOM = {
    currentBalance: document.getElementById('currentBalance'),
    monthIncome: document.getElementById('monthIncome'),
    monthExpense: document.getElementById('monthExpense'),
    transactionForm: document.getElementById('transactionForm'),
    transactionType: document.getElementById('transactionType'),
    transactionAmount: document.getElementById('transactionAmount'),
    transactionCategory: document.getElementById('transactionCategory'),
    transactionNotes: document.getElementById('transactionNotes'),
    transactionsList: document.getElementById('transactionsList'),
    filterCategory: document.getElementById('filterCategory'),
    filterDate: document.getElementById('filterDate'),
    dailyBalanceChart: document.getElementById('dailyBalanceChart').getContext('2d'),
    categoryChart: document.getElementById('categoryChart').getContext('2d'),
    themeToggle: document.getElementById('themeToggle'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    notification: document.getElementById('notification'),
    notificationText: document.getElementById('notificationText')
};

// Objetos de gráficos
let dailyChart, categoryChart;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeCategories();
    renderTransactions();
    updateSummary();
    createCharts();
    setupEventListeners();
    checkPreviousDayBalance();
});

// Cargar datos del localStorage
function loadData() {
    const savedData = localStorage.getItem('finanzTrackData');
    if (savedData) {
        financesData = JSON.parse(savedData);
        // Asegurar que las categorías por defecto estén presentes
        financesData.categories.income = [...new Set([...financesData.categories.income, ...['Salario', 'Freelance', 'Inversiones', 'Regalo', 'Otros ingresos']])];
        financesData.categories.expense = [...new Set([...financesData.categories.expense, ...['Comida', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Educación', 'Ropa', 'Otros gastos']])];
    }
    
    // Aplicar tema guardado
    document.documentElement.setAttribute('data-theme', financesData.settings.theme);
}

// Guardar datos en localStorage
function saveData() {
    localStorage.setItem('finanzTrackData', JSON.stringify(financesData));
}

// Inicializar categorías en los select
function initializeCategories() {
    // Limpiar selects
    DOM.transactionCategory.innerHTML = '';
    DOM.filterCategory.innerHTML = '<option value="all">Todas las categorías</option>';
    
    // Obtener el tipo de transacción actual
    const currentType = DOM.transactionType.value;
    
    // Llenar categorías para el formulario
    financesData.categories[currentType].forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        DOM.transactionCategory.appendChild(option);
    });
    
    // Llenar categorías para el filtro (ambos tipos)
    const allCategories = [...financesData.categories.income, ...financesData.categories.expense];
    allCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        DOM.filterCategory.appendChild(option.cloneNode(true));
    });
}

// Manejar envío del formulario
DOM.transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const type = DOM.transactionType.value;
    const amount = parseFloat(DOM.transactionAmount.value);
    const category = DOM.transactionCategory.value;
    const notes = DOM.transactionNotes.value;
    
    if (isNaN(amount) || amount <= 0) {
        showNotification('Por favor ingresa un monto válido', 'error');
        return;
    }
    
    const transaction = {
        id: Date.now().toString(),
        type,
        amount: type === 'income' ? amount : -amount,
        category,
        notes,
        date: new Date().toISOString()
    };
    
    // Actualizar balance
    financesData.balance += transaction.amount;
    
    // Agregar transacción
    financesData.transactions.unshift(transaction);
    
    // Guardar y actualizar UI
    saveData();
    renderTransactions();
    updateSummary();
    updateCharts();
    
    // Resetear formulario
    DOM.transactionAmount.value = '';
    DOM.transactionNotes.value = '';
    DOM.transactionAmount.focus();
    
    showNotification('Transacción agregada correctamente', 'success');
});

// Renderizar transacciones
function renderTransactions() {
    DOM.transactionsList.innerHTML = '';
    
    const categoryFilter = DOM.filterCategory.value;
    const dateFilter = DOM.filterDate.value;
    
    const filteredTransactions = financesData.transactions.filter(transaction => {
        const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
        const matchesDate = !dateFilter || new Date(transaction.date).toISOString().split('T')[0] === dateFilter;
        return matchesCategory && matchesDate;
    });
    
    if (filteredTransactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                No hay transacciones para mostrar
            </td>
        `;
        DOM.transactionsList.appendChild(row);
        return;
    }
    
    filteredTransactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.className = 'fade-in';
        
        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const amountClass = transaction.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
        const amountSign = transaction.amount > 0 ? '+' : '';
        const formattedAmount = `${amountSign}${financesData.settings.currency}${Math.abs(transaction.amount).toFixed(2)}`;
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${formattedDate}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }">
                    ${transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${transaction.category}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${amountClass}">${formattedAmount}</td>
            <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${transaction.notes || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 delete-btn mr-2" data-id="${transaction.id}">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 edit-btn" data-id="${transaction.id}">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        
        DOM.transactionsList.appendChild(row);
    });
    
    // Agregar event listeners a los botones de eliminar y editar
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            deleteTransaction(id);
        });
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            editTransaction(id);
        });
    });
}

// Eliminar transacción
function deleteTransaction(id) {
    const transactionIndex = financesData.transactions.findIndex(t => t.id === id);
    if (transactionIndex === -1) return;
    
    // Restaurar el balance
    financesData.balance -= financesData.transactions[transactionIndex].amount;
    
    // Eliminar transacción
    financesData.transactions.splice(transactionIndex, 1);
    
    // Guardar y actualizar UI
    saveData();
    renderTransactions();
    updateSummary();
    updateCharts();
    
    showNotification('Transacción eliminada', 'info');
}

// Editar transacción (simplificado para este ejemplo)
function editTransaction(id) {
    const transaction = financesData.transactions.find(t => t.id === id);
    if (!transaction) return;
    
    // Restaurar el balance (quitamos el monto antiguo)
    financesData.balance -= transaction.amount;
    
    // Pedir nuevos datos (en una aplicación real sería un modal o formulario de edición)
    const newAmount = parseFloat(prompt('Nuevo monto:', Math.abs(transaction.amount)));
    if (isNaN(newAmount) || newAmount <= 0) {
        // Si cancelan, restauramos el balance
        financesData.balance += transaction.amount;
        return;
    }
    
    // Actualizar transacción
    transaction.amount = transaction.type === 'income' ? newAmount : -newAmount;
    transaction.notes = prompt('Nuevas notas:', transaction.notes || '') || transaction.notes;
    
    // Actualizar balance con el nuevo monto
    financesData.balance += transaction.amount;
    
    // Guardar y actualizar UI
    saveData();
    renderTransactions();
    updateSummary();
    updateCharts();
    
    showNotification('Transacción actualizada', 'success');
}

// Actualizar resumen
function updateSummary() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthTransactions = financesData.transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    DOM.currentBalance.textContent = `${financesData.settings.currency}${financesData.balance.toFixed(2)}`;
    DOM.monthIncome.textContent = `${financesData.settings.currency}${income.toFixed(2)}`;
    DOM.monthExpense.textContent = `${financesData.settings.currency}${expenses.toFixed(2)}`;
    
    // Notificación si el balance es bajo
    if (financesData.balance < 0) {
        showNotification('¡Atención! Tu balance es negativo', 'error');
    } else if (financesData.balance < 100) {
        showNotification('Tu balance está bajo, considera reducir gastos', 'warning');
    }
}

// Crear gráficos
function createCharts() {
    // Gráfico de balance diario
    dailyChart = new Chart(DOM.dailyBalanceChart, {
        type: 'line',
        data: getDailyBalanceData(),
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fff' : '#666'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fff' : '#666'
                    }
                },
                y: {
                    grid: {
                        color: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fff' : '#666'
                    }
                }
            }
        }
    });
    
    // Gráfico de categorías
    categoryChart = new Chart(DOM.categoryChart, {
        type: 'doughnut',
        data: getCategoryData(),
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fff' : '#666'
                    }
                }
            }
        }
    });
}

// Actualizar gráficos
function updateCharts() {
    dailyChart.data = getDailyBalanceData();
    dailyChart.update();
    
    categoryChart.data = getCategoryData();
    categoryChart.update();
}

// Obtener datos para el gráfico de balance diario
function getDailyBalanceData() {
    // Últimos 7 días
    const days = 7;
    const dates = [];
    const balances = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dates.push(date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }));
        
        // Calcular balance para cada día
        let dayBalance = financesData.settings.lastDayBalance || 0;
        
        // Sumar todas las transacciones hasta este día
        financesData.transactions.forEach(t => {
            const transDate = new Date(t.date).toISOString().split('T')[0];
            if (transDate <= dateStr) {
                dayBalance += t.amount;
            }
        });
        
        balances.push(dayBalance);
    }
    
    return {
        labels: dates,
        datasets: [{
            label: 'Balance Diario',
            data: balances,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
        }]
    };
}

// Obtener datos para el gráfico de categorías
function getCategoryData() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthExpenses = financesData.transactions.filter(t => {
        const date = new Date(t.date);
        return t.type === 'expense' && 
               date.getMonth() === currentMonth && 
               date.getFullYear() === currentYear;
    });
    
    const categories = {};
    monthExpenses.forEach(t => {
        if (!categories[t.category]) {
            categories[t.category] = 0;
        }
        categories[t.category] += Math.abs(t.amount);
    });
    
    const labels = Object.keys(categories);
    const data = Object.values(categories);
    
    // Colores para las categorías
    const backgroundColors = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(199, 199, 199, 0.7)'
    ];
    
    return {
        labels: labels,
        datasets: [{
            data: data,
            backgroundColor: backgroundColors.slice(0, labels.length),
            borderWidth: 1
        }]
    };
}

// Configurar event listeners
function setupEventListeners() {
    // Cambiar tipo de transacción
    DOM.transactionType.addEventListener('change', initializeCategories);
    
    // Filtrar transacciones
    DOM.filterCategory.addEventListener('change', renderTransactions);
    DOM.filterDate.addEventListener('change', renderTransactions);
    
    // Tema claro/oscuro
    DOM.themeToggle.addEventListener('click', toggleTheme);
    
    // Exportar/importar datos
    DOM.exportBtn.addEventListener('click', exportData);
    DOM.importBtn.addEventListener('click', () => DOM.importFile.click());
    DOM.importFile.addEventListener('change', importData);
}

// Cambiar tema
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    financesData.settings.theme = newTheme;
    saveData();
    
    // Actualizar gráficos para que usen los colores correctos
    updateCharts();
}

// Exportar datos
function exportData() {
    const dataStr = JSON.stringify(financesData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `finanzTrack-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Datos exportados correctamente', 'success');
}

// Importar datos
function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            
            // Validar estructura básica
            if (!importedData.balance || !importedData.transactions || !importedData.categories) {
                throw new Error('El archivo no tiene el formato correcto');
            }
            
            // Reemplazar datos
            financesData = importedData;
            saveData();
            
            // Actualizar UI
            initializeCategories();
            renderTransactions();
            updateSummary();
            updateCharts();
            
            showNotification('Datos importados correctamente', 'success');
        } catch (error) {
            console.error('Error al importar datos:', error);
            showNotification('Error al importar: ' + error.message, 'error');
        }
        
        // Resetear input de archivo
        DOM.importFile.value = '';
    };
    reader.readAsText(file);
}

// Mostrar notificación
function showNotification(message, type) {
    const notification = DOM.notification;
    const notificationText = DOM.notificationText;
    
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center transform translate-y-10 opacity-0 transition-all duration-300 ${
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    
    notificationText.textContent = message;
    
    // Mostrar
    setTimeout(() => {
        notification.classList.remove('translate-y-10', 'opacity-0');
        notification.classList.add('translate-y-0', 'opacity-100');
    }, 10);
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        notification.classList.remove('translate-y-0', 'opacity-100');
        notification.classList.add('translate-y-10', 'opacity-0');
    }, 5000);
}

// Verificar balance del día anterior
function checkPreviousDayBalance() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Si no hay registro del día anterior, guardar el balance actual
    if (!financesData.settings.lastDayBalanceDate || financesData.settings.lastDayBalanceDate !== yesterdayStr) {
        financesData.settings.lastDayBalance = financesData.balance;
        financesData.settings.lastDayBalanceDate = today;
        saveData();
    }
}