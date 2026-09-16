package dev.uidl.generator.model;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Chart descriptor for a dashboard. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DashboardChart(
        String id,
        LocalizedText title,
        String type,
        String xKey,
        String yKey,
        Object dataSource,
        Map<String, Object> style
) {

    public DashboardChart {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("DashboardChart.id must not be blank");
        }
        if (title == null) {
            throw new IllegalArgumentException("DashboardChart.title must not be null");
        }
        if (type == null || type.isBlank()) {
            throw new IllegalArgumentException("DashboardChart.type must not be blank");
        }
    }
}
