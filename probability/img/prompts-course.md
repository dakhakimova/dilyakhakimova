# Картинки для курса «Вероятность на пальцах»

Сквозной сюжет: Алиса, Боб и Котейка открывают кафе. Все сцены происходят в этом кафе (кроме собеседования).

Как давать задание чату:
1. Приложить лист персонажей (Алиса, Боб, Котейка) как опору. Когда появится `p00-cafe`, прикладывать и её — как опору для интерьера.
2. Вставить общий блок стиля, блок «Кафе» (где он указан) и сцену одной картинки. Одна картинка за запрос.
3. Сохранить в папку `probability/img` под именем из заголовка (`p01-dishes.png` и т. д.). Формат 16:9, ширина от 1600 px.

**Порядок:** сначала «Срочно», остальное — по мере сборки шагов.

## Общий блок стиля (в начало каждого промпта)

Use case: illustration-story. Illustration for a free interactive online course about probability.
Image 1: established character design and rendering style reference only. Keep the established exact appearance, clothes and colors of Alice, Bob and Kotejka whenever present. Match the cat's blue eyes and orange, blue, navy and white markings, orange scarf and burlap sack. Do not add characters from the reference unless the scene calls for them.
Flat vector storybook illustration, clean outlines, soft shading, calm warm palette (deep blue #23418A, coral #E8644A, soft green, cream), plain light background, 16:9, no text, no letters, no numbers unless stated, no logos, no watermark. Clear uncluttered composition, natural anatomy.
Coins in all scenes: SILVER Russian five-ruble coins, HEADS shows a recognizable double-headed eagle, TAILS shows a large clear numeral 5 with a small botanical scroll beside it. No flower emblem. No other text on coins. Cartoon rendering, not photorealism.

## Блок «Кафе» (добавлять во все сцены с пометкой [Кафе])

Setting: the heroes' own small cozy café. Cream walls, a wooden counter with a coffee machine, a chalkboard menu with simple drawings instead of words, a few round tables, potted plants, big front window. A garland of warm light bulbs hangs above the counter. Keep the same interior in every scene.

## Статус

Все картинки нарисованы (13.11.2026) и лежат в этой папке в формате JPEG 1600 px. Финальные правки — в `final-corrections.md` на компьютере Дили.

## Что уже есть

| Файл | Судьба |
|---|---|
| ch01-00-heroes | оставляем: знакомство с героями |
| ch01-04-thousand | оставляем: «представь 1000 повторов» (шаг 2) |
| ch01-05-dice | оставляем: собеседование про кубики |
| ch01-07-next | оставляем: дверь в следующий шаг |
| ch01-03-lamps | перерисовать в кафе → `p04-lamps` |
| ch01-01-bob-question, ch01-02-shop, ch01-06-trap | заменяются на сцены в кафе → `p02-orders`, `p02-days`, `p04-trap` |
| ch01-08-defs | ещё не нарисована; правая панель теперь про гостя кафе |

---

## Срочно

### p00-cafe — открытие кафе (обложка курса и опора для интерьера) [Кафе]
Opening day. Alice and Bob stand proudly behind the counter in aprons, Alice holding a tray with two cups, Bob hanging a festive ribbon across the front window. Kotejka sits in its burlap sack on the counter next to the coffee machine, juggling a coin and a six-sided die. Warm morning light through the window. Generous empty space at the top for a title added later. Welcoming, calm, joyful.

### p01-dishes — шаг 1, кто моет посуду [Кафе]
Evening after closing. A tall stack of dirty cups and plates waits by the sink. Bob, grinning, holds up two coins between his fingers, proposing to decide by tossing them. Alice, arms crossed, looks skeptical. Kotejka peeks out of its sack on the counter, eyes on the coins. Cozy evening light, the garland glowing.

### p01-two-coins — шаг 1, четыре исхода [Кафе]
Alice and Kotejka each toss one coin at the same moment above a café table; both coins are in mid-air. On the table, four equal paper napkins are laid out in a row, each with a pair of coins on it: heads+heads, heads+tails, tails+heads, tails+tails. The two middle napkins glow softly in coral. Bob leans over the table, counting the napkins with his finger. Clear, orderly, the four napkins easy to read.

### p01-dalembert — шаг 1, ловушка «три варианта — значит по трети» [Кафе]
Bob proudly sets three identical glass tip jars on the counter, under each jar a small picture card: no eagles, one eagle, two eagles. He is dropping coins evenly into all three jars. Alice gently stops his hand and shows him a sketch in her notebook where the middle option has two paths leading to it, the side options only one. Kotejka sits in its sack next to the middle jar, pointing at it with a paw. Light-hearted, slightly comic.

### ch01-08-defs — исходы, событие, случайная величина
Three equal side-by-side panels on a plain cream background, separated by thin hand-drawn lines. Left panel: Kotejka flips a coin high in the air; next to it a small thought bubble showing the two sides of a coin and a second bubble with the one side that just landed. Middle panel: Alice rolls a large six-sided die on a café table; one bubble shows the six possible die faces in a row, another shows a single face that just came up. Right panel: a guest walks into the café; one bubble shows two options, a coffee cup and an empty hand, another shows the one that actually happened (the guest holding a coffee cup). The three panels are visually parallel so they read as "possible outcomes, and one actual outcome" in three places. No text, no numbers.

---

## Шаг 2. Вероятность как частота

### p02-orders — сколько гостей что-то заказывает [Кафе]
A line of guests at the counter. Some of them already hold a coffee cup, others just look at the menu and leave. Bob, at the register, confidently points at a small hand-drawn pie chart on a sticky note with a thin coral slice. Alice beside him tallies guests in her notebook. Kotejka sits in its sack on the counter, counting guests on its paw with a puzzled face.

### p02-days — день на день не приходится [Кафе]
Three side-by-side panels showing the same café on three different days, the same number of guests each time. On the first day almost nobody holds a cup, on the second many do, on the third a few. Above each panel a small tally board with a different number of tick marks (no digits). Alice compares the boards with a calm smile; Bob scratches his head.

### p02-long-run — доля успокаивается [Кафе]
After hours. Kotejka sits on a small hill of coins on a table, still flipping more into the air. Next to it, Alice draws on the chalkboard a wavy line that starts with wild zigzags and gradually calms down into an almost flat line in the middle of the board. Bob watches with surprise. No numbers, no axis labels.

## Шаг 3. Считаем исходы

### p03-menu — правило умножения [Кафе]
Alice and Bob design the menu at a table: on the left three different drinks, on the right four different desserts. Bob stares in indecision at all the possible pairings; above his head a thought bubble shows a small neat grid of drink-and-dessert pairs. Alice smiles knowingly. Kotejka in its sack sits on the table tasting a pastry.

### p03-tree — дерево исходов [Кафе]
A whimsical drawing on the big chalkboard wall: a tree whose trunk splits into two branches, each branch splits into two again, and again — four levels, with small coins at the tips like fruit. Alice stands on a step ladder with chalk, counting the tips. Kotejka sits on top of the chalkboard frame. Symmetric, tidy, easy to see the doubling at every level.

## Шаг 4. Не, и, или

### p04-lamps — гирлянда: хотя бы одна перегорит [Кафе]
Opening party in the evening. A long garland of many identical warm light bulbs hangs above the counter, almost all glowing; one or two in the middle are dark. Bob, on a small ladder, holds one spare bulb and looks surprised at the dark ones. Alice below holds up a magnifying glass toward a dark bulb. Kotejka, in its sack on a shelf, is tangled in the end of the garland with a sheepish expression.

### p04-birthdays — вечеринка дней рождения [Кафе]
The opening party in full swing: about twenty-five guests with drinks. Two guests on opposite sides of the room both hold small birthday cupcakes with one candle and point at each other in happy surprise. Alice raises a glass, Bob looks amazed. Kotejka wears a tiny party hat on top of its sack.

### p04-overlap — пересечение, ловушка сложения [Кафе]
Two large hula-hoops lie on the café floor and overlap. Guests holding a coffee cup stand inside the left hoop, guests holding a slice of cake inside the right hoop, and a few guests holding both stand in the overlap. Bob counts the people in the overlap twice, pointing at them with both hands. Alice raises an eyebrow. Kotejka sits in its sack in the middle of the overlap.

### p04-trap — ловушка [Кафе]
Bob triumphantly holds up a hand-drawn sign with exactly one coffee cup on it, standing in front of a small group of guests who just walked in. Behind him, unnoticed, none of the guests holds a cup. Alice gently taps his shoulder and points at the empty-handed group. Kotejka covers its eyes with its paws in mock embarrassment.

## Шаг 5. Условная вероятность и независимость

### p05-rain — «сужаем мир» [Кафе]
A rainy day outside the big window. Guests are split into two groups by a line of tape on the floor: on one side, guests with wet umbrellas, on the other, guests in sunglasses (they came earlier, when it was sunny). Many of the umbrella guests hold mugs of hot chocolate. Alice holds up a large empty picture frame, framing only the umbrella guests. Kotejka sits in its sack at the end of the tape line.

## Шаг 6. Байес

### p06-banknotes — детектор фальшивых купюр [Кафе]
At the register, a small detector lamp glows coral over a banknote. Bob, alarmed, holds the banknote up to the light, convinced it is fake. Beside the register lies a tall neat stack of normal banknotes and only one or two suspicious ones. Alice calmly counts the stack in her notebook. Kotejka in its sack holds a tiny magnifying glass over a banknote.

### p06-monty — розыгрыш с тремя дверями [Кафе]
A party game in the café: three tall cardboard doors stand in a row. One door is slightly open, showing an empty space behind it. Bob stands in front of the left door, hand on it, hesitating. Alice whispers to him and points toward the other closed door. Kotejka in its sack sits on top of the middle door, holding a prize basket of pastries, with a sly smile. Playful party lighting, no text on doors.

## Шаг 7. Случайная величина и распределение

### p07-galton — доска Гальтона [Кафе]
Near the entrance stands a tall wooden board with rows of pegs in a triangle — a game for guests. Kotejka drops small balls from the top; the balls bounce and collect at the bottom in vertical bins, forming a smooth hump: tall in the middle, low at the edges. Alice watches the hump with delight, Bob holds a bucket of more balls.

## Шаг 8. Среднее и разброс

### p08-wheel — колесо призов [Кафе]
A colorful prize wheel by the counter, divided into sectors of different sizes: most sectors show a small cookie, one thin sector shows a big cake. Bob holds a fistful of tokens, about to pay for a spin. Alice beside him calmly calculates in her notebook, gently holding his arm. Kotejka spins the wheel from its sack. No numbers, no text.

### p08-next — переход к «Сигнал или шум» [Кафе]
Late evening, café closed. Alice sits at a table with an old radio, slowly turning the tuning knob; from the speaker a messy scribbly wave turns into a clean smooth wave. Bob leans in, listening. Kotejka in its sack sits on top of the radio, ears perked up. Soft lamp light, a sense of "next chapter".

## Шаг 9. Пробное собеседование

### p09-interview — финальное собеседование
A bright interview room (not the café). Alice sits confidently at the table as the candidate, a sheet of paper with small sketches of coins, a die and a tree diagram in front of her (no readable text). Across the table, Kotejka in its sack plays the interviewer, wearing tiny round glasses and holding a stopwatch. Bob gives Alice an encouraging thumbs up through the glass door. Calm, confident, "you are ready" mood.
