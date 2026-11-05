-- The one-time token itself never reaches this table, only its SHA-256 fingerprint.
create table email_change_recovery (
    user_id bigint primary key,
    previous_email varchar(254) not null,
    changed_email varchar(254) not null,
    token_hash varchar(64) not null unique,
    expires_at timestamp(6) with time zone not null,
    consumed boolean not null,
    constraint fk_email_change_recovery_user_id foreign key (user_id) references app_user
);

alter table account_security_event drop constraint if exists chk_account_security_event_type;
alter table account_security_event add constraint chk_account_security_event_type check (event_type in (
    'REGISTERED', 'SIGNED_IN', 'SIGNED_IN_WITH_OAUTH', 'PASSWORD_CHANGED',
    'PASSWORD_RESET', 'EMAIL_CHANGED', 'EMAIL_CHANGE_RECOVERED', 'SESSION_REVOKED', 'OTHER_SESSIONS_REVOKED'
));
