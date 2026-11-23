/* /play/sample-size/ — режим «После теста: пост-MDE». По настоящим размерам групп и дисперсиям считает, какой самый маленький
   эффект тест мог заметить: MDE = (z(1 − α/2) + z(мощность)) · √(s²A/nA + s²B/nB). Для доли s² = p(1 − p), для среднего — введённое
   стандартное отклонение. Поля пустые, пример — бледные подсказки. */
(function(){
  const $ = id => document.getElementById(id);
  const pre = $('ss-pre'), post = $('ss-post'); if (!post) return;
  document.querySelectorAll('[data-when]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-when]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    pre.hidden = b.dataset.when !== 'pre'; post.hidden = b.dataset.when !== 'post'; const h = $('ss-pre-how'); if (h) h.hidden = b.dataset.when !== 'pre';
  }));
  let metric = 'share', sides = 'two';
  document.querySelectorAll('[data-psides]').forEach(b => b.addEventListener('click', () => { sides = b.dataset.psides; document.querySelectorAll('[data-psides]').forEach(x => x.setAttribute('aria-checked', String(x === b))); calc(); }));
  document.querySelectorAll('[data-metric]').forEach(b => b.addEventListener('click', () => {
    metric = b.dataset.metric;
    document.querySelectorAll('[data-metric]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    post.querySelectorAll('[data-m]').forEach(e => { e.hidden = e.dataset.m !== (metric === 'ratio' ? 'mean' : metric); });
    post.querySelector('.pm-grid').classList.toggle('mean', metric !== 'share'); const mh = post.querySelector('.pm-head [data-m="mean"]'); if (mh) mh.textContent = metric === 'ratio' ? 'Отношение' : 'Среднее'; calc();
  }));
  const cdf = x => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2); const q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - q : q; };
  const inv = p => { let lo = -8, hi = 8; for (let i = 0; i < 80; i++){ const m = (lo + hi) / 2; cdf(m) < p ? lo = m : hi = m; } return (lo + hi) / 2; };
  const num = v => { let s = String(v).trim().toLowerCase().replace(/[\s _]/g, '').replace(',', '.'); if (!s) return undefined; let m = 1; if (/(k|к|тыс)$/.test(s)){ m = 1e3; s = s.replace(/(k|к|тыс)$/, ''); } const x = parseFloat(s.replace('%', '')) * m; return Number.isFinite(x) ? x : null; };
  const share = v => { const s = String(v).trim(); const x = num(s); if (x == null) return x; return /%$/.test(s) || x >= 1 ? x / 100 : x; };
  const nf = (x, d = 0) => { const s = (+x).toFixed(d).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''); const [i, f] = s.split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (f ? '.' + f : ''); };
  const F = id => $(id), out = $('pm-out');
  function calc(){
    const na = num(F('pm-na').value), nb = num(F('pm-nb').value);
    const pw = share(F('pm-pow').value) ?? 0.8, al = num(F('pm-alpha').value) ?? 0.05;
    let sa2, sb2, base, unit = '';
    if (metric === 'share'){ const pa = share(F('pm-pa').value), pb = share(F('pm-pb').value); if ([na, nb, pa, pb].some(v => v == null)) return idle(); sa2 = pa * (1 - pa); sb2 = pb * (1 - pb); base = pa; }
    else { const ma = num(F('pm-ma').value), mb = num(F('pm-mb').value), sa = num(F('pm-sa').value), sb = num(F('pm-sb').value); if ([na, nb, ma, sa, sb].some(v => v == null)) return idle(); sa2 = sa * sa; sb2 = sb * sb; base = ma; }
    if (na < 2 || nb < 2 || !(pw > 0 && pw < 1) || !(al > 0 && al < 1)) return idle('Проверь числа: в группах нужно хотя бы по два человека, мощность и α — между 0 и 1.');
    const se = Math.sqrt(sa2 / na + sb2 / nb), k = inv(1 - (sides === 'two' ? al / 2 : al)) + inv(pw), mde = k * se, rel = base ? mde / base : NaN;
    out.className = 'ss-out srm-out good';
    const abs = metric === 'share' ? '+' + nf(mde * 100, 3) + ' п. п.' : '+' + nf(mde, mde < 10 ? 2 : mde < 100 ? 1 : 0);
    $('pm-big').innerHTML = 'Тест мог заметить эффект от <b>' + (Number.isFinite(rel) ? nf(rel * 100, 1) + '%' : abs) + '</b> относительных';
    $('pm-p').textContent = 'В абсолютных: ' + abs + (metric === 'share' ? '' : '.') + ' Множитель ' + nf(k, 2) + ' × стандартная ошибка ' + (metric === 'share' ? nf(se * 100, 3) + ' п. п.' : nf(se, 2)) + ', мощность ' + nf(pw * 100, 0) + '%, α = ' + al + '.\nЕсли важный для бизнеса эффект меньше, серый результат ничего не доказывает: тест такой эффект скорее всего пропустил бы.';
  }
  function idle(msg){ out.className = 'ss-out srm-out idle'; $('pm-big').textContent = msg || 'Впиши, сколько людей было в группах и что получилось.'; $('pm-p').textContent = metric === 'share' ? 'Для доли хватит размеров групп и самих долей.' : (metric === 'ratio' ? 'Для отношения нужны размеры групп, отношение в контроле и стандартные отклонения обеих групп — по дельта-методу.' : 'Для среднего нужны размеры групп, среднее контроля и стандартные отклонения обеих групп.'); }
  ['pm-na', 'pm-nb'].forEach(id => F(id).addEventListener('blur', () => { const v = num(F(id).value); if (v != null) F(id).value = nf(v); }));
  post.querySelectorAll('input').forEach(i => { i.addEventListener('input', calc); i.addEventListener('focus', () => setTimeout(() => i.select(), 0)); });
  calc();
})();
