import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

admin.initializeApp();

const ADMIN_EMAIL = 'silvaclodistribuidor@gmail.com';

export const notifyPendingDriver = functions.firestore
  .document('driversData/{uid}')
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    if (!after) return;

    const beforeStatus = before?.access?.status;
    const afterStatus = after?.access?.status;

    if (afterStatus !== 'pending' || beforeStatus === 'pending') return;
    if (!after?.access?.requestedAt) return;

    const tokensSnap = await admin
      .firestore()
      .collection('adminDevices')
      .where('enabled', '==', true)
      .where('adminEmail', '==', ADMIN_EMAIL)
      .get();

    if (tokensSnap.empty) return;

    const tokens = tokensSnap.docs.map(doc => doc.id);
    const email = after?.profile?.email || '';
    const phone = after?.profile?.phone || '';

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'Novo motorista aguardando liberação',
        body: `${email} • ${phone}`.trim(),
      },
      data: {
        url: '/?admin=1',
        uid: context.params.uid,
      },
    });

    const invalidTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code;
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    if (invalidTokens.length) {
      const batch = admin.firestore().batch();
      invalidTokens.forEach((token) => {
        batch.delete(admin.firestore().collection('adminDevices').doc(token));
      });
      await batch.commit();
    }
  });
