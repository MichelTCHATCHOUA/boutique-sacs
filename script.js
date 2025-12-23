// Configuration: set API_BASE to your backend origin (no trailing slash),
// or leave empty to use static mode (mailto for contact, localStorage cart).
const API_BASE = '';

function isStaticMode(){
  return !API_BASE;
}

function openMailTo(data){
  const to = 'contact@boutique-sacs.example';
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

  // BUY buttons
  document.querySelectorAll('.buy').forEach(btn=>{
    btn.addEventListener('click', async function(){
      const article = this.closest('.product');
      const title = article.querySelector('h4').textContent;
      const price = article.querySelector('.price').textContent.replace('€','').trim();

      if(isStaticMode()){
        // store in localStorage
        const cart = loadCartFromLocal();
        cart.items.push({ id: Date.now(), name: title, price: price });
        saveCartToLocal(cart);
        updateCartCount(cart.items.length);
        alert('Produit ajouté au panier (local).');
        return;
      }

      // Dynamic mode: POST to backend
      try{
        const res = await fetch(API_BASE + '/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: title, price: price })
        });
        if(res.ok){
          const json = await res.json();
          updateCartCount(json.count);
        } else {
          alert('Erreur lors de l\'ajout au panier.');
        }
      }catch(err){
        alert('Impossible de contacter le serveur. Le panier est hors-ligne.');
        console.error(err);
      }
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
