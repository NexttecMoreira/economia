// ganhos.js - Gerenciamento de ganhos

document.addEventListener('DOMContentLoaded', function() {
  const STORAGE_KEY = 'moneyMagnetData';
  let finances = { income: [], expense: [] };
  let editingIndex = -1;
  let db = null;
  let currentUser = null;

  // Elementos DOM
  const nomeInput = document.getElementById('ganho-nome');
  const valorInput = document.getElementById('ganho-valor');
  const adicionarBtn = document.getElementById('adicionar-ganho');
  const cancelarBtn = document.getElementById('cancelar-edicao');
  const listaGanhos = document.getElementById('lista-ganhos');
  const totalGanhos = document.getElementById('total-ganhos');
  const canvasGrafico = document.getElementById('grafico-ganhos');

  let graficoGanhos = null;

  // Inicializar Firebase
  function initFirebase() {
    if (typeof firebase !== 'undefined' && window.firebaseConfig) {
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
      }
      db = firebase.firestore();
      
      // Verificar autenticação
      firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
          currentUser = user;
          carregarDados();
        } else {
          window.location.href = 'login.html';
        }
      });
    } else {
      console.warn('Firebase não disponível, usando localStorage');
      carregarDados();
    }
  }

  // Carregar dados do Firestore ou localStorage
  function carregarDados() {
    if (db && currentUser) {
      // Usar onSnapshot para sincronização em tempo real
      db.collection('users').doc(currentUser.uid).onSnapshot(
        function(doc) {
          if (doc.exists) {
            finances = doc.data() || { income: [], expense: [] };
            if (!finances.income) finances.income = [];
            if (!finances.expense) finances.expense = [];
          }
          renderizarLista();
          atualizarGrafico();
        },
        function(erro) {
          console.error('Erro ao carregar do Firestore:', erro);
          carregarDoLocalStorage();
        }
      );
    } else {
      carregarDoLocalStorage();
    }
  }
  
  function carregarDoLocalStorage() {
    try {
      const dados = localStorage.getItem(STORAGE_KEY);
      if (dados) {
        finances = JSON.parse(dados);
      }
      renderizarLista();
      atualizarGrafico();
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro);
    }
  }

  // Salvar dados no Firestore e localStorage
  function salvarDados() {
    // Sempre salvar no localStorage como backup
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finances));
    } catch (erro) {
      console.error('Erro ao salvar no localStorage:', erro);
    }
    
    // Salvar no Firestore se disponível
    if (db && currentUser) {
      db.collection('users').doc(currentUser.uid).set(finances)
        .then(function() {
          console.log('Dados salvos no Firestore');
        })
        .catch(function(erro) {
          console.error('Erro ao salvar no Firestore:', erro);
        });
    }
  }

  // Formatar valor em reais
  function formatarReal(valor) {
    return 'R$ ' + Number(valor || 0).toFixed(2).replace('.', ',');
  }

  // Renderizar lista de ganhos
  function renderizarLista() {
    listaGanhos.innerHTML = '';
    let total = 0;

    // Inverter a ordem para mostrar os mais recentes primeiro
    const ganhosRevertidos = [...finances.income].reverse();
    
    ganhosRevertidos.forEach((ganho, index) => {
      // Calcular o índice real no array original
      const realIndex = finances.income.length - 1 - index;
      total += parseFloat(ganho.value);

      const itemDiv = document.createElement('div');
      itemDiv.className = 'ganho-item';

      const infoDiv = document.createElement('div');
      infoDiv.className = 'ganho-item-info';

      const nomeSpan = document.createElement('span');
      nomeSpan.className = 'ganho-item-nome';
      nomeSpan.textContent = ganho.name;

      const dataSpan = document.createElement('span');
      dataSpan.className = 'ganho-item-data';
      if (ganho.date) {
        const partes = ganho.date.split('-');
        const dataFormatada = partes[2] + '/' + partes[1] + '/' + partes[0];
        dataSpan.textContent = dataFormatada;
      } else {
        dataSpan.textContent = 'Sem data';
      }

      const valorSpan = document.createElement('span');
      valorSpan.className = 'ganho-item-valor';
      valorSpan.textContent = formatarReal(ganho.value);

      infoDiv.appendChild(nomeSpan);
      infoDiv.appendChild(dataSpan);
      infoDiv.appendChild(valorSpan);

      const acoesDiv = document.createElement('div');
      acoesDiv.className = 'ganho-item-acoes';

      const editarBtn = document.createElement('button');
      editarBtn.className = 'ganho-btn-editar';
      editarBtn.textContent = '✏️';
      editarBtn.onclick = () => editarGanho(realIndex);

      const excluirBtn = document.createElement('button');
      excluirBtn.className = 'ganho-btn-excluir';
      excluirBtn.textContent = '🗑️';
      excluirBtn.onclick = () => excluirGanho(realIndex);

      acoesDiv.appendChild(editarBtn);
      acoesDiv.appendChild(excluirBtn);

      itemDiv.appendChild(infoDiv);
      itemDiv.appendChild(acoesDiv);

      listaGanhos.appendChild(itemDiv);
    });

    totalGanhos.textContent = 'Total: ' + formatarReal(total);
  }

  // Atualizar gráfico
  function atualizarGrafico() {
    if (!canvasGrafico) return;

    const labels = finances.income.map(g => g.name);
    const dados = finances.income.map(g => parseFloat(g.value));
    const cores = [
      '#63A9EF', '#4C9DEE', '#3792EA', '#2A8BE7',
      '#1E88E5', '#1C7ED4', '#1A75C2', '#176CB0',
      '#15639E', '#135A8C'
    ];

    if (graficoGanhos) {
      graficoGanhos.destroy();
    }

    if (typeof Chart !== 'undefined') {
      const ctx = canvasGrafico.getContext('2d');
      graficoGanhos = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: dados,
            backgroundColor: cores,
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
    }
  }

  // Adicionar ou salvar ganho
  function adicionarGanho() {
    const nome = nomeInput.value.trim();
    const valor = parseFloat(valorInput.value);

    if (!nome || !valor || valor <= 0) {
      alert('Por favor, preencha o nome e um valor válido');
      return;
    }

    // Obter data atual no formato YYYY-MM-DD
    const hoje = new Date();
    const dataAtual = hoje.getFullYear() + '-' + 
                      String(hoje.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(hoje.getDate()).padStart(2, '0');

    if (editingIndex >= 0) {
      // Editando ganho existente - mantém a data original
      finances.income[editingIndex] = {
        name: nome,
        value: valor.toFixed(2),
        date: finances.income[editingIndex].date || dataAtual
      };
      editingIndex = -1;
      adicionarBtn.textContent = 'Adicionar';
      cancelarBtn.style.display = 'none';
    } else {
      // Adicionando novo ganho - usa data atual
      finances.income.push({
        name: nome,
        value: valor.toFixed(2),
        date: dataAtual
      });
    }

    nomeInput.value = '';
    valorInput.value = '';
    salvarDados();
    renderizarLista();
    atualizarGrafico();
  }

  // Editar ganho
  function editarGanho(index) {
    const ganho = finances.income[index];
    if (!ganho) return;

    nomeInput.value = ganho.name;
    valorInput.value = ganho.value;
    editingIndex = index;
    adicionarBtn.textContent = 'Salvar';
    cancelarBtn.style.display = 'inline-flex';
  }

  // Cancelar edição
  function cancelarEdicao() {
    nomeInput.value = '';
    valorInput.value = '';
    editingIndex = -1;
    adicionarBtn.textContent = 'Adicionar';
    cancelarBtn.style.display = 'none';
  }

  // Excluir ganho
  function excluirGanho(index) {
    if (confirm('Deseja realmente excluir este ganho?')) {
      finances.income.splice(index, 1);
      salvarDados();
      renderizarLista();
      atualizarGrafico();
    }
  }

  // Event listeners
  adicionarBtn.addEventListener('click', adicionarGanho);
  cancelarBtn.addEventListener('click', cancelarEdicao);

  // Permitir adicionar com Enter
  nomeInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') adicionarGanho();
  });
  valorInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') adicionarGanho();
  });

  // Inicializar
  initFirebase();
});
