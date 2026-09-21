package dev.uidl.generator.model;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Shortcut link on a dashboard. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DashboardShortcut(
        String doctype,
        LocalizedText label,
        LocalizedText description,
        String route
) {}
