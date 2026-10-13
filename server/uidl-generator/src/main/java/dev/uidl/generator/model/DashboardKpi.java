package dev.uidl.generator.model;

/**
 * KPI card for a dashboard.
 *
 * @param value a literal, printed as text, or a binding such as {@code {"$bind": "state.$data.open.total"}}
 *              (a {@link java.util.Map}), passed through for the runtime to resolve
 * @param format how a bound value is printed, as a list cell would print it; may be null
 */
public record DashboardKpi(LocalizedText label, Object value, String format) {

    /** A KPI with no print format, as before {@code format} existed. */
    public DashboardKpi(LocalizedText label, Object value) {
        this(label, value, null);
    }
}
