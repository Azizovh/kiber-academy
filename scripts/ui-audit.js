/*
 * UI audit for KiberAkademiya — paste into the browser console on the running app (npm run dev, onboarding done),
 * then run:   await kaAudit()            // every main page, current theme and window size
 *             await kaAudit({ links: true })  // also open every internal link found (slow: ~1 s per link)
 *
 * It reports what screenshots miss:
 *   overflow  elements that stick out past the right edge (horizontal scroll on phones)
 *   contrast  text below WCAG AA against its real background (4.5:1, large text 3:1)
 *   unnamed   buttons and links with no accessible name (icon-only without aria-label)
 *   unlabeled form fields with no label
 *   dead      internal links that end up on another route (unknown id → redirect)
 * Run it at 375 px and 768 px wide and in both themes (Sozlamalar → Mavzu). Terminal, code, SIEM and the result
 * sheet are skipped by the contrast check: they are dark (or paper) by design in both themes.
 */
window.kaAudit = async function kaAudit(opts = {}) {
  const routes = opts.routes || ['/', '/xarita', '/bosqich/s3-linux', '/bosqich/p2-web', '/mavzu/linux-asoslari',
    '/mavzu/pt-sql-injection', '/amaliyot', '/lab/terminal-birinchi-qadam', '/lab/siem-ws-bux-014', '/lab/python-asoslari',
    '/ctf/lin-suid', '/takrorlash', '/lugat', '/buyruqlar', '/qaydlar', '/intervyu', '/sozlamalar', '/akkaunt',
    '/imtihonlar', '/imtihon/soc'];
  const wait = opts.waitMs || 1500;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const parse = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c);
    if (!m) return null;
    const p = m[1].split(',').map(parseFloat);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const blend = (t, u) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 });
  // Translucent backgrounds stack: blend every layer down to the first opaque one. Gradients are skipped.
  const bgOf = (el) => {
    const layers = [];
    for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
      if (s.backgroundImage !== 'none' && p !== document.body) return null;
    }
    let base = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    if (layers.length && layers[layers.length - 1].a >= 1) base = layers.pop();
    for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base);
    return base;
  };
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return true;
    }
    return false;
  };
  const tag = (el) => `<${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 2).join('.')}>`;
  const report = { overflow: [], contrast: [], unnamed: [], unlabeled: [], dead: [] };
  const links = new Set();
  const skipContrast = '.term-win, .terminal, .code-block, pre, .cm-editor, .siem, .exam-sheet, svg, .shell.collapsed .sidebar';

  for (const r of routes) {
    location.hash = '#' + r;
    await sleep(wait);
    const vw = document.documentElement.clientWidth;
    const seen = new Set();
    for (const el of document.querySelectorAll('body *')) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      if (box.right > vw + 1 && !clipped(el)) report.overflow.push(`${r} ${tag(el)} right=${Math.round(box.right)} > ${vw}`);
      if (el.closest(skipContrast) || el.closest('[disabled], [aria-disabled="true"]')) continue;
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.5) continue;
      const fg = parse(cs.color);
      const bg = bgOf(el);
      if (!fg || !bg || fg.a === 0) continue;
      const f = fg.a < 1 ? blend(fg, bg) : fg;
      const ratio = (Math.max(lum(f), lum(bg)) + 0.05) / (Math.min(lum(f), lum(bg)) + 0.05);
      const size = parseFloat(cs.fontSize);
      const need = size >= 24 || (parseInt(cs.fontWeight, 10) >= 700 && size >= 18.66) ? 3 : 4.5;
      const key = cs.color + String(el.className);
      if (ratio < need && !seen.has(key)) {
        seen.add(key);
        report.contrast.push(`${r} ${ratio.toFixed(2)} < ${need} ${tag(el)} "${el.textContent.trim().slice(0, 30)}"`);
      }
    }
    document.querySelectorAll('button, a[href], [role="button"]').forEach((el) => {
      if (el.getBoundingClientRect().width === 0) return;
      const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();
      if (!name) report.unnamed.push(`${r} ${tag(el)}`);
      if (el.tagName === 'A' && el.target === '_blank' && !/noopener|noreferrer/.test(el.rel)) report.unnamed.push(`${r} missing rel=noopener: ${el.href}`);
    });
    document.querySelectorAll('input:not([type="hidden"]):not([hidden]), textarea, select').forEach((el) => {
      if (el.getBoundingClientRect().width === 0) return;
      const ok = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest('label');
      if (!ok) report.unlabeled.push(`${r} ${tag(el)}`);
    });
    document.querySelectorAll('a[href^="#/"]').forEach((a) => links.add(a.getAttribute('href').slice(1).split('?')[0]));
  }

  if (opts.links) {
    for (const l of links) {
      location.hash = '#' + l;
      await sleep(700);
      const now = location.hash.slice(1).split('?')[0];
      if (now !== l) report.dead.push(`${l} -> ${now}`);
    }
  }
  const counts = Object.fromEntries(Object.entries(report).map(([k, v]) => [k, v.length]));
  console.log('kaAudit', counts, report);
  return { counts, report };
};
