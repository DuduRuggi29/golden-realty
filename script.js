/* =========================================================
   Golden Realty — interações e animações
   ========================================================= */
const CONFIG = {
  email: 'atendimento@goldenrealty.com.br',
  framesDir: 'assets/frames',   // quadros do vídeo (computador): f000.webp … f140.webp
  frames: 141,
  framesDirM: 'assets/frames-m',// versão leve para celular: f000.webp … f084.webp
  framesM: 85
};

const PROJECTS = [
  { nome: 'The One',                             capa: 'theone-1', fotos: ['theone-1', 'theone-2'], size: 's12' },
  { nome: 'Île de La Cité',                      capa: 'ile-2',    fotos: ['ile-2', 'ile-1'],       size: 's5' },
  { nome: 'Vivant',                              capa: 'vivant-1', fotos: ['vivant-1', 'vivant-2'], size: 's7' },
  { nome: 'Prêt-à-Porter',                       capa: 'pret-2',   fotos: ['pret-2', 'pret-1'],     size: 's7' },
  { nome: 'Miraggio Charitas 2',                 capa: 'miraggio-1', fotos: ['miraggio-1', 'miraggio-2'], size: 's5' },
  { nome: 'Condomínio Vela Mar',                 capa: 'velamar-2', fotos: ['velamar-2', 'velamar-1'], size: 's6' },
  { nome: 'Condomínio Geribá President Service', capa: 'geriba-1', fotos: ['geriba-1', 'geriba-2'], size: 's6' }
];

(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mqWide = matchMedia('(min-width: 901px)');
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const img = n => `assets/img/${n}.webp`;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  $('.year').textContent = new Date().getFullYear();

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------------- portfólio (gerado a partir de PROJECTS) ---------------- */
  const grid = $('#projectGrid');
  grid.innerHTML = PROJECTS.map((p, i) => `
    <article class="card ${p.size}" tabindex="0" role="button" data-i="${i}" data-cursor="Ver" aria-label="Ver imagens de ${p.nome}">
      <img src="${img(p.capa)}" alt="${p.nome}" loading="lazy" decoding="async">
      <div class="card-info">
        <div><span class="card-num">${String(i + 1).padStart(2, '0')}</span><h3>${p.nome}</h3></div>
        <span class="card-more"><span>Conheça o imóvel</span> <svg><use href="#arrow"/></svg></span>
      </div>
      <div class="card-reveal"></div>
    </article>`).join('');
  $('#empSelect').insertAdjacentHTML('beforeend', PROJECTS.map(p => `<option>${p.nome}</option>`).join(''));

  /* ---------------- divisão de textos em palavras ---------------- */
  function split(el) {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) return f.appendChild(document.createTextNode(' '));
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('span'); i.className = 'wi'; i.textContent = part;
          w.appendChild(i); f.appendChild(w);
        });
        n.replaceWith(f);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
    walk(el);
    return $$('.wi', el);
  }
  const words = new Map();
  $$('[data-split], [data-scrub-words], .foot-word').forEach(el => words.set(el, split(el)));

  /* ---------------- smooth scroll ---------------- */
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollToHash = h => {
    const t = h === '#inicio' ? null : $(h);
    if (h !== '#inicio' && !t) return;
    const y = t ? t.getBoundingClientRect().top + window.scrollY - (h === '#inicio' ? 0 : 70) : 0;
    if (lenis) lenis.scrollTo(y, { duration: 2.2, easing: x => 1 - Math.pow(1 - x, 4) });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  };
  $$('[data-link]').forEach(a => a.addEventListener('click', e => {
    const h = a.getAttribute('href');
    if (!h || h[0] !== '#') return;
    e.preventDefault(); closeMenu(); scrollToHash(h);
  }));

  /* ---------------- menu mobile ---------------- */
  const burger = $('.burger');
  function closeMenu() {
    if (!document.body.classList.contains('menu-open')) return;
    document.body.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    $('.mobile-menu').setAttribute('aria-hidden', 'true');
    lenis && lenis.start();
  }
  burger.addEventListener('click', () => {
    if (document.body.classList.contains('menu-open')) return closeMenu();
    document.body.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
    $('.mobile-menu').setAttribute('aria-hidden', 'false');
    lenis && lenis.stop();
    gsap.fromTo('.mobile-menu nav a', { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07, duration: 1, ease: 'expo.out', delay: 0.2 });
  });

  /* =========================================================
     HERO — vídeo em tela cheia, controlado pelo scroll
     ========================================================= */
  const stage = $('.hero-stage');
  const canvas = $('#heroCanvas'), ctx = canvas.getContext('2d');
  const light = isTouch || !mqWide.matches;               // celular: quadros menores
  const N = light ? CONFIG.framesM : CONFIG.frames;
  const DIR = light ? CONFIG.framesDirM : CONFIG.framesDir;
  const frames = [];
  const H = { p: 0, m: 0, intro: 1.12 };
  let dirty = true, lastKey = '';

  function nearest(p) {
    const i = Math.round(clamp(p, 0, 1) * (N - 1));
    if (frames[i]) return [frames[i], i];
    for (let d = 1; d < N; d++) { if (frames[i - d]) return [frames[i - d], i - d]; if (frames[i + d]) return [frames[i + d], i + d]; }
    return [null, -1];
  }

  // área ocupada pelo vídeo: tela cheia → card (à direita no PC, no topo no celular)
  function videoRect(W, Hh) {
    const m = H.m;
    const end = mqWide.matches
      ? { x: W * 0.52, y: Hh * 0.13, w: W * 0.43, h: Hh * 0.74 }
      : { x: W * 0.06, y: Hh * 0.11, w: W * 0.88, h: Hh * 0.35 };
    return { x: lerp(0, end.x, m), y: lerp(0, end.y, m), w: lerp(W, end.w, m), h: lerp(Hh, end.h, m), r: 20 * m };
  }

  function draw() {
    const W = canvas.width, Hh = canvas.height;
    const [f, idx] = nearest(H.p);
    const R = videoRect(W, Hh);
    const key = `${idx}|${R.x.toFixed(1)}|${R.y.toFixed(1)}|${R.w.toFixed(1)}|${R.h.toFixed(1)}|${H.intro.toFixed(4)}|${W}|${Hh}`;
    if (key === lastKey) return;
    lastKey = key;
    ctx.fillStyle = '#08121F';
    ctx.fillRect(0, 0, W, Hh);
    if (!f) return;
    const s = Math.max(R.w / f.width, R.h / f.height) * H.intro;
    const dw = f.width * s, dh = f.height * s;
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect && R.r > 0.5) ctx.roundRect(R.x, R.y, R.w, R.h, R.r); else ctx.rect(R.x, R.y, R.w, R.h);
    ctx.clip();
    ctx.drawImage(f, R.x + (R.w - dw) / 2, R.y + (R.h - dh) / 2, dw, dh);
    ctx.restore();
  }

  // resolução 1x: o vídeo-fonte tem 720px, renderizar acima disso só pesa
  function fit() {
    const r = stage.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    lastKey = ''; dirty = true;
  }

  function loadFrames(onProgress, onCoarse) {
    const order = [], seen = new Set();
    const add = i => { if (!seen.has(i)) { seen.add(i); order.push(i); } };
    add(0); add(N - 1);
    [8, 4].forEach(st => { for (let i = 0; i < N; i += st) add(i); });
    const coarseLen = order.length;
    [2, 1].forEach(st => { for (let i = 0; i < N; i += st) add(i); });
    const canBitmap = light && 'createImageBitmap' in window;   // celular: quadros leves já decodificados
    return new Promise(resolve => {
      let next = 0, active = 0, settled = 0, coarse = 0;
      const pump = () => {
        while (active < 6 && next < order.length) {
          const k = next++, i = order[k]; active++;
          const im = new Image(); im.decoding = 'async';
          im.src = `${DIR}/f${String(i).padStart(3, '0')}.webp`;
          // quadros já decodificados (ImageBitmap): trocar de quadro não custa nada durante o scroll
          im.decode().then(() => (canBitmap ? createImageBitmap(im) : im))
            .then(src => { frames[i] = src; dirty = true; }, () => {})
            .finally(() => {
              active--; settled++;
              if (k < coarseLen) { coarse++; onProgress(coarse / coarseLen); if (coarse === coarseLen) onCoarse(); }
              if (settled === order.length) resolve();
              pump();
            });
        }
      };
      pump();
    });
  }

  /* ---------------- preloader ---------------- */
  const pre = { p: 0 }, preLine = $('.pre-line span'), prePct = $('.pre-pct');
  const renderPre = () => { preLine.style.transform = `scaleX(${pre.p})`; prePct.textContent = Math.round(pre.p * 100); };
  const coarseReady = new Promise(res => loadFrames(p => gsap.to(pre, { p, duration: 0.4, overwrite: true, onUpdate: renderPre }), res).then(res));
  Promise.race([Promise.all([coarseReady, new Promise(r => setTimeout(r, 1200))]), new Promise(r => setTimeout(r, 9000))]).then(finishLoading);

  let loaded = false;
  function finishLoading() {
    if (loaded) return; loaded = true;
    gsap.timeline()
      .to(pre, { p: 1, duration: 0.4, ease: 'power2.out', onUpdate: renderPre })
      .to('.pre-inner', { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' })
      .to('.preloader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.1')
      .add(() => { document.body.classList.remove('is-loading'); $('.preloader').remove(); lenis && lenis.start(); ScrollTrigger.refresh(); })
      .add(intro, '-=0.8');
  }
  function intro() {
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(H, { intro: 1, duration: 2.6, onUpdate: () => (dirty = true) }, 0)
      .from('.logo, .nav a, .header > .btn, .burger', { y: -24, opacity: 0, duration: 1.2, stagger: 0.07 }, 0.3)
      .from('.ch1 .eyebrow', { opacity: 0, x: -20, duration: 1.2 }, 0.5)
      .from(words.get($('.ch1 h1')), { yPercent: 115, duration: 1.4, stagger: 0.06 }, 0.55)
      .from('.side-note', { opacity: 0, y: 16, duration: 1.2 }, 1)
      .from('.scroll-hint, .hero-progress', { opacity: 0, duration: 1.2 }, 1.1);
  }

  /* ---------------- história do hero (linha do tempo no scroll) ---------------- */
  const header = $('.header'), heroFinal = $('.hero-final'), hpFill = $('.hp-fill'), hpLabel = $('.hp-label');
  const chapters = ['01 · Horizonte', '02 · Arquitetura', '03 · Interiores', '04 · Bem-vindo'];
  const heroTL = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate: () => (dirty = true),
    scrollTrigger: {
      trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: reduced ? true : 0.6, invalidateOnRefresh: true,
      onUpdate(s) {
        const p = s.progress;
        hpFill.style.transform = `scaleY(${p})`;
        hpLabel.textContent = chapters[p < 0.22 ? 0 : p < 0.46 ? 1 : p < 0.74 ? 2 : 3];
        heroFinal.classList.toggle('is-active', p > 0.86);
      }
    }
  });
  // o vídeo toca do primeiro ao último quadro (o drone sobe, entra pela varanda e chega à sala)
  heroTL.to(H, { p: 1, duration: 0.8 }, 0)
    .to('.scroll-hint', { autoAlpha: 0, duration: 0.04 }, 0)
    .to('.ch1', { autoAlpha: 0, y: -50, duration: 0.09 }, 0.08);
  [['.ch2', 0.24, 0.42], ['.ch3', 0.48, 0.68]].forEach(([sel, a, b]) => {
    heroTL.fromTo(sel, { autoAlpha: 0, y: 0 }, { autoAlpha: 1, duration: 0.01 }, a)
      .fromTo(`${sel} .eyebrow`, { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 0.05 }, a)
      .fromTo(words.get($(`${sel} .display`)), { yPercent: 115 }, { yPercent: 0, stagger: 0.007, duration: 0.07, ease: 'power3.out' }, a)
      .to(sel, { autoAlpha: 0, y: -50, duration: 0.07 }, b);
  });
  // já dentro do apartamento: o vídeo encolhe e vira um card, revelando as boas-vindas
  heroTL.to(H, { m: 1, duration: 0.14, ease: 'power2.inOut' }, 0.8)
    .to('.hero-shade', { opacity: 0, duration: 0.1 }, 0.8)
    .to('.hero-progress', { autoAlpha: 0, duration: 0.04 }, 0.78)
    .fromTo('.hero-final .eyebrow', { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 0.05 }, 0.86)
    .fromTo(words.get($('.hero-final .display-sm')), { yPercent: 115 }, { yPercent: 0, stagger: 0.005, duration: 0.07, ease: 'power3.out' }, 0.87)
    .fromTo(['.hero-final .lead', '.hero-final .actions', '.hero-final .hero-stats'], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, stagger: 0.02, duration: 0.05 }, 0.9)
    .to({}, { duration: 0.02 }, 0.98);

  // header claro depois do hero
  ScrollTrigger.create({ trigger: '.band', start: 'top 92px', end: 'max', onToggle: s => header.classList.toggle('is-light', s.isActive) });

  /* ---------------- faixa com nomes dos empreendimentos ---------------- */
  const bandTrack = $('.band-track');
  const bandHTML = PROJECTS.map(p => `<span>${p.nome} <i>◆</i></span>`).join('');
  bandTrack.innerHTML = bandHTML.repeat(2) + bandHTML.repeat(2);
  const band = { x: 0, w: 0, visible: false, speed: 0.7 };
  new IntersectionObserver(es => es.forEach(e => (band.visible = e.isIntersecting))).observe(bandTrack);
  const measure = () => (band.w = bandTrack.scrollWidth / 2);
  measure(); ScrollTrigger.addEventListener('refresh', measure);

  /* ---------------- loop de renderização ---------------- */
  gsap.ticker.add(() => {
    if (dirty) { dirty = false; draw(); }
    if (band.visible && band.w && !reduced) {
      const v = lenis ? Math.min(Math.abs(lenis.velocity) * 0.3, 20) : 0;
      band.x -= (band.speed + v) * gsap.ticker.deltaRatio(60) * (lenis && lenis.direction < 0 ? -1 : 1);
      if (band.x <= -band.w) band.x += band.w;
      if (band.x > 0) band.x -= band.w;
      bandTrack.style.transform = `translate3d(${band.x}px,0,0)`;
    }
  });
  fit();
  ScrollTrigger.addEventListener('refresh', fit);
  window.addEventListener('resize', fit);

  /* ---------------- empresa ---------------- */
  gsap.to(words.get($('.statement')), { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.statement', start: 'top 80%', end: 'bottom 50%', scrub: true } });
  gsap.fromTo('.frame', { clipPath: 'inset(18% 12% 18% 12%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: '.about-media', start: 'top 92%', end: 'top 30%', scrub: true } });
  gsap.fromTo('.frame img', { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.about-media', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.about-tag', { x: 60, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.about-media', start: 'top 60%' } });
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, pre = el.dataset.prefix || '', o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 2.4, ease: 'power3.out', onUpdate: () => (el.textContent = pre + Math.round(o.v).toLocaleString('pt-BR')) }) });
  });

  /* ---------------- portfólio: cortina que revela cada card ---------------- */
  $$('.card').forEach(c => {
    gsap.to($('.card-reveal', c), { scaleY: 0, duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: c, start: 'top 85%' } });
    gsap.from($('img', c), { scale: 1.3, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 85%' } });
    gsap.from($('.card-info', c), { y: 30, opacity: 0, duration: 1.2, delay: 0.5, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 85%' } });
    const open = () => openLightbox(+c.dataset.i);
    c.addEventListener('click', open);
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });

  /* ---------------- lightbox ---------------- */
  const lb = $('.lightbox'), lbA = $('.lb-img.a'), lbB = $('.lb-img.b');
  let cur = 0, shot = 0, front = lbA;
  function showShot(k) {
    const fotos = PROJECTS[cur].fotos;
    shot = (k + fotos.length) % fotos.length;
    const back = front === lbA ? lbB : lbA;
    back.src = img(fotos[shot]); back.alt = `${PROJECTS[cur].nome} — imagem ${shot + 1}`;
    back.decode().catch(() => {}).then(() => { back.classList.add('show'); front.classList.remove('show'); front = back; });
    $('.lb-count').textContent = `${String(shot + 1).padStart(2, '0')} / ${String(fotos.length).padStart(2, '0')}`;
  }
  function openLightbox(i) {
    cur = i; $('.lb-title').textContent = PROJECTS[i].nome;
    lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
    lenis && lenis.stop();
    showShot(0);
    setTimeout(() => $('.lb-close').focus(), 50);
  }
  function closeLightbox() {
    if (!lb.classList.contains('open')) return;
    lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true');
    lenis && lenis.start();
  }
  $('.lb-close').addEventListener('click', closeLightbox);
  $('.lb-next').addEventListener('click', () => showShot(shot + 1));
  $('.lb-prev').addEventListener('click', () => showShot(shot - 1));
  $('.lb-cta').addEventListener('click', () => {
    $('#empSelect').value = PROJECTS[cur].nome;
    closeLightbox(); setTimeout(() => scrollToHash('#contato'), 200);
  });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showShot(shot + 1);
    if (e.key === 'ArrowLeft') showShot(shot - 1);
  });

  /* ---------------- citação com parallax ---------------- */
  gsap.fromTo('.quote-media img', { yPercent: -8, scale: 1.1 }, { yPercent: 8, scale: 1, ease: 'none', scrollTrigger: { trigger: '.quote', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------------- revelações ---------------- */
  words.forEach((ws, el) => {
    if (el.closest('.hero') || el.hasAttribute('data-scrub-words') || el.classList.contains('foot-word')) return;
    gsap.from(ws, { yPercent: 115, duration: 1.4, stagger: 0.04, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 86%' } });
  });
  gsap.from(words.get($('.foot-word')), { yPercent: 110, duration: 1.6, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.foot-word', start: 'top 95%' } });
  ScrollTrigger.batch('[data-reveal]', { start: 'top 90%', once: true, onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1.3, stagger: 0.1, ease: 'expo.out' }) });

  /* ---------------- formulário → e-mail ---------------- */
  const toast = $('.toast');
  const showToast = m => { toast.textContent = m; toast.classList.add('show'); clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.classList.remove('show'), 3600); };
  $('.form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, nome = f.nome.value.trim(), email = f.email.value.trim();
    let ok = true;
    [[f.nome, nome.length > 1], [f.email, /\S+@\S+\.\S+/.test(email)]].forEach(([inp, v]) => {
      inp.closest('.field').classList.toggle('err', !v); if (!v) ok = false;
    });
    if (!ok) return showToast('Preencha seu nome e um e-mail válido, por favor.');
    const assunto = `Contato pelo site — ${f.empreendimento.value}`;
    const corpo = `Nome: ${nome}\nE-mail: ${email}\nTelefone: ${f.tel.value.trim() || '—'}\nInteresse: ${f.empreendimento.value}\n\n${f.msg.value.trim()}`;
    window.location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    showToast('Abrindo seu e-mail com a mensagem pronta…');
  });

  /* ---------------- botões magnéticos + cursor ---------------- */
  if (!isTouch) {
    $$('.magnetic').forEach(el => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' }), my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * 0.25); my((e.clientY - r.top - r.height / 2) * 0.3); });
      el.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
    document.documentElement.classList.add('has-cursor');
    const cur = $('.cursor'), label = $('.cursor-label');
    const dx = gsap.quickTo('.cursor-dot', 'x', { duration: 0.08 }), dy = gsap.quickTo('.cursor-dot', 'y', { duration: 0.08 });
    const rx = gsap.quickTo('.cursor-ring', 'x', { duration: 0.5, ease: 'power3.out' }), ry = gsap.quickTo('.cursor-ring', 'y', { duration: 0.5, ease: 'power3.out' });
    window.addEventListener('pointermove', e => { cur.classList.add('is-live'); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.addEventListener('pointerover', e => {
      const l = e.target.closest('[data-cursor]'), h = e.target.closest('a, button, input, select, textarea, label');
      cur.classList.toggle('is-label', !!l && !h);
      cur.classList.toggle('is-hover', !!h);
      if (l) label.textContent = l.dataset.cursor;
    });
    document.documentElement.addEventListener('pointerleave', () => cur.classList.remove('is-live', 'is-hover', 'is-label'));
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
