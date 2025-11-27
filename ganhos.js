// ganhos.js - Gerenciamento de ganhos

document.addEventListener('DOMContentLoaded', function() {
  let finances = { income: [], expense: [] };
  let db = null;
  let currentUser = null;

  // Elementos DOM
  const nomeInput = document.getElementById('ganho-nome');
  const valorInput = document.getElementById('ganho-valor');
  const adicionarBtn = document.getElementById('adicionar-ganho');
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
      firebase.auth().onAuthStateChanged(async function(user) {
        if (user) {
          currentUser = user;
          
          // Aguardar middleware carregar e verificar assinatura
          let attempts = 0;
          while (!window.protectPage && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          
          if (window.protectPage) {
            console.log('Chamando protectPage...');
            const hasAccess = await window.protectPage();
            if (!hasAccess) {
              console.log('Acesso negado, redirecionando...');
              return; // protectPage já redireciona
            }
            console.log('Acesso permitido, carregando dados...');
          } else {
            console.error('protectPage não disponível após timeout');
            alert('Erro ao verificar assinatura. Redirecionando...');
            window.location.href = 'pricing.html';
            return;
          }
          
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
        }
      );
    }
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

  // Renderizar lista de ganhos
  function renderizarLista() {
    listaGanhos.innerHTML = '';
    let total = 0;

    // Ordenar por data - mais recente primeiro
    const ganhosOrdenados = [...finances.income].sort((a, b) => {
      const dataA = new Date(a.date || '1970-01-01');
      const dataB = new Date(b.date || '1970-01-01');
      return dataB - dataA; // Ordem decrescente (mais recente primeiro)
    });
    
    ganhosOrdenados.forEach((ganho) => {
      // Encontrar o índice real no array original
      const realIndex = finances.income.findIndex(g => 
        g.name === ganho.name && 
        g.value === ganho.value && 
        g.date === ganho.date
      );
      
      total += parseFloat(ganho.value);

      const itemDiv = document.createElement('div');
      itemDiv.className = 'ganho-item';

      const infoDiv = document.createElement('div');
      infoDiv.className = 'ganho-item-info';

      const nomeSpan = document.createElement('span');
      nomeSpan.className = 'ganho-item-nome';
      nomeSpan.textContent = ganho.name;

      const valorSpan = document.createElement('span');
      valorSpan.className = 'ganho-item-valor';
      valorSpan.textContent = formatarReal(ganho.value);

      infoDiv.appendChild(nomeSpan);
      infoDiv.appendChild(valorSpan);

      const acoesDiv = document.createElement('div');
      acoesDiv.className = 'ganho-item-acoes';

      const dataSpan = document.createElement('span');
      dataSpan.className = 'ganho-item-data';
      if (ganho.date) {
        const partes = ganho.date.split('-');
        const dataFormatada = partes[2] + '/' + partes[1] + '/' + partes[0];
        dataSpan.textContent = dataFormatada;
      } else {
        dataSpan.textContent = 'Sem data';
      }

      const editarBtn = document.createElement('button');
      editarBtn.className = 'ganho-btn-editar';
      editarBtn.textContent = '✎';
      editarBtn.onclick = () => editarGanho(realIndex);

      const excluirBtn = document.createElement('button');
      excluirBtn.className = 'ganho-btn-excluir';
      excluirBtn.textContent = '✕';
      excluirBtn.onclick = () => excluirGanho(realIndex);

      acoesDiv.appendChild(dataSpan);
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

    // Agregar ganhos por nome (somar valores com mesmo nome)
    const dadosAgregados = {};
    finances.income.forEach(g => {
      const nome = g.name;
      const valor = parseFloat(g.value);
      if (dadosAgregados[nome]) {
        dadosAgregados[nome] += valor;
      } else {
        dadosAgregados[nome] = valor;
      }
    });

    // Converter para arrays
    const labels = Object.keys(dadosAgregados);
    const dados = Object.values(dadosAgregados);
    
    // Gerar cores aleatórias infinitas em tons de azul
    const cores = [];
    for (let i = 0; i < labels.length; i++) {
      const h = 200 + Math.random() * 20; // Azul: 200-220
      const s = 70 + Math.random() * 20;  // 70-90%
      const l = 45 + Math.random() * 25;  // 45-70%
      cores.push(`hsl(${h}, ${s}%, ${l}%)`);
    }

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
              display: false
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
          },
          layout: {
            padding: {
              right: 10
            }
          }
        }
      });
    }
    
    // Criar legenda customizada
    const legendaDiv = document.getElementById('ganhos-legenda');
    if (legendaDiv) {
      legendaDiv.innerHTML = '';
      labels.forEach((label, i) => {
        const item = document.createElement('div');
        item.className = 'ganhos-legenda-item';
        
        const cor = document.createElement('div');
        cor.className = 'ganhos-legenda-cor';
        cor.style.backgroundColor = cores[i];
        
        const texto = document.createElement('div');
        texto.className = 'ganhos-legenda-texto';
        texto.textContent = `${label}: R$ ${dados[i].toFixed(2)}`;
        
        item.appendChild(cor);
        item.appendChild(texto);
        legendaDiv.appendChild(item);
      });
    }
  }

  // Adicionar ou salvar ganho
  function adicionarGanho() {
    const nome = nomeInput.value.trim();
    const valor = parseFloat(valorInput.value);

    if (!nome || !valor || valor <= 0) {
      mostrarAlertaValidacao();
      return;
    }

    // Obter data atual no formato YYYY-MM-DD
    const hoje = new Date();
    const dataAtual = hoje.getFullYear() + '-' + 
                      String(hoje.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(hoje.getDate()).padStart(2, '0');

    // Adicionando novo ganho - usa data atual
    finances.income.push({
      name: nome,
      value: valor.toFixed(2),
      date: dataAtual
    });

    nomeInput.value = '';
    valorInput.value = '';
    salvarDados();
    renderizarLista();
    atualizarGrafico();
  }

  // Mostrar modal de alerta de validação
  function mostrarAlertaValidacao() {
    const modal = document.getElementById('modal-alerta-validacao');
    if (modal) modal.classList.add('ativo');
  }

  // Fechar modal de alerta de validação
  function fecharAlertaValidacao() {
    const modal = document.getElementById('modal-alerta-validacao');
    if (modal) modal.classList.remove('ativo');
  }

  // Editar ganho (abre modal de edição)
  let indexParaEditar = -1;
  function editarGanho(index) {
    const ganho = finances.income[index];
    if (!ganho) return;

    indexParaEditar = index;
    // Preencher campos do modal
    document.getElementById('modal-editar-nome').value = ganho.name || '';
    document.getElementById('modal-editar-valor').value = parseFloat(ganho.value || 0).toFixed(2);
    if (ganho.date) {
      document.getElementById('modal-editar-data').value = ganho.date;
    } else {
      document.getElementById('modal-editar-data').value = '';
    }

    // Mostrar modal de edição
    document.getElementById('modal-editar').classList.add('ativo');
  }

  // Excluir ganho - Abrir modal
  let indexParaExcluir = -1;
  
  function excluirGanho(index) {
    const ganho = finances.income[index];
    if (!ganho) return;
    
    indexParaExcluir = index;
    
    // Preencher informações no modal
    document.getElementById('modal-excluir-nome').textContent = ganho.name;
    document.getElementById('modal-excluir-valor-texto').textContent = 'R$ ' + parseFloat(ganho.value).toFixed(2);
    
    // Formatar data
    if (ganho.date) {
      const partes = ganho.date.split('-');
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
      finances.income.splice(indexParaExcluir, 1);
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
      mostrarAlertaValidacao();
      return;
    }

    // Normalizar valor e data
    valor = valor.toFixed(2);
    const dataStr = data ? data : (finances.income[indexParaEditar].date || null);

    finances.income[indexParaEditar] = {
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
  adicionarBtn.addEventListener('click', adicionarGanho);
  
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

  // Event listeners do modal de alerta de validação
  const btnAlertaValidacaoOk = document.getElementById('modal-alerta-validacao-ok');
  if (btnAlertaValidacaoOk) {
    btnAlertaValidacaoOk.addEventListener('click', fecharAlertaValidacao);
  }

  const modalAlertaValidacao = document.getElementById('modal-alerta-validacao');
  if (modalAlertaValidacao) {
    const overlayValidacao = modalAlertaValidacao.querySelector('.modal-alerta-overlay');
    if (overlayValidacao) {
      overlayValidacao.addEventListener('click', fecharAlertaValidacao);
    }
  }

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
