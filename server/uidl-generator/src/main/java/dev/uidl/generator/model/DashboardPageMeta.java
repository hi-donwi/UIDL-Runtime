package dev.uidl.generator.model;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Metadata for a dashboard page recipe.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DashboardPageMeta(
        String name,
        LocalizedText label,
        List<DashboardKpi> kpis,
        List<DashboardChart> charts,
        List<DashboardShortcut> shortcuts,
        Map<String, Object> dataSources
) {

    public DashboardPageMeta {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("DashboardPageMeta.name must not be blank");
        }
        if (label == null) {
            throw new IllegalArgumentException("DashboardPageMeta.label must not be null");
        }
    }
}
