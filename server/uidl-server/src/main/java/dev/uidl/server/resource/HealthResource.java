package dev.uidl.server.resource;

import java.util.Map;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Health check endpoint for UIDL Server.
 */
@Path("/api/v1/health")
@Produces(MediaType.APPLICATION_JSON)
public class HealthResource {

    @GET
    public Response health() {
        return Response.ok(Map.of(
                "status", "UP",
                "version", "1.0.0-SNAPSHOT",
                "service", "uidl-server"
        )).build();
    }
}
