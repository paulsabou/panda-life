import * as Phaser from 'phaser';
import { FRAME_H, FRAME_W, POSES, WALK_FRAMES, type CharacterId } from '../art/characters';
import {
  BAMBOO_CANVAS,
  paintBubble,
  GROUND_SCALE,
  HOUSE_CANVAS,
  SPRITE_SCALE,
  TREE_CANVAS,
  paintBamboo,
  groundPieces,
  paintGroundPiece,
  paintSky,
  paintHouse,
  paintNameTag,
  paintPlusOne,
  paintRail,
  paintRoundTree,
  paintShadow,
  paintStickMarker,
  paintTapRing,
} from '../art/painters';
import type { Sounds } from '../audio';
import type { MissionBoard } from '../game/missions';
import { PICK_RANGE, REGROW_SECONDS, Villager, type Plan, type VillageLife } from '../world/life';
import type { Hud } from '../ui/hud';
import { Collision } from '../world/collision';
import { depthAmong, railFootprints } from '../world/depth';
import {
  HOUSE_SIZE,
  WORLD_H,
  WORLD_W,
  depthOf,
  project,
  rotate,
  screenToWorld,
  type Rotation,
} from '../world/iso';
import {
  BAMBOO_STYLES,
  ROUND_TREE_STYLES,
  doorSpot,
  houseAt,
  houseAtDoor,
  outsideSpot,
  type Bridge,
  type House,
  type Tree,
  type Village,
} from '../world/layout';
import { Walker, facing } from '../world/walker';
import { CHARACTER_FEET, CHARACTER_SCALE, SUSHI_SPEED, SUSHI_STEPS_PER_SECOND } from './characterSprites';
import { PlayerDriver } from './player';

const FRIEND_STEPS_PER_SECOND = 11;
const VISIBLE_WORLD_WIDTH = 1100;
const BUBBLES: Partial<Record<Plan['kind'], string>> = {
  phone: '📞',
  collect: '🎋',
  'to-shop': '🛍',
  'to-give': '🎁',
  giving: '💕',
};
/** How close Sushi must be to a friend to hand over a present. */
const GIFT_REACH = 2.2;
/** How long Sushi keeps following a friend who was tapped, in case they walk off. */
const FOLLOW_SECONDS = 8;
const FADE_MS = 160;
const TALLEST_WALL = 150;

/** Depths: the ground, then shadows, then everything standing sorted by distance. */
const GROUND_DEPTH = 0;
const SHADOW_DEPTH = 1;
const STANDING_DEPTH = 10;
const OVERLAY_DEPTH = 100000;

interface Actor {
  id: CharacterId;
  walker: Walker;
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  tag?: Phaser.GameObjects.Image;
  bubble?: Phaser.GameObjects.Image;
  stepsPerSecond: number;
  /** Keeps friends from all stepping in time. */
  stepOffset: number;
}

interface Rail {
  bridge: Bridge;
  y: number;
  near: boolean;
  key: string;
  image: Phaser.GameObjects.Image;
}

interface BambooClump {
  tree: Tree;
  image: Phaser.GameObjects.Image;
  marker: Phaser.GameObjects.Image;
}

export interface SceneDeps {
  village: Village;
  sheets: Record<CharacterId, HTMLCanvasElement>;
  board: MissionBoard;
  life: VillageLife;
  hud: Hud;
  sounds: Sounds;
  dpr: () => number;
}

function placeName(house: House): string {
  if (house.isShop) return 'Village Shop';
  return house.owner ? `${house.owner.name}'s house` : "Sushi's house";
}

export class VillageScene extends Phaser.Scene {
  private rotation: Rotation = 0;
  private turning = false;
  private collision: Collision;
  private groundImages: Phaser.GameObjects.Image[] = [];
  private groundTextures: string[] = [];
  private houses: { house: House; image: Phaser.GameObjects.Image }[] = [];
  private trees: { tree: Tree; image: Phaser.GameObjects.Image }[] = [];
  private bamboo: BambooClump[] = [];
  private rails: Rail[] = [];
  private actors: Actor[] = [];
  private sushi!: Actor;
  private driver!: PlayerDriver;
  /** The house Sushi is walking to after a tap on it. */
  private headingFor: House | null = null;
  /** The friend Sushi is walking up to after a tap on them, to give a present. */
  private visiting: { villager: Villager; left: number } | null = null;
  private indoors = false;
  private shop!: House;
  private shopTag!: Phaser.GameObjects.Image;
  private clock = 0;

  constructor(private deps: SceneDeps) {
    super('village');
    this.collision = new Collision(deps.village);
  }

  create(): void {
    this.addStaticTextures();
    const { village } = this.deps;

    this.textures.addCanvas('sky', paintSky());
    this.add.image(0, 0, 'sky').setOrigin(0, 0).setDisplaySize(WORLD_W, WORLD_H).setDepth(GROUND_DEPTH - 0.5);

    this.houses = village.houses.map((house) => ({
      house,
      image: this.add
        .image(0, 0, this.houseKey(house.style, 0))
        .setOrigin(HOUSE_CANVAS.anchorX / HOUSE_CANVAS.w, HOUSE_CANVAS.anchorY / HOUSE_CANVAS.h)
        .setScale(1 / SPRITE_SCALE),
    }));

    for (const tree of village.trees) {
      const bamboo = tree.kind === 'bamboo';
      const box = bamboo ? BAMBOO_CANVAS : TREE_CANVAS;
      const image = this.add
        .image(0, 0, `${tree.kind}-${tree.variant}`)
        .setOrigin(box.anchorX / box.w, box.anchorY / box.h)
        .setScale(1 / SPRITE_SCALE);
      this.trees.push({ tree, image });
      if (bamboo) {
        const marker = this.add.image(0, 0, 'stick-marker').setScale(1 / 3).setDepth(OVERLAY_DEPTH).setVisible(false);
        this.bamboo.push({ tree, image, marker });
      }
    }

    this.rails = village.bridges.flatMap((bridge, b) =>
      [false, true].map((near) => {
        const rail = { bridge, y: near ? bridge.y1 : bridge.y0, near, key: `rail-${b}-${near ? 1 : 0}` };
        const image = this.add.image(0, 0, this.railKey(rail, 0)).setOrigin(0, 0).setScale(1 / SPRITE_SCALE);
        return { ...rail, image };
      }),
    );

    this.sushi = this.addActor('sushi', new Walker(village.start[0], village.start[1], SUSHI_SPEED), SUSHI_STEPS_PER_SECOND);
    for (const [kind, icon] of Object.entries(BUBBLES)) this.textures.addCanvas(`bubble-${kind}`, paintBubble(icon));
    this.deps.life.setSushi(this.sushi.walker);
    village.residents.forEach((r, i) => {
      const walker = this.deps.life.villagers[i];
      const actor = this.addActor(r.friend.kind, walker, FRIEND_STEPS_PER_SECOND);
      actor.stepOffset = i * 7;
      const tagKey = `tag-${r.friend.id}`;
      this.textures.addCanvas(tagKey, paintNameTag(r.friend.name));
      actor.tag = this.add.image(0, 0, tagKey).setScale(1 / 3).setDepth(OVERLAY_DEPTH);
      actor.bubble = this.add.image(0, 0, 'bubble-collect').setScale(1 / 3).setDepth(OVERLAY_DEPTH).setVisible(false);
    });

    const shop = village.houses.find((h) => h.isShop)!;
    this.textures.addCanvas('tag-shop', paintNameTag('Village Shop'));
    this.shopTag = this.add.image(0, 0, 'tag-shop').setScale(1 / 3).setDepth(OVERLAY_DEPTH);
    this.shop = shop;

    this.placeWorld();
    this.setUpCamera();
    this.setUpInput();

    this.deps.board.subscribe((event) => {
      if (event.type === 'completed') this.celebrate();
    });
    this.deps.life.subscribe((event) => {
      if (event.type !== 'picked') return;
      const clump = this.bamboo.find((c) => c.tree === event.tree);
      if (clump) this.shake(clump.image);
    });
    this.game.events.emit('village-ready');
  }

  turn(step: number): void {
    if (this.turning || this.indoors) return;
    this.turning = true;
    const camera = this.cameras.main;
    camera.fadeOut(110, 227, 247, 251);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.rotation = ((this.rotation + step + 4) % 4) as Rotation;
      this.placeWorld();
      this.updateActors();
      camera.centerOn(this.sushi.image.x, this.sushi.image.y);
      camera.fadeIn(170, 227, 247, 251);
      this.turning = false;
    });
  }

  fitToWindow(): void {
    const camera = this.cameras.main;
    this.cameras.resize(this.scale.width, this.scale.height);
    const cssWidth = this.scale.width / this.deps.dpr();
    camera.setZoom(this.deps.dpr() * Math.max(1, cssWidth / VISIBLE_WORLD_WIDTH));
  }

  override update(_time: number, delta: number): void {
    const seconds = Math.min(delta / 1000, 0.05);
    this.clock += seconds;
    if (this.indoors) return;
    const push = this.driver.update(this.rotation, seconds);
    this.useDoors(push);
    this.visit(push, seconds);
    this.updateActors();
    this.updateBamboo();
  }

  private addStaticTextures(): void {
    for (const [id, sheet] of Object.entries(this.deps.sheets)) {
      const texture = this.textures.addCanvas(`character-${id}`, sheet)!;
      POSES.forEach((pose, row) => {
        for (let column = 0; column <= WALK_FRAMES; column++) {
          texture.add(`${pose}-${column}`, 0, column * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H);
        }
      });
    }
    for (let i = 0; i < BAMBOO_STYLES; i++) this.textures.addCanvas(`bamboo-${i}`, paintBamboo(i));
    for (let i = 0; i < ROUND_TREE_STYLES; i++) this.textures.addCanvas(`round-${i}`, paintRoundTree(i));
    this.textures.addCanvas('shadow', paintShadow());
    this.textures.addCanvas('stick-marker', paintStickMarker());
    this.textures.addCanvas('plus-one', paintPlusOne());
    this.textures.addCanvas('tap-ring', paintTapRing());
  }

  // House and rail pictures for the other three map angles are painted the first time they're needed.

  /** Paints the ground for this map angle, piece by piece, and lets go of the last angle's pieces. */
  private layGround(r: Rotation): void {
    for (const image of this.groundImages) image.destroy();
    for (const key of this.groundTextures) this.textures.remove(key);
    this.groundImages = [];
    this.groundTextures = [];
    groundPieces(r).forEach((piece, i) => {
      const key = `ground-${r}-${i}`;
      this.textures.addCanvas(key, paintGroundPiece(this.deps.village, r, piece));
      this.groundTextures.push(key);
      this.groundImages.push(
        this.add.image(piece.x, piece.y, key).setOrigin(0, 0).setScale(1 / GROUND_SCALE).setDepth(GROUND_DEPTH),
      );
    });
  }

  private houseKey(style: number, r: Rotation): string {
    const key = `house-${style}-${r}`;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, paintHouse(style, r));
    return key;
  }

  private railKey(rail: Omit<Rail, 'image'>, r: Rotation): string {
    const key = `${rail.key}-${r}`;
    if (!this.textures.exists(key)) {
      const picture = paintRail(rail.bridge, rail.y, rail.near, r);
      this.textures.addCanvas(key, picture.canvas);
      this.railSpots.set(key, [picture.x, picture.y]);
    }
    return key;
  }

  private railSpots = new Map<string, [number, number]>();

  private addActor(id: CharacterId, walker: Walker, stepsPerSecond: number): Actor {
    const actor: Actor = {
      id,
      walker,
      image: this.add.image(0, 0, `character-${id}`, 'front-0').setOrigin(0.5, CHARACTER_FEET).setScale(CHARACTER_SCALE),
      shadow: this.add.image(0, 0, 'shadow').setScale(1 / SPRITE_SCALE).setDepth(SHADOW_DEPTH),
      stepsPerSecond,
      stepOffset: 0,
    };
    this.actors.push(actor);
    return actor;
  }

  /** Puts everything fixed where it belongs for the current map angle. */
  private placeWorld(): void {
    const r = this.rotation;
    this.layGround(r);

    for (const { house, image } of this.houses) {
      const a = rotate(r, house.x, house.y);
      const b = rotate(r, house.x + HOUSE_SIZE, house.y + HOUSE_SIZE);
      const [x, y] = project(0, Math.min(a[0], b[0]), Math.min(a[1], b[1]));
      image.setTexture(this.houseKey(house.style, r)).setPosition(x, y).setDepth(this.houseDepth(house));
    }
    for (const { tree, image } of this.trees) {
      const [x, y] = project(r, tree.x + 0.5, tree.y + 0.5);
      image.setPosition(x, y).setDepth(STANDING_DEPTH + depthOf(r, tree.x + 0.5, tree.y + 0.5));
    }
    const [tagX, tagY] = project(r, this.shop.x + HOUSE_SIZE / 2, this.shop.y + HOUSE_SIZE / 2, 190);
    this.shopTag.setPosition(tagX, tagY);
    this.rails.forEach((rail) => {
      const key = this.railKey(rail, r);
      const [x, y] = this.railSpots.get(key)!;
      const [far, near] = railFootprints(rail.bridge, r, STANDING_DEPTH);
      rail.image.setTexture(key).setPosition(x, y).setDepth((rail.near ? near : far).depth);
    });
  }

  private houseDepth(house: House): number {
    return STANDING_DEPTH + depthOf(this.rotation, house.x + HOUSE_SIZE / 2, house.y + HOUSE_SIZE / 2);
  }

  private setUpCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_W, WORLD_H);
    camera.setBackgroundColor('#e3f7fb');
    this.fitToWindow();
    camera.startFollow(this.sushi.image, true, 0.12, 0.12);
    camera.centerOn(this.sushi.image.x, this.sushi.image.y);
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.fitToWindow());
  }

  private setUpInput(): void {
    this.driver = new PlayerDriver(this, this.sushi.walker, this.collision, () => this.deps.life.present());
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.indoors) return;
      const villager = this.villagerUnder(pointer.worldX, pointer.worldY);
      this.visiting = villager ? { villager, left: FOLLOW_SECONDS } : null;
      if (villager) {
        this.headingFor = null;
        this.driver.walkTo([villager.x, villager.y]);
        this.showTap(pointer.worldX, pointer.worldY);
        return;
      }
      const house = this.houseUnder(pointer.worldX, pointer.worldY);
      this.headingFor = house;
      if (house) this.driver.walkTo(doorSpot(house));
      else this.driver.walkTo(screenToWorld(this.rotation, pointer.worldX, pointer.worldY));
      this.showTap(pointer.worldX, pointer.worldY);
    });
    this.events.on(Phaser.Scenes.Events.WAKE, (_system: unknown, data: { from: House }) => this.comeOutOf(data.from));
  }

  /** A friend standing where the tap landed, nearest the front if they overlap. */
  private villagerUnder(sx: number, sy: number): Villager | null {
    let best: { villager: Villager; depth: number } | null = null;
    for (const actor of this.actors) {
      const { walker, image } = actor;
      if (!(walker instanceof Villager) || walker.hidden || !image.getBounds().contains(sx, sy)) continue;
      if (!best || image.depth > best.depth) best = { villager: walker, depth: image.depth };
    }
    return best?.villager ?? null;
  }

  /** Walk up to the friend who was tapped, following if they move, then offer a present. */
  private visit(push: [number, number], seconds: number): void {
    if (!this.visiting) return;
    const { villager } = this.visiting;
    const sushi = this.sushi.walker;
    this.visiting.left -= seconds;
    if (push[0] || push[1] || villager.hidden || this.visiting.left <= 0) {
      this.visiting = null;
      return;
    }
    if (Math.hypot(villager.x - sushi.x, villager.y - sushi.y) <= GIFT_REACH) {
      this.visiting = null;
      sushi.stopRoute();
      this.deps.hud.openGift(villager.id);
      return;
    }
    if (!sushi.walkingARoute) this.driver.walkTo([villager.x, villager.y]);
  }

  /** Walls stand up from the ground, so a tap on one lands on the ground in front of it. */
  private houseUnder(sx: number, sy: number): House | null {
    for (let z = 0; z <= TALLEST_WALL; z += 15) {
      const [x, y] = screenToWorld(this.rotation, sx, sy + z);
      const house = houseAt(this.deps.village, x, y);
      if (house) return house;
    }
    return null;
  }

  private useDoors(push: [number, number]): void {
    const walker = this.sushi.walker;
    const atDoor = houseAtDoor(this.deps.village, walker.x, walker.y);
    if (push[0] || push[1]) this.headingFor = null;
    if (this.headingFor && !walker.walkingARoute) {
      const arrived = atDoor === this.headingFor;
      this.headingFor = null;
      if (arrived && atDoor) this.goInside(atDoor);
      return;
    }
    if (atDoor && push[1] < 0 && this.driver.readyForDoors) this.goInside(atDoor);
  }

  private goInside(house: House): void {
    this.indoors = true;
    this.deps.life.sushiAway = true;
    this.deps.sounds.door();
    this.deps.sounds.playMusic(house.isShop ? 'shop' : (house.owner?.id ?? 'sushi'));
    this.deps.hud.setIndoors(placeName(house), house.isShop);
    const camera = this.cameras.main;
    camera.fadeOut(FADE_MS, 255, 255, 255);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.run('room', { house });
      this.scene.sleep();
    });
  }

  private comeOutOf(house: House): void {
    const walker = this.sushi.walker;
    [walker.x, walker.y] = outsideSpot(house);
    walker.dx = 1;
    walker.dy = 1;
    walker.moving = false;
    walker.stopRoute();
    this.driver.reset();
    this.indoors = false;
    this.deps.life.sushiAway = false;
    this.headingFor = null;
    this.visiting = null;
    this.deps.hud.setIndoors(null);
    this.deps.sounds.playMusic('village');
    this.updateActors();
    this.cameras.main.centerOn(this.sushi.image.x, this.sushi.image.y);
    this.cameras.main.fadeIn(FADE_MS, 255, 255, 255);
  }

  private showTap(x: number, y: number): void {
    const ring = this.add.image(x, y, 'tap-ring').setScale(0.2).setDepth(SHADOW_DEPTH);
    this.tweens.add({ targets: ring, scale: 0.7, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
  }

  private updateActors(): void {
    for (const actor of this.actors) {
      const { walker, image } = actor;
      const [x, y] = project(this.rotation, walker.x, walker.y);
      const [pose, mirrored] = facing(this.rotation, walker.dx, walker.dy);
      const column = walker.moving
        ? 1 + (Math.floor((this.clock + actor.stepOffset) * actor.stepsPerSecond) % WALK_FRAMES)
        : 0;
      image.setPosition(x, y).setFrame(`${pose}-${column}`, false, false).setFlipX(mirrored);
      image.setDepth(this.actorDepth(walker));
      actor.shadow.setPosition(x, y + 3);
      actor.tag?.setPosition(x, y - 100);
      if (walker instanceof Villager) this.showErrand(actor, walker, x, y);
    }
  }

  private actorDepth(walker: Walker): number {
    const [vx, vy] = rotate(this.rotation, walker.x, walker.y);
    const footprints = this.houses.map(({ house }) => {
      const a = rotate(this.rotation, house.x, house.y);
      const b = rotate(this.rotation, house.x + HOUSE_SIZE, house.y + HOUSE_SIZE);
      return {
        x: Math.min(a[0], b[0]),
        y: Math.min(a[1], b[1]),
        w: HOUSE_SIZE,
        d: HOUSE_SIZE,
        depth: this.houseDepth(house),
      };
    });
    // Railings are long and thin, so walkers on a deck are layered between them along its whole length.
    for (const bridge of this.deps.village.bridges) footprints.push(...railFootprints(bridge, this.rotation, STANDING_DEPTH));
    return depthAmong(vx, vy, STANDING_DEPTH + vx + vy, footprints);
  }

  private showErrand(actor: Actor, villager: Villager, x: number, y: number): void {
    const visible = !villager.hidden;
    actor.image.setVisible(visible);
    actor.shadow.setVisible(visible);
    actor.tag?.setVisible(visible);
    const showing = visible && villager.plan.kind in BUBBLES;
    actor.bubble?.setVisible(showing);
    if (showing) actor.bubble?.setTexture(`bubble-${villager.plan.kind}`).setPosition(x, y - 128);
  }

  private updateBamboo(): void {
    const { board, life } = this.deps;
    const hasMission = !!board.progress.active;
    const sushi = this.sushi.walker;
    this.bamboo.forEach((clump, i) => {
      const growing = life.grove.clumps[i];
      const ready = hasMission && growing.readyIn === 0;
      clump.marker.setVisible(ready);
      if (!ready) return;
      const cx = clump.tree.x + 0.5;
      const cy = clump.tree.y + 0.5;
      const [x, y] = project(this.rotation, cx, cy);
      clump.marker.setPosition(x, y - 214 + Math.sin(this.clock * 3 + clump.tree.x) * 5);
      if (Math.hypot(cx - sushi.x, cy - sushi.y) <= PICK_RANGE && board.progress.active) {
        growing.readyIn = REGROW_SECONDS;
        this.pickFrom(clump);
        board.collectStick();
      }
    });
  }

  private shake(image: Phaser.GameObjects.Image): void {
    const scale = 1 / SPRITE_SCALE;
    this.tweens.add({ targets: image, scaleX: scale * 1.05, scaleY: scale * 0.96, duration: 90, yoyo: true });
  }

  private pickFrom(clump: BambooClump): void {
    clump.marker.setVisible(false);
    this.shake(clump.image);
    const plus = this.add.image(clump.marker.x, clump.marker.y, 'plus-one').setScale(1 / 3).setDepth(OVERLAY_DEPTH);
    this.tweens.add({
      targets: plus,
      y: plus.y - 46,
      alpha: 0,
      duration: 800,
      ease: 'Sine.easeOut',
      onComplete: () => plus.destroy(),
    });
  }

  private celebrate(): void {
    const image = this.sushi.image;
    this.tweens.add({ targets: image, scaleX: CHARACTER_SCALE * 1.14, scaleY: CHARACTER_SCALE * 0.9, duration: 130, yoyo: true, repeat: 2 });
  }
}
