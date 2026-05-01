// ================================================================
//  SHOPBOOK – app.js  (Complete Application Logic)
//  Features: Auth · Products · Cart · Razorpay · Publishing ·
//            Profile · Dark/Light Mode · Order Tracker · Withdrawals
//
//  Razorpay Secret Key → Vercel Environment Variable ONLY
//  Frontend uses Key ID; secret lives in /api/create-order.js
// ================================================================

'use strict';

// ── VERCEL SERVERLESS FUNCTION (save as /api/create-order.js) ───
/*
  // api/create-order.js  ← create this file in your Vercel project root
  const Razorpay = require('razorpay');

  module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();
    const { amount } = req.body;
    const instance = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,  // ← Vercel env var
    });
    const order = await instance.orders.create({
      amount:   Math.round(amount * 100), // paise
      currency: 'INR',
      receipt:  'receipt_' + Date.now(),
    });
    res.status(200).json(order);
  };

  // In Vercel Dashboard → Settings → Environment Variables add:
  //   RAZORPAY_KEY_ID     = rzp_live_XXXXXXXX
  //   RAZORPAY_KEY_SECRET = your_secret_here
*/

// ================================================================
//  CONSTANTS & STATE
// ================================================================
const ADMIN_WHATSAPP = '919734398907';   // hardcoded admin number
const CASHBACK_PCT   = APP_CONFIG?.cashbackPercent ?? 5;
const CURRENCY       = APP_CONFIG?.currencySymbol  ?? '₹';
const RAZORPAY_KEY   = APP_CONFIG?.razorpay?.keyId ?? '';

let currentUser   = null;
let allProducts   = [];
let currentCat    = 'all';
let cart          = [];
let confirmWindow = null;   // for purchase intent (Buy Now)
let recaptchaVerifier = null;
let confirmationResult  = null;

// ================================================================
//  DOM CACHE
// ================================================================
const $ = id => document.getElementById(id);

const DOM = {
  overlay:           $('overlay'),
  drawer:            $('drawer'),
  drawerClose:       $('drawerClose'),
  drawerUser:        $('drawerUser'),
  drawerAvatar:      $('drawerAvatar'),
  drawerUserName:    $('drawerUserName'),
  drawerUserEmail:   $('drawerUserEmail'),
  drawerLogout:      $('drawerLogout'),
  drawerLoginBtn:    $('drawerLoginBtn'),
  menuBtn:           $('menuBtn'),
  cartBtn:           $('cartBtn'),
  cartBadge:         $('cartBadge'),
  searchInput:       $('searchInput'),
  searchClearBtn:    $('searchClearBtn'),
  searchToggleBtn:   $('searchToggleBtn'),
  mobileSearchBar:   $('mobileSearchBar'),
  mobileSearchInput: $('mobileSearchInput'),
  mobileSearchClose: $('mobileSearchClose'),
  productGrid:       $('productGrid'),
  noProductsState:   $('noProductsState'),
  categoryStrip:     $('categoryStrip'),
  cartSidebar:       $('cartSidebar'),
  cartCloseBtn:      $('cartCloseBtn'),
  cartBody:          $('cartBody'),
  cartFooter:        $('cartFooter'),
  cartSubtotal:      $('cartSubtotal'),
  cartDiscount:      $('cartDiscount'),
  cartTotal:         $('cartTotal'),
  cartCashback:      $('cartCashback'),
  cartCountText:     $('cartCountText'),
  emptyCartMsg:      $('emptyCartMsg'),
  checkoutBtn:       $('checkoutBtn'),
  cartAuthWarning:   $('cartAuthWarning'),
  addressModal:      $('addressModal'),
  addressModalClose: $('addressModalClose'),
  addressModalCancel:$('addressModalCancel'),
  addressConfirmBtn: $('addressConfirmBtn'),
  addressModalSub:   $('addressModalSubtitle'),
  addrName:          $('addrName'),
  addrPhone:         $('addrPhone'),
  addrStreet:        $('addrStreet'),
  addrArea:          $('addrArea'),
  addrCity:          $('addrCity'),
  addrState:         $('addrState'),
  addrPin:           $('addrPin'),
  addrLandmark:      $('addrLandmark'),
  saveAddressCheck:  $('saveAddressCheck'),
  publishForm:       $('publishForm'),
  publishAuthWarn:   $('publishAuthWarning'),
  publishFormWrap:   $('publishFormWrap'),
  bookTitle:         $('bookTitle'),
  bookSubtitle:      $('bookSubtitle'),
  bookSize:          $('bookSize'),
  bookPages:         $('bookPages'),
  bookAuthor:        $('bookAuthor'),
  bookDesc:          $('bookDesc'),
  bookPDF:           $('bookPDF'),
  customSizeGroup:   $('customSizeGroup'),
  bookCustomSize:    $('bookCustomSize'),
  fileUploadZone:    $('fileUploadZone'),
  fileUploadContent: $('fileUploadContent'),
  fileSelectedInfo:  $('fileSelectedInfo'),
  fileSelectedName:  $('fileSelectedName'),
  fileRemoveBtn:     $('fileRemoveBtn'),
  publishSubmitBtn:  $('publishSubmitBtn'),
  profileLoginPrompt:$('profileLoginPrompt'),
  profileLoggedIn:   $('profileLoggedIn'),
  profileAvatar:     $('profileAvatar'),
  profileName:       $('profileName'),
  profileEmail:      $('profileEmail'),
  logoutBtn:         $('logoutBtn'),
  earningsAmount:    $('earningsAmount'),
  profileOrdersList: $('profileOrdersList'),
  viewOrdersBtn:     $('viewOrdersBtn'),
  upiId:             $('upiId'),
  withdrawAmount:    $('withdrawAmount'),
  withdrawBtn:       $('withdrawBtn'),
  withdrawalSuccess: $('withdrawalSuccess'),
  googleLoginBtn:    $('googleLoginBtn'),
  loginPhoneInput:   $('loginPhoneInput'),
  sendOtpBtn:        $('sendOtpBtn'),
  otpVerifyWrap:     $('otpVerifyWrap'),
  verifyOtpBtn:      $('verifyOtpBtn'),
  resendOtpBtn:      $('resendOtpBtn'),
  otpInputGroup:     $('otpInputGroup'),
  orderStatusModal:  $('orderStatusModal'),
  orderStatusClose:  $('orderStatusModalClose'),
  orderStatusClose2: $('orderStatusClose2'),
  statusOrderId:     $('statusOrderId'),
  orderDetailsMini:  $('orderDetailsMini'),
  productModal:      $('productModal'),
  productModalClose: $('productModalClose'),
  productModalTitle: $('productModalTitle'),
  productModalImg:   $('productModalImg'),
  productModalName:  $('productModalName'),
  productModalPrice: $('productModalPrice'),
  productModalOrig:  $('productModalOriginalPrice'),
  productModalDisc:  $('productModalDiscount'),
  productModalDesc:  $('productModalDesc'),
  productModalCart:  $('productModalAddCart'),
  productModalBuy:   $('productModalBuyNow'),
  successOverlay:    $('successOverlay'),
  successPaymentId:  $('successPaymentId'),
  successCashback:   $('successCashback'),
  successCashbackAmt:$('successCashbackAmt'),
  successDoneBtn:    $('successDoneBtn'),
  loadingOverlay:    $('loadingOverlay'),
  loadingMsg:        $('loadingMsg'),
  toastContainer:    $('toastContainer'),
  ordersAuthWarn:    $('ordersAuthWarning'),
  ordersContainer:   $('ordersContainer'),
  ordersFullList:    $('ordersFullList'),
  publisherPhone:    $('publisherPhone'),
};

// ================================================================
//  DARK / LIGHT MODE
// ================================================================
let isDarkMode = localStorage.getItem('shopbook_theme') === 'dark';

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  localStorage.setItem('shopbook_theme', dark ? 'dark' : 'light');
  const btn = $('themeToggleBtn');
  if (btn) {
    btn.querySelector('.material-icons-round').textContent = dark ? 'light_mode' : 'dark_mode';
    btn.title = dark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }
}

function injectDarkModeCSS() {
  if ($('darkModeStyle')) return;
  const style = document.createElement('style');
  style.id = 'darkModeStyle';
  style.textContent = `
    [data-theme="dark"] {
      --bg-base:       #0f1117;
      --bg-card:       #1a1d2e;
      --bg-bottom-nav: #1a1d2e;
      --border:        #2d3258;
      --text-heading:  #f1f5f9;
      --text-body:     #cbd5e1;
      --text-muted:    #64748b;
      --text-on-dark:  #f9fafb;
      --shadow-xs: 0 1px 3px rgba(0,0,0,0.4);
      --shadow-sm: 0 2px 8px rgba(0,0,0,0.45);
      --shadow-md: 0 4px 18px rgba(0,0,0,0.55);
    }
    [data-theme="dark"] .app-header   { background:#12152a; }
    [data-theme="dark"] .bg-drawer    { background:#0d1020; }
    [data-theme="dark"] .category-chip{ background:#1a1d2e; color:#94a3b8; border-color:#2d3258; }
    [data-theme="dark"] .category-chip.active { background:var(--primary); color:#fff; }
    [data-theme="dark"] .form-input   { background:#12152a; color:#e2e8f0; border-color:#2d3258; }
    [data-theme="dark"] .form-input::placeholder { color:#475569; }
    [data-theme="dark"] .cart-footer  { background:#12152a; }
    [data-theme="dark"] .modal-content{ background:#1a1d2e; }
    [data-theme="dark"] .modal-header { background:#1a1d2e; }
    [data-theme="dark"] .modal-footer { background:#1a1d2e; }
    [data-theme="dark"] .cart-header  { background:#0d1020; }
    [data-theme="dark"] .order-details-mini { background:#12152a; }
    [data-theme="dark"] .hero-carousel { filter:brightness(0.92); }
    [data-theme="dark"] .product-card { background:#1a1d2e; border-color:#2d3258; }
    [data-theme="dark"] .product-card-img-wrap { background:#12152a; }
    [data-theme="dark"] .orders-section, 
    [data-theme="dark"] .withdrawal-card,
    [data-theme="dark"] .profile-card { background:#1a1d2e; border-color:#2d3258; }
    [data-theme="dark"] .login-prompt-card { background:#1a1d2e; }
    [data-theme="dark"] .bottom-nav   { background:#1a1d2e; border-top-color:#2d3258; }
    [data-theme="dark"] .cart-sidebar { background:#1a1d2e; }
    [data-theme="dark"] .cart-item    { background:#12152a; border-color:#2d3258; }
    [data-theme="dark"] .radio-label  { background:#12152a; border-color:#2d3258; color:#94a3b8; }
    [data-theme="dark"] .file-upload-zone { background:#12152a; border-color:#2d3258; }
    [data-theme="dark"] .phone-prefix { background:#12152a; border-color:#2d3258; }
    [data-theme="dark"] .btn-google-login { background:#1a1d2e; border-color:#2d3258; color:#e2e8f0; }
    [data-theme="dark"] .otp-box      { background:#12152a; border-color:#2d3258; color:#f1f5f9; }
    [data-theme="dark"] .success-card { background:#1a1d2e; }
    [data-theme="dark"] .check-icon::before,
    [data-theme="dark"] .check-icon::after,
    [data-theme="dark"] .icon-fix     { background:#1a1d2e; }
    [data-theme="dark"] .order-full-header { background:#12152a; }
    [data-theme="dark"] .order-full-card { background:#1a1d2e; border-color:#2d3258; }
    [data-theme="dark"] .success-payment-id { background:#12152a; }
  `;
  document.head.appendChild(style);
}

function injectThemeToggleButton() {
  // Inject toggle button into profile section
  const profileCard = document.querySelector('.profile-logged-in') ||
                      document.querySelector('#section-profile');
  if (!profileCard || $('themeToggleBtn')) return;

  const wrap = document.createElement('div');
  wrap.className = 'theme-toggle-wrap';
  wrap.innerHTML = `
    <div class="theme-toggle-card" id="themeToggleCard">
      <div class="theme-toggle-info">
        <span class="material-icons-round" style="color:var(--primary)">brightness_6</span>
        <div>
          <p style="font-weight:700;font-size:.9rem;">Appearance</p>
          <p style="font-size:.78rem;color:var(--text-muted)">Switch between Dark & Light mode</p>
        </div>
      </div>
      <button id="themeToggleBtn" class="theme-toggle-btn" title="Switch theme">
        <span class="material-icons-round">${isDarkMode ? 'light_mode' : 'dark_mode'}</span>
      </button>
    </div>`;

  // Insert at the top of profile-logged-in
  const loggedIn = $('profileLoggedIn');
  if (loggedIn) {
    loggedIn.insertBefore(wrap, loggedIn.firstChild);
  }

  // Inject CSS for toggle card
  const s = document.createElement('style');
  s.textContent = `
    .theme-toggle-wrap { margin-bottom:0; }
    .theme-toggle-card {
      background:var(--bg-card);
      border:1px solid var(--border);
      border-radius:var(--r-lg);
      padding:14px 16px;
      display:flex; align-items:center; justify-content:space-between;
      box-shadow:var(--shadow-sm);
    }
    .theme-toggle-info { display:flex; align-items:center; gap:12px; }
    .theme-toggle-btn {
      width:50px; height:28px;
      background:var(--primary);
      border-radius:var(--r-full);
      position:relative;
      transition:background var(--t-fast);
      flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      color:#fff;
    }
    .theme-toggle-btn .material-icons-round { font-size:18px; }
    .theme-toggle-btn:hover { background:var(--primary-dark); }
  `;
  document.head.appendChild(s);

  $('themeToggleBtn').addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    applyTheme(isDarkMode);
    showToast(isDarkMode ? '🌙 Dark Mode On' : '☀️ Light Mode On', 'info');
  });
}

// ================================================================
//  SECTION NAVIGATION
// ================================================================
function switchSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.drawer-link').forEach(a => a.classList.remove('active'));

  const sec = $(`section-${name}`);
  if (sec) sec.classList.add('active');

  document.querySelectorAll(`[data-section="${name}"]`).forEach(el => {
    el.classList.add('active');
  });

  closeDrawer();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (name === 'orders') loadOrdersPage();
  if (name === 'profile') {
    setTimeout(injectThemeToggleButton, 100);
  }
}

window.switchSection = switchSection;   // expose for inline onclick

// Bottom nav + drawer links
document.querySelectorAll('[data-section]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    switchSection(el.dataset.section);
  });
});

// ================================================================
//  DRAWER
// ================================================================
function openDrawer()  {
  DOM.drawer.classList.add('open');
  DOM.overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  DOM.drawer.classList.remove('open');
  if (!isCartOpen() && !isModalOpen()) {
    DOM.overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}
DOM.menuBtn?.addEventListener('click', openDrawer);
DOM.drawerClose?.addEventListener('click', closeDrawer);
DOM.overlay?.addEventListener('click', () => { closeDrawer(); closeCart(); closeAllModals(); });
DOM.drawerLogout?.addEventListener('click', handleLogout);
DOM.drawerLoginBtn?.addEventListener('click', () => { switchSection('profile'); closeDrawer(); });

// ================================================================
//  SEARCH
// ================================================================
function initSearch() {
  const handleSearch = val => {
    const q = val.trim().toLowerCase();
    if (!q) {
      renderProducts(allProducts);
      if (DOM.searchClearBtn) DOM.searchClearBtn.style.display = 'none';
      return;
    }
    if (DOM.searchClearBtn) DOM.searchClearBtn.style.display = 'flex';
    const filtered = allProducts.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
    renderProducts(filtered);
  };

  DOM.searchInput?.addEventListener('input', e => handleSearch(e.target.value));
  DOM.mobileSearchInput?.addEventListener('input', e => handleSearch(e.target.value));

  DOM.searchClearBtn?.addEventListener('click', () => {
    if (DOM.searchInput) DOM.searchInput.value = '';
    if (DOM.mobileSearchInput) DOM.mobileSearchInput.value = '';
    DOM.searchClearBtn.style.display = 'none';
    renderProducts(allProducts);
  });

  DOM.searchToggleBtn?.addEventListener('click', () => {
    const bar = DOM.mobileSearchBar;
    bar?.classList.toggle('show');
    if (bar?.classList.contains('show')) DOM.mobileSearchInput?.focus();
  });

  DOM.mobileSearchClose?.addEventListener('click', () => {
    DOM.mobileSearchBar?.classList.remove('show');
    if (DOM.mobileSearchInput) DOM.mobileSearchInput.value = '';
    renderProducts(allProducts);
  });
}

// ================================================================
//  TOAST NOTIFICATIONS
// ================================================================
function showToast(msg, type = 'info', duration = 3000) {
  const icons = { success:'check_circle', error:'error', info:'info', warning:'warning' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="material-icons-round">${icons[type]||'info'}</span><span>${msg}</span>`;
  DOM.toastContainer?.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ================================================================
//  LOADING OVERLAY
// ================================================================
function showLoading(msg = 'Processing...') {
  if (DOM.loadingOverlay) DOM.loadingOverlay.style.display = 'flex';
  if (DOM.loadingMsg) DOM.loadingMsg.textContent = msg;
}
function hideLoading() {
  if (DOM.loadingOverlay) DOM.loadingOverlay.style.display = 'none';
}

// ================================================================
//  MODAL HELPERS
// ================================================================
function openModal(el)  {
  el?.classList.add('open');
  DOM.overlay?.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeModal(el) {
  el?.classList.remove('open');
  if (!isCartOpen() && !isDrawerOpen()) {
    DOM.overlay?.classList.remove('active');
    document.body.style.overflow = '';
  }
}
function closeAllModals() {
  document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
}
const isCartOpen   = () => DOM.cartSidebar?.classList.contains('open');
const isDrawerOpen = () => DOM.drawer?.classList.contains('open');
const isModalOpen  = () => !!document.querySelector('.modal.open');

DOM.addressModalClose?.addEventListener('click',  () => closeModal(DOM.addressModal));
DOM.addressModalCancel?.addEventListener('click', () => closeModal(DOM.addressModal));
DOM.orderStatusClose?.addEventListener('click',   () => closeModal(DOM.orderStatusModal));
DOM.orderStatusClose2?.addEventListener('click',  () => closeModal(DOM.orderStatusModal));
DOM.productModalClose?.addEventListener('click',  () => closeModal(DOM.productModal));

// ================================================================
//  FIREBASE AUTHENTICATION
// ================================================================
function initAuth() {
  window.onAuthChange(user => {
    currentUser = user;
    updateAuthUI(user);
    if (user) {
      window.saveUserProfile(user);
      loadUserEarnings(user.uid);
      loadProfileOrders(user.uid);
    }
  });

  // Google Login
  DOM.googleLoginBtn?.addEventListener('click', async () => {
    showLoading('Signing in with Google…');
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await window._auth.signInWithPopup(provider);
      showToast('✅ Logged in with Google!', 'success');
      switchSection('profile');
    } catch (err) {
      showToast('Google login failed: ' + (err.message || err.code), 'error');
    } finally { hideLoading(); }
  });

  // Phone OTP – Send
  DOM.sendOtpBtn?.addEventListener('click', sendOtp);
  DOM.verifyOtpBtn?.addEventListener('click', verifyOtp);
  DOM.resendOtpBtn?.addEventListener('click', sendOtp);
}

function updateAuthUI(user) {
  const loggedIn = !!user;
  const name  = user?.displayName || user?.phoneNumber || 'User';
  const email = user?.email || user?.phoneNumber || '';
  const initial = (name[0] || 'U').toUpperCase();

  // Drawer
  if (DOM.drawerUser)     DOM.drawerUser.style.display     = loggedIn ? 'flex' : 'none';
  if (DOM.drawerLogout)   DOM.drawerLogout.style.display   = loggedIn ? 'flex' : 'none';
  if (DOM.drawerLoginBtn) DOM.drawerLoginBtn.style.display = loggedIn ? 'none' : 'flex';
  if (DOM.drawerAvatar)   DOM.drawerAvatar.textContent     = initial;
  if (DOM.drawerUserName) DOM.drawerUserName.textContent   = name;
  if (DOM.drawerUserEmail)DOM.drawerUserEmail.textContent  = email;

  // Profile section
  if (DOM.profileLoginPrompt) DOM.profileLoginPrompt.style.display = loggedIn ? 'none'  : 'block';
  if (DOM.profileLoggedIn)    DOM.profileLoggedIn.style.display    = loggedIn ? 'flex'  : 'none';
  if (DOM.profileAvatar)      DOM.profileAvatar.textContent        = initial;
  if (DOM.profileName)        DOM.profileName.textContent          = name;
  if (DOM.profileEmail)       DOM.profileEmail.textContent         = email;

  // Photo avatar
  if (user?.photoURL) {
    [DOM.drawerAvatar, DOM.profileAvatar].forEach(el => {
      if (!el) return;
      el.innerHTML = `<img src="${user.photoURL}" alt="${name}" />`;
    });
  }

  // Inject theme toggle after profile renders
  if (loggedIn) setTimeout(injectThemeToggleButton, 200);
}

// ── Send OTP ─────────────────────────────────────────────────────
async function sendOtp() {
  const phone = DOM.loginPhoneInput?.value.trim();
  if (!/^\d{10}$/.test(phone)) {
    showToast('Please enter a valid 10-digit mobile number.', 'error');
    return;
  }
  showLoading('Sending OTP…');
  try {
    if (!recaptchaVerifier) {
      recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'invisible',
        callback: () => {},
      });
    }
    confirmationResult = await window._auth.signInWithPhoneNumber(
      '+91' + phone, recaptchaVerifier
    );
    if (DOM.otpVerifyWrap) DOM.otpVerifyWrap.style.display = 'block';
    DOM.otpInputGroup?.querySelectorAll('.otp-box')[0]?.focus();
    showToast('OTP sent! Check your SMS.', 'success');
  } catch (err) {
    showToast('Failed to send OTP: ' + (err.message || err.code), 'error');
    recaptchaVerifier?.clear();
    recaptchaVerifier = null;
  } finally { hideLoading(); }
}

// ── Verify OTP ───────────────────────────────────────────────────
async function verifyOtp() {
  const boxes = DOM.otpInputGroup?.querySelectorAll('.otp-box');
  const otp   = Array.from(boxes || []).map(b => b.value).join('');
  if (otp.length !== 6) {
    showToast('Please enter the complete 6-digit OTP.', 'error');
    return;
  }
  showLoading('Verifying OTP…');
  try {
    await confirmationResult.confirm(otp);
    showToast('✅ Phone verified! Welcome!', 'success');
    switchSection('profile');
  } catch {
    showToast('Invalid OTP. Please try again.', 'error');
  } finally { hideLoading(); }
}

// OTP box auto-advance
document.querySelectorAll('.otp-box').forEach((box, i, arr) => {
  box.addEventListener('input', e => {
    e.target.value = e.target.value.slice(-1);
    e.target.classList.toggle('filled', !!e.target.value);
    if (e.target.value && arr[i + 1]) arr[i + 1].focus();
  });
  box.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !e.target.value && arr[i - 1]) arr[i - 1].focus();
  });
});

// ── Logout ───────────────────────────────────────────────────────
async function handleLogout() {
  showLoading('Logging out…');
  await window.signOutUser();
  currentUser = null;
  showToast('Logged out successfully.', 'info');
  switchSection('home');
  hideLoading();
}

DOM.logoutBtn?.addEventListener('click', handleLogout);

// ================================================================
//  PRODUCTS
// ================================================================
async function loadProducts(category = 'all') {
  showSkeletons();
  try {
    allProducts = await window.fetchProducts(category);
    renderProducts(allProducts);
  } catch {
    showToast('Failed to load products. Please refresh.', 'error');
    hideSkeletons();
  }
}

function showSkeletons() {
  if (!DOM.productGrid) return;
  DOM.productGrid.innerHTML = Array(6).fill(
    '<div class="product-skeleton"></div>'
  ).join('');
  if (DOM.noProductsState) DOM.noProductsState.style.display = 'none';
}

function hideSkeletons() {
  if (DOM.productGrid) DOM.productGrid.innerHTML = '';
}

function renderProducts(products) {
  if (!DOM.productGrid) return;
  DOM.productGrid.innerHTML = '';
  if (!products.length) {
    if (DOM.noProductsState) DOM.noProductsState.style.display = 'flex';
    return;
  }
  if (DOM.noProductsState) DOM.noProductsState.style.display = 'none';

  products.forEach(p => {
    const disc = p.originalPrice > p.price
      ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = p.id;
    card.innerHTML = `
      <div class="product-card-img-wrap">
        <img src="${p.image || 'https://via.placeholder.com/300x300?text=No+Image'}"
             alt="${escHtml(p.title)}" loading="lazy"
             onerror="this.src='https://via.placeholder.com/300x300?text=Image+Error'" />
        ${disc ? `<span class="discount-badge">${disc}% OFF</span>` : ''}
      </div>
      <div class="product-card-body">
        <p class="product-card-title">${escHtml(p.title)}</p>
        <div class="product-card-prices">
          <span class="product-price">${CURRENCY}${fmtNum(p.price)}</span>
          ${p.originalPrice > p.price
            ? `<span class="product-original-price">${CURRENCY}${fmtNum(p.originalPrice)}</span>`
            : ''}
        </div>
      </div>
      <div class="product-card-actions">
        <button class="btn-add-cart" data-id="${p.id}" data-action="add">
          <span class="material-icons-round">add_shopping_cart</span> Add
        </button>
        <button class="btn-buy-now" data-id="${p.id}" data-action="buy">
          <span class="material-icons-round">flash_on</span> Buy
        </button>
      </div>`;
    // Quick view on card body click
    card.querySelector('.product-card-body')?.addEventListener('click', () => openProductModal(p));
    card.querySelector('.product-card-img-wrap')?.addEventListener('click', () => openProductModal(p));
    card.querySelector('.btn-add-cart')?.addEventListener('click', e => {
      e.stopPropagation();
      addToCart(p);
    });
    card.querySelector('.btn-buy-now')?.addEventListener('click', e => {
      e.stopPropagation();
      handleBuyNow(p);
    });
    DOM.productGrid.appendChild(card);
  });
}

// Category filter
DOM.categoryStrip?.addEventListener('click', e => {
  const chip = e.target.closest('.category-chip');
  if (!chip) return;
  DOM.categoryStrip.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  currentCat = chip.dataset.cat;
  loadProducts(currentCat);
});

// Product Quick View Modal
let currentModalProduct = null;
function openProductModal(p) {
  currentModalProduct = p;
  const disc = p.originalPrice > p.price
    ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  if (DOM.productModalTitle) DOM.productModalTitle.textContent = p.title;
  if (DOM.productModalImg)   { DOM.productModalImg.src = p.image || ''; DOM.productModalImg.alt = p.title; }
  if (DOM.productModalName)  DOM.productModalName.textContent = p.title;
  if (DOM.productModalPrice) DOM.productModalPrice.textContent = `${CURRENCY}${fmtNum(p.price)}`;
  if (DOM.productModalOrig)  DOM.productModalOrig.textContent = p.originalPrice > p.price ? `${CURRENCY}${fmtNum(p.originalPrice)}` : '';
  if (DOM.productModalDisc)  { DOM.productModalDisc.textContent = disc ? `${disc}% OFF` : ''; DOM.productModalDisc.style.display = disc ? 'inline-flex' : 'none'; }
  if (DOM.productModalDesc)  DOM.productModalDesc.textContent = p.description || 'No description available.';
  openModal(DOM.productModal);
}
DOM.productModalCart?.addEventListener('click', () => {
  if (currentModalProduct) { addToCart(currentModalProduct); closeModal(DOM.productModal); }
});
DOM.productModalBuy?.addEventListener('click', () => {
  if (currentModalProduct) { closeModal(DOM.productModal); handleBuyNow(currentModalProduct); }
});

// ================================================================
//  CART
// ================================================================
function loadCart() {
  try { cart = JSON.parse(localStorage.getItem('shopbook_cart') || '[]'); } catch { cart = []; }
  updateCartBadge();
}

function saveCart() {
  localStorage.setItem('shopbook_cart', JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const count = cart.length;
  if (DOM.cartBadge) {
    DOM.cartBadge.textContent = count;
    DOM.cartBadge.style.display = count ? 'flex' : 'none';
  }
  if (DOM.cartCountText) DOM.cartCountText.textContent = `(${count} item${count !== 1 ? 's' : ''})`;
}

function addToCart(product) {
  // Allow duplicates (each click = 1 item entry; simple multi-item support)
  cart.push({
    id:            product.id,
    title:         product.title,
    price:         product.price,
    originalPrice: product.originalPrice || product.price,
    image:         product.image || '',
  });
  saveCart();
  renderCart();
  showToast(`"${product.title}" added to cart!`, 'success');
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

function renderCart() {
  if (!DOM.cartBody) return;
  DOM.cartBody.innerHTML = '';

  if (!cart.length) {
    DOM.cartBody.appendChild(DOM.emptyCartMsg || createEmptyCartEl());
    if (DOM.emptyCartMsg) DOM.emptyCartMsg.style.display = 'flex';
    if (DOM.cartFooter)   DOM.cartFooter.style.display = 'none';
    if (DOM.cartAuthWarning) DOM.cartAuthWarning.style.display = 'none';
    return;
  }

  if (DOM.emptyCartMsg) DOM.emptyCartMsg.style.display = 'none';
  if (DOM.cartFooter)   DOM.cartFooter.style.display = 'block';

  cart.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <img class="cart-item-img" src="${item.image || 'https://via.placeholder.com/64'}"
           alt="${escHtml(item.title)}"
           onerror="this.src='https://via.placeholder.com/64'" />
      <div class="cart-item-info">
        <p class="cart-item-name">${escHtml(item.title)}</p>
        <p class="cart-item-price">${CURRENCY}${fmtNum(item.price)}</p>
      </div>
      <button class="cart-item-remove" title="Remove">
        <span class="material-icons-round">delete_outline</span>
      </button>`;
    el.querySelector('.cart-item-remove').addEventListener('click', () => removeFromCart(idx));
    DOM.cartBody.appendChild(el);
  });

  // Summary
  const subtotal  = cart.reduce((s, i) => s + (i.originalPrice || i.price), 0);
  const total     = cart.reduce((s, i) => s + i.price, 0);
  const discount  = subtotal - total;
  const cashback  = Math.round(total * CASHBACK_PCT / 100);

  if (DOM.cartSubtotal) DOM.cartSubtotal.textContent = `${CURRENCY}${fmtNum(subtotal)}`;
  if (DOM.cartDiscount) DOM.cartDiscount.textContent = `-${CURRENCY}${fmtNum(discount)}`;
  if (DOM.cartTotal)    DOM.cartTotal.textContent    = `${CURRENCY}${fmtNum(total)}`;
  if (DOM.cartCashback) DOM.cartCashback.textContent = `+${CURRENCY}${fmtNum(cashback)}`;

  // Auth warning
  if (DOM.cartAuthWarning) {
    DOM.cartAuthWarning.style.display = currentUser ? 'none' : 'flex';
  }
}

function createEmptyCartEl() {
  const d = document.createElement('div');
  d.className = 'empty-cart';
  d.id = 'emptyCartMsg';
  d.innerHTML = `
    <span class="material-icons-round">remove_shopping_cart</span>
    <p>Your cart is empty!</p>
    <button class="btn-primary" onclick="switchSection('home');closeCart();">Start Shopping</button>`;
  return d;
}

function openCart() {
  renderCart();
  DOM.cartSidebar?.classList.add('open');
  DOM.overlay?.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  DOM.cartSidebar?.classList.remove('open');
  if (!isDrawerOpen() && !isModalOpen()) {
    DOM.overlay?.classList.remove('active');
    document.body.style.overflow = '';
  }
}
window.closeCart = closeCart;

DOM.cartBtn?.addEventListener('click', openCart);
DOM.cartCloseBtn?.addEventListener('click', closeCart);

// ================================================================
//  CHECKOUT FLOW
// ================================================================
DOM.checkoutBtn?.addEventListener('click', () => {
  if (!currentUser) {
    showToast('⚠️ Please login to checkout!', 'error');
    if (DOM.cartAuthWarning) DOM.cartAuthWarning.style.display = 'flex';
    return;
  }
  closeCart();
  initiateCheckout();
});

async function initiateCheckout() {
  showLoading('Loading address…');
  let savedAddr = null;
  try { savedAddr = await window.getSavedAddress(currentUser.uid); } catch {}
  hideLoading();

  if (savedAddr) {
    fillAddressForm(savedAddr);
    DOM.addressModalSub && (DOM.addressModalSub.textContent =
      'Delivering to your saved address. Edit if needed.');
  } else {
    clearAddressForm();
    DOM.addressModalSub && (DOM.addressModalSub.textContent =
      'Please enter your delivery address.');
  }
  openModal(DOM.addressModal);
}

function fillAddressForm(a) {
  if (DOM.addrName)     DOM.addrName.value     = a.name     || '';
  if (DOM.addrPhone)    DOM.addrPhone.value    = a.phone    || '';
  if (DOM.addrStreet)   DOM.addrStreet.value   = a.street   || '';
  if (DOM.addrArea)     DOM.addrArea.value     = a.area     || '';
  if (DOM.addrCity)     DOM.addrCity.value     = a.city     || '';
  if (DOM.addrState)    DOM.addrState.value    = a.state    || '';
  if (DOM.addrPin)      DOM.addrPin.value      = a.pin      || '';
  if (DOM.addrLandmark) DOM.addrLandmark.value = a.landmark || '';
}
function clearAddressForm() {
  ['addrName','addrPhone','addrStreet','addrArea','addrCity','addrState','addrPin','addrLandmark']
    .forEach(id => { const el = $(id); if (el) el.value = ''; });
}

DOM.addressConfirmBtn?.addEventListener('click', async () => {
  const addr = collectAddress();
  if (!addr) return;

  if (DOM.saveAddressCheck?.checked) {
    try { await window.saveDeliveryAddress(currentUser.uid, addr); } catch {}
  }
  closeModal(DOM.addressModal);
  startRazorpayPayment(addr);
});

function collectAddress() {
  const fields = [
    { el: DOM.addrName,   msg: 'Full name is required.' },
    { el: DOM.addrPhone,  msg: 'Valid 10-digit mobile number required.', pattern: /^\d{10}$/ },
    { el: DOM.addrStreet, msg: 'Street address is required.' },
    { el: DOM.addrArea,   msg: 'Area / locality is required.' },
    { el: DOM.addrCity,   msg: 'City is required.' },
    { el: DOM.addrState,  msg: 'State is required.' },
    { el: DOM.addrPin,    msg: 'Valid 6-digit PIN code required.', pattern: /^\d{6}$/ },
  ];
  for (const f of fields) {
    const val = f.el?.value.trim() || '';
    if (!val || (f.pattern && !f.pattern.test(val))) {
      showToast(f.msg, 'error');
      f.el?.focus();
      return null;
    }
  }
  return {
    name:     DOM.addrName?.value.trim(),
    phone:    DOM.addrPhone?.value.trim(),
    street:   DOM.addrStreet?.value.trim(),
    area:     DOM.addrArea?.value.trim(),
    city:     DOM.addrCity?.value.trim(),
    state:    DOM.addrState?.value.trim(),
    pin:      DOM.addrPin?.value.trim(),
    landmark: DOM.addrLandmark?.value.trim(),
  };
}

// ================================================================
//  RAZORPAY PAYMENT
// ================================================================
async function startRazorpayPayment(deliveryAddress) {
  const total   = cart.reduce((s, i) => s + i.price, 0);
  const amtPaise = Math.round(total * 100);

  showLoading('Initializing payment…');

  let razorpayOrderId = null;

  // ── Try to create a server-side order (Vercel function) ────────
  // If you've deployed /api/create-order.js on Vercel, this will work.
  // If not, we fall back to client-only mode (still works for testing).
  try {
    const res = await fetch('/api/create-order', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ amount: total }),
    });
    if (res.ok) {
      const data = await res.json();
      razorpayOrderId = data.id;
    }
  } catch {
    // /api/create-order not available – proceed without server order ID
    console.warn('Server order creation skipped – using client-only mode.');
  }

  hideLoading();

  const user = currentUser;
  const options = {
    key:         RAZORPAY_KEY,
    amount:      amtPaise,
    currency:    'INR',
    name:        APP_CONFIG?.appName || 'ShopBook',
    description: `Order of ${cart.length} item(s)`,
    image:       APP_CONFIG?.razorpay?.image || '',
    order_id:    razorpayOrderId || undefined,
    prefill: {
      name:    user?.displayName || deliveryAddress.name,
      email:   user?.email || '',
      contact: user?.phoneNumber?.replace('+91','') || deliveryAddress.phone,
    },
    notes: {
      address: `${deliveryAddress.street}, ${deliveryAddress.area}, ${deliveryAddress.city}`,
    },
    theme:   { color: '#f97316' },
    handler: async (response) => {
      await onPaymentSuccess(response, deliveryAddress, total);
    },
    modal: {
      ondismiss: () => showToast('Payment cancelled.', 'warning'),
    },
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', err => {
      showToast('Payment failed: ' + (err?.error?.description || 'Unknown error'), 'error');
    });
    rzp.open();
  } catch (e) {
    showToast('Could not open payment window. Check Razorpay key.', 'error');
    console.error('Razorpay error:', e);
  }
}

async function onPaymentSuccess(response, address, total) {
  showLoading('Saving your order…');
  const cashback = Math.round(total * CASHBACK_PCT / 100);

  const orderData = {
    userId:          currentUser.uid,
    items:           cart.map(i => ({
      productId:     i.id,
      title:         i.title,
      price:         i.price,
      image:         i.image,
    })),
    total:           total,
    cashbackEarned:  cashback,
    deliveryAddress: address,
    paymentId:       response.razorpay_payment_id,
    razorpayOrderId: response.razorpay_order_id || null,
    status:          'confirmed',
  };

  try {
    const result = await window.saveOrder(orderData);
    if (result.success) {
      await window.updateUserEarnings(currentUser.uid, cashback);
      // Show success overlay
      if (DOM.successPaymentId)  DOM.successPaymentId.textContent  = response.razorpay_payment_id;
      if (DOM.successCashbackAmt)DOM.successCashbackAmt.textContent = `${CURRENCY}${fmtNum(cashback)}`;
      if (DOM.successOverlay)    DOM.successOverlay.style.display   = 'flex';

      // Clear cart
      cart = [];
      saveCart();
      renderCart();
      loadUserEarnings(currentUser.uid);
    } else {
      showToast('Payment successful but order save failed. Contact support.', 'warning');
    }
  } catch {
    showToast('Order save error. Payment ID: ' + response.razorpay_payment_id, 'warning');
  } finally { hideLoading(); }
}

// Buy Now (single product)
function handleBuyNow(product) {
  if (!currentUser) {
    showToast('⚠️ Please login to buy!', 'error');
    showAuthWarning('home');
    return;
  }
  cart = [{ id: product.id, title: product.title, price: product.price,
             originalPrice: product.originalPrice || product.price, image: product.image || '' }];
  saveCart();
  initiateCheckout();
}

// Success overlay close
DOM.successDoneBtn?.addEventListener('click', () => {
  if (DOM.successOverlay) DOM.successOverlay.style.display = 'none';
  switchSection('home');
});

// ================================================================
//  AUTH WALL – show red warning for protected actions
// ================================================================
function showAuthWarning(section) {
  const warnMap = {
    home:    null,
    publish: DOM.publishAuthWarn,
    orders:  DOM.ordersAuthWarn,
  };
  const warn = warnMap[section];
  if (warn) warn.style.display = 'flex';
}

// Warn-login buttons
document.querySelectorAll('.warn-login-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.section || 'profile';
    switchSection(target);
  });
});

// ================================================================
//  PROFILE – EARNINGS
// ================================================================
async function loadUserEarnings(uid) {
  try {
    const profile = await window.getUserProfile(uid);
    const earned  = profile?.totalEarnings || 0;
    if (DOM.earningsAmount) DOM.earningsAmount.textContent = `${CURRENCY}${fmtNum(earned)}`;
  } catch { /* silent */ }
}

// ================================================================
//  PROFILE – ORDERS LIST
// ================================================================
async function loadProfileOrders(uid) {
  if (!DOM.profileOrdersList) return;
  DOM.profileOrdersList.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  try {
    const orders = await window.getUserOrders(uid);
    if (!orders.length) {
      DOM.profileOrdersList.innerHTML = `
        <div class="empty-orders">
          <span class="material-icons-round">shopping_bag</span>
          <p>No orders yet. Start shopping!</p>
        </div>`;
      return;
    }
    DOM.profileOrdersList.innerHTML = '';
    orders.slice(0, 3).forEach(order => {
      DOM.profileOrdersList.appendChild(buildOrderMiniCard(order));
    });
  } catch {
    DOM.profileOrdersList.innerHTML = '<p style="padding:12px;color:var(--text-muted);font-size:.83rem;">Could not load orders.</p>';
  }
}

function buildOrderMiniCard(order) {
  const el   = document.createElement('div');
  el.className = 'order-mini-card';
  const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
  const statusLabel = formatStatus(order.status);
  el.innerHTML = `
    <div class="order-mini-top">
      <span class="order-mini-id">#${order.id.slice(0,8).toUpperCase()}</span>
      <span class="order-mini-amount">${CURRENCY}${fmtNum(order.total)}</span>
    </div>
    <p class="order-mini-date">${fmtDate(date)}</p>
    <span class="order-status-pill status-${order.status?.replace('_for_','')?.split('_')[0] || 'confirmed'}">${statusLabel}</span>`;
  el.addEventListener('click', () => openOrderStatusModal(order));
  return el;
}

DOM.viewOrdersBtn?.addEventListener('click', () => switchSection('orders'));

// ================================================================
//  ORDERS FULL PAGE
// ================================================================
async function loadOrdersPage() {
  if (!currentUser) {
    if (DOM.ordersAuthWarn)   DOM.ordersAuthWarn.style.display   = 'flex';
    if (DOM.ordersContainer)  DOM.ordersContainer.style.display  = 'none';
    return;
  }
  if (DOM.ordersAuthWarn)   DOM.ordersAuthWarn.style.display   = 'none';
  if (DOM.ordersContainer)  DOM.ordersContainer.style.display  = 'block';
  if (DOM.ordersFullList) {
    DOM.ordersFullList.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div><p>Loading orders…</p>
      </div>`;
  }
  try {
    const orders = await window.getUserOrders(currentUser.uid);
    if (!DOM.ordersFullList) return;
    if (!orders.length) {
      DOM.ordersFullList.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round empty-icon">shopping_bag</span>
          <p>No orders yet. Start shopping!</p>
          <button class="btn-primary" style="margin-top:16px;" onclick="switchSection('home')">
            <span class="material-icons-round">storefront</span> Shop Now
          </button>
        </div>`;
      return;
    }
    DOM.ordersFullList.innerHTML = '';
    orders.forEach(order => {
      DOM.ordersFullList.appendChild(buildOrderFullCard(order));
    });
  } catch {
    if (DOM.ordersFullList)
      DOM.ordersFullList.innerHTML = '<p style="padding:20px;color:var(--text-muted);">Could not load orders. Try again.</p>';
  }
}

function buildOrderFullCard(order) {
  const el   = document.createElement('div');
  el.className = 'order-full-card';
  const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
  const statusLabel = formatStatus(order.status);
  const itemsHTML = (order.items || []).map(i => `
    <div class="order-item-row">
      <img src="${i.image || 'https://via.placeholder.com/38'}" alt="${escHtml(i.title)}"
           onerror="this.src='https://via.placeholder.com/38'" />
      <span class="order-item-name">${escHtml(i.title)}</span>
      <span class="order-item-price">${CURRENCY}${fmtNum(i.price)}</span>
    </div>`).join('');
  el.innerHTML = `
    <div class="order-full-header">
      <span class="order-full-id">Order #${order.id.slice(0,8).toUpperCase()}</span>
      <span class="order-status-pill status-${(order.status||'confirmed').replace('_for_','').split('_')[0]}">${statusLabel}</span>
    </div>
    <div class="order-full-body">
      <p class="order-full-date">Placed on ${fmtDate(date)}</p>
      <div class="order-full-items">${itemsHTML}</div>
    </div>
    <div class="order-full-footer">
      <span class="order-full-amount">${CURRENCY}${fmtNum(order.total)}</span>
      <button class="btn-track-order" data-id="${order.id}">
        <span class="material-icons-round">local_shipping</span> Track
      </button>
    </div>`;
  el.querySelector('.btn-track-order')?.addEventListener('click', () => openOrderStatusModal(order));
  return el;
}

// ================================================================
//  ORDER STATUS MODAL (4-step tracker)
// ================================================================
const STATUS_STEPS = ['confirmed', 'shipped', 'out_for_delivery', 'delivered'];
const STEP_IDS     = ['step-confirmed','step-shipped','step-out','step-delivered'];

function openOrderStatusModal(order) {
  if (DOM.statusOrderId) DOM.statusOrderId.textContent = '#' + order.id.slice(0,8).toUpperCase();
  updateTrackerUI(order.status || 'confirmed');
  // Items mini list
  if (DOM.orderDetailsMini) {
    DOM.orderDetailsMini.innerHTML = (order.items || []).map(i => `
      <div class="order-detail-item">
        <img src="${i.image||'https://via.placeholder.com/40'}" alt="${escHtml(i.title)}"
             onerror="this.src='https://via.placeholder.com/40'" />
        <span>${escHtml(i.title)}</span>
        <span style="margin-left:auto;font-weight:700">${CURRENCY}${fmtNum(i.price)}</span>
      </div>`).join('');
  }
  openModal(DOM.orderStatusModal);
}

function updateTrackerUI(status) {
  const activeIdx = STATUS_STEPS.indexOf(status);
  STEP_IDS.forEach((id, i) => {
    const step = $(id);
    if (!step) return;
    step.classList.remove('done', 'active');
    if (i < activeIdx)  step.classList.add('done');
    if (i === activeIdx) step.classList.add('active');
  });
}

// ================================================================
//  UPI WITHDRAWAL
// ================================================================
DOM.withdrawBtn?.addEventListener('click', async () => {
  if (!currentUser) {
    showToast('⚠️ Please login first.', 'error');
    switchSection('profile');
    return;
  }
  const upi    = DOM.upiId?.value.trim();
  const amount = parseFloat(DOM.withdrawAmount?.value || 0);

  if (!upi || !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi)) {
    showToast('Please enter a valid UPI ID (e.g. name@upi)', 'error');
    return;
  }
  if (!amount || amount < 10) {
    showToast('Minimum withdrawal amount is ₹10.', 'error');
    return;
  }

  // Check user has enough earnings
  let earnings = 0;
  try {
    const profile = await window.getUserProfile(currentUser.uid);
    earnings = profile?.totalEarnings || 0;
  } catch {}
  if (amount > earnings) {
    showToast(`Insufficient balance. Available: ${CURRENCY}${fmtNum(earnings)}`, 'error');
    return;
  }

  showLoading('Submitting withdrawal request…');
  const userInfo = {
    name:  currentUser.displayName || '',
    email: currentUser.email || '',
    phone: currentUser.phoneNumber || '',
  };
  try {
    const result = await window.saveWithdrawalRequest(currentUser.uid, upi, amount, userInfo);
    if (result.success) {
      if (DOM.withdrawalSuccess) DOM.withdrawalSuccess.style.display = 'flex';
      if (DOM.withdrawalForm)    DOM.withdrawalForm.style.display    = 'none';
      showToast(`Withdrawal request of ${CURRENCY}${fmtNum(amount)} submitted!`, 'success');
    } else {
      showToast('Failed to submit request. Try again.', 'error');
    }
  } catch {
    showToast('Server error. Please try again.', 'error');
  } finally { hideLoading(); }
});

// ================================================================
//  PUBLISH FORM → WHATSAPP  (hardcoded admin: +919734398907)
// ================================================================
function initPublishForm() {
  // Show/hide publish form based on auth
  window.onAuthChange(user => {
    if (DOM.publishAuthWarn) DOM.publishAuthWarn.style.display  = user ? 'none'  : 'flex';
    if (DOM.publishFormWrap) DOM.publishFormWrap.style.display  = user ? 'block' : 'none';
  });

  // Custom size toggle
  DOM.bookSize?.addEventListener('change', () => {
    if (DOM.customSizeGroup)
      DOM.customSizeGroup.style.display = DOM.bookSize.value === 'Custom' ? 'block' : 'none';
  });

  // File upload UI
  DOM.bookPDF?.addEventListener('change', handleFileSelect);
  DOM.fileRemoveBtn?.addEventListener('click', clearFileSelection);

  // Drag & drop
  DOM.fileUploadZone?.addEventListener('dragover',  e => { e.preventDefault(); DOM.fileUploadZone.classList.add('dragover'); });
  DOM.fileUploadZone?.addEventListener('dragleave', () => DOM.fileUploadZone.classList.remove('dragover'));
  DOM.fileUploadZone?.addEventListener('drop', e => {
    e.preventDefault();
    DOM.fileUploadZone.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) displayFileInfo(file);
  });

  // Form submit → WhatsApp
  DOM.publishForm?.addEventListener('submit', handlePublishSubmit);
}

function handleFileSelect(e) {
  const file = e.target.files?.[0];
  if (file) displayFileInfo(file);
}

function displayFileInfo(file) {
  if (file.type !== 'application/pdf') {
    showToast('Only PDF files are accepted.', 'error');
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    showToast('File size must be under 50 MB.', 'error');
    return;
  }
  if (DOM.fileUploadContent) DOM.fileUploadContent.style.display = 'none';
  if (DOM.fileSelectedInfo)  DOM.fileSelectedInfo.style.display  = 'flex';
  if (DOM.fileSelectedName)  DOM.fileSelectedName.textContent    = file.name;
}

function clearFileSelection() {
  if (DOM.bookPDF) DOM.bookPDF.value = '';
  if (DOM.fileUploadContent) DOM.fileUploadContent.style.display = 'block';
  if (DOM.fileSelectedInfo)  DOM.fileSelectedInfo.style.display  = 'none';
  if (DOM.fileSelectedName)  DOM.fileSelectedName.textContent    = '';
}

function handlePublishSubmit(e) {
  e.preventDefault();

  // ── Auth check ──
  if (!currentUser) {
    if (DOM.publishAuthWarn) DOM.publishAuthWarn.style.display = 'flex';
    showToast('⚠️ আপনাকে প্রথমে Login করতে হবে!', 'error');
    return;
  }

  // ── Collect values ──
  const title    = DOM.bookTitle?.value.trim()  || '';
  const subtitle = DOM.bookSubtitle?.value.trim()|| '';
  const format   = document.querySelector('input[name="bookFormat"]:checked')?.value || 'Paperback';
  const sizeRaw  = DOM.bookSize?.value || '';
  const size     = sizeRaw === 'Custom'
                   ? (DOM.bookCustomSize?.value.trim() || 'Custom') : sizeRaw;
  const pages    = DOM.bookPages?.value.trim()  || '';
  const author   = DOM.bookAuthor?.value.trim() || '';
  const desc     = DOM.bookDesc?.value.trim()   || '';
  const pdfFile  = DOM.bookPDF?.files?.[0];
  const pdfInfo  = pdfFile
                   ? `${pdfFile.name} (${(pdfFile.size/1024/1024).toFixed(2)} MB)`
                   : 'No file uploaded';

  // ── Validate required fields ──
  const errs = [];
  if (!title)   errs.push({ el: DOM.bookTitle,  msg: 'Book title is required.' });
  if (!size)    errs.push({ el: DOM.bookSize,   msg: 'Please select a size.'   });
  if (!pages)   errs.push({ el: DOM.bookPages,  msg: 'Number of pages required.' });
  if (!author)  errs.push({ el: DOM.bookAuthor, msg: 'Author name is required.' });
  if (!pdfFile) errs.push({ el: DOM.fileUploadZone, msg: 'Please upload the book PDF.' });

  if (errs.length) {
    showToast(errs[0].msg, 'error');
    errs[0].el?.focus?.();
    errs[0].el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    return;
  }

  // ── Build WhatsApp message ──
  const userName  = currentUser.displayName || currentUser.phoneNumber || 'User';
  const userEmail = currentUser.email || 'N/A';

  const lines = [
    '📚 *New Book Publishing Request*',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `👤 *Publisher:* ${userName}`,
    `📧 *Email:* ${userEmail}`,
    '',
    `📖 *Title:* ${title}`,
    subtitle ? `📝 *Subtitle:* ${subtitle}` : '',
    `🗂️ *Format:* ${format}`,
    `📐 *Size:* ${size}`,
    `📄 *Pages:* ${pages}`,
    `✍️ *Author:* ${author}`,
    desc ? `🔖 *Description:* ${desc}` : '',
    '',
    `📁 *PDF File:* ${pdfInfo}`,
    '',
    '⚠️ _Note: PDF file must be sent separately._',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `🕐 *Submitted:* ${new Date().toLocaleString('en-IN')}`,
  ].filter(l => l !== '').join('\n');

  const encodedMsg = encodeURIComponent(lines);
  // CRITICAL: Always use the hardcoded admin number – NEVER from form input
  const waURL = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodedMsg}`;

  // ── Open WhatsApp ──
  showLoading('Opening WhatsApp…');
  setTimeout(() => {
    hideLoading();
    window.open(waURL, '_blank');
    showToast('✅ Opening WhatsApp! Please send the message.', 'success');
    DOM.publishForm?.reset();
    clearFileSelection();
    if (DOM.customSizeGroup) DOM.customSizeGroup.style.display = 'none';
  }, 600);
}

// ================================================================
//  UTILITY FUNCTIONS
// ================================================================
function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0, maximumFractionDigits: 2
  });
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function escHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str || ''));
  return div.innerHTML;
}

function formatStatus(s) {
  const map = {
    confirmed:        '✅ Confirmed',
    shipped:          '🚚 Shipped',
    out_for_delivery: '🛵 Out for Delivery',
    delivered:        '🏠 Delivered',
  };
  return map[s] || s;
}

// ================================================================
//  HERO CTA
// ================================================================
document.querySelectorAll('.hero-cta').forEach(btn =>
  btn.addEventListener('click', () => window.scrollTo({ top: 400, behavior: 'smooth' }))
);

// ================================================================
//  INIT APPLICATION
// ================================================================
function initApp() {
  // Apply saved theme first
  injectDarkModeCSS();
  applyTheme(isDarkMode);

  // Load cart from localStorage
  loadCart();

  // Init search
  initSearch();

  // Init auth listeners
  initAuth();

  // Init publish form
  initPublishForm();

  // Load home products
  loadProducts('all');

  // Set default active section
  switchSection('home');

  console.log('%c🛒 ShopBook App Ready', 'color:#f97316;font-weight:bold;font-size:14px;');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
