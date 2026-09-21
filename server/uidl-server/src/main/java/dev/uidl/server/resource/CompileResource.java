package dev.uidl.server.resource;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import dev.uidl.generator.uidl.UidlDocument;
import dev.uidl.generator.validation.CapabilityIssue;
import dev.uidl.server.dto.CompileRequestDto;
import dev.uidl.server.dto.ProblemDetails;
import dev.uidl.server.dto.ValidateRequestDto;
import dev.uidl.server.service.CompilationService;

/**
 * REST endpoint for UIDL compilation and validation.
 */
@Path("/api/v1")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class CompileResource {

    private final CompilationService compilationService;

    @Inject
    public CompileResource(CompilationService compilationService) {
        this.compilationService = compilationService;
    }

    @POST
    @Path("/compile")
    public Response compile(CompileRequestDto req) {
        if (req == null) {
            return Response.status(400)
                    .entity(ProblemDetails.badRequest("Request payload must not be null", "INVALID_BODY", "/api/v1/compile", null))
                    .build();
        }
        if (req.recipe() == null) {
            return Response.status(400)
                    .entity(ProblemDetails.badRequest("Field 'recipe' is required", "MISSING_RECIPE", "/api/v1/compile", null))
                    .build();
        }
        if (req.meta() == null || req.meta().isNull() || req.meta().isMissingNode()) {
            return Response.status(400)
                    .entity(ProblemDetails.badRequest("Field 'meta' is required", "MISSING_META", "/api/v1/compile", null))
                    .build();
        }

        try {
            UidlDocument doc = compilationService.compile(req);
            return Response.ok(doc).build();
        } catch (IllegalArgumentException ex) {
            return Response.status(400)
                    .entity(ProblemDetails.badRequest(ex.getMessage(), "INVALID_INPUT", "/api/v1/compile", null))
                    .build();
        } catch (JsonProcessingException ex) {
            return Response.status(400)
                    .entity(ProblemDetails.badRequest("Failed to parse metadata: " + ex.getOriginalMessage(), "JSON_PARSE_ERROR", "/api/v1/compile", null))
                    .build();
        } catch (Exception ex) {
            if (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("capability")) {
                return Response.status(422)
                        .entity(ProblemDetails.unprocessable(ex.getMessage(), "CAPABILITY_ISSUE", "/api/v1/compile", null))
                        .build();
            }
            return Response.status(500)
                    .entity(ProblemDetails.internalError("Compilation failed: " + ex.getMessage(), "/api/v1/compile"))
                    .build();
        }
    }

    @POST
    @Path("/validate")
    public Response validate(ValidateRequestDto req) {
        if (req == null) {
            return Response.status(400)
                    .entity(ProblemDetails.badRequest("Request payload must not be null", "INVALID_BODY", "/api/v1/validate", null))
                    .build();
        }
        if (req.recipe() == null) {
            return Response.status(400)
                    .entity(ProblemDetails.badRequest("Field 'recipe' is required", "MISSING_RECIPE", "/api/v1/validate", null))
                    .build();
        }
        if (req.meta() == null || req.meta().isNull() || req.meta().isMissingNode()) {
            return Response.status(400)
                    .entity(ProblemDetails.badRequest("Field 'meta' is required", "MISSING_META", "/api/v1/validate", null))
                    .build();
        }

        try {
            List<CapabilityIssue> issues = compilationService.validateCapabilities(req);
            return Response.ok(Map.of(
                    "valid", issues.isEmpty(),
                    "issues", issues
            )).build();
        } catch (IllegalArgumentException ex) {
            return Response.status(400)
                    .entity(ProblemDetails.badRequest(ex.getMessage(), "INVALID_INPUT", "/api/v1/validate", null))
                    .build();
        } catch (JsonProcessingException ex) {
            return Response.status(400)
                    .entity(ProblemDetails.badRequest("Failed to parse metadata: " + ex.getOriginalMessage(), "JSON_PARSE_ERROR", "/api/v1/validate", null))
                    .build();
        } catch (Exception ex) {
            return Response.status(500)
                    .entity(ProblemDetails.internalError("Validation failed: " + ex.getMessage(), "/api/v1/validate"))
                    .build();
        }
    }
}
