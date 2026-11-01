import type { Sounds } from '../audio';
import { friendById, type FriendId } from '../game/friends';
import { CATALOGUE, CATEGORIES, itemById, type Category } from '../game/catalogue';
import { KNAPSACK_SLOTS } from '../game/knapsack';
import type { Mission, MissionBoard, MissionEvent } from '../game/missions';
import { buy, sell, sellPrice, type Deal } from '../game/shop';
import { WORLD_H, WORLD_W } from '../world/iso';

const COIN = '<span class="coin"></span>';
const BAMBOO = '🎋';
const MAP_W = 472;
const MAP_H = Math.round((MAP_W * WORLD_H) / WORLD_W);
const TOAST_MS = 3200;
const PARTY_MS = 3400;
const SELL_TAB = 'Sell';

export interface MapMark {
  x: number;
  y: number;
  colour: string;
  size: number;
}

export interface HudActions {
  turn(step: number): void;
}

function html<T extends HTMLElement = HTMLElement>(markup: string): T {
  const holder = document.createElement('div');
  holder.innerHTML = markup.trim();
  return holder.firstElementChild as T;
}

export class Hud {
  private coins = html('<div class="pill coins"></div>');
  private quest = html('<div class="pill quest" hidden></div>');
  private badge = html('<span class="badge" hidden></span>');
  private map = html<HTMLCanvasElement>(`<canvas class="minimap" width="${MAP_W}" height="${MAP_H}"></canvas>`);
  private overlay = document.createElement('div');
  private toastBox = document.createElement('div');
  private inboxOpen = false;
  private knapsackOpen = false;
  private shopOpen = false;
  private shopTab: Category | typeof SELL_TAB = 'Food';
  private shopButton = html<HTMLButtonElement>('<button class="pill" hidden>🛍 Shop (B)</button>');
  private partyTimer = 0;
  private place = html('<div class="pill place" hidden></div>');
  private mapBase: CanvasImageSource | null = null;

  constructor(
    private root: HTMLElement,
    private board: MissionBoard,
    private sounds: Sounds,
    private portraits: Record<FriendId, string>,
    private shopkeeper: string,
    private actions: HudActions,
  ) {
    this.build();
    board.subscribe((event) => this.onMission(event));
    this.refresh();
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  /** True while the player is busy in a screen, when a call shouldn't interrupt. */
  get panelOpen(): boolean {
    return this.inboxOpen || this.knapsackOpen || this.shopOpen;
  }

  /** Puts the map picture in the corner. The dots go on top in `drawMap`. */
  setMapBase(image: CanvasImageSource): void {
    this.mapBase = image;
  }

  drawMap(marks: MapMark[]): void {
    const c = this.map.getContext('2d')!;
    c.clearRect(0, 0, MAP_W, MAP_H);
    if (this.mapBase) c.drawImage(this.mapBase, 0, 0, MAP_W, MAP_H);
    const scale = MAP_W / WORLD_W;
    for (const m of marks) {
      c.beginPath();
      c.arc(m.x * scale, m.y * scale, m.size, 0, Math.PI * 2);
      c.fillStyle = m.colour;
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = '#fff';
      c.stroke();
    }
  }

  private build(): void {
    const topLeft = html('<div class="top-left"></div>');
    const inboxButton = html<HTMLButtonElement>(`<button class="pill inbox-button">📬 Inbox</button>`);
    inboxButton.append(this.badge);
    inboxButton.onclick = () => this.toggleInbox();
    const knapsackButton = html<HTMLButtonElement>('<button class="pill knapsack-button">🎒 Knapsack</button>');
    knapsackButton.onclick = () => this.toggleKnapsack();
    this.shopButton.onclick = () => this.toggleShop();
    topLeft.append(this.coins, this.quest, inboxButton, knapsackButton, this.shopButton);

    const controls = html('<div class="controls"></div>');
    const add = (label: string, run: (button: HTMLButtonElement) => void, extra = '') => {
      const button = html<HTMLButtonElement>(`<button class="pill ${extra}">${label}</button>`);
      button.onclick = () => {
        run(button);
        button.blur();
      };
      controls.append(button);
    };
    add('↺ Turn left (Q)', () => this.actions.turn(-1), 'turn');
    add('Turn right (E) ↻', () => this.actions.turn(1), 'turn');
    if (document.fullscreenEnabled) add('⛶ Full screen (F)', () => this.toggleFullScreen());
    add(this.muteLabel(), (button) => {
      this.sounds.toggleMute();
      button.textContent = this.muteLabel();
    });
    add(this.musicLabel(), (button) => {
      this.sounds.toggleMusic();
      button.textContent = this.musicLabel();
    }, 'music-toggle');
    add('⏭ Next tune (N)', () => this.nextTune());

    const hint = html('<div class="pill hint">Arrow keys, or click or tap where Sushi should go</div>');
    window.setTimeout(() => hint.classList.add('gone'), 9000);

    this.root.append(topLeft, this.map, this.place, controls, hint, this.overlay, this.toastBox);
  }

  /** Shows where Sushi is indoors. The map and the turn buttons only make sense outside. */
  setIndoors(name: string | null, isShop = false): void {
    this.root.classList.toggle('indoors', name !== null);
    this.place.hidden = name === null;
    this.place.textContent = name ? `🏠 ${name}` : '';
    this.shopButton.hidden = !isShop;
    if (name === null) this.clearOverlay();
    if (isShop) this.toast('Walk up to the counter to buy and sell');
    else if (name) this.toast('Walk back through the door to go outside');
  }

  private nextTune(): void {
    const title = this.sounds.nextTune();
    this.toast(`🎵 Now playing: ${title}`);
    this.root.querySelector('.music-toggle')!.textContent = this.musicLabel();
  }

  private musicLabel(): string {
    return this.sounds.musicOff ? '🎵 Music off' : '🎵 Music on';
  }

  private muteLabel(): string {
    return this.sounds.muted ? '🔇 Sound off' : '🔊 Sound on';
  }

  private toggleFullScreen(): void {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => this.toast('Full screen isn\'t available here'));
  }

  private onKey(e: KeyboardEvent): void {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    if (key === 'q') this.actions.turn(-1);
    else if (key === 'e') this.actions.turn(1);
    else if (key === 'f' && document.fullscreenEnabled) this.toggleFullScreen();
    else if (key === 'i') this.toggleInbox();
    else if (key === 'k') this.toggleKnapsack();
    else if (key === 'b' && !this.shopButton.hidden) this.toggleShop();
    else if (key === 'n') this.nextTune();
    else if (key === 'enter') this.overlay.querySelector<HTMLButtonElement>('.yes:not(:disabled)')?.click();
    else if (key === 'escape') this.overlay.querySelector<HTMLButtonElement>('.no, .close')?.click();
  }

  private onMission(event: MissionEvent): void {
    switch (event.type) {
      case 'ringing':
        this.sounds.startRinging();
        this.showRinging(event.mission);
        break;
      case 'talking':
        this.sounds.stopRinging();
        this.showTalking(event.mission);
        break;
      case 'call-over':
        this.sounds.stopRinging();
        this.clearOverlay();
        break;
      case 'inboxed':
        this.toastMission(event.mission, event.why === 'busy' ? 'called. Their message is in your inbox.' : 'is saved in your inbox.');
        break;
      case 'accepted':
        this.toast(`Find the bamboo trees with a ${BAMBOO} marker!`);
        break;
      case 'stick':
        this.sounds.pick();
        break;
      case 'completed':
        this.sounds.coins();
        this.showParty(event.mission);
        this.coins.classList.remove('bump');
        void this.coins.offsetWidth;
        this.coins.classList.add('bump');
        break;
      case 'removed':
      case 'changed':
        break;
    }
    this.refresh();
    if (this.inboxOpen) this.renderInbox();
  }

  private refresh(): void {
    const { coins, inbox, active } = this.board.progress;
    this.coins.innerHTML = `${COIN} ${coins}`;
    this.badge.textContent = String(inbox.length);
    this.badge.hidden = inbox.length === 0;
    this.quest.hidden = !active;
    if (active) {
      const name = friendById(active.mission.friend).name;
      const percent = Math.round((active.collected / active.mission.sticks) * 100);
      this.quest.innerHTML =
        `${BAMBOO} ${active.collected} of ${active.mission.sticks} for ${name}` +
        `<div class="bar"><i style="width:${percent}%"></i></div>`;
    }
  }

  private clearOverlay(): void {
    window.clearTimeout(this.partyTimer);
    this.overlay.replaceChildren();
    this.inboxOpen = false;
    this.knapsackOpen = false;
    this.shopOpen = false;
  }

  private showRinging(mission: Mission): void {
    const friend = friendById(mission.friend);
    this.clearOverlay();
    const card = html(
      `<div class="panel call ringing">
        <img class="face" src="${this.portraits[mission.friend]}" alt="${friend.name}">
        <h2>${friend.name}</h2>
        <p>is calling you! 📞</p>
        <div class="actions"><button class="yes">Answer</button><button class="no">Decline</button></div>
      </div>`,
    );
    card.querySelector<HTMLButtonElement>('.yes')!.onclick = () => this.board.answer();
    card.querySelector<HTMLButtonElement>('.no')!.onclick = () => this.board.decline();
    this.overlay.append(card);
  }

  private showTalking(mission: Mission): void {
    const friend = friendById(mission.friend);
    this.clearOverlay();
    const card = html(
      `<div class="panel call">
        <img class="face" src="${this.portraits[mission.friend]}" alt="${friend.name}">
        <h2>${friend.name}</h2>
        <p>${friend.ask.replace('{n}', String(mission.sticks))}</p>
        <p class="reward">Reward: ${COIN} ${mission.reward} coins</p>
        <div class="actions"><button class="yes">Yes, I'll help!</button><button class="no">Not now</button></div>
      </div>`,
    );
    card.querySelector<HTMLButtonElement>('.yes')!.onclick = () => this.board.accept();
    card.querySelector<HTMLButtonElement>('.no')!.onclick = () => this.board.decline();
    this.overlay.append(card);
  }

  private showParty(mission: Mission): void {
    const friend = friendById(mission.friend);
    this.clearOverlay();
    this.overlay.append(
      html(
        `<div class="panel party">
          <img class="face" src="${this.portraits[mission.friend]}" alt="${friend.name}">
          <h2>Mission done! 🎉</h2>
          <p>${friend.thanks}</p>
          <p class="won">+${mission.reward} ${COIN}</p>
        </div>`,
      ),
    );
    this.partyTimer = window.setTimeout(() => this.clearOverlay(), PARTY_MS);
  }

  private toggleInbox(): void {
    if (this.board.call) return;
    if (this.inboxOpen) this.clearOverlay();
    else {
      this.clearOverlay();
      this.inboxOpen = true;
      this.renderInbox();
    }
  }

  openShop(): void {
    if (this.board.call) return;
    this.clearOverlay();
    this.shopOpen = true;
    this.renderShop();
  }

  private toggleShop(): void {
    if (this.shopOpen) this.clearOverlay();
    else this.openShop();
  }

  private renderShop(): void {
    const scroll = this.overlay.querySelector('.goods')?.scrollTop ?? 0;
    const { coins } = this.board.progress;
    const panel = html(
      `<div class="panel inbox shop">
        <header>
          <img class="keeper" src="${this.shopkeeper}" alt="Wasabi">
          <h2>Wasabi's shop</h2>
          <span class="purse">${COIN} ${coins}</span>
          <button class="close" aria-label="Close">✕</button>
        </header>
        <div class="tabs"></div>
        <div class="goods"></div>
      </div>`,
    );
    panel.querySelector<HTMLButtonElement>('.close')!.onclick = () => this.clearOverlay();
    const tabs = panel.querySelector('.tabs')!;
    const allTabs: (Category | typeof SELL_TAB)[] = [...CATEGORIES, SELL_TAB];
    for (const tab of allTabs) {
      const button = html<HTMLButtonElement>(`<button class="tab${tab === this.shopTab ? ' on' : ''}">${tab}</button>`);
      button.onclick = () => {
        this.shopTab = tab;
        this.overlay.querySelector('.goods')?.scrollTo(0, 0);
        this.renderShop();
      };
      tabs.append(button);
    }
    const goods = panel.querySelector('.goods')!;
    if (this.shopTab === SELL_TAB) this.fillSellList(goods);
    else this.fillBuyList(goods, this.shopTab);
    this.overlay.replaceChildren(panel);
    goods.scrollTop = scroll;
  }

  private fillBuyList(goods: Element, category: Category): void {
    const { coins, knapsacks } = this.board.progress;
    for (const item of CATALOGUE.filter((i) => i.category === category)) {
      const held = knapsacks.sushi.find((k) => k.id === item.id);
      const row = html(
        `<div class="ware">
          <span class="icon">${item.icon}</span>
          <span class="name">${item.name}${held ? `<small>You have ${held.count}</small>` : ''}</span>
          <span class="price">${COIN} ${item.price}</span>
          <button class="yes">Buy</button>
        </div>`,
      );
      const button = row.querySelector<HTMLButtonElement>('.yes')!;
      button.disabled = coins < item.price;
      button.onclick = () => this.trade(buy(this.board.progress, 'sushi', item.id), item.name);
      goods.append(row);
    }
  }

  private fillSellList(goods: Element): void {
    const items = this.board.progress.knapsacks.sushi;
    if (items.length === 0) goods.append(html('<p class="empty">Your knapsack is empty, so there\'s nothing to sell yet.</p>'));
    for (const held of items) {
      const item = itemById(held.id);
      if (!item) continue;
      const row = html(
        `<div class="ware">
          <span class="icon">${item.icon}</span>
          <span class="name">${item.name}<small>You have ${held.count}</small></span>
          <span class="price">${COIN} ${sellPrice(item)}</span>
          <button class="no">Sell</button>
        </div>`,
      );
      row.querySelector<HTMLButtonElement>('.no')!.onclick = () => this.trade(sell(this.board.progress, 'sushi', item.id), item.name);
      goods.append(row);
    }
  }

  private trade(deal: Deal, name: string): void {
    if (deal === 'done') this.sounds.pick();
    else if (deal === 'knapsack-full') this.toast('Your knapsack is full. Sell something first!');
    else if (deal === 'not-enough-coins') this.toast(`You need more coins for the ${name}.`);
    this.board.changed();
    if (this.shopOpen) this.renderShop();
  }

  private toggleKnapsack(): void {
    if (this.board.call) return;
    const wasOpen = this.knapsackOpen;
    this.clearOverlay();
    if (wasOpen) return;
    this.knapsackOpen = true;
    this.renderKnapsack();
  }

  private renderKnapsack(): void {
    const items = this.board.progress.knapsacks.sushi;
    const panel = html(
      `<div class="panel inbox knapsack">
        <header><h2>🎒 Sushi's knapsack</h2><button class="close" aria-label="Close">✕</button></header>
        ${items.length === 0 ? '<p class="note">It\'s empty for now.</p>' : ''}
        <div class="slots"></div>
      </div>`,
    );
    panel.querySelector<HTMLButtonElement>('.close')!.onclick = () => this.clearOverlay();
    const slots = panel.querySelector('.slots')!;
    for (let i = 0; i < KNAPSACK_SLOTS; i++) {
      const item = items[i];
      const icon = item ? (itemById(item.id)?.icon ?? '') : '';
      slots.append(
        html(item ? `<div class="slot" title="${item.name}"><span>${icon}</span>${item.name}<b>${item.count}</b></div>` : '<div class="slot"></div>'),
      );
    }
    this.overlay.append(panel);
  }

  private renderInbox(): void {
    const { inbox, active } = this.board.progress;
    this.overlay.replaceChildren();
    const panel = html(
      `<div class="panel inbox">
        <header><h2>📬 Inbox</h2><button class="close" aria-label="Close">✕</button></header>
        ${active ? '<p class="note">Finish your mission first. Sushi can do one at a time!</p>' : ''}
        <div class="list"></div>
      </div>`,
    );
    panel.querySelector<HTMLButtonElement>('.close')!.onclick = () => this.clearOverlay();
    const list = panel.querySelector('.list')!;
    if (inbox.length === 0) list.append(html('<p class="empty">No messages right now.</p>'));
    for (const mission of inbox) {
      const friend = friendById(mission.friend);
      const item = html(
        `<div class="message">
          <img src="${this.portraits[mission.friend]}" alt="${friend.name}">
          <p><b>${friend.name}</b> needs ${mission.sticks} bamboo sticks.</p>
          <div class="row"><span>${COIN} ${mission.reward}</span>
            <div><button class="yes">Accept</button><button class="no">Refuse</button></div>
          </div>
        </div>`,
      );
      const accept = item.querySelector<HTMLButtonElement>('.yes')!;
      accept.disabled = !!active;
      accept.onclick = () => {
        if (this.board.acceptFromInbox(mission.id)) this.clearOverlay();
      };
      item.querySelector<HTMLButtonElement>('.no')!.onclick = () => this.board.refuseFromInbox(mission.id);
      list.append(item);
    }
    this.overlay.append(panel);
  }

  private toastMission(mission: Mission, text: string): void {
    const friend = friendById(mission.friend);
    this.toast(`<img src="${this.portraits[mission.friend]}" alt=""> ${friend.name} ${text}`);
  }

  private toast(content: string): void {
    const item = html(`<div class="pill toast">${content}</div>`);
    this.toastBox.replaceChildren(item);
    window.setTimeout(() => item.remove(), TOAST_MS);
  }
}
