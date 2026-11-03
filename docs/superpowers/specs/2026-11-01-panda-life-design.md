# Panda Life: game design

## What this is

A gentle single-player browser game for a 9-year-old. You play Sushi, a rainbow-dressed kawaii panda, in an isometric village of animal friends. Friends phone Sushi with missions, Sushi collects bamboo sticks, and coins add up.

There is no timer on a mission, no losing and no penalty. Success looks like a kid wandering the village, answering calls and watching the coin total grow.

## Decided by the user

- Browser game, single player, full screen, TypeScript and Phaser.
- Isometric, kawaii, colourful. Rainbow Sushi and the River Hamlet village (see `mockups/village-prototype.html`).
- The village is wide and open, with houses in proportion to the characters and doors big enough to enter later.
- Characters face the way they walk, with legs that step on the ground.
- Characters cannot walk through houses, trees, each other or water.
- The map can be rotated.
- Friends walk around, and look right doing it: they turn and step the same way Sushi does.
- Friends, each with their own house: Maguro (cat), Inari (fox), Unagi (beaver), Tamago (rabbit), Ikura (deer), Ebi (dog).
- Sushi can go inside any house just by walking through the front door. Inside is one room with a carpet, a bench, a table, chairs, a small kitchen, plants, a bookshelf with random books, and kawaii Japanese decorations.
- Homes look like Japanese akiya, outside and in: old country houses, taken as cosy and kawaii rather than run down.
- Relaxing background music, Japanese-themed and kawaii, like Stardew Valley: atmospheric, with no voices. It changes each time Sushi enters a different home.
- There is no mini map. Coins and the Inbox, Knapsack and Friends buttons sit in one line along the top, shrinking to pictures on mobile.
- A button changes the music.
- Music is off by default, until the player turns it on.
- Every character, Sushi included, carries a knapsack on their back that can hold an inventory of items. All are empty for now, and the knapsack is drawn so it doesn't get in the way.
- A special building, the village shop, where coins buy and sell the objects in a knapsack. It stocks 100 everyday objects from a Japanese home, mostly casual things like books, cooking tools and food, each priced in whole coins.
- Friends run on simple rules: they give each other bamboo missions, fulfil them for coins, and spend the coins at the shop.
- On mobile the bottom buttons collapse into a hamburger menu. Desktop always keeps them, however small the window.
- Friends call Sushi. An answered call explains the mission, which Sushi can accept.
- A call that is ignored or refused goes to an inbox, where it can be accepted or refused later.
- Only one mission at a time.
- The only mission type is collecting a set number of bamboo sticks from the bamboo trees around the village.
- Each mission has its own coin reward, paid the moment the last stick is collected, with no walk back.
- Coins only add up for now.

## Not in this version

Spending coins and other things to collect are later work. The code should not get in their way, but nothing is built for them now.

## Builder's calls

- A call rings once, for 3 seconds, as a small button with the friend's face on the top bar. Tapping it (or Enter) answers; otherwise it goes to the inbox with a short notification.
- An answered call shows the friend's ask, with Accept or Not now.
- Refusing from the inbox removes the mission for good.
- A friend calling while Sushi is busy goes straight to the inbox, with a small notification.
- The inbox holds 6 missions. Friends stop calling while it is full, so it can't pile up.
- Missions ask for 3 to 8 sticks and pay 2 coins per stick.
- Sushi picks a stick by walking next to a bamboo tree during a mission. Trees with a stick show a bobbing marker, and refill after 30 seconds.
- Clicking or tapping finds a route, so Sushi walks round the river to the bridge.
- Coins, inbox and the current mission are saved in the browser. A call in progress is saved into the inbox.
- Sushi lives in the green house at the top left.
- Every house has the same room layout, in that house's colours, and is roomier inside than it looks from outside so everything fits.
- Sushi walks out through a door in the room's back wall, so the door stays in view. The map doesn't turn indoors.
- Pushing against a front door or tapping a house walks in. Walking past a door doesn't.
- Calls still arrive indoors, and friends stay outside for now.
- Friends wander near their own house, pause often, and wait politely if someone is in the way.
- The village and each of the 7 homes have their own tune, composed live in the browser in a Japanese five-note scale, so the game ships no audio files and the melody varies each time round. Tunes crossfade at a door, and the village tune returns outside.
- Next tune goes round all 8 tunes and shows the tune's name, turning the music on if it was off. Walking through a door still picks that place's tune.
- From the front only thin straps show; the pack shows from the back and sides, with its flap in the colour of the character's dress.
- A Knapsack button (K) opens Sushi's knapsack, 12 slots. Friends' knapsacks are saved too but have no screen yet. Mission sticks are counted on the mission and don't go in the knapsack.
- The shop is run by Wasabi, a tanuki who stays behind the counter. Walking up to the counter opens the shop, and there's a Shop button (B) indoors.
- The shop pays half what it charges, rounded down, and at least 1 coin, so buying and selling can't make coins.
- The knapsack holds 12 different objects, and the same object stacks in one slot.
- For now only Sushi trades, as friends have no coins of their own, though the rules work for any character's knapsack.
- Friends hold their calls while the shop, inbox or knapsack screen is open, so a call never interrupts a purchase. A call already ringing still moves on to the inbox, and screens can be opened while it rings.
- The game opens on a start screen: Continue or New game, or straight to choosing an animal if nothing is saved. A new game replaces the saved one, and there's a Back button.
- A new game starts by choosing Sushi's animal from all 8: panda, tanuki, cat, fox, beaver, rabbit, deer or dog. Sushi keeps the name. Whoever was that animal (a friend, or Wasabi for the tanuki) becomes the panda instead, keeping their name and house, so nobody has a twin.
- A new game opens with a short how-to-play tutorial; continuing doesn't. Skip or Esc closes it, and no call rings until it is closed.
- Every pair among Sushi and the 6 friends has a friendship meter, 0 to 100, shown as 5 hearts with a thin bar under them. It only goes up. Wasabi just runs the shop and has none.
- Each of them has 5 favourite objects from the shop. Any present adds 5, a favourite adds 20. Favourites start as question marks and are revealed the first time anyone gives one.
- Tapping a friend walks Sushi up to them and opens a list of Sushi's knapsack to give from. The Friends screen shows each friend's hearts with Sushi, their favourites found so far and their best friend; the knapsack shows Sushi's own.
- A free friend with something to spare may walk over to someone a short walk away (Sushi included, when outside) and hand it over, preferring something that person loves and keeping their own favourites. Some shopping trips are for a present for someone else.
- Each friend has their own coins, starting at 10. A free friend who has saved 12 coins goes to the shop; otherwise they may phone another free friend with a job of 3 to 6 sticks at 2 coins a stick.
- A friend's job pays the way Sushi's missions do, as a reward from the game and not from the asker's coins, so the village can't run out of money.
- At the shop a friend buys one thing they can afford, usually to their taste, and sells their cheapest object first if the knapsack is full.
- Friends pick from the same bamboo trees as Sushi. Going into the shop hides them for a few seconds; they don't appear inside it yet.
- Bubbles show what a friend is busy with, and the Friends screen (V) shows everyone's coins, knapsack and the village news. Friends carry on while Sushi is indoors.
- Copy is English. Sounds are generated in the browser. Sound effects and music each have their own on/off button.
- The on-screen layer (calls, inbox, coins, buttons) is HTML over the Phaser canvas, so text is sharp and big buttons work with touch.

## Shape of the code

- `src/game`: mission rules and saving, with no Phaser in them.
- `src/world`: projection, village layout, collision, route finding and what the friends get up to, with no Phaser in them.
- `src/art`: all drawing, as canvases and SVG.
- `src/scene`: the Phaser scene, which puts the above on screen.
- `src/ui`: the HTML layer.
- `src/audio.ts`: generated sound effects.
- `src/music`: the composer, with no audio in it, and the player that performs it.
