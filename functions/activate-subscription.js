// Script para ativar assinatura manualmente
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function activateSubscription() {
  const userId = 'cqkSpOnpGmTZANfbU6PAI6tawSu1';
  
  console.log('Ativando assinatura para:', userId);
  
  // Criar dados de assinatura válidos
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias
  
  const subscriptionData = {
    stripeCustomerId: 'test_customer',
    stripeSubscriptionId: 'test_sub_' + Date.now(),
    status: 'trialing', // Status de trial
    currentPeriodStart: now,
    currentPeriodEnd: trialEnd,
    cancelAtPeriodEnd: false,
    trialEnd: trialEnd,
    planId: 'price_1SWj8IA6ujAHHqQDQuKmWiDV',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  await db.collection('users').doc(userId).set({
    subscription: subscriptionData
  }, { merge: true });
  
  console.log('✅ Assinatura ativada com sucesso!');
  console.log('Dados:', subscriptionData);
  
  // Verificar se foi salvo
  const doc = await db.collection('users').doc(userId).get();
  console.log('\nDados salvos no Firestore:');
  console.log(JSON.stringify(doc.data(), null, 2));
  
  process.exit(0);
}

activateSubscription().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
