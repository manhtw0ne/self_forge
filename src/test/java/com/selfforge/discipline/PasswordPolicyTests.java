package com.selfforge.discipline;

import com.selfforge.discipline.auth.PasswordPolicy;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PasswordPolicyTests {
    @Test void acceptsLongPassphrasesWithoutArbitraryCompositionRules() {
        assertDoesNotThrow(() -> PasswordPolicy.validate("owner@example.com", "một cụm từ dài"));
        assertDoesNotThrow(() -> PasswordPolicy.validate("owner@example.com", "alllowercase"));
    }
    @Test void rejectsShortAccountDerivedAndControlCharacterPasswords() {
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.validate("owner@example.com", "short"));
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.validate("owner@example.com", "OWNER@EXAMPLE.COM"));
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.validate("owner@example.com", "owner"));
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.validate("owner@example.com", "aaaaaaaaaa"));
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.validate("owner@example.com", "valid\u0000pass"));
    }
}
