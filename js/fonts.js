/* 폰트 관리: Pretendard 기본 + Google Fonts 추천 목록 / 이름 직접 입력 */
window.Fonts = (function () {
  const PRET = 'Pretendard Variable';

  // ax: Google Fonts css2 굵기 지정 (없으면 자동 탐색)
  const PRESETS = [
    { group: '기본', items: [{ f: PRET, label: 'Pretendard (기본)' }] },
    { group: '고딕', items: [
      { f: 'Noto Sans KR', ax: 'wght@100..900' },
      { f: 'IBM Plex Sans KR', ax: 'wght@100;200;300;400;500;600;700' },
      { f: 'Gothic A1', ax: 'wght@100;200;300;400;500;600;700;800;900' },
      { f: 'Nanum Gothic', ax: 'wght@400;700;800' },
      { f: 'Gowun Dodum' },
      { f: 'Sunflower', ax: 'wght@300;500;700' },
      { f: 'Orbit' },
      { f: 'Do Hyeon' },
      { f: 'Jua' },
      { f: 'Black Han Sans' },
      { f: 'Dongle', ax: 'wght@300;400;700' }
    ] },
    { group: '명조', items: [
      { f: 'Noto Serif KR', ax: 'wght@200..900' },
      { f: 'Gowun Batang', ax: 'wght@400;700' },
      { f: 'Nanum Myeongjo', ax: 'wght@400;700;800' },
      { f: 'Hahmlet', ax: 'wght@100..900' },
      { f: 'Song Myung' },
      { f: 'Diphylleia' }
    ] },
    { group: '손글씨 · 개성', items: [
      { f: 'Nanum Pen Script' },
      { f: 'Nanum Brush Script' },
      { f: 'Gaegu', ax: 'wght@300;400;700' },
      { f: 'Hi Melody' },
      { f: 'Gamja Flower' },
      { f: 'Poor Story' },
      { f: 'Yeon Sung' },
      { f: 'Cute Font' },
      { f: 'Single Day' },
      { f: 'Dokdo' },
      { f: 'East Sea Dokdo' },
      { f: 'Gugi' },
      { f: 'Stylish' },
      { f: 'Kirang Haerang' },
      { f: 'Bagel Fat One' },
      { f: 'Moirai One' }
    ] },
    { group: '영문', items: [
      { f: 'Cormorant Garamond', ax: 'wght@300;400;500;600;700' },
      { f: 'Playfair Display', ax: 'wght@400..900' },
      { f: 'DM Serif Display' },
      { f: 'Cinzel', ax: 'wght@400..900' },
      { f: 'Italiana' },
      { f: 'Great Vibes' },
      { f: 'Dancing Script', ax: 'wght@400..700' },
      { f: 'Montserrat', ax: 'wght@100..900' },
      { f: 'Bebas Neue' }
    ] }
  ];

  const axesFor = {};
  PRESETS.forEach(g => g.items.forEach(it => { if (it.ax) axesFor[it.f] = it.ax; }));

  const loaded = new Set([PRET]);
  const failed = new Set();
  const pending = new Map();

  function cssUrl(f, ax) {
    return 'https://fonts.googleapis.com/css2?family=' +
      encodeURIComponent(f).replace(/%20/g, '+') + (ax ? ':' + ax : '') + '&display=swap';
  }

  async function tryLoad(f) {
    const cands = [];
    if (axesFor[f]) cands.push(axesFor[f]);
    cands.push('wght@100..900', 'wght@400;700', null);
    for (const ax of [...new Set(cands)]) {
      try {
        const r = await fetch(cssUrl(f, ax));
        if (!r.ok) continue;
        const css = await r.text();
        if (!/@font-face/.test(css)) continue;
        const st = document.createElement('style');
        st.dataset.font = f;
        st.textContent = css;
        document.head.appendChild(st);
        return true;
      } catch (e) { /* 네트워크 오류 → 다음 후보 */ }
    }
    return false;
  }

  /** 필요한 폰트를 불러온다. 새로 불러왔으면 true */
  function ensure(f) {
    if (!f || loaded.has(f) || failed.has(f)) return Promise.resolve(false);
    if (pending.has(f)) return pending.get(f);
    const p = tryLoad(f).then(ok => {
      pending.delete(f);
      if (ok) { loaded.add(f); return true; }
      failed.add(f);
      return false;
    });
    pending.set(f, p);
    return p;
  }

  async function addCustom(f) {
    failed.delete(f);
    await ensure(f);
    return loaded.has(f);
  }

  function famStr(f) {
    const fallback = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    if (!f || f === PRET) return fallback;
    return '"' + f + '", ' + fallback;
  }

  return { PRET, PRESETS, ensure, addCustom, famStr };
})();
