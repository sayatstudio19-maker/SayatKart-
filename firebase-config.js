// ================================================================
//  SAYATKART – firebase-config.js
//  Firebase Compat SDK v9
// ================================================================

// ================================================================
//  FIREBASE CONFIG  ✅ আসল values বসানো হয়েছে
// ================================================================
const firebaseConfig = {
  apiKey:            "AIzaSyDgJGxWxWGxszN4mz261wWKoB8kK_gxCIU",
  authDomain:        "sayat-kart.firebaseapp.com",
  projectId:         "sayat-kart",
  storageBucket:     "sayat-kart.firebasestorage.app",
  messagingSenderId: "721186261827",
  appId:             "1:721186261827:web:6aac4357fcadf05f703df6",
  measurementId:     "G-FKZZJBMK81"
};

// ================================================================
//  RAZORPAY KEY ID  🔴 তোমার আসল key দাও
// ================================================================
const RAZORPAY_KEY_ID = "rzp_test_XXXXXXXXXXXXXXXX";

// ================================================================
//  APP CONFIG
// ================================================================
const APP_CONFIG = {
  appName:         "SayatKart",
  currency:        "INR",
  currencySymbol:  "₹",
  cashbackPercent: 5,
  whatsappNumber:  "919734398907",
  supportEmail:    "sayatstudio19@gmail.com",

  razorpay: {
    keyId:       RAZORPAY_KEY_ID,
    name:        "SayatKart",
    description: "Order Payment",
    image:       "https://i.imgur.com/placeholder-logo.png",
    currency:    "INR",
    theme: {
      color: "#f97316"
    }
  }
};

// ================================================================
//  FIREBASE INIT
// ================================================================
let _firebaseApp, _auth, _db, _storage;

try {
  _firebaseApp = firebase.initializeApp(firebaseConfig);
  _auth        = firebase.auth();
  _db          = firebase.firestore();
  _storage     = firebase.storage();

  _db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firestore] Multiple tabs open.');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firestore] Persistence not supported.');
    }
  });

  console.log('%c✅ Firebase Initialized', 'color:#16a34a;font-weight:700;font-size:13px;');
} catch (err) {
  console.error('❌ Firebase init failed:', err);
  alert('Firebase error: ' + err.message);
}

// ================================================================
//  COLLECTION NAMES
// ================================================================
const Collections = {
  PRODUCTS:    'products',
  ORDERS:      'orders',
  USERS:       'users',
  WITHDRAWALS: 'withdrawals'
};

const _serverTS  = () => firebase.firestore.FieldValue.serverTimestamp();
const _increment = n  => firebase.firestore.FieldValue.increment(n);

// ================================================================
//  AUTH HELPERS
// ================================================================
function onAuthChange(callback) {
  return _auth.onAuthStateChanged(callback);
}

function getCurrentUser() {
  return _auth.currentUser;
}

async function signOutUser() {
  try {
    await _auth.signOut();
    return { success: true };
  } catch (err) {
    console.error('[Auth] signOutUser:', err);
    return { success: false, error: err };
  }
}

// ================================================================
//  USER PROFILE
// ================================================================
async function saveUserProfile(user) {
  if (!user) return;
  try {
    const ref  = _db.collection(Collections.USERS).doc(user.uid);
    const snap = await ref.get();
    const fields = {
      uid:         user.uid,
      displayName: user.displayName || '',
      email:       user.email       || '',
      phone:       user.phoneNumber || '',
      photoURL:    user.photoURL    || '',
      updatedAt:   _serverTS()
    };
    if (!snap.exists) {
      await ref.set({ ...fields, totalEarnings: 0, createdAt: _serverTS() });
    } else {
      await ref.update(fields);
    }
  } catch (err) {
    console.error('[Firestore] saveUserProfile:', err);
  }
}

async function getUserProfile(uid) {
  try {
    const snap = await _db.collection(Collections.USERS).doc(uid).get();
    return snap.exists ? snap.data() : null;
  } catch (err) {
    console.error('[Firestore] getUserProfile:', err);
    return null;
  }
}

// ================================================================
//  ADDRESS
// ================================================================
async function saveDeliveryAddress(uid, address) {
  try {
    await _db.collection(Collections.USERS).doc(uid).update({
      savedAddress: address,
      updatedAt:    _serverTS()
    });
    return { success: true };
  } catch (err) {
    console.error('[Firestore] saveDeliveryAddress:', err);
    return { success: false, error: err };
  }
}

async function getSavedAddress(uid) {
  try {
    const profile = await getUserProfile(uid);
    return profile?.savedAddress ?? null;
  } catch (err) {
    console.error('[Firestore] getSavedAddress:', err);
    return null;
  }
}

// ================================================================
//  ORDERS
// ================================================================
async function saveOrder(orderData) {
  try {
    const ref = await _db.collection(Collections.ORDERS).add({
      ...orderData,
      status:    'confirmed',
      createdAt: _serverTS()
    });
    return { success: true, orderId: ref.id };
  } catch (err) {
    console.error('[Firestore] saveOrder:', err);
    return { success: false, error: err };
  }
}

async function getUserOrders(uid) {
  try {
    const snap = await _db
      .collection(Collections.ORDERS)
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('[Firestore] getUserOrders:', err);
    return [];
  }
}

async function getOrderById(orderId) {
  try {
    const snap = await _db.collection(Collections.ORDERS).doc(orderId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error('[Firestore] getOrderById:', err);
    return null;
  }
}

// ================================================================
//  EARNINGS
// ================================================================
async function updateUserEarnings(uid, cashbackAmount) {
  try {
    await _db.collection(Collections.USERS).doc(uid).update({
      totalEarnings: _increment(cashbackAmount),
      updatedAt:     _serverTS()
    });
    return { success: true };
  } catch (err) {
    console.error('[Firestore] updateUserEarnings:', err);
    return { success: false, error: err };
  }
}

// ================================================================
//  WITHDRAWAL
// ================================================================
async function saveWithdrawalRequest(uid, upiId, amount, userInfo) {
  try {
    await _db.collection(Collections.WITHDRAWALS).add({
      userId:    uid,
      upiId:     upiId,
      amount:    parseFloat(amount),
      userInfo:  userInfo,
      status:    'pending',
      createdAt: _serverTS()
    });
    return { success: true };
  } catch (err) {
    console.error('[Firestore] saveWithdrawalRequest:', err);
    return { success: false, error: err };
  }
}

// ================================================================
//  PRODUCTS
// ================================================================
async function fetchProducts(category = 'all') {
  try {
    const base = _db.collection(Collections.PRODUCTS);
    let query;

    if (!category || category === 'all') {
      query = base
        .where('inStock', '==', true)
        .orderBy('createdAt', 'desc');
    } else {
      query = base
        .where('category', '==', category)
        .where('inStock',  '==', true)
        .orderBy('createdAt', 'desc');
    }

    const snap = await query.get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('[Firestore] fetchProducts:', err);
    return [];
  }
}

// ================================================================
//  WINDOW EXPORTS
// ================================================================
window.APP_CONFIG  = APP_CONFIG;
window.Collections = Collections;

window._auth    = _auth;
window._db      = _db;
window._storage = _storage;

window.onAuthChange   = onAuthChange;
window.getCurrentUser = getCurrentUser;
window.signOutUser    = signOutUser;

window.saveUserProfile = saveUserProfile;
window.getUserProfile  = getUserProfile;

window.saveDeliveryAddress = saveDeliveryAddress;
window.getSavedAddress     = getSavedAddress;

window.saveOrder     = saveOrder;
window.getUserOrders = getUserOrders;
window.getOrderById  = getOrderById;

window.updateUserEarnings    = updateUserEarnings;
window.saveWithdrawalRequest = saveWithdrawalRequest;
window.fetchProducts         = fetchProducts;

console.log('%c🚀 SayatKart Config Ready', 'color:#f97316;font-weight:700;font-size:13px;');
