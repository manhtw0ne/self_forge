package com.selfforge.discipline.auth;

/** Deliberately narrow, non-sensitive account activity visible only to its owner. */
public enum AccountSecurityEventType {
    REGISTERED,
    SIGNED_IN,
    SIGNED_IN_WITH_OAUTH,
    PASSWORD_CHANGED,
    PASSWORD_RESET,
    EMAIL_CHANGED,
    EMAIL_CHANGE_RECOVERED,
    EMAIL_VERIFIED,
    SESSION_REVOKED,
    OTHER_SESSIONS_REVOKED
}
