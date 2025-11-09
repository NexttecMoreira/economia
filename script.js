 document.addEventListener('DOMContentLoaded', function() {
            // Initialize feather icons
            feather.replace();

            // Firebase variables
            let firebaseApp = null;
            let auth = null;
            let db = null;
            let currentUser = null;

            // Chart instances
            let incomeChart, expenseChart, summaryChart;

            // Data structure
            let finances = {
                income: [],
                expense: []
            };

            // Initialize Firebase (if firebase scripts are loaded)
            function initFirebase() {
                try {
                    console.log('initFirebase: typeof firebase =', typeof firebase, 'window.firebaseConfig =', !!window.firebaseConfig);
                    const cfg = (typeof window !== 'undefined' && window.firebaseConfig) ? window.firebaseConfig : (typeof firebaseConfig !== 'undefined' ? firebaseConfig : null);
                    if (typeof firebase !== 'undefined' && cfg) {
                        // initialize only if no apps initialized
                        if (!firebase.apps || !firebase.apps.length) {
                            firebaseApp = firebase.initializeApp(cfg);
                            console.log('Firebase initialized', firebaseApp.name || '(default)');
                        } else {
                            firebaseApp = firebase.app();
                            console.log('Firebase app already initialized');
                        }

                        auth = firebase.auth();
                        db = firebase.firestore();

                        // Auth state listener
                        auth.onAuthStateChanged(async (user) => {
                            console.log('onAuthStateChanged', user && user.uid);
                            currentUser = user;
                            updateAuthUI();
                            if (user) {
                                await loadFromFirestore();
                            } else {
                                loadDataFromLocalStorage();
                                // If we're on the app page but not logged in, redirect to login page
                                try {
                                    const path = window.location.pathname || '';
                                    const isLoginPage = path.endsWith('login.html') || path.endsWith('/login.html');
                                    if (!isLoginPage) {
                                        console.log('No user - redirecting to login.html');
                                        window.location.href = 'login.html';
                                    }
                                } catch (err) {
                                    console.warn('Redirect to login failed', err);
                                }
                            }
                        });
                    } else {
                        console.warn('Firebase not available or config missing. cfg=', cfg);
                    }
                } catch (err) {
                    console.error('initFirebase error', err);
                }
            }
            
            
            // Load data from localStorage (fallback)
            function loadDataFromLocalStorage() {
                const savedData = localStorage.getItem('moneyMagnetData');
                if (savedData) {
                    finances = JSON.parse(savedData);
                    updateAll();
                } else {
                    updateAll();
                }
            }

            // Save data (to Firestore if logged in, else to localStorage)
            function saveData() {
                localStorage.setItem('moneyMagnetData', JSON.stringify(finances));
                if (currentUser && db) {
                    saveToFirestore().catch(err => console.error('Error saving to Firestore', err));
                }
            }

            // Load data from Firestore for current user
            async function loadFromFirestore() {
                if (!currentUser || !db) return;
                try {
                    const docRef = db.collection('users').doc(currentUser.uid);
                    const doc = await docRef.get();
                    if (doc.exists) {
                        const data = doc.data();
                        if (data && data.finances) {
                            finances = data.finances;
                        }
                    }
                    updateAll();
                } catch (err) {
                    console.error('Failed to load from Firestore', err);
                    loadDataFromLocalStorage();
                }
            }

            // Save finances to Firestore under users/{uid}
            async function saveToFirestore() {
                if (!currentUser || !db) return;
                const docRef = db.collection('users').doc(currentUser.uid);
                await docRef.set({ finances: finances }, { merge: true });
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

            // Update authentication UI (show login form or user info)
            function updateAuthUI() {
                try {
                    const authForms = document.getElementById('auth-forms');
                    const authUser = document.getElementById('auth-user');
                    const userEmailDisplay = document.getElementById('user-email-display');

                    if (currentUser) {
                        if (authForms) authForms.style.display = 'none';
                        if (authUser) authUser.style.display = 'flex';
                        if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email || currentUser.uid;
                    } else {
                        if (authForms) authForms.style.display = '';
                        if (authUser) authUser.style.display = 'none';
                        if (userEmailDisplay) userEmailDisplay.textContent = '';
                    }
                } catch (err) {
                    console.error('updateAuthUI error', err);
                }
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
                    
                    // Auth UI buttons
                    document.getElementById('btn-signup').addEventListener('click', async function() {
                        const email = document.getElementById('auth-email').value.trim();
                        const password = document.getElementById('auth-password').value.trim();
                        if (!email || !password) return alert('Preencha email e senha');
                        try {
                            console.log('signup: calling createUserWithEmailAndPassword for', email);
                            const res = await auth.createUserWithEmailAndPassword(email, password);
                            console.log('signup success', res && res.user && res.user.uid);
                            alert('Usuário criado e logado');
                        } catch (err) {
                            console.error('Erro ao cadastrar', err);
                            alert('Erro ao cadastrar: ' + err.message);
                        }
                    });

                    document.getElementById('btn-login').addEventListener('click', async function() {
                        const email = document.getElementById('auth-email').value.trim();
                        const password = document.getElementById('auth-password').value.trim();
                        if (!email || !password) return alert('Preencha email e senha');
                        try {
                            console.log('login: attempting signInWithEmailAndPassword for', email);
                            const res = await auth.signInWithEmailAndPassword(email, password);
                            console.log('login success', res && res.user && res.user.uid);
                            // Optionally clear fields on success
                            document.getElementById('auth-password').value = '';
                            // updateAuthUI will be triggered by onAuthStateChanged
                            return;
                        } catch (err) {
                            console.error('Erro ao entrar', err);
                            alert('Erro ao entrar: ' + err.message);
                        }
                    });

                    document.getElementById('btn-logout').addEventListener('click', async function() {
                        try {
                            await auth.signOut();
                        } catch (err) {
                            console.error('Erro ao deslogar', err);
                        }
                    });

                    // Initialize
                    initCharts();
                    initFirebase();
                    // loadData will be triggered by auth state listener; if firebase not available, use localStorage
                    if (typeof firebase === 'undefined') {
                        loadDataFromLocalStorage();
                    }
                });