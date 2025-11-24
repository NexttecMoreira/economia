document.addEventListener('DOMContentLoaded', function() {
  console.log('login.js loaded');

  try {
    if (typeof firebase !== 'undefined' && window.firebaseConfig) {
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
        console.log('Firebase initialized');
      }
    }
  } catch (err) {
    console.error('Error initializing firebase', err);
  }

  const auth = (typeof firebase !== 'undefined') ? firebase.auth() : null;
  
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  
  if (tabLogin && tabSignup && formLogin && formSignup) {
    tabLogin.addEventListener('click', function() {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      formLogin.style.display = 'flex';
      formSignup.style.display = 'none';
    });
    
    tabSignup.addEventListener('click', function() {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      formSignup.style.display = 'flex';
      formLogin.style.display = 'none';
    });
  }
  
  const loginEmailInput = document.getElementById('login-email');
  const loginPasswordInput = document.getElementById('login-password');
  const loginEmailValidation = document.getElementById('login-email-validation');
  const loginPasswordValidation = document.getElementById('login-password-validation');
  const loginMessage = document.getElementById('login-message');
  const btnLogin = document.getElementById('btn-login');
  const toggleLoginPassword = document.getElementById('toggle-login-password');
  
  const signupNameInput = document.getElementById('signup-name');
  const signupPhoneInput = document.getElementById('signup-phone');
  const signupEmailInput = document.getElementById('signup-email');
  const signupPasswordInput = document.getElementById('signup-password');
  const signupNameValidation = document.getElementById('signup-name-validation');
  const signupPhoneValidation = document.getElementById('signup-phone-validation');
  const signupEmailValidation = document.getElementById('signup-email-validation');
  const signupPasswordValidation = document.getElementById('signup-password-validation');
  const signupMessage = document.getElementById('signup-message');
  const btnSignup = document.getElementById('btn-signup');
  const toggleSignupPassword = document.getElementById('toggle-signup-password');
  
  if (toggleLoginPassword && loginPasswordInput) {
    toggleLoginPassword.addEventListener('click', function() {
      const type = loginPasswordInput.type === 'password' ? 'text' : 'password';
      loginPasswordInput.type = type;
      
      const eyeOpen = toggleLoginPassword.querySelector('.eye-open');
      const eyeClosed = toggleLoginPassword.querySelector('.eye-closed');
      
      if (type === 'password') {
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
      } else {
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
      }
    });
  }
  
  if (toggleSignupPassword && signupPasswordInput) {
    toggleSignupPassword.addEventListener('click', function() {
      const type = signupPasswordInput.type === 'password' ? 'text' : 'password';
      signupPasswordInput.type = type;
      
      const eyeOpen = toggleSignupPassword.querySelector('.eye-open');
      const eyeClosed = toggleSignupPassword.querySelector('.eye-closed');
      
      if (type === 'password') {
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
      } else {
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
      }
    });
  }
  
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  function validatePhone(phone) {
    return /^\(?[0-9]{2}\)?\s?[0-9]{4,5}-?[0-9]{4}$/.test(phone);
  }
  
  function showValidation(element, validationElement, isValid, validMessage, invalidMessage) {
    if (!element || !validationElement) return;
    
    if (isValid) {
      element.classList.remove('invalid');
      element.classList.add('valid');
      validationElement.innerHTML = '<span style="font-size: 1rem;">✓</span> ' + validMessage;
      validationElement.className = 'input-validation valid';
    } else {
      element.classList.remove('valid');
      element.classList.add('invalid');
      validationElement.innerHTML = '<span style="font-size: 1rem;">⚠</span> ' + invalidMessage;
      validationElement.className = 'input-validation invalid';
    }
  }
  
  function clearValidation(element, validationElement) {
    if (!element || !validationElement) return;
    element.classList.remove('valid', 'invalid');
    validationElement.textContent = '';
    validationElement.className = 'input-validation';
  }
  
  if (loginEmailInput) {
    loginEmailInput.addEventListener('input', function() {
      const email = loginEmailInput.value.trim();
      if (email === '') {
        clearValidation(loginEmailInput, loginEmailValidation);
      } else if (validateEmail(email)) {
        showValidation(loginEmailInput, loginEmailValidation, true, 'E-mail válido', '');
      } else {
        showValidation(loginEmailInput, loginEmailValidation, false, '', 'Formato de e-mail inválido');
      }
    });
  }
  
  if (loginPasswordInput) {
    loginPasswordInput.addEventListener('input', function() {
      const password = loginPasswordInput.value;
      if (password === '') {
        clearValidation(loginPasswordInput, loginPasswordValidation);
      } else if (password.length >= 6) {
        showValidation(loginPasswordInput, loginPasswordValidation, true, 'Senha válida', '');
      } else {
        showValidation(loginPasswordInput, loginPasswordValidation, false, '', 'Mínimo 6 caracteres');
      }
    });
  }
  
  if (signupNameInput) {
    signupNameInput.addEventListener('input', function() {
      const name = signupNameInput.value.trim();
      if (name === '') {
        clearValidation(signupNameInput, signupNameValidation);
      } else if (name.length >= 3) {
        showValidation(signupNameInput, signupNameValidation, true, 'Nome válido', '');
      } else {
        showValidation(signupNameInput, signupNameValidation, false, '', 'Nome muito curto');
      }
    });
  }
  
  if (signupPhoneInput) {
    signupPhoneInput.addEventListener('input', function() {
      let phone = signupPhoneInput.value.replace(/\D/g, '');
      if (phone.length > 11) phone = phone.slice(0, 11);
      
      if (phone.length >= 11) {
        phone = phone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
      } else if (phone.length >= 10) {
        phone = phone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
      } else if (phone.length >= 6) {
        phone = phone.replace(/^(\d{2})(\d{4})/, '($1) $2');
      } else if (phone.length >= 2) {
        phone = phone.replace(/^(\d{2})/, '($1) ');
      }
      
      signupPhoneInput.value = phone;
      
      if (phone === '') {
        clearValidation(signupPhoneInput, signupPhoneValidation);
      } else if (validatePhone(phone)) {
        showValidation(signupPhoneInput, signupPhoneValidation, true, 'Telefone válido', '');
      } else {
        showValidation(signupPhoneInput, signupPhoneValidation, false, '', 'Telefone inválido');
      }
    });
  }
  
  if (signupEmailInput) {
    signupEmailInput.addEventListener('input', function() {
      const email = signupEmailInput.value.trim();
      if (email === '') {
        clearValidation(signupEmailInput, signupEmailValidation);
      } else if (validateEmail(email)) {
        showValidation(signupEmailInput, signupEmailValidation, true, 'E-mail válido', '');
      } else {
        showValidation(signupEmailInput, signupEmailValidation, false, '', 'Formato de e-mail inválido');
      }
    });
  }
  
  if (signupPasswordInput) {
    signupPasswordInput.addEventListener('input', function() {
      const password = signupPasswordInput.value;
      if (password === '') {
        clearValidation(signupPasswordInput, signupPasswordValidation);
      } else if (password.length >= 6) {
        showValidation(signupPasswordInput, signupPasswordValidation, true, 'Senha forte e segura', '');
      } else {
        showValidation(signupPasswordInput, signupPasswordValidation, false, '', 'Precisa ter pelo menos 6 caracteres');
      }
    });
  }
  
  function showMessage(messageElement, text, isError) {
    if (messageElement) {
      messageElement.className = 'auth-message';
      
      if (isError) {
        messageElement.style.background = 'rgba(239, 68, 68, 0.1)';
        messageElement.style.color = '#EF4444';
        messageElement.style.borderLeft = '3px solid #EF4444';
        messageElement.innerHTML = '<span style="font-size: 1.2rem;">⚠️</span> ' + text;
      } else {
        messageElement.style.background = 'rgba(16, 185, 129, 0.1)';
        messageElement.style.color = '#10B981';
        messageElement.style.borderLeft = '3px solid #10B981';
        messageElement.innerHTML = '<span style="font-size: 1.2rem;">✓</span> ' + text;
      }
    }
  }
  
  function setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.classList.add('loading');
      button.disabled = true;
    } else {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  if (btnLogin) {
    btnLogin.addEventListener('click', async function() {
      const email = loginEmailInput.value.trim();
      const password = loginPasswordInput.value.trim();
      
      if (!email || !password) return showMessage(loginMessage, 'Preencha email e senha', true);
      if (!auth) return showMessage(loginMessage, 'Serviço indisponível', true);
      
      setButtonLoading(btnLogin, true);
      
      try {
        showMessage(loginMessage, 'Entrando...', false);
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        await userCredential.user.getIdToken(true);
        
        showMessage(loginMessage, 'Verificando assinatura...', false);
        
        if (window.clearSubscriptionCache) window.clearSubscriptionCache();
        
        const functions = firebase.app().functions('southamerica-east1');
        const checkSubscription = functions.httpsCallable('checkSubscription');
        const result = await checkSubscription({ userId: userCredential.user.uid });
        
        if (result.data.hasAccess) {
          showMessage(loginMessage, 'Bem-vindo! Redirecionando...', false);
          await new Promise(resolve => setTimeout(resolve, 1000));
          window.location.replace('index.html');
        } else {
          showMessage(loginMessage, 'Complete sua assinatura...', false);
          setTimeout(() => window.location.replace('pricing.html'), 600);
        }
      } catch (err) {
        let errorMsg = 'Não foi possível fazer login. Tente novamente.';
        if (err.code === 'auth/user-not-found') errorMsg = 'Usuário não encontrado. Crie sua conta!';
        else if (err.code === 'auth/wrong-password') errorMsg = 'Senha incorreta.';
        else if (err.code === 'auth/invalid-login-credentials') errorMsg = 'E-mail ou senha incorretos.';
        else if (err.code === 'auth/too-many-requests') errorMsg = 'Muitas tentativas. Aguarde alguns minutos.';
        
        showMessage(loginMessage, errorMsg, true);
        setButtonLoading(btnLogin, false);
      }
    });
  }

  if (btnSignup) {
    btnSignup.addEventListener('click', async function() {
      const name = signupNameInput.value.trim();
      const phone = signupPhoneInput.value.trim();
      const email = signupEmailInput.value.trim();
      const password = signupPasswordInput.value.trim();
      
      if (!name) return showMessage(signupMessage, 'Preencha seu nome', true);
      if (name.length < 3) return showMessage(signupMessage, 'Nome deve ter pelo menos 3 caracteres', true);
      if (!phone) return showMessage(signupMessage, 'Preencha seu telefone', true);
      if (!validatePhone(phone)) return showMessage(signupMessage, 'Telefone inválido', true);
      if (!email || !password) return showMessage(signupMessage, 'Preencha email e senha', true);
      if (!validateEmail(email)) return showMessage(signupMessage, 'E-mail inválido', true);
      if (password.length < 6) return showMessage(signupMessage, 'Senha deve ter pelo menos 6 caracteres', true);
      if (!auth) return showMessage(signupMessage, 'Serviço indisponível', true);
      
      setButtonLoading(btnSignup, true);
      
      try {
        showMessage(signupMessage, 'Cadastrando...', false);
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        const res = await auth.createUserWithEmailAndPassword(email, password);
        
        if (res && res.user && firebase.firestore) {
          const db = firebase.firestore();
          await db.collection('users').doc(res.user.uid).set({
            name: name,
            phone: phone,
            email: email,
            income: [],
            expense: [],
            createdAt: new Date().toISOString()
          });
        }
        
        showMessage(signupMessage, 'Conta criada com sucesso! Escolha seu plano...', false);
        setTimeout(() => window.location.replace('pricing.html'), 600);
      } catch (err) {
        let errorMsg = 'Não foi possível criar sua conta. Tente novamente.';
        if (err.code === 'auth/email-already-in-use') errorMsg = 'E-mail já cadastrado. Use a aba "Entrar".';
        else if (err.code === 'auth/weak-password') errorMsg = 'Senha precisa ter pelo menos 6 caracteres.';
        else if (err.code === 'auth/invalid-email') errorMsg = 'Formato do e-mail está incorreto.';
        
        showMessage(signupMessage, errorMsg, true);
        setButtonLoading(btnSignup, false);
      }
    });
  }

});
