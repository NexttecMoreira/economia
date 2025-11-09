 document.addEventListener('DOMContentLoaded', function() {
            // Initialize feather icons
            feather.replace();
            
            // Chart instances
            let incomeChart, expenseChart, summaryChart;
            
            // Data structure
            let finances = {
                income: [],
                expense: []
            };
            
            // Load data from localStorage
            function loadData() {
                const savedData = localStorage.getItem('moneyMagnetData');
                if (savedData) {
                    finances = JSON.parse(savedData);
                    updateAll();
                }
            }
            
            // Save data to localStorage
            function saveData() {
                localStorage.setItem('moneyMagnetData', JSON.stringify(finances));
            }
            
            // Initialize charts
            function initCharts() {
                // Income Chart
                const incomeCtx = document.getElementById('income-chart').getContext('2d');
                incomeChart = new Chart(incomeCtx, {
                    type: 'pie',
                    data: {
                        labels: [],
                        datasets: [{
                            data: [],
                            backgroundColor: [
                                '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'
                            ],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    color: '#E5E7EB',
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.raw || 0;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = Math.round((value / total) * 100);
                                        return `${label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
                
                // Expense Chart
                const expenseCtx = document.getElementById('expense-chart').getContext('2d');
                expenseChart = new Chart(expenseCtx, {
                    type: 'pie',
                    data: {
                        labels: [],
                        datasets: [{
                            data: [],
                            backgroundColor: [
                                '#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2'
                            ],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    color: '#E5E7EB',
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.raw || 0;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = Math.round((value / total) * 100);
                                        return `${label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
                
                // Summary Chart
                const summaryCtx = document.getElementById('summary-chart').getContext('2d');
                summaryChart = new Chart(summaryCtx, {
                    type: 'pie',
                    data: {
                        labels: ['Ganhos', 'Gastos'],
                        datasets: [{
                            data: [0, 0],
                            backgroundColor: ['#10B981', '#EF4444'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    color: '#E5E7EB',
                                    font: {
                                        size: 14
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.raw || 0;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = Math.round((value / total) * 100);
                                        return `${label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
            
            // Update all UI elements
            function updateAll() {
                updateIncomeList();
                updateExpenseList();
                updateCharts();
                updateSummary();
                saveData();
            }
            
            // Update income list
            function updateIncomeList() {
                const incomeList = document.getElementById('income-list');
                incomeList.innerHTML = '';
                
                let totalIncome = 0;
                
                finances.income.forEach((item, index) => {
                    totalIncome += parseFloat(item.value);

                    const itemElement = document.createElement('div');
                    itemElement.className = 'list-item card-item fade-in item-enter';
                    itemElement.innerHTML = `
                        <div class="item-info">
                            <span class="item-name">${item.name}</span>
                            <span class="item-value item-value--income">R$ ${parseFloat(item.value).toFixed(2)}</span>
                        </div>
                        <div class="card-actions">
                            <button class="edit-income icon-btn" data-index="${index}">
                                <i data-feather="edit-2" class="w-4 h-4"></i>
                            </button>
                            <button class="delete-income icon-btn" data-index="${index}">
                                <i data-feather="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    `;

                    incomeList.appendChild(itemElement);
                });
                
                document.getElementById('total-income').textContent = `R$ ${totalIncome.toFixed(2)}`;
                feather.replace();
            }
            
            // Update expense list
            function updateExpenseList() {
                const expenseList = document.getElementById('expense-list');
                expenseList.innerHTML = '';
                
                let totalExpense = 0;
                
                finances.expense.forEach((item, index) => {
                    totalExpense += parseFloat(item.value);

                    const itemElement = document.createElement('div');
                    itemElement.className = 'list-item card-item fade-in item-enter';
                    itemElement.innerHTML = `
                        <div class="item-info">
                            <span class="item-name">${item.name}</span>
                            <span class="item-value item-value--expense">R$ ${parseFloat(item.value).toFixed(2)}</span>
                        </div>
                        <div class="card-actions">
                            <button class="edit-expense icon-btn" data-index="${index}">
                                <i data-feather="edit-2" class="w-4 h-4"></i>
                            </button>
                            <button class="delete-expense icon-btn" data-index="${index}">
                                <i data-feather="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    `;

                    expenseList.appendChild(itemElement);
                });
                
                document.getElementById('total-expense').textContent = `R$ ${totalExpense.toFixed(2)}`;
                feather.replace();
            }
            
            // Update charts
            function updateCharts() {
                // Income Chart
                const incomeLabels = finances.income.map(item => item.name);
                const incomeData = finances.income.map(item => parseFloat(item.value));
                
                incomeChart.data.labels = incomeLabels;
                incomeChart.data.datasets[0].data = incomeData;
                incomeChart.update();
                
                // Expense Chart
                const expenseLabels = finances.expense.map(item => item.name);
                const expenseData = finances.expense.map(item => parseFloat(item.value));
                
                expenseChart.data.labels = expenseLabels;
                expenseChart.data.datasets[0].data = expenseData;
                expenseChart.update();
                
                // Summary Chart
                const totalIncome = finances.income.reduce((sum, item) => sum + parseFloat(item.value), 0);
                const totalExpense = finances.expense.reduce((sum, item) => sum + parseFloat(item.value), 0);
                
                summaryChart.data.datasets[0].data = [totalIncome, totalExpense];
                summaryChart.update();
            }
            
            // Update summary section
            function updateSummary() {
                const totalIncome = finances.income.reduce((sum, item) => sum + parseFloat(item.value), 0);
                const totalExpense = finances.expense.reduce((sum, item) => sum + parseFloat(item.value), 0);
                const balance = totalIncome - totalExpense;
                
                document.getElementById('summary-income').textContent = `R$ ${totalIncome.toFixed(2)}`;
                document.getElementById('summary-expense').textContent = `R$ ${totalExpense.toFixed(2)}`;
                document.getElementById('summary-balance').textContent = `R$ ${balance.toFixed(2)}`;
                document.getElementById('balance-amount').textContent = `R$ ${balance.toFixed(2)}`;
                
                const balanceStatus = document.getElementById('balance-status');
                const financialTip = document.getElementById('financial-tip');
                
                if (balance > 0) {
                    balanceStatus.textContent = '(Positivo)';
                    balanceStatus.className = 'balance-status status-positive';
                    financialTip.textContent = 'Ótimo trabalho! Você está economizando.';
                    financialTip.className = 'site-subtext status-positive';
                } else if (balance < 0) {
                    balanceStatus.textContent = '(Negativo)';
                    balanceStatus.className = 'balance-status status-negative';
                    financialTip.textContent = 'Cuidado! Você está gastando mais do que ganha.';
                    financialTip.className = 'site-subtext status-negative';
                } else {
                    balanceStatus.textContent = '(Equilibrado)';
                    balanceStatus.className = 'balance-status status-neutral';
                    financialTip.textContent = 'Seu saldo está equilibrado.';
                    financialTip.className = 'site-subtext status-neutral';
                }
                    }
                    
                    // Add income
                    document.getElementById('add-income').addEventListener('click', function() {
                        const name = document.getElementById('income-name').value.trim();
                        const value = document.getElementById('income-value').value.trim();
                        
                        if (name && value) {
                            finances.income.push({
                                name: name,
                                value: parseFloat(value).toFixed(2)
                            });
                            
                            document.getElementById('income-name').value = '';
                            document.getElementById('income-value').value = '';
                            updateAll();
                        }
                    });
                    
                    // Add expense
                    document.getElementById('add-expense').addEventListener('click', function() {
                        const name = document.getElementById('expense-name').value.trim();
                        const value = document.getElementById('expense-value').value.trim();
                        
                        if (name && value) {
                            finances.expense.push({
                                name: name,
                                value: parseFloat(value).toFixed(2)
                            });
                            
                            document.getElementById('expense-name').value = '';
                            document.getElementById('expense-value').value = '';
                            updateAll();
                        }
                    });
                    
                    // Delete income
                    document.addEventListener('click', function(e) {
                        if (e.target.closest('.delete-income')) {
                            const index = e.target.closest('.delete-income').dataset.index;
                            finances.income.splice(index, 1);
                            updateAll();
                        }
                    });
                    
                    // Delete expense
                    document.addEventListener('click', function(e) {
                        if (e.target.closest('.delete-expense')) {
                            const index = e.target.closest('.delete-expense').dataset.index;
                            finances.expense.splice(index, 1);
                            updateAll();
                        }
                    });
                    
                    // Edit income
                    document.addEventListener('click', function(e) {
                        if (e.target.closest('.edit-income')) {
                            const index = e.target.closest('.edit-income').dataset.index;
                            const item = finances.income[index];
                            
                            document.getElementById('income-name').value = item.name;
                            document.getElementById('income-value').value = item.value;
                            
                            finances.income.splice(index, 1);
                            updateAll();
                        }
                    });
                    
                    // Edit expense
                    document.addEventListener('click', function(e) {
                        if (e.target.closest('.edit-expense')) {
                            const index = e.target.closest('.edit-expense').dataset.index;
                            const item = finances.expense[index];
                            
                            document.getElementById('expense-name').value = item.name;
                            document.getElementById('expense-value').value = item.value;
                            
                            finances.expense.splice(index, 1);
                            updateAll();
                        }
                    });
                    
                    // Initialize
                    initCharts();
                    loadData();
                });