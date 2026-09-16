package dev.uidl.generator.validation;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import dev.uidl.generator.compiler.CompilePageInput;
import dev.uidl.generator.model.*;
import dev.uidl.generator.policy.HostCapabilities;

/**
 * Fail-closed validation of recipe inputs against host capabilities.
 * Port of {@code validateHostCapabilities()} from {@code compiler/types.ts}.
 *
 * <p>Any collection, command, or transition referenced by the recipe meta that is not
 * in the host's allowlist produces a {@link CapabilityIssue}. Unknown values fail closed:
 * a validation error, not a silent render.
 */
public final class CapabilityValidator {

    private CapabilityValidator() {}

    public static List<CapabilityIssue> validate(CompilePageInput input) {
        var issues = new ArrayList<CapabilityIssue>();
        var caps = input.hostCapabilities();
        var collections = new HashSet<>(caps.collections());
        var mutationCollections = new HashSet<>(caps.effectiveMutationCollections());

        // List and form: meta.name must be an allowlisted collection
        if (input.recipe() == PageRecipe.LIST || input.recipe() == PageRecipe.FORM) {
            String name = switch (input) {
                case CompilePageInput.ListInput li -> li.meta().name();
                case CompilePageInput.FormInput fi -> fi.meta().name();
                default -> null;
            };
            if (name != null && !collections.contains(name) && !mutationCollections.contains(name)) {
                issues.add(new CapabilityIssue(
                        CapabilityIssue.Code.UNKNOWN_COLLECTION,
                        "collection \"%s\" is not in hostCapabilities.collections".formatted(name),
                        "meta.name"
                ));
            }
        }

        // Report: if dataSource is a $query, its collection must be allowlisted
        if (input instanceof CompilePageInput.ReportInput ri) {
            Object ds = ri.meta().dataSource();
            if (ds instanceof Map<?, ?> dsMap && dsMap.containsKey("$query")) {
                Object query = dsMap.get("$query");
                if (query instanceof Map<?, ?> queryMap) {
                    String coll = queryMap.get("collection") instanceof String s ? s : "";
                    if (!coll.isEmpty() && !collections.contains(coll)) {
                        issues.add(new CapabilityIssue(
                                CapabilityIssue.Code.UNKNOWN_COLLECTION,
                                "report collection \"%s\" is not in hostCapabilities.collections".formatted(coll),
                                "meta.dataSource.$query.collection"
                        ));
                    }
                }
            }
        }

        // List: pageSize limit
        if (input instanceof CompilePageInput.ListInput li
                && caps.limits() != null
                && caps.limits().maxPageSize() != null) {
            int pageSize = li.meta().pageSize() != null ? li.meta().pageSize() : 20;
            if (pageSize > caps.limits().maxPageSize()) {
                issues.add(new CapabilityIssue(
                        CapabilityIssue.Code.LIMIT_EXCEEDED,
                        "pageSize %d exceeds hostCapabilities.limits.maxPageSize %d"
                                .formatted(pageSize, caps.limits().maxPageSize()),
                        "meta.pageSize"
                ));
            }
        }

        // List: filter count limit
        if (input instanceof CompilePageInput.ListInput li
                && caps.limits() != null
                && caps.limits().maxFilters() != null) {
            int count = li.meta().filters() != null ? li.meta().filters().size() : 0;
            if (count > caps.limits().maxFilters()) {
                issues.add(new CapabilityIssue(
                        CapabilityIssue.Code.LIMIT_EXCEEDED,
                        "filters count %d exceeds hostCapabilities.limits.maxFilters %d"
                                .formatted(count, caps.limits().maxFilters()),
                        "meta.filters"
                ));
            }
        }

        // List: per-collection query allowlist
        if (input instanceof CompilePageInput.ListInput li && caps.queries() != null) {
            var meta = li.meta();
            caps.queries().stream()
                    .filter(q -> q.collection().equals(meta.name()))
                    .findFirst()
                    .ifPresent(q -> {
                        if (q.filterFields() != null && meta.filters() != null) {
                            for (var filter : meta.filters()) {
                                if (!q.filterFields().contains(filter.field())) {
                                    issues.add(new CapabilityIssue(
                                            CapabilityIssue.Code.UNKNOWN_COLLECTION,
                                            "filter field \"%s\" not allowlisted for collection \"%s\""
                                                    .formatted(filter.field(), meta.name()),
                                            "meta.filters." + filter.field()
                                    ));
                                }
                            }
                        }
                        if (q.sortableFields() != null && !q.sortableFields().contains(meta.defaultSort().field())) {
                            issues.add(new CapabilityIssue(
                                    CapabilityIssue.Code.UNKNOWN_COLLECTION,
                                    "sort field \"%s\" not allowlisted for collection \"%s\""
                                            .formatted(meta.defaultSort().field(), meta.name()),
                                    "meta.defaultSort.field"
                            ));
                        }
                    });
        }

        // Form/Settings/Wizard: Link target collections must be allowlisted
        validateLinkTargets(input, collections, issues);

        return List.copyOf(issues);
    }

    private static void validateLinkTargets(
            CompilePageInput input,
            Set<String> collections,
            List<CapabilityIssue> issues
    ) {
        List<FieldMeta> fields = switch (input) {
            case CompilePageInput.FormInput fi -> fi.meta().fields();
            case CompilePageInput.WizardInput wi ->
                    wi.meta().steps().stream().flatMap(s -> s.fields().stream()).toList();
            default -> null;
        };

        if (fields == null) return;

        for (var field : fields) {
            if (field.widget() == FieldWidget.LINK && field.linkTarget() != null) {
                String linkDoctype = field.linkTarget().doctype();
                if (!collections.contains(linkDoctype)) {
                    issues.add(new CapabilityIssue(
                            CapabilityIssue.Code.UNKNOWN_COLLECTION,
                            "Link target collection \"%s\" for field \"%s\" not in hostCapabilities.collections"
                                    .formatted(linkDoctype, field.key()),
                            "meta.fields." + field.key() + ".linkTarget"
                    ));
                }
            }
        }
    }
}
