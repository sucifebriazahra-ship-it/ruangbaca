/* =========================================================================
   ruangbaca — efek interaksi
   Riak (ripple) + efek "pop" di setiap klik, ledakan partikel saat menyukai /
   memberi rating / mengikuti, dan confetti untuk pencapaian.
   ========================================================================= */
(function (global) {
  'use strict';

  const reduce = () => global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TARGETS = '.btn, .ap-btn, .chip, .icon-btn, .ta, .ra, .tabs a, .pick, .seg button, .menu-trigger, .qs, .ph-stats a, .bottomnav a, .bottomnav button, .like-toggle, .theme-opt, .mainnav a, .ob-pick, .wrap-pick, .cond-opt, .tile-cover, .list-card, .listing-card, .member, .feed-item, .notif, .thread';

  function ripple(el, x, y) {
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement('span');
    s.className = 'fx-ripple';
    s.style.cssText = `width:${size}px;height:${size}px;left:${x - r.left - size / 2}px;top:${y - r.top - size / 2}px`;
    const cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    if (cs.overflow !== 'hidden') el.classList.add('fx-clip');
    el.append(s);
    setTimeout(() => s.remove(), 650);
  }

  function press(el) {
    el.classList.remove('fx-press');
    void el.offsetWidth;
    el.classList.add('fx-press');
    setTimeout(() => el.classList.remove('fx-press'), 380);
  }

  const SHAPES = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.7 0 5.9 3.8 4.4 7.3C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.85 6 6.55.75-4.87 4.47 1.33 6.48L12 17.05 6.14 20.3l1.33-6.48L2.6 9.35l6.55-.75z" fill="currentColor"/></svg>',
    dot: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="currentColor"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M3 5h7a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H3zM21 5h-7a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h7z" fill="currentColor"/></svg>',
  };
  const PALETTE = {
    heart: ['#e48a97', '#f2b4bd', '#f7d1d6'],
    star: ['#e7bd4f', '#f5d77e', '#fbe9a8'],
    dot: ['#7fa9b0', '#b7d3d7', '#c9cf7a', '#e9c46a'],
    book: ['#7fa9b0', '#9aa856', '#e7bd4f'],
  };

  /** ledakan partikel kecil dari titik (x,y) */
  function burst(x, y, kind = 'dot', count = 12) {
    if (reduce()) return;
    const box = document.createElement('div');
    box.className = 'fx-burst';
    box.style.left = x + 'px'; box.style.top = y + 'px';
    const cols = PALETTE[kind] || PALETTE.dot;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const d = 34 + Math.random() * 38;
      const p = document.createElement('i');
      p.innerHTML = SHAPES[kind] || SHAPES.dot;
      p.style.cssText = `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--s:${0.5 + Math.random() * 0.7};--r:${Math.random() * 120 - 60}deg;color:${cols[i % cols.length]};animation-delay:${Math.random() * 60}ms`;
      box.append(p);
    }
    const ring = document.createElement('b');
    ring.style.borderColor = cols[0];
    box.append(ring);
    document.body.append(box);
    setTimeout(() => box.remove(), 900);
  }
  function burstAt(el, kind, count) {
    if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, kind, count);
  }

  function confetti() {
    if (reduce()) return;
    const colors = ['#ffdbdf', '#f791a9', '#ffe797', '#dddd7b', '#e0f2f4', '#bad6da', '#7fa9b0'];
    const box = document.createElement('div');
    box.className = 'confetti';
    box.innerHTML = Array.from({ length: 90 }, () => `<i style="--x:${Math.random() * 100}vw;--d:${(2 + Math.random() * 1.8).toFixed(2)}s;--r:${Math.floor(Math.random() * 900)}deg;--delay:${(Math.random() * 0.5).toFixed(2)}s;--w:${6 + Math.random() * 7}px;background:${colors[Math.floor(Math.random() * colors.length)]}"></i>`).join('');
    document.body.append(box);
    setTimeout(() => box.remove(), 4500);
  }

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || reduce()) return;
    const el = e.target.closest(TARGETS);
    if (!el || el.disabled) return;
    ripple(el, e.clientX, e.clientY);
    press(el);
  }, { passive: true });

  global.FX = { burst, burstAt, confetti, press };
})(window);
