// A storage event is delivered only to other tabs on the same origin. The event carries
// no user content; it merely tells an already-authenticated tab to reload one resource.
export const ACCOUNT_DATA_EVENT_KEY = 'sf:account-data-changed:v1';

const resources = new Set(['habits', 'dashboard', 'companion', 'goals', 'journal', 'reminders', 'challenges', 'rewards']);
const validOwner = value => Number.isSafeInteger(value) && value > 0;

export function accountDataChange(owner, resource) {
  if (!validOwner(owner) || !resources.has(resource)) throw new Error('Invalid account data change');
  return { version: 1, owner, resource };
}

export function readAccountDataChange(value) {
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || parsed.version !== 1 || !validOwner(parsed.owner) || !resources.has(parsed.resource)) return null;
    return { version: 1, owner: parsed.owner, resource: parsed.resource };
  } catch {
    return null;
  }
}

export function publishAccountDataChange(owner, resource, storage) {
  const change = accountDataChange(owner, resource);
  try {
    storage.setItem(ACCOUNT_DATA_EVENT_KEY, JSON.stringify(change));
    storage.removeItem(ACCOUNT_DATA_EVENT_KEY);
    return true;
  } catch {
    return false;
  }
}

export function subscribeAccountDataChanges(target, owner, onChange) {
  if (!validOwner(owner) || typeof onChange !== 'function') throw new Error('Invalid account data subscriber');
  const listener = event => {
    if (event.key !== ACCOUNT_DATA_EVENT_KEY) return;
    const change = readAccountDataChange(event.newValue);
    if (change?.owner === owner) onChange(change);
  };
  target.addEventListener('storage', listener);
  return () => target.removeEventListener('storage', listener);
}
