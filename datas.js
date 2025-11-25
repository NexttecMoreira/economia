// NextFlow - Calendário de Datas

let data = { income: [], expense: [] };
let currentDate = new Date();
let selectedDate = null;
let db = null;
let currentUser = null;

// Carregar dados
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
        renderCalendar();
        updateSummary();
        showMonthSummary();
      },
      function(erro) {
        console.error('Erro ao carregar do Firestore:', erro);
      }
    );
  }
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
    valorGanho.textContent = totalIncome.toFixed(2);
    cell.appendChild(valorGanho);
    
    // Sempre mostrar gastos (mesmo se for 0)
    const valorGasto = document.createElement('div');
    valorGasto.className = 'datas-dia-valor negativo';
    valorGasto.textContent = totalExpense.toFixed(2);
    cell.appendChild(valorGasto);
    
    // Sempre mostrar saldo
    const valorSaldo = document.createElement('div');
    valorSaldo.className = 'datas-dia-saldo';
    valorSaldo.className += saldo >= 0 ? ' positivo' : ' negativo';
    valorSaldo.textContent = Math.abs(saldo).toFixed(2);
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
  
  // Calcular totais do dia
  let totalIncome = 0;
  income.forEach(function(item) {
    totalIncome += parseFloat(item.value || 0);
  });
  
  let totalExpense = 0;
  expenses.forEach(function(item) {
    totalExpense += parseFloat(item.value || 0);
  });
  
  const saldo = totalIncome - totalExpense;
  
  if (income.length === 0 && expenses.length === 0) {
    lista.innerHTML = '<p style="color: #9CA3AF; text-align: center; padding: 2rem;">Nenhuma transação neste dia</p>';
  } else {
    // Resumo do dia
    const resumoDiv = document.createElement('div');
    resumoDiv.style.cssText = 'background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 10px; margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.1);';
    resumoDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <span style="color: #9CA3AF;">Ganhos:</span>
        <span style="color: #10B981; font-weight: 600;">+ R$ ${totalIncome.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <span style="color: #9CA3AF;">Gastos:</span>
        <span style="color: #EF4444; font-weight: 600;">- R$ ${totalExpense.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1);">
        <span style="color: #fff; font-weight: 600;">Saldo:</span>
        <span style="color: ${saldo >= 0 ? '#10B981' : '#EF4444'}; font-weight: 700; font-size: 1.1rem;">R$ ${saldo.toFixed(2)}</span>
      </div>
    `;
    lista.appendChild(resumoDiv);
    
    // Lista de ganhos
    if (income.length > 0) {
      const ganhosTitle = document.createElement('h3');
      ganhosTitle.style.cssText = 'color: #10B981; font-size: 0.9rem; margin: 1rem 0 0.5rem 0; text-transform: uppercase;';
      ganhosTitle.textContent = '💰 Ganhos';
      lista.appendChild(ganhosTitle);
      
      income.forEach(function(item) {
        const div = document.createElement('div');
        div.className = 'datas-item ganho';
        div.innerHTML = 
          '<div class="datas-item-nome">' + item.name + '</div>' +
          '<div class="datas-item-valor ganho">+ R$ ' + parseFloat(item.value).toFixed(2) + '</div>';
        lista.appendChild(div);
      });
    }
    
    // Lista de gastos
    if (expenses.length > 0) {
      const gastosTitle = document.createElement('h3');
      gastosTitle.style.cssText = 'color: #EF4444; font-size: 0.9rem; margin: 1rem 0 0.5rem 0; text-transform: uppercase;';
      gastosTitle.textContent = '💸 Gastos';
      lista.appendChild(gastosTitle);
      
      expenses.forEach(function(item) {
        const div = document.createElement('div');
        div.className = 'datas-item';
        div.innerHTML = 
          '<div class="datas-item-nome">' + item.name + '</div>' +
          '<div class="datas-item-valor gasto">- R$ ' + parseFloat(item.value).toFixed(2) + '</div>';
        lista.appendChild(div);
      });
    }
  }
  
  detalhes.className = 'datas-detalhes visivel';
}

// Calcular totais
function updateSummary() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let totalIncome = 0;
  let totalExpense = 0;
  
  // Calcular totais do mês
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDateStr(date);
    
    const income = getIncomeForDate(dateStr);
    const expenses = getExpensesForDate(dateStr);
    
    income.forEach(function(item) {
      totalIncome += parseFloat(item.value || 0);
    });
    
    expenses.forEach(function(item) {
      totalExpense += parseFloat(item.value || 0);
    });
  }
  
  const monthTotal = totalIncome - totalExpense;
  
  // Atualizar UI - Total do Mês
  const monthEl = document.getElementById('datas-total-mes');
  monthEl.textContent = 'R$ ' + monthTotal.toFixed(2);
  monthEl.style.color = monthTotal >= 0 ? '#10B981' : '#EF4444';
  
  // Atualizar UI - Ganhos do Mês
  const ganhosEl = document.getElementById('datas-ganhos-mes');
  ganhosEl.textContent = '+ R$ ' + totalIncome.toFixed(2);
  ganhosEl.style.color = '#10B981';
  
  // Atualizar UI - Gastos do Mês
  const gastosEl = document.getElementById('datas-gastos-mes');
  gastosEl.textContent = '- R$ ' + totalExpense.toFixed(2);
  gastosEl.style.color = '#EF4444';
}

// Mostrar resumo detalhado do mês
function showMonthSummary() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const conteudo = document.getElementById('datas-resumo-mes-conteudo');
  conteudo.innerHTML = '';
  
  // Coletar todos os ganhos e gastos do mês
  const monthIncome = [];
  const monthExpenses = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDateStr(date);
    
    const incomeDay = getIncomeForDate(dateStr);
    const expensesDay = getExpensesForDate(dateStr);
    
    incomeDay.forEach(function(item) {
      monthIncome.push({ ...item, date: dateStr });
    });
    
    expensesDay.forEach(function(item) {
      monthExpenses.push({ ...item, date: dateStr });
    });
  }
  
  // Calcular totais
  let totalIncome = 0;
  monthIncome.forEach(function(item) {
    totalIncome += parseFloat(item.value || 0);
  });
  
  let totalExpense = 0;
  monthExpenses.forEach(function(item) {
    totalExpense += parseFloat(item.value || 0);
  });
  
  const saldo = totalIncome - totalExpense;
  
  if (monthIncome.length === 0 && monthExpenses.length === 0) {
    conteudo.innerHTML = '<p style="color: #9CA3AF; text-align: center; padding: 2rem;">Nenhuma transação neste mês</p>';
    return;
  }
  
  // Resumo geral do mês
  const resumoDiv = document.createElement('div');
  resumoDiv.style.cssText = 'background: linear-gradient(145deg, #1e1e1e 0%, #2a2a2a 100%); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border: 2px solid #3a3a3a;';
  resumoDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
      <span style="color: #9CA3AF; font-size: 1rem;">💰 Total de Ganhos:</span>
      <span style="color: #10B981; font-weight: 700; font-size: 1.1rem;">+ R$ ${totalIncome.toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
      <span style="color: #9CA3AF; font-size: 1rem;">💸 Total de Gastos:</span>
      <span style="color: #EF4444; font-weight: 700; font-size: 1.1rem;">- R$ ${totalExpense.toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding-top: 0.75rem; border-top: 2px solid rgba(255,255,255,0.1);">
      <span style="color: #fff; font-weight: 700; font-size: 1.1rem;">💵 Saldo do Mês:</span>
      <span style="color: ${saldo >= 0 ? '#10B981' : '#EF4444'}; font-weight: 700; font-size: 1.3rem;">${saldo >= 0 ? '+' : ''} R$ ${saldo.toFixed(2)}</span>
    </div>
  `;
  conteudo.appendChild(resumoDiv);
  
  // Lista de ganhos do mês
  if (monthIncome.length > 0) {
    const ganhosTitle = document.createElement('h3');
    ganhosTitle.style.cssText = 'color: #10B981; font-size: 1rem; margin: 1.5rem 0 1rem 0; text-transform: uppercase; display: flex; align-items: center; gap: 0.5rem;';
    ganhosTitle.innerHTML = `💰 Ganhos do Mês <span style="color: #9CA3AF; font-size: 0.9rem; font-weight: normal;">(${monthIncome.length} itens)</span>`;
    conteudo.appendChild(ganhosTitle);
    
    // Ordenar por data
    monthIncome.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    
    monthIncome.forEach(function(item) {
      const div = document.createElement('div');
      div.className = 'datas-item ganho';
      const dateObj = new Date(item.date);
      const dateFormatted = dateObj.getDate() + '/' + (dateObj.getMonth() + 1);
      div.innerHTML = 
        '<div style="display: flex; flex-direction: column; gap: 0.25rem;">' +
          '<div class="datas-item-nome">' + item.name + '</div>' +
          '<div style="color: #9CA3AF; font-size: 0.85rem;">' + dateFormatted + '</div>' +
        '</div>' +
        '<div class="datas-item-valor ganho">+ R$ ' + parseFloat(item.value).toFixed(2) + '</div>';
      conteudo.appendChild(div);
    });
  }
  
  // Lista de gastos do mês
  if (monthExpenses.length > 0) {
    const gastosTitle = document.createElement('h3');
    gastosTitle.style.cssText = 'color: #EF4444; font-size: 1rem; margin: 1.5rem 0 1rem 0; text-transform: uppercase; display: flex; align-items: center; gap: 0.5rem;';
    gastosTitle.innerHTML = `💸 Gastos do Mês <span style="color: #9CA3AF; font-size: 0.9rem; font-weight: normal;">(${monthExpenses.length} itens)</span>`;
    conteudo.appendChild(gastosTitle);
    
    // Ordenar por data
    monthExpenses.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    
    monthExpenses.forEach(function(item) {
      const div = document.createElement('div');
      div.className = 'datas-item';
      const dateObj = new Date(item.date);
      const dateFormatted = dateObj.getDate() + '/' + (dateObj.getMonth() + 1);
      div.innerHTML = 
        '<div style="display: flex; flex-direction: column; gap: 0.25rem;">' +
          '<div class="datas-item-nome">' + item.name + '</div>' +
          '<div style="color: #9CA3AF; font-size: 0.85rem;">' + dateFormatted + '</div>' +
        '</div>' +
        '<div class="datas-item-valor gasto">- R$ ' + parseFloat(item.value).toFixed(2) + '</div>';
      conteudo.appendChild(div);
    });
  }
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
    showMonthSummary();
  });
  
  // Botão próximo mês
  document.getElementById('datas-btn-proximo').addEventListener('click', function() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
    updateSummary();
    showMonthSummary();
  });
  
  // Botão hoje
  document.getElementById('datas-btn-hoje').addEventListener('click', function() {
    currentDate = new Date();
    renderCalendar();
    updateSummary();
    showMonthSummary();
  });
});
