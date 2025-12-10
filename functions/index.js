const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe.secret_key);

admin.initializeApp();

// Criar sessão de checkout do Stripe usando onCall (CORS automático)
exports.createCheckoutSession = functions
  .region('southamerica-east1')
  .https.onCall(async (data, context) => {
  try {
    const { userId, email } = data;

    if (!userId || !email) {
      throw new functions.https.HttpsError('invalid-argument', 'userId e email são obrigatórios');
    }

    // Verificar se já existe um customerId no Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    let customerId = userDoc.data()?.stripeCustomerId;

    // Se existe customerId, verificar se ele ainda existe no Stripe
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        console.log('✅ Customer existente válido:', customerId);
      } catch (error) {
        console.log('⚠️ Erro ao buscar customer:', error.type, error.code, error.message);
        // Stripe retorna erro quando customer não existe
        if (error.type === 'StripeInvalidRequestError' || error.code === 'resource_missing' || error.message.includes('No such customer')) {
          console.log('🗑️ Customer não existe mais no Stripe, será recriado');
          customerId = null; // Resetar para criar novo
          
          // Limpar o customerId inválido do Firestore
          await admin.firestore().collection('users').doc(userId).update({
            stripeCustomerId: admin.firestore.FieldValue.delete()
          });
        } else {
          throw error;
        }
      }
    }

    // Se não existe, verificar se já existe customer no Stripe com este email (EVITA DUPLICAÇÃO)
    if (!customerId) {
      console.log('Buscando customer existente por email:', email);
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        // Reutilizar customer existente
        customerId = existingCustomers.data[0].id;
        console.log('✅ Customer existente encontrado:', customerId);
        
        // Atualizar metadata com o firebaseUID correto
        await stripe.customers.update(customerId, {
          metadata: {
            firebaseUID: userId
          }
        });
      } else {
        // Criar novo customer apenas se não existir
        const customer = await stripe.customers.create({
          email: email,
          metadata: {
            firebaseUID: userId
          }
        });
        customerId = customer.id;
        console.log('✅ Novo customer criado:', customerId);
      }

      // Salvar customerId no Firestore
      await admin.firestore().collection('users').doc(userId).set({
        stripeCustomerId: customerId,
        email: email
      }, { merge: true });
    }

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: 'price_1SYmo1A6ujAHHqQDp808x7Gz', // R$ 6,99/mês
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: 7,  // 7 dias de trial
      },
      success_url: 'https://economia-5c8de.web.app/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://economia-5c8de.web.app/pricing.html',
      metadata: {
        firebaseUID: userId
      }
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Criar portal de gerenciamento de assinatura
exports.createPortalSession = functions
  .region('southamerica-east1')
  .https.onCall(async (data, context) => {
  try {
    const { userId } = data;

    console.log('🔧 createPortalSession iniciado para userId:', userId);

    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'userId é obrigatório');
    }

    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    let customerId = userDoc.data()?.stripeCustomerId;

    console.log('📋 CustomerId encontrado no Firestore:', customerId);

    if (!customerId) {
      throw new functions.https.HttpsError('not-found', 'Você precisa de uma assinatura ativa para gerenciar.');
    }

    // Verificar se o customer ainda existe no Stripe
    try {
      console.log('🔍 Verificando se customer existe no Stripe...');
      await stripe.customers.retrieve(customerId);
      console.log('✅ Customer válido para portal:', customerId);
    } catch (retrieveError) {
      console.log('⚠️ Erro ao buscar customer:', retrieveError.type, retrieveError.code, retrieveError.message);
      
      // Se customer não existe, retornar erro amigável
      if (retrieveError.type === 'StripeInvalidRequestError' || 
          retrieveError.code === 'resource_missing' || 
          retrieveError.message?.includes('No such customer')) {
        
        console.error('❌ Customer não existe no Stripe:', customerId);
        console.log('🗑️ Limpando customerId inválido do Firestore...');
        
        // Limpar o customerId inválido do Firestore
        await admin.firestore().collection('users').doc(userId).update({
          stripeCustomerId: admin.firestore.FieldValue.delete()
        });
        
        console.log('✅ CustomerId removido do Firestore');
        
        throw new functions.https.HttpsError(
          'not-found', 
          'Sua assinatura anterior foi removida. Por favor, crie uma nova assinatura na página de preços.'
        );
      } else {
        // Outro tipo de erro, re-lançar
        throw new functions.https.HttpsError('internal', `Erro ao verificar customer: ${retrieveError.message}`);
      }
    }

    console.log('🔐 Criando sessão do billing portal...');
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://economia-5c8de.web.app/index.html',
    });

    console.log('✅ Sessão criada com sucesso:', session.id);
    return { url: session.url };
    
  } catch (error) {
    console.error('❌ Erro em createPortalSession:', error);
    
    // Se já é um HttpsError, re-lançar como está
    if (error.code && error.code.startsWith('functions/')) {
      throw error;
    }
    
    // Outros erros, encapsular
    throw new functions.https.HttpsError('internal', error.message || 'Erro desconhecido ao criar portal');
  }
});

// Cancelar assinatura (Admin)
exports.cancelSubscription = functions
  .region('southamerica-east1')
  .https.onCall(async (data, context) => {
  try {
    const { userId } = data;

    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'userId é obrigatório');
    }

    // Buscar dados do usuário
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Usuário não encontrado');
    }

    const userData = userDoc.data();
    const subscriptionId = userData?.subscription?.stripeSubscriptionId;

    if (!subscriptionId) {
      throw new functions.https.HttpsError('not-found', 'Assinatura não encontrada');
    }

    // Cancelar assinatura no Stripe
    const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);
    console.log('✅ Assinatura cancelada:', canceledSubscription.id);

    // Atualizar no Firestore
    await admin.firestore().collection('users').doc(userId).set({
      subscription: {
        status: 'canceled',
        canceledAt: admin.firestore.FieldValue.serverTimestamp()
      }
    }, { merge: true });

    return { success: true, message: 'Assinatura cancelada com sucesso' };
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Deletar usuário completamente (Admin)
exports.deleteUser = functions
  .region('southamerica-east1')
  .https.onCall(async (data, context) => {
  try {
    const { userId } = data;

    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'userId é obrigatório');
    }

    // Buscar dados do usuário
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Usuário não encontrado');
    }

    const userData = userDoc.data();
    
    // 1. Cancelar assinatura no Stripe se existir
    const subscriptionId = userData?.subscription?.stripeSubscriptionId;
    if (subscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscriptionId);
        console.log('✅ Assinatura cancelada no Stripe:', subscriptionId);
      } catch (error) {
        console.warn('Assinatura já cancelada ou não existe:', error.message);
      }
    }

    // 2. Deletar customer do Stripe se existir
    const customerId = userData?.stripeCustomerId;
    if (customerId) {
      try {
        await stripe.customers.del(customerId);
        console.log('✅ Customer deletado no Stripe:', customerId);
      } catch (error) {
        console.warn('Customer já deletado ou não existe:', error.message);
      }
    }

    // 3. Deletar subcoleção de payments se existir
    const paymentsSnapshot = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('payments')
      .get();
    
    const deletePayments = [];
    paymentsSnapshot.forEach(doc => {
      deletePayments.push(doc.ref.delete());
    });
    await Promise.all(deletePayments);
    console.log('✅ Pagamentos deletados:', deletePayments.length);

    // 4. Deletar documento do usuário no Firestore
    await admin.firestore().collection('users').doc(userId).delete();
    console.log('✅ Usuário deletado do Firestore:', userId);

    // 5. Deletar usuário do Firebase Auth
    try {
      await admin.auth().deleteUser(userId);
      console.log('✅ Usuário deletado do Auth:', userId);
    } catch (error) {
      console.warn('Usuário já deletado do Auth ou não existe:', error.message);
    }

    return { success: true, message: 'Usuário removido completamente' };
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Webhook para receber eventos do Stripe
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = functions.config().stripe.webhook_secret;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Funções auxiliares para processar eventos

async function handleSubscriptionUpdate(subscription) {
  try {
    const customerId = subscription.customer;
    console.log('Processando subscription update para customer:', customerId);
    
    const customer = await stripe.customers.retrieve(customerId);
    const userId = customer.metadata.firebaseUID;

    if (!userId) {
      console.error('firebaseUID não encontrado no customer metadata');
      return;
    }

    console.log('UserId encontrado:', userId);

    // Garantir que todos os valores existem antes de salvar
    const subscriptionData = {
      stripeCustomerId: customerId || '',
      stripeSubscriptionId: subscription.id || '',
      status: subscription.status || 'unknown',
      currentPeriodStart: subscription.current_period_start 
        ? new Date(subscription.current_period_start * 1000) 
        : new Date(),
      currentPeriodEnd: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000) 
        : new Date(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
      trialEnd: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000) 
        : null,
      planId: (subscription.items && subscription.items.data && subscription.items.data[0]) 
        ? subscription.items.data[0].price.id 
        : '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    console.log('Salvando dados no Firestore:', subscriptionData);

    await admin.firestore().collection('users').doc(userId).set({
      subscription: subscriptionData
    }, { merge: true });

    console.log(`✅ Assinatura atualizada com sucesso para usuário ${userId}`);
  } catch (error) {
    console.error('❌ Erro em handleSubscriptionUpdate:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata.firebaseUID;

  if (!userId) return;

  await admin.firestore().collection('users').doc(userId).set({
    subscription: {
      status: 'canceled',
      canceledAt: admin.firestore.FieldValue.serverTimestamp()
    }
  }, { merge: true });

  console.log(`Assinatura cancelada para usuário ${userId}`);
}

async function handlePaymentSucceeded(invoice) {
  try {
    const customerId = invoice.customer;
    console.log('Processando pagamento bem-sucedido para customer:', customerId);
    
    const customer = await stripe.customers.retrieve(customerId);
    const userId = customer.metadata.firebaseUID;

    if (!userId) {
      console.error('firebaseUID não encontrado no customer metadata');
      return;
    }

    console.log('Registrando pagamento para userId:', userId);

    // Se tem subscriptionId, atualizar a subscription também
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      await handleSubscriptionUpdate(subscription);
    }

    // Registrar pagamento no histórico
    const paymentData = {
      invoiceId: invoice.id || '',
      amount: invoice.amount_paid ? (invoice.amount_paid / 100) : 0,
      currency: invoice.currency || 'brl',
      status: 'succeeded',
      paidAt: invoice.status_transitions && invoice.status_transitions.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('payments')
      .add(paymentData);

    console.log(`✅ Pagamento registrado com sucesso para usuário ${userId}`);
  } catch (error) {
    console.error('❌ Erro em handlePaymentSucceeded:', error);
    throw error;
  }
}

async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata.firebaseUID;

  if (!userId) return;

  // Registrar falha de pagamento
  await admin.firestore().collection('users').doc(userId).collection('payments').add({
    invoiceId: invoice.id,
    amount: invoice.amount_due / 100,
    currency: invoice.currency,
    status: 'failed',
    attemptedAt: new Date(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`Falha de pagamento para usuário ${userId}`);
}

// Função para ativar assinatura manualmente (TEMPORÁRIA - para testes)
exports.activateTestSubscription = functions
  .region('southamerica-east1')
  .https.onCall(async (data, context) => {
  try {
    const { userId } = data;

    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'userId é obrigatório');
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const subscriptionData = {
      stripeCustomerId: 'test_customer',
      stripeSubscriptionId: 'test_sub_' + Date.now(),
      status: 'trialing',
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      cancelAtPeriodEnd: false,
      trialEnd: trialEnd,
      planId: 'price_1SWj8IA6ujAHHqQDQuKmWiDV',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await admin.firestore().collection('users').doc(userId).set({
      subscription: subscriptionData
    }, { merge: true });

    console.log('✅ Assinatura de teste ativada para:', userId);

    return { success: true, message: 'Assinatura ativada com sucesso!' };
  } catch (error) {
    console.error('Erro ao ativar assinatura:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Verificar status de assinatura
exports.checkSubscription = functions
  .region('southamerica-east1')
  .https.onCall(async (data, context) => {
  try {
    const { userId } = data;

    console.log('=== checkSubscription iniciado ===');
    console.log('userId recebido:', userId);

    if (!userId) {
      console.error('❌ userId não fornecido');
      throw new functions.https.HttpsError('invalid-argument', 'userId é obrigatório');
    }

    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    console.log('Documento do usuário existe?', userDoc.exists);
    
    if (!userDoc.exists) {
      console.log('⚠️ Usuário não tem documento no Firestore');
      return { hasAccess: false, status: 'no_subscription' };
    }

    const userData = userDoc.data();
    const subscription = userData?.subscription;

    console.log('Dados da subscription:', subscription ? 'Existe' : 'Não existe');
    
    if (!subscription) {
      console.log('❌ Nenhuma assinatura encontrada');
      return { hasAccess: false, status: 'no_subscription' };
    }

    const now = new Date();
    const periodEnd = subscription.currentPeriodEnd?.toDate();
    const trialEnd = subscription.trialEnd?.toDate();
    const status = subscription.status;
    
    console.log('Status da assinatura:', status);
    console.log('Período termina em:', periodEnd);
    console.log('Trial termina em:', trialEnd);
    console.log('Data/hora atual:', now);
    
    // Verificar se tem acesso
    let hasAccess = false;
    let reason = '';
    
    // Dar acesso se:
    // 1. Status é 'active' e período ainda é válido
    // 2. Status é 'trialing' e trial ainda é válido
    // 3. Status é 'past_due' mas período ainda não expirou (pagamento pendente)
    // 4. Status é 'active' mesmo sem periodEnd (assumir que é válido)
    // 5. Status é 'trialing' mesmo sem trialEnd (assumir que é válido)
    
    if (status === 'active') {
      if (periodEnd && periodEnd > now) {
        hasAccess = true;
        reason = 'active_and_valid';
      } else if (!periodEnd) {
        // Se não tem periodEnd mas está active, considerar válido
        hasAccess = true;
        reason = 'active_no_period_end';
      } else {
        hasAccess = false;
        reason = 'active_but_expired';
      }
    } else if (status === 'trialing') {
      if (trialEnd && trialEnd > now) {
        hasAccess = true;
        reason = 'trialing_and_valid';
      } else if (!trialEnd) {
        // Se não tem trialEnd mas está trialing, considerar válido
        hasAccess = true;
        reason = 'trialing_no_end_date';
      } else {
        // Trial expirou mas pode estar esperando cobrar
        hasAccess = true;
        reason = 'trialing_but_waiting_charge';
      }
    } else if (status === 'past_due') {
      // Pagamento pendente mas período ainda válido
      if (periodEnd && periodEnd > now) {
        hasAccess = true;
        reason = 'past_due_but_period_valid';
      } else {
        hasAccess = false;
        reason = 'past_due_and_expired';
      }
    } else if (status === 'incomplete') {
      // Assinatura incompleta, não dar acesso
      hasAccess = false;
      reason = 'incomplete_subscription';
    } else if (status === 'canceled') {
      // Cancelada definitivamente
      hasAccess = false;
      reason = 'canceled';
    } else {
      hasAccess = false;
      reason = 'unknown_status_' + status;
    }
    
    console.log('Tem acesso?', hasAccess);
    console.log('Razão:', reason);
    console.log('=== checkSubscription finalizado ===');

    return {
      hasAccess,
      status: status,
      currentPeriodEnd: periodEnd,
      trialEnd: trialEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      reason: reason
    };
  } catch (error) {
    console.error('❌ Erro ao verificar assinatura:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
