package dev.uidl.server.dto;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;

import dev.uidl.generator.model.PageRecipe;
import dev.uidl.generator.policy.HostCapabilities;
import dev.uidl.generator.policy.RoutePolicy;
import dev.uidl.generator.policy.UiPolicy;

/**
 * Request payload for POST /api/v1/compile.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CompileRequestDto(
        PageRecipe recipe,
        JsonNode meta,
        HostCapabilities hostCapabilities,
        UiPolicy uiPolicy,
        RoutePolicy routePolicy,
        String recordId,
        String listRoute,
        Map<String, String> queryParams
) {}
