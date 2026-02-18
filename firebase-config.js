// ============================================================
// FIREBASE CONFIGURATION
// Replace the placeholder values below with your Firebase project config.
// You can find these in: Firebase Console → Project Settings → Your apps → Config
// ============================================================

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// --- Firebase initialization ---
let db = null;
let storage = null;
let firebaseReady = false;

function initFirebase() {
  try {
    if (FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
      console.warn('Firebase not configured. Using localStorage fallback.');
      return false;
    }
    firebase.initializeApp(FIREBASE_CONFIG);
    // Sign in anonymously so Firestore rules can allow authenticated users
    firebase.auth().signInAnonymously().catch(function(err) {
      console.warn('Anonymous auth failed:', err.message);
    });
    db = firebase.firestore();
    storage = firebase.storage();
    firebaseReady = true;
    console.log('Firebase connected successfully.');
    return true;
  } catch (e) {
    console.warn('Firebase init failed:', e.message);
    return false;
  }
}

// --- Fallback: localStorage wrapper that mimics simple Firestore ops ---
const localDB = {
  getCollection(name) {
    return JSON.parse(localStorage.getItem('gk_' + name) || '[]');
  },
  saveCollection(name, data) {
    localStorage.setItem('gk_' + name, JSON.stringify(data));
  },
  async getAll(collection) {
    if (firebaseReady) {
      const snap = await db.collection(collection).orderBy('createdAt', 'desc').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return this.getCollection(collection);
  },
  async add(collection, data) {
    data.createdAt = Date.now();
    if (firebaseReady) {
      const ref = await db.collection(collection).add(data);
      return { id: ref.id, ...data };
    }
    const items = this.getCollection(collection);
    data.id = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    items.unshift(data);
    this.saveCollection(collection, items);
    return data;
  },
  async update(collection, id, data) {
    if (firebaseReady) {
      await db.collection(collection).doc(id).update(data);
      return;
    }
    const items = this.getCollection(collection);
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      Object.assign(items[idx], data);
      this.saveCollection(collection, items);
    }
  },
  async remove(collection, id) {
    if (firebaseReady) {
      await db.collection(collection).doc(id).delete();
      return;
    }
    let items = this.getCollection(collection);
    items = items.filter(i => i.id !== id);
    this.saveCollection(collection, items);
  },
  async uploadImage(file) {
    if (firebaseReady) {
      const name = 'images/' + Date.now() + '_' + file.name;
      const ref = storage.ref(name);
      await ref.put(file);
      return await ref.getDownloadURL();
    }
    // Fallback: store as base64 data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }
};
