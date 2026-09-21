package dev.uidl.server.service;

import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import dev.uidl.generator.compiler.CompilePageInput;
import dev.uidl.generator.compiler.DefaultPageCompiler;
import dev.uidl.generator.json.UidlModule;
import dev.uidl.generator.model.*;
import dev.uidl.generator.policy.HostCapabilities;
import dev.uidl.generator.uidl.UidlDocument;
import dev.uidl.generator.validation.CapabilityIssue;
import dev.uidl.generator.validation.CapabilityValidator;
import dev.uidl.server.dto.CompileRequestDto;
import dev.uidl.server.dto.ValidateRequestDto;

/**
 * Service orchestrating recipe parsing, capability validation, and UIDL document compilation.
 */
@ApplicationScoped
public class CompilationService {

    /**
     * Permissive default capabilities used when the caller omits hostCapabilities.
     * Allows any collection, no limits — the caller is opting out of capability checks.
     */
    private static final HostCapabilities PERMISSIVE_CAPS =
            new HostCapabilities(List.of("*"), List.of());

    private final ObjectMapper mapper;
    private final DefaultPageCompiler compiler;

    @Inject
    public CompilationService(ObjectMapper mapper) {
        this.mapper = mapper.copy().registerModule(new UidlModule());
        this.compiler = new DefaultPageCompiler();
    }

    // Default constructor for testing / manual wiring
    public CompilationService() {
        this(new ObjectMapper());
    }

    /**
     * Compiles a recipe request into a valid UIDL document.
     */
    public UidlDocument compile(CompileRequestDto req) throws JsonProcessingException {
        if (req == null) {
            throw new IllegalArgumentException("Request payload cannot be null");
        }
        if (req.recipe() == null) {
            throw new IllegalArgumentException("Field 'recipe' is required");
        }
        if (req.meta() == null || req.meta().isNull() || req.meta().isMissingNode()) {
            throw new IllegalArgumentException("Field 'meta' is required");
        }

        CompilePageInput input = createCompileInput(req);
        return compiler.compilePage(input);
    }

    /**
     * Validates host capabilities against the provided recipe metadata.
     */
    public List<CapabilityIssue> validateCapabilities(ValidateRequestDto req) throws JsonProcessingException {
        if (req == null) {
            throw new IllegalArgumentException("Request payload cannot be null");
        }
        if (req.recipe() == null) {
            throw new IllegalArgumentException("Field 'recipe' is required");
        }
        if (req.meta() == null || req.meta().isNull() || req.meta().isMissingNode()) {
            throw new IllegalArgumentException("Field 'meta' is required");
        }

        CompilePageInput input = createCompileInput(new CompileRequestDto(
                req.recipe(),
                req.meta(),
                req.hostCapabilities(),
                null,
                null,
                null,
                null,
                null
        ));
        return CapabilityValidator.validate(input);
    }

    private CompilePageInput createCompileInput(CompileRequestDto req) throws JsonProcessingException {
        PageRecipe recipe = req.recipe();
        JsonNode metaNode = req.meta();
        HostCapabilities caps = req.hostCapabilities() != null ? req.hostCapabilities() : permissiveCaps(recipe, metaNode);

        return switch (recipe) {
            case LIST -> {
                ListPageMeta meta = mapper.treeToValue(metaNode, ListPageMeta.class);
                yield new CompilePageInput.ListInput(meta, caps, req.uiPolicy(), req.routePolicy());
            }
            case FORM -> {
                FormPageMeta meta = mapper.treeToValue(metaNode, FormPageMeta.class);
                String recordId = req.recordId() != null && !req.recordId().isBlank() ? req.recordId() : "new";
                yield new CompilePageInput.FormInput(
                        meta,
                        recordId,
                        caps,
                        req.uiPolicy(),
                        req.routePolicy(),
                        req.listRoute(),
                        null,
                        null,
                        null,
                        null,
                        null
                );
            }
            case REPORT -> {
                ReportPageMeta meta = mapper.treeToValue(metaNode, ReportPageMeta.class);
                yield new CompilePageInput.ReportInput(meta, caps, req.uiPolicy(), req.routePolicy());
            }
            case DASHBOARD -> {
                DashboardPageMeta meta = mapper.treeToValue(metaNode, DashboardPageMeta.class);
                yield new CompilePageInput.DashboardInput(meta, caps, req.uiPolicy(), req.routePolicy());
            }
            case SETTINGS -> {
                SettingsPageMeta meta = mapper.treeToValue(metaNode, SettingsPageMeta.class);
                yield new CompilePageInput.SettingsInput(meta, caps, req.uiPolicy(), req.routePolicy());
            }
            case TREE -> {
                TreePageMeta meta = mapper.treeToValue(metaNode, TreePageMeta.class);
                yield new CompilePageInput.TreeInput(meta, caps, req.uiPolicy(), req.routePolicy());
            }
            case WIZARD -> {
                WizardPageMeta meta = mapper.treeToValue(metaNode, WizardPageMeta.class);
                yield new CompilePageInput.WizardInput(meta, caps, req.uiPolicy(), req.routePolicy());
            }
        };
    }

    /**
     * Builds a permissive HostCapabilities that auto-allows the meta's own collection name.
     * Used only when the caller omits hostCapabilities entirely.
     */
    private HostCapabilities permissiveCaps(PageRecipe recipe, JsonNode metaNode) {
        String name = metaNode.has("name") ? metaNode.get("name").asText("") : "";
        if (!name.isBlank()) {
            return new HostCapabilities(List.of(name), List.of());
        }
        return PERMISSIVE_CAPS;
    }
}
