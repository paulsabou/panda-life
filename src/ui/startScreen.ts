import { CHARACTER_IDS, type CharacterId } from '../art/characters';
import { ANIMAL_NAMES } from '../game/cast';
import { html } from './hud';

export type StartChoice = { kind: 'continue' } | { kind: 'new'; animal: CharacterId };

/**
 * The first screen: carry on with the saved game or start a new one. A new
 * game begins by choosing an animal. With nothing saved, it goes straight there.
 * `saved` is the animal in the saved game, shown beside Continue.
 */
export function chooseStart(
  root: HTMLElement,
  hasSave: boolean,
  saved: CharacterId,
  faces: Record<CharacterId, string>,
): Promise<StartChoice> {
  const screen = html('<div class="start-screen"></div>');
  root.append(screen);

  return new Promise((resolve) => {
    const finish = (choice: StartChoice) => {
      screen.remove();
      resolve(choice);
    };

    const showMenu = () => {
      const card = html(
        `<div class="panel start-card">
          <img class="face" src="${faces[saved]}" alt="">
          <h1>Panda Life</h1>
          <div class="actions">
            <button class="yes">▶ Continue</button>
            <button class="no">✨ New game</button>
          </div>
        </div>`,
      );
      card.querySelector<HTMLButtonElement>('.yes')!.onclick = () => finish({ kind: 'continue' });
      card.querySelector<HTMLButtonElement>('.no')!.onclick = showAnimals;
      screen.replaceChildren(card);
      card.querySelector<HTMLButtonElement>('.yes')!.focus();
    };

    const showAnimals = () => {
      const card = html(
        `<div class="panel start-card animals">
          <h1>Choose your animal</h1>
          ${hasSave ? '<p class="note">A new game starts again from nothing, in place of your saved one.</p>' : ''}
          <div class="animal-grid"></div>
          ${hasSave ? '<div class="actions"><button class="no">← Back</button></div>' : ''}
        </div>`,
      );
      const grid = card.querySelector('.animal-grid')!;
      for (const id of CHARACTER_IDS) {
        const button = html<HTMLButtonElement>(
          `<button class="animal"><img src="${faces[id]}" alt=""><span>${ANIMAL_NAMES[id]}</span></button>`,
        );
        button.onclick = () => finish({ kind: 'new', animal: id });
        grid.append(button);
      }
      const back = card.querySelector<HTMLButtonElement>('.no');
      if (back) back.onclick = showMenu;
      screen.replaceChildren(card);
    };

    if (hasSave) showMenu();
    else showAnimals();
  });
}
