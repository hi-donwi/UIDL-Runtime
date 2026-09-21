package dev.uidl.generator.json;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import dev.uidl.generator.uidl.UidlDocument;

/**
 * Serializes {@link UidlDocument} to JSON that validates against
 * {@code spec/schema/document.schema.json}.
 */
public final class UidlJsonWriter {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .setSerializationInclusion(JsonInclude.Include.NON_NULL)
            .disable(SerializationFeature.FAIL_ON_EMPTY_BEANS);

    private static final ObjectMapper PRETTY_MAPPER = new ObjectMapper()
            .setSerializationInclusion(JsonInclude.Include.NON_NULL)
            .disable(SerializationFeature.FAIL_ON_EMPTY_BEANS)
            .enable(SerializationFeature.INDENT_OUTPUT);

    private UidlJsonWriter() {}

    /**
     * Serialize a UIDL document to compact JSON.
     */
    public static String write(UidlDocument document) {
        return toJson(document);
    }

    /**
     * Serialize a UIDL document to compact JSON.
     */
    public static String toJson(UidlDocument document) {
        try {
            return MAPPER.writeValueAsString(document);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize UidlDocument to JSON", e);
        }
    }

    /**
     * Serialize a UIDL document to pretty-printed JSON.
     */
    public static String toPrettyJson(UidlDocument document) {
        try {
            return PRETTY_MAPPER.writeValueAsString(document);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize UidlDocument to JSON", e);
        }
    }

    /**
     * Returns the shared ObjectMapper for custom use (e.g. writing to streams).
     */
    public static ObjectMapper mapper() {
        return MAPPER.copy();
    }
}
