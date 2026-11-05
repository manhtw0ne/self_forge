create table email_change_code (
    user_id bigint primary key,
    pending_email varchar(254) not null,
    code_hash varchar(255),
    expires_at timestamp(6) with time zone,
    sent_at timestamp(6) with time zone,
    window_start timestamp(6) with time zone,
    send_count integer not null,
    attempts integer not null,
    consumed boolean not null,
    constraint fk_email_change_code_user_id foreign key (user_id) references app_user
);

alter table account_security_event drop constraint if exists account_security_event_event_type_check;
alter table account_security_event add constraint chk_account_security_event_type check (event_type in (
    'REGISTERED', 'SIGNED_IN', 'SIGNED_IN_WITH_OAUTH', 'PASSWORD_CHANGED',
    'PASSWORD_RESET', 'EMAIL_CHANGED', 'SESSION_REVOKED', 'OTHER_SESSIONS_REVOKED'
));
