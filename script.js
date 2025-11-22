// NextFlow - Página de Resumo

let data = { income: [], expense: [] };
let incomeChart = null;
let expenseChart = null;
let currentPeriod = 'dia'; // 'dia', 'mes', 'ano'
let db = null;
let currentUser = null;

function loadData() {
  if (db && currentUser) {
    // Usar onSnapshot para sincronização em tempo real
    db.collection('users').doc(currentUser.uid).onSnapshot(
      function(doc) {
        if (doc.exists) {
          data = doc.data() || { income: [], expense: [] };
          if (!data.income) data.income = [];
          if (!data.expense) data.expense = [];
        }
        updateCharts();
        updateSummary();
        updateDatesSummary();
      },
      function(erro) {
        console.error('Erro ao carregar do Firestore:', erro);
        loadFromLocalStorage();
      }
    );
  } else {
    loadFromLocalStorage();
  }
}

function loadFromLocalStorage() {
  // Não usar mais localStorage - apenas Firestore
  console.warn('Firestore indisponível');
  updateCharts();
  updateSummary();
}

// Formatar data como YYYY-MM-DD
function formatDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

// Filtrar dados por período
function filterDataByPeriod(items) {
  if (!items || items.length === 0) return [];
  
  const hoje = new Date();
  const hoje_str = formatDateStr(hoje);
  
  return items.filter(function(item) {
    if (!item.date) return false;
    
    if (currentPeriod === 'dia') {
      return item.date === hoje_str;
    } else if (currentPeriod === 'mes') {
      const itemDate = new Date(item.date);
      return itemDate.getMonth() === hoje.getMonth() && 
             itemDate.getFullYear() === hoje.getFullYear();
    } else if (currentPeriod === 'ano') {
      const itemDate = new Date(item.date);
      return itemDate.getFullYear() === hoje.getFullYear();
    }
    return false;
  });
}

function initCharts() {
  const ctxIncome = document.getElementById('resumo-grafico-ganhos');
  const ctxExpense = document.getElementById('resumo-grafico-gastos');

  if (ctxIncome) {
    incomeChart = new Chart(ctxIncome, {
      type: 'pie',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                return ctx.label + ': R$ ' + ctx.parsed.toFixed(2);
              }
            }
          }
        }
      }
    });
  }

  if (ctxExpense) {
    expenseChart = new Chart(ctxExpense, {
      type: 'pie',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                return ctx.label + ': R$ ' + ctx.parsed.toFixed(2);
              }
            }
          }
        }
      }
    });
  }

  updateCharts();
}

function updateCharts() {
  const filteredIncome = filterDataByPeriod(data.income);
  const filteredExpense = filterDataByPeriod(data.expense);
  
  if (incomeChart && filteredIncome && filteredIncome.length > 0) {
    const grouped = {};
    filteredIncome.forEach(function(item) {
      const name = item.name || 'Outros';
      const value = parseFloat(item.value || 0);
      grouped[name] = (grouped[name] || 0) + value;
    });
    const labels = Object.keys(grouped);
    const values = Object.values(grouped);
    const colors = generateColors(labels.length, '#1E88E5');
    
    incomeChart.data.labels = labels;
    incomeChart.data.datasets[0].data = values;
    incomeChart.data.datasets[0].backgroundColor = colors;
    incomeChart.update();
    
    // Atualizar legenda customizada
    updateCustomLegend('resumo-legenda-ganhos', labels, values, colors);
  } else if (incomeChart) {
    incomeChart.data.labels = ['Sem dados'];
    incomeChart.data.datasets[0].data = [1];
    incomeChart.data.datasets[0].backgroundColor = ['rgba(100,100,100,0.3)'];
    incomeChart.update();
    document.getElementById('resumo-legenda-ganhos').innerHTML = '<p style="color: #9CA3AF; text-align: center;">Nenhum ganho registrado</p>';
  }

  if (expenseChart && filteredExpense && filteredExpense.length > 0) {
    const grouped = {};
    filteredExpense.forEach(function(item) {
      const name = item.name || 'Outros';
      const value = parseFloat(item.value || 0);
      grouped[name] = (grouped[name] || 0) + value;
    });
    const labels = Object.keys(grouped);
    const values = Object.values(grouped);
    const colors = generateColors(labels.length, '#E57C23');
    
    expenseChart.data.labels = labels;
    expenseChart.data.datasets[0].data = values;
    expenseChart.data.datasets[0].backgroundColor = colors;
    expenseChart.update();
    
    // Atualizar legenda customizada
    updateCustomLegend('resumo-legenda-gastos', labels, values, colors);
  } else if (expenseChart) {
    expenseChart.data.labels = ['Sem dados'];
    expenseChart.data.datasets[0].data = [1];
    expenseChart.data.datasets[0].backgroundColor = ['rgba(100,100,100,0.3)'];
    expenseChart.update();
    document.getElementById('resumo-legenda-gastos').innerHTML = '<p style="color: #9CA3AF; text-align: center;">Nenhum gasto registrado</p>';
  }
}

// Criar legenda customizada
function updateCustomLegend(elementId, labels, values, colors) {
  const container = document.getElementById(elementId);
  container.innerHTML = '';
  
  labels.forEach(function(label, index) {
    const item = document.createElement('div');
    item.className = 'resumo-legenda-item';
    
    const cor = document.createElement('div');
    cor.className = 'resumo-legenda-cor';
    cor.style.backgroundColor = colors[index];
    
    const info = document.createElement('div');
    info.className = 'resumo-legenda-info';
    
    const nome = document.createElement('span');
    nome.className = 'resumo-legenda-nome';
    nome.textContent = label;
    
    const valor = document.createElement('span');
    valor.className = 'resumo-legenda-valor';
    valor.textContent = 'R$ ' + values[index].toFixed(2);
    
    info.appendChild(nome);
    info.appendChild(valor);
    
    item.appendChild(cor);
    item.appendChild(info);
    
    container.appendChild(item);
  });
}

function generateColors(count, baseColor) {
  if (baseColor === '#1E88E5') {
    return ['#63A9EF', '#4C9DEE', '#3792EA', '#2A8BE7', '#1E88E5', '#1C7ED4', '#1A75C2', '#176CB0', '#15639E', '#135A8C'].slice(0, count);
  } else if (baseColor === '#E57C23') {
    return ['#F4A04D', '#F29844', '#EF903A', '#EC872F', '#E57C23', '#D97320', '#CC6B1E', '#BF631C', '#B35B19', '#A65417'].slice(0, count);
  }
  const colors = [];
  const base = hexToRgb(baseColor);
  for (let i = 0; i < count; i++) {
    const factor = 0.7 + (i * 0.3 / count);
    colors.push('rgba(' + Math.floor(base.r * factor) + ',' + Math.floor(base.g * factor) + ',' + Math.floor(base.b * factor) + ',0.8)');
  }
  return colors;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function updateSummary() {
  const filteredIncome = filterDataByPeriod(data.income);
  const filteredExpense = filterDataByPeriod(data.expense);
  
  let totalIncome = 0;
  let totalExpense = 0;

  if (filteredIncome) {
    filteredIncome.forEach(function(item) {
      totalIncome += parseFloat(item.value || 0);
    });
  }

  if (filteredExpense) {
    filteredExpense.forEach(function(item) {
      totalExpense += parseFloat(item.value || 0);
    });
  }

  const balance = totalIncome - totalExpense;
  const incomeEl = document.getElementById('resumo-total-ganhos');
  const expenseEl = document.getElementById('resumo-total-gastos');
  const balanceEl = document.getElementById('resumo-total-saldo');

  if (incomeEl) incomeEl.textContent = 'R$ ' + totalIncome.toFixed(2);
  if (expenseEl) expenseEl.textContent = 'R$ ' + totalExpense.toFixed(2);
  if (balanceEl) {
    balanceEl.textContent = 'R$ ' + balance.toFixed(2);
    balanceEl.style.color = balance >= 0 ? '#10B981' : '#EF4444';
  }
}

// Atualizar período selecionado
function setPeriod(period) {
  currentPeriod = period;
  
  // Atualizar botões ativos
  document.querySelectorAll('.resumo-btn-periodo').forEach(function(btn) {
    btn.classList.remove('ativo');
  });
  document.getElementById('btn-periodo-' + period).classList.add('ativo');
  
  // Atualizar dados
  updateCharts();
  updateSummary();
}

// Atualizar resumo de datas (hoje, semana, mês, ano)
function updateDatesSummary() {
  const hoje = new Date();
  const hojeFmt = formatDateStr(hoje);
  
  // Calcular início da semana (domingo)
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  const inicioSemanaFmt = formatDateStr(inicioSemana);
  
  // Calcular início do mês
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioMesFmt = formatDateStr(inicioMes);
  
  // Calcular início do ano
  const inicioAno = new Date(hoje.getFullYear(), 0, 1);
  const inicioAnoFmt = formatDateStr(inicioAno);
  
  // Calcular valores para hoje
  const ganhosHoje = calcularTotal(data.income, hojeFmt, hojeFmt);
  const gastosHoje = calcularTotal(data.expense, hojeFmt, hojeFmt);
  const saldoHoje = ganhosHoje - gastosHoje;
  
  // Calcular valores para esta semana
  const ganhosSemana = calcularTotal(data.income, inicioSemanaFmt, hojeFmt);
  const gastosSemana = calcularTotal(data.expense, inicioSemanaFmt, hojeFmt);
  const saldoSemana = ganhosSemana - gastosSemana;
  
  // Calcular valores para este mês
  const ganhosMes = calcularTotal(data.income, inicioMesFmt, hojeFmt);
  const gastosMes = calcularTotal(data.expense, inicioMesFmt, hojeFmt);
  const saldoMes = ganhosMes - gastosMes;
  
  // Calcular valores para este ano
  const ganhosAno = calcularTotal(data.income, inicioAnoFmt, hojeFmt);
  const gastosAno = calcularTotal(data.expense, inicioAnoFmt, hojeFmt);
  const saldoAno = ganhosAno - gastosAno;
  
  // Atualizar DOM
  document.getElementById('data-ganho-hoje').textContent = 'R$ ' + ganhosHoje.toFixed(2);
  document.getElementById('data-gasto-hoje').textContent = 'R$ ' + gastosHoje.toFixed(2);
  document.getElementById('data-saldo-hoje').textContent = 'R$ ' + saldoHoje.toFixed(2);
  
  document.getElementById('data-ganho-semana').textContent = 'R$ ' + ganhosSemana.toFixed(2);
  document.getElementById('data-gasto-semana').textContent = 'R$ ' + gastosSemana.toFixed(2);
  document.getElementById('data-saldo-semana').textContent = 'R$ ' + saldoSemana.toFixed(2);
  
  document.getElementById('data-ganho-mes').textContent = 'R$ ' + ganhosMes.toFixed(2);
  document.getElementById('data-gasto-mes').textContent = 'R$ ' + gastosMes.toFixed(2);
  document.getElementById('data-saldo-mes').textContent = 'R$ ' + saldoMes.toFixed(2);
  
  document.getElementById('data-ganho-ano').textContent = 'R$ ' + ganhosAno.toFixed(2);
  document.getElementById('data-gasto-ano').textContent = 'R$ ' + gastosAno.toFixed(2);
  document.getElementById('data-saldo-ano').textContent = 'R$ ' + saldoAno.toFixed(2);
}

// Calcular total entre duas datas
function calcularTotal(items, dataInicio, dataFim) {
  if (!items || items.length === 0) return 0;
  
  let total = 0;
  items.forEach(function(item) {
    if (item.date >= dataInicio && item.date <= dataFim) {
      total += parseFloat(item.value || 0);
    }
  });
  
  return total;
}

window.addEventListener('DOMContentLoaded', function() {
  // Inicializar Firebase se disponível
  if (typeof firebase !== 'undefined' && window.firebaseConfig) {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(window.firebaseConfig);
      console.log('Firebase inicializado no resumo');
    }
    db = firebase.firestore();
    
    // Verificar autenticação
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        currentUser = user;
        loadData();
        initCharts();
      } else {
        window.location.href = 'login.html';
      }
    });
  } else {
    loadData();
    initCharts();
    updateSummary();
    updateDatesSummary();
  }
  
  // Event listeners para os botões de período
  document.getElementById('btn-periodo-dia').addEventListener('click', function() {
    setPeriod('dia');
  });
  
  document.getElementById('btn-periodo-mes').addEventListener('click', function() {
    setPeriod('mes');
  });
  
  document.getElementById('btn-periodo-ano').addEventListener('click', function() {
    setPeriod('ano');
  });
  
  // Botão de sair
  const btnSair = document.getElementById('resumo-btn-sair');
  if (btnSair) {
    btnSair.addEventListener('click', function() {
      console.log('Botão sair clicado');
      // Fazer logout do Firebase se estiver disponível
      if (typeof firebase !== 'undefined' && firebase.auth) {
        const auth = firebase.auth();
        auth.signOut().then(function() {
          console.log('Logout realizado com sucesso');
          window.location.href = 'login.html';
        }).catch(function(error) {
          console.error('Erro ao fazer logout:', error);
          window.location.href = 'login.html';
        });
      } else {
        console.log('Firebase não disponível, apenas redirecionando');
        window.location.href = 'login.html';
      }
    });
  }
});
