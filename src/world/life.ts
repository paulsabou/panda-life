import { chooseToBuy, chooseToSell, newJob, SHOP_AT, type Job } from '../game/botRules';
import { friendById, type FriendId } from '../game/friends';
import type { Progress } from '../game/missions';
import { buy, coinsOf, sell, sellPrice } from '../game/shop';
import type { Ground } from './collision';
import { doorSpot, outsideSpot, type House, type Tree, type Village } from './layout';
import { STROLL_SPEED, Walker, Wanderer } from './walker';

export const PICK_RANGE = 2.3;
export const REGROW_SECONDS = 30;
const ERRAND_SPEED = 3.6;
const PHONE_SECONDS = 2;
const AT_DOOR = 1.3;
const SHOPPING_SECONDS = 3;
const STUCK_NUDGE = 0.8;
const STUCK_GIVE_UP = 3;
const MAX_NEWS = 8;

function coins(amount: number): string {
  return amount === 1 ? '1 coin' : `${amount} coins`;
}

/** The bamboo trees, shared by everyone: a picked tree takes a while to grow a new stick. */
export class Grove {
  readonly clumps: { tree: Tree; readyIn: number }[];

  constructor(village: Village) {
    this.clumps = village.trees.filter((t) => t.kind === 'bamboo').map((tree) => ({ tree, readyIn: 0 }));
  }

  tick(seconds: number): void {
    for (const clump of this.clumps) clump.readyIn = Math.max(0, clump.readyIn - seconds);
  }

  nearestReady(x: number, y: number, taken: Set<Tree>): { tree: Tree; readyIn: number } | undefined {
    let best: { tree: Tree; readyIn: number } | undefined;
    let bestDistance = Infinity;
    for (const clump of this.clumps) {
      if (clump.readyIn > 0 || taken.has(clump.tree)) continue;
      const distance = Math.hypot(clump.tree.x - x, clump.tree.y - y);
      if (distance < bestDistance) {
        best = clump;
        bestDistance = distance;
      }
    }
    return best;
  }
}

export type Plan =
  | { kind: 'stroll' }
  | { kind: 'phone'; left: number; job: Job | null }
  | { kind: 'collect'; job: Job; target: Tree | null }
  | { kind: 'to-shop' }
  | { kind: 'in-shop'; left: number };

export class Villager extends Wanderer {
  plan: Plan = { kind: 'stroll' };
  hidden = false;
  thinkIn: number;
  blockedFor = 0;

  constructor(
    readonly id: FriendId,
    x: number,
    y: number,
    rng: () => number,
  ) {
    super(x, y, rng);
    this.thinkIn = 3 + rng() * 6;
  }

  strollHome(ground: Ground): void {
    this.speed = STROLL_SPEED;
    this.plan = { kind: 'stroll' };
    this.walkTo(ground, [this.homeX, this.homeY]);
  }
}

export type LifeEvent = { type: 'news'; text: string } | { type: 'picked'; tree: Tree };

type Listener = (event: LifeEvent) => void;

/** What the friends get up to, whether or not Sushi is there to see it. */
export class VillageLife {
  readonly grove: Grove;
  readonly villagers: Villager[];
  readonly news: string[] = [];
  private shop: House;
  private listeners: Listener[] = [];
  private sushi: Walker | null = null;
  sushiAway = false;

  constructor(
    village: Village,
    private ground: Ground,
    private progress: Progress,
    private rng: () => number = Math.random,
  ) {
    this.grove = new Grove(village);
    this.villagers = village.residents.map((r) => new Villager(r.friend.id, r.x, r.y, rng));
    this.shop = village.houses.find((h) => h.isShop)!;
  }

  setSushi(sushi: Walker): void {
    this.sushi = sushi;
  }

  subscribe(listener: Listener): void {
    this.listeners.push(listener);
  }

  /** Everyone standing in the village, to walk around. */
  present(): Walker[] {
    const here: Walker[] = this.villagers.filter((v) => !v.hidden);
    if (this.sushi && !this.sushiAway) here.push(this.sushi);
    return here;
  }

  describe(v: Villager): string {
    const { plan } = v;
    if (plan.kind === 'phone') return 'On the phone';
    if (plan.kind === 'collect') {
      return `Collecting bamboo for ${friendById(plan.job.giver).name} (${plan.job.collected} of ${plan.job.sticks})`;
    }
    if (plan.kind === 'to-shop') return 'Off to the shop';
    if (plan.kind === 'in-shop') return 'At the shop';
    return 'Strolling near home';
  }

  update(seconds: number): void {
    this.grove.tick(seconds);
    const others = this.present();
    for (const v of this.villagers) this.act(v, others, seconds);
  }

  private act(v: Villager, others: Walker[], seconds: number): void {
    const { plan } = v;
    if (plan.kind === 'stroll') {
      v.update(this.ground, others, seconds);
      v.thinkIn -= seconds;
      if (v.thinkIn <= 0) this.decide(v);
    } else if (plan.kind === 'phone') {
      v.moving = false;
      plan.left -= seconds;
      if (plan.left <= 0) this.hangUp(v, plan.job);
    } else if (plan.kind === 'collect') {
      this.collect(v, plan, others, seconds);
    } else if (plan.kind === 'to-shop') {
      this.walkToShop(v, others, seconds);
    } else {
      plan.left -= seconds;
      if (plan.left <= 0) this.leaveShop(v);
    }
  }

  /** The rules a free friend follows: shop if they can, otherwise maybe give someone a job. */
  private decide(v: Villager): void {
    v.thinkIn = 5 + this.rng() * 8;
    if (coinsOf(this.progress, v.id) >= SHOP_AT) {
      this.setOff(v);
      return;
    }
    if (this.rng() < 0.6) this.askForHelp(v);
  }

  private setOff(v: Villager): void {
    v.speed = ERRAND_SPEED;
    v.plan = { kind: 'to-shop' };
    v.walkTo(this.ground, doorSpot(this.shop));
    this.say(`${friendById(v.id).name} is off to the shop.`);
  }

  private askForHelp(giver: Villager): void {
    const free = this.villagers.filter((v) => v !== giver && v.plan.kind === 'stroll' && !v.hidden);
    const worker = free[Math.floor(this.rng() * free.length)];
    if (!worker) return;
    const job = newJob(giver.id, this.rng);
    giver.stopRoute();
    worker.stopRoute();
    giver.plan = { kind: 'phone', left: PHONE_SECONDS, job: null };
    worker.plan = { kind: 'phone', left: PHONE_SECONDS, job };
    this.say(`${friendById(giver.id).name} asked ${friendById(worker.id).name} for ${job.sticks} bamboo sticks.`);
  }

  private hangUp(v: Villager, job: Job | null): void {
    if (job) {
      v.speed = ERRAND_SPEED;
      v.plan = { kind: 'collect', job, target: null };
    } else {
      v.plan = { kind: 'stroll' };
    }
  }

  private collect(v: Villager, plan: Extract<Plan, { kind: 'collect' }>, others: Walker[], seconds: number): void {
    if (!plan.target) {
      const taken = new Set(
        this.villagers.flatMap((o) => (o.plan.kind === 'collect' && o.plan.target ? [o.plan.target] : [])),
      );
      const clump = this.grove.nearestReady(v.x, v.y, taken);
      v.moving = false;
      if (!clump) return;
      plan.target = clump.tree;
      v.walkTo(this.ground, [clump.tree.x + 0.5, clump.tree.y + 0.5]);
    }
    const clump = this.grove.clumps.find((c) => c.tree === plan.target)!;
    if (clump.readyIn > 0) {
      // Someone else got there first.
      plan.target = null;
      return;
    }
    if (Math.hypot(clump.tree.x + 0.5 - v.x, clump.tree.y + 0.5 - v.y) <= PICK_RANGE) {
      v.stopRoute();
      this.pick(v, plan, clump);
      return;
    }
    if (!v.walkingARoute) {
      plan.target = null;
      return;
    }
    this.walkOn(v, others, seconds, () => {
      plan.target = null;
    });
  }

  private pick(v: Villager, plan: Extract<Plan, { kind: 'collect' }>, clump: { tree: Tree; readyIn: number }): void {
    clump.readyIn = REGROW_SECONDS;
    plan.job.collected += 1;
    plan.target = null;
    this.emit({ type: 'picked', tree: clump.tree });
    if (plan.job.collected < plan.job.sticks) return;
    this.progress.friendCoins[v.id] += plan.job.reward;
    const name = friendById(v.id).name;
    this.say(`${name} finished the job for ${friendById(plan.job.giver).name} and earned ${plan.job.reward} coins.`);
    v.strollHome(this.ground);
  }

  private walkToShop(v: Villager, others: Walker[], seconds: number): void {
    const [dx, dy] = doorSpot(this.shop);
    if (Math.hypot(dx - v.x, dy - v.y) <= AT_DOOR) {
      v.stopRoute();
      v.moving = false;
      v.hidden = true;
      v.plan = { kind: 'in-shop', left: SHOPPING_SECONDS + this.rng() * 3 };
      return;
    }
    if (!v.walkingARoute) v.walkTo(this.ground, doorSpot(this.shop));
    this.walkOn(v, others, seconds, () => v.walkTo(this.ground, doorSpot(this.shop)));
  }

  private leaveShop(v: Villager): void {
    this.trade(v);
    [v.x, v.y] = outsideSpot(this.shop);
    v.hidden = false;
    v.strollHome(this.ground);
  }

  private trade(v: Villager): void {
    const name = friendById(v.id).name;
    const unwanted = chooseToSell(this.progress, v.id);
    if (unwanted && sell(this.progress, v.id, unwanted.id) === 'done') {
      this.say(`${name} sold: ${unwanted.name} (${coins(sellPrice(unwanted))}).`);
    }
    const wanted = chooseToBuy(this.progress, v.id, this.rng);
    if (wanted && buy(this.progress, v.id, wanted.id) === 'done') {
      this.say(`${name} bought: ${wanted.name} (${coins(wanted.price)}).`);
    }
  }

  /** Follow the route, stepping aside if someone is in the way and starting again if that fails. */
  private walkOn(v: Villager, others: Walker[], seconds: number, giveUp: () => void): void {
    if (v.followRoute(this.ground, others, seconds)) {
      v.blockedFor = 0;
      return;
    }
    v.blockedFor += seconds;
    if (v.blockedFor > STUCK_GIVE_UP) {
      v.blockedFor = 0;
      giveUp();
    } else if (v.blockedFor > STUCK_NUDGE) {
      const angle = this.rng() * Math.PI * 2;
      v.step(this.ground, others, Math.cos(angle), Math.sin(angle), seconds);
    }
  }

  private say(text: string): void {
    this.news.unshift(text);
    this.news.length = Math.min(this.news.length, MAX_NEWS);
    this.emit({ type: 'news', text });
  }

  private emit(event: LifeEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
