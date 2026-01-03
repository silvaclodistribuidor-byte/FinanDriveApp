import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { DRIVERS_COLLECTION } from '../services/firestoreService';
import { db } from '../firebaseConfig';
import { AdminPushSetup } from './AdminPushSetup';

interface PendingDriver {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  requestedAt?: Date | null;
  needsFix?: boolean;
}

const formatDateTime = (value?: Date | null) => {
  if (!value) return '-';
  return value.toLocaleString('pt-BR');
};

interface AdminPanelProps {
  adminEmail: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ adminEmail }) => {
  const [pendingDrivers, setPendingDrivers] = useState<PendingDriver[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, DRIVERS_COLLECTION),
      where('access.status', '==', 'pending'),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs.map(docSnap => {
          const data = docSnap.data() as any;
          const rawRequestedAt = data?.access?.requestedAt;
          const requestedAt = rawRequestedAt?.toDate ? rawRequestedAt.toDate() : null;
          return {
            id: docSnap.id,
            name: data?.profile?.name,
            email: data?.profile?.email,
            phone: data?.profile?.phone,
            requestedAt,
            needsFix: Boolean(rawRequestedAt && !rawRequestedAt?.toDate),
          };
        }).sort((a, b) => {
          const aTime = a.requestedAt?.getTime() ?? 0;
          const bTime = b.requestedAt?.getTime() ?? 0;
          return bTime - aTime;
        });
        setPendingDrivers(next);
        setErrorMessage(null);
      },
      (error) => {
        console.error('AdminPanel onSnapshot error:', error);
        setPendingDrivers([]);
        setErrorMessage(`${error.code || 'erro'}: ${error.message || 'Não foi possível carregar os pendentes.'}`);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleApprove = async (id: string) => {
    await updateDoc(doc(db, DRIVERS_COLLECTION, id), {
      'access.status': 'approved',
      'access.approvedAt': serverTimestamp(),
    });
  };

  const handleReject = async (driver: PendingDriver) => {
    const confirmed = window.confirm(
      'Recusar este motorista? Isso apagará os dados e bloqueará novos pedidos desse usuário.'
    );
    if (!confirmed) return;

    const batch = writeBatch(db);
    batch.set(doc(db, 'blockedUsers', driver.id), {
      uid: driver.id,
      email: driver.email || '',
      phone: driver.phone || '',
      reason: 'Recusado pelo admin',
      blockedAt: serverTimestamp(),
    }, { merge: true });
    batch.delete(doc(db, 'driversData', driver.id));
    batch.delete(doc(db, 'drivers', driver.id));
    batch.delete(doc(db, 'userData', driver.id));
    batch.delete(doc(db, 'users', driver.id));
    await batch.commit();
    setErrorMessage('Pedido recusado e dados removidos.');
  };

  const handleFixPending = async () => {
    const toFix = pendingDrivers.filter(driver => driver.needsFix);
    if (toFix.length === 0) return;
    await Promise.all(toFix.map(driver =>
      updateDoc(doc(db, DRIVERS_COLLECTION, driver.id), {
        'access.requestedAt': serverTimestamp(),
      })
    ));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AdminPushSetup adminEmail={adminEmail} />

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Pendentes de aprovação</h2>
            <p className="text-xs text-slate-500">Total: {pendingDrivers.length}</p>
          </div>
          <button
            type="button"
            onClick={handleFixPending}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Corrigir pendentes
          </button>
        </div>
        {errorMessage && (
          <div className="mb-3 text-xs text-rose-500">{errorMessage}</div>
        )}
        <div className="space-y-3">
          {pendingDrivers.length === 0 && (
            <div className="text-sm text-slate-500">Nenhum motorista pendente no momento.</div>
          )}
          {pendingDrivers.map(driver => (
            <div key={driver.id} className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-800">{driver.name || 'Sem nome'}</div>
                <div className="text-xs text-slate-500">{driver.email || '-'}</div>
                <div className="text-xs text-slate-500">{driver.phone || '-'}</div>
                <div className="text-[11px] text-slate-400">Solicitado em {formatDateTime(driver.requestedAt)}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleApprove(driver.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500"
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(driver)}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-500"
                >
                  Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
