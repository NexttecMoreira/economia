// gastos.js - Gerenciamento de gastos

document.addEventListener('DOMContentLoaded', function() {
  const STORAGE_KEY = 'moneyMagnetData';
  let finances = { income: [], expense: [] };
  let editingIndex = -1;
  let db = null;
  let currentUser = null;

  // Elementos DOM
  const nomeInput = document.getElementById('gasto-nome');
  const valorInput = document.getElementById('gasto-valor');
  const adicionarBtn = document.getElementById('adicionar-gasto');
  const cancelarBtn = document.getElementById('cancelar-edicao');
  const listaGastos = document.getElementById('lista-gastos');
  const totalGastos = document.getElementById('total-gastos');
  const canvasGrafico = document.getElementById('grafico-gastos');

  let graficoGastos = null;

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
    // Não usar mais localStorage - apenas Firestore
    console.warn('Firestore indisponível');
    renderizarLista();
    atualizarGrafico();
  }

  // Salvar dados APENAS no Firestore (sem localStorage)
  function salvarDados() {
    if (!db) {
      console.error('Firestore não inicializado');
      alert('Erro: Firestore não está disponível. Recarregue a página.');
      return;
    }
    
    if (!currentUser) {
      console.error('Usuário não autenticado');
      alert('Erro: Você não está logado. Faça login novamente.');
      window.location.href = 'login.html';
      return;
    }
    
    console.log('Salvando dados para usuário:', currentUser.uid);
    console.log('Dados a salvar:', finances);
    
    db.collection('users').doc(currentUser.uid).set(finances)
      .then(function() {
        console.log('✅ Dados salvos no Firestore com sucesso');
      })
      .catch(function(erro) {
        console.error('❌ Erro ao salvar no Firestore:', erro);
        console.error('Código do erro:', erro.code);
        console.error('Mensagem:', erro.message);
        
        if (erro.code === 'permission-denied') {
          alert('Erro: Você não tem permissão para salvar dados. Verifique as regras do Firestore.');
        } else if (erro.code === 'unavailable') {
          alert('Erro: Firestore indisponível. Verifique sua conexão com a internet.');
        } else {
          alert('Erro ao salvar dados: ' + erro.message);
        }
      });
  }

  // Formatar valor em reais
  function formatarReal(valor) {
    return 'R$ ' + Number(valor || 0).toFixed(2).replace('.', ',');
  }

  // Renderizar lista de gastos
  function renderizarLista() {
    listaGastos.innerHTML = '';
    let total = 0;

    // Inverter a ordem para mostrar os mais recentes primeiro
    const gastosRevertidos = [...finances.expense].reverse();
    
    gastosRevertidos.forEach((gasto, index) => {
      // Calcular o índice real no array original
      const realIndex = finances.expense.length - 1 - index;
      total += parseFloat(gasto.value);

      const itemDiv = document.createElement('div');
      itemDiv.className = 'gasto-item';

      const infoDiv = document.createElement('div');
      infoDiv.className = 'gasto-item-info';

      const nomeSpan = document.createElement('span');
      nomeSpan.className = 'gasto-item-nome';
      nomeSpan.textContent = gasto.name;

      const dataSpan = document.createElement('span');
      dataSpan.className = 'gasto-item-data';
      if (gasto.date) {
        const partes = gasto.date.split('-');
        const dataFormatada = partes[2] + '/' + partes[1] + '/' + partes[0];
        dataSpan.textContent = dataFormatada;
      } else {
        dataSpan.textContent = 'Sem data';
      }

      const valorSpan = document.createElement('span');
      valorSpan.className = 'gasto-item-valor';
      valorSpan.textContent = formatarReal(gasto.value);

      infoDiv.appendChild(nomeSpan);
      infoDiv.appendChild(dataSpan);
      infoDiv.appendChild(valorSpan);

      const acoesDiv = document.createElement('div');
      acoesDiv.className = 'gasto-item-acoes';

      const editarBtn = document.createElement('button');
      editarBtn.className = 'gasto-btn-editar';
      editarBtn.textContent = '✎';
      editarBtn.onclick = () => editarGasto(realIndex);

      const excluirBtn = document.createElement('button');
      excluirBtn.className = 'gasto-btn-excluir';
      excluirBtn.textContent = '✕';
      excluirBtn.onclick = () => excluirGasto(realIndex);

      acoesDiv.appendChild(editarBtn);
      acoesDiv.appendChild(excluirBtn);

      itemDiv.appendChild(infoDiv);
      itemDiv.appendChild(acoesDiv);

      listaGastos.appendChild(itemDiv);
    });

    totalGastos.textContent = 'Total: ' + formatarReal(total);
  }

  // Atualizar gráfico
  function atualizarGrafico() {
    if (!canvasGrafico) return;

    const labels = finances.expense.map(g => g.name);
    const dados = finances.expense.map(g => parseFloat(g.value));
    const cores = [
      '#F4A04D', '#F29844', '#EF903A', '#EC872F', 
      '#E57C23', '#D97320', '#CC6B1E', '#BF631C', 
      '#B35B19', '#A65417'
    ];

    if (graficoGastos) {
      graficoGastos.destroy();
    }

    if (typeof Chart !== 'undefined') {
      const ctx = canvasGrafico.getContext('2d');
      graficoGastos = new Chart(ctx, {
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

  // Adicionar ou salvar gasto
  function adicionarGasto() {
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
      // Editando gasto existente - mantém a data original
      finances.expense[editingIndex] = {
        name: nome,
        value: valor.toFixed(2),
        date: finances.expense[editingIndex].date || dataAtual
      };
      editingIndex = -1;
      adicionarBtn.textContent = 'Adicionar';
      cancelarBtn.style.display = 'none';
    } else {
      // Adicionando novo gasto - usa data atual
      finances.expense.push({
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

  // Editar gasto (abre modal de edição)
  let indexParaEditar = -1;
  function editarGasto(index) {
    const gasto = finances.expense[index];
    if (!gasto) return;

    indexParaEditar = index;
    // Preencher campos do modal
    document.getElementById('modal-editar-nome').value = gasto.name || '';
    document.getElementById('modal-editar-valor').value = parseFloat(gasto.value || 0).toFixed(2);
    if (gasto.date) {
      document.getElementById('modal-editar-data').value = gasto.date;
    } else {
      document.getElementById('modal-editar-data').value = '';
    }

    // Mostrar modal de edição
    document.getElementById('modal-editar').classList.add('ativo');
  }

  // Cancelar edição
  function cancelarEdicao() {
    nomeInput.value = '';
    valorInput.value = '';
    editingIndex = -1;
    adicionarBtn.textContent = 'Adicionar';
    cancelarBtn.style.display = 'none';
  }

  // Excluir gasto - Abrir modal
  let indexParaExcluir = -1;
  
  function excluirGasto(index) {
    const gasto = finances.expense[index];
    if (!gasto) return;
    
    indexParaExcluir = index;
    
    // Preencher informações no modal
    document.getElementById('modal-excluir-nome').textContent = gasto.name;
    document.getElementById('modal-excluir-valor-texto').textContent = 'R$ ' + parseFloat(gasto.value).toFixed(2);
    
    // Formatar data
    if (gasto.date) {
      const partes = gasto.date.split('-');
      const dataFormatada = partes[2] + '/' + partes[1] + '/' + partes[0];
      document.getElementById('modal-excluir-data').textContent = dataFormatada;
    } else {
      document.getElementById('modal-excluir-data').textContent = 'Sem data';
    }
    
    // Mostrar modal
    document.getElementById('modal-excluir').classList.add('ativo');
  }
  
  // Confirmar exclusão
  function confirmarExclusao() {
    if (indexParaExcluir >= 0) {
      finances.expense.splice(indexParaExcluir, 1);
      salvarDados();
      renderizarLista();
      atualizarGrafico();
      indexParaExcluir = -1;
    }
    fecharModal();
  }
  
  // Fechar modal
  function fecharModal() {
    document.getElementById('modal-excluir').classList.remove('ativo');
    indexParaExcluir = -1;
  }

  // Fechar modal de edição
  function fecharModalEditar() {
    const modal = document.getElementById('modal-editar');
    if (modal) modal.classList.remove('ativo');
    indexParaEditar = -1;
  }

  // Confirmar edição
  function confirmarEdicao() {
    if (indexParaEditar < 0) return fecharModalEditar();

    const nome = document.getElementById('modal-editar-nome').value.trim();
    let valor = parseFloat(document.getElementById('modal-editar-valor').value);
    const data = document.getElementById('modal-editar-data').value;

    if (!nome || isNaN(valor) || valor <= 0) {
      alert('Preencha nome e valor válidos');
      return;
    }

    // Normalizar valor e data
    valor = valor.toFixed(2);
    const dataStr = data ? data : (finances.expense[indexParaEditar].date || null);

    finances.expense[indexParaEditar] = {
      name: nome,
      value: valor,
      date: dataStr
    };

    salvarDados();
    renderizarLista();
    atualizarGrafico();
    fecharModalEditar();
  }

  // Event listeners
  adicionarBtn.addEventListener('click', adicionarGasto);
  cancelarBtn.addEventListener('click', cancelarEdicao);
  
  // Event listeners do modal de exclusão
  document.getElementById('modal-btn-excluir').addEventListener('click', confirmarExclusao);
  document.getElementById('modal-btn-cancelar').addEventListener('click', fecharModal);
  
  const modalExcluir = document.getElementById('modal-excluir');
  if (modalExcluir) {
    const overlayExcluir = modalExcluir.querySelector('.modal-excluir-overlay');
    if (overlayExcluir) {
      overlayExcluir.addEventListener('click', fecharModal);
    }
  }

  // Event listeners do modal de edição
  document.getElementById('modal-editar-salvar').addEventListener('click', confirmarEdicao);
  document.getElementById('modal-editar-cancelar').addEventListener('click', fecharModalEditar);
  
  const modalEditar = document.getElementById('modal-editar');
  if (modalEditar) {
    const overlayEditar = modalEditar.querySelector('.modal-excluir-overlay');
    if (overlayEditar) {
      overlayEditar.addEventListener('click', fecharModalEditar);
    }
  }

  // Permitir adicionar com Enter
  nomeInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') adicionarGasto();
  });
  valorInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') adicionarGasto();
  });

  // Inicializar
  initFirebase();
});
