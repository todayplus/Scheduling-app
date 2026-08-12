/**
 * mode 'select' : 드래그로 내 가능시간 선택
 * mode 'heat'   : 참가자 수 히트맵 (주최자 전용)
 */
function renderGrid(el, { dates, times, mode, selected, hint, counts, total, onChange }) {
  el.innerHTML = '';
  const g = document.createElement('div');
  g.className = 'grid';
  g.style.gridTemplateColumns = `64px repeat(${dates.length}, minmax(54px, 1fr))`;

  const cell = (cls, html) => { const c = document.createElement('div'); c.className = cls; c.innerHTML = html; return c; };

  g.appendChild(cell('hd corner',''));
  dates.forEach(d => g.appendChild(cell('hd', dateLabel(d))));

  times.forEach(m => {
    const th = cell('th', m % 60 === 0 ? hhmm(m) : '');
    if (m % 60 === 0) th.classList.add('hr');
    g.appendChild(th);
    dates.forEach(d => {
      const c = cell('cell',''); const k = key(d,m); c.dataset.key = k;
      if (m % 60 === 0) c.classList.add('hr');
            if (mode === 'select') {
        if (hint && hint.has(k)) c.classList.add('hint');
        if (selected.has(k)) c.classList.add('on');
      }
            else {
        const n = counts.get(k) || 0;
        if (n === 0) {
          c.style.background = '#f1f3f5';
        } else if (n === total && total >= 2) {
          c.style.background = '#37b24d';
          c.style.boxShadow = 'inset 0 0 0 1px #2f9e44';
        } else {
          c.style.background = `rgba(37,99,235,${0.15 + 0.6 * (n/total)})`;
        }
        c.title = `${hhmm(m)} · ${n}/${total}명` + (n === total && total >= 2 ? ' · 전원 가능' : '');
      }
      g.appendChild(c);
    });
  });

  el.appendChild(g);
  if (mode === 'select') attachDrag(g, selected, onChange);
}

function attachDrag(root, selected, onChange) {
  let dragging = false, addMode = true;
  const apply = c => {
    if (!c || !c.dataset.key) return;
    const k = c.dataset.key;
    if (addMode) { selected.add(k); c.classList.add('on'); }
    else { selected.delete(k); c.classList.remove('on'); }
  };
  root.addEventListener('pointerdown', e => {
    const c = e.target.closest('.cell'); if (!c) return;
    e.preventDefault();
    dragging = true;
    addMode = !selected.has(c.dataset.key);
    apply(c);
    root.setPointerCapture(e.pointerId);
  });
  root.addEventListener('pointermove', e => {
    if (!dragging) return;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    apply(t && t.closest ? t.closest('.cell') : null);
  });
  const stop = () => { if (dragging) { dragging = false; onChange && onChange(); } };
  root.addEventListener('pointerup', stop);
  root.addEventListener('pointercancel', stop);
}
