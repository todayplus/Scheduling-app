const SLOT = 30;
const DOW = ['일','월','화','수','목','금','토'];

const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const hhmm = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const key = (d,m) => `${d}|${m}`;

function dateList(start, end) {
  const out = [], d = new Date(start+'T00:00:00'), last = new Date(end+'T00:00:00');
  while (d <= last) { out.push(ymd(d)); d.setDate(d.getDate()+1); }
  return out;
}
function timeList(s, e) {
  const out = []; for (let m = s; m + SLOT <= e; m += SLOT) out.push(m); return out;
}
function dateLabel(s) {
  const d = new Date(s+'T00:00:00');
  return `${d.getMonth()+1}/${d.getDate()}<br><small>${DOW[d.getDay()]}</small>`;
}

/** 겹치는 구간 계산: 회의 길이만큼 '연속된' 슬롯이 비어야 후보로 인정 */
function findCandidates(meeting, participants, availabilities) {
  const dates = dateList(meeting.date_start, meeting.date_end);
  const times = timeList(meeting.day_start_min, meeting.day_end_min);
  const need  = Math.ceil(meeting.duration_min / SLOT);

  const sets = new Map(participants.map(p => [p.id, new Set()]));
  availabilities.forEach(a => sets.get(a.participant_id)?.add(key(a.d, a.m)));

  const raw = [];
  for (const d of dates) {
    for (let i = 0; i + need <= times.length; i++) {
      const win = [];
      for (let k = 0; k < need; k++) win.push(key(d, times[i+k]));
      const ok = [], no = [];
      for (const p of participants) (win.every(x => sets.get(p.id).has(x)) ? ok : no).push(p);
      if (ok.length >= 2) raw.push({
        date: d, startMin: times[i], endMin: times[i] + need*SLOT,
        ok, no, sig: ok.map(p=>p.id).sort().join(',')
      });
    }
  }

  const merged = [];
  for (const c of raw) {
    const last = merged[merged.length-1];
    if (last && last.date===c.date && last.sig===c.sig && c.startMin === last._ls + SLOT) {
      last.endMin = c.endMin; last._ls = c.startMin;
    } else merged.push({ ...c, _ls: c.startMin });
  }

  const total = participants.length;
  merged.forEach(b => { b.isFull = b.ok.length === total; });
  merged.sort((a,b) =>
    b.ok.length - a.ok.length ||
    a.date.localeCompare(b.date) ||
    a.startMin - b.startMin);
  return merged;
}
