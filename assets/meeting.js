const $ = s => document.querySelector(s);
const token = new URLSearchParams(location.search).get('t');
const selected = new Set();
let M = null;

(async function load() {
  if (!token) return fail('잘못된 링크입니다.');
  try { M = await rpc('get_meeting', { p_token: token }); }
  catch (e) { return fail(e.message); }

  $('#mtitle').textContent = M.title;
  $('#meta').innerHTML =
    `${M.date_start} ~ ${M.date_end} · ${hhmm(M.day_start_min)}–${hhmm(M.day_end_min)} · `
    + `회의 ${M.duration_min}분 <span class="tz">기준: ${M.timezone}</span>`;

  M.is_owner ? renderOwner() : renderGuest();
})();

/* ── 게스트 ───────────────────────────────── */
function renderGuest() {
  const saved = localStorage.getItem('pid:' + M.share_token);
  $('#guest').classList.remove('hidden');
  $('#gname').value = localStorage.getItem('pname:' + M.share_token) || '';

  renderGrid($('#ggrid'), {
    dates: dateList(M.date_start, M.date_end),
    times: timeList(M.day_start_min, M.day_end_min),
    mode: 'select', selected
  });

  $('#submit').onclick = async () => {
    $('#err').textContent = '';
    if (!$('#gname').value.trim()) return fail('이름을 입력해주세요.');
    if (selected.size === 0) return fail('가능한 시간을 1개 이상 선택해주세요.');
    $('#submit').disabled = true;
    try {
      const r = await rpc('submit_availability', {
        p_share_token: M.share_token,
        p_name: $('#gname').value,
        p_company: $('#gcompany').value,
        p_slots: slotsToJson(selected),
        p_participant_id: saved || null
      });
      localStorage.setItem('pid:' + M.share_token, r.participant_id);
      localStorage.setItem('pname:' + M.share_token, $('#gname').value.trim());
      $('#guest').classList.add('hidden');
      $('#done').classList.remove('hidden');
    } catch (e) { fail(e.message); $('#submit').disabled = false; }
  };

  $('#edit').onclick = () => {
    $('#done').classList.add('hidden');
    $('#guest').classList.remove('hidden');
    $('#submit').disabled = false;
  };
}

/* ── 주최자 ───────────────────────────────── */
function renderOwner() {
  $('#owner').classList.remove('hidden');
  $('#shareUrl').value = location.href.replace(/\?.*$/, '') + '?t=' + M.share_token;

  const ps = M.participants, av = M.availabilities;
  const submitted = new Set(av.map(a => a.participant_id));

  $('#plist').innerHTML = ps.map(p =>
    `<li><span class="dot ${submitted.has(p.id)?'ok':'no'}"></span>
     ${esc(p.name)}${p.company ? ` <small>(${esc(p.company)})</small>` : ''}
     ${p.role === 'owner' ? '<em>나</em>' : ''}
     <span class="st">${submitted.has(p.id) ? '제출 완료' : '미제출'}</span></li>`).join('');

  const cands = findCandidates(M, ps, av);
  const full = cands.filter(c => c.isFull);
  const box = $('#cands');

  if (ps.length < 2) {
    box.innerHTML = '<p class="hint">아직 고객사 담당자가 제출하지 않았습니다. 공유 링크를 전달해주세요.</p>';
  } else if (full.length) {
    box.innerHTML = `<p class="ok-msg">전원 가능한 시간 ${full.length}개를 찾았습니다.</p>`
      + full.slice(0, 5).map(c => candCard(c, true)).join('');
  } else {
    box.innerHTML = '<p class="warn">전원이 가능한 시간이 없습니다. 아래는 가장 많이 겹치는 구간입니다.</p>'
      + cands.slice(0, 5).map(c => candCard(c, false)).join('');
  }

  const counts = new Map();
  av.forEach(a => { const k = key(a.d, a.m); counts.set(k, (counts.get(k)||0) + 1); });
  renderGrid($('#ogrid'), {
    dates: dateList(M.date_start, M.date_end),
    times: timeList(M.day_start_min, M.day_end_min),
    mode: 'heat', counts, total: ps.length
  });
}

function candCard(c, isFull) {
  const d = new Date(c.date + 'T00:00:00');
  const range = `${hhmm(c.startMin)}–${hhmm(c.endMin)}`;
  const wide = (c.endMin - c.startMin) > M.duration_min
    ? `<small>이 구간 안에서 ${M.duration_min}분 배치 가능</small>` : '';
  return `<div class="cand ${isFull?'full':''}">
    <b>${c.date} (${DOW[d.getDay()]}) ${range}</b> ${wide}
    <div class="who">가능 ${c.ok.length}/${c.ok.length + c.no.length}명
      ${c.no.length ? `· 불가: ${c.no.map(p=>esc(p.name)).join(', ')}` : ''}</div>
  </div>`;
}

document.addEventListener('click', e => {
  const id = e.target.dataset?.copy; if (!id) return;
  const el = document.getElementById(id);
  el.select(); navigator.clipboard.writeText(el.value);
  e.target.textContent = '복사됨';
  setTimeout(() => e.target.textContent = '공유 링크 복사', 1500);
});

const esc = s => String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function fail(m) { $('#err').textContent = m; }
