create table registration_code (
    email varchar(254) primary key,
    code_hash varchar(255),
    expires_at timestamp(6) with time zone,
    sent_at timestamp(6) with time zone,
    window_start timestamp(6) with time zone,
    send_count integer not null,
    attempts integer not null,
    consumed boolean not null
);
alter table app_user add column email_verified_at timestamp(6) with time zone;
