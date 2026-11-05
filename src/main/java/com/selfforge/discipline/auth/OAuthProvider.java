package com.selfforge.discipline.auth;

import java.util.Locale;

enum OAuthProvider {
    GOOGLE, FACEBOOK;

    static OAuthProvider from(String value) {
        if (value == null) throw new IllegalArgumentException("Nhà cung cấp đăng nhập không hợp lệ.");
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException failure) {
            throw new IllegalArgumentException("Nhà cung cấp đăng nhập không hợp lệ.");
        }
    }

    String path() {
        return name().toLowerCase(Locale.ROOT);
    }
}
