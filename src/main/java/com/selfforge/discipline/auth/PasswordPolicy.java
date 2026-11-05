package com.selfforge.discipline.auth;

import java.util.Locale;

/**
 * A deliberately small policy: long passphrases are welcome; arbitrary composition rules are not.
 * Passwords are never logged, persisted here, or sent to a third-party checker.
 */
public final class PasswordPolicy {
    public static final int MINIMUM_LENGTH = 10;
    private PasswordPolicy() {}

    public static void validate(String email, String password) {
        if (password == null || password.length() < MINIMUM_LENGTH) {
            throw new IllegalArgumentException("Mật khẩu cần ít nhất 10 ký tự.");
        }
        if (password.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("Mật khẩu không được chứa ký tự điều khiển.");
        }
        String candidate = password.toLowerCase(Locale.ROOT);
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        int at = normalizedEmail.indexOf('@');
        String localPart = at > 0 ? normalizedEmail.substring(0, at) : "";
        if (candidate.equals(normalizedEmail) || (!localPart.isEmpty() && candidate.equals(localPart))) {
            throw new IllegalArgumentException("Không dùng email hoặc phần tên email làm mật khẩu.");
        }
        int first = password.codePointAt(0);
        if (password.codePoints().allMatch(value -> value == first)) {
            throw new IllegalArgumentException("Mật khẩu này quá dễ đoán. Hãy dùng một cụm từ dài hơn.");
        }
    }
}
