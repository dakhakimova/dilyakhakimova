# Картинки для курса «Вероятность на пальцах»

Как давать задание чату:
1. Приложить лист персонажей (Алиса, Боб, Котейка) как опору.
2. Вставить общий блок стиля, а следом — сцену одной картинки. Одна картинка за запрос.
3. Сохранить под именем из заголовка (`p01-two-coins.png` и т. д.). Формат 16:9, ширина от 1600 px.

**Порядок:** сначала «Срочно» (шаг 1 и обложка), остальное — по мере сборки глав.

## Общий блок стиля (в начало каждого промпта)

Use case: illustration-story. Illustration for a free interactive online course about probability.
Image 1: established character design and rendering style reference only. Keep the established exact appearance, clothes and colors of Alice, Bob and Kotejka whenever present. Match the cat's blue eyes and orange, blue, navy and white markings, orange scarf and burlap sack. Do not add characters from the reference unless the scene calls for them.
Flat vector storybook illustration, clean outlines, soft shading, calm warm palette (deep blue #23418A, coral #E8644A, soft green, cream), plain light background, 16:9, no text, no letters, no numbers unless stated, no logos, no watermark. Clear uncluttered composition, natural anatomy.
Coins in all scenes: one side shows a simple eagle emblem (heads), the other side a simple flower pattern (tails).

## Уже есть — переиспользуем

| Файл | Куда идёт |
|---|---|
| ch01-00-heroes | шаг 1, знакомство |
| ch01-02-shop | шаг 2, магазин |
| ch01-04-thousand | шаг 2, «представь 1000 повторов» |
| ch01-01-bob-question | шаг 2, вопрос Боба |
| ch01-03-lamps | шаг 4, «хотя бы один» |
| ch01-06-trap | шаг 4, ловушка |
| ch01-05-dice | шаг 4, собеседование |
| ch01-07-next | конец шага 5 → дверь к Байесу |

---

## Срочно

### p00-cover — обложка курса
Kotejka sits in its burlap sack in the center, happily juggling a coin, a six-sided die and a small shopping bag in the air above its paws. Alice on the left counts on her fingers with a smile, Bob on the right holds a notebook and looks amazed. Soft cream background with a faint dotted texture, generous empty space at the top for a title added later. Warm, inviting, playful but calm.

### ch01-08-defs — исходы, событие, случайная величина
Three equal side-by-side panels on a plain cream background, separated by thin hand-drawn lines. Left panel: Kotejka flips a coin high in the air; next to it a small thought bubble showing the two sides of a coin and a second bubble with the one side that just landed. Middle panel: Alice rolls a large six-sided die on a table; one bubble shows the six possible die faces in a row, another shows a single face that just came up. Right panel: Bob looks at a laptop showing a single website visitor icon with a shopping bag; one bubble shows two options, a shopping bag and an empty hand, another shows the one that actually happened. The three panels are visually parallel so they read as "possible outcomes, and one actual outcome" in three places. No text, no numbers.

### p01-two-coins — шаг 1, две монетки
Alice and Kotejka each toss one coin at the same moment; both coins are in mid-air. Below, on a long wooden table, four equal framed tiles are laid out in a row, each showing a pair of coins: heads+heads, heads+tails, tails+heads, tails+tails. In the two middle tiles the coins show one eagle each, and these two tiles glow softly in coral. Bob leans over the table, counting the tiles with his finger. Clear, orderly, the four tiles easy to read.

### p01-dalembert — шаг 1, ловушка «три варианта — значит по трети»
Bob proudly sets three identical glass jars on a shelf, under each jar a small picture card: no eagles, one eagle, two eagles. He is dropping coins evenly into all three jars. Alice gently stops his hand and shows him a sketch in her notebook where the middle option has two paths leading to it, the side options only one. Kotejka sits in its sack next to the middle jar, pointing at it with a paw. Light-hearted, slightly comic.

---

## Шаг 2. Вероятность как частота

### p02-long-run — доля орлов успокаивается
Kotejka sits at the top of a small hill made of hundreds of tossed coins, still flipping more into the air. Next to the pile, Alice draws on a large easel a wavy line that starts with wild zigzags and gradually calms down into an almost flat line in the middle of the board. Bob watches the line with surprise. No numbers, no axis labels.

## Шаг 3. Считаем исходы

### p03-tree — дерево исходов
A whimsical tree whose trunk splits into two branches, each branch splits into two again, and again — four levels, with small coins hanging like fruit at the tips. Alice stands on a ladder counting the coin-fruits at the tips, ticking them in her notebook. Kotejka sits in its sack in the fork of the first branch. Symmetric, tidy, easy to see the doubling at every level.

### p03-menu — правило умножения
A cozy café counter with three different drinks on the left and four different desserts on the right. Bob, holding a tray, stares in indecision at all the possible pairings; above his head a thought bubble shows a small neat grid of drink-and-dessert pairs. Alice, the barista behind the counter, smiles knowingly. Kotejka in its sack sits on the counter tasting a pastry.

## Шаг 4. Не, и, или

### p04-overlap — пересечение, ловушка сложения
In a shop, two large hula-hoops lie on the floor and overlap. Customers with a coffee cup stand inside the left hoop, customers with a cake box inside the right hoop, and a few customers holding both stand in the overlap. Bob counts the people in the overlap twice, pointing at them with both hands. Alice raises an eyebrow. Kotejka sits in its sack exactly in the middle of the overlap.

## Шаг 5. Условная вероятность и независимость

### p05-table — таблица 2×2 в штуках
A big room whose floor is divided by colored tape into four equal squares. Shop visitors stand in the squares: on the left half people hold phones, on the right half people hold laptops; in the front row everyone carries a shopping bag, in the back row nobody does. Alice holds a large empty picture frame up to her eye, framing only the left half (the phone users), to look just at them. Kotejka sits in its sack at the corner of the tape grid.

## Шаг 6. Байес

### p06-test — тест с ложными срабатываниями
A large calm crowd of about a hundred tiny people, seen from above, standing in neat rows. A few of them (three or four) wear a small coral badge. A handheld scanner in Bob's hand beeps over the crowd: the coral-badge people light up, but several ordinary people light up too. Bob is alarmed, staring at the scanner. Alice calmly counts all the lit-up people in her notebook. Kotejka in its sack holds a tiny magnifying glass.

### p06-monty — Монти Холл
A game-show stage with three tall closed doors. Behind one door, slightly ajar, the host's assistant shows an empty room. Bob stands in front of the left door, hand on the knob, hesitating. Alice whispers to him and points toward the other closed door. Kotejka in its sack sits on top of the middle door frame, holding a treat bag, with a sly smile — nobody knows which door hides the prize. Playful stage lighting, no text on doors.

## Шаг 7. Случайная величина и распределение

### p07-galton — доска Гальтона
A tall wooden board with rows of pegs arranged in a triangle. Kotejka drops small balls from the top; the balls bounce left and right and collect at the bottom in vertical bins, forming a smooth hump: tall in the middle, low at the edges. Alice watches the hump forming with delight, Bob holds a bucket of more balls.

## Шаг 8. Среднее и разброс

### p08-game — стоит ли играть
A cheerful fair stall with a spinning prize wheel divided into sectors of different sizes, most sectors small prizes and one thin sector a big prize. Bob holds a fistful of tickets and is about to pay. Alice stands beside him, calmly calculating in her notebook, gently holding his arm. Kotejka runs the stall from its sack, spinning the wheel. No numbers, no text.

### p08-next — переход к «Сигнал или шум»
Alice sits at an old radio, slowly turning the tuning knob; from the speaker, a messy scribbly wave turns into a clean smooth wave. Bob leans in, listening. Kotejka in its sack sits on top of the radio, ears perked up. Soft evening light, calm, a sense of "next chapter".

## Шаг 9. Пробное собеседование

### p09-interview — финальное собеседование
A bright interview room. Alice sits confidently at the table as the candidate, a sheet of paper with small sketches of coins, a die and a tree diagram in front of her (no readable text). Across the table, Kotejka in its sack plays the interviewer, wearing tiny round glasses and holding a stopwatch. Bob gives Alice an encouraging thumbs up through the glass door. Calm, confident, "you are ready" mood.
