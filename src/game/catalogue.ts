export type Category = 'Food' | 'Kitchen' | 'Books & study' | 'Home' | 'Play & wear';

export const CATEGORIES: readonly Category[] = ['Food', 'Kitchen', 'Books & study', 'Home', 'Play & wear'];

export interface ShopItem {
  id: string;
  name: string;
  category: Category;
  icon: string;
  /** Coins to buy one. A mission pays 2 coins per stick, so 6 to 16 coins a time. */
  price: number;
}

const ROWS: readonly (readonly [Category, string, string, number])[] = [
  // Food
  ['Food', '🍙', 'Rice ball', 3],
  ['Food', '🌾', 'Bag of rice', 12],
  ['Food', '🥣', 'Miso paste', 6],
  ['Food', '🍶', 'Soy sauce', 5],
  ['Food', '⬜', 'Tofu', 3],
  ['Food', '🫘', 'Natto', 2],
  ['Food', '🌿', 'Nori seaweed', 3],
  ['Food', '🔴', 'Pickled plum', 4],
  ['Food', '🍵', 'Green tea leaves', 8],
  ['Food', '🍲', 'Dashi stock', 5],
  ['Food', '🍜', 'Udon noodles', 4],
  ['Food', '🍝', 'Soba noodles', 4],
  ['Food', '🍥', 'Fish cake', 3],
  ['Food', '🍡', 'Dango', 3],
  ['Food', '🥮', 'Mochi', 4],
  ['Food', '🥞', 'Dorayaki', 4],
  ['Food', '🐟', 'Taiyaki', 4],
  ['Food', '🍘', 'Rice cracker', 3],
  ['Food', '🍫', 'Chocolate sticks', 3],
  ['Food', '🥐', 'Melon bread', 3],
  ['Food', '🍛', 'Curry roux', 5],
  ['Food', '🥚', 'Box of eggs', 5],
  ['Food', '🍣', 'Salmon fillet', 9],
  ['Food', '🥫', 'Can of tuna', 4],
  ['Food', '🥕', 'Daikon radish', 3],
  ['Food', '🥬', 'Cabbage', 3],
  ['Food', '🍊', 'Mikan orange', 2],
  ['Food', '🍎', 'Apple', 2],
  ['Food', '🍓', 'Punnet of strawberries', 6],
  ['Food', '🍠', 'Sweet potato', 3],
  ['Food', '🧃', 'Ramune soda', 3],
  ['Food', '🍵', 'Matcha powder', 10],
  // Kitchen
  ['Kitchen', '🍚', 'Rice cooker', 60],
  ['Kitchen', '🥢', 'Chopsticks', 3],
  ['Kitchen', '🍚', 'Rice bowl', 6],
  ['Kitchen', '🥣', 'Soup bowl', 6],
  ['Kitchen', '🫖', 'Teapot', 18],
  ['Kitchen', '🍵', 'Teacup', 5],
  ['Kitchen', '♨️', 'Kettle', 20],
  ['Kitchen', '🍳', 'Frying pan', 22],
  ['Kitchen', '🍳', 'Square omelette pan', 24],
  ['Kitchen', '🥘', 'Saucepan', 20],
  ['Kitchen', '🔪', 'Kitchen knife', 28],
  ['Kitchen', '🪵', 'Cutting board', 12],
  ['Kitchen', '🥄', 'Rice paddle', 3],
  ['Kitchen', '🥄', 'Ladle', 5],
  ['Kitchen', '🌀', 'Balloon whisk', 6],
  ['Kitchen', '🧀', 'Radish grater', 7],
  ['Kitchen', '🍣', 'Sushi rolling mat', 5],
  ['Kitchen', '🕸️', 'Noodle strainer', 8],
  ['Kitchen', '🍱', 'Bento box', 12],
  ['Kitchen', '🥢', 'Cooking tongs', 5],
  ['Kitchen', '🧪', 'Measuring cup', 4],
  ['Kitchen', '🍞', 'Toaster', 40],
  ['Kitchen', '🧴', 'Thermos flask', 16],
  ['Kitchen', '🦺', 'Apron', 10],
  ['Kitchen', '🧽', 'Dish sponge', 1],
  ['Kitchen', '🧼', 'Dish soap', 3],
  ['Kitchen', '🍵', 'Bamboo tea whisk', 9],
  // Books & study
  ['Books & study', '📕', 'Picture book', 8],
  ['Books & study', '📚', 'Comic book', 6],
  ['Books & study', '📗', 'Cookbook', 14],
  ['Books & study', '📘', 'Novel', 9],
  ['Books & study', '📖', 'Dictionary', 20],
  ['Books & study', '📓', 'Notebook', 3],
  ['Books & study', '✏️', 'Pencil', 1],
  ['Books & study', '🧽', 'Eraser', 1],
  ['Books & study', '🖌️', 'Brush pen', 4],
  ['Books & study', '🖋️', 'Calligraphy set', 18],
  ['Books & study', '📐', 'Ruler', 2],
  ['Books & study', '✂️', 'Scissors', 4],
  ['Books & study', '🖍️', 'Box of crayons', 5],
  ['Books & study', '📔', 'Diary', 7],
  ['Books & study', '🎒', 'School bag', 45],
  // Home
  ['Home', '🟪', 'Floor cushion', 15],
  ['Home', '🛏️', 'Futon', 50],
  ['Home', '🛌', 'Pillow', 12],
  ['Home', '🧣', 'Blanket', 18],
  ['Home', '🏮', 'Paper lantern', 9],
  ['Home', '🎐', 'Wind chime', 10],
  ['Home', '🎎', 'Daruma doll', 12],
  ['Home', '🐱', 'Lucky cat', 16],
  ['Home', '🏺', 'Flower vase', 14],
  ['Home', '🌳', 'Bonsai tree', 30],
  ['Home', '🥿', 'House slippers', 6],
  ['Home', '☂️', 'Umbrella', 11],
  ['Home', '🧹', 'Broom', 8],
  ['Home', '⏰', 'Alarm clock', 20],
  ['Home', '🪞', 'Wall mirror', 14],
  ['Home', '🧻', 'Tissue box', 2],
  ['Home', '🧼', 'Bar of soap', 2],
  ['Home', '🪥', 'Toothbrush', 2],
  ['Home', '🛁', 'Bath towel', 4],
  ['Home', '🔦', 'Torch', 8],
  ['Home', '📻', 'Radio', 35],
  ['Home', '🖼️', 'Photo frame', 7],
  // Play & wear
  ['Play & wear', '🪁', 'Kite', 8],
  ['Play & wear', '🪀', 'Kendama', 6],
  ['Play & wear', '🟥', 'Origami paper', 3],
  ['Play & wear', '🪭', 'Folding fan', 9],
];

function toId(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, '-');
}

export const CATALOGUE: readonly ShopItem[] = ROWS.map(([category, icon, name, price]) => ({
  id: toId(name),
  name,
  category,
  icon,
  price,
}));

export function itemById(id: string): ShopItem | undefined {
  return CATALOGUE.find((item) => item.id === id);
}
