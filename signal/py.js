/* Ячейки с Python в браузере для глав «Сигнал или шум» и «Вероятность на пальцах».
   Python (Pyodide) загружается при первом запуске ячейки. Все ячейки страницы делят одно пространство имён,
   как в Jupyter. Разметка ячейки:
   <div class="cell" data-title="..." [data-check="id-скрипта-с-проверкой"]>
     <textarea spellcheck="false">код</textarea>
   </div>
   Проверка — <script type="text/x-python" id="..."> с функцией, которая печатает OK/FAIL.
   «Не получается?» (решение Дили, 23.11.2026): внутри ячейки <template data-hint>текст</template> (сколько угодно, по одной за нажатие)
   и <template data-solution>код</template> — после подсказок кнопка «Показать решение», из него — «Вставить в ячейку». */
(function(){
  const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  let pyReady = null;

  function loadPy(status){
    if (pyReady) return pyReady;
    pyReady = new Promise((resolve, reject) => {
      status('Загружаю Python в браузер — это 5–15 секунд, только в первый раз…', 'info');
      const s = document.createElement('script');
      s.src = PYODIDE + 'pyodide.js';
      s.onload = async () => {
        try {
          const py = await loadPyodide({indexURL: PYODIDE});
          // numpy есть всегда; ещё пакеты Pyodide — атрибутом data-packages="scipy" у любой ячейки страницы (грузятся долго, лучше без них)
          const extra = [...document.querySelectorAll('.cell[data-packages]')].flatMap(c => c.dataset.packages.split(/[\s,]+/)).filter(Boolean);
          await py.loadPackage([...new Set(['numpy', ...extra])]);
          resolve(py);
        } catch (e) { reject(e); }
      };
      s.onerror = () => reject(new Error('Не удалось загрузить Python. Проверьте интернет и обновите страницу.'));
      document.head.appendChild(s);
    });
    return pyReady;
  }

  function esc(t){ return t.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  // ---------- подсветка Python (решение Дили, 23.11.2026): ячейка — прозрачная textarea поверх подсвеченного <pre> ----------
  const KW = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'.split(' '));
  const BI = new Set('print range len sum abs float int str min max sorted list dict set tuple round enumerate zip map filter any all isinstance'.split(' '));
  function pyHL(code){
    const re = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|f?"(?:[^"\\\n]|\\.)*"|f?'(?:[^'\\\n]|\\.)*')|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\b[A-Za-z_]\w*\b)|(\.\.\.)/g;
    let out = '', last = 0, m, prevDef = false;
    while ((m = re.exec(code))){
      out += esc(code.slice(last, m.index)); last = re.lastIndex;
      const t = esc(m[0]);
      if (m[1]) out += '<span class="py-c">' + t + '</span>';
      else if (m[2]) out += '<span class="py-s">' + t + '</span>';
      else if (m[3]) out += '<span class="py-n">' + t + '</span>';
      else if (m[4]){
        if (prevDef){ out += '<span class="py-f">' + t + '</span>'; prevDef = false; continue; }
        if (KW.has(m[4])){ out += '<span class="py-k">' + t + '</span>'; prevDef = m[4] === 'def' || m[4] === 'class'; continue; }
        out += BI.has(m[4]) ? '<span class="py-b">' + t + '</span>' : t;
      }
      else if (m[5]) out += '<span class="py-e">' + t + '</span>';
    }
    return out + esc(code.slice(last)) + '\n';
  }
  window.pyHL = pyHL;


  // подсветка и кнопки ячеек — свои стили, чтобы ячейка выглядела одинаково на любой странице (книги, курсы)
  if (!document.getElementById('py-cell-css')){
    const st = document.createElement('style'); st.id = 'py-cell-css';
    st.textContent = '.cell .ed{position:relative; background:#1F2430} .cell .ed pre.hl{position:absolute; inset:0; margin:0; padding:14px 16px; background:transparent; color:#E6E9EF; font:400 .875rem/1.55 var(--mono); tab-size:4; white-space:pre; overflow:hidden; pointer-events:none; min-height:0} .cell .ed pre.hl code{display:block; font:inherit; white-space:pre} .cell .ed textarea{position:relative; background:transparent; color:transparent; caret-color:#E6E9EF; -webkit-text-fill-color:transparent} .cell .ed textarea::selection{background:rgba(120,160,255,.35)} .py-k{color:#C3A6FF} .py-s{color:#A6D98C} .py-c{color:#8D96A8; font-style:italic} .py-n{color:#F2C46B} .py-b{color:#7FD1C8} .py-f{color:#F0A17A} .py-e{color:#F2C46B} .cell-bar .copy.done{background:#2F6B4F}';
    document.head.append(st);
  }

  document.querySelectorAll('.cell').forEach((cell, idx) => {
    const ta = cell.querySelector('textarea');
    const original = ta.value;
    const storeKey = 'signal:' + location.pathname + ':' + idx;
    try { const saved = localStorage.getItem(storeKey); if (saved !== null) ta.value = saved; } catch(e) {}
    ta.rows = Math.max(5, ta.value.split('\n').length + 1);
    // подсветка: <pre class="hl"> под прозрачной textarea, прокрутка синхронна
    const ed = document.createElement('div'); ed.className = 'ed';
    const hlPre = document.createElement('pre'); hlPre.className = 'hl'; hlPre.setAttribute('aria-hidden', 'true');
    const hlCode = document.createElement('code'); hlPre.append(hlCode);
    ta.parentNode.insertBefore(ed, ta); ed.append(hlPre, ta);
    const paintHL = () => { hlCode.innerHTML = pyHL(ta.value); hlCode.style.transform = 'translate(' + (-ta.scrollLeft) + 'px,' + (-ta.scrollTop) + 'px)'; };
    ta.addEventListener('input', paintHL); ta.addEventListener('scroll', paintHL);
    const fitHL = () => { const cs = getComputedStyle(ta); hlPre.style.padding = cs.padding; hlPre.style.font = cs.font; };
    fitHL(); addEventListener('resize', fitHL);
    paintHL();

    const head = document.createElement('div');
    head.className = 'cell-head';
    head.innerHTML = '<span class="t">' + esc(cell.dataset.title || 'Python') + '</span>';
    cell.prepend(head);

    const bar = document.createElement('div');
    bar.className = 'cell-bar';
    const run = Object.assign(document.createElement('button'), {className:'run', type:'button', textContent:'▶ Запустить'});
    const reset = Object.assign(document.createElement('button'), {type:'button', textContent:'↺ Вернуть исходный код'});
    bar.append(run);
    let check = null, attempts = 0;
    if (cell.dataset.check){
      check = Object.assign(document.createElement('button'), {className:'check', type:'button', textContent:'✓ Проверить'});
      bar.append(check);
    }
    bar.append(reset);
    // «Скопировать» — унести код к себе
    const copy = Object.assign(document.createElement('button'), {className:'copy', type:'button', textContent:'⧉ Скопировать'});
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(ta.value); }
      catch(e) { ta.focus(); ta.select(); document.execCommand('copy'); }
      copy.textContent = '✓ Скопировано'; copy.classList.add('done');
      setTimeout(() => { copy.textContent = '⧉ Скопировать'; copy.classList.remove('done'); }, 1800);
    });
    bar.append(copy);
    run.title = 'Ctrl/⌘ + Enter';   // подсказка про клавиши — только во всплывающей подсказке (решение Дили, 23.11.2026)
    const out = document.createElement('pre');
    cell.append(bar, out);

    // «Не получается?» — подсказки по одной, потом решение
    const hints = [...cell.querySelectorAll('template[data-hint]')].map(t => t.innerHTML.trim());
    const solT = cell.querySelector('template[data-solution]'), sol = solT ? solT.innerHTML.replace(/^\n/, '').replace(/\s+$/, '') : null;
    if (hints.length || sol){
      const help = document.createElement('div'); help.className = 'cell-help';
      const list = document.createElement('ol'); list.className = 'cell-hints';
      const btn = Object.assign(document.createElement('button'), {type:'button', className:'cell-more'});
      const solBox = document.createElement('div'); solBox.className = 'cell-sol'; solBox.hidden = true;
      let shown = 0;
      const label = () => { btn.textContent = shown < hints.length ? (shown ? 'Ещё подсказка' : 'Не получается? Подсказка') : 'Показать решение'; btn.hidden = shown > hints.length || (shown === hints.length && !sol); };
      btn.addEventListener('click', () => {
        if (shown < hints.length){ const li = document.createElement('li'); li.innerHTML = hints[shown]; li.querySelectorAll('pre').forEach(x => { x.innerHTML = pyHL(x.textContent); }); list.append(li); }
        else if (sol){
          solBox.hidden = false;
          { const t = document.createElement('textarea'); t.innerHTML = sol; solBox.innerHTML = '<pre class="cell-sol-code">' + pyHL(t.value) + '</pre>'; }
          const put = Object.assign(document.createElement('button'), {type:'button', className:'cell-more', textContent:'Вставить решение в ячейку'});
          put.addEventListener('click', () => { const t = document.createElement('textarea'); t.innerHTML = sol; ta.value = t.value; paintHL(); ta.rows = Math.max(5, ta.value.split('\n').length + 1); try { localStorage.setItem(storeKey, ta.value); } catch(e) {} ta.focus(); });
          solBox.append(put);
        }
        shown++; label();
      });
      label(); help.append(list, btn, solBox); cell.after(help);
    }

    const status = (msg, cls) => { out.innerHTML = '<span class="' + cls + '">' + esc(msg) + '</span>'; };

    async function exec(withCheck){
      run.disabled = true; if (check) check.disabled = true;
      let buf = '';
      try {
        const py = await loadPy(status);
        out.textContent = '';
        py.setStdout({batched: s => { buf += s + '\n'; }});
        py.setStderr({batched: s => { buf += s + '\n'; }});
        await py.runPythonAsync(ta.value);
        let html = esc(buf);
        if (withCheck){
          attempts++;
          const src = document.getElementById(cell.dataset.check).textContent;
          let cbuf = '';
          py.setStdout({batched: s => { cbuf += s + '\n'; }});
          await py.runPythonAsync(src);
          html += cbuf.split('\n').filter(Boolean).map(l =>
            l.startsWith('OK') ? '<span class="ok">✓ ' + esc(l.slice(3)) + '</span>' :
            l.startsWith('FAIL') ? '<span class="err">✗ ' + esc(l.slice(5)) + '</span>' : esc(l)).join('\n');
          if (/^OK/m.test(cbuf) && !/^FAIL/m.test(cbuf) && window.SignalProgress)
            SignalProgress.track(document.body.dataset.chapter || '', 'code', cell.dataset.check.replace(/^check-/, ''), attempts);
        }
        out.innerHTML = html || '<span class="info">Готово (код ничего не напечатал)</span>';
      } catch (e) {
        const msg = String(e && e.message || e);
        const last = msg.trim().split('\n').slice(-1)[0];
        out.innerHTML = esc(buf) + '<span class="err">' + esc(last) + '</span>';
      } finally {
        run.disabled = false; if (check) check.disabled = false;
      }
    }

    run.addEventListener('click', () => exec(false));
    if (check) check.addEventListener('click', () => exec(true));
    reset.addEventListener('click', () => { ta.value = original; paintHL(); try { localStorage.removeItem(storeKey); } catch(e) {} out.textContent = ''; });
    ta.addEventListener('input', () => { try { localStorage.setItem(storeKey, ta.value); } catch(e) {} });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Tab'){
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.setRangeText('    ', s, en, 'end');
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)){
        e.preventDefault(); exec(!!check);
      }
    });
  });
})();
