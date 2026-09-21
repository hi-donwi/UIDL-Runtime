package dev.uidl.generator.compiler;

import java.util.*;

import dev.uidl.generator.id.SemanticNodeId;
import dev.uidl.generator.model.FieldWidget;
import dev.uidl.generator.model.SettingsField;
import dev.uidl.generator.model.SettingsPageMeta;
import dev.uidl.generator.model.SettingsSection;
import dev.uidl.generator.uidl.UidlDocument;
import dev.uidl.generator.uidl.UidlNode;
import dev.uidl.generator.validation.CapabilityValidator;

import static dev.uidl.generator.uidl.UidlNodeBuilder.node;

/**
 * Compiles a {@link SettingsPageMeta} into a UIDL document containing:
 * <ul>
 *   <li>Page header with title and "Save Settings" command action</li>
 *   <li>Sections with section headers and two-column form rows</li>
 *   <li>Form error display</li>
 * </ul>
 *
 * <p>Port of {@code compileSettingsPage()} from {@code packages/core/src/compiler/settings.ts}.
 */
public final class SettingsCompiler {

    private static final String BORDER_COLOR = "{primitives.color.border}";
    private static final String TEXT_SECONDARY = "{primitives.color.text-secondary}";

    private SettingsCompiler() {}

    public static UidlDocument compile(CompilePageInput.SettingsInput input) {
        var issues = CapabilityValidator.validate(input);
        if (!issues.isEmpty()) {
            throw new IllegalArgumentException(
                    "compileSettingsPage: hostCapabilities rejected: " +
                    issues.stream().map(i -> i.message()).reduce((a, b) -> a + "; " + b).orElse(""));
        }

        var meta = input.meta();
        String lang = (input.uiPolicy() != null && input.uiPolicy().lang() != null)
                ? input.uiPolicy().lang() : "id";

        String docId = "settings-" + meta.name().toLowerCase();
        String title = "id".equals(lang) && meta.label().id() != null
                ? meta.label().id()
                : (meta.label().en() != null ? meta.label().en() : meta.name());

        // State
        var state = new LinkedHashMap<String, Object>();
        state.put("formErrors", new LinkedHashMap<String, Object>());
        state.put("formError", "");
        state.put("formStatus", "idle");

        for (var section : meta.sections()) {
            for (var field : section.fields()) {
                if (field.defaultValue() != null) {
                    state.put(field.key(), field.defaultValue());
                } else if (field.widget() == FieldWidget.CHECKBOX || field.widget() == FieldWidget.SWITCH) {
                    state.put(field.key(), false);
                } else {
                    state.put(field.key(), "");
                }
            }
        }

        // Save command button
        var saveCommand = new LinkedHashMap<String, Object>();
        saveCommand.put("name", "workspace.settings.save");
        saveCommand.put("payload", Map.of("settings", meta.name(), "values", Map.of("$expr", Map.of("path", "state"))));
        saveCommand.put("statusPath", "formStatus");
        saveCommand.put("errorPath", "formError");

        var saveBtn = node("settings-save-btn", "Button")
                .props(Map.of("label", "id".equals(lang) ? "Simpan Pengaturan" : "Save Settings", "variant", "primary"))
                .events(Map.of("onClick", List.of(Collections.singletonMap("command", saveCommand))))
                .build();

        var headerActions = List.of(saveBtn);
        var headerNode = pageHeader(title, headerActions);

        // Section rows
        var sectionNodes = new ArrayList<UidlNode>();
        for (var section : meta.sections()) {
            String secTitle = "id".equals(lang) && section.label().id() != null
                    ? section.label().id()
                    : (section.label().en() != null ? section.label().en() : section.id());

            sectionNodes.add(sectionHeader("section-" + section.id(), secTitle));

            for (var field : section.fields()) {
                String fieldLabelStr = "id".equals(lang) && field.label().id() != null
                        ? field.label().id()
                        : (field.label().en() != null ? field.label().en() : field.key());
                String fullLabel = fieldLabelStr + (Boolean.TRUE.equals(field.required()) ? " *" : "");
                var control = buildFieldControl(field, meta.name());
                sectionNodes.add(formRow("row-" + field.key(), fullLabel, control));
            }
        }

        if (sectionNodes.isEmpty()) {
            sectionNodes.add(node("settings-empty", "Text")
                    .props(Map.of("value", "id".equals(lang) ? "Tidak ada pengaturan" : "No settings"))
                    .style(Map.of("padding", "p-4", "color", TEXT_SECONDARY))
                    .build());
        }

        var formStyle = new LinkedHashMap<String, Object>();
        formStyle.put("display", "flex");
        formStyle.put("flexDirection", "column");

        var formNode = node("settings-form", "Form")
                .style(formStyle)
                .children(sectionNodes)
                .build();

        var errorStyle = new LinkedHashMap<String, Object>();
        errorStyle.put("padding", "px-4");
        errorStyle.put("color", "{primitives.color.error}");

        var errorNode = node("settings-error", "Text")
                .props(Map.of("value", Map.of("$bind", "state.formError")))
                .style(errorStyle)
                .visibility(Map.of("condition", Map.of("!=", List.of(Map.of("path", "state.formError"), Map.of("literal", "")))))
                .build();

        var pageRoot = node("page", "Column")
                .style(Map.of("fontSize", "text-base", "width", "w-full"))
                .children(List.of(headerNode, formNode, errorNode))
                .build();

        return new UidlDocument(
                UidlDocument.SPEC_VERSION,
                docId,
                title,
                "/app/settings/" + meta.name(),
                null,
                state,
                null,
                null,
                pageRoot
        );
    }

    private static UidlNode buildFieldControl(SettingsField field, String metaName) {
        String id = SemanticNodeId.fieldId("settings", metaName, field.key());
        var baseProps = new LinkedHashMap<String, Object>();
        baseProps.put("error", Map.of("$bind", "state.formErrors." + field.key()));

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

    private static UidlNode formRow(String id, String label, UidlNode control) {
        var gridProps = new LinkedHashMap<String, Object>();
        gridProps.put("display", "grid");
        gridProps.put("gridTemplateColumns", "minmax(0, 1fr) minmax(0, 1fr)");
        gridProps.put("alignItems", "center");

        var rowStyle = new LinkedHashMap<String, Object>();
        rowStyle.put("borderWidth", "border-b");
        rowStyle.put("borderColor", BORDER_COLOR);
        rowStyle.put("minHeight", "min-h-row-mid");

        var labelStyle = new LinkedHashMap<String, Object>();
        labelStyle.put("padding", "ps-4");
        labelStyle.put("color", TEXT_SECONDARY);
        labelStyle.put("fontSize", "text-base");

        var labelNode = node(id + "-label", "Text")
                .props(Map.of("value", label))
                .style(labelStyle)
                .build();

        var controlStyle = new LinkedHashMap<String, Object>();
        controlStyle.put("padding", "py-2 pe-4");

        var controlColumn = node(id + "-control", "Column")
                .style(controlStyle)
                .children(List.of(control))
                .build();

        return node(id, "Row")
                .props(Map.of("style", gridProps))
                .style(rowStyle)
                .children(List.of(labelNode, controlColumn))
                .build();
    }

    private static UidlNode sectionHeader(String id, String title) {
        var style = new LinkedHashMap<String, Object>();
        style.put("display", "flex");
        style.put("justifyContent", "space-between");
        style.put("alignItems", "center");
        style.put("padding", "px-4 py-2.5");
        style.put("background", "{primitives.color.surface}");
        style.put("borderWidth", "border-b");
        style.put("borderColor", BORDER_COLOR);
        style.put("fontSize", "text-sm");
        style.put("fontWeight", 600);
        style.put("color", TEXT_SECONDARY);

        return node(id, "Text")
                .props(Map.of("value", title, "heading", 3))
                .style(style)
                .build();
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

        var titleNode = node("settings-header-title", "Text")
                .props(Map.of("value", title, "heading", 1))
                .style(Map.of("fontSize", "text-xl", "fontWeight", 600))
                .build();

        var actionsNode = node("settings-header-actions", "Toolbar")
                .style(Map.of("display", "flex", "gap", "gap-2"))
                .children(actions)
                .build();

        return node("settings-header", "Navbar")
                .style(style)
                .children(List.of(titleNode, actionsNode))
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
}
