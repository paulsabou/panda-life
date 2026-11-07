export type AnimalKind =
  | 'cat'
  | 'fox'
  | 'beaver'
  | 'rabbit'
  | 'deer'
  | 'dog'
  | 'giraffe'
  | 'elephant'
  | 'redPanda'
  | 'raccoon'
  | 'hamster'
  | 'horse';

export type FriendId =
  | 'maguro'
  | 'inari'
  | 'unagi'
  | 'tamago'
  | 'ikura'
  | 'ebi'
  | 'nori'
  | 'toro'
  | 'ume'
  | 'tako'
  | 'mochi'
  | 'saba';

export interface Friend {
  id: FriendId;
  name: string;
  kind: AnimalKind;
  /** What the friend says when asking for bamboo. `{n}` is the number of sticks. */
  ask: string;
  thanks: string;
}

export const FRIENDS: readonly Friend[] = [
  {
    id: 'maguro',
    name: 'Maguro',
    kind: 'cat',
    ask: 'Nya! Sushi-chan, could you find me {n} bamboo sticks, pretty please?',
    thanks: 'Purrfect! You are the best, Sushi-chan!',
  },
  {
    id: 'inari',
    name: 'Inari',
    kind: 'fox',
    ask: 'Sushi-chan! I have a clever plan and it needs {n} bamboo sticks. Will you help?',
    thanks: 'Clever and kind! Thank you, Sushi-chan!',
  },
  {
    id: 'unagi',
    name: 'Unagi',
    kind: 'beaver',
    ask: 'Hello Sushi-chan! My dam has a tiny hole. Could you bring {n} bamboo sticks?',
    thanks: 'My dam is safe! Thank you, Sushi-chan!',
  },
  {
    id: 'tamago',
    name: 'Tamago',
    kind: 'rabbit',
    ask: 'Hop hop! Sushi-chan, would you gather {n} bamboo sticks for my garden?',
    thanks: 'My garden is so happy! Thank you!',
  },
  {
    id: 'ikura',
    name: 'Ikura',
    kind: 'deer',
    ask: 'Sushi-chan? I am building a little fence. May I ask for {n} bamboo sticks?',
    thanks: 'It looks so lovely! Thank you, Sushi-chan!',
  },
  {
    id: 'ebi',
    name: 'Ebi',
    kind: 'dog',
    ask: 'Woof woof! Sushi-chan! Let\'s play! Can you fetch {n} bamboo sticks?',
    thanks: 'Woof! Best fetch ever! Thank you!',
  },
  {
    id: 'nori',
    name: 'Nori',
    kind: 'giraffe',
    ask: 'Sushi-chan! From up here I can see bamboo everywhere. Could you bring me {n} sticks?',
    thanks: 'Wonderful! I could see your kindness from way up here!',
  },
  {
    id: 'toro',
    name: 'Toro',
    kind: 'elephant',
    ask: 'Paoon! Sushi-chan, I need {n} bamboo sticks for my snack. Will you help a big friend?',
    thanks: 'Paoon! I will never forget this, Sushi-chan!',
  },
  {
    id: 'ume',
    name: 'Ume',
    kind: 'redPanda',
    ask: "Um... Sushi-chan? If it's okay... could you find me {n} bamboo sticks?",
    thanks: 'Oh... thank you so much, Sushi-chan. You are so kind.',
  },
  {
    id: 'tako',
    name: 'Tako',
    kind: 'raccoon',
    ask: "Psst, Sushi-chan! I'm building something secret. I need {n} bamboo sticks!",
    thanks: 'Hehe! My secret is safe with you. Thanks, Sushi-chan!',
  },
  {
    id: 'mochi',
    name: 'Mochi',
    kind: 'hamster',
    ask: 'Squeak! Sushi-chan, my cheeks are empty! Can you bring {n} bamboo sticks?',
    thanks: 'Squeak squeak! My cheeks are full and happy!',
  },
  {
    id: 'saba',
    name: 'Saba',
    kind: 'horse',
    ask: 'Neigh! Sushi-chan, race you! First one to find {n} bamboo sticks wins!',
    thanks: 'Neigh! You win, Sushi-chan! Thank you!',
  },
];

export function friendById(id: FriendId): Friend {
  const friend = FRIENDS.find((f) => f.id === id);
  if (!friend) throw new Error(`Unknown friend: ${id}`);
  return friend;
}
