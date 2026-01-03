import React, { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app, db } from '../firebaseConfig';

interface AdminPushSetupProps {
  adminEmail: string;
}

export const AdminPushSetup: React.FC<AdminPushSetupProps> = ({ adminEmail }) => {
  const [status, setStatus] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setStatus('');
    setLoading(true);
    try {
      const supported = await isSupported();
      if (!supported) {
        setStatus('Notificações não suportadas neste dispositivo.');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setStatus('Permissão negada para notificações.');
        return;
      }
      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const messaging = getMessaging(app);
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
      if (!vapidKey) {
        setStatus('VAPID key não configurada.');
        return;
      }
      const fcmToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
      if (!fcmToken) {
        setStatus('Não foi possível gerar o token de notificação.');
        return;
      }
      await setDoc(doc(db, 'adminDevices', fcmToken), {
        token: fcmToken,
        adminEmail,
        enabled: true,
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
      }, { merge: true });
      setToken(fcmToken);
      setStatus('Notificações ativadas com sucesso.');
    } catch (err) {
      console.error('Erro ao ativar notificações:', err);
      setStatus('Falha ao ativar notificações.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!token) {
      setStatus('Nenhum token ativo para desativar.');
      return;
    }
    setLoading(true);
    try {
      await setDoc(doc(db, 'adminDevices', token), {
        token,
        adminEmail,
        enabled: false,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setStatus('Notificações desativadas.');
    } catch (err) {
      console.error('Erro ao desativar notificações:', err);
      setStatus('Falha ao desativar notificações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div>
        <h3 className="font-semibold text-slate-800">Notificações do Admin</h3>
        <p className="text-xs text-slate-500">Receba alertas quando novos motoristas aguardarem liberação.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleEnable}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-70"
        >
          Ativar notificações
        </button>
        <button
          type="button"
          onClick={handleDisable}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-70"
        >
          Desativar notificações
        </button>
      </div>
      {status && <div className="text-xs text-slate-500">{status}</div>}
    </div>
  );
};
