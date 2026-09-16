package dev.uidl.generator.policy;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Route policy — base paths for generated navigation actions.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record RoutePolicy(
        String listBase,
        String formBase,
        String reportBase
) {

    public static final RoutePolicy DEFAULT = new RoutePolicy("/list", "/edit", "/report");

    /** Resolve a list route for a given doctype name. */
    public String resolveListRoute(String name) {
        return (listBase != null ? listBase : "/list") + "/" + name;
    }

    /** Resolve a form/edit route for a given doctype name and record ID. */
    public String resolveFormRoute(String name, String id) {
        return (formBase != null ? formBase : "/edit") + "/" + name + "/" + id;
    }

    /** Resolve a report route for a given report name. */
    public String resolveReportRoute(String name) {
        return (reportBase != null ? reportBase : "/report") + "/" + name;
    }
}
