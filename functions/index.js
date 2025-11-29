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
        price: 'price_1SWj8IA6ujAHHqQDQuKmWiDV',
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: 7,
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

    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'userId é obrigatório');
    }

    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId) {
      throw new functions.https.HttpsError('not-found', 'Cliente não encontrado');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://economia-5c8de.web.app/account.html',
    });

    return { url: session.url };
  } catch (error) {
    console.error('Erro ao criar portal:', error);
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
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    
    // Se está em trial, verificar trialEnd; senão verificar periodEnd
    let hasAccess = false;
    if (subscription.status === 'trialing' && trialEnd) {
      hasAccess = trialEnd > now;
    } else if (subscription.status === 'active' && periodEnd) {
      hasAccess = periodEnd > now;
    }

    console.log('Status da assinatura:', subscription.status);
    console.log('Está ativa/trial?', isActive);
    console.log('Período termina em:', periodEnd);
    console.log('Trial termina em:', trialEnd);
    console.log('Tem acesso?', hasAccess);
    console.log('=== checkSubscription finalizado ===');

    return {
      hasAccess,
      status: subscription.status,
      currentPeriodEnd: periodEnd,
      trialEnd: subscription.trialEnd?.toDate(),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
    };
  } catch (error) {
    console.error('❌ Erro ao verificar assinatura:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
