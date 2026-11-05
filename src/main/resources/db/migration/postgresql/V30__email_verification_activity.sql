alter table account_security_event drop constraint if exists chk_account_security_event_type;
-- H2 assigned this name to V27's unnamed check during compatibility tests. PostgreSQL's
-- generated name was already removed in V28; this is a harmless no-op there.
alter table account_security_event drop constraint if exists constraint_5e;
alter table account_security_event add constraint chk_account_security_event_type check (event_type in (
    'REGISTERED', 'SIGNED_IN', 'SIGNED_IN_WITH_OAUTH', 'PASSWORD_CHANGED',
    'PASSWORD_RESET', 'EMAIL_CHANGED', 'EMAIL_CHANGE_RECOVERED', 'EMAIL_VERIFIED',
    'SESSION_REVOKED', 'OTHER_SESSIONS_REVOKED'
));
