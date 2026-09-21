package dev.uidl.generator.policy;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Host-owned allowlist. The compiler MUST NOT emit a {@code $query} collection,
 * {@code mutate} collection, or {@code command} name that is not in this manifest.
 * Unknown values fail closed (validation error, not silent render).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record HostCapabilities(
        List<String> collections,
        List<String> commands,
        List<String> mutationCollections,
        List<String> transitions,
        List<QueryCapability> queries,
        List<MutationCapability> mutations,
        Limits limits
) {

    public HostCapabilities {
        if (collections == null) {
            throw new IllegalArgumentException("HostCapabilities.collections must not be null");
        }
        if (commands == null) {
            throw new IllegalArgumentException("HostCapabilities.commands must not be null");
        }
    }

    public HostCapabilities(List<String> collections, List<String> commands) {
        this(collections, commands, null, null, null, null, null);
    }

    public HostCapabilities(List<String> collections) {
        this(collections, List.of(), null, null, null, null, null);
    }

    /** Allowed query fields per collection. */
    public record QueryCapability(String collection, List<String> filterFields, List<String> sortableFields) {}

    /** Allowed mutation operations per collection. */
    public record MutationCapability(String collection, List<String> operations, List<String> transitions) {}

    /** Hard caps the compiler must respect. */
    public record Limits(Integer maxPageSize, Integer maxFilters) {}

    /**
     * Returns the effective mutation collections — falls back to {@code collections}
     * if {@code mutationCollections} is not set.
     */
    public List<String> effectiveMutationCollections() {
        return mutationCollections != null ? mutationCollections : collections;
    }
}
