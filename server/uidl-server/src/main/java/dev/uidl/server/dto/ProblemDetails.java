package dev.uidl.server.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * RFC 9457 Problem Details error payload.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProblemDetails(
        String type,
        String title,
        int status,
        String detail,
        String instance,
        String code,
        String traceId,
        List<FieldError> errors
) {

    public record FieldError(String field, String message) {}

    public static ProblemDetails badRequest(String detail, String code, String instance, List<FieldError> errors) {
        return new ProblemDetails(
                "about:blank",
                "Bad Request",
                400,
                detail,
                instance,
                code != null ? code : "BAD_REQUEST",
                java.util.UUID.randomUUID().toString().substring(0, 12),
                errors
        );
    }

    public static ProblemDetails unprocessable(String detail, String code, String instance, List<FieldError> errors) {
        return new ProblemDetails(
                "about:blank",
                "Unprocessable Entity",
                422,
                detail,
                instance,
                code != null ? code : "UNPROCESSABLE_ENTITY",
                java.util.UUID.randomUUID().toString().substring(0, 12),
                errors
        );
    }

    public static ProblemDetails internalError(String detail, String instance) {
        return new ProblemDetails(
                "about:blank",
                "Internal Server Error",
                500,
                detail,
                instance,
                "INTERNAL_SERVER_ERROR",
                java.util.UUID.randomUUID().toString().substring(0, 12),
                null
        );
    }
}
