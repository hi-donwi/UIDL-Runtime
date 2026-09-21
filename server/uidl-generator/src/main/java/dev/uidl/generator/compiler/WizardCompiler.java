package dev.uidl.generator.compiler;

import java.util.*;

import dev.uidl.generator.id.SemanticNodeId;
import dev.uidl.generator.model.FieldMeta;
import dev.uidl.generator.model.FieldWidget;
import dev.uidl.generator.model.WizardPageMeta;
import dev.uidl.generator.model.WizardStep;
import dev.uidl.generator.uidl.UidlDocument;
import dev.uidl.generator.uidl.UidlNode;
import dev.uidl.generator.validation.CapabilityValidator;

import static dev.uidl.generator.uidl.UidlNodeBuilder.node;

/**
 * Compiles a {@link WizardPageMeta} into a UIDL document containing:
 * <ul>
 *   <li>Page header with title</li>
 *   <li>Step progress badges (stepper)</li>
 *   <li>Per-step field panels with visibility conditions on {@code state.currentStep}</li>
 *   <li>Navigation buttons (Back, Next, Submit mutate)</li>
 * </ul>
 *
 * <p>Port of {@code compileWizardPage()} from {@code packages/core/src/compiler/wizard.ts}.
 */
public final class WizardCompiler {

    private static final String BORDER_COLOR = "{primitives.color.border}";

    private WizardCompiler() {}

    public static UidlDocument compile(CompilePageInput.WizardInput input) {
        var issues = CapabilityValidator.validate(input);
        if (!issues.isEmpty()) {
            throw new IllegalArgumentException(
                    "compileWizardPage: hostCapabilities rejected: " +
                    issues.stream().map(i -> i.message()).reduce((a, b) -> a + "; " + b).orElse(""));
        }

        var meta = input.meta();
        String lang = (input.uiPolicy() != null && input.uiPolicy().lang() != null)
                ? input.uiPolicy().lang() : "id";

        String docId = "wizard-" + meta.name().toLowerCase();
        String title = "id".equals(lang) && meta.label().id() != null
                ? meta.label().id()
                : (meta.label().en() != null ? meta.label().en() : meta.name());

        var state = new LinkedHashMap<String, Object>();
        state.put("currentStep", 0);
        state.put("formErrors", new LinkedHashMap<String, Object>());
        state.put("formError", "");

        for (var step : meta.steps()) {
            for (var field : step.fields()) {
                state.put(field.key(), field.defaultValue() != null ? field.defaultValue() : "");
            }
        }

        // Stepper Badges
        var stepperChildren = new ArrayList<UidlNode>();
        for (int i = 0; i < meta.steps().size(); i++) {
            var step = meta.steps().get(i);
            String stepLabel = "id".equals(lang) && step.label().id() != null
                    ? step.label().id()
                    : (step.label().en() != null ? step.label().en() : step.id());

            var badgeProps = new LinkedHashMap<String, Object>();
            badgeProps.put("label", stepLabel);
            badgeProps.put("color", i == 0 ? "blue" : "gray");
            badgeProps.put("variant", "pill");

            stepperChildren.add(node("wizard-step-" + step.id(), "Badge")
                    .props(badgeProps)
                    .build());
        }

        var stepperNode = node("wizard-stepper", "Toolbar")
                .style(Map.of("display", "flex", "gap", "gap-2", "padding", "p-4", "borderWidth", "border-b", "borderColor", BORDER_COLOR))
                .children(stepperChildren)
                .build();

        // Step Panels
        var stepPanels = new ArrayList<UidlNode>();
        for (int idx = 0; idx < meta.steps().size(); idx++) {
            var step = meta.steps().get(idx);
            String stepTitle = "id".equals(lang) && step.label().id() != null
                    ? step.label().id()
                    : (step.label().en() != null ? step.label().en() : step.id());

            var panelChildren = new ArrayList<UidlNode>();
            panelChildren.add(node("wizard-panel-" + step.id() + "-title", "Text")
                    .props(Map.of("value", stepTitle, "heading", 2))
                    .style(Map.of("fontSize", "text-lg", "fontWeight", 600))
                    .build());

            for (var field : step.fields()) {
                var control = buildFieldNode(field, meta.name());
                String fieldLabelStr = "id".equals(lang) && field.label().id() != null
                        ? field.label().id()
                        : (field.label().en() != null ? field.label().en() : field.key());

                panelChildren.add(node("wizard-row-" + field.key(), "Row")
                        .style(Map.of("display", "flex", "gap", "gap-4", "alignItems", "center"))
                        .children(List.of(
                                node("wizard-row-" + field.key() + "-label", "Text")
                                        .props(Map.of("value", fieldLabelStr))
                                        .style(Map.of("width", "w-1/3", "fontSize", "text-sm"))
                                        .build(),
                                node("wizard-row-" + field.key() + "-control", "Container")
                                        .style(Map.of("width", "w-2/3"))
                                        .children(List.of(control))
                                        .build()
                        ))
                        .build());
            }

            stepPanels.add(node("wizard-panel-" + step.id(), "Column")
                    .style(Map.of("gap", "gap-4", "padding", "p-4"))
                    .children(panelChildren)
                    .visibility(Map.of("condition", Map.of("==", List.of(Map.of("path", "state.currentStep"), Map.of("literal", idx)))))
                    .build());
        }

        // Navigation Bar
        var navChildren = new ArrayList<UidlNode>();

        var prevBtn = node("wizard-prev-btn", "Button")
                .props(Map.of("label", "id".equals(lang) ? "Kembali" : "Back", "variant", "secondary"))
                .events(Map.of("onClick", List.of(Collections.singletonMap("setState", Map.of("path", "currentStep", "value", Map.of("$expr", Map.of("path", "state.currentStep - 1")))))))
                .build();
        navChildren.add(prevBtn);

        var nextBtn = node("wizard-next-btn", "Button")
                .props(Map.of("label", "id".equals(lang) ? "Lanjut" : "Next", "variant", "secondary"))
                .events(Map.of("onClick", List.of(Collections.singletonMap("setState", Map.of("path", "currentStep", "value", Map.of("$expr", Map.of("path", "state.currentStep + 1")))))))
                .visibility(Map.of("condition", Map.of("<", List.of(Map.of("path", "state.currentStep"), Map.of("literal", meta.steps().size() - 1)))))
                .build();
        navChildren.add(nextBtn);

        var mutatePayload = new LinkedHashMap<String, Object>();
        for (var step : meta.steps()) {
            for (var f : step.fields()) {
                mutatePayload.put(f.key(), Map.of("$expr", Map.of("path", "state." + f.key())));
            }
        }

        var mutateMap = new LinkedHashMap<String, Object>();
        mutateMap.put("operation", "create");
        mutateMap.put("collection", meta.name());
        mutateMap.put("payload", mutatePayload);
        mutateMap.put("statusPath", "formStatus");
        mutateMap.put("errorPath", "formError");
        mutateMap.put("fieldErrorsPath", "formErrors");

        var submitBtn = node("wizard-submit-btn", "Button")
                .props(Map.of("label", "id".equals(lang) ? "Selesai" : "Submit", "variant", "primary"))
                .events(Map.of("onClick", List.of(Collections.singletonMap("mutate", mutateMap))))
                .visibility(Map.of("condition", Map.of("==", List.of(Map.of("path", "state.currentStep"), Map.of("literal", meta.steps().size() - 1)))))
                .build();
        navChildren.add(submitBtn);

        var navNode = node("wizard-nav", "Toolbar")
                .style(Map.of("display", "flex", "justifyContent", "space-between", "padding", "p-4", "borderWidth", "border-t", "borderColor", BORDER_COLOR))
                .children(navChildren)
                .build();

        var errorNode = node("wizard-error", "Text")
                .props(Map.of("value", Map.of("$bind", "state.formError")))
                .style(Map.of("padding", "px-4", "color", "{primitives.color.error}"))
                .visibility(Map.of("condition", Map.of("!=", List.of(Map.of("path", "state.formError"), Map.of("literal", "")))))
                .build();

        var pageChildren = new ArrayList<UidlNode>();
        pageChildren.add(pageHeader(title, Collections.emptyList()));
        pageChildren.add(stepperNode);
        pageChildren.addAll(stepPanels);
        pageChildren.add(errorNode);
        pageChildren.add(navNode);

        var pageRoot = node("page", "Column")
                .style(Map.of("fontSize", "text-base", "width", "w-full"))
                .children(pageChildren)
                .build();

        return new UidlDocument(
                UidlDocument.SPEC_VERSION,
                docId,
                title,
                "/app/wizard/" + meta.name(),
                null,
                state,
                null,
                null,
                pageRoot
        );
    }

    private static UidlNode buildFieldNode(FieldMeta field, String metaName) {
        String id = SemanticNodeId.fieldId("wizard", metaName, field.key());
        var baseProps = new LinkedHashMap<String, Object>();

        if (field.widget() == FieldWidget.CHECKBOX || field.widget() == FieldWidget.SWITCH) {
            var props = new LinkedHashMap<>(baseProps);
            props.put("checked", Map.of("$bind", "state." + field.key()));
            return node(id, field.widget().value())
                    .props(props)
                    .events(changeEvent(field.key()))
                    .build();
        }

        if (field.widget() == FieldWidget.SELECT || field.widget() == FieldWidget.RADIO_GROUP) {
            var props = new LinkedHashMap<>(baseProps);
            props.put("value", Map.of("$bind", "state." + field.key()));
            var options = new ArrayList<Map<String, String>>();
            if (field.options() != null) {
                for (var opt : field.options()) {
                    options.add(Map.of("value", opt.value(), "label", opt.label()));
                }
            }
            props.put("options", options);
            return node(id, field.widget().value())
                    .props(props)
                    .events(changeEvent(field.key()))
                    .build();
        }

        if (field.widget() == FieldWidget.TEXTAREA) {
            var props = new LinkedHashMap<>(baseProps);
            props.put("value", Map.of("$bind", "state." + field.key()));
            return node(id, "Textarea")
                    .props(props)
                    .events(changeEvent(field.key()))
                    .build();
        }

        var props = new LinkedHashMap<>(baseProps);
        props.put("value", Map.of("$bind", "state." + field.key()));
        return node(id, "TextField")
                .props(props)
                .events(changeEvent(field.key()))
                .build();
    }

    private static Map<String, Object> changeEvent(String path) {
        var map = new LinkedHashMap<String, Object>();
        var setStateMap = new LinkedHashMap<String, Object>();
        setStateMap.put("path", path);
        setStateMap.put("value", null);
        map.put("onChange", List.of(Collections.singletonMap("setState", setStateMap)));
        return map;
    }

    private static UidlNode pageHeader(String title, List<UidlNode> actions) {
        var style = new LinkedHashMap<String, Object>();
        style.put("display", "flex");
        style.put("justifyContent", "space-between");
        style.put("alignItems", "center");
        style.put("padding", "px-4");
        style.put("height", "h-row-large");
        style.put("borderWidth", "border-b");
        style.put("borderColor", BORDER_COLOR);

        var titleNode = node("wizard-header-title", "Text")
                .props(Map.of("value", title, "heading", 1))
                .style(Map.of("fontSize", "text-xl", "fontWeight", 600))
                .build();

        var actionsNode = node("wizard-header-actions", "Toolbar")
                .style(Map.of("display", "flex", "gap", "gap-2"))
                .children(actions)
                .build();

        return node("wizard-header", "Navbar")
                .style(style)
                .children(List.of(titleNode, actionsNode))
                .build();
    }
}
