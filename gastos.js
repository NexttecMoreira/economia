// gastos.js - Gerenciamento de gastos

document.addEventListener('DOMContentLoaded', function() {
  let finances = { income: [], expense: [] };
  let db = null;
  let currentUser = null;

  // Elementos DOM
  const nomeInput = document.getElementById('gasto-nome');
  const valorInput = document.getElementById('gasto-valor');
  const botoesFormPagamento = document.querySelectorAll('.gastos-btn-pagamento');
  const adicionarBtn = document.getElementById('adicionar-gasto');
  const listaGastos = document.getElementById('lista-gastos');
  const totalGastos = document.getElementById('total-gastos');
  const canvasGrafico = document.getElementById('grafico-gastos');

  let graficoGastos = null;
  let pagamentoSelecionado = null;
  let parcelasSelecionadas = null;

  // Adicionar listeners para os botões de pagamento do formulário
  botoesFormPagamento.forEach(btn => {
    btn.addEventListener('click', function() {
      botoesFormPagamento.forEach(b => b.classList.remove('selecionado'));
      this.classList.add('selecionado');
      pagamentoSelecionado = this.dataset.pagamento;
      
      // Se selecionou Crédito, mostrar modal de parcelas
      if (pagamentoSelecionado === 'Crédito') {
        mostrarModalParcelas();
      } else {
        parcelasSelecionadas = null;
        atualizarBadgeParcelas(); // Limpar badge se não for crédito
      }
    });
  });

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

  // Renderizar lista de gastos
  function renderizarLista() {
    listaGastos.innerHTML = '';
    let total = 0;

    // Ordenar por data - mais recente primeiro
    const gastosOrdenados = [...finances.expense].sort((a, b) => {
      const dataA = new Date(a.date || '1970-01-01');
      const dataB = new Date(b.date || '1970-01-01');
      return dataB - dataA; // Ordem decrescente (mais recente primeiro)
    });
    
    gastosOrdenados.forEach((gasto) => {
      // Encontrar o índice real no array original
      const realIndex = finances.expense.findIndex(g => 
        g.name === gasto.name && 
        g.value === gasto.value && 
        g.date === gasto.date &&
        g.payment === gasto.payment
      );
      
      total += parseFloat(gasto.value);

      const itemDiv = document.createElement('div');
      itemDiv.className = 'gasto-item';

      const infoDiv = document.createElement('div');
      infoDiv.className = 'gasto-item-info';

      const nomeSpan = document.createElement('span');
      nomeSpan.className = 'gasto-item-nome';
      nomeSpan.textContent = gasto.name;

      const valorSpan = document.createElement('span');
      valorSpan.className = 'gasto-item-valor';
      valorSpan.textContent = formatarReal(gasto.value);

      infoDiv.appendChild(nomeSpan);

      // Adicionar forma de pagamento antes do valor, se existir
      if (gasto.payment) {
        const pagamentoSpan = document.createElement('span');
        pagamentoSpan.className = 'gasto-item-pagamento';
        
        // Se for crédito e tiver parcelas, mostrar com parcelas
        if (gasto.payment === 'Crédito' && gasto.installments) {
          pagamentoSpan.textContent = gasto.payment + ' ' + gasto.installments;
        } else {
          pagamentoSpan.textContent = gasto.payment;
        }
        
        infoDiv.appendChild(pagamentoSpan);
      }

      infoDiv.appendChild(valorSpan);

      const acoesDiv = document.createElement('div');
      acoesDiv.className = 'gasto-item-acoes';

      const dataSpan = document.createElement('span');
      dataSpan.className = 'gasto-item-data';
      if (gasto.date) {
        const partes = gasto.date.split('-');
        const dataFormatada = partes[2] + '/' + partes[1] + '/' + partes[0];
        dataSpan.textContent = dataFormatada;
      } else {
        dataSpan.textContent = 'Sem data';
      }

      const editarBtn = document.createElement('button');
      editarBtn.className = 'gasto-btn-editar';
      editarBtn.textContent = '✎';
      editarBtn.onclick = () => editarGasto(realIndex);

      const excluirBtn = document.createElement('button');
      excluirBtn.className = 'gasto-btn-excluir';
      excluirBtn.textContent = '✕';
      excluirBtn.onclick = () => excluirGasto(realIndex);

      acoesDiv.appendChild(dataSpan);
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

    // Agregar gastos por nome (somar valores com mesmo nome)
    const dadosAgregados = {};
    finances.expense.forEach(g => {
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
    
    // Gerar cores aleatórias infinitas em tons de laranja
    const cores = [];
    for (let i = 0; i < labels.length; i++) {
      const h = 20 + Math.random() * 20;  // Laranja: 20-40
      const s = 70 + Math.random() * 25;  // 70-95%
      const l = 45 + Math.random() * 25;  // 45-70%
      cores.push(`hsl(${h}, ${s}%, ${l}%)`);
    }

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
    const legendaDiv = document.getElementById('gastos-legenda');
    if (legendaDiv) {
      legendaDiv.innerHTML = '';
      labels.forEach((label, i) => {
        const item = document.createElement('div');
        item.className = 'gastos-legenda-item';
        
        const cor = document.createElement('div');
        cor.className = 'gastos-legenda-cor';
        cor.style.backgroundColor = cores[i];
        
        const texto = document.createElement('div');
        texto.className = 'gastos-legenda-texto';
        texto.textContent = `${label}: R$ ${dados[i].toFixed(2)}`;
        
        item.appendChild(cor);
        item.appendChild(texto);
        legendaDiv.appendChild(item);
      });
    }
  }

  // Adicionar ou salvar gasto
  function adicionarGasto() {
    const nome = nomeInput.value.trim();
    const valor = parseFloat(valorInput.value);
    const pagamento = pagamentoSelecionado;

    if (!nome || !valor || valor <= 0) {
      mostrarAlertaValidacao();
      return;
    }

    if (!pagamento) {
      mostrarAlertaPagamento();
      return;
    }

    // Obter data atual no formato YYYY-MM-DD
    const hoje = new Date();
    const dataAtual = hoje.getFullYear() + '-' + 
                      String(hoje.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(hoje.getDate()).padStart(2, '0');

    // Criar objeto do gasto
    const novoGasto = {
      name: nome,
      value: valor.toFixed(2),
      date: dataAtual,
      payment: pagamento
    };
    
    // Se for crédito e tiver parcelas, adicionar ao objeto
    if (pagamento === 'Crédito' && parcelasSelecionadas) {
      novoGasto.installments = parcelasSelecionadas;
    }

    // Adicionando novo gasto
    finances.expense.push(novoGasto);

    nomeInput.value = '';
    valorInput.value = '';
    pagamentoSelecionado = null;
    parcelasSelecionadas = null;
    botoesFormPagamento.forEach(b => b.classList.remove('selecionado'));
    atualizarBadgeParcelas(); // Limpar badge
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

  // Mostrar modal de alerta de pagamento
  function mostrarAlertaPagamento() {
    const modal = document.getElementById('modal-alerta-pagamento');
    if (modal) modal.classList.add('ativo');
  }

  // Fechar modal de alerta de pagamento
  function fecharAlertaPagamento() {
    const modal = document.getElementById('modal-alerta-pagamento');
    if (modal) modal.classList.remove('ativo');
  }

  // Mostrar modal de parcelas
  function mostrarModalParcelas() {
    const modal = document.getElementById('modal-parcelas');
    if (modal) {
      modal.classList.add('ativo');
      parcelasSelecionadas = null;
      
      // Limpar seleção anterior
      const botoesParcelas = modal.querySelectorAll('.modal-btn-parcela');
      botoesParcelas.forEach(b => b.classList.remove('selecionado'));
      
      // Esconder input customizado
      const customSection = document.getElementById('modal-parcelas-custom-section');
      if (customSection) customSection.style.display = 'none';
      
      const customInput = document.getElementById('modal-input-parcelas');
      if (customInput) customInput.value = '';
    }
  }

  // Fechar modal de parcelas
  function fecharModalParcelas() {
    const modal = document.getElementById('modal-parcelas');
    if (modal) modal.classList.remove('ativo');
  }

  // Mostrar modal de parcelas durante edição
  function mostrarModalParcelasParaEdicao() {
    const modal = document.getElementById('modal-parcelas');
    if (modal) {
      modal.classList.add('ativo');
      
      // Limpar seleção anterior
      const botoesParcelas = modal.querySelectorAll('.modal-btn-parcela');
      botoesParcelas.forEach(b => b.classList.remove('selecionado'));
      
      // Esconder input customizado
      const customSection = document.getElementById('modal-parcelas-custom-section');
      if (customSection) customSection.style.display = 'none';
      
      const customInput = document.getElementById('modal-input-parcelas');
      if (customInput) customInput.value = '';
    }
  }

  // Atualizar badge de parcelas no botão Crédito
  function atualizarBadgeParcelas() {
    const badge = document.getElementById('parcelas-badge');
    if (badge && parcelasSelecionadas) {
      badge.textContent = parcelasSelecionadas;
      badge.style.display = 'inline-block';
    } else if (badge) {
      badge.style.display = 'none';
    }
  }

  // Atualizar badge de parcelas no modal de edição
  function atualizarBadgeParcelasModal() {
    const badge = document.getElementById('modal-editar-parcelas-badge');
    if (badge && parcelasModalSelecionadas) {
      badge.textContent = parcelasModalSelecionadas;
      badge.style.display = 'inline-block';
    } else if (badge) {
      badge.style.display = 'none';
    }
  }

  // Editar gasto (abre modal de edição)
  let indexParaEditar = -1;
  let pagamentoModalSelecionado = null;
  let parcelasModalSelecionadas = null;
  
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
    
    // Selecionar botão de pagamento
    pagamentoModalSelecionado = gasto.payment || null;
    parcelasModalSelecionadas = gasto.installments || null;
    
    const botoesModal = document.querySelectorAll('.modal-btn-pagamento');
    botoesModal.forEach(btn => {
      if (btn.dataset.pagamento === pagamentoModalSelecionado) {
        btn.classList.add('selecionado');
      } else {
        btn.classList.remove('selecionado');
      }
    });
    
    // Mostrar/preencher campo de parcelas se for crédito
    const campoParcelas = document.getElementById('modal-editar-campo-parcelas');
    const inputParcelas = document.getElementById('modal-editar-parcelas-input');
    
    if (pagamentoModalSelecionado === 'Crédito') {
      if (campoParcelas) campoParcelas.style.display = 'block';
      if (inputParcelas) inputParcelas.value = parcelasModalSelecionadas || '';
    } else {
      if (campoParcelas) campoParcelas.style.display = 'none';
      if (inputParcelas) inputParcelas.value = '';
    }

    // Mostrar modal de edição
    document.getElementById('modal-editar').classList.add('ativo');
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

    // Forma de pagamento
    document.getElementById('modal-excluir-pagamento').textContent = gasto.payment || 'N/A';
    
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
    const pagamento = pagamentoModalSelecionado;

    if (!nome || isNaN(valor) || valor <= 0) {
      mostrarAlertaValidacao();
      return;
    }

    if (!pagamento) {
      mostrarAlertaPagamento();
      return;
    }

    // Normalizar valor e data
    valor = valor.toFixed(2);
    const dataStr = data ? data : (finances.expense[indexParaEditar].date || null);

    const gastoEditado = {
      name: nome,
      value: valor,
      date: dataStr,
      payment: pagamento
    };
    
    // Se for crédito, pegar parcelas do input
    if (pagamento === 'Crédito') {
      const inputParcelas = document.getElementById('modal-editar-parcelas-input');
      let parcelas = inputParcelas ? inputParcelas.value.trim() : '';
      
      // Adicionar 'x' se o usuário digitou apenas números
      if (parcelas && !parcelas.toLowerCase().includes('x')) {
        parcelas = parcelas + 'x';
      }
      
      if (parcelas) {
        gastoEditado.installments = parcelas;
      }
    }

    finances.expense[indexParaEditar] = gastoEditado;

    salvarDados();
    renderizarLista();
    atualizarGrafico();
    fecharModalEditar();
  }

  // Event listeners
  adicionarBtn.addEventListener('click', adicionarGasto);
  
  // Event listeners para botões de pagamento do modal (antigo - pode ser removido se não for usado)
  // const botoesModalPagamento = document.querySelectorAll('.modal-btn-pagamento');
  // botoesModalPagamento.forEach(btn => {
  //   btn.addEventListener('click', function() {
  //     botoesModalPagamento.forEach(b => b.classList.remove('selecionado'));
  //     this.classList.add('selecionado');
  //     pagamentoModalSelecionado = this.dataset.pagamento;
  //   });
  // });
  
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

  // Listeners para botões de pagamento no modal de edição
  const botoesModalPagamento = document.querySelectorAll('.modal-btn-pagamento');
  botoesModalPagamento.forEach(btn => {
    btn.addEventListener('click', function() {
      botoesModalPagamento.forEach(b => b.classList.remove('selecionado'));
      this.classList.add('selecionado');
      pagamentoModalSelecionado = this.dataset.pagamento;
      
      // Mostrar/esconder campo de parcelas
      const campoParcelas = document.getElementById('modal-editar-campo-parcelas');
      const inputParcelas = document.getElementById('modal-editar-parcelas-input');
      
      if (pagamentoModalSelecionado === 'Crédito') {
        if (campoParcelas) campoParcelas.style.display = 'block';
      } else {
        if (campoParcelas) campoParcelas.style.display = 'none';
        if (inputParcelas) inputParcelas.value = '';
        parcelasModalSelecionadas = null;
      }
    });
  });

  // Event listeners do modal de alerta de pagamento
  const btnAlertaOk = document.getElementById('modal-alerta-ok');
  if (btnAlertaOk) {
    btnAlertaOk.addEventListener('click', fecharAlertaPagamento);
  }

  const modalAlerta = document.getElementById('modal-alerta-pagamento');
  if (modalAlerta) {
    const overlayAlerta = modalAlerta.querySelector('.modal-alerta-overlay');
    if (overlayAlerta) {
      overlayAlerta.addEventListener('click', fecharAlertaPagamento);
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

  // Event listeners do modal de parcelas
  const btnFecharParcelas = document.getElementById('modal-parcelas-fechar');
  if (btnFecharParcelas) {
    btnFecharParcelas.addEventListener('click', fecharModalParcelas);
  }

  const botoesParcelas = document.querySelectorAll('.modal-btn-parcela');
  botoesParcelas.forEach(btn => {
    btn.addEventListener('click', function() {
      const valorParcela = this.dataset.parcela;
      
      // Verificar se estamos no modo de edição ou adição
      const modalEditarAberto = document.getElementById('modal-editar').classList.contains('ativo');
      
      if (modalEditarAberto) {
        parcelasModalSelecionadas = valorParcela;
        atualizarBadgeParcelasModal();
      } else {
        parcelasSelecionadas = valorParcela;
        atualizarBadgeParcelas();
      }
      
      fecharModalParcelas();
    });
  });

  const btnMaisParcelas = document.getElementById('modal-btn-mais-parcelas');
  if (btnMaisParcelas) {
    btnMaisParcelas.addEventListener('click', function() {
      const customSection = document.getElementById('modal-parcelas-custom-section');
      if (customSection) {
        customSection.style.display = customSection.style.display === 'none' ? 'flex' : 'none';
      }
    });
  }

  const btnConfirmarParcelas = document.getElementById('modal-btn-confirmar-parcelas');
  if (btnConfirmarParcelas) {
    btnConfirmarParcelas.addEventListener('click', function() {
      const input = document.getElementById('modal-input-parcelas');
      const valor = parseInt(input.value);
      
      if (valor && valor >= 1 && valor <= 99) {
        const valorParcela = valor + 'x';
        
        // Verificar se estamos no modo de edição ou adição
        const modalEditarAberto = document.getElementById('modal-editar').classList.contains('ativo');
        
        if (modalEditarAberto) {
          parcelasModalSelecionadas = valorParcela;
          atualizarBadgeParcelasModal();
        } else {
          parcelasSelecionadas = valorParcela;
          atualizarBadgeParcelas();
        }
        
        fecharModalParcelas();
      } else {
        alert('Digite um valor entre 1 e 99');
      }
    });
  }

  const modalParcelas = document.getElementById('modal-parcelas');
  if (modalParcelas) {
    const overlayParcelas = modalParcelas.querySelector('.modal-alerta-overlay');
    if (overlayParcelas) {
      overlayParcelas.addEventListener('click', fecharModalParcelas);
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
