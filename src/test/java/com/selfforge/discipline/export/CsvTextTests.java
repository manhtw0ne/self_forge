package com.selfforge.discipline.export;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class CsvTextTests {
    @Test void neutralizesFormulaPrefixesIncludingLeadingWhitespace() {
        for (String value : new String[]{"=1+1", "+SUM(1,2)", "-1+2", "@SUM(A1)", " \t=1", "\r\n=1", "\ufeff=1"}) {
            assertTrue(CsvText.escape(value).startsWith("'"), value);
        }
    }
    @Test void preservesOrdinaryUnicodeAndEscapesCsvQuotes() {
        assertEquals("Tiến bộ 🌱", CsvText.escape("Tiến bộ 🌱"));
        assertEquals("a," + "\"\"" + "b" + "\"\"", CsvText.escape("a,\"b\""));
        assertEquals("a b", CsvText.escape("a\nb"));
        assertEquals("", CsvText.escape(null));
    }
}
