(() => {
  const items = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach((item) => observer.observe(item));

  // Subtle pointer depth effect. Only transforms the GPU-friendly console layer.
  const consoleCard = document.querySelector('.hero-console');
  if (consoleCard && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let raf = 0;
    let x = 0;
    let y = 0;
    const render = () => {
      raf = 0;
      consoleCard.style.transform = `perspective(1000px) rotateY(${x * 2.5 - 3}deg) rotateX(${y * -1.5 + 2}deg)`;
    };
    window.addEventListener('pointermove', (event) => {
      const rect = consoleCard.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      x = (event.clientX - innerWidth / 2) / innerWidth;
      y = (event.clientY - innerHeight / 2) / innerHeight;
      if (!raf) raf = requestAnimationFrame(render);
    }, { passive: true });
  }
})();
