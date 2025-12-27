// Configuration: set API_BASE to your backend origin (no trailing slash),
// or leave empty to use static mode (mailto for contact, localStorage cart).
const API_BASE = '';

function isStaticMode(){
  return !API_BASE;
}

// ========== LOYALTY PROGRAM MANAGEMENT ==========
function generateReferralCode(email){
  return 'DAP' + email.substring(0, 3).toUpperCase() + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function loadLoyaltyData(email){
  const data = JSON.parse(localStorage.getItem(`loyalty_${email}`)) || {
    points: 0,
    totalEarned: 0,
    totalSpent: 0,
    level: 'Bronze',
    purchases: 0,
    referralCode: generateReferralCode(email),
    referrals: [],
    referralBonusPoints: 0
  };
  return data;
}

function saveLoyaltyData(email, data){
  localStorage.setItem(`loyalty_${email}`, JSON.stringify(data));
}

function getLoyaltyLevel(points){
  if(points < 500) return 'Bronze';
  if(points < 1000) return 'Argent';
  return 'Or';
}

function getPointsMultiplier(level){
  if(level === 'Argent') return 1.5;
  if(level === 'Or') return 2;
  return 1;
}

function addLoyaltyPoints(email, amount, reason = 'achat'){
  const loyalty = loadLoyaltyData(email);
  const multiplier = getPointsMultiplier(loyalty.level);
  const pointsToAdd = Math.round(amount * multiplier);
  
  loyalty.points += pointsToAdd;
  loyalty.totalEarned += pointsToAdd;
  loyalty.level = getLoyaltyLevel(loyalty.points);
  
  if(reason === 'achat') loyalty.purchases += 1;
  
  saveLoyaltyData(email, loyalty);
  return pointsToAdd;
}

function redeemLoyaltyPoints(email, pointsToRedeem){
  const loyalty = loadLoyaltyData(email);
  if(loyalty.points >= pointsToRedeem){
    loyalty.points -= pointsToRedeem;
    loyalty.totalSpent += pointsToRedeem;
    saveLoyaltyData(email, loyalty);
    return true;
  }
  return false;
}

function addReferralBonus(email, referredEmail){
  const loyalty = loadLoyaltyData(email);
  
  // Check if already referred
  if(loyalty.referrals.includes(referredEmail)) return false;
  
  loyalty.referrals.push(referredEmail);
  loyalty.points += 50; // Bonus for referrer
  loyalty.totalEarned += 50;
  loyalty.referralBonusPoints += 50;
  loyalty.level = getLoyaltyLevel(loyalty.points);
  
  saveLoyaltyData(email, loyalty);
  
  // Give bonus to referred person
  const referredLoyalty = loadLoyaltyData(referredEmail);
  referredLoyalty.points += 30; // Bonus for referred
  referredLoyalty.totalEarned += 30;
  saveLoyaltyData(referredEmail, referredLoyalty);
  
  return true;
}

// Update phone code based on country selection
function updatePhoneCode(select){
  const code = select.value.split('|')[0];
  const phonePrefix = document.getElementById('phonePrefix');
  if(phonePrefix){
    phonePrefix.textContent = code;
  }
}

// ========== CART MANAGEMENT ==========
function loadCart(){
  try{
    return JSON.parse(localStorage.getItem('cart')) || { items: [] };
  }catch(e){ return { items: [] } }
}

function saveCart(cart){
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartUI();
}

function addToCart(productId, productName, productPrice, size, color, quantity=1){
  const cart = loadCart();
  const existingItem = cart.items.find(item => 
    item.id === productId && item.size === size && item.color === color
  );

  if(existingItem){
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      id: productId,
      name: productName,
      price: parseFloat(productPrice),
      size: size,
      color: color,
      quantity: quantity
    });
  }

  saveCart(cart);
}

function removeFromCart(index){
  const cart = loadCart();
  cart.items.splice(index, 1);
  saveCart(cart);
}

function updateCartItemQuantity(index, quantity){
  const cart = loadCart();
  if(quantity > 0){
    cart.items[index].quantity = quantity;
  } else {
    cart.items.splice(index, 1);
  }
  saveCart(cart);
}

function getCartTotal(){
  const cart = loadCart();
  return cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Pending cart item (for users who add to cart before logging in)
function savePendingCartItem(item){
  localStorage.setItem('pendingCartItem', JSON.stringify(item));
}

function getPendingCartItem(){
  try{
    return JSON.parse(localStorage.getItem('pendingCartItem')) || null;
  }catch(e){ return null }
}

function clearPendingCartItem(){
  localStorage.removeItem('pendingCartItem');
}

function updateCartUI(){
  const cart = loadCart();
  const cartBadge = document.getElementById('cartCount');
  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  if(cartBadge) cartBadge.textContent = totalItems;

  const cartItemsDiv = document.getElementById('cartItems');
  if(!cartItemsDiv) return;

  if(cart.items.length === 0){
    cartItemsDiv.innerHTML = '<p style="color:#999;text-align:center;padding:2rem">Votre panier est vide</p>';
    const cartSummary = document.getElementById('cartSummary');
    if(cartSummary) cartSummary.style.display = 'none';
    return;
  }

  cartItemsDiv.innerHTML = cart.items.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p style="color:#999;font-size:0.9rem">Couleur: <strong>${item.color}</strong> | Taille: <strong>${item.size}</strong></p>
        <p style="color:#0b1324;font-weight:700">€${item.price.toFixed(2)}</p>
      </div>
      <div class="cart-item-controls">
        <div class="quantity-control">
          <button onclick="updateQuantity(${idx}, ${item.quantity - 1})">−</button>
          <input type="number" value="${item.quantity}" min="1" onchange="updateQuantity(${idx}, this.value)">
          <button onclick="updateQuantity(${idx}, ${item.quantity + 1})">+</button>
        </div>
        <p style="font-weight:700;margin:0.5rem 0">€${(item.price * item.quantity).toFixed(2)}</p>
        <button class="btn-remove" onclick="removeItem(${idx})">Supprimer</button>
      </div>
    </div>
  `).join('');

  const cartSummary = document.getElementById('cartSummary');
  const subtotal = getCartTotal();
  if(cartSummary){
    cartSummary.style.display = 'block';
    document.getElementById('subtotal').textContent = '€' + subtotal.toFixed(2);
    document.getElementById('total').textContent = '€' + subtotal.toFixed(2);
  }
}

function updateQuantity(idx, newQty){
  updateCartItemQuantity(idx, parseInt(newQty));
}

function removeItem(idx){
  removeFromCart(idx);
}

function openCartModal(){
  const modal = document.getElementById('cartModal');
  if(modal){
    updateCartUI();
    modal.style.display = 'flex';
  }
}

function closeCartModal(){
  const modal = document.getElementById('cartModal');
  if(modal) modal.style.display = 'none';
}

function loadUsers(){
  try{
    return JSON.parse(localStorage.getItem('users')) || [];
  }catch(e){ return [] }
}

function saveUsers(users){
  localStorage.setItem('users', JSON.stringify(users));
}

function getCurrentUser(){
  try{
    return JSON.parse(localStorage.getItem('currentUser')) || null;
  }catch(e){ return null }
}

function setCurrentUser(user){
  localStorage.setItem('currentUser', JSON.stringify(user));
  updateUserUI();
}

function logout(){
  localStorage.removeItem('currentUser');
  updateUserUI();
  alert('Vous êtes déconnecté');
}

function updateUserUI(){
  const user = getCurrentUser();
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const loggedInView = document.getElementById('loggedInView');

  if(user){
    // User is logged in - show profile only
    if(loginTab) loginTab.style.display = 'none';
    if(registerTab) registerTab.style.display = 'none';
    if(loggedInView){
      loggedInView.style.display = 'block';
      document.getElementById('userDisplayName').textContent = user.name;
      document.getElementById('userDisplayEmail').textContent = user.email;
      document.getElementById('userDisplayCountry').textContent = user.country || 'Non spécifié';
      document.getElementById('userDisplayPhone').textContent = user.phone || 'Non spécifié';
      
      // Update loyalty info
      const loyalty = loadLoyaltyData(user.email);
      const loyaltyPoints = document.getElementById('loyaltyPoints');
      if(loyaltyPoints) loyaltyPoints.textContent = loyalty.points;
      
      const totalEarned = document.getElementById('totalPointsEarned');
      if(totalEarned) totalEarned.textContent = loyalty.totalEarned;
      
      const totalSpent = document.getElementById('totalPointsSpent');
      if(totalSpent) totalSpent.textContent = loyalty.totalSpent;
      
      const levelSpan = document.getElementById('loyaltyLevel');
      if(levelSpan) levelSpan.textContent = loyalty.level;
    }
    // Hide auth tabs
    const authTabs = document.querySelector('.auth-tabs');
    if(authTabs) authTabs.style.display = 'none';
  } else {
    // User not logged in - show login form and hide profile
    if(loggedInView) loggedInView.style.display = 'none';
    // Show auth tabs
    const authTabs = document.querySelector('.auth-tabs');
    if(authTabs) authTabs.style.display = 'flex';
    // Show login tab by default
    if(loginTab) loginTab.style.display = 'block';
    if(registerTab) registerTab.style.display = 'none';
  }
}

function openUserModal(){
  const modal = document.getElementById('userModal');
  if(modal){
    updateUserUI();
    modal.style.display = 'flex';
  }
}

function closeUserModal(){
  const modal = document.getElementById('userModal');
  if(modal) modal.style.display = 'none';
}

function switchAuthTab(tab){
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const tabs = document.querySelectorAll('.tab-btn');

  // Clear messages
  document.getElementById('loginMessage').innerHTML = '';
  document.getElementById('registerMessage').innerHTML = '';

  if(tab === 'login'){
    // Show login, hide register
    if(loginTab) loginTab.style.display = 'block';
    if(registerTab) registerTab.style.display = 'none';
    // Update button styling
    if(tabs[0]) tabs[0].classList.add('active');
    if(tabs[1]) tabs[1].classList.remove('active');
  } else if(tab === 'register'){
    // Show register, hide login
    if(loginTab) loginTab.style.display = 'none';
    if(registerTab) registerTab.style.display = 'block';
    // Update button styling
    if(tabs[0]) tabs[0].classList.remove('active');
    if(tabs[1]) tabs[1].classList.add('active');
  }
}

function openMailTo(data){
  const to = 'angepriscilledjougo40@gmail.com';
  const subject = encodeURIComponent(`Contact site: ${data.nom || 'Utilisateur'}`);
  const body = encodeURIComponent(`Nom: ${data.nom}\nEmail: ${data.email}\n\nMessage:\n${data.message}`);
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}

function loadCartFromLocal(){
  try{
    return JSON.parse(localStorage.getItem('cart')) || { items: [] };
  }catch(e){ return { items: [] } }
}
function saveCartToLocal(cart){ localStorage.setItem('cart', JSON.stringify(cart)); }
function updateCartCount(count){
  let el = document.getElementById('cartCount');
  if(!el){
    el = document.createElement('span');
    el.id = 'cartCount';
    el.style.marginLeft = '8px';
    el.style.fontWeight = '700';
    const link = document.createElement('a');
    link.href = '#';
    link.style.color = 'white';
    link.style.textDecoration = 'none';
    link.appendChild(document.createTextNode('Panier '));
    link.appendChild(el);
    document.querySelector('.nav-wrap').appendChild(link);
  }
  el.textContent = `(${count})`;
}

document.addEventListener('DOMContentLoaded', function(){
  // Scroll animations - fade in sections as they enter viewport
  const observerOptions = { threshold: 0.15 };
  const observer = new IntersectionObserver(function(entries){
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('fade-in');
      }
    });
  }, observerOptions);

  document.querySelectorAll('section').forEach(section=>{
    observer.observe(section);
  });

  // Parallax effect on hero and scroll
  window.addEventListener('scroll', function(){
    const hero = document.querySelector('.hero');
    if(hero){
      const scrollY = window.scrollY;
      hero.style.backgroundPosition = `center ${scrollY * 0.5}px`;
    }
  });

  // Animated counters
  const countersSection = document.getElementById('counters');
  let countersAnimated = false;

  const counterObserver = new IntersectionObserver(function(entries){
    entries.forEach(entry=>{
      if(entry.isIntersecting && !countersAnimated){
        countersAnimated = true;
        animateCounters();
      }
    });
  }, { threshold: 0.5 });

  if(countersSection){
    counterObserver.observe(countersSection);
  }

  function animateCounters(){
    const counters = document.querySelectorAll('.counter-number[data-target]');
    counters.forEach(counter=>{
      const target = parseInt(counter.dataset.target);
      const duration = 2000;
      const start = Date.now();

      function updateCounter(){
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(progress * target);
        counter.textContent = current + (target > 10 ? '+' : '');

        if(progress < 1){
          requestAnimationFrame(updateCounter);
        } else {
          counter.textContent = target + (target > 10 ? '+' : '');
        }
      }
      updateCounter();
    });
  }

  const contactForm = document.getElementById('contactForm');
  if(contactForm){
    contactForm.addEventListener('submit', async function(e){
      e.preventDefault();
      const formData = new FormData(this);
      const data = Object.fromEntries(formData.entries());

      if(isStaticMode()){
        // Fallback: open the user's mail client with prefilled message
        openMailTo(data);
        this.reset();
        return;
      }

      // Dynamic mode: POST to backend
      try{
        const res = await fetch(API_BASE + '/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if(res.ok){
          alert('Merci ! Votre message a été envoyé.');
          this.reset();
        } else {
          alert('Une erreur est survenue lors de l\'envoi.');
        }
      }catch(err){
        alert('Impossible de contacter le serveur.');
        console.error(err);
      }
    });
  }

  // BUY buttons - open modal instead of direct add
  document.querySelectorAll('.buy').forEach(btn=>{
    btn.addEventListener('click', function(e){
      e.preventDefault();
      const article = this.closest('.product');
      const id = article.dataset.id;
      const name = article.dataset.name;
      const price = article.dataset.price;
      const description = article.dataset.description;
      const img = article.querySelector('img').src;

      openProductModal(id, name, price, description, img);
    });
  });

  // Product images - also open modal on click
  document.querySelectorAll('.product img').forEach(img=>{
    img.addEventListener('click', function(){
      const article = this.closest('.product');
      const id = article.dataset.id;
      const name = article.dataset.name;
      const price = article.dataset.price;
      const description = article.dataset.description;
      const imgSrc = this.src;

      openProductModal(id, name, price, description, imgSrc);
    });
  });

  // Initialize cart count
  if(isStaticMode()){
    const cart = loadCartFromLocal();
    updateCartCount(cart.items.length);
  } else {
    // dynamic: try to fetch server cart
    (async function(){
      try{
        const res = await fetch(API_BASE + '/api/cart');
        if(res.ok){
          const json = await res.json();
          updateCartCount(json.items.length || 0);
        }
      }catch(e){ /* ignore */ }
    })();
  }
});

// Carousel: auto-scroll, arrows, pause on hover
document.addEventListener('DOMContentLoaded', function(){
  const carousel = document.getElementById('heroCarousel');
  if(!carousel) return;
  const slides = Array.from(carousel.querySelectorAll('.slide'));
  const nextBtn = carousel.querySelector('.next');
  const prevBtn = carousel.querySelector('.prev');
  let current = slides.findIndex(s=>s.classList.contains('active')) || 0;
  const total = slides.length;
  const interval = 4500;
  let timer = null;

  function goTo(index){
    slides.forEach((s,i)=> s.classList.toggle('active', i===index));
    current = index;
  }
  function next(){ goTo((current+1) % total); }
  function prev(){ goTo((current-1+total) % total); }
  function start(){ stop(); timer = setInterval(next, interval); }
  function stop(){ if(timer) clearInterval(timer); timer = null; }
  function reset(){ start(); }

  nextBtn && nextBtn.addEventListener('click', ()=>{ next(); reset(); });
  prevBtn && prevBtn.addEventListener('click', ()=>{ prev(); reset(); });

  carousel.addEventListener('mouseenter', stop);
  carousel.addEventListener('mouseleave', start);

  // keyboard navigation
  document.addEventListener('keydown', function(e){
    if(document.activeElement && (document.activeElement.tagName==='INPUT' || document.activeElement.tagName==='TEXTAREA')) return;
    if(e.key === 'ArrowRight') { next(); reset(); }
    if(e.key === 'ArrowLeft') { prev(); reset(); }
  });

  // start auto-scroll
  start();
});

// Product Modal Functions
function openProductModal(id, name, price, description, img){
  const modal = document.getElementById('productModal');
  document.getElementById('modalTitle').textContent = name;
  document.getElementById('modalDescription').textContent = description;
  document.getElementById('modalPrice').textContent = '€' + price;
  document.getElementById('modalImage').src = img;
  
  // Reset selections
  document.querySelectorAll('.color-btn').forEach(btn=>btn.classList.remove('selected'));
  document.querySelectorAll('.size-btn').forEach(btn=>btn.classList.remove('selected'));
  document.getElementById('colorError').style.display = 'none';
  document.getElementById('sizeError').style.display = 'none';
  
  // Store product data
  modal.dataset.productId = id;
  modal.dataset.productName = name;
  modal.dataset.productPrice = price;
  
  modal.style.display = 'flex';
}

function closeProductModal(){
  const modal = document.getElementById('productModal');
  modal.style.display = 'none';
}

function openSizeGuide(){
  const modal = document.getElementById('sizeGuideModal');
  if(modal) modal.style.display = 'flex';
}

function closeSizeGuide(){
  const modal = document.getElementById('sizeGuideModal');
  if(modal) modal.style.display = 'none';
}

function openLoyaltyModal(){
  const user = getCurrentUser();
  if(!user) return;
  
  const modal = document.getElementById('loyaltyModal');
  if(modal){
    const loyalty = loadLoyaltyData(user.email);
    document.getElementById('modalPoints').textContent = loyalty.points;
    document.getElementById('modalLevel').textContent = loyalty.level;
    document.getElementById('modalPurchases').textContent = loyalty.purchases;
    modal.style.display = 'flex';
  }
}

function closeLoyaltyModal(){
  const modal = document.getElementById('loyaltyModal');
  if(modal) modal.style.display = 'none';
}

function openReferralModal(){
  const user = getCurrentUser();
  if(!user) return;
  
  const modal = document.getElementById('referralModal');
  if(modal){
    const loyalty = loadLoyaltyData(user.email);
    document.getElementById('referralCode').value = loyalty.referralCode;
    document.getElementById('referralCount').textContent = loyalty.referrals.length;
    document.getElementById('referralBonusPoints').textContent = loyalty.referralBonusPoints;
    
    // Update referral history
    const historyList = document.getElementById('referralHistoryList');
    if(loyalty.referrals.length > 0){
      historyList.innerHTML = loyalty.referrals.map((email, idx) => 
        `<div style="padding:0.8rem;border-bottom:1px solid #e6e9f2"><div style="color:#0b1324;font-weight:700">${idx+1}. ${email}</div><div style="color:#999;font-size:0.85rem">+50 points gagnés</div></div>`
      ).join('');
    } else {
      historyList.innerHTML = '<p style="color:#999;text-align:center;padding:1rem">Aucun parrainage pour le moment</p>';
    }
    
    modal.style.display = 'flex';
  }
}

function closeReferralModal(){
  const modal = document.getElementById('referralModal');
  if(modal) modal.style.display = 'none';
}

function copyReferralCode(){
  const code = document.getElementById('referralCode').value;
  navigator.clipboard.writeText(code).then(() => {
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '✓ Copié !';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  });
}

function redeemPoints(pointsAmount){
  const user = getCurrentUser();
  if(!user) return;
  
  if(redeemLoyaltyPoints(user.email, pointsAmount)){
    updateUserUI();
    alert(`✓ ${pointsAmount} points convertis avec succès !`);
    closeLoyaltyModal();
  } else {
    alert(`❌ Vous n'avez pas assez de points. Il vous en manque ${pointsAmount - loadLoyaltyData(user.email).points}`);
  }
}

function openCheckoutModal(){
  const user = getCurrentUser();
  if(!user){
    alert('Veuillez vous connecter pour continuer.');
    openUserModal();
    return;
  }
  const modal = document.getElementById('checkoutModal');
  if(modal){
    modal.style.display = 'flex';
    updateCheckoutReview();
  }
}

function closeCheckoutModal(){
  const modal = document.getElementById('checkoutModal');
  if(modal) modal.style.display = 'none';
}

function switchCheckoutTab(tab){
  // Hide all tabs
  document.getElementById('shippingTab').style.display = 'none';
  document.getElementById('paymentTab').style.display = 'none';
  document.getElementById('reviewTab').style.display = 'none';
  
  // Remove active from all buttons
  document.querySelectorAll('.checkout-tab-btn').forEach(btn => btn.classList.remove('active'));
  
  // Show selected tab
  const selectedTab = document.getElementById(tab + 'Tab');
  if(selectedTab) selectedTab.style.display = 'block';
  
  // Add active to clicked button
  event.target.classList.add('active');
}

function updateCheckoutReview(){
  const cart = loadCart();
  const total = getCartTotal();
  document.getElementById('reviewSubtotal').textContent = '€' + total;
  document.getElementById('reviewTotal').textContent = '€' + total;
}

function completeCheckout(){
  const paymentForm = document.getElementById('paymentForm');
  const shippingForm = document.getElementById('shippingForm');
  
  // Validate forms
  if(!shippingForm.checkValidity() || !paymentForm.checkValidity()){
    alert('Veuillez remplir tous les champs requis.');
    return;
  }
  
  // Get card number and mask it
  const cardInput = paymentForm.querySelector('input[type="text"]');
  const cardNumber = cardInput.value.replace(/\s/g, '');
  
  if(cardNumber.length < 13){
    alert('Numéro de carte invalide.');
    return;
  }
  
  // Process checkout
  const user = getCurrentUser();
  const cart = loadCart();
  const total = getCartTotal();
  
  // Create order object
  const order = {
    orderId: 'DAP-' + Date.now(),
    userId: user.email,
    items: cart,
    total: total,
    date: new Date().toLocaleDateString('fr-FR'),
    status: 'completed'
  };
  
  // Save order (in real app, would send to backend)
  let orders = JSON.parse(localStorage.getItem('orders')) || [];
  orders.push(order);
  localStorage.setItem('orders', JSON.stringify(orders));
  
  // Add loyalty points for purchase
  const pointsEarned = addLoyaltyPoints(user.email, total, 'achat');
  
  // Clear cart
  localStorage.removeItem('cart');
  
  // Show success message with loyalty points
  const modal = document.getElementById('checkoutModal');
  const content = modal.querySelector('.modal-content');
  content.innerHTML = `
    <button class="modal-close" onclick="closeCheckoutModal()">&times;</button>
    <div style="text-align:center;padding:2rem">
      <div style="font-size:3rem;margin-bottom:1rem">✓</div>
      <h2 style="color:#4ade80;margin:0 0 1rem 0">Commande confirmée !</h2>
      <p style="color:#556;margin:0 0 1rem 0">Merci pour votre achat.</p>
      <p style="color:#999;font-size:0.9rem;margin:0 0 1rem 0">Numéro de commande: <strong>${order.orderId}</strong></p>
      <div style="background:linear-gradient(135deg,#6c5ce7,#00b4d8);color:#fff;padding:1rem;border-radius:10px;margin:1rem 0">
        <p style="margin:0;font-size:0.9rem">🎁 Vous avez gagné</p>
        <p style="margin:0.5rem 0 0 0;font-size:1.8rem;font-weight:900">${pointsEarned} points</p>
      </div>
      <p style="color:#556;margin:1.5rem 0">Un email de confirmation a été envoyé à ${user.email}</p>
      <button onclick="location.href='#sacs'; closeCheckoutModal()" class="btn-next" style="width:100%">Retour à la boutique</button>
    </div>
  `;
  
  // Reset cart UI after a delay
  setTimeout(() => {
    updateCartUI();
  }, 2000);
}

// Size button selection
document.addEventListener('DOMContentLoaded', function(){
  // Color button selection
  document.querySelectorAll('.color-btn').forEach(btn=>{
    btn.addEventListener('click', function(){
      document.querySelectorAll('.color-btn').forEach(b=>b.classList.remove('selected'));
      this.classList.add('selected');
      document.getElementById('colorError').style.display = 'none';
    });
  });

  // Size button selection
  document.querySelectorAll('.size-btn').forEach(btn=>{
    btn.addEventListener('click', function(){
      document.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('selected'));
      this.classList.add('selected');
      document.getElementById('sizeError').style.display = 'none';
    });
  });

  // Add to cart from modal
  const modalAddBtn = document.getElementById('modalAddToCart');
  if(modalAddBtn){
    modalAddBtn.addEventListener('click', async function(){
      const modal = document.getElementById('productModal');
      const selectedColor = document.querySelector('.color-btn.selected');
      const selectedSize = document.querySelector('.size-btn.selected');
      
      if(!selectedColor){
        document.getElementById('colorError').style.display = 'block';
        return;
      }

      if(!selectedSize){
        document.getElementById('sizeError').style.display = 'block';
        return;
      }

      const color = selectedColor.dataset.color;
      const size = selectedSize.dataset.size;
      const productId = modal.dataset.productId;
      const productName = modal.dataset.productName;
      const productPrice = modal.dataset.productPrice;

      // Check if user is logged in
      const user = getCurrentUser();
      
      if(!user){
        // User not logged in - save pending item and open user modal
        savePendingCartItem({
          id: productId,
          name: productName,
          price: productPrice,
          size: size,
          color: color
        });
        
        closeProductModal();
        alert('Veuillez vous connecter ou créer un compte pour ajouter des articles à votre panier.');
        openUserModal();
        return;
      }

      // User is logged in - add to cart directly
      addToCart(productId, productName, productPrice, size, color, 1);
      alert(`${productName} (Couleur ${color}, Taille ${size}) ajouté au panier.`);
      closeProductModal();
    });
  }
});

// Close modal when clicking overlay
document.addEventListener('DOMContentLoaded', function(){
  const modalOverlay = document.querySelector('.modal-overlay');
  if(modalOverlay){
    modalOverlay.addEventListener('click', closeProductModal);
  }

  // Login form
  const loginForm = document.getElementById('loginForm');
  if(loginForm){
    loginForm.addEventListener('submit', function(e){
      e.preventDefault();
      const email = this.querySelector('input[type="email"]').value;
      const password = this.querySelector('input[type="password"]').value;
      
      const users = loadUsers();
      const user = users.find(u => u.email === email && u.password === password);

      if(user){
        setCurrentUser({ name: `${user.firstName} ${user.lastName}`, email: user.email, country: user.country, phone: user.phone });
        this.reset();
        document.getElementById('loginMessage').innerHTML = '<p style="color:green">✓ Connecté avec succès</p>';
        
        // Check for pending cart item
        const pendingItem = getPendingCartItem();
        if(pendingItem){
          addToCart(pendingItem.id, pendingItem.name, pendingItem.price, pendingItem.size, pendingItem.color, 1);
          clearPendingCartItem();
          alert(`${pendingItem.name} a été ajouté à votre panier!`);
        }
        
        setTimeout(() => closeUserModal(), 1000);
      } else {
        document.getElementById('loginMessage').innerHTML = '<p style="color:red">Email ou mot de passe incorrect</p>';
      }
    });
  }

  // Register form
  const registerForm = document.getElementById('registerForm');
  if(registerForm){
    registerForm.addEventListener('submit', function(e){
      e.preventDefault();
      console.log('Registration form submitted');
      
      try {
        // Get form inputs by specific selectors
        const firstName = this.querySelector('input[type="text"]').value.trim();
        const lastNameInput = this.querySelectorAll('input[type="text"]');
        const lastName = lastNameInput[1].value.trim();
        const email = this.querySelector('input[type="email"]').value.trim();
        const select = this.querySelector('select');
        const countryValue = select.value;
        const phone = this.querySelector('input[type="tel"]').value.trim();
        const passwordInputs = this.querySelectorAll('input[type="password"]');
        const password = passwordInputs[0].value;
        const confirmPassword = passwordInputs[1].value;

        console.log('Form values:', { firstName, lastName, email, countryValue, phone });

        if(!firstName){
          document.getElementById('registerMessage').innerHTML = '<p style="color:red">Le prénom est requis</p>';
          return;
        }

        if(!lastName){
          document.getElementById('registerMessage').innerHTML = '<p style="color:red">Le nom est requis</p>';
          return;
        }

        if(!email){
          document.getElementById('registerMessage').innerHTML = '<p style="color:red">L\'email est requis</p>';
          return;
        }

        if(!countryValue || !countryValue.includes('|')){
          document.getElementById('registerMessage').innerHTML = '<p style="color:red">Veuillez sélectionner un pays</p>';
          return;
        }

        if(!phone){
          document.getElementById('registerMessage').innerHTML = '<p style="color:red">Le numéro de téléphone est requis</p>';
          return;
        }

        if(!password || password.length < 6){
          document.getElementById('registerMessage').innerHTML = '<p style="color:red">Le mot de passe doit faire au moins 6 caractères</p>';
          return;
        }

        if(password !== confirmPassword){
          document.getElementById('registerMessage').innerHTML = '<p style="color:red">Les mots de passe ne correspondent pas</p>';
          return;
        }

        const countryCode = countryValue.split('|')[0];
        const countryName = countryValue.split('|')[1];

        const users = loadUsers();
        if(users.find(u => u.email === email)){
          document.getElementById('registerMessage').innerHTML = '<p style="color:red">Cet email est déjà utilisé</p>';
          return;
        }

        // Store full phone with country code
        const fullPhone = countryCode + phone;

        users.push({ 
          firstName, 
          lastName, 
          email, 
          country: countryName,
          phone: fullPhone, 
          password 
        });
        saveUsers(users);
        setCurrentUser({ name: `${firstName} ${lastName}`, email, country: countryName, phone: fullPhone });
        
        // Initialize loyalty program for new user
        loadLoyaltyData(email);
        
        this.reset();
        document.getElementById('registerMessage').innerHTML = '<p style="color:green">✓ Inscription réussie, bienvenue!</p>';
        
        // Update UI immediately
        updateUserUI();
        
        // Check for pending cart item
        const pendingItem = getPendingCartItem();
        if(pendingItem){
          addToCart(pendingItem.id, pendingItem.name, pendingItem.price, pendingItem.size, pendingItem.color, 1);
          clearPendingCartItem();
          setTimeout(() => {
            closeUserModal();
            alert(`${pendingItem.name} a été ajouté à votre panier! Continuez vos achats.`);
          }, 500);
        } else {
          setTimeout(() => {
            closeUserModal();
          }, 1000);
        }
      } catch(error) {
        console.error('Registration error:', error);
        document.getElementById('registerMessage').innerHTML = '<p style="color:red">Erreur lors de l\'inscription: ' + error.message + '</p>';
      }
    });
  }
  // Initialize cart and user UI
  updateCartUI();
  updateUserUI();

  // Scroll progress bar
  window.addEventListener('scroll', () => {
    const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    const progressBar = document.querySelector('.scroll-progress');
    if(progressBar) progressBar.style.width = scrollPercentage + '%';
  });

  // Newsletter form
  const newsletterForm = document.getElementById('newsletterForm');
  if(newsletterForm){
    newsletterForm.addEventListener('submit', function(e){
      e.preventDefault();
      const email = this.querySelector('input[type="email"]').value;
      const button = this.querySelector('button');
      const originalText = button.textContent;
      button.textContent = '✓ Merci de votre inscription !';
      button.style.background = '#4ade80';
      this.reset();
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '#fff';
      }, 3000);
    });
  }

  // Filter and Search Functions
  window.filterProducts = function(){
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const sortSelect = document.getElementById('sortSelect').value;
    const priceRange = parseInt(document.getElementById('priceRange').value);
    const typeFilters = Array.from(document.querySelectorAll('.filter-type:checked')).map(el => el.value);
    const materialFilters = Array.from(document.querySelectorAll('.filter-material:checked')).map(el => el.value);
    
    // Update price display
    document.getElementById('priceValue').textContent = priceRange;
    
    let products = Array.from(document.querySelectorAll('.product'));
    
    // Filter products
    products = products.filter(product => {
      const name = product.dataset.name.toLowerCase();
      const price = parseInt(product.dataset.price);
      const type = product.dataset.type;
      const material = product.dataset.material;
      
      // Search filter
      const matchSearch = name.includes(searchInput);
      
      // Price filter
      const matchPrice = price <= priceRange;
      
      // Type filter
      const matchType = typeFilters.length === 0 || typeFilters.includes(type);
      
      // Material filter
      const matchMaterial = materialFilters.length === 0 || materialFilters.includes(material);
      
      return matchSearch && matchPrice && matchType && matchMaterial;
    });
    
    // Sort products
    if(sortSelect === 'price-asc'){
      products.sort((a, b) => parseInt(a.dataset.price) - parseInt(b.dataset.price));
    } else if(sortSelect === 'price-desc'){
      products.sort((a, b) => parseInt(b.dataset.price) - parseInt(a.dataset.price));
    } else if(sortSelect === 'popular'){
      products.sort((a, b) => parseInt(b.dataset.popularity) - parseInt(a.dataset.popularity));
    } else if(sortSelect === 'newest'){
      products.sort((a, b) => parseInt(b.dataset.id) - parseInt(a.dataset.id));
    }
    
    // Update display
    const container = document.querySelector('.products');
    container.innerHTML = '';
    
    if(products.length === 0){
      container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:2rem">Aucun produit ne correspond à vos critères</p>';
    } else {
      products.forEach(product => {
        container.appendChild(product);
        // Re-attach event listeners
        product.querySelector('img').onclick = () => openProductModal(parseInt(product.dataset.id), product.dataset.name, product.dataset.price, product.dataset.description);
        product.querySelector('.buy').onclick = () => openProductModal(parseInt(product.dataset.id), product.dataset.name, product.dataset.price, product.dataset.description);
      });
    }
  };

  window.resetFilters = function(){
    document.getElementById('searchInput').value = '';
    document.getElementById('sortSelect').value = 'popular';
    document.getElementById('priceRange').value = 200;
    document.getElementById('priceValue').textContent = 200;
    document.querySelectorAll('.filter-type').forEach(el => el.checked = false);
    document.querySelectorAll('.filter-material').forEach(el => el.checked = false);
    filterProducts();
  };
});

