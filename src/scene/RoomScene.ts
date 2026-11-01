import * as Phaser from 'phaser';
import { WALK_FRAMES } from '../art/characters';
import { paintNameTag } from '../art/painters';
import { ROOM_CANVAS, paintFurniture, paintRoom, roomAt, roomDoorBox, worldToRoom } from '../art/room';
import { SPRITE_SCALE } from '../art/painters';
import type { Sounds } from '../audio';
import type { Hud } from '../ui/hud';
import type { House } from '../world/layout';
import { depthAmong } from '../world/depth';
import { Walker, facing } from '../world/walker';
import {
  FURNITURE,
  ROOM_SPAWN,
  RoomCollision,
  SHOPKEEPER_SPOT,
  SHOP_FURNITURE,
  atCounter,
  atRoomDoor,
  roomDoorSpot,
  type Furniture,
} from '../world/room';
import { CHARACTER_FEET, CHARACTER_SCALE, SUSHI_SPEED, SUSHI_STEPS_PER_SECOND } from './characterSprites';
import { PlayerDriver } from './player';

const ROOM_DEPTH = 0;
const SHADOW_DEPTH = 1;
const STANDING_DEPTH = 10;
const WALL_COLOUR = '#f6eefb';
const VIEW_W = 760;
const VIEW_H = 640;
const FADE_MS = 160;
const OVERLAY_DEPTH = 100000;
const SHOPKEEPER_NAME = 'Wasabi';

function furnitureDepth(f: Furniture): number {
  return STANDING_DEPTH + f.x + f.y + (f.w + f.d) / 2;
}

export interface RoomDeps {
  hud: Hud;
  sounds: Sounds;
}

/** Inside one house. The village sleeps while this runs. */
export class RoomScene extends Phaser.Scene {
  private house!: House;
  private collision = new RoomCollision();
  private furniture: readonly Furniture[] = FURNITURE;
  private wasAtCounter = false;
  private walker!: Walker;
  private driver!: PlayerDriver;
  private sushi!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Image;
  private leaving = false;
  private walkingOut = false;
  private clock = 0;

  constructor(private deps: RoomDeps) {
    super('room');
  }

  init(data: { house: House }): void {
    this.house = data.house;
    this.leaving = false;
    this.walkingOut = false;
    this.wasAtCounter = false;
    this.furniture = data.house.isShop ? SHOP_FURNITURE : FURNITURE;
    this.collision = new RoomCollision(this.furniture);
  }

  create(): void {
    const roomKey = `room-${this.house.style}`;
    if (!this.textures.exists(roomKey)) this.textures.addCanvas(roomKey, paintRoom(this.house.style, this.house.isShop));
    this.add.image(0, 0, roomKey).setOrigin(0, 0).setScale(1 / SPRITE_SCALE).setDepth(ROOM_DEPTH);
    this.furniture.forEach((f) => this.addFurniture(f));
    if (this.house.isShop) this.addShopkeeper();

    this.walker = new Walker(ROOM_SPAWN[0], ROOM_SPAWN[1], SUSHI_SPEED);
    this.shadow = this.add.image(0, 0, 'shadow').setScale(1 / SPRITE_SCALE).setDepth(SHADOW_DEPTH);
    this.sushi = this.add
      .image(0, 0, 'character-sushi', 'front-0')
      .setOrigin(0.5, CHARACTER_FEET)
      .setScale(CHARACTER_SCALE);
    this.driver = new PlayerDriver(this, this.walker, this.collision, () => []);

    this.cameras.main.setBackgroundColor(WALL_COLOUR);
    this.fit();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fit, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fit, this));

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => this.onTap(pointer));
    this.placeSushi();
    this.cameras.main.fadeIn(FADE_MS, 255, 255, 255);
  }

  override update(_time: number, delta: number): void {
    if (this.leaving) return;
    const seconds = Math.min(delta / 1000, 0.05);
    this.clock += seconds;
    const [, pushY] = this.driver.update(0, seconds);
    this.placeSushi();
    this.visitCounter();
    const atDoor = atRoomDoor(this.walker.x, this.walker.y);
    if (pushY) this.walkingOut = false;
    const pushingThrough = pushY < 0 && this.driver.readyForDoors;
    if (atDoor && (pushingThrough || (this.walkingOut && !this.walker.walkingARoute))) this.goOutside();
  }

  private addShopkeeper(): void {
    const [x, y] = roomAt(SHOPKEEPER_SPOT[0], SHOPKEEPER_SPOT[1]);
    const depth = STANDING_DEPTH + SHOPKEEPER_SPOT[0] + SHOPKEEPER_SPOT[1];
    this.add.image(x, y + 3, 'shadow').setScale(1 / SPRITE_SCALE).setDepth(SHADOW_DEPTH);
    this.add.image(x, y, 'character-tanuki', 'frontSide-0').setOrigin(0.5, CHARACTER_FEET).setScale(CHARACTER_SCALE).setDepth(depth);
    const tagKey = 'tag-shopkeeper';
    if (!this.textures.exists(tagKey)) this.textures.addCanvas(tagKey, paintNameTag(SHOPKEEPER_NAME));
    this.add.image(x, y - 100, tagKey).setScale(1 / 3).setDepth(OVERLAY_DEPTH);
  }

  /** Walking up to the counter opens the shop, once per visit to it. */
  private visitCounter(): void {
    if (!this.house.isShop) return;
    const here = atCounter(this.walker.x, this.walker.y);
    if (here && !this.wasAtCounter) this.deps.hud.openShop();
    this.wasAtCounter = here;
  }

  private addFurniture(f: Furniture): void {
    const key = `furniture-${f.kind}-${f.back ?? ''}-${f.w}-${f.d}`;
    const picture = paintFurniture(f);
    if (!this.textures.exists(key)) this.textures.addCanvas(key, picture.canvas);
    const [x, y] = roomAt(f.x, f.y);
    this.add
      .image(x, y, key)
      .setOrigin(picture.originX, picture.originY)
      .setScale(1 / SPRITE_SCALE)
      .setDepth(furnitureDepth(f));
  }

  private fit(): void {
    const camera = this.cameras.main;
    this.cameras.resize(this.scale.width, this.scale.height);
    camera.setZoom(Math.min(this.scale.width / VIEW_W, this.scale.height / VIEW_H));
    camera.centerOn(ROOM_CANVAS.w / 2, ROOM_CANVAS.h / 2 - 10);
  }

  private onTap(pointer: Phaser.Input.Pointer): void {
    if (this.leaving) return;
    const door = roomDoorBox();
    const onDoor =
      pointer.worldX >= door.left && pointer.worldX <= door.right && pointer.worldY >= door.top && pointer.worldY <= door.bottom;
    this.walkingOut = onDoor;
    this.driver.walkTo(onDoor ? roomDoorSpot() : worldToRoom(pointer.worldX, pointer.worldY));
  }

  private placeSushi(): void {
    const { walker } = this;
    const [x, y] = roomAt(walker.x, walker.y);
    const [pose, mirrored] = facing(0, walker.dx, walker.dy);
    const column = walker.moving ? 1 + (Math.floor(this.clock * SUSHI_STEPS_PER_SECOND) % WALK_FRAMES) : 0;
    this.sushi.setPosition(x, y).setFrame(`${pose}-${column}`, false, false).setFlipX(mirrored);
    this.sushi.setDepth(this.sushiDepth());
    this.shadow.setPosition(x, y + 3);
  }

  private sushiDepth(): number {
    const { x, y } = this.walker;
    const footprints = this.furniture.map((f) => ({ ...f, depth: furnitureDepth(f) }));
    return depthAmong(x, y, STANDING_DEPTH + x + y, footprints);
  }

  private goOutside(): void {
    this.leaving = true;
    this.deps.sounds.door();
    const camera = this.cameras.main;
    camera.fadeOut(FADE_MS, 255, 255, 255);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.wake('village', { from: this.house });
      this.scene.stop();
    });
  }
}
