const TYPES = new Set(['BUG', 'IDEA', 'OTHER']);
const LIMITS = {summary:500, steps:1000, expected:500};

function text(value, limit, required=false) {
  if (typeof value !== 'string') throw Error('Invalid feedback text');
  const cleaned = value.trim();
  if ((required && cleaned.length < 3) || cleaned.length > limit) throw Error('Invalid feedback text');
  return cleaned;
}

export function feedbackPayload(value) {
  if (!value || !TYPES.has(value.type) || !['vi', 'en'].includes(value.language)) throw Error('Invalid feedback');
  return {type:value.type,summary:text(value.summary, LIMITS.summary, true),steps:text(value.steps ?? '', LIMITS.steps),expected:text(value.expected ?? '', LIMITS.expected),language:value.language};
}

function readItem(value) {
  if (!value || !Number.isSafeInteger(value.id) || value.id < 1 || !TYPES.has(value.type) || !['vi', 'en'].includes(value.language) || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) throw Error('Invalid feedback item');
  return {...feedbackPayload(value),id:value.id,createdAt:value.createdAt};
}

// The server never needs to return another account's reports. Fail closed if its small list contract changes.
export function readFeedbackList(value) {
  if (!Array.isArray(value) || value.length > 20) throw Error('Invalid feedback list');
  const items=value.map(readItem);
  if (new Set(items.map(item=>item.id)).size!==items.length) throw Error('Invalid feedback list');
  return items;
}

export function readFeedback(value) { return readItem(value); }

export const feedbackTypeLabels={BUG:{vi:'Báo lỗi',en:'Bug report'},IDEA:{vi:'Ý tưởng',en:'Idea'},OTHER:{vi:'Khác',en:'Other'}};
