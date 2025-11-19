document.addEventListener('DOMContentLoaded', function() {
  console.log('login.js loaded');

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
    if (!email || !password) return showMessage('Preencha email e senha', true);
    if (!auth) return showMessage('Serviço de autenticação indisponível', true);
    try {
      showMessage('Entrando...', false);
      console.log('login attempt', email);
      const res = await auth.signInWithEmailAndPassword(email, password);
      console.log('login success', res && res.user && res.user.uid);
      showMessage('Login realizado. Redirecionando...', false);
      // Redirect to app
      setTimeout(() => { window.location.href = 'index.html'; }, 600);
    } catch (err) {
      console.error('login error', err);
      showMessage('Erro ao entrar: ' + (err.message || err), true);
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
      
      showMessage('Cadastro realizado. Redirecionando...', false);
      setTimeout(() => { window.location.href = 'index.html'; }, 600);
    } catch (err) {
      console.error('signup error', err);
      showMessage('Erro ao cadastrar: ' + (err.message || err), true);
    }
  });

  // If already logged in, go to app
  if (auth) {
    auth.onAuthStateChanged(user => {
      if (user) {
        console.log('Already logged in, redirecting to app', user.uid);
        window.location.href = 'index.html';
      }
    });
  }
});
