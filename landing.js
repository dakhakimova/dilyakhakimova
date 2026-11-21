/* Лендинги курсов: словарь. Русский текст уже стоит в HTML (его вписывает tools/bake-i18n.js),
   поэтому для ru ничего не подменяем; на другом языке подставляем строки словаря (как home.js на главной). */
(function () {
'use strict';
const LANG = (document.documentElement.lang || 'ru').slice(0, 2);
if (LANG === 'ru' || !window.I18N) return;
const DICT = I18N[LANG] || {}, RU = I18N.ru || {};
const NF = new Intl.NumberFormat(LANG), PF = new Intl.NumberFormat(LANG, { style: 'percent', maximumFractionDigits: 0 });
const raw = key => key in DICT ? DICT[key] : (key in RU ? RU[key] : key);
const t = key => I18N.typo(LANG, String(raw(key)).replace(/\{(num|pct):([\d.]+)\}/g, (_, k, v) => k === 'num' ? NF.format(+v) : PF.format(+v)));
document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
document.querySelectorAll('[data-i18n-attr]').forEach(el => el.dataset.i18nAttr.split(';').forEach(pair => {
  const [attr, key] = pair.split(':'); el.setAttribute(attr.trim(), t(key.trim()).replace(/<[^>]+>/g, ''));
}));
})();
