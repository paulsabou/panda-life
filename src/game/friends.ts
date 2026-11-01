export type AnimalKind = 'cat' | 'fox' | 'beaver' | 'rabbit' | 'deer' | 'dog';

export type FriendId = 'maguro' | 'inari' | 'unagi' | 'tamago' | 'ikura' | 'ebi';

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
];

export function friendById(id: FriendId): Friend {
  const friend = FRIENDS.find((f) => f.id === id);
  if (!friend) throw new Error(`Unknown friend: ${id}`);
  return friend;
}
