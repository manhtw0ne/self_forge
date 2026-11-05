const types = new Set([
  'REGISTERED', 'SIGNED_IN', 'SIGNED_IN_WITH_OAUTH', 'PASSWORD_CHANGED',
  'PASSWORD_RESET', 'EMAIL_CHANGED', 'EMAIL_CHANGE_RECOVERED', 'EMAIL_VERIFIED', 'SESSION_REVOKED', 'OTHER_SESSIONS_REVOKED',
]);

function id(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function readSecurityEventPage(value) {
  if (!value || !Array.isArray(value.items) || value.items.length > 20) throw Error('Invalid security activity');
  const items = value.items.map(item => {
    if (!item || !id(item.id) || !types.has(item.type) || typeof item.occurredAt !== 'string'
      || !Number.isFinite(Date.parse(item.occurredAt))) throw Error('Invalid security event');
    return { id: item.id, type: item.type, occurredAt: item.occurredAt };
  });
  if (value.nextCursor !== null && value.nextCursor !== undefined && !id(value.nextCursor)) throw Error('Invalid security activity cursor');
  if (value.nextCursor !== null && value.nextCursor !== undefined && (!items.length || value.nextCursor >= items.at(-1).id)) {
    throw Error('Invalid security activity cursor');
  }
  return { items, nextCursor: value.nextCursor ?? null };
}
