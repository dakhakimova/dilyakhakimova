/* Шаги act из play/toys-*.json для тестов и OG-картинок (tools/test-play.js, tools/og-play.js).
   Шаг — строка (CSS-селектор: нажать) или объект для холста, где нажимать надо в точку графика, а не в центр:
     {"sel": "#ch-fun", "color": "#23418A"}  — нажать в метку этого цвета на холсте (первая найденная сверху);
     {"sel": "#ch-fun", "at": [0.5, 0.3]}    — нажать в точку по долям ширины и высоты элемента.
   target — Page или Frame (Playwright). */
async function doAct(target, a){
  // кнопки, которые мост спрятал за «одной кнопкой» (play/ui.json), нажимаем из страницы — как это делает сам мост
  if (typeof a === 'string'){
    const el = await target.$(a);
    if (el && !(await el.isVisible())) return el.evaluate(e => e.click());
    return target.click(a);
  }
  const el = await target.$(a.sel);
  if (!el) throw new Error('act: нет элемента ' + a.sel);
  await el.scrollIntoViewIfNeeded();
  let pt = null;
  if (a.color){
    pt = await el.evaluate((cv, hex) => {
      const want = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
      const W = cv.width, H = cv.height, d = cv.getContext('2d').getImageData(0, 0, W, H).data, k = W / cv.clientWidth;
      const near = i => Math.hypot(d[i] - want[0], d[i + 1] - want[1], d[i + 2] - want[2]) < 60 && d[i + 3] > 200;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
        if (!near((y * W + x) * 4)) continue;
        // центр метки: среднее подходящих пикселей в радиусе 8 css-пикселей
        let sx = 0, sy = 0, n = 0; const R = Math.round(8 * k);
        for (let yy = y; yy < Math.min(H, y + 2 * R); yy++) for (let xx = Math.max(0, x - R); xx < Math.min(W, x + R); xx++) if (near((yy * W + xx) * 4)){ sx += xx; sy += yy; n++; }
        return {x: sx / n / k, y: sy / n / k};
      }
      return null;
    }, a.color);
    if (!pt) throw new Error(`act: на ${a.sel} нет метки цвета ${a.color}`);
  } else if (a.at){
    const bb = await el.boundingBox(); pt = {x: a.at[0] * bb.width, y: a.at[1] * bb.height};
  }
  return el.click(pt ? {position: pt} : {});
}
const actOk = a => typeof a === 'string' ? a.length > 0 : !!(a && typeof a.sel === 'string' && (a.color || Array.isArray(a.at) || Object.keys(a).length === 1));
module.exports = {doAct, actOk};
