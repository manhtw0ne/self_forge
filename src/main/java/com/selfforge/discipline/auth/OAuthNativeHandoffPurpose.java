package com.selfforge.discipline.auth;

/** Separates a native sign-in completion code from a native provider-link confirmation code. */
enum OAuthNativeHandoffPurpose {
    LOGIN,
    LINK
}
