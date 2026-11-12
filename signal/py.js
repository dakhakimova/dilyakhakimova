/* Ячейки с Python в браузере для глав «Сигнал или шум».
   Python (Pyodide) загружается при первом запуске ячейки. Все ячейки страницы делят одно пространство имён,
   как в Jupyter. Разметка ячейки:
   <div class="cell" data-title="..." [data-check="id-скрипта-с-проверкой"]>
     <textarea spellcheck="false">код</textarea>
   </div>
   Проверка — <script type="text/x-python" id="..."> с функцией, которая печатает OK/FAIL. */
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
          await py.loadPackage(['numpy']);
          resolve(py);
        } catch (e) { reject(e); }
      };
      s.onerror = () => reject(new Error('Не удалось загрузить Python. Проверьте интернет и обновите страницу.'));
      document.head.appendChild(s);
    });
    return pyReady;
  }

  function esc(t){ return t.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  document.querySelectorAll('.cell').forEach((cell, idx) => {
    const ta = cell.querySelector('textarea');
    const original = ta.value;
    const storeKey = 'signal:' + location.pathname + ':' + idx;
    try { const saved = localStorage.getItem(storeKey); if (saved !== null) ta.value = saved; } catch(e) {}
    ta.rows = Math.max(5, ta.value.split('\n').length + 1);

    const head = document.createElement('div');
    head.className = 'cell-head';
    head.innerHTML = '<span class="t">' + esc(cell.dataset.title || 'Python') + '</span><span>можно править</span>';
    cell.prepend(head);

    const bar = document.createElement('div');
    bar.className = 'cell-bar';
    const run = Object.assign(document.createElement('button'), {className:'run', type:'button', textContent:'▶ Запустить'});
    const reset = Object.assign(document.createElement('button'), {type:'button', textContent:'↺ Вернуть исходный код'});
    bar.append(run);
    let check = null;
    if (cell.dataset.check){
      check = Object.assign(document.createElement('button'), {className:'check', type:'button', textContent:'✓ Проверить'});
      bar.append(check);
    }
    bar.append(reset);
    const hint = Object.assign(document.createElement('span'), {className:'hint', textContent:'Ctrl/⌘ + Enter — запустить'});
    bar.append(hint);
    const out = document.createElement('pre');
    cell.append(bar, out);

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
          const src = document.getElementById(cell.dataset.check).textContent;
          let cbuf = '';
          py.setStdout({batched: s => { cbuf += s + '\n'; }});
          await py.runPythonAsync(src);
          html += cbuf.split('\n').filter(Boolean).map(l =>
            l.startsWith('OK') ? '<span class="ok">✓ ' + esc(l.slice(3)) + '</span>' :
            l.startsWith('FAIL') ? '<span class="err">✗ ' + esc(l.slice(5)) + '</span>' : esc(l)).join('\n');
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
    reset.addEventListener('click', () => { ta.value = original; try { localStorage.removeItem(storeKey); } catch(e) {} out.textContent = ''; });
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
