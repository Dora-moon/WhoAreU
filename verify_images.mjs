/**
 * verify_images.mjs — Node verification for the missing-image fix.
 *
 * 1. Every hardcoded OFFLINE_FICTIONAL portrait URL returns HTTP 200.
 * 2. getInstantSpinCandidates() returns 20 cards, each with a valid https:// img.
 * 3. RouletteView.createCardElement renders an <img referrerpolicy="no-referrer">
 *    inside .wc .im (no monogram letters) whenever card.img is populated.
 */
import { WikipediaModel, OFFLINE_FICTIONAL } from './js/models/WikipediaModel.js';

// --- DOM shim for RouletteView tests in Node.js ---
class ShimElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.className = '';
    this.style = {};
    this.children = [];
    this.textContent = '';
    this.attributes = new Map();
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }
  appendChild(child) { this.children.push(child); return child; }
  append(...nodes) { nodes.forEach(n => this.appendChild(n)); }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  querySelector(sel) {
    // Descendant selector like ".wc .im" must be checked BEFORE the single
    // class branch (".wc .im".startsWith('.') is true, so the naive check
    // would treat the whole string as one class name).
    if (sel.includes(' ')) {
      const parts = sel.split(' ').filter(s => s);
      if (parts.length === 2 && parts[0].startsWith('.') && parts[1].startsWith('.')) {
        const parentSel = parts[0];
        const childSel = parts[1];
        const parent = this.querySelector(parentSel);
        if (parent) return parent.querySelector(childSel);
      }
      return null;
    }
    // Single class / id selector: match self or any descendant.
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      if (this.className?.includes(cls)) return this;
      for (const c of this.children) {
        const found = c.querySelector(sel);
        if (found) return found;
      }
      return null;
    }
    if (sel.startsWith('#')) {
      const id = sel.slice(1);
      if (this.getAttribute?.('id') === id) return this;
      for (const c of this.children) {
        const found = c.querySelector(sel);
        if (found) return found;
      }
      return null;
    }
    return null;
  }
  querySelectorAll(sel) {
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      return this.children.filter(c => c.className?.includes(cls));
    }
    return [];
  }
  remove() {}
}

const shimDocument = {
  createElement: (tag) => new ShimElement(tag),
  querySelector: (sel) => {
    if (sel === '#wheelVp') return { clientWidth: 800, addEventListener() {}, style: {} };
    if (sel === '#track') return { replaceChildren() {}, style: {}, children: [], offsetLeft: 0, appendChild() {} };
    if (sel === '#pity') return { replaceChildren() {} };
    if (sel === '#status') return { textContent: '', classList: { toggle() {} } };
    if (sel === '#pullBtn') return { disabled: false };
    if (sel === '#pull10xBtn') return { disabled: false };
    if (sel === '#randAll') return { disabled: false };
    return { addEventListener() {}, classList: { toggle() {} } };
  },
  getElementById: (id) => shimDocument.querySelector('#' + id),
  documentElement: { style: { getPropertyValue: () => '136px' } }
};
globalThis.document = shimDocument;
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };

const failures = [];
const ok = (msg) => console.log('[OK]  ' + msg);
const fail = (msg) => { console.log('[FAIL] ' + msg); failures.push(msg); };

// HEAD requests to Wikimedia get 429 rate-limited aggressively; retry with
// short backoff and fall back to GET to confirm the image actually loads.
// Wikimedia rate-limits parallel bursts, so we stagger the checks by 800ms.
async function confirmImage(url, label) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { method: 'HEAD' });
      if (r.ok) return `${label} → HTTP ${r.status}`;
      const r2 = await fetch(url, { method: 'GET', redirect: 'follow' });
      if (r2.ok && (r2.headers.get('content-type') || '').startsWith('image/')) {
        return `${label} → HTTP ${r2.status} (GET confirmed image)`;
      }
      console.log(`  retry ${i}: ${label} → HEAD ${r.status} / GET ${r2.status}`);
    } catch (e) {
      console.log(`  retry ${i}: ${label} → ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1500 * (i + 1)));
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1. Every hardcoded offline portrait URL must return HTTP 200.
// ---------------------------------------------------------------------------
console.log('\n=== 1. Offline portrait URLs ===');
const offlineUrls = OFFLINE_FICTIONAL.map(f => f[7]).filter(Boolean);
for (const u of offlineUrls) {
  await new Promise(r => setTimeout(r, 800)); // stagger to avoid 429 floods
  const msg = await confirmImage(u, u);
  if (msg) ok(msg);
  else fail(`${u} → could not confirm HTTP 200`);
}

// ---------------------------------------------------------------------------
// 2. getInstantSpinCandidates() returns 20 cards with valid https:// img.
// ---------------------------------------------------------------------------
console.log('\n=== 2. getInstantSpinCandidates image resolution ===');
const wm = new WikipediaModel();
const offlinePool = [
  ...wm.offlineHistoricalPool(500, 2026),
  ...wm.offlineFictionalPool()
];
wm._prefetchPool = offlinePool;
wm._prefetchFilterKey = wm._filterKey({});

const candidates = await wm.getInstantSpinCandidates({}, 20);
if (!Array.isArray(candidates) || candidates.length === 0) {
  fail('getInstantSpinCandidates returned no cards');
} else {
  ok(`getInstantSpinCandidates returned ${candidates.length} cards`);
  let allValid = true;
  for (const c of candidates) {
    const img = c.img;
    if (!img || !/^https:\/\//i.test(img)) {
      allValid = false;
      fail(`  card "${c.name}" has invalid img: ${img}`);
    }
  }
  if (allValid) ok(`All ${candidates.length} cards have valid https:// img URLs`);
}

// ---------------------------------------------------------------------------
// 3. RouletteView renders <img referrerpolicy="no-referrer"> inside .wc .im.
// ---------------------------------------------------------------------------
console.log('\n=== 3. RouletteView markup simulation ===');
const { RouletteView } = await import('./js/views/RouletteView.js');

const rv = new RouletteView();
rv.$ = (sel) => shimDocument.querySelector(sel);
rv.wheelVp = rv.$('#wheelVp');
rv.track = rv.$('#track');
rv.pityBox = rv.$('#pity');
rv.statusEl = rv.$('#status');

const testCard = { name: 'Son Goku', img: 'https://upload.wikimedia.org/wikipedia/vi/a/af/Son_Goku_YoungAdult.PNG', tier: 'mid', score: 70 };
const el = rv.createCardElement(testCard);
const imgEl = el.querySelector('.wc .im');
if (!imgEl) { fail('RouletteView did not create .wc .im'); }
else {
  // Find <img> child by tagName (shim only handles class/id selectors)
  const imTag = imgEl.children.find(c => c.tagName === 'IMG');
  if (!imTag) {
    fail('RouletteView rendered a monogram instead of an <img> inside .wc .im');
  } else if ((imTag.getAttribute('referrerpolicy') || imTag.referrerPolicy) !== 'no-referrer') {
    fail(`RouletteView <img> missing referrerpolicy="no-referrer" (got: ${imTag.getAttribute('referrerpolicy') || imTag.referrerPolicy})`);
  } else if (imTag.hasAttribute('crossorigin') || imTag.crossOrigin) {
    fail('RouletteView <img> must NOT have crossOrigin');
  } else if (imTag.src !== testCard.img) {
    fail(`RouletteView <img>.src mismatch: ${imTag.src}`);
  } else {
    ok('RouletteView renders <img referrerpolicy="no-referrer"> inside .wc .im with the real portrait');
  }
}

// Same check for a card with NO img — must still create a placeholder <img>
// (so resolveLivePortrait can swap it in) rather than a monogram.
const blankCard = { name: 'Raiden Shogun', img: null, tier: 'rare', score: 88 };
const el2 = rv.createCardElement(blankCard);
const imgEl2 = el2.querySelector('.wc .im');
const im2 = imgEl2 ? imgEl2.children.find(c => c.tagName === 'IMG') : null;
if (!im2) fail('RouletteView did not create a placeholder <img> for a card with no img');
else ok('RouletteView creates a placeholder <img> for cards with no img (monogram is last resort)');

// ---------------------------------------------------------------------------
console.log('\n=== Summary ===');
if (failures.length) {
  console.log(`${failures.length} FAILURES`);
  process.exit(1);
}
console.log('ALL CHECKS PASSED');