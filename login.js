document.addEventListener('DOMContentLoaded', function() {
  console.log('login.js loaded');
  console.log('🌐 User Agent:', navigator.userAgent);
  console.log('🍪 Cookies enabled:', navigator.cookieEnabled);

  // Initialize firebase app if not already (compat expects window.firebaseConfig)
  try {
    if (typeof firebase !== 'undefined' && window.firebaseConfig) {
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
        console.log('Firebase initialized in login page');
      }
    } else {
      console.warn('Firebase or firebaseConfig missing on login page');
    }
  } catch (err) {
    console.error('Error initializing firebase on login page', err);
  }

  const auth = (typeof firebase !== 'undefined') ? firebase.auth() : null;
  const emailInput = document.getElementById('auth-email');
  const passInput = document.getElementById('auth-password');
  const msg = document.getElementById('auth-message');

  function showMessage(text, isError) {
    if (msg) {
      msg.textContent = text;
      msg.style.color = isError ? '#EF4444' : '#10B981';
    }
  }

  document.getElementById('btn-login').addEventListener('click', async function() {
    const email = emailInput.value.trim();
    const password = passInput.value.trim();
    console.log('=== INÍCIO LOGIN ===');
    console.log('Email:', email);
    
    if (!email || !password) return showMessage('Preencha email e senha', true);
    if (!auth) {
      console.error('Auth não disponível');
      return showMessage('Serviço de autenticação indisponível', true);
    }
    
    try {
      showMessage('Entrando...', false);
      console.log('1. Definindo persistência e chamando signInWithEmailAndPassword...');

      // Forçar persistência local (important for Safari/3rd-party cookie issues)
      try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        console.log('Auth persistence set to LOCAL');
      } catch (pErr) {
        console.warn('Falha ao definir persistência (continuando):', pErr);
      }

      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      console.log('2. Login bem-sucedido!', userCredential.user.uid);
      // Force token refresh to ensure session is fully established before redirect
      try {
        await userCredential.user.getIdToken(true);
        console.log('ID token refreshed after sign-in');
      } catch (tErr) {
        console.warn('Falha ao refresh token (continuando):', tErr);
      }
      
      showMessage('Verificando assinatura...', false);
      console.log('3. Verificando assinatura...');
      
      // Limpar cache de assinatura antes de verificar
      if (window.clearSubscriptionCache) {
        window.clearSubscriptionCache();
      }
      
      // Verificar assinatura antes de redirecionar
      try {
        const functions = firebase.app().functions('southamerica-east1');
        const checkSubscription = functions.httpsCallable('checkSubscription');
        console.log('4. Chamando checkSubscription...');
        
        const result = await checkSubscription({ userId: userCredential.user.uid });
        console.log('5. Resultado da verificação:', result.data);
        
        if (result.data.hasAccess) {
          // Tem assinatura ativa - ir para o app
          console.log('6. Acesso PERMITIDO - indo para index.html');
          showMessage('Bem-vindo! Redirecionando...', false);
          
          // Aguardar um pouco mais para garantir que o Firebase Auth está sincronizado
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log('7. Executando window.location.href = index.html');
          console.log('7a. Location atual antes do redirect:', window.location.href);
          
          // Safari: usar replace ao invés de href para evitar que volte para login
          window.location.replace('index.html');
          
          console.log('7b. Replace executado (se você vê isso, o redirect falhou)');
        } else {
          // Não tem assinatura - ir para pricing
          console.log('6. Acesso NEGADO - indo para pricing.html');
          showMessage('Complete sua assinatura...', false);
          setTimeout(() => { 
            window.location.replace('pricing.html'); 
          }, 600);
        }
      } catch (err) {
        console.error('Erro ao verificar assinatura:', err);
        // Se der erro na verificação, mandar para pricing por segurança
        showMessage('Redirecionando...', false);
        setTimeout(() => { window.location.replace('pricing.html'); }, 600);
      }
    } catch (err) {
      console.error('login error', err);
      let errorMsg = 'Erro ao entrar: ';
      if (err.code === 'auth/user-not-found') {
        errorMsg = 'E-mail não encontrado. Faça seu cadastro primeiro.';
      } else if (err.code === 'auth/wrong-password') {
        errorMsg = 'Senha incorreta. Tente novamente ou clique em "Esqueci minha senha".';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'E-mail inválido.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'Muitas tentativas. Aguarde alguns minutos.';
      } else {
        errorMsg += (err.message || err);
      }
      showMessage(errorMsg, true);
    }
  });

  document.getElementById('btn-signup').addEventListener('click', async function() {
    const email = emailInput.value.trim();
    const password = passInput.value.trim();
    if (!email || !password) return showMessage('Preencha email e senha', true);
    if (!auth) return showMessage('Serviço de autenticação indisponível', true);
    try {
      showMessage('Cadastrando...', false);
      console.log('signup attempt', email);
      const res = await auth.createUserWithEmailAndPassword(email, password);
      console.log('signup success', res && res.user && res.user.uid);
      
      // Criar documento inicial no Firestore para o novo usuário
      if (res && res.user && firebase.firestore) {
        const db = firebase.firestore();
        const dadosIniciais = {
          income: [],
          expense: [],
          createdAt: new Date().toISOString(),
          email: email
        };
        
        await db.collection('users').doc(res.user.uid).set(dadosIniciais);
        console.log('Documento inicial criado no Firestore para', res.user.uid);
      }
      
      // Novo usuário sempre vai para pricing
      showMessage('Cadastro realizado! Escolha seu plano...', false);
      setTimeout(() => { window.location.replace('pricing.html'); }, 600);
    } catch (err) {
      console.error('signup error', err);
      let errorMsg = 'Erro ao cadastrar: ';
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'Este e-mail já está cadastrado. Use "Entrar" ou clique em "Esqueci minha senha".';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'Senha muito fraca. Use no mínimo 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'E-mail inválido.';
      } else {
        errorMsg += (err.message || err);
      }
      showMessage(errorMsg, true);
    }
  });

  // Se já está logado ao carregar a página, verificar assinatura e redirecionar
  if (auth) {
    auth.onAuthStateChanged(async user => {
      if (user) {
        console.log('User already logged in:', user.uid);
        console.log('Safari/onAuthStateChanged: Verificando se deve redirecionar...');
        
        // Só redirecionar se não houver atividade de login em curso
        // (evitar conflito com o botão de login)
        const isLoginInProgress = emailInput.value.trim() !== '' && passInput.value.trim() !== '';
        
        if (!isLoginInProgress) {
          console.log('Safari/onAuthStateChanged: Usuário já autenticado, verificando assinatura...');
          
          try {
            const functions = firebase.app().functions('southamerica-east1');
            const checkSubscription = functions.httpsCallable('checkSubscription');
            const result = await checkSubscription({ userId: user.uid });
            
            console.log('Safari/onAuthStateChanged: Resultado verificação:', result.data);
            
            if (result.data.hasAccess) {
              console.log('Safari/onAuthStateChanged: Tem acesso, redirecionando para index.html');
              window.location.replace('index.html');
            }
            // Se não tem acesso, deixa na página de login para escolher plano
          } catch (err) {
            console.error('Safari/onAuthStateChanged: Erro ao verificar assinatura:', err);
          }
        }
      }
    });
  }

});
