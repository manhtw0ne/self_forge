package com.selfforge.discipline.export;

final class CsvText {
    private CsvText() {}
    static String escape(String text) {
        if (text == null) return "";
        String value = text.replace("\r", " ").replace("\n", " ");
        // Spreadsheet applications may ignore leading whitespace/control characters.
        int i = 0;
        while (i < value.length() && (Character.isWhitespace(value.charAt(i)) || Character.isISOControl(value.charAt(i)) || value.charAt(i) == '\ufeff')) i++;
        if (i < value.length() && "=+-@".indexOf(value.charAt(i)) >= 0) value = "'" + value;
        return value.replace("\"", "\"\"");
    }
}
