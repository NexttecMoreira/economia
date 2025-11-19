// NextFlow - Calendário de Datas

let data = { income: [], expense: [] };
let currentDate = new Date();
let selectedDate = null;
let db = null;
let currentUser = null;

// Carregar dados
function loadData() {
  if (db && currentUser) {
    db.collection('users').doc(currentUser.uid).get()
      .then(function(doc) {
        if (doc.exists) {
          data = doc.data() || { income: [], expense: [] };
          if (!data.income) data.income = [];
          if (!data.expense) data.expense = [];
        }
        renderCalendar();
        updateSummary();
      })
      .catch(function(erro) {
        console.error('Erro ao carregar do Firestore:', erro);
        loadFromLocalStorage();
      });
  } else {
    loadFromLocalStorage();
  }
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem('moneyMagnetData');
  if (saved) {
    data = JSON.parse(saved);
  }
  renderCalendar();
  updateSummary();
}

// Obter gastos de um dia específico
function getExpensesForDate(dateStr) {
  if (!data.expense) return [];
  return data.expense.filter(function(item) {
    return item.date === dateStr;
  });
}

// Obter ganhos de um dia específico
function getIncomeForDate(dateStr) {
  if (!data.income) return [];
  return data.income.filter(function(item) {
    return item.date === dateStr;
  });
}

// Calcular total do dia
function getTotalForDate(dateStr) {
  const expenses = getExpensesForDate(dateStr);
  const income = getIncomeForDate(dateStr);
  
  let totalExpense = 0;
  expenses.forEach(function(item) {
    totalExpense += parseFloat(item.value || 0);
  });
  
  let totalIncome = 0;
  income.forEach(function(item) {
    totalIncome += parseFloat(item.value || 0);
  });
  
  return totalIncome - totalExpense;
}

// Formatar data como YYYY-MM-DD
function formatDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

// Renderizar calendário
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Atualizar título
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  document.getElementById('datas-mes-ano').textContent = meses[month] + ' ' + year;
  
  // Primeiro e último dia do mês
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  // Limpar grid
  const grid = document.getElementById('datas-grid');
  grid.innerHTML = '';
  
  // Dias do mês anterior
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const cell = createDayCell(day, true);
    grid.appendChild(cell);
  }
  
  // Dias do mês atual
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDateStr(date);
    const isToday = date.toDateString() === today.toDateString();
    const total = getTotalForDate(dateStr);
    
    const cell = createDayCell(day, false, isToday, total, dateStr);
    grid.appendChild(cell);
  }
  
  // Dias do próximo mês
  const totalCells = grid.children.length;
  const remainingCells = 42 - totalCells; // 6 semanas * 7 dias
  for (let day = 1; day <= remainingCells; day++) {
    const cell = createDayCell(day, true);
    grid.appendChild(cell);
  }
}

// Criar célula de dia
function createDayCell(day, isOtherMonth, isToday, total, dateStr) {
  const cell = document.createElement('div');
  cell.className = 'datas-dia-celula';
  
  if (isOtherMonth) {
    cell.className += ' outro-mes';
  }
  if (isToday) {
    cell.className += ' hoje';
  }
  
  const numero = document.createElement('div');
  numero.className = 'datas-dia-numero';
  numero.textContent = day;
  cell.appendChild(numero);
  
  if (!isOtherMonth && dateStr) {
    // Calcular ganhos e gastos separadamente
    const income = getIncomeForDate(dateStr);
    const expenses = getExpensesForDate(dateStr);
    
    let totalIncome = 0;
    income.forEach(function(item) {
      totalIncome += parseFloat(item.value || 0);
    });
    
    let totalExpense = 0;
    expenses.forEach(function(item) {
      totalExpense += parseFloat(item.value || 0);
    });
    
    const saldo = totalIncome - totalExpense;
    
    // Sempre mostrar ganhos (mesmo se for 0)
    const valorGanho = document.createElement('div');
    valorGanho.className = 'datas-dia-valor positivo';
    valorGanho.textContent = '+R$ ' + totalIncome.toFixed(2);
    cell.appendChild(valorGanho);
    
    // Sempre mostrar gastos (mesmo se for 0)
    const valorGasto = document.createElement('div');
    valorGasto.className = 'datas-dia-valor negativo';
    valorGasto.textContent = '-R$ ' + totalExpense.toFixed(2);
    cell.appendChild(valorGasto);
    
    // Sempre mostrar saldo
    const valorSaldo = document.createElement('div');
    valorSaldo.className = 'datas-dia-saldo';
    valorSaldo.className += saldo >= 0 ? ' positivo' : ' negativo';
    valorSaldo.textContent = 'Saldo: R$ ' + Math.abs(saldo).toFixed(2);
    cell.appendChild(valorSaldo);
  }
  
  if (!isOtherMonth && dateStr) {
    cell.addEventListener('click', function() {
      selectedDate = dateStr;
      showDetails(dateStr);
      updateSelectedCell();
    });
  }
  
  return cell;
}

// Atualizar célula selecionada
function updateSelectedCell() {
  const cells = document.querySelectorAll('.datas-dia-celula');
  cells.forEach(function(cell) {
    cell.classList.remove('selecionado');
  });
}

// Mostrar detalhes do dia
function showDetails(dateStr) {
  const detalhes = document.getElementById('datas-detalhes');
  const dataEl = document.getElementById('datas-detalhes-data');
  const lista = document.getElementById('datas-detalhes-lista');
  
  // Formatar data
  const parts = dateStr.split('-');
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const formatted = date.getDate() + ' de ' + 
    ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][date.getMonth()] +
    ' de ' + date.getFullYear();
  
  dataEl.textContent = formatted;
  
  // Listar transações
  lista.innerHTML = '';
  
  const income = getIncomeForDate(dateStr);
  const expenses = getExpensesForDate(dateStr);
  
  if (income.length === 0 && expenses.length === 0) {
    lista.innerHTML = '<p style="color: #9CA3AF; text-align: center;">Nenhuma transação neste dia</p>';
  } else {
    income.forEach(function(item) {
      const div = document.createElement('div');
      div.className = 'datas-item ganho';
      div.innerHTML = 
        '<div class="datas-item-nome">' + item.name + '</div>' +
        '<div class="datas-item-valor ganho">+ R$ ' + parseFloat(item.value).toFixed(2) + '</div>';
      lista.appendChild(div);
    });
    
    expenses.forEach(function(item) {
      const div = document.createElement('div');
      div.className = 'datas-item';
      div.innerHTML = 
        '<div class="datas-item-nome">' + item.name + '</div>' +
        '<div class="datas-item-valor gasto">- R$ ' + parseFloat(item.value).toFixed(2) + '</div>';
      lista.appendChild(div);
    });
  }
  
  detalhes.className = 'datas-detalhes visivel';
}

// Calcular totais
function updateSummary() {
  const today = new Date();
  const todayStr = formatDateStr(today);
  
  // Total do dia
  const dayTotal = getTotalForDate(todayStr);
  const dayEl = document.getElementById('datas-total-dia');
  dayEl.textContent = 'R$ ' + Math.abs(dayTotal).toFixed(2);
  dayEl.style.color = dayTotal >= 0 ? '#1E88E5' : '#EF4444';
  
  // Total da semana
  let weekTotal = 0;
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - today.getDay() + i);
    weekTotal += getTotalForDate(formatDateStr(date));
  }
  const weekEl = document.getElementById('datas-total-semana');
  weekEl.textContent = 'R$ ' + Math.abs(weekTotal).toFixed(2);
  weekEl.style.color = weekTotal >= 0 ? '#1E88E5' : '#EF4444';
  
  // Total do mês
  let monthTotal = 0;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    monthTotal += getTotalForDate(formatDateStr(date));
  }
  const monthEl = document.getElementById('datas-total-mes');
  monthEl.textContent = 'R$ ' + Math.abs(monthTotal).toFixed(2);
  monthEl.style.color = monthTotal >= 0 ? '#1E88E5' : '#EF4444';
}

// Eventos
window.addEventListener('DOMContentLoaded', function() {
  // Inicializar Firebase se disponível
  if (typeof firebase !== 'undefined' && window.firebaseConfig) {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(window.firebaseConfig);
      console.log('Firebase inicializado no calendário');
    }
    db = firebase.firestore();
    
    // Verificar autenticação
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        currentUser = user;
        loadData();
      } else {
        window.location.href = 'login.html';
      }
    });
  } else {
    loadData();
  }
  
  // Botão voltar
  document.getElementById('datas-btn-voltar').addEventListener('click', function() {
    window.location.href = 'index.html';
  });
  
  // Botão mês anterior
  document.getElementById('datas-btn-anterior').addEventListener('click', function() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
    updateSummary();
  });
  
  // Botão próximo mês
  document.getElementById('datas-btn-proximo').addEventListener('click', function() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
    updateSummary();
  });
  
  // Botão hoje
  document.getElementById('datas-btn-hoje').addEventListener('click', function() {
    currentDate = new Date();
    renderCalendar();
    updateSummary();
  });
});
