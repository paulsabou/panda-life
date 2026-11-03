/** Who or what is shown at the top of a tutorial card. */
export type TutorialPicture = 'sushi' | 'friend' | 'shopkeeper' | { emoji: string };

export interface TutorialStep {
  picture: TutorialPicture;
  title: string;
  /** May hold simple markup, such as the coin. */
  text: string;
}

const COIN = '<span class="coin"></span>';

/**
 * The short lesson shown when a new game starts. Phones are told to tap,
 * computers to use the keys. `animal` is what Sushi is, such as "panda".
 */
export function tutorialSteps(touch: boolean, animal: string): TutorialStep[] {
  return [
    {
      picture: 'sushi',
      title: "Hi, I'm Sushi!",
      text: `I'm a ${animal} who lives in a little village. Let me show you how to play.`,
    },
    {
      picture: { emoji: touch ? '👆' : '⌨️' },
      title: 'Walking around',
      text: touch
        ? 'Tap where you want me to go. Tap a house to walk inside.'
        : 'Use the arrow keys, or click where you want me to go. Click a house to walk inside.',
    },
    {
      picture: 'friend',
      title: 'Friends call you',
      text: touch
        ? 'When a friend calls, their face pops up at the top. Tap it to answer! Missed calls wait in your 📬 Inbox.'
        : 'When a friend calls, their face pops up at the top. Click it to answer! Missed calls wait in your 📬 Inbox.',
    },
    {
      picture: { emoji: '🎋' },
      title: 'Picking bamboo',
      text: 'Say yes, then walk up to the bamboo trees with a 🎋 marker. Each one gives you a stick.',
    },
    {
      picture: 'shopkeeper',
      title: 'Coins and the shop',
      text: `Find all the sticks and you earn ${COIN} coins. Spend them at Wasabi's shop!`,
    },
    {
      picture: { emoji: '🎁' },
      title: 'Presents',
      text: touch
        ? 'Tap a friend to give them something from your knapsack. Find out what they love most, and watch the ❤️ grow!'
        : 'Click a friend to give them something from your knapsack. Find out what they love most, and watch the ❤️ grow!',
    },
    {
      picture: { emoji: '🎒' },
      title: 'Your buttons',
      text: '📬 Inbox keeps the calls you missed. 🎒 Knapsack holds what you buy. 👥 Friends shows what everyone is up to.',
    },
    {
      picture: { emoji: '🎉' },
      title: "That's it!",
      text: 'Have fun in the village!',
    },
  ];
}
