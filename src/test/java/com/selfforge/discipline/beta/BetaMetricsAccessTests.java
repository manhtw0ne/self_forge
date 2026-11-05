package com.selfforge.discipline.beta;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

class BetaMetricsAccessTests {
    @Test void stays_disabled_without_a_configured_key_and_compares_a_real_key() {
        assertFalse(new BetaMetricsAccess("").granted("anything"));
        BetaMetricsAccess access = new BetaMetricsAccess("long-operator-secret");
        assertTrue(access.granted("long-operator-secret"));
        assertFalse(access.granted("long-operator-secreT"));
        assertFalse(access.granted(null));
    }
}
