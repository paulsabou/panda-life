import * as Phaser from 'phaser';
import { CHARACTER_IDS, paintCharacterSheet, portrait, type CharacterId } from './art/characters';
import { Sounds } from './audio';
import { ANIMAL_NAMES, castFor } from './game/cast';
import { FRIENDS, type FriendId } from './game/friends';
import { MissionBoard } from './game/missions';
import { hasSavedGame, loadAnimal, loadProgress, saveProgress, startNewGame } from './game/save';
import { RoomScene } from './scene/RoomScene';
import { VillageScene } from './scene/VillageScene';
import './ui/styles.css';
import { Hud } from './ui/hud';
import { chooseStart } from './ui/startScreen';
import { Collision } from './world/collision';
import { buildVillage } from './world/layout';
import { VillageLife } from './world/life';

const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);

async function start(): Promise<void> {
  const sounds = new Sounds();
  // Browsers only allow sound once the player has touched something.
  for (const event of ['pointerdown', 'keydown']) window.addEventListener(event, () => sounds.unlock());

  const painted = await Promise.all(CHARACTER_IDS.map(paintCharacterSheet));
  const art = Object.fromEntries(CHARACTER_IDS.map((id, i) => [id, painted[i]])) as Record<CharacterId, HTMLCanvasElement>;

  const ui = document.getElementById('ui')!;
  const loading = document.getElementById('loading')!;
  loading.classList.add('done');
  const faces = Object.fromEntries(CHARACTER_IDS.map((id) => [id, portrait(art[id])])) as Record<CharacterId, string>;
  const choice = await chooseStart(ui, hasSavedGame(localStorage), loadAnimal(localStorage), faces);
  loading.classList.remove('done');
  const progress = choice.kind === 'new' ? startNewGame(localStorage, choice.animal) : loadProgress(localStorage);
  const animal = choice.kind === 'new' ? choice.animal : loadAnimal(localStorage);

  // Each part is drawn as its animal in this game's cast, so Sushi can be any of them.
  const cast = castFor(animal);
  const sheets = Object.fromEntries(CHARACTER_IDS.map((id) => [id, art[cast[id]]])) as Record<CharacterId, HTMLCanvasElement>;
  const portraits = Object.fromEntries(FRIENDS.map((f) => [f.id, faces[cast[f.kind]]])) as Record<FriendId, string>;

  const village = buildVillage();
  const board = new MissionBoard(progress);
  board.subscribe(() => saveProgress(board.toSave(), localStorage));
  const life = new VillageLife(village, new Collision(village), board.progress);
  life.subscribe(() => saveProgress(board.toSave(), localStorage));

  let scene: VillageScene;
  const hud = new Hud(ui, board, life, sounds, portraits, faces[cast.tanuki], {
    turn: (step) => scene.turn(step),
  });
  // Shown straight away, under the loading screen, so no call can ring before it is done.
  if (choice.kind === 'new') hud.showTutorial(faces[animal], ANIMAL_NAMES[animal].toLowerCase());
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
  // One that is already ringing on the top bar still moves on to the inbox.
  game.events.on(Phaser.Core.Events.STEP, (_time: number, delta: number) => {
    const seconds = Math.min(delta / 1000, 0.05);
    if (!hud.panelOpen || board.call?.stage === 'ringing') board.tick(seconds);
    life.update(seconds);
  });

  window.addEventListener('resize', () => game.scale.resize(window.innerWidth * dpr, window.innerHeight * dpr));
  game.events.once('village-ready', () => document.getElementById('loading')!.classList.add('done'));

  if (import.meta.env.DEV) Object.assign(window, { __panda: { game, scene, board, village, sounds, life } });
}

void start();
