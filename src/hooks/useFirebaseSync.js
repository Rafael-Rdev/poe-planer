import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, APP_ID, isFirebaseConfigured } from '../firebase';
import { INITIAL_ACTS } from '../data/actsData';

/**
 * Kapselt Firebase Auth + Firestore Sync.
 * Wenn Firebase nicht konfiguriert ist, arbeitet die App rein lokal.
 */
export function useFirebaseSync() {
  const [user, setUser] = useState(null);
  const [acts, setActs] = useState(INITIAL_ACTS);
  const [syncStatus, setSyncStatus] = useState('offline');

  // Auth initialisieren
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch {
        setSyncStatus('error');
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Firestore: Fortschritt laden & live synchronisieren
  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;

    const docRef = doc(
      db,
      'artifacts',
      APP_ID,
      'users',
      user.uid,
      'settings',
      'progress'
    );

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const savedData = docSnap.data().acts;
          if (savedData) {
            setActs((prev) =>
              prev.map((act) => ({
                ...act,
                done: savedData.find((s) => s.id === act.id)?.done ?? false,
              }))
            );
          }
        }
        setSyncStatus('synced');
      },
      () => setSyncStatus('error')
    );

    return () => unsubscribe();
  }, [user]);

  // Fortschritt in Firestore speichern
  const saveToFirebase = async (newActs) => {
    if (!user || !isFirebaseConfigured) return;
    setSyncStatus('loading');
    try {
      const docRef = doc(
        db,
        'artifacts',
        APP_ID,
        'users',
        user.uid,
        'settings',
        'progress'
      );
      await setDoc(docRef, {
        acts: newActs.map((a) => ({ id: a.id, done: a.done })),
        lastUpdated: Date.now(),
      });
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
  };

  const toggleAct = (id) => {
    const newActs = acts.map((act) =>
      act.id === id ? { ...act, done: !act.done } : act
    );
    setActs(newActs);
    saveToFirebase(newActs);
  };

  const resetProgress = () => {
    const newActs = acts.map((act) => ({ ...act, done: false }));
    setActs(newActs);
    saveToFirebase(newActs);
  };

  return { acts, toggleAct, resetProgress, syncStatus };
}
