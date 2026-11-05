const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SUBJECT_LENGTH = 160;
const MAX_BODY_LENGTH = 4500;

export function configuredSupportEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim();
  return emailPattern.test(email) && email.length <= 254 ? email : null;
}

// This only prepares a local mailto link. Opening it remains a user-initiated browser action.
export function supportMailto(email, subject, body) {
  const recipient = configuredSupportEmail(email);
  if (!recipient || typeof subject !== 'string' || typeof body !== 'string') return null;
  const safeSubject = subject.trim().replace(/[\r\n]/g, ' ').slice(0, MAX_SUBJECT_LENGTH);
  const safeBody = body.slice(0, MAX_BODY_LENGTH);
  if (!safeSubject || !safeBody) return null;
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(safeBody)}`;
}
