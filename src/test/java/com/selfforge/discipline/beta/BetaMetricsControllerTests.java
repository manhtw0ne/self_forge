package com.selfforge.discipline.beta;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class BetaMetricsControllerTests {
    @Test void report_is_not_available_without_the_configured_operator_key() {
        BetaMetricsService metrics = mock(BetaMetricsService.class);
        BetaMetricsController controller = new BetaMetricsController(new BetaMetricsAccess("operator-key"), metrics);
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> controller.report("wrong-key", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 7)));
        assertEquals(404, error.getStatusCode().value());
        verifyNoInteractions(metrics);
    }

    @Test void valid_key_delegates_only_the_selected_aggregate_window() {
        BetaMetricsService metrics = mock(BetaMetricsService.class);
        BetaMetricsService.Response expected = new BetaMetricsService.Response(
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 7), "UTC", Instant.EPOCH,
                2, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0);
        when(metrics.report(expected.from(), expected.through())).thenReturn(expected);
        BetaMetricsController controller = new BetaMetricsController(new BetaMetricsAccess("operator-key"), metrics);
        assertEquals(expected, controller.report("operator-key", expected.from(), expected.through()));
        verify(metrics).report(expected.from(), expected.through());
    }
}
