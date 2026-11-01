import * as Phaser from 'phaser';
import { paintCharacterSheet, portrait, type CharacterId } from './art/characters';
import { Sounds } from './audio';
import { FRIENDS, type FriendId } from './game/friends';
import { MissionBoard } from './game/missions';
import { loadProgress, saveProgress } from './game/save';
import { RoomScene } from './scene/RoomScene';
import { VillageScene } from './scene/VillageScene';
import './ui/styles.css';
import { Hud } from './ui/hud';
import { Collision } from './world/collision';
import { buildVillage } from './world/layout';
import { VillageLife } from './world/life';

const CHARACTERS: CharacterId[] = ['sushi', 'tanuki', 'cat', 'fox', 'beaver', 'rabbit', 'deer', 'dog'];

const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);

async function start(): Promise<void> {
  const painted = await Promise.all(CHARACTERS.map(paintCharacterSheet));
  const sheets = Object.fromEntries(CHARACTERS.map((id, i) => [id, painted[i]])) as Record<CharacterId, HTMLCanvasElement>;
  const portraits = Object.fromEntries(FRIENDS.map((f) => [f.id, portrait(sheets[f.kind])])) as Record<FriendId, string>;

  const village = buildVillage();
  const board = new MissionBoard(loadProgress(localStorage));
  board.subscribe(() => saveProgress(board.toSave(), localStorage));
  const life = new VillageLife(village, new Collision(village), board.progress);
  life.subscribe(() => saveProgress(board.toSave(), localStorage));

  const sounds = new Sounds();
  // Browsers only allow sound once the player has touched something.
  for (const event of ['pointerdown', 'keydown']) window.addEventListener(event, () => sounds.unlock());
  let scene: VillageScene;
  const hud = new Hud(document.getElementById('ui')!, board, life, sounds, portraits, portrait(sheets.tanuki), {
    turn: (step) => scene.turn(step),
  });
  scene = new VillageScene({ village, sheets, board, life, hud, sounds, dpr: pixelRatio });

  // The canvas is sized in device pixels and shown at CSS size, so it stays sharp on Retina screens.
  const dpr = pixelRatio();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#e3f7fb',
    scale: {
      mode: Phaser.Scale.NONE,
      width: window.innerWidth * dpr,
      height: window.innerHeight * dpr,
      zoom: 1 / dpr,
    },
    scene: [scene, new RoomScene({ hud, sounds })],
  });

  // Calls keep coming wherever Sushi is, indoors included, but wait if a screen is open.
  game.events.on(Phaser.Core.Events.STEP, (_time: number, delta: number) => {
    const seconds = Math.min(delta / 1000, 0.05);
    if (!hud.panelOpen) board.tick(seconds);
    life.update(seconds);
  });

  window.addEventListener('resize', () => game.scale.resize(window.innerWidth * dpr, window.innerHeight * dpr));
  game.events.once('village-ready', () => document.getElementById('loading')!.classList.add('done'));

  if (import.meta.env.DEV) Object.assign(window, { __panda: { game, scene, board, village, sounds, life } });
}

void start();
