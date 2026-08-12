const $ = s => document.querySelector(s);
const selected = new Set();
let cfg = null;

(function initHours() {
  for (const el of [$('#hs'), $('#he')]) {
    for (let h = 6; h <= 23; h++) {
      const o = document.createElement('option');
      o.value = h*60; o.textContent = `${String(h).padStart(2,'0')}:00`;
      el.appendChild(o);
    }
  }
  $('#hs').value = 540; $('#he').value = 1080;
  const t = new Date(); const p = new Date(t); p.setDate(p.getDate()+13);
  $('#ds').value = ymd(t); $('#de').value = ymd(p);
})();

$('#next').onclick = () => {
  $('#err').textContent = '';
  cfg = {
    title: $('#title').value.trim(),
    owner: $('#ownerName').value.trim(),
    date_start: $('#ds').value, date_end: $('#de').value,
    day_start_min: +$('#hs').value, day_end_min: +$('#he').value,
    duration_min: +$('#dur').value
  };
  if (!cfg.title) return fail('회의 제목을 입력해주세요.');
  if (!cfg.date_start || !cfg.date_end || cfg.date_end < cfg.date_start) return fail('날짜 범위를 확인해주세요.');
  if (cfg.day_end_min <= cfg.day_start_min) return fail('일과 시간을 확인해주세요.');

  renderGrid($('#grid'), {
    dates: dateList(cfg.date_start, cfg.date_end),
    times: timeList(cfg.day_start_min, cfg.day_end_min),
    mode: 'select', selected
  });
  $('#step1').classList.add('hidden');
  $('#step2').classList.remove('hidden');
};

$('#back').onclick = () => {
  $('#step2').classList.add('hidden'); $('#step1').classList.remove('hidden');
};

$('#create').onclick = async () => {
  $('#err').textContent = '';
  if (selected.size === 0) return fail('가능한 시간을 최소 1개 이상 선택해주세요.');
  $('#create').disabled = true;
  try {
    const r = await rpc('create_meeting', {
      p_title: cfg.title, p_duration_min: cfg.duration_min,
      p_date_start: cfg.date_start, p_date_end: cfg.date_end,
      p_day_start_min: cfg.day_start_min, p_day_end_min: cfg.day_end_min,
      p_timezone: 'Asia/Seoul', p_owner_name: cfg.owner || '주최자',
      p_owner_slots: slotsToJson(selected)
    });
    const base = location.href.replace(/\/[^/]*$/, '');
    $('#shareUrl').value = `${base}/m.html?t=${r.share_token}`;
    $('#ownerUrl').value = `${base}/m.html?t=${r.owner_token}`;
    $('#goOwner').href = `m.html?t=${r.owner_token}`;
    localStorage.setItem('owner:' + r.share_token, r.owner_participant_id);
    $('#step2').classList.add('hidden');
    $('#step3').classList.remove('hidden');
  } catch (e) { fail(e.message); $('#create').disabled = false; }
};

document.addEventListener('click', e => {
  const id = e.target.dataset?.copy; if (!id) return;
  const el = document.getElementById(id);
  el.select(); navigator.clipboard.writeText(el.value);
  e.target.textContent = '복사됨';
  setTimeout(() => e.target.textContent = '복사', 1500);
});

function fail(m) { $('#err').textContent = m; }
