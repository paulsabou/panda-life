import type { AnimalKind } from '../game/friends';
import type { Pose } from '../world/walker';

export type CharacterId = 'sushi' | 'tanuki' | AnimalKind;

export const CHARACTER_IDS: readonly CharacterId[] = [
  'sushi',
  'tanuki',
  'cat',
  'fox',
  'beaver',
  'rabbit',
  'deer',
  'dog',
  'giraffe',
  'elephant',
  'redPanda',
  'raccoon',
  'hamster',
  'horse',
];

export const POSES: readonly Pose[] = ['front', 'frontSide', 'side', 'backSide', 'back'];
export const WALK_FRAMES = 6;
export const FRAME_W = 200;
export const FRAME_H = 300;

const INK = '#3a2f4a';
const PINK = '#ffb3c7';
const PACK = '#d6a36d';
const PACK_POCKET = '#e6bd8c';
const PACK_STRAP = '#a8784c';

interface Look {
  fur: string;
  limb: string;
  dress: string;
  dress2: string;
  accent: string;
  stripe: string;
  iris: string;
  shoe: string;
}

const LOOKS: Record<CharacterId, Look> = {
  sushi: { fur: '#ffffff', limb: INK, dress: 'url(#rainbow)', dress2: '#ff7fa8', accent: '#ffd166', stripe: '#8fa9f0', iris: '#a8d8ff', shoe: '#8fa9f0' },
  cat: { fur: '#ffb56b', limb: '#f2954c', dress: '#c6a7ee', dress2: '#a884dc', accent: '#ffe08a', stripe: '#d9c6f5', iris: '#9fe3a8', shoe: '#a884dc' },
  fox: { fur: '#ff8d4d', limb: '#e9692e', dress: '#5ad1c0', dress2: '#35b8a6', accent: '#fff1b8', stripe: '#a6ecdf', iris: '#ffd166', shoe: '#35b8a6' },
  beaver: { fur: '#b98460', limb: '#946343', dress: '#ffd166', dress2: '#f2b53c', accent: '#ff9fb4', stripe: '#ffe7a3', iris: '#c9a07c', shoe: '#f2b53c' },
  rabbit: { fur: '#fff7f9', limb: '#f1dbe3', dress: '#ff9fbe', dress2: '#ff7fa8', accent: '#ffffff', stripe: '#ffc9da', iris: '#ff9fc4', shoe: '#ff7fa8' },
  deer: { fur: '#e3b27c', limb: '#c78f58', dress: '#8edb8f', dress2: '#67c26e', accent: '#fff1b8', stripe: '#c3eec3', iris: '#b8875a', shoe: '#67c26e' },
  tanuki: { fur: '#b5937a', limb: '#5f4a3c', dress: '#e7643f', dress2: '#c94f2e', accent: '#ffd166', stripe: '#f3c9a8', iris: '#ffd166', shoe: '#5f4a3c' },
  dog: { fur: '#f7dcae', limb: '#c98f5c', dress: '#86cdec', dress2: '#62b5dd', accent: '#ffd166', stripe: '#bfe6f6', iris: '#a8d8ff', shoe: '#62b5dd' },
  giraffe: { fur: '#ffd27a', limb: '#d9924e', dress: '#c5e86c', dress2: '#a6d14a', accent: '#ff9fb4', stripe: '#e6f5bd', iris: '#b8875a', shoe: '#a6d14a' },
  elephant: { fur: '#b9c3d6', limb: '#97a3ba', dress: '#f59ad8', dress2: '#e57cc4', accent: '#ffffff', stripe: '#fcd3ef', iris: '#8fa9f0', shoe: '#e57cc4' },
  redPanda: { fur: '#d9673a', limb: '#4a2e2a', dress: '#9be8c4', dress2: '#6fd3a6', accent: '#fff1b8', stripe: '#d3f5e5', iris: '#ffd166', shoe: '#6fd3a6' },
  raccoon: { fur: '#a9a6ad', limb: '#5d5960', dress: '#ff6f7d', dress2: '#e8505f', accent: '#fff1b8', stripe: '#ffc2c8', iris: '#a8d8ff', shoe: '#e8505f' },
  hamster: { fur: '#f4c58a', limb: '#e0a868', dress: '#ffb37a', dress2: '#f2954c', accent: '#ffffff', stripe: '#ffdcc0', iris: '#c9a07c', shoe: '#f2954c' },
  horse: { fur: '#b77a4d', limb: '#8a5534', dress: '#4f6fe6', dress2: '#3b58cc', accent: '#ffd166', stripe: '#c2cfff', iris: '#c9a07c', shoe: '#3b58cc' },
};

/** How far the character has turned from facing us: 0 is square on, 1 is side on. */
const TURN: Record<Pose, { turn: number; back: boolean }> = {
  front: { turn: 0, back: false },
  frontSide: { turn: 0.55, back: false },
  side: { turn: 1, back: false },
  backSide: { turn: 0.55, back: true },
  back: { turn: 0, back: true },
};

const stroke = (w: number) => `stroke="${INK}" stroke-width="${w}"`;

function heart(x: number, y: number, s: number, fill: string): string {
  return `<path transform="translate(${x} ${y}) scale(${s})" d="M0 3C-5.5-1-2.8-4.5 0-1.6 2.8-4.5 5.5-1 0 3Z" fill="${fill}"/>`;
}

function line(d: string, w: number, colour: string): string {
  return `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function shape(d: string, fill: string): string {
  return `<path d="${d}" fill="${fill}" ${stroke(3.5)} stroke-linejoin="round"/>`;
}

function oval(cx: number, cy: number, rx: number, ry: number, rot: number, fill: string, edge = true): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="${fill}"${edge ? ` ${stroke(3.5)}` : ''}/>`;
}

function pointedEar(x: number, tip: number, fur: string, inner: string): string {
  const lean = x < 120 ? -1 : 1;
  return (
    shape(`M${x - 30} 66L${x + lean * 8} ${tip}L${x + 30} 66Z`, fur) +
    shape(`M${x - 15} 60L${x + lean * 6} ${tip + 24}L${x + 15} 60Z`, inner)
  );
}

/** A small horn with a round knob, as giraffes have. */
function ossicone(x: number, lean: number, look: Look): string {
  const d = `M${x} 40L${x + lean} 0`;
  return line(d, 16, INK) + line(d, 10, look.fur) + `<circle cx="${x + lean}" cy="-4" r="11" fill="${look.limb}" ${stroke(3)}/>`;
}

/** A bushy tail with dark rings round it, seen from the front on the right of the body. */
function ringedTail(look: Look, id: string): string {
  return (
    `<g id="${id}">` +
    oval(192, 212, 26, 50, 28, look.fur) +
    oval(184, 230, 22, 6, 28, look.limb, false) +
    oval(195, 210, 23, 6, 28, look.limb, false) +
    oval(205, 191, 20, 6, 28, look.limb, false) +
    oval(213, 176, 12, 12, 28, look.limb, false) +
    '</g>'
  );
}

/** The left and right ear, drawn square on. They slide as the head turns. */
function ears(id: CharacterId, look: Look, showInner: boolean): [string, string] {
  const inner = showInner ? PINK : look.fur;
  switch (id) {
    case 'sushi': {
      const middle = showInner ? PINK : INK;
      return [
        oval(54, 44, 31, 26, -28, INK, false) + oval(54, 44, 15, 12, -28, middle, false),
        oval(186, 44, 31, 26, 28, INK, false) + oval(186, 44, 15, 12, 28, middle, false),
      ];
    }
    case 'cat':
      return [pointedEar(60, -4, look.fur, inner), pointedEar(180, -4, look.fur, inner)];
    case 'fox':
      return [
        pointedEar(58, -22, look.fur, inner) + `<path d="M42 -6L50 -22L66 -2Z" fill="${INK}"/>`,
        pointedEar(182, -22, look.fur, inner) + `<path d="M198 -6L190 -22L174 -2Z" fill="${INK}"/>`,
      ];
    case 'tanuki':
      return [
        oval(54, 44, 22, 22, 0, look.limb) + oval(54, 44, 10, 10, 0, inner, false),
        oval(186, 44, 22, 22, 0, look.limb) + oval(186, 44, 10, 10, 0, inner, false),
      ];
    case 'beaver':
      return [
        oval(52, 46, 21, 21, 0, look.fur) + oval(52, 46, 10, 10, 0, inner, false),
        oval(188, 46, 21, 21, 0, look.fur) + oval(188, 46, 10, 10, 0, inner, false),
      ];
    case 'rabbit':
      return [
        oval(78, 2, 21, 54, -8, look.fur) + oval(78, 2, 10, 38, -8, inner, false),
        oval(162, 2, 21, 54, 8, look.fur) + oval(162, 2, 10, 38, 8, inner, false),
      ];
    case 'deer':
      return [
        oval(26, 72, 30, 13, -22, look.fur) + oval(26, 72, 16, 6, -22, inner, false) +
          line('M86 36L72 -26M78 2L50 -10M74 -16L94 -38', 9, '#a8784c'),
        oval(214, 72, 30, 13, 22, look.fur) + oval(214, 72, 16, 6, 22, inner, false) +
          line('M154 36L168 -26M162 2L190 -10M166 -16L146 -38', 9, '#a8784c'),
      ];
    case 'dog':
      return ['', ''];
    case 'giraffe':
      return [
        `<g id="ossicones">${ossicone(90, -6, look)}</g>` + oval(34, 64, 28, 12, -24, look.fur) + oval(34, 64, 15, 6, -24, inner, false),
        ossicone(150, 6, look) + oval(206, 64, 28, 12, 24, look.fur) + oval(206, 64, 15, 6, 24, inner, false),
      ];
    case 'elephant': {
      const inside = showInner ? '#ffc9d6' : look.limb;
      return [
        oval(40, 96, 38, 54, -8, look.fur) + oval(44, 98, 24, 38, -8, inside, false),
        oval(200, 96, 38, 54, 8, look.fur) + oval(196, 98, 24, 38, 8, inside, false),
      ];
    }
    case 'redPanda': {
      const rim = showInner ? '#ffffff' : look.fur;
      return [pointedEar(62, 4, look.fur, rim), pointedEar(178, 4, look.fur, rim)];
    }
    case 'raccoon': {
      const middle = showInner ? '#e8e6ea' : look.limb;
      return [
        oval(58, 40, 25, 25, 0, look.limb) + oval(58, 42, 14, 14, 0, middle, false),
        oval(182, 40, 25, 25, 0, look.limb) + oval(182, 42, 14, 14, 0, middle, false),
      ];
    }
    case 'hamster':
      return [
        oval(64, 38, 16, 16, 0, look.fur) + oval(64, 38, 8, 8, 0, inner, false),
        oval(176, 38, 16, 16, 0, look.fur) + oval(176, 38, 8, 8, 0, inner, false),
      ];
    case 'horse':
      return [pointedEar(74, -14, look.fur, inner), pointedEar(166, -14, look.fur, inner)];
  }
}

/** Floppy ears hang in front of the head rather than behind it. */
function hangingEars(id: CharacterId, look: Look): [string, string] {
  if (id !== 'dog') return ['', ''];
  return [oval(36, 112, 23, 50, 12, look.limb), oval(204, 112, 23, 50, -12, look.limb)];
}

/** The tail as seen from the front, on the right of the body. */
function tail(id: CharacterId, look: Look): string {
  switch (id) {
    case 'sushi':
      return oval(176, 240, 14, 14, 0, '#fff');
    case 'cat':
      return line('M172 244Q226 232 206 170', 24, INK) + line('M172 244Q226 232 206 170', 17, look.fur);
    case 'fox':
      return oval(192, 212, 30, 52, 28, look.fur) + oval(212, 178, 15, 20, 28, '#fff');
    case 'beaver':
      return oval(192, 262, 40, 19, -14, look.limb) + line('M170 262L212 252', 2.5, INK) + line('M178 272L204 244', 2.5, INK);
    case 'tanuki':
      return oval(190, 226, 26, 40, 22, look.fur) + oval(200, 204, 13, 11, 22, look.limb) + oval(190, 232, 16, 7, 22, look.limb, false);
    case 'rabbit':
      return oval(180, 244, 17, 17, 0, '#fff');
    case 'deer':
      return oval(178, 240, 12, 15, 0, '#fff');
    case 'dog':
      return line('M172 240Q214 232 200 192', 24, INK) + line('M172 240Q214 232 200 192', 17, look.fur);
    case 'giraffe':
      return line('M172 244Q206 236 202 200', 10, INK) + line('M172 244Q206 236 202 200', 5, look.fur) + oval(202, 194, 8, 13, 0, look.limb);
    case 'elephant':
      return line('M172 244Q200 240 198 214', 9, INK) + line('M172 244Q200 240 198 214', 5, look.fur) + oval(198, 210, 6, 9, 0, look.limb);
    case 'redPanda':
      return ringedTail(look, 'ringed-tail');
    case 'raccoon':
      return ringedTail(look, 'striped-tail');
    case 'hamster':
      return oval(178, 246, 9, 9, 0, look.fur);
    case 'horse':
      return line('M172 236Q232 230 214 292', 28, INK) + line('M172 236Q232 230 214 292', 21, '#5a3520');
  }
}

/** Anything worn on top of the head, over the face: just the horse's mane for now. */
function crest(id: CharacterId): string {
  if (id !== 'horse') return '';
  return (
    '<g id="mane">' +
    oval(98, 34, 24, 15, -24, '#5a3520') +
    oval(142, 34, 24, 15, 24, '#5a3520') +
    oval(120, 26, 24, 17, 0, '#5a3520') +
    '</g>'
  );
}

/** Markings that move across the head with the face. */
function markings(id: CharacterId, look: Look): string {
  switch (id) {
    case 'cat':
      return line('M120 34V52', 7, look.limb) + line('M96 38L100 54', 7, look.limb) + line('M144 38L140 54', 7, look.limb);
    case 'fox':
      return oval(70, 132, 40, 34, 0, '#fff', false) + oval(170, 132, 40, 34, 0, '#fff', false);
    case 'tanuki':
      return (
        oval(120, 138, 44, 26, 0, '#f6ead8', false) +
        oval(78, 104, 34, 26, 20, look.limb, false) +
        oval(162, 104, 34, 26, -20, look.limb, false)
      );
    case 'beaver':
      return oval(120, 134, 46, 30, 0, '#f2d8bd', false);
    case 'deer':
      return (
        oval(120, 136, 42, 28, 0, '#fff', false) +
        '<circle cx="102" cy="48" r="5" fill="#fff"/><circle cx="120" cy="40" r="5" fill="#fff"/><circle cx="138" cy="48" r="5" fill="#fff"/>'
      );
    case 'dog':
      return oval(120, 134, 44, 30, 0, '#fffaf0', false) + oval(160, 86, 40, 36, 0, look.limb, false);
    case 'giraffe':
      return (
        oval(120, 138, 42, 28, 0, '#fff4d6', false) +
        oval(84, 52, 13, 10, 20, look.limb, false) +
        oval(154, 48, 15, 11, -15, look.limb, false) +
        oval(120, 36, 9, 7, 0, look.limb, false) +
        oval(176, 84, 10, 8, 10, look.limb, false)
      );
    case 'redPanda':
      return (
        oval(68, 130, 32, 26, 0, '#fff', false) +
        oval(172, 130, 32, 26, 0, '#fff', false) +
        oval(120, 142, 28, 20, 0, '#fff', false) +
        oval(84, 66, 13, 7, -10, '#fff', false) +
        oval(156, 66, 13, 7, 10, '#fff', false)
      );
    case 'raccoon':
      return (
        line('M120 28V62', 12, look.limb) +
        oval(82, 72, 22, 8, -8, '#fff', false) +
        oval(158, 72, 22, 8, 8, '#fff', false) +
        '<path id="mask" d="M36 100Q78 80 120 100Q162 80 204 100Q206 128 162 126Q120 114 78 126Q34 128 36 100Z" fill="#3f3b44"/>' +
        oval(120, 140, 36, 24, 0, '#fff', false)
      );
    case 'hamster':
      return (
        '<g id="cheeks">' +
        oval(60, 132, 38, 32, 0, '#fff8ee', false) +
        oval(180, 132, 38, 32, 0, '#fff8ee', false) +
        oval(120, 142, 30, 20, 0, '#fff8ee', false) +
        '</g>'
      );
    case 'horse':
      return oval(120, 72, 11, 34, 0, '#fff', false) + oval(120, 138, 40, 26, 0, '#e3b48c', false);
    default:
      return '';
  }
}

function nose(id: CharacterId): string {
  if (id === 'elephant') return '';
  if (id === 'sushi' || id === 'cat' || id === 'rabbit') {
    return `<path d="M114 122Q120 118 126 122Q124 130 120 131Q116 130 114 122Z" fill="#ff7fa8" ${stroke(2)}/>`;
  }
  const size = id === 'beaver' || id === 'dog' || id === 'tanuki' ? 9 : 7.5;
  return oval(120, 124, size, size * 0.74, 0, INK, false);
}

function mouthExtras(id: CharacterId): string {
  if (id === 'beaver') {
    return (
      `<rect x="110" y="143" width="9.5" height="17" rx="2.5" fill="#fff" ${stroke(2.5)}/>` +
      `<rect x="120.5" y="143" width="9.5" height="17" rx="2.5" fill="#fff" ${stroke(2.5)}/>`
    );
  }
  if (id === 'dog') return `<path d="M114 142Q120 164 126 142Z" fill="#ff8fa8" ${stroke(2.5)}/>`;
  if (id === 'elephant') {
    const d = 'M120 112Q116 150 124 166Q132 178 144 166';
    return `<g id="trunk">${line(d, 30, INK)}${line(d, 23, LOOKS.elephant.fur)}${line('M112 132H128M114 148H130', 2.5, INK)}</g>`;
  }
  return '';
}

/** The pack as seen from behind: it sits between the shoulders, under the head. */
function packFromBehind(cx: number, look: Look): string {
  return (
    '<g id="knapsack">' +
    `<rect x="${cx - 30}" y="170" width="60" height="54" rx="14" fill="${PACK}" ${stroke(3)}/>` +
    `<rect x="${cx - 16}" y="205" width="32" height="14" rx="5" fill="${PACK_POCKET}" ${stroke(2)}/>` +
    `<path d="M${cx - 30} 188Q${cx - 30} 170 ${cx - 16} 170H${cx + 16}Q${cx + 30} 170 ${cx + 30} 188Q${cx} 204 ${cx - 30} 188Z" fill="${look.dress2}" ${stroke(3)} stroke-linejoin="round"/>` +
    `<rect x="${cx - 4}" y="190" width="8" height="10" rx="2" fill="${look.accent}" ${stroke(2)}/>` +
    '</g>'
  );
}

/** The pack from the side, peeking out behind the body. */
function packFromSide(cx: number, look: Look): string {
  return (
    '<g id="knapsack">' +
    `<rect x="${cx - 20}" y="172" width="40" height="54" rx="13" fill="${PACK}" ${stroke(3)}/>` +
    `<path d="M${cx - 20} 190Q${cx - 20} 172 ${cx - 6} 172H${cx + 6}Q${cx + 20} 172 ${cx + 20} 190Q${cx} 202 ${cx - 20} 190Z" fill="${look.dress2}" ${stroke(3)} stroke-linejoin="round"/>` +
    '</g>'
  );
}

/** From the front all that shows is two thin straps over the shoulders. */
function straps(): string {
  return `<g id="straps">${line('M92 178Q90 198 72 210', 5, PACK_STRAP)}${line('M148 178Q150 198 168 210', 5, PACK_STRAP)}</g>`;
}

function eye(id: CharacterId, look: Look, cx: number, tilt: number, width: number): string {
  const patch = id === 'sushi' ? oval(cx, 100, 27, 31, tilt, INK, false) : '';
  const size = id === 'sushi' ? 17 : 21;
  const shine = id === 'sushi' ? 6.5 : 7.5;
  return (
    `<g transform="translate(${cx} 100) scale(${width} 1) translate(${-cx} -100)">` +
    patch +
    `<circle cx="${cx}" cy="102" r="${size}" fill="#1b1528"/>` +
    oval(cx, 102 + size * 0.45, size * 0.68, size * 0.4, 0, look.iris, false) +
    `<circle cx="${cx - 6}" cy="94" r="${shine}" fill="#fff"/>` +
    heart(cx + 7, 105, 1.25, '#fff') +
    '</g>'
  );
}

/**
 * Draws one character in one pose. `phase` is how far through a step they are,
 * or null when standing still. A foot swings forward in the air and slides back
 * flat on the ground, so one is always planted.
 */
export function characterSvg(id: CharacterId, pose: Pose, phase: number | null): string {
  const look = LOOKS[id];
  const { turn, back } = TURN[pose];
  const walking = phase !== null;
  const off = 56 * turn;
  const squeeze = 1 - 0.22 * turn;
  const dip = walking ? 2 * Math.abs(Math.sin(phase)) : 0;

  const leg = (side: 0 | 1) => {
    const swing = walking ? Math.sin(phase + side * Math.PI) : 0;
    const lift = walking ? Math.max(0, Math.cos(phase + side * Math.PI)) * 14 : 0;
    const hip = 120 + (side ? 1 : -1) * 23 * (1 - 0.75 * turn);
    const footX = hip + swing * 24 * turn;
    const footY = 287 - lift + swing * 3 * (1 - turn) * (back ? -1 : 1);
    const d = `M${hip} ${238 + dip}L${footX} ${footY - 9}`;
    return (
      line(d, 26, INK) +
      line(d, 20, 'url(#stripe)') +
      `<g transform="rotate(${-lift * turn * 1.2} ${footX} ${footY})">` +
      `<ellipse cx="${footX + 6 * turn}" cy="${footY}" rx="${20 + 4 * turn}" ry="11" fill="${look.shoe}" ${stroke(3)}/>` +
      `<ellipse cx="${footX + 6 * turn - 6}" cy="${footY - 4}" rx="5" ry="2.5" fill="rgba(255,255,255,.6)"/></g>`
    );
  };

  const arm = (cx: number, rot: number, side: 0 | 1) => {
    const swing = walking ? Math.sin(phase + side * Math.PI) * 14 : 0;
    return `<ellipse cx="${cx}" cy="208" rx="15" ry="35" transform="rotate(${rot + swing} ${cx} 178)" fill="${look.limb}"/>`;
  };

  const farArm = arm(182, -24 * (1 - turn), 1);
  const nearArm = arm(58 + 60 * turn, 24 * (1 - turn), 0);
  const armOverDress = turn > 0.4;

  // The tail hides behind Sushi from the front, but sticks out on friends.
  const tailSvg = tail(id, look);
  const tailBehind = back
    ? ''
    : turn > 0.4
      ? `<g transform="translate(240 0) scale(-1 1)">${tailSvg}</g>`
      : id === 'sushi'
        ? ''
        : tailSvg;
  const tailOnTop = back ? `<g transform="translate(${-52 - 40 * turn} -14)">${tailSvg}</g>` : '';

  // The knapsack sits on the back, so how much of it shows depends on the way they face.
  const packBehind = !back && turn > 0.4 ? packFromSide(120 - 56 - 14 * turn, look) : '';
  const packOnBack = back ? packFromBehind(120 - 40 * turn, look) : '';
  const frontStraps = back ? '' : turn < 0.9 ? straps() : line('M120 178Q104 196 70 206', 5, PACK_STRAP);

  let scallops = '';
  for (let i = 0; i <= 8; i++) {
    const y = 244 + 15 * Math.sin((Math.PI * i) / 8);
    scallops += `<circle cx="${56 + i * 16}" cy="${y}" r="10" fill="#fff" ${stroke(3)}/>`;
  }

  const earSlide = (back ? 1 : -1) * off * 0.2;
  const leftEarAt = earSlide + 13.2 * turn;
  const rightEarAt = earSlide - 13.2 * turn;
  const [leftEar, rightEar] = ears(id, look, !back);
  const [leftFlop, rightFlop] = hangingEars(id, look);

  const whiskers =
    id === 'cat' && !back
      ? `<g transform="translate(${off * 0.8} 0)">` +
        line('M42 120L14 112', 2.5, INK) + line('M42 132L14 136', 2.5, INK) +
        line('M198 120L226 112', 2.5, INK) + line('M198 132L226 136', 2.5, INK) +
        '</g>'
      : '';

  const face = back
    ? `<ellipse cx="120" cy="116" rx="54" ry="36" fill="${look.limb}" opacity=".18"/>`
    : '<g clip-path="url(#head)">' +
      `<g transform="translate(${off * 1.1} 0)">${markings(id, look)}</g>` +
      eye(id, look, 80 + off, 18, 1) +
      eye(id, look, 160 + off, -18, 1 - 0.45 * turn) +
      oval(54 + off, 134, 14, 8, 0, '#ffa3bd', false) +
      oval(186 + off, 134, 14, 8, 0, '#ffa3bd', false) +
      `<g transform="translate(${off * 1.35} 0)">${nose(id)}` +
      line('M104 136Q112 148 120 134Q128 148 136 136', 3, INK) +
      mouthExtras(id) +
      '</g></g>';

  const bow =
    id === 'sushi'
      ? `<g transform="translate(${186 + rightEarAt - 10} 40) rotate(14)">` +
        `<path d="M0 0L-20-12Q-24 0-20 12ZM0 0L20-12Q24 0 20 12Z" fill="${look.accent}" ${stroke(3)} stroke-linejoin="round"/>` +
        `<circle r="6" fill="${look.dress2}" ${stroke(3)}/></g>`
      : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -60 240 360" width="${FRAME_W}" height="${FRAME_H}">` +
    '<defs>' +
    '<clipPath id="head"><ellipse cx="120" cy="100" rx="88" ry="74"/></clipPath>' +
    '<pattern id="stripe" width="10" height="12" patternUnits="userSpaceOnUse">' +
    `<rect width="10" height="6" fill="#fff"/><rect y="6" width="10" height="6" fill="${look.stripe}"/></pattern>` +
    '<linearGradient id="rainbow" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#ff8fb3"/><stop offset=".3" stop-color="#ffc56b"/>' +
    '<stop offset=".55" stop-color="#ffe680"/><stop offset=".75" stop-color="#8fe3b0"/>' +
    '<stop offset="1" stop-color="#8fbff0"/></linearGradient></defs>' +
    `<g transform="translate(120 ${dip}) scale(${squeeze} 1) translate(-120 0)">${tailBehind}</g>` +
    leg(0) +
    leg(1) +
    `<g transform="translate(120 ${dip}) scale(${squeeze} 1) translate(-120 0)">` +
    packBehind +
    farArm +
    (armOverDress ? '' : nearArm) +
    oval(120, 212, 60, 56, 0, look.fur) +
    scallops +
    `<path d="M90 168Q120 182 150 168L190 244Q120 270 50 244Z" fill="${look.dress}" ${stroke(3.5)} stroke-linejoin="round"/>` +
    heart(96, 214, 2.4, '#fff') + heart(144, 214, 2.4, '#fff') + heart(120, 238, 2.4, '#fff') +
    heart(120, 196, 1.8, look.accent) + heart(78, 238, 1.8, look.accent) + heart(162, 238, 1.8, look.accent) +
    frontStraps +
    `<circle cx="88" cy="171" r="14" fill="${look.dress2}" ${stroke(3)}/>` +
    `<circle cx="152" cy="171" r="14" fill="${look.dress2}" ${stroke(3)}/>` +
    tailOnTop +
    (armOverDress ? nearArm : '') +
    packOnBack +
    '</g>' +
    `<g transform="translate(0 ${dip})">` +
    `<g transform="translate(${leftEarAt} 0)">${leftEar}</g>` +
    `<g transform="translate(${rightEarAt} 0)">${rightEar}</g>` +
    oval(120, 100, 88, 74, 0, look.fur) +
    face +
    whiskers +
    `<g transform="translate(${leftEarAt} 0)">${leftFlop}</g>` +
    `<g transform="translate(${rightEarAt} 0)">${rightFlop}</g>` +
    `<g transform="translate(${earSlide} 0)">${crest(id)}</g>` +
    bow +
    '</g></svg>'
  );
}

function loadImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/** One sheet per character: a row for each pose, standing still then the walk. */
export async function paintCharacterSheet(id: CharacterId): Promise<HTMLCanvasElement> {
  const sheet = document.createElement('canvas');
  sheet.width = FRAME_W * (WALK_FRAMES + 1);
  sheet.height = FRAME_H * POSES.length;
  const ctx = sheet.getContext('2d')!;
  const jobs = POSES.flatMap((pose, row) =>
    Array.from({ length: WALK_FRAMES + 1 }, async (_, column) => {
      const phase = column === 0 ? null : ((column - 1) * Math.PI * 2) / WALK_FRAMES;
      const image = await loadImage(characterSvg(id, pose, phase));
      ctx.drawImage(image, column * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H);
    }),
  );
  await Promise.all(jobs);
  return sheet;
}

/** A head-and-shoulders picture for the phone and the inbox. */
export function portrait(sheet: HTMLCanvasElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 160;
  canvas.getContext('2d')!.drawImage(sheet, 0, 0, FRAME_W, FRAME_W, 0, 0, 160, 160);
  return canvas.toDataURL('image/png');
}
