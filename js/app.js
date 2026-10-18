/* Pair Day Maker — 편집기 */
(function () {
  'use strict';

  /* ═════════════ 상수 ═════════════ */
  const W = 1920, H = 1080;
  const PRET = Fonts.PRET;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rnd = (v, d = 1) => { const k = Math.pow(10, d); return Math.round(v * k) / k; };

  const TEXT_KEYS = ['pair', 'name1', 'sep', 'name2', 'dday', 'days', 'since', 'label', 'catch', 'quote1', 'quote2'];
  const TEXT_LABEL = {
    pair: '페어명', name1: '캐릭터 A 이름', sep: '이름 사이 기호', name2: '캐릭터 B 이름',
    dday: '디데이 (D+N)', days: '일수 (N일째)', since: '시작일', label: '라벨',
    catch: '캐치프레이즈', quote1: '캐릭터 A 대사', quote2: '캐릭터 B 대사'
  };
  const DEFAULT_CONTENT = {
    pair: '페어명', name1: '캐릭터 A', name2: '캐릭터 B', sep: '&',
    dday: 'D+{days}', days: '{days}일째', since: 'SINCE {date}', label: 'OUR ANNIVERSARY',
    catch: '두 사람의 이야기를 한 줄로 적어주세요', quote1: '“캐릭터 A의 대사”', quote2: '“캐릭터 B의 대사”'
  };
  const MULTI = new Set(['catch', 'quote1', 'quote2']);
  const SLOT_DEFS = {
    A: [{ id: 'main', label: '월페이퍼 일러스트', hint: '두 캐릭터가 함께 있는 16:9 일러스트' }],
    B: [{ id: 'c1', label: '캐릭터 A 두상', hint: '정사각형에 가까운 두상' }, { id: 'c2', label: '캐릭터 B 두상', hint: '정사각형에 가까운 두상' }],
    C: [{ id: 'main', label: '헤더 일러스트', hint: '3:1 헤더 (1500×500 권장)' }]
  };
  const SHAPE_LABEL = { rect: '사각', rounded: '둥근 사각', circle: '원형', arch: '아치', hexagon: '육각형', diamond: '마름모', heart: '하트' };
  const SYMBOLS = ['♥', '♡', '❤︎', '★', '☆', '✦', '✧', '✿', '❀', '☾', '☀', '♪', '♫', '∞', '✉', '⚘', '🎂', '💍', '💐', '✨', '🌙', '🕊️', '🍰', '🎀'];
  const STICKER_TEXT_DEFAULT = { family: PRET, size: 72, weight: 700, color: 'accent', ls: 0, lh: 1.2 };
  const SEL_COLOR = '#3D7BFF';

  /* ═════════════ 상태 ═════════════ */
  let state = null;
  let sel = null; // {kind:'text',key} | {kind:'slot',id} | {kind:'sticker',id}
  let history = [], future = [], lastSnap = null, commitTimer = null, saveTimer = null;
  const assets = new Map(); // id → {src, img, w, h}
  let stage, layer, uiLayer, tr, guideV, guideH, hl;
  let nodes = { texts: {}, slots: {}, stickers: {} };
  let dragging = false, transforming = false, pendingRender = false, renderQueued = false;
  let storageOk = true;

  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function defaultState() {
    const s = new Date(); s.setDate(s.getDate() - 99);
    const texts = {};
    TEXT_KEYS.forEach(k => { texts[k] = { visible: !(k === 'quote1' || k === 'quote2'), content: null }; });
    return {
      v: 1, type: 'A', theme: THEMES[0].id, accent: {}, decor: true, globalFont: null, customFonts: [],
      dday: { mode: 'auto', start: ymd(s), base: '', manual: 100, fmt: 'dot' },
      texts, over: {}, slots: {}, stickers: { A: [], B: [], C: [] },
      bg: { mode: 'theme', color: '#F3F1EC', g1: '#C8C2F0', g2: '#F7CFDA', gtype: 'linear', angle: 135, asset: null, zoom: 1, dx: 0, dy: 0, blur: 0, dim: 0, dimColor: '#000000' },
      exp: { scale: 1, name: '{pair}_D+{days}' }
    };
  }

  function migrate(s) {
    const d = defaultState();
    const out = Object.assign({}, d, s);
    out.dday = Object.assign({}, d.dday, s.dday);
    out.bg = Object.assign({}, d.bg, s.bg);
    out.exp = Object.assign({}, d.exp, s.exp);
    out.stickers = Object.assign({}, d.stickers, s.stickers);
    out.accent = (s.accent && typeof s.accent === 'object') ? s.accent : {};
    out.texts = {};
    TEXT_KEYS.forEach(k => { out.texts[k] = Object.assign({}, d.texts[k], (s.texts || {})[k]); });
    if (!THEMES.find(t => t.id === out.theme)) out.theme = THEMES[0].id;
    if (!['A', 'B', 'C'].includes(out.type)) out.type = 'A';
    out.customFonts = Array.isArray(s.customFonts) ? s.customFonts : [];
    return out;
  }

  /* ═════════════ 날짜 · 문구 ═════════════ */
  function parseYmd(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  }
  function todayParts() { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; }
  function calcDays(st) {
    if (st.dday.mode === 'manual') return Math.round(Number(st.dday.manual) || 0);
    const s = parseYmd(st.dday.start); if (!s) return 0;
    const b = parseYmd(st.dday.base) || todayParts();
    return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(s.y, s.m - 1, s.d)) / 864e5) + 1;
  }
  function fmtDate(st) {
    const p = parseYmd(st.dday.start); if (!p) return 'YYYY.MM.DD';
    const MM = String(p.m).padStart(2, '0'), DD = String(p.d).padStart(2, '0');
    switch (st.dday.fmt) {
      case 'dash': return `${p.y}-${MM}-${DD}`;
      case 'kor': return `${p.y}년 ${p.m}월 ${p.d}일`;
      case 'short': return `${String(p.y).slice(2)}.${MM}.${DD}`;
      case 'us': return `${MM}.${DD}.${p.y}`;
      default: return `${p.y}.${MM}.${DD}`;
    }
  }
  const getTheme = id => THEMES.find(t => t.id === id) || THEMES[0];
  const layoutKey = st => st.type + ':' + st.theme;
  function getContent(st, theme, k) {
    const c = st.texts[k].content;
    return (c !== null && c !== undefined) ? c : (theme.defaults && theme.defaults[k] != null ? theme.defaults[k] : DEFAULT_CONTENT[k]);
  }
  function fillTokens(str, st, theme) {
    if (str == null) return '';
    return String(str).replace(/\{(days|date|name1|name2|pair)\}/g, (m, t) => {
      if (t === 'days') return String(calcDays(st));
      if (t === 'date') return fmtDate(st);
      return getContent(st, theme, t);
    });
  }
  function col(c, theme, st) {
    if (!c) return c;
    if (c === 'accent') return (st.accent && st.accent[theme.id]) || theme.palette.accent;
    if (theme.palette[c]) return theme.palette[c];
    return c;
  }

  /* ═════════════ 레이아웃 해석 ═════════════ */
  function ovl(create) {
    const k = layoutKey(state);
    if (!state.over[k]) {
      if (!create) return { texts: {}, frame: {} };
      state.over[k] = { texts: {}, frame: {} };
    }
    const o = state.over[k]; o.texts = o.texts || {}; o.frame = o.frame || {};
    return o;
  }
  function textOver(key, create) {
    const o = ovl(create);
    if (!o.texts[key]) { if (!create) return {}; o.texts[key] = {}; }
    return o.texts[key];
  }
  function resolveTextSpec(st, theme, L, key) {
    const base = L.texts[key] || {};
    const ov = ((st.over[layoutKey(st)] || {}).texts || {})[key] || {};
    const style = ov.style || {};
    const sp = Object.assign({ family: PRET, weight: 400, color: 'ink', ls: 0, lh: 1.25, size: 32, align: 'left' }, theme.textDefaults || {}, base, style);
    if (!style.family && st.globalFont) sp.family = st.globalFont;
    sp.anchor = base.align || 'left';
    return { sp, pos: ov.pos || null };
  }
  function slotFrame(st, theme, sd) {
    const fo = ((st.over[layoutKey(st)] || {}).frame) || {};
    const pick = (a, b) => (a !== null && a !== undefined && a !== '') ? a : b;
    return {
      shape: pick(fo.shape, sd.shape || 'rect'),
      radius: pick(fo.radius, sd.radius != null ? sd.radius : 40),
      bw: pick(fo.bw, sd.border ? sd.border.width : 0),
      bc: pick(fo.bc, sd.border ? sd.border.color : 'ink'),
      gap: pick(fo.gap, sd.border && sd.border.gap ? sd.border.gap : 0),
      polaroid: pick(fo.polaroid, !!sd.polaroid),
      shadow: pick(fo.shadow, !!sd.shadow),
      pol: sd.polaroid || { pad: 24, bottom: 96, color: 'paper' }
    };
  }

  /* ═════════════ 도형 ═════════════ */
  const HEART = (function () {
    const pts = [];
    for (let i = 0; i < 120; i++) {
      const t = i / 120 * Math.PI * 2, s = Math.sin(t);
      pts.push([16 * s * s * s, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
    }
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    return pts.map(([x, y]) => [(x - minX) / (maxX - minX), (y - minY) / (maxY - minY)]);
  })();

  function ellipsePath(c, cx, cy, rx, ry) {
    const k = 0.5522848, ox = rx * k, oy = ry * k;
    c.moveTo(cx - rx, cy);
    c.bezierCurveTo(cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry);
    c.bezierCurveTo(cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy);
    c.bezierCurveTo(cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry);
    c.bezierCurveTo(cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy);
    c.closePath();
  }
  function shapePath(c, shape, x, y, w, h, r) {
    const cx = x + w / 2, cy = y + h / 2;
    switch (shape) {
      case 'circle': ellipsePath(c, cx, cy, w / 2, h / 2); break;
      case 'rounded': {
        const rr = Math.max(0, Math.min(r == null ? 40 : r, w / 2, h / 2));
        c.moveTo(x + rr, y); c.lineTo(x + w - rr, y); c.arcTo(x + w, y, x + w, y + rr, rr);
        c.lineTo(x + w, y + h - rr); c.arcTo(x + w, y + h, x + w - rr, y + h, rr);
        c.lineTo(x + rr, y + h); c.arcTo(x, y + h, x, y + h - rr, rr);
        c.lineTo(x, y + rr); c.arcTo(x, y, x + rr, y, rr); c.closePath(); break;
      }
      case 'arch': {
        const rx = w / 2, ry = Math.min(w / 2, h), k = 0.5522848, top = y + ry;
        c.moveTo(x, y + h); c.lineTo(x, top);
        c.bezierCurveTo(x, top - ry * k, cx - rx * k, y, cx, y);
        c.bezierCurveTo(cx + rx * k, y, x + w, top - ry * k, x + w, top);
        c.lineTo(x + w, y + h); c.closePath(); break;
      }
      case 'hexagon': {
        const rx = w / Math.sqrt(3), ry = h / 2;
        for (let i = 0; i < 6; i++) {
          const a = (-90 + 60 * i) * Math.PI / 180;
          const px = cx + rx * Math.cos(a), py = cy + ry * Math.sin(a);
          if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.closePath(); break;
      }
      case 'diamond': c.moveTo(cx, y); c.lineTo(x + w, cy); c.lineTo(cx, y + h); c.lineTo(x, cy); c.closePath(); break;
      case 'heart':
        HEART.forEach(([px, py], i) => { const X = x + px * w, Y = y + py * h; if (i === 0) c.moveTo(X, Y); else c.lineTo(X, Y); });
        c.closePath(); break;
      default: c.rect(x, y, w, h);
    }
  }

  /* ═════════════ 장면 생성 ═════════════ */
  function applyGradient(node, g, w, h) {
    if (g.gtype === 'radial') {
      node.fillPriority('radial-gradient');
      node.fillRadialGradientStartPoint({ x: w / 2, y: h / 2 });
      node.fillRadialGradientEndPoint({ x: w / 2, y: h / 2 });
      node.fillRadialGradientStartRadius(0);
      node.fillRadialGradientEndRadius(Math.hypot(w, h) / 2);
      node.fillRadialGradientColorStops([0, g.c1, 1, g.c2]);
    } else {
      const a = (g.angle == null ? 135 : g.angle) * Math.PI / 180;
      const dx = Math.sin(a), dy = -Math.cos(a);
      const len = Math.abs(w / 2 * dx) + Math.abs(h / 2 * dy);
      node.fillPriority('linear-gradient');
      node.fillLinearGradientStartPoint({ x: w / 2 - dx * len, y: h / 2 - dy * len });
      node.fillLinearGradientEndPoint({ x: w / 2 + dx * len, y: h / 2 + dy * len });
      node.fillLinearGradientColorStops([0, g.c1, 1, g.c2]);
    }
  }

  const blurCache = new Map();
  function getBlurred(id, blur, cover) {
    const key = id + '|' + blur;
    if (blurCache.has(key)) return blurCache.get(key);
    const a = assets.get(id);
    const k = Math.min(1, 1600 / Math.max(a.w, a.h));
    const w = Math.max(1, Math.round(a.w * k)), h = Math.max(1, Math.round(a.h * k));
    const radius = Math.max(1, Math.round(blur * k / cover));
    const node = new Konva.Image({ image: a.img, width: w, height: h });
    node.cache({ pixelRatio: 1 });
    node.filters([Konva.Filters.Blur]);
    node.blurRadius(radius);
    const c = node.toCanvas({ pixelRatio: 1 });
    node.destroy();
    if (blurCache.size > 8) blurCache.delete(blurCache.keys().next().value);
    blurCache.set(key, c);
    return c;
  }

  function drawBackground(lyr, st, theme) {
    const bg = st.bg, mode = bg.mode;
    const r = new Konva.Rect({ x: 0, y: 0, width: W, height: H, name: 'bgrect' });
    let spec;
    if (mode === 'theme') spec = theme.bg;
    else if (mode === 'gradient') spec = { mode: 'gradient', gtype: bg.gtype, c1: bg.g1, c2: bg.g2, angle: bg.angle };
    else spec = { mode: 'solid', color: bg.color };
    if (spec.mode === 'gradient') applyGradient(r, { gtype: spec.gtype, c1: col(spec.c1, theme, st), c2: col(spec.c2, theme, st), angle: spec.angle }, W, H);
    else r.fill(col(spec.color, theme, st));
    lyr.add(r);
    if (mode === 'image') {
      const a = bg.asset && assets.get(bg.asset);
      if (a) {
        const cover = Math.max(W / a.w, H / a.h) * (bg.zoom || 1);
        const dw = a.w * cover, dh = a.h * cover;
        let src = a.img;
        if (bg.blur > 0) { try { src = getBlurred(bg.asset, bg.blur, cover); } catch (e) { src = a.img; } }
        lyr.add(new Konva.Image({ image: src, width: dw, height: dh, x: W / 2 + (bg.dx || 0) * W, y: H / 2 + (bg.dy || 0) * H, offsetX: dw / 2, offsetY: dh / 2, listening: false }));
      }
      if (bg.dim > 0) lyr.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, fill: bg.dimColor, opacity: bg.dim, listening: false }));
    }
    return r;
  }

  function makeDecor(d, theme, st) {
    const c = v => col(v, theme, st);
    let n;
    switch (d.kind) {
      case 'rect': {
        n = new Konva.Rect({ width: d.w, height: d.h, opacity: d.opacity == null ? 1 : d.opacity, rotation: d.rotation || 0, cornerRadius: d.radius || 0 });
        if (d.cx != null) { n.position({ x: d.cx, y: d.cy }); n.offset({ x: d.w / 2, y: d.h / 2 }); } else n.position({ x: d.x, y: d.y });
        if (d.gradient) {
          n.fillPriority('linear-gradient');
          n.fillLinearGradientStartPoint({ x: d.gradient.start[0], y: d.gradient.start[1] });
          n.fillLinearGradientEndPoint({ x: d.gradient.end[0], y: d.gradient.end[1] });
          n.fillLinearGradientColorStops(d.gradient.stops.map((v, i) => i % 2 ? c(v) : v));
        } else n.fill(c(d.fill));
        break;
      }
      case 'line':
        n = new Konva.Line({ points: d.points, stroke: c(d.stroke), strokeWidth: d.width || 1, dash: d.dash, opacity: d.opacity == null ? 1 : d.opacity, lineCap: 'round' });
        break;
      case 'circle':
        n = new Konva.Circle({ x: d.x, y: d.y, radius: d.r, fill: d.fill ? c(d.fill) : undefined, stroke: d.stroke ? c(d.stroke) : undefined, strokeWidth: d.width || 0, opacity: d.opacity == null ? 1 : d.opacity });
        break;
      case 'sparkle':
        n = new Konva.Shape({
          x: d.x, y: d.y, fill: c(d.fill), opacity: d.opacity == null ? 1 : d.opacity,
          sceneFunc: (ctx, s) => {
            const r = d.r, q = r * 0.12;
            ctx.beginPath(); ctx.moveTo(0, -r);
            ctx.quadraticCurveTo(q, -q, r, 0); ctx.quadraticCurveTo(q, q, 0, r);
            ctx.quadraticCurveTo(-q, q, -r, 0); ctx.quadraticCurveTo(-q, -q, 0, -r);
            ctx.closePath(); ctx.fillStrokeShape(s);
          }
        });
        break;
      case 'text':
        n = new Konva.Text({ x: d.x, y: d.y, text: d.text, fontSize: d.size, fontFamily: Fonts.famStr(d.family), fontStyle: String(d.weight || 400), fill: c(d.fill), letterSpacing: d.ls || 0 });
        break;
      default: return null;
    }
    n.listening(false);
    return n;
  }

  function placeImage(img, s, a, w, h) {
    const cover = Math.max(w / a.w, h / a.h);
    const sc = cover * (s.zoom || 1);
    img.position({ x: w / 2 + (s.dx || 0) * w, y: h / 2 + (s.dy || 0) * h });
    img.scale({ x: sc * (s.flip ? -1 : 1), y: sc });
    img.rotation(s.rot || 0);
  }

  const SHADOW = { shadowColor: '#000000', shadowBlur: 40, shadowOpacity: 0.22, shadowOffsetX: 0, shadowOffsetY: 14 };

  function makeSlot(sd, st, theme, opts) {
    const fr = slotFrame(st, theme, sd);
    const { w, h } = sd;
    const group = new Konva.Group({ x: sd.x + w / 2, y: sd.y + h / 2, offsetX: w / 2, offsetY: h / 2, rotation: sd.rotation || 0 });
    group.setAttr('slotId', sd.id);
    const pathFn = (x, y, ww, hh, r) => (ctx, s) => { ctx.beginPath(); shapePath(ctx, fr.shape, x, y, ww, hh, r); ctx.closePath(); ctx.fillStrokeShape(s); };

    if (fr.polaroid) {
      const p = fr.pol;
      group.add(new Konva.Rect(Object.assign({ x: -p.pad, y: -p.pad, width: w + p.pad * 2, height: h + p.pad + p.bottom, fill: col(p.color || 'paper', theme, st), listening: false }, fr.shadow ? SHADOW : {})));
    } else if (fr.shadow) {
      group.add(new Konva.Shape(Object.assign({ sceneFunc: pathFn(0, 0, w, h, fr.radius), fill: col('paper', theme, st), listening: false }, SHADOW)));
    }

    const clip = new Konva.Group({ clipFunc: ctx => shapePath(ctx, fr.shape, 0, 0, w, h, fr.radius) });
    group.add(clip);
    const s = st.slots[st.type + ':' + sd.id];
    const a = s && assets.get(s.asset);
    let img = null;
    if (a) {
      img = new Konva.Image({ image: a.img, width: a.w, height: a.h, offsetX: a.w / 2, offsetY: a.h / 2, name: 'slotimg' });
      placeImage(img, s, a, w, h);
      if (opts.editing) img.draggable(true);
      clip.add(img);
    } else {
      clip.add(new Konva.Rect({ x: 0, y: 0, width: w, height: h, fill: 'rgba(128,128,128,0.16)' }));
      if (opts.editing) {
        const def = (SLOT_DEFS[st.type] || []).find(x => x.id === sd.id);
        const fs = clamp(Math.min(w, h) / 14, 18, 34);
        const t = new Konva.Text({ text: '＋\n' + (def ? def.label : '이미지') + '\n클릭해서 넣기', width: w, align: 'center', fontSize: fs, lineHeight: 1.5, fontFamily: Fonts.famStr(PRET), fontStyle: '600', fill: 'rgba(110,110,110,0.75)', listening: false });
        t.y(h / 2 - t.height() / 2);
        clip.add(t);
      }
    }
    if (fr.bw > 0) {
      const g = fr.gap || 0;
      group.add(new Konva.Shape({ sceneFunc: pathFn(-g, -g, w + g * 2, h + g * 2, (fr.radius || 0) + g), stroke: col(fr.bc, theme, st), strokeWidth: fr.bw, listening: false }));
    }
    if (opts.editing && opts.bind) opts.bind.slot(group, img, sd, !!a);
    return { group, img, sd, frame: fr, asset: a };
  }

  function makeTextNode(sp, content, theme, st) {
    const n = new Konva.Text({
      text: content, fontFamily: Fonts.famStr(sp.family), fontSize: sp.size,
      fontStyle: (sp.italic ? 'italic ' : '') + String(sp.weight || 400),
      fill: col(sp.color, theme, st), letterSpacing: sp.ls || 0, lineHeight: sp.lh || 1.25,
      align: sp.talign || sp.align || 'left', wrap: 'word', opacity: sp.opacity == null ? 1 : sp.opacity
    });
    if (sp.width > 0) n.width(sp.width);
    if (sp.strokeWidth > 0) {
      n.stroke(col(sp.strokeColor || '#FFFFFF', theme, st)); n.strokeWidth(sp.strokeWidth);
      n.fillAfterStrokeEnabled(true); n.lineJoin('round');
    }
    if (sp.shadow) {
      n.shadowColor(col(sp.shadow.color || '#000000', theme, st));
      n.shadowBlur(sp.shadow.blur == null ? 12 : sp.shadow.blur);
      n.shadowOpacity(sp.shadow.opacity == null ? 0.5 : sp.shadow.opacity);
      n.shadowOffset({ x: sp.shadow.x || 0, y: sp.shadow.y || 0 });
      n.shadowForStrokeEnabled(false);
    }
    return n;
  }
  function centerize(n) { const w = n.width(), h = n.height(); n.offsetX(w / 2); n.offsetY(h / 2); return [w, h]; }
  function placeByAnchor(n, sp) {
    const [w, h] = centerize(n);
    const x = sp.x == null ? W / 2 : sp.x, y = sp.y == null ? H / 2 : sp.y;
    const left = sp.anchor === 'center' ? x - w / 2 : sp.anchor === 'right' ? x - w : x;
    const top = sp.anchorY === 'middle' ? y - h / 2 : sp.anchorY === 'bottom' ? y - h : y;
    n.position({ x: left + w / 2, y: top + h / 2 });
    n.rotation(sp.rotation || 0);
  }

  function buildTexts(lyr, st, theme, L, opts, out) {
    const rows = L.rows || [];
    const rowOf = new Map();
    rows.forEach((r, i) => r.items.forEach(k => rowOf.set(k, i)));
    const made = {};
    TEXT_KEYS.forEach(k => {
      if (!st.texts[k].visible) return;
      const content = fillTokens(getContent(st, theme, k), st, theme);
      if (!content) return;
      const { sp, pos } = resolveTextSpec(st, theme, L, k);
      made[k] = { n: makeTextNode(sp, content, theme, st), sp, pos };
    });
    // 이름 사이 기호는 두 이름이 다 있을 때만 (가로 묶음 안에서)
    if (made.sep && rowOf.has('sep') && (!made.name1 || !made.name2)) delete made.sep;

    Object.entries(made).forEach(([k, m]) => {
      if (m.pos) { centerize(m.n); m.n.position({ x: m.pos.x, y: m.pos.y }); m.n.rotation(m.pos.rotation || 0); }
      else if (!rowOf.has(k)) placeByAnchor(m.n, m.sp);
    });
    rows.forEach(r => {
      const items = r.items.filter(k => made[k] && !made[k].pos);
      if (!items.length) return;
      const ws = items.map(k => made[k].n.width());
      const total = ws.reduce((a, b) => a + b, 0) + (r.gap || 0) * (items.length - 1);
      let x = r.align === 'center' ? r.x - total / 2 : r.align === 'right' ? r.x - total : r.x;
      items.forEach((k, i) => {
        const n = made[k].n;
        const [w, h] = centerize(n);
        const top = r.valign === 'middle' ? r.y - h / 2 : r.valign === 'bottom' ? r.y - h : r.y;
        n.position({ x: x + w / 2, y: top + h / 2 }); n.rotation(0);
        x += ws[i] + (r.gap || 0);
      });
    });
    TEXT_KEYS.forEach(k => {
      if (!made[k]) return;
      lyr.add(made[k].n);
      out.texts[k] = made[k].n;
      if (opts.editing && opts.bind) opts.bind.text(made[k].n, k);
    });
  }

  function stickerSpec(sk) { return Object.assign({}, STICKER_TEXT_DEFAULT, sk.style || {}); }
  function makeSticker(sk, st, theme) {
    let n;
    if (sk.kind === 'image') {
      const a = assets.get(sk.asset); if (!a) return null;
      const w = sk.w, h = sk.w * a.h / a.w;
      n = new Konva.Image({ image: a.img, width: w, height: h, offsetX: w / 2, offsetY: h / 2 });
    } else {
      const sp = stickerSpec(sk);
      n = makeTextNode(sp, fillTokens(sk.text, st, theme) || ' ', theme, st);
      centerize(n);
    }
    const sc = sk.scale || 1;
    n.position({ x: sk.x, y: sk.y });
    n.rotation(sk.rot || 0);
    n.scale({ x: sc * (sk.flip ? -1 : 1), y: sc });
    if (sk.kind === 'image') n.opacity(sk.opacity == null ? 1 : sk.opacity);
    return n;
  }

  function buildScene(lyr, st, opts) {
    opts = opts || {};
    const theme = getTheme(st.theme);
    const L = theme.layouts[st.type];
    const out = { texts: {}, slots: {}, stickers: {} };
    const bgRect = drawBackground(lyr, st, theme);
    if (opts.editing && opts.bind) opts.bind.bg(bgRect);
    if (st.decor !== false) L.decor.forEach(d => { if (d.z !== 'over') { const n = makeDecor(d, theme, st); if (n) lyr.add(n); } });
    L.slots.forEach(sd => { const r = makeSlot(sd, st, theme, opts); lyr.add(r.group); out.slots[sd.id] = r; });
    if (st.decor !== false) L.decor.forEach(d => { if (d.z === 'over') { const n = makeDecor(d, theme, st); if (n) lyr.add(n); } });
    buildTexts(lyr, st, theme, L, opts, out);
    (st.stickers[st.type] || []).forEach(sk => {
      const n = makeSticker(sk, st, theme); if (!n) return;
      lyr.add(n); out.stickers[sk.id] = n;
      if (opts.editing && opts.bind) opts.bind.sticker(n, sk);
    });
    return out;
  }

  /* ═════════════ 폰트 로딩 ═════════════ */
  function collectFonts(st) {
    const theme = getTheme(st.theme), L = theme.layouts[st.type], list = [];
    TEXT_KEYS.forEach(k => {
      if (!st.texts[k].visible) return;
      const { sp } = resolveTextSpec(st, theme, L, k);
      list.push({ family: sp.family, weight: sp.weight || 400, italic: sp.italic, text: fillTokens(getContent(st, theme, k), st, theme) });
    });
    (st.stickers[st.type] || []).forEach(sk => {
      if (sk.kind !== 'text') return;
      const sp = stickerSpec(sk);
      list.push({ family: sp.family, weight: sp.weight || 400, italic: sp.italic, text: fillTokens(sk.text, st, theme) });
    });
    L.decor.forEach(d => { if (d.kind === 'text') list.push({ family: d.family || PRET, weight: d.weight || 400, text: d.text }); });
    return list;
  }
  const fontStr = f => `${f.italic ? 'italic ' : ''}${f.weight || 400} 40px "${f.family || PRET}"`;
  const triedGlyphs = new Set();
  function checkFonts(st) {
    collectFonts(st).forEach(f => {
      Fonts.ensure(f.family).then(newly => {
        if (newly) scheduleRender();
        if (!document.fonts || !f.text) return;
        const fs = fontStr(f), key = fs + '|' + f.text;
        if (triedGlyphs.has(key)) return;
        triedGlyphs.add(key);
        try {
          if (!document.fonts.check(fs, f.text)) document.fonts.load(fs, f.text).then(() => scheduleRender()).catch(() => {});
        } catch (e) { /* 무시 */ }
      });
    });
  }
  async function prepareFonts(st) {
    await Promise.all(collectFonts(st).map(async f => {
      try { await Fonts.ensure(f.family); if (document.fonts) await document.fonts.load(fontStr(f), f.text || 'A'); } catch (e) { /* 무시 */ }
    }));
    try { if (document.fonts) await document.fonts.ready; } catch (e) { /* 무시 */ }
  }

  /* ═════════════ 렌더 ═════════════ */
  const bindings = {
    bg(rect) { rect.on('mousedown touchstart', () => select(null)); },
    text(n, key) {
      n.draggable(true);
      n.on('mouseenter', () => cursor('move')); n.on('mouseleave', () => cursor(''));
      n.on('mousedown touchstart', () => select({ kind: 'text', key }));
      n.on('dragstart', () => { dragging = true; });
      n.on('dragmove', e => snap(n, e));
      n.on('dragend', () => {
        dragging = false; hideGuides();
        const o = textOver(key, true);
        o.pos = { x: rnd(n.x()), y: rnd(n.y()), rotation: rnd(n.rotation()) };
        afterCanvasEdit();
      });
      n.on('transformstart', () => { transforming = true; });
      n.on('transformend', () => {
        transforming = false;
        const theme = getTheme(state.theme), L = theme.layouts[state.type];
        const { sp } = resolveTextSpec(state, theme, L, key);
        const k = Math.abs(n.scaleX());
        const o = textOver(key, true); o.style = o.style || {};
        o.style.size = rnd(sp.size * k);
        if (sp.width > 0) o.style.width = Math.round(sp.width * k);
        o.pos = { x: rnd(n.x()), y: rnd(n.y()), rotation: rnd(n.rotation()) };
        n.scale({ x: 1, y: 1 });
        afterCanvasEdit(true);
      });
      n.on('dblclick dbltap', () => { select({ kind: 'text', key }); setTimeout(() => { const f = $('#inspector [data-content]'); if (f) { f.focus(); f.select && f.select(); } }, 30); });
    },
    slot(group, img, sd, has) {
      group.on('mouseenter', () => cursor(has ? 'grab' : 'pointer')); group.on('mouseleave', () => cursor(''));
      group.on('mousedown touchstart', () => select({ kind: 'slot', id: sd.id }));
      group.on('click tap', () => { if (!has) pickImage(id => setSlotAsset(sd.id, id)); });
      if (img) {
        img.on('dragstart', () => { dragging = true; cursor('grabbing'); });
        img.on('dragmove', () => updateHighlight());
        img.on('dragend', () => {
          dragging = false; cursor('grab');
          const s = state.slots[state.type + ':' + sd.id];
          if (s) { s.dx = rnd((img.x() - sd.w / 2) / sd.w, 4); s.dy = rnd((img.y() - sd.h / 2) / sd.h, 4); }
          afterCanvasEdit(false, true);
        });
      }
    },
    sticker(n, sk) {
      n.draggable(true);
      n.on('mouseenter', () => cursor('move')); n.on('mouseleave', () => cursor(''));
      n.on('mousedown touchstart', () => select({ kind: 'sticker', id: sk.id }));
      n.on('dragstart', () => { dragging = true; });
      n.on('dragmove', e => snap(n, e));
      n.on('dragend', () => { dragging = false; hideGuides(); sk.x = rnd(n.x()); sk.y = rnd(n.y()); afterCanvasEdit(); });
      n.on('transformstart', () => { transforming = true; });
      n.on('transformend', () => {
        transforming = false;
        sk.scale = rnd(Math.abs(n.scaleY()), 3); sk.rot = rnd(n.rotation()); sk.x = rnd(n.x()); sk.y = rnd(n.y());
        afterCanvasEdit(true);
      });
      n.on('dblclick dbltap', () => { if (sk.kind === 'text') setTimeout(() => { const f = $('#inspector [data-content]'); if (f) { f.focus(); f.select(); } }, 30); });
    }
  };

  function afterCanvasEdit(rebuildInspector, skipRender) {
    if (!skipRender) render();
    commit();
    if (rebuildInspector) renderInspector(); else refreshInspectorValues();
    if (pendingRender) { pendingRender = false; scheduleRender(); }
  }

  function render() {
    if (!layer) return;
    if (dragging || transforming) { pendingRender = true; return; }
    if (tr) tr.nodes([]);
    [hl, guideV, guideH, tr].forEach(n => n && n.remove());
    layer.destroyChildren();
    nodes = buildScene(layer, state, { editing: true, bind: bindings });
    layer.add(hl, guideV, guideH, tr);
    layer.batchDraw();
    attachTransformer();
    checkFonts(state);
    scheduleThumbs();
  }
  function scheduleRender() {
    if (dragging || transforming) { pendingRender = true; return; }
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; render(); });
  }

  function cursor(c) { if (stage) stage.container().style.cursor = c; }

  function snap(n, e) {
    if (e && e.evt && e.evt.altKey) { hideGuides(); return; }
    const T = 12;
    let { x, y } = n.position(), sv = false, sh = false;
    if (Math.abs(x - W / 2) < T) { x = W / 2; sv = true; }
    if (Math.abs(y - H / 2) < T) { y = H / 2; sh = true; }
    n.position({ x, y });
    guideV.visible(sv); guideH.visible(sh); uiLayer.batchDraw();
  }
  function hideGuides() { guideV.visible(false); guideH.visible(false); uiLayer.batchDraw(); }

  /* ═════════════ 선택 ═════════════ */
  function sameSel(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function select(s) {
    const changed = !sameSel(s, sel);
    sel = s;
    attachTransformer();
    if (changed) { renderInspector(); renderStickerList(); markSlotCards(); }
  }
  function validateSel() {
    if (!sel) return;
    if (sel.kind === 'slot' && !SLOT_DEFS[state.type].some(s => s.id === sel.id)) sel = null;
    else if (sel.kind === 'sticker' && !(state.stickers[state.type] || []).some(s => s.id === sel.id)) sel = null;
  }
  function attachTransformer() {
    if (!tr) return;
    let n = null;
    if (sel && sel.kind === 'text') n = nodes.texts[sel.key];
    else if (sel && sel.kind === 'sticker') n = nodes.stickers[sel.id];
    tr.nodes(n ? [n] : []);
    tr.visible(!!n);
    if (n) tr.forceUpdate();
    updateHighlight();
  }
  function updateHighlight() {
    if (!hl) return;
    const r = sel && sel.kind === 'slot' ? nodes.slots[sel.id] : null;
    if (r) {
      const g = r.group;
      hl.setAttrs({ visible: true, x: g.x(), y: g.y(), offsetX: g.offsetX(), offsetY: g.offsetY(), rotation: g.rotation(), hw: r.sd.w, hh: r.sd.h, hshape: r.frame.shape, hr: r.frame.radius });
    } else hl.visible(false);
    uiLayer.batchDraw();
  }

  /* ═════════════ 기록 · 저장 ═════════════ */
  const snapshot = () => JSON.stringify(state);
  function commitNow() {
    clearTimeout(commitTimer); commitTimer = null;
    const s = snapshot();
    if (s === lastSnap) return;
    if (lastSnap !== null) { history.push(lastSnap); if (history.length > 100) history.shift(); future = []; }
    lastSnap = s;
    scheduleSave();
    updateUndoButtons();
  }
  function commit(soft) {
    if (soft) { clearTimeout(commitTimer); commitTimer = setTimeout(commitNow, 450); }
    else commitNow();
  }
  function restore(snap) {
    state = migrate(JSON.parse(snap));
    validateSel();
    fullRefresh();
    scheduleSave();
    updateUndoButtons();
  }
  function undo() { commitNow(); if (!history.length) return; future.push(lastSnap); lastSnap = history.pop(); restore(lastSnap); }
  function redo() { if (!future.length) return; history.push(lastSnap); lastSnap = future.pop(); restore(lastSnap); }
  function updateUndoButtons() { $('#undoBtn').disabled = !history.length && !commitTimer; $('#redoBtn').disabled = !future.length; }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!storageOk) return;
      Store.set('state', snapshot()).catch(() => { storageOk = false; toast('브라우저 저장소를 쓸 수 없어 자동 저장이 꺼졌어요. 백업 파일로 저장해 주세요.'); });
    }, 300);
  }

  /* ═════════════ 이미지 ═════════════ */
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const loadImage = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const readFile = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
  async function downscale(src, max = 4096) {
    const img = await loadImage(src);
    const m = Math.max(img.naturalWidth, img.naturalHeight);
    if (m <= max) return src;
    const k = max / m, c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }
  async function registerAsset(id, src) {
    const img = await loadImage(src);
    assets.set(id, { src, img, w: img.naturalWidth, h: img.naturalHeight });
  }
  async function addAssetFromFile(file) {
    const src = await downscale(await readFile(file));
    const id = uid();
    await registerAsset(id, src);
    if (storageOk) Store.set('asset:' + id, src).catch(() => {});
    return id;
  }
  function referencedAssets(st) {
    const ids = new Set();
    Object.values(st.slots || {}).forEach(s => s && s.asset && ids.add(s.asset));
    if (st.bg && st.bg.asset) ids.add(st.bg.asset);
    Object.values(st.stickers || {}).forEach(list => (list || []).forEach(sk => sk.asset && ids.add(sk.asset)));
    return ids;
  }

  let pickCb = null;
  function pickImage(cb) { pickCb = cb; const p = $('#filePicker'); p.value = ''; p.click(); }
  async function handlePicked(file) {
    if (!file || !pickCb) return;
    const cb = pickCb; pickCb = null;
    try { cb(await addAssetFromFile(file)); }
    catch (e) { toast('이미지를 불러오지 못했어요.'); }
  }

  function setSlotAsset(slotId, assetId) {
    state.slots[state.type + ':' + slotId] = { asset: assetId, zoom: 1, dx: 0, dy: 0, rot: 0, flip: false };
    sel = { kind: 'slot', id: slotId };
    render(); commit(); renderSlotList(); renderInspector();
  }
  function curSlotRec() { return sel && sel.kind === 'slot' ? nodes.slots[sel.id] : null; }
  function curSlotState() { return sel && sel.kind === 'slot' ? state.slots[state.type + ':' + sel.id] : null; }
  function applySlotImage() {
    const r = curSlotRec(), s = curSlotState();
    if (!r || !s || !r.img || !r.asset) return;
    placeImage(r.img, s, r.asset, r.sd.w, r.sd.h);
    layer.batchDraw();
  }

  /* ═════════════ 스티커 ═════════════ */
  function curStickers() { return state.stickers[state.type] || (state.stickers[state.type] = []); }
  function nextPos() { const n = curStickers().length % 6; return { x: W / 2 + n * 36, y: H / 2 + n * 36 }; }
  function addTextSticker(text, style) {
    const p = nextPos();
    const sk = { id: uid(), kind: 'text', text, style: Object.assign({}, style || {}), x: p.x, y: p.y, scale: 1, rot: 0, flip: false };
    curStickers().push(sk);
    sel = { kind: 'sticker', id: sk.id };
    render(); commit(); renderStickerList(); renderInspector();
  }
  function addImageSticker(assetId, at) {
    const a = assets.get(assetId); if (!a) return;
    const p = at || nextPos();
    const w = Math.min(520, a.w, 520 * a.w / a.h);
    const sk = { id: uid(), kind: 'image', asset: assetId, w: Math.round(w), x: p.x, y: p.y, scale: 1, rot: 0, flip: false, opacity: 1 };
    curStickers().push(sk);
    sel = { kind: 'sticker', id: sk.id };
    render(); commit(); renderStickerList(); renderInspector();
  }
  function findSticker(id) { return curStickers().find(s => s.id === id); }
  function deleteSticker(id) {
    state.stickers[state.type] = curStickers().filter(s => s.id !== id);
    if (sel && sel.id === id) sel = null;
    render(); commit(); renderStickerList(); renderInspector();
  }
  function dupSticker(id) {
    const sk = findSticker(id); if (!sk) return;
    const c = JSON.parse(JSON.stringify(sk)); c.id = uid(); c.x += 40; c.y += 40;
    curStickers().push(c); sel = { kind: 'sticker', id: c.id };
    render(); commit(); renderStickerList(); renderInspector();
  }
  function moveSticker(id, where) {
    const list = curStickers(), i = list.findIndex(s => s.id === id); if (i < 0) return;
    const [sk] = list.splice(i, 1);
    const j = where === 'front' ? list.length : where === 'back' ? 0 : where === 'up' ? Math.min(list.length, i + 1) : Math.max(0, i - 1);
    list.splice(j, 0, sk);
    render(); commit(); renderStickerList();
  }

  /* ═════════════ 내보내기 ═════════════ */
  function sanitize(name) { return (name || '').replace(/[\\/:*?"<>|\n\r]+/g, '_').trim().slice(0, 80) || 'pair-day'; }
  async function renderExportCanvas() {
    await prepareFonts(state);
    const mult = Number(state.exp.scale) || 1;
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-100000px;top:0;width:1px;height:1px;overflow:hidden';
    document.body.appendChild(holder);
    const es = new Konva.Stage({ container: holder, width: W, height: H });
    const el = new Konva.Layer({ listening: false });
    es.add(el);
    buildScene(el, state, { editing: false });
    el.draw();
    const canvas = es.toCanvas({ pixelRatio: mult });
    es.destroy(); holder.remove();
    return canvas;
  }
  async function exportBlob() {
    const canvas = await renderExportCanvas();
    return new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('PNG 생성 실패')), 'image/png'));
  }
  function exportName() { return sanitize(fillTokens(state.exp.name || '{pair}_D+{days}', state, getTheme(state.theme))); }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  async function doExport(share) {
    const btns = $$('[data-act="export"],[data-act="share"]');
    btns.forEach(b => { b.disabled = true; });
    const label = btns.map(b => b.textContent);
    btns.forEach(b => { b.textContent = '만드는 중…'; });
    try {
      const blob = await exportBlob();
      const filename = exportName() + '.png';
      if (share && navigator.canShare) {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: filename }); return; }
          catch (e) { if (e && e.name === 'AbortError') return; }
        }
      }
      downloadBlob(blob, filename);
      const m = Number(state.exp.scale) || 1;
      toast(`${Math.round(W * m)} × ${Math.round(H * m)} PNG로 저장했어요`);
    } catch (e) {
      console.error(e);
      toast('이미지를 만들지 못했어요. 이미지 크기를 줄이거나 배율을 낮춰 보세요.');
    } finally {
      btns.forEach((b, i) => { b.disabled = false; b.textContent = label[i]; });
    }
  }

  /* ═════════════ 프로젝트 백업 ═════════════ */
  function saveProject() {
    commitNow();
    const data = { app: 'pair-day-maker', v: 1, state, assets: {} };
    referencedAssets(state).forEach(id => { const a = assets.get(id); if (a) data.assets[id] = a.src; });
    downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), exportName() + '.pairday.json');
  }
  async function loadProject(file) {
    try {
      const data = JSON.parse(await file.text());
      if (!data || !data.state) throw new Error('형식 오류');
      for (const [id, src] of Object.entries(data.assets || {})) {
        await registerAsset(id, src);
        if (storageOk) Store.set('asset:' + id, src).catch(() => {});
      }
      commitNow();
      state = migrate(data.state); sel = null;
      fullRefresh(); commitNow();
      toast('백업을 불러왔어요');
    } catch (e) { toast('백업 파일을 읽지 못했어요.'); }
  }

  /* ═════════════ 왼쪽 패널 바인딩 ═════════════ */
  function getPath(path) {
    if (path === '@accent') return (state.accent && state.accent[state.theme]) || getTheme(state.theme).palette.accent;
    if (path.startsWith('@frame.')) return ovl(false).frame[path.slice(7)];
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), state);
  }
  function setPath(path, v) {
    if (path === '@accent') { state.accent[state.theme] = v; return; }
    if (path.startsWith('@frame.')) { ovl(true).frame[path.slice(7)] = v; return; }
    const ks = path.split('.'); let o = state;
    for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  }
  function parseVal(elm, raw) {
    const t = elm.dataset.type || 'str';
    if (t === 'num') return raw === '' ? null : Number(raw);
    if (t === 'bool') return !!raw;
    if (t === 'nstr') return raw === '' ? null : raw;
    if (t === 'nbool') return raw === '' ? null : raw === 'true';
    return raw;
  }
  function fmtVal(elm) {
    const v = Number(elm.value);
    switch (elm.dataset.fmt) {
      case 'pct': return Math.round(v * 100) + '%';
      case 'deg': return v + '°';
      case 'x': return v.toFixed(2) + '×';
      default: return String(rnd(v, 2));
    }
  }
  function bindInputs(root) {
    $$('[data-bind]', root).forEach(elm => {
      if (elm.dataset.bound) return;
      elm.dataset.bound = '1';
      if (elm.classList.contains('seg')) {
        elm.addEventListener('click', e => {
          const b = e.target.closest('button[data-value]'); if (!b) return;
          let v = b.dataset.value; if (elm.dataset.type === 'num') v = Number(v);
          onBind(elm.dataset.bind, v, false);
        });
        return;
      }
      const live = ['range', 'color', 'text', 'number'].includes(elm.type) || elm.tagName === 'TEXTAREA';
      elm.addEventListener(live ? 'input' : 'change', () => {
        const raw = elm.type === 'checkbox' ? elm.checked : elm.value;
        onBind(elm.dataset.bind, parseVal(elm, raw), live);
        const out = elm.parentElement && elm.parentElement.querySelector('.val');
        if (out) out.textContent = fmtVal(elm);
      });
      if (live && (elm.type === 'range' || elm.type === 'color')) elm.addEventListener('change', () => commit());
    });
  }
  function onBind(path, v, soft) {
    setPath(path, v);
    if (path === 'type') validateSel();
    render();
    if (path === 'type' || path === 'theme') { refreshPanels(); renderInspector(); }
    else { syncUI(); if (path.startsWith('texts.') || path === 'globalFont') refreshInspectorValues(); }
    if (path.startsWith('@frame') && sel && sel.kind === 'slot') updateHighlight();
    commit(soft);
  }
  function syncUI() {
    const act = document.activeElement;
    const theme = getTheme(state.theme), L = theme.layouts[state.type];
    const ef = slotFrame(state, theme, L.slots[0]);
    $$('[data-bind]').forEach(elm => {
      const path = elm.dataset.bind;
      let v = getPath(path);
      if (path.startsWith('@frame.') && (v === null || v === undefined)) v = elm.tagName === 'SELECT' ? '' : ef[path.slice(7)];
      if (elm.classList.contains('seg')) {
        $$('button[data-value]', elm).forEach(b => b.classList.toggle('active', String(b.dataset.value) === String(v)));
        return;
      }
      if (elm !== act) {
        if (elm.type === 'checkbox') elm.checked = !!v;
        else if (elm.type === 'color') elm.value = toHex(col(v, theme, state) || '#000000');
        else elm.value = (v === null || v === undefined) ? '' : String(v);
      }
      const out = elm.parentElement && elm.parentElement.querySelector('.val');
      if (out) out.textContent = fmtVal(elm);
    });
    $$('.trow').forEach(r => r.classList.toggle('off', !state.texts[r.dataset.key].visible));
    updateShows(); updateDdayInfo(); updateUndoButtons();
  }
  function updateShows() {
    $$('[data-show]').forEach(elm => {
      const [path, vals] = elm.dataset.show.split('=');
      let v;
      if (path === '@frameShape') { const t = getTheme(state.theme); v = slotFrame(state, t, t.layouts[state.type].slots[0]).shape; }
      else v = getPath(path);
      elm.hidden = !vals.split(',').includes(String(v));
    });
  }
  function updateDdayInfo() {
    const days = calcDays(state);
    const box = $('#ddayResult');
    if (state.dday.mode === 'manual') { box.innerHTML = `직접 입력 · <b>${days}일째</b> · D+${days}`; return; }
    if (!parseYmd(state.dday.start)) { box.innerHTML = '<span class="warn">시작일을 입력해 주세요.</span>'; return; }
    const base = parseYmd(state.dday.base) ? state.dday.base.replace(/-/g, '.') : '오늘';
    box.innerHTML = `${base} 기준 <b>${days}일째</b> · D+${days}` + (days < 1 ? '<br><span class="warn">시작일이 기준일보다 늦어요.</span>' : '');
  }
  const hexCtx = document.createElement('canvas').getContext('2d');
  function toHex(c) {
    if (!c) return '#000000';
    hexCtx.fillStyle = '#000000'; hexCtx.fillStyle = c;
    const v = hexCtx.fillStyle;
    if (v[0] === '#') return v;
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(v);
    if (!m) return '#000000';
    return '#' + [m[1], m[2], m[3]].map(x => Math.round(+x).toString(16).padStart(2, '0')).join('');
  }

  function refreshPanels() {
    markTheme(); buildTextList(); renderSlotList(); renderStickerList(); renderGlobalFont(); syncUI();
  }
  function fullRefresh() { render(); refreshPanels(); renderInspector(); }

  /* ── 테마 카드 ── */
  function buildThemeGrid() {
    const g = $('#themeGrid'); g.innerHTML = '';
    THEMES.forEach(t => {
      const b = h('button', { type: 'button', class: 'theme-card', 'data-theme': t.id },
        h('img', { class: 'thumb', alt: '' }), h('span', { class: 'tn' }, t.name), h('span', { class: 'td' }, t.desc));
      b.addEventListener('click', () => { if (state.theme !== t.id) onBind('theme', t.id, false); });
      g.appendChild(b);
    });
  }
  function markTheme() { $$('.theme-card').forEach(c => c.classList.toggle('active', c.dataset.theme === state.theme)); }

  let thumbStage = null, thumbLayer = null, thumbTimer = null;
  function scheduleThumbs() { clearTimeout(thumbTimer); thumbTimer = setTimeout(renderThumbs, 450); }
  function renderThumbs() {
    if (dragging || transforming) { scheduleThumbs(); return; }
    if (!thumbStage) {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;left:-100000px;top:0;width:384px;height:216px;overflow:hidden';
      document.body.appendChild(d);
      thumbStage = new Konva.Stage({ container: d, width: 384, height: 216 });
      thumbLayer = new Konva.Layer({ listening: false });
      thumbStage.add(thumbLayer);
      thumbLayer.scale({ x: 0.2, y: 0.2 });
    }
    THEMES.forEach(t => {
      const st2 = Object.assign({}, state, { theme: t.id });
      thumbLayer.destroyChildren();
      try { buildScene(thumbLayer, st2, { editing: false }); } catch (e) { console.error(e); return; }
      thumbLayer.draw();
      const img = $(`.theme-card[data-theme="${t.id}"] img`);
      if (img) img.src = thumbStage.toDataURL({ pixelRatio: 1 });
      if (t.id !== state.theme) checkFonts(st2);
    });
  }

  /* ── 텍스트 목록 ── */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function buildTextList() {
    const theme = getTheme(state.theme), box = $('#textList');
    box.innerHTML = '';
    TEXT_KEYS.forEach(k => {
      const ph = esc(theme.defaults && theme.defaults[k] != null ? theme.defaults[k] : DEFAULT_CONTENT[k]);
      const row = h('div', { class: 'trow', 'data-key': k });
      row.innerHTML = `<label class="tchk" title="표시"><input type="checkbox" data-bind="texts.${k}.visible" data-type="bool"></label>
        <div class="tmain"><div class="thead"><span>${TEXT_LABEL[k]}</span><button type="button" class="link" data-act="edit-text" data-key="${k}">스타일</button></div>
        ${MULTI.has(k) ? `<textarea rows="2" data-bind="texts.${k}.content" data-type="nstr" placeholder="${ph}"></textarea>` : `<input type="text" data-bind="texts.${k}.content" data-type="nstr" placeholder="${ph}">`}</div>`;
      box.appendChild(row);
    });
    bindInputs(box);
  }
  function renderGlobalFont() {
    $('#globalFontPicker').replaceChildren(fontPicker(state.globalFont, f => { state.globalFont = f; render(); commit(); refreshInspectorValues(); }, { allowDefault: true, defaultLabel: '테마 기본 폰트' }));
  }

  /* ── 이미지 슬롯 목록 ── */
  function renderSlotList() {
    const box = $('#slotList'); box.innerHTML = '';
    SLOT_DEFS[state.type].forEach(sd => {
      const s = state.slots[state.type + ':' + sd.id];
      const a = s && assets.get(s.asset);
      const th = h('div', { class: 'slot-thumb' + (a ? ' has' : ''), 'data-act': a ? 'slot-edit' : 'slot-upload', 'data-slot': sd.id, title: a ? '조정하기' : '이미지 넣기' }, a ? '' : '＋');
      if (a) th.style.backgroundImage = `url("${a.src}")`;
      const btns = h('div', { class: 'btns' },
        h('button', { type: 'button', class: 'mini', 'data-act': 'slot-upload', 'data-slot': sd.id }, a ? '교체' : '이미지 넣기'),
        a ? h('button', { type: 'button', class: 'mini', 'data-act': 'slot-edit', 'data-slot': sd.id }, '크롭·조정') : null,
        a ? h('button', { type: 'button', class: 'mini danger', 'data-act': 'slot-remove', 'data-slot': sd.id }, '삭제') : null);
      box.appendChild(h('div', { class: 'slot-card', 'data-slot': sd.id }, th, h('div', { class: 'slot-info' }, h('b', null, sd.label), h('span', { class: 'note' }, sd.hint), btns)));
    });
    markSlotCards();
  }
  function markSlotCards() { $$('.slot-card').forEach(c => c.classList.toggle('active', !!(sel && sel.kind === 'slot' && sel.id === c.dataset.slot))); }

  /* ── 스티커 목록 ── */
  function renderStickerList() {
    const box = $('#stickerList'); box.innerHTML = '';
    curStickers().slice().reverse().forEach(sk => {
      const a = sk.kind === 'image' && assets.get(sk.asset);
      const ic = h('span', { class: 'ic' }, sk.kind === 'text' ? 'T' : '');
      if (a) ic.style.backgroundImage = `url("${a.src}")`;
      const row = h('div', { class: 'stk-row' + (sel && sel.kind === 'sticker' && sel.id === sk.id ? ' active' : ''), 'data-act': 'sticker-select', 'data-id': sk.id },
        ic, h('span', { class: 'nm' }, sk.kind === 'text' ? sk.text : '이미지 스티커'),
        h('button', { type: 'button', class: 'mini danger', 'data-act': 'sticker-delete', 'data-id': sk.id, title: '삭제' }, '삭제'));
      box.appendChild(row);
    });
  }

  /* ═════════════ 인스펙터 ═════════════ */
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach(c => { if (c == null || c === false) return; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  const fieldC = (label, ...ctl) => h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), ...ctl);
  function rangeC(v, min, max, step, onIn, fmt) {
    const show = n => (fmt ? fmt(n) : String(rnd(n, 2)));
    const out = h('span', { class: 'val' }, show(v));
    const inp = h('input', { type: 'range', min, max, step, value: v });
    inp.addEventListener('input', () => { const n = Number(inp.value); out.textContent = show(n); onIn(n); });
    inp.addEventListener('change', () => commit());
    inp._set = n => { inp.value = n; out.textContent = show(n); };
    return h('div', { class: 'range' }, inp, out);
  }
  function colorC(v, onIn) {
    const inp = h('input', { type: 'color', value: toHex(v) });
    inp.addEventListener('input', () => onIn(inp.value));
    inp.addEventListener('change', () => commit());
    return inp;
  }
  function selectC(opts, v, onCh) {
    const s = h('select', null, opts.map(([val, label]) => h('option', { value: val }, label)));
    s.value = String(v);
    s.addEventListener('change', () => onCh(s.value));
    return s;
  }
  function segC(opts, v, onCh) {
    const d = h('div', { class: 'seg small' });
    opts.forEach(([val, label]) => {
      const b = h('button', { type: 'button', class: String(val) === String(v) ? 'active' : '' }, label);
      b.addEventListener('click', () => { $$('button', d).forEach(x => x.classList.remove('active')); b.classList.add('active'); onCh(val); });
      d.appendChild(b);
    });
    return d;
  }
  function toggleC(label, v, onCh) {
    const inp = h('input', { type: 'checkbox' }); inp.checked = !!v;
    inp.addEventListener('change', () => onCh(inp.checked));
    return h('label', { class: 'check' }, inp, ' ' + label);
  }
  function fontPicker(value, onChange, opt) {
    opt = opt || {};
    const s = h('select');
    if (opt.allowDefault) s.appendChild(h('option', { value: '' }, opt.defaultLabel || '테마 기본'));
    Fonts.PRESETS.forEach(g => s.appendChild(h('optgroup', { label: g.group }, g.items.map(it => h('option', { value: it.f }, it.label || it.f)))));
    if (state.customFonts.length) s.appendChild(h('optgroup', { label: '직접 추가한 폰트' }, state.customFonts.map(f => h('option', { value: f }, f))));
    s.appendChild(h('option', { value: '__custom' }, '＋ Google Fonts 이름으로 추가…'));
    s.value = value || '';
    if (value && s.value !== value) { s.insertBefore(h('option', { value }, value), s.firstChild); s.value = value; }
    const inp = h('input', { type: 'text', placeholder: '예: Noto Sans KR' });
    const btn = h('button', { type: 'button', class: 'mini' }, '불러오기');
    const custom = h('div', { class: 'font-custom', hidden: true }, inp, btn);
    s.addEventListener('change', () => {
      if (s.value === '__custom') { custom.hidden = false; s.value = value || ''; inp.focus(); return; }
      custom.hidden = true; value = s.value || null; onChange(value);
    });
    const go = async () => {
      const name = inp.value.trim().replace(/\s+/g, ' ');
      if (!name) return;
      btn.disabled = true; btn.textContent = '확인 중…';
      const ok = await Fonts.addCustom(name);
      btn.disabled = false; btn.textContent = '불러오기';
      if (!ok) { toast('폰트를 찾지 못했어요. Google Fonts에 표시된 이름을 대소문자까지 그대로 입력해 주세요.'); return; }
      if (!state.customFonts.includes(name)) state.customFonts.push(name);
      value = name; onChange(name); renderGlobalFont();
      toast(`'${name}' 폰트를 추가했어요`);
    };
    btn.addEventListener('click', go);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    return h('div', { class: 'font-picker' }, s, custom);
  }
  const WEIGHTS = [[100, '100 Thin'], [200, '200 ExtraLight'], [300, '300 Light'], [400, '400 Regular'], [500, '500 Medium'], [600, '600 SemiBold'], [700, '700 Bold'], [800, '800 ExtraBold'], [900, '900 Black']];

  /** 텍스트 스타일 컨트롤 (본문 텍스트·텍스트 스티커 공용) */
  function styleControls(get, setS, opt) {
    opt = opt || {};
    const theme = getTheme(state.theme);
    const sp = get();
    const wrap = h('div', { class: 'insp-body' });
    const live = (p, v) => { setS(p, v); render(); commit(true); };
    const hard = (p, v) => { setS(p, v); render(); commit(); renderInspector(); };

    wrap.append(fieldC('폰트', fontPicker(opt.familyOverridden ? sp.family : (opt.allowFamilyDefault ? null : sp.family), f => hard('family', f), { allowDefault: opt.allowFamilyDefault, defaultLabel: opt.allowFamilyDefault ? `테마 기본 (${sp.family === PRET ? 'Pretendard' : sp.family})` : undefined })));
    wrap.append(h('div', { class: 'grid2' },
      fieldC('굵기', selectC(WEIGHTS, sp.weight || 400, v => hard('weight', Number(v)))),
      fieldC('색상', h('div', { class: 'color-row' }, colorC(col(sp.color, theme, state), v => live('color', v)),
        h('button', { type: 'button', class: 'mini' + (sp.color === 'accent' ? ' on' : ''), title: '포인트 컬러 따라가기', onclick: () => hard('color', 'accent') }, '포인트')))));
    wrap.append(fieldC('크기', rangeC(sp.size, 8, 400, 1, v => live('size', v))));
    wrap.append(h('div', { class: 'grid2' },
      fieldC('자간', rangeC(sp.ls || 0, -20, 60, 0.5, v => live('ls', v))),
      fieldC('행간', rangeC(sp.lh || 1.25, 0.8, 2.6, 0.05, v => live('lh', v)))));
    wrap.append(fieldC('여러 줄 정렬', segC([['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']], sp.talign || sp.align || 'left', v => hard('talign', v))));
    wrap.append(toggleC('기울임 (이탤릭)', sp.italic, v => hard('italic', v)));
    wrap.append(fieldC('줄바꿈 너비 (0 = 자동)', rangeC(sp.width || 0, 0, 1800, 10, v => live('width', v || 0))));

    const g1 = h('div', { class: 'insp-group' }, h('div', { class: 'gtitle' }, '외곽선'),
      h('div', { class: 'grid2' },
        fieldC('두께', rangeC(sp.strokeWidth || 0, 0, 24, 0.5, v => live('strokeWidth', v))),
        fieldC('색', colorC(col(sp.strokeColor || '#FFFFFF', theme, state), v => live('strokeColor', v)))));
    wrap.append(g1);

    const g2 = h('div', { class: 'insp-group' }, h('div', { class: 'gtitle' }, '그림자 · 빛번짐'),
      toggleC('사용', !!sp.shadow, v => hard('shadow', v ? { color: '#000000', blur: 16, opacity: 0.5, x: 0, y: 3 } : null)));
    if (sp.shadow) {
      const setSh = (k, v) => { const cur = Object.assign({}, get().shadow || {}); cur[k] = v; live('shadow', cur); };
      g2.append(
        h('div', { class: 'grid2' },
          fieldC('색', colorC(col(sp.shadow.color || '#000000', theme, state), v => setSh('color', v))),
          fieldC('진하기', rangeC(sp.shadow.opacity == null ? 0.5 : sp.shadow.opacity, 0, 1, 0.01, v => setSh('opacity', v), n => Math.round(n * 100) + '%'))),
        h('div', { class: 'grid2' },
          fieldC('번짐', rangeC(sp.shadow.blur == null ? 12 : sp.shadow.blur, 0, 80, 1, v => setSh('blur', v))),
          fieldC('아래로', rangeC(sp.shadow.y || 0, -30, 30, 1, v => setSh('y', v)))));
    }
    wrap.append(g2);
    wrap.append(h('div', { class: 'insp-group' }, fieldC('투명도', rangeC(sp.opacity == null ? 1 : sp.opacity, 0.05, 1, 0.01, v => live('opacity', v), n => Math.round(n * 100) + '%'))));
    return wrap;
  }

  function inspHead(kind, title) {
    return h('div', { class: 'insp-head' },
      h('div', null, h('div', { class: 'insp-kind' }, kind), h('div', { class: 'insp-title' }, title)),
      h('button', { type: 'button', class: 'mini', 'data-act': 'deselect' }, '선택 해제'));
  }

  function renderInspector() {
    const box = $('#inspector');
    box.innerHTML = '';
    if (!sel) return inspectEmpty(box);
    if (sel.kind === 'text') return inspectText(box, sel.key);
    if (sel.kind === 'slot') return inspectSlot(box, sel.id);
    if (sel.kind === 'sticker') return inspectSticker(box, sel.id);
  }
  function refreshInspectorValues() {
    // 인스펙터 안의 data-bind 요소만 갱신 (전체 재생성 없이)
    syncUI();
    if (sel && sel.kind === 'slot') {
      const s = curSlotState(); if (!s) return;
      const z = $('#inspector [data-slot-zoom]'), r = $('#inspector [data-slot-rot]');
      if (z && z._set) z._set(s.zoom); if (r && r._set) r._set(s.rot || 0);
    }
  }

  function inspectEmpty(box) {
    box.appendChild(h('div', { class: 'insp-empty' },
      h('h3', null, '선택한 요소가 없어요'),
      h('ul', null,
        h('li', null, '캔버스의 글자·이미지·스티커를 클릭하면 여기서 자세히 편집할 수 있어요.'),
        h('li', null, '빈 프레임을 클릭하면 바로 이미지를 넣을 수 있어요.'),
        h('li', null, '글자는 드래그로 옮기고, 모서리 핸들로 크기·회전을 바꿔요.'),
        h('li', null, '프레임 속 이미지는 드래그로 위치를, 마우스 휠로 확대를 조절해요.'),
        h('li', null, '테마마다 수정한 위치·스타일은 따로 기억돼요.'))));
  }

  function inspectText(box, key) {
    const theme = getTheme(state.theme), L = theme.layouts[state.type];
    const get = () => resolveTextSpec(state, theme, L, key).sp;
    const setS = (p, v) => {
      const o = textOver(key, true); o.style = o.style || {};
      if (p === 'family' && !v) delete o.style.family; else o.style[p] = v;
    };
    const ph = theme.defaults && theme.defaults[key] != null ? theme.defaults[key] : DEFAULT_CONTENT[key];
    const content = MULTI.has(key)
      ? h('textarea', { rows: 3, 'data-bind': `texts.${key}.content`, 'data-type': 'nstr', 'data-content': '', placeholder: ph })
      : h('input', { type: 'text', 'data-bind': `texts.${key}.content`, 'data-type': 'nstr', 'data-content': '', placeholder: ph });
    const vis = h('label', { class: 'check' }, h('input', { type: 'checkbox', 'data-bind': `texts.${key}.visible`, 'data-type': 'bool' }), ' 캔버스에 표시');
    const o = textOver(key, false);
    const top = h('div', { class: 'insp-body' }, fieldC('내용', content), vis);
    box.append(inspHead('텍스트', TEXT_LABEL[key]), top);
    bindInputs(top);
    const sc = styleControls(get, setS, { allowFamilyDefault: true, familyOverridden: !!(o.style && o.style.family) });
    box.append(h('div', { class: 'insp-group' }, sc));
    const n = nodes.texts[key];
    const rotCtl = rangeC(o.pos ? (o.pos.rotation || 0) : (n ? rnd(n.rotation()) : 0), -180, 180, 1, v => {
      const nn = nodes.texts[key]; if (!nn) return;
      const oo = textOver(key, true);
      oo.pos = { x: rnd(nn.x()), y: rnd(nn.y()), rotation: v };
      render(); commit(true);
    }, x => x + '°');
    box.append(h('div', { class: 'insp-group' }, fieldC('회전', rotCtl),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn', 'data-act': 'text-reset-pos' }, '위치 되돌리기'),
        h('button', { type: 'button', class: 'btn', 'data-act': 'text-reset-style' }, '스타일 되돌리기'))));
    syncUI();
  }

  function inspectSlot(box, id) {
    const sd = SLOT_DEFS[state.type].find(s => s.id === id);
    const s = state.slots[state.type + ':' + id];
    box.append(inspHead('캐릭터 이미지', sd ? sd.label : ''));
    const body = h('div', { class: 'insp-body' });
    box.append(body);
    if (!s || !assets.get(s.asset)) {
      body.append(h('p', { class: 'note' }, '아직 이미지가 없어요. ' + (sd ? sd.hint : '')),
        h('button', { type: 'button', class: 'btn primary block', 'data-act': 'slot-upload', 'data-slot': id }, '이미지 넣기'));
      return;
    }
    const prev = h('div', { class: 'insp-preview' }); prev.style.backgroundImage = `url("${assets.get(s.asset).src}")`;
    const zoom = rangeC(s.zoom || 1, 0.2, 6, 0.01, v => { s.zoom = v; applySlotImage(); commit(true); }, n => n.toFixed(2) + '×');
    zoom.querySelector('input').setAttribute('data-slot-zoom', '');
    const rot = rangeC(s.rot || 0, -180, 180, 1, v => { s.rot = v; applySlotImage(); commit(true); }, n => n + '°');
    rot.querySelector('input').setAttribute('data-slot-rot', '');
    body.append(prev, fieldC('확대 · 축소', zoom), fieldC('회전', rot));
    body.append(h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn', 'data-act': 'slot-fill' }, '꽉 채우기'),
      h('button', { type: 'button', class: 'btn', 'data-act': 'slot-contain' }, '전체 보이기'),
      h('button', { type: 'button', class: 'btn', 'data-act': 'slot-flip' }, '좌우 반전')));
    body.append(h('p', { class: 'note' }, '캔버스에서 이미지를 드래그하면 위치가, 마우스 휠(모바일은 두 손가락)로 확대가 바뀌어요. 프레임 모양은 왼쪽 ‘캐릭터 이미지’에서 바꿀 수 있어요.'));
    body.append(h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn', 'data-act': 'slot-upload', 'data-slot': id }, '이미지 교체'),
      h('button', { type: 'button', class: 'btn', 'data-act': 'slot-remove', 'data-slot': id }, '이미지 삭제')));
  }

  function inspectSticker(box, id) {
    const sk = findSticker(id);
    if (!sk) { sel = null; return inspectEmpty(box); }
    box.append(inspHead('스티커', sk.kind === 'text' ? '텍스트 스티커' : '이미지 스티커'));
    const body = h('div', { class: 'insp-body' });
    box.append(body);
    if (sk.kind === 'text') {
      const ta = h('textarea', { rows: 2, 'data-content': '' }); ta.value = sk.text;
      ta.addEventListener('input', () => { sk.text = ta.value; render(); commit(true); renderStickerList(); });
      body.append(fieldC('내용', ta));
      body.append(styleControls(() => stickerSpec(sk), (p, v) => { sk.style = sk.style || {}; sk.style[p] = v; }, {}));
    } else {
      const prev = h('div', { class: 'insp-preview' }); prev.style.backgroundImage = `url("${(assets.get(sk.asset) || {}).src}")`;
      body.append(prev, fieldC('투명도', rangeC(sk.opacity == null ? 1 : sk.opacity, 0.05, 1, 0.01, v => { sk.opacity = v; const n = nodes.stickers[sk.id]; if (n) { n.opacity(v); layer.batchDraw(); } commit(true); }, n => Math.round(n * 100) + '%')));
    }
    body.append(h('div', { class: 'insp-group' },
      h('div', { class: 'grid2' },
        fieldC('크기', rangeC(sk.scale || 1, 0.1, 6, 0.01, v => { sk.scale = v; render(); commit(true); }, n => n.toFixed(2) + '×')),
        fieldC('회전', rangeC(sk.rot || 0, -180, 180, 1, v => { sk.rot = v; render(); commit(true); }, n => n + '°'))),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn', 'data-act': 'stk-front' }, '맨 앞으로'),
        h('button', { type: 'button', class: 'btn', 'data-act': 'stk-back' }, '맨 뒤로')),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn', 'data-act': 'stk-flip' }, '좌우 반전'),
        h('button', { type: 'button', class: 'btn', 'data-act': 'stk-dup' }, '복제'),
        h('button', { type: 'button', class: 'btn', 'data-act': 'stk-del' }, '삭제'))));
  }

  /* ═════════════ 동작 ═════════════ */
  function slotDims(id) {
    const L = getTheme(state.theme).layouts[state.type];
    return L.slots.find(s => s.id === id);
  }
  const ACTIONS = {
    'deselect': () => select(null),
    'edit-text': b => { select({ kind: 'text', key: b.dataset.key }); revealInspector(); },
    'accent-reset': () => { delete state.accent[state.theme]; render(); syncUI(); commit(); },
    'grad-swap': () => { const t = state.bg.g1; state.bg.g1 = state.bg.g2; state.bg.g2 = t; render(); syncUI(); commit(); },
    'slot-upload': b => pickImage(id => setSlotAsset(b.dataset.slot, id)),
    'slot-edit': b => { select({ kind: 'slot', id: b.dataset.slot }); revealInspector(); },
    'slot-remove': b => { delete state.slots[state.type + ':' + b.dataset.slot]; render(); commit(); renderSlotList(); renderInspector(); },
    'slot-fill': () => { const s = curSlotState(); if (!s) return; Object.assign(s, { zoom: 1, dx: 0, dy: 0, rot: 0 }); applySlotImage(); commit(); renderInspector(); },
    'slot-contain': () => {
      const s = curSlotState(), a = s && assets.get(s.asset), sd = sel && slotDims(sel.id); if (!a || !sd) return;
      s.zoom = rnd(Math.min(sd.w / a.w, sd.h / a.h) / Math.max(sd.w / a.w, sd.h / a.h), 3); s.dx = 0; s.dy = 0;
      applySlotImage(); commit(); renderInspector();
    },
    'slot-flip': () => { const s = curSlotState(); if (!s) return; s.flip = !s.flip; applySlotImage(); commit(); },
    'frame-reset': () => { ovl(true).frame = {}; render(); syncUI(); commit(); updateHighlight(); },
    'bg-upload': () => pickImage(id => { state.bg.asset = id; state.bg.mode = 'image'; render(); syncUI(); commit(); }),
    'bg-remove': () => { state.bg.asset = null; render(); syncUI(); commit(); },
    'sticker-image': () => pickImage(id => addImageSticker(id)),
    'sticker-text': () => addTextSticker('TEXT'),
    'symbol': b => addTextSticker(b.dataset.sym, { size: 110 }),
    'sticker-select': (b, e) => { if (e.target.closest('[data-act="sticker-delete"]')) return; select({ kind: 'sticker', id: b.dataset.id }); revealInspector(); },
    'sticker-delete': b => deleteSticker(b.dataset.id),
    'stk-front': () => sel && moveSticker(sel.id, 'front'),
    'stk-back': () => sel && moveSticker(sel.id, 'back'),
    'stk-dup': () => sel && dupSticker(sel.id),
    'stk-del': () => sel && deleteSticker(sel.id),
    'stk-flip': () => { const sk = sel && findSticker(sel.id); if (!sk) return; sk.flip = !sk.flip; render(); commit(); },
    'text-reset-pos': () => { const o = textOver(sel.key, false); delete o.pos; render(); commit(); renderInspector(); },
    'text-reset-style': () => { const o = textOver(sel.key, false); delete o.style; render(); commit(); renderInspector(); },
    'export': () => doExport(false),
    'share': () => doExport(true),
    'project-save': saveProject,
    'project-load': () => { const p = $('#projectPicker'); p.value = ''; p.click(); },
    'reset': () => {
      if (!confirm('모든 설정과 이미지를 지우고 처음부터 시작할까요? (되돌리기로 복구할 수 있어요)')) return;
      commitNow(); state = defaultState(); sel = null; fullRefresh(); commitNow();
    }
  };
  function revealInspector() {
    if (window.matchMedia('(max-width: 1240px)').matches) $('#inspector').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function nudge(dx, dy) {
    if (!sel) return;
    if (sel.kind === 'text') {
      const n = nodes.texts[sel.key]; if (!n) return;
      const o = textOver(sel.key, true);
      o.pos = { x: rnd(n.x() + dx), y: rnd(n.y() + dy), rotation: rnd(n.rotation()) };
      render();
    } else if (sel.kind === 'sticker') {
      const sk = findSticker(sel.id); if (!sk) return;
      sk.x += dx; sk.y += dy; render();
    } else if (sel.kind === 'slot') {
      const s = curSlotState(), r = curSlotRec(); if (!s || !r) return;
      s.dx = rnd((s.dx || 0) + dx / r.sd.w, 4); s.dy = rnd((s.dy || 0) + dy / r.sd.h, 4); applySlotImage();
    }
    commit(true);
  }
  function zoomSelected(k) {
    if (!sel) return false;
    if (sel.kind === 'slot') {
      const s = curSlotState(); if (!s) return false;
      s.zoom = rnd(clamp((s.zoom || 1) * k, 0.2, 6), 3); applySlotImage(); refreshInspectorValues(); commit(true); return true;
    }
    if (sel.kind === 'sticker') {
      const sk = findSticker(sel.id); if (!sk) return false;
      sk.scale = rnd(clamp((sk.scale || 1) * k, 0.1, 6), 3); render(); commit(true); return true;
    }
    return false;
  }

  /* ═════════════ 토스트 ═════════════ */
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ═════════════ 캔버스 크기 ═════════════ */
  function fitStage() {
    const wrap = $('#stageWrap');
    const narrow = window.matchMedia('(max-width: 820px)').matches;
    const cw = wrap.clientWidth;
    let w = cw;
    if (!narrow) {
      const ch = wrap.clientHeight;
      if (ch > 0 && w * 9 / 16 > ch) w = ch * 16 / 9;
    } else {
      w = Math.min(cw, (window.innerHeight * 0.45) * 16 / 9);
    }
    w = Math.max(240, Math.floor(w));
    const hh = Math.round(w * 9 / 16);
    if (narrow) wrap.style.height = hh + 'px'; else wrap.style.height = '';
    stage.size({ width: w, height: hh });
    stage.scale({ x: w / W, y: w / W });
    stage.batchDraw();
  }

  /* ═════════════ 시작 ═════════════ */
  async function init() {
    stage = new Konva.Stage({ container: 'stage', width: 960, height: 540 });
    layer = new Konva.Layer();
    uiLayer = layer; // 선택 표시도 같은 레이어에 그린다 (매번 전체를 다시 그림)
    stage.add(layer);
    tr = new Konva.Transformer({
      rotateEnabled: true, keepRatio: true, flipEnabled: false, ignoreStroke: true, padding: 6,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315], rotationSnapTolerance: 4,
      borderStroke: SEL_COLOR, anchorStroke: SEL_COLOR, anchorFill: '#FFFFFF', anchorSize: 10, anchorCornerRadius: 5,
      boundBoxFunc: (o, n) => (Math.abs(n.width) < 12 || Math.abs(n.height) < 12 ? o : n)
    });
    hl = new Konva.Shape({
      visible: false, listening: false, stroke: SEL_COLOR, strokeWidth: 2, dash: [8, 6], strokeScaleEnabled: false,
      sceneFunc: (c, s) => { c.beginPath(); shapePath(c, s.getAttr('hshape'), 0, 0, s.getAttr('hw'), s.getAttr('hh'), s.getAttr('hr')); c.closePath(); c.fillStrokeShape(s); }
    });
    guideV = new Konva.Line({ points: [W / 2, 0, W / 2, H], stroke: '#FF4D8D', strokeWidth: 1, strokeScaleEnabled: false, dash: [6, 4], visible: false, listening: false });
    guideH = new Konva.Line({ points: [0, H / 2, W, H / 2], stroke: '#FF4D8D', strokeWidth: 1, strokeScaleEnabled: false, dash: [6, 4], visible: false, listening: false });
    layer.add(hl, guideV, guideH, tr);

    // 저장된 작업 불러오기
    let saved = null;
    try { saved = await Store.get('state'); } catch (e) { storageOk = false; }
    try { state = saved ? migrate(JSON.parse(saved)) : defaultState(); } catch (e) { state = defaultState(); }
    if (storageOk) {
      const ids = referencedAssets(state);
      for (const id of ids) {
        try { const src = await Store.get('asset:' + id); if (src) await registerAsset(id, src); } catch (e) { /* 무시 */ }
      }
      // 쓰지 않는 이미지 정리
      Store.keys().then(keys => keys.forEach(k => { if (String(k).startsWith('asset:') && !ids.has(String(k).slice(6))) Store.del(k).catch(() => {}); })).catch(() => {});
    }
    // 사라진 이미지 참조 정리
    Object.keys(state.slots).forEach(k => { const s = state.slots[k]; if (!s || !assets.get(s.asset)) delete state.slots[k]; });
    if (state.bg.asset && !assets.get(state.bg.asset)) state.bg.asset = null;
    Object.keys(state.stickers).forEach(t => { state.stickers[t] = (state.stickers[t] || []).filter(sk => sk.kind !== 'image' || assets.get(sk.asset)); });

    buildThemeGrid();
    $('#symbolGrid').append(...SYMBOLS.map(s => h('button', { type: 'button', 'data-act': 'symbol', 'data-sym': s, title: s + ' 추가' }, s)));
    bindInputs(document);
    if (navigator.canShare && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) $('#shareBtn').hidden = false;

    // 이벤트
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const fn = ACTIONS[b.dataset.act]; if (fn) fn(b, e);
    });
    $('#undoBtn').addEventListener('click', undo);
    $('#redoBtn').addEventListener('click', redo);
    $('#filePicker').addEventListener('change', e => handlePicked(e.target.files[0]));
    $('#projectPicker').addEventListener('change', e => { const f = e.target.files[0]; if (f) loadProject(f); });

    document.addEventListener('keydown', e => {
      const t = e.target;
      const typing = t && ((t.tagName === 'INPUT' && !['checkbox', 'button'].includes(t.type)) || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      const mod = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
      if (mod && key === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && key === 'y' && !typing) { e.preventDefault(); redo(); return; }
      if (typing) return;
      if (e.key === 'Escape') { select(null); return; }
      if (!sel) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel.kind === 'sticker') { e.preventDefault(); deleteSticker(sel.id); return; }
      if (mod && key === 'd' && sel.kind === 'sticker') { e.preventDefault(); dupSticker(sel.id); return; }
      const ar = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (ar) { e.preventDefault(); const m = e.shiftKey ? 10 : 1; nudge(ar[0] * m, ar[1] * m); }
    });

    const wrapEl = $('#stageWrap');
    stage.container().addEventListener('wheel', e => {
      if (!sel || (sel.kind !== 'slot' && sel.kind !== 'sticker')) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY; // 줄 단위 → 픽셀
      zoomSelected(clamp(Math.pow(1.0015, -dy), 0.8, 1.25));
    }, { passive: false });

    // 두 손가락 확대 (모바일)
    let pinch = null;
    stage.on('touchmove', e => {
      const t = e.evt.touches;
      if (!t || t.length !== 2 || !sel || (sel.kind !== 'slot' && sel.kind !== 'sticker')) return;
      e.evt.preventDefault();
      const d = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      if (!pinch) {
        pinch = { d };
        layer.find(n => n.isDragging && n.isDragging()).forEach(n => n.stopDrag());
        return;
      }
      zoomSelected(d / pinch.d); pinch.d = d;
    });
    stage.on('touchend', () => { if (pinch) { pinch = null; dragging = false; commit(); } });

    // 파일 끌어다 놓기
    wrapEl.addEventListener('dragover', e => { if ([...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); wrapEl.classList.add('drop'); } });
    wrapEl.addEventListener('dragleave', () => wrapEl.classList.remove('drop'));
    wrapEl.addEventListener('drop', async e => {
      e.preventDefault(); wrapEl.classList.remove('drop');
      const f = [...e.dataTransfer.files].find(x => x.type.startsWith('image/')); if (!f) return;
      stage.setPointersPositions(e);
      const p = stage.getPointerPosition();
      let slotId = null;
      if (p) { let n = layer.getIntersection(p); while (n && !n.getAttr('slotId')) n = n.getParent(); if (n) slotId = n.getAttr('slotId'); }
      try {
        const id = await addAssetFromFile(f);
        if (slotId) setSlotAsset(slotId, id);
        else addImageSticker(id, p ? { x: p.x / stage.scaleX(), y: p.y / stage.scaleY() } : null);
      } catch (err) { toast('이미지를 불러오지 못했어요.'); }
    });
    // 붙여넣기
    document.addEventListener('paste', async e => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const item = [...(e.clipboardData ? e.clipboardData.items : [])].find(i => i.type.startsWith('image/'));
      if (!item) return;
      e.preventDefault();
      try {
        const id = await addAssetFromFile(item.getAsFile());
        if (sel && sel.kind === 'slot') setSlotAsset(sel.id, id); else addImageSticker(id);
      } catch (err) { toast('이미지를 붙여 넣지 못했어요.'); }
    });

    new ResizeObserver(() => { fitStage(); updateHighlight(); }).observe(wrapEl);
    window.addEventListener('resize', fitStage);
    if (document.fonts) document.fonts.addEventListener('loadingdone', () => scheduleRender());

    fitStage();
    refreshPanels();
    render();
    renderInspector();
    lastSnap = snapshot();
    updateUndoButtons();
    if (!storageOk) toast('이 브라우저에서는 자동 저장이 안 돼요. 백업 파일 저장을 이용해 주세요.');

    // 디버그·테스트용
    window.PairDay = { get state() { return state; }, render, exportBlob, renderExportCanvas, select, addTextSticker, setSlotAssetFromSrc: async (slot, src) => { const id = uid(); await registerAsset(id, src); setSlotAsset(slot, id); return id; }, setBgFromSrc: async src => { const id = uid(); await registerAsset(id, src); state.bg.asset = id; state.bg.mode = 'image'; render(); syncUI(); commit(); } };
  }

  init();
})();
