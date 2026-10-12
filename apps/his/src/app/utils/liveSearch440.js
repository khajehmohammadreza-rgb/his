const faDigits = '۰۱۲۳۴۵۶۷۸۹';
const arDigits = '٠١٢٣٤٥٦٧٨٩';

export function latinDigits(value = '') {
  return String(value ?? '')
    .replace(/[۰-۹]/g, d => String(faDigits.indexOf(d)))
    .replace(/[٠-٩]/g, d => String(arDigits.indexOf(d)));
}

export function normalizeLiveText(value = '') {
  return latinDigits(value)
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ـ]/g, '')
    .replace(/[\u200c\u200f\u202a-\u202e]/g, ' ')
    .replace(/[^\p{L}\p{N}\s+.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeLiveQuery(value = '') {
  return normalizeLiveText(value).split(' ').filter(Boolean);
}

export function liveScore(text, query, { prefixBonus = 40, exactBonus = 160 } = {}) {
  const hay = normalizeLiveText(text);
  const q = normalizeLiveText(query);
  if (!q) return 0;
  if (hay === q) return exactBonus + q.length;
  if (hay.startsWith(q)) return prefixBonus + q.length * 2;
  if (hay.includes(q)) return q.length;
  const tokens = tokenizeLiveQuery(q);
  if (tokens.length && tokens.every(t => hay.includes(t))) return tokens.reduce((s, t) => s + t.length, 0);
  return -1;
}

export function rankLive(items = [], query = '', textOf = x => String(x ?? ''), { limit = 100 } = {}) {
  const q = normalizeLiveText(query);
  if (!q) return [];
  return items
    .map((item, index) => ({ item, index, score: liveScore(textOf(item), q) }))
    .filter(x => x.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(x => x.item);
}

export function patientSearchText(p = {}) {
  return [
    p.fullName,
    p.firstName,
    p.lastName,
    p.fileNumber,
    p.patientCode,
    p.nationalId,
    p.mobilePhone,
    p.phone,
    p.age,
    p.birthDate,
  ].filter(Boolean).join(' ');
}

export function rankPatients(patients = [], fields = {}, limit = 200) {
  const activeFields = Object.entries(fields || {})
    .map(([key, value]) => [key, normalizeLiveText(value)])
    .filter(([, value]) => Boolean(value));
  if (!activeFields.length) return [];

  const rows = [];
  for (let index = 0; index < patients.length; index += 1) {
    const p = patients[index] || {};
    let score = 0;
    let ok = true;
    for (const [key, q] of activeFields) {
      const value = key === 'general'
        ? patientSearchText(p)
        : key === 'firstName'
          ? (p.firstName || String(p.fullName || '').split(' ')[0] || '')
          : key === 'lastName'
            ? (p.lastName || String(p.fullName || '').split(' ').slice(1).join(' '))
            : p[key] ?? (key === 'mobilePhone' ? p.phone : '');
      const s = liveScore(value, q, { prefixBonus: 55, exactBonus: 220 });
      if (s < 0) { ok = false; break; }
      score += s;
    }
    if (ok) rows.push({ p, index, score });
  }
  return rows.sort((a, b) => b.score - a.score || a.index - b.index).slice(0, limit).map(x => x.p);
}

export function hasNearDuplicate(items = [], query = '', textOf = x => String(x ?? ''), limit = 12) {
  const q = normalizeLiveText(query);
  if (!q) return [];
  return items
    .map((item, index) => {
      const text = normalizeLiveText(textOf(item));
      let score = liveScore(text, q, { prefixBonus: 70, exactBonus: 300 });
      if (score < 0) {
        const tokens = tokenizeLiveQuery(q);
        const overlap = tokens.filter(t => text.includes(t)).length;
        score = overlap ? overlap * 8 : -1;
      }
      return { item, index, score };
    })
    .filter(x => x.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(x => x.item);
}

// Compatibility aliases for modules migrated from older builds.
export function similarCatalog(items = [], query = '', textOf = x => String(x ?? ''), limit = 100) {
  return rankLive(items, query, textOf, { limit });
}
