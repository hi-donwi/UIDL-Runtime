package dev.uidl.generator.policy;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * UI presentation policy — language, density, theme, currency.
 * Host-owned: the compiler reads it, never writes it.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UiPolicy(
        String lang,
        String density,
        String theme,
        String currency
) {

    public static final UiPolicy DEFAULT = new UiPolicy("en", "comfortable", null, null);
}
