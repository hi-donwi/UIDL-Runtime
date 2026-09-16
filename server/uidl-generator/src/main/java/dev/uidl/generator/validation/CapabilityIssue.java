package dev.uidl.generator.validation;

/**
 * A single capability violation found by {@link CapabilityValidator}.
 */
public record CapabilityIssue(Code code, String message, String path) {

    public enum Code {
        UNKNOWN_COLLECTION,
        UNKNOWN_COMMAND,
        UNKNOWN_TRANSITION,
        LIMIT_EXCEEDED
    }
}
