// Middleware para verificar se o usuário tem acesso (assinatura ativa)

let subscriptionCheckCache = null;
let cacheExpiry = 0;

async function checkSubscriptionAccess(user, forceRefresh = false) {
  if (!user) {
    return { hasAccess: false, reason: 'not_authenticated' };
  }

  // Usar cache se ainda válido (5 minutos)
  const now = Date.now();
  if (!forceRefresh && subscriptionCheckCache && now < cacheExpiry) {
    console.log('Usando cache de verificação de assinatura');
    return subscriptionCheckCache;
  }

  try {
    console.log('Verificando assinatura no servidor para:', user.uid);
    const functions = firebase.app().functions('southamerica-east1');
    const checkSubscription = functions.httpsCallable('checkSubscription');
    const result = await checkSubscription({ userId: user.uid });
    
    console.log('Status de assinatura:', result.data);
    
    // Salvar no cache
    subscriptionCheckCache = result.data;
    cacheExpiry = now + (5 * 60 * 1000); // 5 minutos
    
    return result.data;
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error);
    // Em caso de erro, bloquear acesso por segurança
    return { hasAccess: false, reason: 'error', error: error.message };
  }
}

function redirectToPricing(reason) {
  const messages = {
    'no_subscription': 'Você precisa assinar para acessar esta funcionalidade. Comece seu teste grátis de 7 dias!',
    'subscription_expired': 'Sua assinatura expirou. Renove para continuar usando.',
    'subscription_canceled': 'Sua assinatura foi cancelada.',
    'not_authenticated': 'Você precisa fazer login primeiro.',
    'error': 'Erro ao verificar assinatura. Por favor, tente novamente.'
  };

  const message = messages[reason] || 'Você precisa de uma assinatura ativa para acessar o app.';
  
  console.log('Redirecionando para pricing:', reason);
  alert(message);
  window.location.href = 'pricing.html';
}

// Função principal para proteger páginas
async function protectPage() {
  console.log('🔒 Iniciando verificação de acesso...');
  
  return new Promise((resolve) => {
    // Safari: aguardar até 3 segundos para o auth state estabilizar
    let attempts = 0;
    const maxAttempts = 15; // 15 x 200ms = 3 segundos
    
    const checkAuth = () => {
      const user = firebase.auth().currentUser;
      attempts++;
      
      console.log(`🔍 Tentativa ${attempts}/${maxAttempts} - currentUser:`, user ? user.uid : 'null');
      
      if (user) {
        // Usuário detectado, verificar assinatura
        console.log('👤 Usuário autenticado:', user.email);
        
        checkSubscriptionAccess(user)
          .then((accessData) => {
            console.log('📊 Resultado da verificação:', accessData);

            if (!accessData.hasAccess) {
              console.log('🚫 Acesso negado:', accessData.status || accessData.reason);
              redirectToPricing(accessData.status || accessData.reason || 'no_subscription');
              resolve(false);
              return;
            }

            console.log('✅ Acesso permitido - Status:', accessData.status);
            resolve(true);
          })
          .catch((error) => {
            console.error('❌ Erro ao verificar acesso:', error);
            redirectToPricing('error');
            resolve(false);
          });
      } else if (attempts >= maxAttempts) {
        // Timeout: nenhum usuário detectado após 3 segundos
        console.log('⏱️ Timeout: usuário não detectado, redirecionando para login');
        window.location.href = 'login.html';
        resolve(false);
      } else {
        // Tentar novamente em 200ms
        setTimeout(checkAuth, 200);
      }
    };
    
    checkAuth();
  });
}

// Exportar para uso global
window.checkSubscriptionAccess = checkSubscriptionAccess;
window.protectPage = protectPage;
window.clearSubscriptionCache = () => {
  subscriptionCheckCache = null;
  cacheExpiry = 0;
};

console.log('✅ Subscription middleware carregado');
