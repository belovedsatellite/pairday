/*
 * 테마 정의 — 캔버스 기준 1920 × 1080
 *
 * 각 테마는 A(월페이퍼) / B(두상) / C(헤더) 레이아웃을 가진다.
 *  slots : 캐릭터 이미지 프레임  { id, x, y, w, h, shape, radius, rotation, border{width,color,gap}, polaroid{pad,bottom,color}, shadow }
 *  decor : 장식 { kind: rect|line|circle|sparkle|text, ..., z: 'over'(이미지 위) | 기본(이미지 아래) }
 *  texts : 텍스트 기본 위치·스타일. x는 align 기준점(left=왼쪽 끝, center=가운데, right=오른쪽 끝)
 *          anchorY: top(기본) | middle | bottom
 *  rows  : 가로로 이어 붙는 텍스트 묶음(길이가 바뀌어도 겹치지 않게 자동 배치)
 * 색상에 'ink' | 'sub' | 'accent' | 'paper' 를 쓰면 팔레트 값으로 바뀐다 (accent는 사용자 변경 가능).
 */
window.THEMES = (function () {
  const PRET = 'Pretendard Variable';
  const GB = 'Gowun Batang';

  function rp(cx, cy, px, py, deg) {
    const a = deg * Math.PI / 180, dx = px - cx, dy = py - cy;
    return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
  }
  const sparkles = (list, z) => list.map(([x, y, r, o]) => ({ kind: 'sparkle', x, y, r, fill: '#FFFFFF', opacity: o ?? 0.95, z }));
  const bokeh = (list) => list.map(([x, y, r, o]) => ({ kind: 'circle', x, y, r, fill: '#FFFFFF', opacity: o }));

  const SH_DARK = { color: '#000000', blur: 18, opacity: 0.55, x: 0, y: 2 };
  const SH_SOFT = { color: '#000000', blur: 22, opacity: 0.4, x: 0, y: 2 };

  /* ───────────── 1. 미니멀 ───────────── */
  const minimal = {
    id: 'minimal', name: '미니멀', desc: '넓은 여백, 얇은 선, 웜그레이',
    palette: { bg: '#F3F1EC', paper: '#FBFAF7', ink: '#1C1C1E', sub: '#7A766E', accent: '#A39274' },
    bg: { mode: 'solid', color: '#F3F1EC' },
    defaults: { label: 'OUR ANNIVERSARY', sep: '&' },
    layouts: {
      A: {
        slots: [{ id: 'main', x: 0, y: 0, w: 1920, h: 1080, shape: 'rect' }],
        decor: [
          { kind: 'rect', x: 96, y: 590, w: 640, h: 410, fill: 'paper', opacity: 0.95, z: 'over' },
          { kind: 'line', points: [144, 900, 688, 900], stroke: 'accent', width: 1.5, z: 'over' }
        ],
        texts: {
          label: { x: 144, y: 634, size: 16, weight: 600, ls: 6, color: 'sub' },
          pair: { x: 144, y: 660, size: 34, weight: 700, width: 544 },
          dday: { x: 140, y: 708, size: 120, weight: 700, ls: -3, lh: 1 },
          days: { x: 688, y: 822, align: 'right', anchorY: 'bottom', size: 26, weight: 500, lh: 1 },
          name1: { size: 22, weight: 500 }, sep: { size: 22, color: 'accent' }, name2: { size: 22, weight: 500 },
          since: { x: 688, y: 856, align: 'right', size: 15, weight: 500, ls: 3, color: 'sub' },
          catch: { x: 144, y: 922, size: 21, width: 544, lh: 1.5 },
          quote1: { x: 96, y: 96, size: 26, weight: 500, width: 640, color: '#FFFFFF', lh: 1.5, shadow: SH_DARK },
          quote2: { x: 1824, y: 96, align: 'right', size: 26, weight: 500, width: 640, color: '#FFFFFF', lh: 1.5, shadow: SH_DARK }
        },
        rows: [{ items: ['name1', 'sep', 'name2'], x: 144, y: 852, align: 'left', valign: 'top', gap: 10 }]
      },
      B: {
        slots: [
          { id: 'c1', x: 260, y: 310, w: 380, h: 380, shape: 'circle', border: { width: 1.5, color: 'accent', gap: 14 } },
          { id: 'c2', x: 1280, y: 310, w: 380, h: 380, shape: 'circle', border: { width: 1.5, color: 'accent', gap: 14 } }
        ],
        decor: [{ kind: 'line', points: [930, 250, 990, 250], stroke: 'accent', width: 1.5 }],
        texts: {
          label: { x: 960, y: 150, align: 'center', size: 15, weight: 600, ls: 8, color: 'sub' },
          pair: { x: 960, y: 176, align: 'center', size: 44, weight: 700, width: 1000 },
          sep: { x: 960, y: 330, align: 'center', size: 30, color: 'accent' },
          dday: { x: 960, y: 380, align: 'center', size: 112, weight: 700, ls: -3, lh: 1 },
          days: { x: 960, y: 512, align: 'center', size: 24, weight: 500 },
          since: { x: 960, y: 556, align: 'center', size: 15, weight: 500, ls: 4, color: 'sub' },
          catch: { x: 960, y: 610, align: 'center', size: 21, width: 520, lh: 1.6 },
          name1: { x: 450, y: 734, align: 'center', size: 28, weight: 600, width: 460 },
          name2: { x: 1470, y: 734, align: 'center', size: 28, weight: 600, width: 460 },
          quote1: { x: 450, y: 782, align: 'center', size: 19, width: 460, lh: 1.6, color: 'sub' },
          quote2: { x: 1470, y: 782, align: 'center', size: 19, width: 460, lh: 1.6, color: 'sub' }
        },
        rows: []
      },
      C: {
        slots: [{ id: 'main', x: 210, y: 170, w: 1500, h: 500, shape: 'rect' }],
        decor: [{ kind: 'line', points: [210, 696, 1710, 696], stroke: 'accent', width: 1 }],
        texts: {
          label: { x: 210, y: 122, size: 15, weight: 600, ls: 6, color: 'sub' },
          pair: { x: 1710, y: 104, align: 'right', size: 36, weight: 700, width: 900 },
          dday: { x: 204, y: 724, size: 120, weight: 700, ls: -3, lh: 1 },
          days: { x: 212, y: 862, size: 24, weight: 500 },
          since: { x: 212, y: 904, size: 15, weight: 500, ls: 3, color: 'sub' },
          name1: { size: 26, weight: 600 }, sep: { size: 26, color: 'accent' }, name2: { size: 26, weight: 600 },
          catch: { x: 1710, y: 782, align: 'right', size: 22, width: 700, lh: 1.6 },
          quote1: { x: 1710, y: 870, align: 'right', size: 18, width: 800, color: 'sub', lh: 1.5 },
          quote2: { x: 1710, y: 910, align: 'right', size: 18, width: 800, color: 'sub', lh: 1.5 }
        },
        rows: [{ items: ['name1', 'sep', 'name2'], x: 1710, y: 730, align: 'right', valign: 'top', gap: 12 }]
      }
    }
  };

  /* ───────────── 2. 시네마 ───────────── */
  const cinema = {
    id: 'cinema', name: '시네마', desc: '레터박스와 자막, 엔딩 크레딧 무드',
    palette: { bg: '#0B0B0D', paper: '#000000', ink: '#F2EEE6', sub: '#9C978D', accent: '#D6BD86' },
    bg: { mode: 'solid', color: '#0B0B0D' },
    defaults: { label: 'A STORY OF US', sep: '×' },
    layouts: {
      A: {
        slots: [{ id: 'main', x: 0, y: 0, w: 1920, h: 1080, shape: 'rect' }],
        decor: [
          { kind: 'rect', x: 0, y: 0, w: 1920, h: 120, fill: '#000000', z: 'over' },
          { kind: 'rect', x: 0, y: 960, w: 1920, h: 120, fill: '#000000', z: 'over' }
        ],
        texts: {
          label: { x: 80, y: 60, anchorY: 'middle', size: 16, weight: 600, ls: 8, color: 'accent' },
          pair: { x: 1840, y: 60, align: 'right', anchorY: 'middle', size: 26, weight: 600, ls: 4 },
          dday: { x: 80, y: 1020, anchorY: 'middle', size: 60, weight: 800, ls: -1, lh: 1 },
          name1: { size: 24, weight: 600 }, sep: { size: 24, color: 'accent' }, name2: { size: 24, weight: 600 },
          days: { x: 1840, y: 1000, align: 'right', anchorY: 'middle', size: 22, weight: 600, color: 'accent' },
          since: { x: 1840, y: 1038, align: 'right', anchorY: 'middle', size: 14, weight: 500, ls: 4, color: 'sub' },
          catch: { x: 960, y: 920, align: 'center', anchorY: 'bottom', size: 30, weight: 500, width: 1400, color: '#FFFFFF', lh: 1.5, shadow: SH_DARK },
          quote1: { x: 80, y: 160, size: 24, weight: 500, width: 640, color: '#FFFFFF', lh: 1.5, shadow: SH_DARK },
          quote2: { x: 1840, y: 160, align: 'right', size: 24, weight: 500, width: 640, color: '#FFFFFF', lh: 1.5, shadow: SH_DARK }
        },
        rows: [{ items: ['name1', 'sep', 'name2'], x: 960, y: 1020, align: 'center', valign: 'middle', gap: 16 }]
      },
      B: {
        slots: [
          { id: 'c1', x: 500, y: 250, w: 440, h: 440, shape: 'rect' },
          { id: 'c2', x: 980, y: 250, w: 440, h: 440, shape: 'rect' }
        ],
        decor: [
          { kind: 'rect', x: 0, y: 0, w: 1920, h: 100, fill: '#000000' },
          { kind: 'rect', x: 0, y: 980, w: 1920, h: 100, fill: '#000000' },
          { kind: 'line', points: [0, 100, 1920, 100], stroke: 'accent', width: 1, opacity: 0.4 },
          { kind: 'line', points: [0, 980, 1920, 980], stroke: 'accent', width: 1, opacity: 0.4 }
        ],
        texts: {
          label: { x: 960, y: 50, align: 'center', anchorY: 'middle', size: 15, weight: 600, ls: 10, color: 'accent' },
          pair: { x: 960, y: 148, align: 'center', size: 40, weight: 700, ls: 6, width: 1200 },
          name1: { x: 720, y: 716, align: 'center', size: 24, weight: 600, width: 420 },
          sep: { x: 960, y: 716, align: 'center', size: 24, color: 'accent' },
          name2: { x: 1200, y: 716, align: 'center', size: 24, weight: 600, width: 420 },
          quote1: { x: 720, y: 760, align: 'center', size: 18, width: 420, lh: 1.6, color: 'sub' },
          quote2: { x: 1200, y: 760, align: 'center', size: 18, width: 420, lh: 1.6, color: 'sub' },
          catch: { x: 960, y: 900, align: 'center', anchorY: 'middle', size: 24, width: 1300, lh: 1.5 },
          dday: { size: 52, weight: 800, color: 'accent', lh: 1 },
          days: { size: 20, weight: 600 },
          since: { size: 14, weight: 500, ls: 4, color: 'sub' }
        },
        rows: [{ items: ['days', 'dday', 'since'], x: 960, y: 1030, align: 'center', valign: 'middle', gap: 36 }]
      },
      C: {
        slots: [{ id: 'main', x: 0, y: 220, w: 1920, h: 640, shape: 'rect' }],
        decor: [],
        texts: {
          label: { x: 960, y: 80, align: 'center', anchorY: 'middle', size: 15, weight: 600, ls: 10, color: 'accent' },
          pair: { x: 960, y: 106, align: 'center', size: 46, weight: 700, ls: 6, width: 1600 },
          catch: { x: 960, y: 820, align: 'center', anchorY: 'bottom', size: 30, weight: 500, width: 1400, color: '#FFFFFF', lh: 1.5, shadow: SH_DARK },
          quote1: { x: 120, y: 260, size: 22, weight: 500, width: 600, color: '#FFFFFF', lh: 1.5, shadow: SH_DARK },
          quote2: { x: 1800, y: 260, align: 'right', size: 22, weight: 500, width: 600, color: '#FFFFFF', lh: 1.5, shadow: SH_DARK },
          dday: { size: 68, weight: 800, lh: 1 },
          days: { size: 22, weight: 600, color: 'accent' },
          since: { size: 14, weight: 500, ls: 4, color: 'sub' },
          name1: { size: 22, weight: 500, color: 'sub' }, sep: { size: 22, color: 'accent' }, name2: { size: 22, weight: 500, color: 'sub' }
        },
        rows: [
          { items: ['days', 'dday', 'since'], x: 960, y: 930, align: 'center', valign: 'middle', gap: 40 },
          { items: ['name1', 'sep', 'name2'], x: 960, y: 1018, align: 'center', valign: 'middle', gap: 14 }
        ]
      }
    }
  };

  /* ───────────── 3. 레터 ───────────── */
  const letterB = (function () {
    const pol = { pad: 22, bottom: 100, color: 'paper' };
    const c1 = { id: 'c1', x: 360, y: 230, w: 480, h: 480, rotation: -4, shape: 'rect', polaroid: pol, shadow: true };
    const c2 = { id: 'c2', x: 1080, y: 250, w: 480, h: 480, rotation: 3, shape: 'rect', polaroid: pol, shadow: true };
    const cap = s => rp(s.x + s.w / 2, s.y + s.h / 2, s.x + s.w / 2, s.y + s.h + 50, s.rotation);
    const tape = s => rp(s.x + s.w / 2, s.y + s.h / 2, s.x + s.w / 2, s.y - 22, s.rotation);
    const [n1x, n1y] = cap(c1), [n2x, n2y] = cap(c2), [t1x, t1y] = tape(c1), [t2x, t2y] = tape(c2);
    return {
      slots: [c1, c2],
      decor: [
        { kind: 'rect', cx: t1x, cy: t1y, w: 160, h: 42, fill: 'accent', opacity: 0.3, rotation: -10, z: 'over' },
        { kind: 'rect', cx: t2x, cy: t2y, w: 160, h: 42, fill: 'accent', opacity: 0.3, rotation: 8, z: 'over' }
      ],
      texts: {
        label: { x: 960, y: 92, align: 'center', size: 26, weight: 700, color: 'accent' },
        pair: { x: 960, y: 128, align: 'center', size: 46, weight: 700, width: 1100 },
        name1: { x: n1x, y: n1y, align: 'center', anchorY: 'middle', rotation: c1.rotation, size: 28, weight: 700, width: 440 },
        name2: { x: n2x, y: n2y, align: 'center', anchorY: 'middle', rotation: c2.rotation, size: 28, weight: 700, width: 440 },
        sep: { x: 960, y: 480, align: 'center', anchorY: 'middle', size: 60, color: 'accent' },
        quote1: { x: 300, y: 470, align: 'right', anchorY: 'middle', size: 21, width: 250, lh: 1.6, color: 'sub' },
        quote2: { x: 1620, y: 490, align: 'left', anchorY: 'middle', size: 21, width: 250, lh: 1.6, color: 'sub' },
        dday: { size: 80, weight: 700, lh: 1 },
        days: { size: 26 },
        since: { family: PRET, size: 15, weight: 500, ls: 3, color: 'sub' },
        catch: { x: 960, y: 985, align: 'center', size: 24, width: 1200, lh: 1.5 }
      },
      rows: [{ items: ['days', 'dday', 'since'], x: 960, y: 902, align: 'center', valign: 'middle', gap: 36 }]
    };
  })();

  const letter = {
    id: 'letter', name: '레터', desc: '크림색 종이, 폴라로이드와 마스킹테이프',
    palette: { bg: '#EEE5D6', paper: '#FFFDF8', ink: '#4A3A2F', sub: '#8C7766', accent: '#B4664C' },
    bg: { mode: 'gradient', gtype: 'radial', c1: '#F5EEE3', c2: '#E5D8C3' },
    defaults: { label: 'Dear, our days', sep: '&' },
    textDefaults: { family: GB },
    layouts: {
      A: {
        slots: [{ id: 'main', x: 140, y: 120, w: 1060, h: 596, shape: 'rect', polaroid: { pad: 26, bottom: 120, color: 'paper' }, shadow: true }],
        decor: [
          { kind: 'rect', cx: 230, cy: 100, w: 160, h: 42, fill: 'accent', opacity: 0.3, rotation: -8, z: 'over' },
          { kind: 'rect', cx: 1110, cy: 102, w: 160, h: 42, fill: 'accent', opacity: 0.3, rotation: 7, z: 'over' },
          { kind: 'line', points: [1300, 492, 1800, 492], stroke: 'sub', width: 2, dash: [2, 9], opacity: 0.8 }
        ],
        texts: {
          label: { x: 1300, y: 196, size: 26, weight: 700, color: 'accent' },
          dday: { x: 1296, y: 240, size: 116, weight: 700, lh: 1 },
          days: { x: 1300, y: 372, size: 28 },
          since: { x: 1300, y: 424, family: PRET, size: 15, weight: 500, ls: 3, color: 'sub' },
          pair: { x: 1300, y: 524, size: 40, weight: 700, width: 520 },
          name1: { size: 24, color: 'sub' }, sep: { size: 24, color: 'accent' }, name2: { size: 24, color: 'sub' },
          catch: { x: 1300, y: 650, size: 24, width: 500, lh: 1.7 },
          quote1: { x: 156, y: 752, size: 24, width: 500, lh: 1.5 },
          quote2: { x: 1184, y: 752, align: 'right', size: 24, width: 500, lh: 1.5 }
        },
        rows: [{ items: ['name1', 'sep', 'name2'], x: 1300, y: 590, align: 'left', valign: 'top', gap: 10 }]
      },
      B: letterB,
      C: {
        slots: [{ id: 'main', x: 210, y: 160, w: 1500, h: 500, shape: 'rect', polaroid: { pad: 18, bottom: 18, color: 'paper' }, shadow: true }],
        decor: [
          { kind: 'rect', cx: 300, cy: 146, w: 170, h: 44, fill: 'accent', opacity: 0.3, rotation: -8, z: 'over' },
          { kind: 'rect', cx: 1620, cy: 146, w: 170, h: 44, fill: 'accent', opacity: 0.3, rotation: 8, z: 'over' }
        ],
        texts: {
          label: { x: 210, y: 76, size: 26, weight: 700, color: 'accent' },
          dday: { x: 206, y: 726, size: 110, weight: 700, lh: 1 },
          days: { x: 212, y: 852, size: 26 },
          since: { x: 212, y: 900, family: PRET, size: 15, weight: 500, ls: 3, color: 'sub' },
          pair: { x: 1710, y: 726, align: 'right', size: 44, weight: 700, width: 820 },
          name1: { size: 24, color: 'sub' }, sep: { size: 24, color: 'accent' }, name2: { size: 24, color: 'sub' },
          catch: { x: 1710, y: 850, align: 'right', size: 23, width: 800, lh: 1.6 },
          quote1: { x: 210, y: 962, size: 20, width: 720, lh: 1.5, color: 'sub' },
          quote2: { x: 1710, y: 962, align: 'right', size: 20, width: 720, lh: 1.5, color: 'sub' }
        },
        rows: [{ items: ['name1', 'sep', 'name2'], x: 1710, y: 794, align: 'right', valign: 'top', gap: 10 }]
      }
    }
  };

  /* ───────────── 4. 매거진 ───────────── */
  const editorial = {
    id: 'editorial', name: '매거진', desc: '큰 숫자, 굵은 타이포, 포인트 레드',
    palette: { bg: '#E8E4DB', paper: '#F4F1EA', ink: '#141414', sub: '#5E5A52', accent: '#D2452F' },
    bg: { mode: 'solid', color: '#E8E4DB' },
    defaults: { label: 'ANNIVERSARY ISSUE', sep: '/' },
    layouts: {
      A: {
        slots: [{ id: 'main', x: 0, y: 0, w: 1920, h: 1080, shape: 'rect' }],
        decor: [
          { kind: 'rect', x: 0, y: 560, w: 1920, h: 520, z: 'over', gradient: { start: [0, 0], end: [0, 520], stops: [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.42)'] } },
          { kind: 'rect', x: 0, y: 0, w: 1920, h: 380, z: 'over', gradient: { start: [0, 0], end: [0, 380], stops: [0, 'rgba(0,0,0,0.32)', 1, 'rgba(0,0,0,0)'] } },
          { kind: 'rect', x: 80, y: 150, w: 120, h: 8, fill: 'accent', z: 'over' }
        ],
        texts: {
          pair: { x: 80, y: 56, size: 64, weight: 900, ls: -1, width: 1100, color: '#FFFFFF', lh: 1.1, shadow: SH_SOFT },
          label: { x: 1840, y: 80, align: 'right', size: 17, weight: 800, ls: 6, color: '#FFFFFF', shadow: SH_SOFT },
          catch: { x: 80, y: 184, size: 26, weight: 600, width: 720, lh: 1.5, color: '#FFFFFF', shadow: SH_SOFT },
          quote1: { x: 1840, y: 184, align: 'right', size: 23, weight: 500, width: 560, lh: 1.5, color: '#FFFFFF', shadow: SH_SOFT },
          quote2: { x: 1840, y: 276, align: 'right', size: 23, weight: 500, width: 560, lh: 1.5, color: '#FFFFFF', shadow: SH_SOFT },
          dday: { x: 62, y: 1024, anchorY: 'bottom', size: 250, weight: 900, ls: -10, lh: 1, color: '#FFFFFF', shadow: SH_SOFT },
          name1: { size: 26, weight: 700, color: '#FFFFFF', shadow: SH_SOFT }, sep: { size: 26, weight: 700, color: 'accent' }, name2: { size: 26, weight: 700, color: '#FFFFFF', shadow: SH_SOFT },
          days: { x: 1840, y: 944, align: 'right', size: 34, weight: 800, color: '#FFFFFF', shadow: SH_SOFT },
          since: { x: 1840, y: 1000, align: 'right', size: 17, weight: 600, ls: 4, color: '#FFFFFF', shadow: SH_SOFT }
        },
        rows: [{ items: ['name1', 'sep', 'name2'], x: 1840, y: 894, align: 'right', valign: 'top', gap: 12 }]
      },
      B: {
        slots: [
          { id: 'c1', x: 120, y: 190, w: 420, h: 420, shape: 'rect' },
          { id: 'c2', x: 580, y: 500, w: 420, h: 420, shape: 'rect' }
        ],
        decor: [
          { kind: 'text', x: 120, y: 146, text: '01', size: 26, weight: 900, fill: 'accent' },
          { kind: 'text', x: 580, y: 456, text: '02', size: 26, weight: 900, fill: 'accent' },
          { kind: 'rect', x: 1100, y: 560, w: 700, h: 4, fill: 'ink' }
        ],
        texts: {
          label: { x: 1100, y: 196, size: 17, weight: 800, ls: 6, color: 'accent' },
          dday: { x: 1090, y: 228, size: 210, weight: 900, ls: -8, lh: 1 },
          days: { x: 1100, y: 452, size: 40, weight: 800, color: 'accent', lh: 1 },
          since: { x: 1100, y: 510, size: 17, weight: 600, ls: 4, color: 'sub' },
          pair: { x: 1100, y: 588, size: 56, weight: 900, ls: -1, width: 720, lh: 1.1 },
          name1: { size: 26, weight: 600 }, sep: { size: 26, weight: 600, color: 'accent' }, name2: { size: 26, weight: 600 },
          catch: { x: 1100, y: 722, size: 24, weight: 500, width: 700, lh: 1.55 },
          quote1: { x: 580, y: 200, size: 21, weight: 500, width: 440, lh: 1.6, color: 'sub' },
          quote2: { x: 120, y: 650, size: 21, weight: 500, width: 420, lh: 1.6, color: 'sub' }
        },
        rows: [{ items: ['name1', 'sep', 'name2'], x: 1100, y: 666, align: 'left', valign: 'top', gap: 12 }]
      },
      C: {
        slots: [{ id: 'main', x: 300, y: 120, w: 1500, h: 500, shape: 'rect' }],
        decor: [{ kind: 'rect', x: 120, y: 120, w: 150, h: 500, fill: 'accent' }],
        texts: {
          label: { x: 195, y: 370, align: 'center', anchorY: 'middle', rotation: -90, size: 18, weight: 800, ls: 8, color: '#FFFFFF' },
          dday: { x: 110, y: 650, size: 236, weight: 900, ls: -8, lh: 1 },
          days: { x: 120, y: 902, size: 34, weight: 800, color: 'accent', lh: 1 },
          since: { x: 120, y: 956, size: 17, weight: 600, ls: 4, color: 'sub' },
          pair: { x: 1100, y: 664, size: 52, weight: 900, ls: -1, width: 700, lh: 1.1 },
          name1: { size: 26, weight: 600 }, sep: { size: 26, weight: 600, color: 'accent' }, name2: { size: 26, weight: 600 },
          catch: { x: 1100, y: 792, size: 23, weight: 500, width: 700, lh: 1.55 },
          quote1: { x: 1100, y: 900, size: 19, width: 330, lh: 1.6, color: 'sub' },
          quote2: { x: 1470, y: 900, size: 19, width: 330, lh: 1.6, color: 'sub' }
        },
        rows: [{ items: ['name1', 'sep', 'name2'], x: 1100, y: 738, align: 'left', valign: 'top', gap: 12 }]
      }
    }
  };

  /* ───────────── 5. 드리미 ───────────── */
  const PS = { color: '#5A4C8C', blur: 24, opacity: 0.55, x: 0, y: 2 };
  const GLOW = { color: '#FFFFFF', blur: 22, opacity: 0.95, x: 0, y: 0 };
  const dreamy = {
    id: 'dreamy', name: '드리미', desc: '라벤더-핑크 그라데이션과 반짝임',
    palette: { bg: '#D9CFF2', paper: '#FFFFFF', ink: '#5A4C8C', sub: '#8B7FB6', accent: '#E58FAA' },
    bg: { mode: 'gradient', gtype: 'linear', angle: 135, c1: '#C8C2F0', c2: '#F7CFDA' },
    defaults: { label: 'our little forever', sep: '♥' },
    layouts: {
      A: {
        slots: [{ id: 'main', x: 0, y: 0, w: 1920, h: 1080, shape: 'rect' }],
        decor: [
          { kind: 'rect', x: 0, y: 520, w: 1920, h: 560, z: 'over', gradient: { start: [0, 0], end: [0, 560], stops: [0, 'rgba(200,190,240,0)', 1, 'rgba(176,160,232,0.88)'] } },
          ...sparkles([[300, 830, 18], [1640, 770, 24], [1730, 870, 12], [230, 720, 10], [1500, 940, 9]], 'over')
        ],
        texts: {
          pair: { x: 960, y: 62, align: 'center', size: 36, weight: 700, width: 1400, color: '#FFFFFF', shadow: PS },
          label: { x: 960, y: 748, align: 'center', size: 17, weight: 600, ls: 8, color: '#FFFFFF', shadow: PS },
          dday: { x: 960, y: 780, align: 'center', size: 120, weight: 700, lh: 1, color: '#FFFFFF', shadow: PS },
          days: { size: 26, weight: 600, color: '#FFFFFF' },
          since: { size: 15, weight: 500, ls: 4, color: '#FFFFFF' },
          catch: { x: 960, y: 972, align: 'center', size: 22, weight: 500, width: 1300, color: '#FFFFFF' },
          name1: { size: 22, weight: 500, color: '#FFFFFF', shadow: PS }, sep: { size: 22, color: '#FFD3E0', shadow: PS }, name2: { size: 22, weight: 500, color: '#FFFFFF', shadow: PS },
          quote1: { x: 96, y: 470, size: 24, weight: 500, width: 440, lh: 1.6, color: '#FFFFFF', shadow: PS },
          quote2: { x: 1824, y: 470, align: 'right', size: 24, weight: 500, width: 440, lh: 1.6, color: '#FFFFFF', shadow: PS }
        },
        rows: [
          { items: ['days', 'since'], x: 960, y: 932, align: 'center', valign: 'middle', gap: 28 },
          { items: ['name1', 'sep', 'name2'], x: 960, y: 118, align: 'center', valign: 'top', gap: 12 }
        ]
      },
      B: {
        slots: [
          { id: 'c1', x: 380, y: 250, w: 420, h: 420, shape: 'circle', border: { width: 8, color: '#FFFFFF', gap: 0 }, shadow: true },
          { id: 'c2', x: 1120, y: 250, w: 420, h: 420, shape: 'circle', border: { width: 8, color: '#FFFFFF', gap: 0 }, shadow: true }
        ],
        decor: [
          ...bokeh([[180, 180, 120, 0.2], [1760, 900, 170, 0.16], [1700, 150, 70, 0.24], [250, 950, 90, 0.16], [960, 1040, 60, 0.14]]),
          ...sparkles([[960, 290, 22], [905, 250, 10], [1580, 230, 14], [330, 760, 12], [1590, 790, 10]])
        ],
        texts: {
          label: { x: 960, y: 92, align: 'center', size: 16, weight: 600, ls: 8, color: 'sub' },
          pair: { x: 960, y: 120, align: 'center', size: 48, weight: 700, width: 1200, shadow: GLOW },
          sep: { x: 960, y: 460, align: 'center', anchorY: 'middle', size: 54, color: 'accent', shadow: GLOW },
          name1: { x: 590, y: 704, align: 'center', size: 30, weight: 600, width: 460 },
          name2: { x: 1330, y: 704, align: 'center', size: 30, weight: 600, width: 460 },
          quote1: { x: 590, y: 752, align: 'center', size: 20, width: 460, lh: 1.6, color: 'sub' },
          quote2: { x: 1330, y: 752, align: 'center', size: 20, width: 460, lh: 1.6, color: 'sub' },
          dday: { size: 80, weight: 700, lh: 1, shadow: GLOW },
          days: { size: 24, weight: 600 },
          since: { size: 15, weight: 500, ls: 4, color: 'sub' },
          catch: { x: 960, y: 990, align: 'center', size: 22, weight: 500, width: 1200 }
        },
        rows: [{ items: ['days', 'dday', 'since'], x: 960, y: 900, align: 'center', valign: 'middle', gap: 36 }]
      },
      C: {
        slots: [{ id: 'main', x: 210, y: 180, w: 1500, h: 500, shape: 'rounded', radius: 40, border: { width: 6, color: '#FFFFFF', gap: 0 }, shadow: true }],
        decor: [
          ...bokeh([[140, 140, 110, 0.2], [1800, 980, 160, 0.16], [1780, 120, 60, 0.24], [150, 980, 80, 0.16]]),
          ...sparkles([[1760, 700, 16], [160, 720, 12], [1690, 150, 10]])
        ],
        texts: {
          label: { x: 960, y: 62, align: 'center', size: 16, weight: 600, ls: 8, color: 'sub' },
          pair: { x: 960, y: 90, align: 'center', size: 44, weight: 700, width: 1400, shadow: GLOW },
          dday: { size: 104, weight: 700, lh: 1, shadow: GLOW },
          days: { size: 26, weight: 600 },
          since: { size: 15, weight: 500, ls: 4, color: 'sub' },
          name1: { size: 26, weight: 600 }, sep: { size: 26, color: 'accent' }, name2: { size: 26, weight: 600 },
          catch: { x: 960, y: 940, align: 'center', size: 22, weight: 500, width: 1300, color: 'sub' },
          quote1: { x: 260, y: 650, anchorY: 'bottom', size: 22, weight: 500, width: 620, lh: 1.5, color: '#FFFFFF', shadow: PS },
          quote2: { x: 1660, y: 650, align: 'right', anchorY: 'bottom', size: 22, weight: 500, width: 620, lh: 1.5, color: '#FFFFFF', shadow: PS }
        },
        rows: [
          { items: ['days', 'dday', 'since'], x: 960, y: 770, align: 'center', valign: 'middle', gap: 40 },
          { items: ['name1', 'sep', 'name2'], x: 960, y: 868, align: 'center', valign: 'top', gap: 12 }
        ]
      }
    }
  };

  /* 이미지 출처(credit) 위치 — 레이아웃별 */
  const C_IMG = (x, y, sh, extra) => Object.assign({ x, y, align: 'right', anchorY: 'bottom', family: PRET, size: 14, weight: 500, ls: 1, color: '#FFFFFF', shadow: sh }, extra || {});
  const C_BG = (x, y, extra) => Object.assign({ x, y, align: 'right', anchorY: 'bottom', family: PRET, size: 13, weight: 500, ls: 1, color: 'sub' }, extra || {});
  minimal.layouts.A.texts.credit = C_IMG(1824, 1032, SH_DARK);
  minimal.layouts.B.texts.credit = C_BG(960, 1030, { align: 'center' });
  minimal.layouts.C.texts.credit = C_BG(1710, 1030);
  cinema.layouts.A.texts.credit = C_IMG(1840, 946, SH_DARK);
  cinema.layouts.B.texts.credit = C_BG(1840, 1030, { anchorY: 'middle' });
  cinema.layouts.C.texts.credit = C_BG(1840, 1030, { anchorY: 'middle' });
  letter.layouts.A.texts.credit = C_BG(1800, 1032);
  letter.layouts.B.texts.credit = C_BG(1840, 1040);
  letter.layouts.C.texts.credit = C_BG(1710, 106, { size: 14 });
  editorial.layouts.A.texts.credit = C_IMG(1880, 540, SH_SOFT, { align: 'center', anchorY: 'middle', rotation: 90, ls: 3, size: 13 });
  editorial.layouts.B.texts.credit = C_BG(1800, 1030, { size: 14 });
  editorial.layouts.C.texts.credit = C_BG(1800, 98, { size: 14 });
  dreamy.layouts.A.texts.credit = C_IMG(1840, 1040, PS);
  dreamy.layouts.B.texts.credit = C_BG(1840, 1040);
  dreamy.layouts.C.texts.credit = C_BG(1840, 1040);

  return [minimal, cinema, letter, editorial, dreamy];
})();
