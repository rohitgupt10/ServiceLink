document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.querySelector('#mobile-menu-button');
  const mobileMenu = document.querySelector('#mobile-menu');
  menuButton?.addEventListener('click', () => {
    mobileMenu?.classList.toggle('hidden');
    menuButton.setAttribute('aria-expanded', String(!mobileMenu?.classList.contains('hidden')));
  });

  const slides = [...document.querySelectorAll('[data-carousel-slide]')];
  const dots = [...document.querySelectorAll('[data-carousel-dot]')];
  let currentSlide = 0;
  let carouselTimer;
  const showSlide = (index) => {
    if (!slides.length) return;
    currentSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === currentSlide;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === currentSlide));
  };
  const restartCarousel = () => {
    window.clearInterval(carouselTimer);
    if (slides.length > 1) carouselTimer = window.setInterval(() => showSlide(currentSlide + 1), 5000);
  };
  document.querySelector('[data-carousel-previous]')?.addEventListener('click', () => { showSlide(currentSlide - 1); restartCarousel(); });
  document.querySelector('[data-carousel-next]')?.addEventListener('click', () => { showSlide(currentSlide + 1); restartCarousel(); });
  dots.forEach((dot) => dot.addEventListener('click', () => { showSlide(Number(dot.dataset.carouselDot)); restartCarousel(); }));
  restartCarousel();

  const serviceFallback = '/images/service-placeholder.svg';
  const avatarFallback = '/images/default-avatar.svg';
  const applyImageFallback = (image) => {
    if (image.dataset.fallbackApplied === 'true') return;
    image.dataset.fallbackApplied = 'true';
    const isServiceImage = image.closest('.service-image, .detail-image, .booking-item, .checkout-summary, .receipt-service, .service-cell, .review-images');
    image.src = isServiceImage ? serviceFallback : avatarFallback;
  };
  document.querySelectorAll('img').forEach((image) => {
    image.addEventListener('error', () => applyImageFallback(image));
    if (image.complete && image.naturalWidth === 0) applyImageFallback(image);
  });
  document.addEventListener('error', (event) => {
    if (event.target instanceof HTMLImageElement) applyImageFallback(event.target);
  }, true);

  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.min) input.min = new Date().toISOString().split('T')[0];
  });
  document.querySelectorAll('[data-confirm]').forEach((button) => button.addEventListener('click', (event) => {
    if (!window.confirm(button.dataset.confirm)) event.preventDefault();
  }));
  document.querySelectorAll('[data-dialog-open]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.dialogOpen)?.showModal()));
  document.querySelectorAll('[data-dialog-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog')?.close()));
  document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
    const input = document.querySelector('#cardNumber');
    if (input) input.value = button.dataset.copy.replace(/(.{4})/g, '$1 ').trim();
    try { await navigator.clipboard.writeText(button.dataset.copy); } catch { /* Filling the field is enough. */ }
    button.textContent = 'Test card added';
  }));
  document.querySelectorAll('.favorite-btn').forEach((button) => button.addEventListener('click', async () => {
    const saved = button.dataset.favorited === 'true';
    const response = await fetch(`/api/favorites/${saved ? 'remove' : 'add'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceId: button.dataset.serviceId }) });
    if (response.ok) { button.dataset.favorited = String(!saved); button.textContent = saved ? '♡' : '♥'; }
  }));
  const detailFavorite = document.querySelector('#favoriteButton');
  detailFavorite?.addEventListener('click', async () => {
    const saved = detailFavorite.dataset.favorited === 'true';
    const response = await fetch(`/api/favorites/${saved ? 'remove' : 'add'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceId: detailFavorite.dataset.id }) });
    if (response.ok) { detailFavorite.dataset.favorited = String(!saved); detailFavorite.textContent = saved ? '♡ Save' : '♥ Saved'; }
  });
});

const nativeFetch = window.fetch.bind(window);
window.fetch = (input, options = {}) => {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('X-CSRF-Token', document.querySelector('meta[name="csrf-token"]')?.content || '');
  return nativeFetch(input, { ...options, headers });
};
