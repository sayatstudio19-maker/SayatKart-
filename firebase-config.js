// ================================================================
//  SHOPBOOK – firebase-config.js
//  Firebase Compat SDK v9
//  ─────────────────────────────────────────────────────────────
//  এই ফাইলটি index.html-এ app.js-এর আগে load হয়।
//  app.js এখানে define করা সব window.* function ব্যবহার করে।
//
//  SETUP CHECKLIST:
//  ─────────────────────────────────────────────────────────────
//  [ ] 1. https://console.firebase.google.com → নতুন project তৈরি
//  [ ] 2. Project → "Add App" → Web (</>)  → firebaseConfig copy করো
//  [ ] 3. Authentication → Sign-in method:
//            ✅ Google
//            ✅ Phone
//  [ ] 4. Firestore Database → Create (Test mode দিয়ে শুরু)
//  [ ] 5. Firestore → Rules → নিচের Security Rules paste করো
//  [ ] 6. RAZORPAY_KEY_ID → Razorpay Dashboard → Settings → API Keys
//  [ ] 7. Logo URL → নিজের logo URL দাও
// ================================================================

// ================================================================
//  ★  STEP 1 – তোমার Firebase Project Config এখানে বসাও
// ================================================================
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",               // 🔴 Replace
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID",
  measurementId:     "YOUR_MEASUREMENT_ID",        // optional
};

// ================================================================
//  ★  STEP 2 – Razorpay Key ID
//             (শুধু Key ID frontend-এ – Secret NEVER এখানে)
//             Secret key → Vercel Environment Variables-এ রাখো
//             Variable name: RAZORPAY_KEY_SECRET
// ================================================================
const RAZORPAY_KEY_ID = "rzp_test_XXXXXXXXXXXXXXXX";  // 🔴 Replace
// Production key:
// const RAZORPAY_KEY_ID = "rzp_live_XXXXXXXXXXXXXXXX";

// ================================================================
//  ★  STEP 3 – App-wide Configuration
//             app.js এই object থেকে পড়ে:
//               APP_CONFIG.cashbackPercent  → 5
//               APP_CONFIG.currencySymbol   → '₹'
//               APP_CONFIG.razorpay.keyId   → RAZORPAY_KEY_ID
//               APP_CONFIG.appName          → 'ShopBook'
//               APP_CONFIG.razorpay.image   → logo URL
// ================================================================
const APP_CONFIG = {
  appName:         "ShopBook",
  currency:        "INR",
  currencySymbol:  "₹",
  cashbackPercent: 5,                      // প্রতিটি order-এ 5% cashback
  whatsappNumber:  "919734398907",         // admin WhatsApp (publishing)
  supportEmail:    "support@shopbook.in",

  razorpay: {
    keyId:       RAZORPAY_KEY_ID,          // app.js: APP_CONFIG?.razorpay?.keyId
    name:        "ShopBook",
    description: "Order Payment",
    image:       "https://i.imgur.com/placeholder-logo.png", // 🔴 Replace
    currency:    "INR",
    theme: {
      color: "#f97316",
    },
  },
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

  // Offline persistence – internet ছাড়াও cache থেকে কাজ করে
  _db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    if      (err.code === 'failed-precondition') console.warn('[Firestore] Multiple tabs – persistence off.');
    else if (err.code === 'unimplemented')       console.warn('[Firestore] Browser does not support persistence.');
  });

  console.log('%c✅ Firebase Initialized', 'color:#16a34a;font-weight:700;font-size:13px;');
} catch (err) {
  console.error('❌ Firebase init failed:', err);
  alert('Firebase configuration error.\nPlease check firebase-config.js and fill in your project keys.');
}

// ================================================================
//  COLLECTION NAMES  (centralized – এখানে বদলালে সব জায়গায় বদলাবে)
// ================================================================
const Collections = {
  PRODUCTS:    'products',
  ORDERS:      'orders',
  USERS:       'users',
  WITHDRAWALS: 'withdrawals',
};

// ── Firestore shorthand helpers (এই ফাইলের ভেতরে ব্যবহার) ───────
const _serverTS  = () => firebase.firestore.FieldValue.serverTimestamp();
const _increment = n  => firebase.firestore.FieldValue.increment(n);

// ================================================================
//  AUTH HELPERS
// ================================================================

/** Auth state change listener
 *  app.js: window.onAuthChange(user => { ... }) */
function onAuthChange(callback) {
  return _auth.onAuthStateChanged(callback);
}

/** Currently logged-in Firebase user
 *  app.js: window.getCurrentUser() */
function getCurrentUser() {
  return _auth.currentUser;
}

/** Sign out the current user
 *  app.js: await window.signOutUser()
 *  Returns { success: true } or { success: false, error } */
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
//  USER PROFILE HELPERS
// ================================================================

/** Login-এর পরে user profile Firestore-এ save/update করে।
 *  প্রথমবার → নতুন doc (totalEarnings: 0)
 *  পরের বার → শুধু profile fields update, earnings অক্ষুণ্ণ
 *  app.js: window.saveUserProfile(user) */
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
      updatedAt:   _serverTS(),
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

/** User-এর full Firestore profile পড়ে।
 *  app.js: const profile = await window.getUserProfile(uid)
 *  Returns: profile object বা null */
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
//  ADDRESS HELPERS
// ================================================================

/** Delivery address Firestore users doc-এ save করে।
 *  app.js: await window.saveDeliveryAddress(uid, addressObj)
 *  Returns: { success: true } or { success: false, error } */
async function saveDeliveryAddress(uid, address) {
  try {
    await _db.collection(Collections.USERS).doc(uid).update({
      savedAddress: address,
      updatedAt:    _serverTS(),
    });
    return { success: true };
  } catch (err) {
    console.error('[Firestore] saveDeliveryAddress:', err);
    return { success: false, error: err };
  }
}

/** Saved delivery address পড়ে।
 *  app.js: const addr = await window.getSavedAddress(uid)
 *  Returns: address object বা null */
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
//  ORDER HELPERS
// ================================================================

/** Razorpay payment success-এ order Firestore-এ save করে।
 *  app.js: const result = await window.saveOrder(orderData)
 *
 *  orderData shape (app.js পাঠায়):
 *  {
 *    userId, items[], total, cashbackEarned,
 *    deliveryAddress, paymentId, razorpayOrderId
 *  }
 *
 *  Returns: { success: true, orderId } or { success: false, error } */
async function saveOrder(orderData) {
  try {
    const ref = await _db.collection(Collections.ORDERS).add({
      ...orderData,
      status:    'confirmed',  // confirmed | shipped | out_for_delivery | delivered
      createdAt: _serverTS(),
    });
    return { success: true, orderId: ref.id };
  } catch (err) {
    console.error('[Firestore] saveOrder:', err);
    return { success: false, error: err };
  }
}

/** User-এর সব orders নতুন থেকে পুরনো order-এ fetch করে।
 *  app.js: const orders = await window.getUserOrders(uid)
 *  Returns: order[] (প্রতিটিতে Firestore doc id সহ) */
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

/** একটি নির্দিষ্ট order ID দিয়ে order পড়ে।
 *  app.js: const order = await window.getOrderById(orderId)
 *  Returns: order object বা null */
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
//  EARNINGS HELPER
// ================================================================

/** Cashback earn হলে user-এর totalEarnings বাড়ায় (atomic increment)।
 *  app.js: await window.updateUserEarnings(uid, cashbackAmount)
 *  Returns: { success: true } or { success: false, error } */
async function updateUserEarnings(uid, cashbackAmount) {
  try {
    await _db.collection(Collections.USERS).doc(uid).update({
      totalEarnings: _increment(cashbackAmount),
      updatedAt:     _serverTS(),
    });
    return { success: true };
  } catch (err) {
    console.error('[Firestore] updateUserEarnings:', err);
    return { success: false, error: err };
  }
}

// ================================================================
//  WITHDRAWAL HELPER
// ================================================================

/** UPI withdrawal request admin approval-এর জন্য save করে।
 *  app.js: await window.saveWithdrawalRequest(uid, upiId, amount, userInfo)
 *  Returns: { success: true } or { success: false, error } */
async function saveWithdrawalRequest(uid, upiId, amount, userInfo) {
  try {
    await _db.collection(Collections.WITHDRAWALS).add({
      userId:    uid,
      upiId:     upiId,
      amount:    parseFloat(amount),
      userInfo:  userInfo,
      status:    'pending',  // pending | approved | rejected
      createdAt: _serverTS(),
    });
    return { success: true };
  } catch (err) {
    console.error('[Firestore] saveWithdrawalRequest:', err);
    return { success: false, error: err };
  }
}

// ================================================================
//  PRODUCT HELPER
// ================================================================

/** Firestore-এর products collection থেকে products আনে।
 *  app.js: const products = await window.fetchProducts(category)
 *  category: 'all' | 'books' | 'electronics' | 'fashion' | 'stationery'
 *
 *  ⚠️  category filter-এ composite index লাগতে পারে।
 *  Console-এ error দেখালে Firebase Console-এ suggested index তৈরি করো।
 *
 *  Returns: product[] (প্রতিটিতে Firestore doc id সহ) */
async function fetchProducts(category = 'all') {
  try {
    let query;
    const base = _db.collection(Collections.PRODUCTS);

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
//  ─────────────────────────────────────────────────────────────
//  app.js এই exact নামগুলো ব্যবহার করে।
//  কোনো নাম পরিবর্তন করলে app.js-এও করতে হবে।
// ================================================================

// Config objects
window.APP_CONFIG  = APP_CONFIG;
window.Collections = Collections;

// Firebase instances (app.js সরাসরি _auth ব্যবহার করে phone OTP-র জন্য)
window._auth    = _auth;
window._db      = _db;
window._storage = _storage;

// Auth
window.onAuthChange   = onAuthChange;
window.getCurrentUser = getCurrentUser;
window.signOutUser    = signOutUser;

// User Profile
window.saveUserProfile = saveUserProfile;
window.getUserProfile  = getUserProfile;

// Address
window.saveDeliveryAddress = saveDeliveryAddress;
window.getSavedAddress     = getSavedAddress;

// Orders
window.saveOrder     = saveOrder;
window.getUserOrders = getUserOrders;
window.getOrderById  = getOrderById;

// Earnings
window.updateUserEarnings = updateUserEarnings;

// Withdrawals
window.saveWithdrawalRequest = saveWithdrawalRequest;

// Products
window.fetchProducts = fetchProducts;

// ================================================================
//  FIRESTORE SECURITY RULES
//  ─────────────────────────────────────────────────────────────
//  Firebase Console → Firestore Database → Rules → Edit → Publish
// ================================================================
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Products – সবাই পড়তে পারবে, শুধু admin লিখতে পারবে
    match /products/{productId} {
      allow read:  if true;
      allow write: if request.auth != null
                   && request.auth.token.admin == true;
    }

    // Orders – শুধু নিজের order পড়তে ও তৈরি করতে পারবে
    match /orders/{orderId} {
      allow read:   if request.auth != null
                    && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.userId;
      allow update: if request.auth != null
                    && request.auth.token.admin == true;
    }

    // Users – শুধু নিজের doc read/write করতে পারবে
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }

    // Withdrawals – নিজের request তৈরি ও পড়তে পারবে
    match /withdrawals/{withdrawalId} {
      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.userId;
      allow read:   if request.auth != null
                    && request.auth.uid == resource.data.userId;
      allow update: if request.auth != null
                    && request.auth.token.admin == true;
    }
  }
}
*/

// ================================================================
//  SAMPLE PRODUCT SEEDER
//  ─────────────────────────────────────────────────────────────
//  Browser console-এ একবার চালাও: seedShopBookProducts()
//  এরপর Firebase Console-এ products collection তৈরি হবে।
// ================================================================
/*
async function seedShopBookProducts() {
  const products = [
    { title:"Atomic Habits", description:"James Clear – ছোট অভ্যাসে বড় পরিবর্তন।", price:399, originalPrice:699, image:"https://m.media-amazon.com/images/I/513Y5o-DYtL._AC_UY218_.jpg", category:"books", inStock:true, rating:4.9, createdAt:firebase.firestore.FieldValue.serverTimestamp() },
    { title:"The Pragmatic Programmer", description:"Software developer-দের কালজয়ী গাইড।", price:549, originalPrice:899, image:"https://m.media-amazon.com/images/I/71f743sOlQL._AC_UY218_.jpg", category:"books", inStock:true, rating:4.8, createdAt:firebase.firestore.FieldValue.serverTimestamp() },
    { title:"Wireless Bluetooth Earbuds", description:"True wireless, 24hr battery, deep bass.", price:1299, originalPrice:2499, image:"https://m.media-amazon.com/images/I/61CGHv6kmWL._AC_UY218_.jpg", category:"electronics", inStock:true, rating:4.3, createdAt:firebase.firestore.FieldValue.serverTimestamp() },
    { title:"Mechanical Keyboard TKL", description:"Blue switches, RGB backlight.", price:2799, originalPrice:4500, image:"https://m.media-amazon.com/images/I/71eo8A0m5TL._AC_UY218_.jpg", category:"electronics", inStock:true, rating:4.4, createdAt:firebase.firestore.FieldValue.serverTimestamp() },
    { title:"Premium Notebook Set (3 Pack)", description:"A5 ruled, 200 pages each.", price:249, originalPrice:399, image:"https://m.media-amazon.com/images/I/71Ds6bHZ0cL._AC_UY218_.jpg", category:"stationery", inStock:true, rating:4.6, createdAt:firebase.firestore.FieldValue.serverTimestamp() },
    { title:"Cotton Printed Kurta", description:"100% pure cotton, machine washable.", price:599, originalPrice:1199, image:"https://m.media-amazon.com/images/I/71A3GiJpbCL._AC_UY218_.jpg", category:"fashion", inStock:true, rating:4.2, createdAt:firebase.firestore.FieldValue.serverTimestamp() },
  ];
  const batch = _db.batch();
  products.forEach(p => batch.set(_db.collection('products').doc(), p));
  await batch.commit();
  console.log('✅ Products seeded!');
}
// Console-এ run করো: seedShopBookProducts();
*/

console.log('%c🚀 ShopBook Config Ready', 'color:#f97316;font-weight:700;font-size:13px;');
