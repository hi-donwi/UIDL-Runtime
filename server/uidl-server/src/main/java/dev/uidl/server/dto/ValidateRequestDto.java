package dev.uidl.server.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;

import dev.uidl.generator.model.PageRecipe;
import dev.uidl.generator.policy.HostCapabilities;

/**
 * Request payload for POST /api/v1/validate.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ValidateRequestDto(
        PageRecipe recipe,
        JsonNode meta,
        HostCapabilities hostCapabilities
) {}
