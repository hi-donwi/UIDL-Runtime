package dev.uidl.generator.compiler;

import java.util.*;

import dev.uidl.generator.id.SemanticNodeId;
import dev.uidl.generator.model.*;
import dev.uidl.generator.policy.RoutePolicy;
import dev.uidl.generator.uidl.UidlDocument;
import dev.uidl.generator.uidl.UidlNode;
import dev.uidl.generator.uidl.UidlNodeBuilder;
import dev.uidl.generator.validation.CapabilityValidator;

import static dev.uidl.generator.uidl.UidlNodeBuilder.node;

/**
 * Compiles a {@link FormPageMeta} into a UIDL document containing:
 * <ul>
 *   <li>Page header with title and optional workflow transition buttons</li>
 *   <li>Two-column form rows grouped by section</li>
 *   <li>Child tables (if any)</li>
 *   <li>Form error display</li>
 *   <li>Action footer (Cancel, Save) with mutate bindings</li>
 * </ul>
 *
 * <p>Port of {@code compileFormPage()} from {@code packages/core/src/compiler/form.ts}.
 */
public final class FormCompiler {

    private static final String BORDER_COLOR = "{primitives.color.border}";
    private static final String TEXT_SECONDARY = "{primitives.color.text-secondary}";

    private static final Set<String> BOXED_CONTROLS = Set.of("TextField", "Textarea", "Select");
    private static final Set<String> NAMEABLE_CONTROLS = Set.of(
            "TextField", "Textarea", "Select", "RadioGroup", "Checkbox", "Switch", "Slider");

    private FormCompiler() {}

    public static UidlDocument compile(CompilePageInput.FormInput input) {
        var issues = CapabilityValidator.validate(input);
        if (!issues.isEmpty()) {
            throw new IllegalArgumentException(
                    "compileFormPage: hostCapabilities rejected: " +
                    issues.stream().map(i -> i.message()).reduce((a, b) -> a + "; " + b).orElse(""));
        }

        var meta = input.meta();
        String recordId = input.recordId() != null ? input.recordId() : "new";
        boolean isNew = "new".equals(recordId);
        String lang = (input.uiPolicy() != null && input.uiPolicy().lang() != null)
                ? input.uiPolicy().lang() : "id";

        String docId = "form-" + meta.name().toLowerCase() + "-" + recordId.toLowerCase();
        var routePolicy = input.routePolicy() != null ? input.routePolicy() : RoutePolicy.DEFAULT;
        String listBase = routePolicy.listBase() != null ? routePolicy.listBase() : "/app/list";
        String listRoute = input.listRoute() != null
                ? input.listRoute()
                : (listBase + "/" + meta.name()).replace("//", "/");

        String title;
        if (isNew) {
            String labelStr = "id".equals(lang) ? meta.label().id() : meta.label().en();
            if (labelStr == null || labelStr.isBlank()) {
                labelStr = meta.label().en() != null ? meta.label().en() : meta.name();
            }
            title = "id".equals(lang) ? "Buat " + labelStr : "New " + labelStr;
        } else {
            String labelStr = "id".equals(lang) ? meta.label().id() : meta.label().en();
            if (labelStr == null || labelStr.isBlank()) {
                labelStr = meta.label().en() != null ? meta.label().en() : meta.name();
            }
            title = labelStr + " (" + recordId + ")";
        }

        // --- State ---
        var state = new LinkedHashMap<String, Object>();
        state.put("id", isNew ? "" : recordId);
        state.put("formErrors", new LinkedHashMap<String, Object>());
        state.put("formError", "");
        state.put("formStatus", "idle");
        state.put("savedRecord", null);

        var metaMap = new LinkedHashMap<String, Object>();
        if (input.initialVersion() != null) {
            metaMap.put("version", input.initialVersion());
        }
        state.put("_meta", metaMap);

        var initialData = input.initialData() != null ? input.initialData() : Collections.<String, Object>emptyMap();

        for (var field : meta.fields()) {
            if ("id".equals(field.key())) continue;
            if (field.widget() == FieldWidget.TABLE) continue;

            if (initialData.containsKey(field.key())) {
                state.put(field.key(), initialData.get(field.key()));
            } else if (field.defaultValue() != null) {
                state.put(field.key(), field.defaultValue());
            } else if (field.widget() == FieldWidget.CHECKBOX || field.widget() == FieldWidget.SWITCH) {
                state.put(field.key(), false);
            } else if (field.widget() == FieldWidget.CURRENCY) {
                state.put(field.key(), 0);
            } else {
                state.put(field.key(), "");
            }
        }

        if (meta.states() != null) {
            var states = meta.states();
            Object val = initialData.containsKey(states.field())
                    ? initialData.get(states.field())
                    : states.initial();
            state.put(states.field(), val);
        }

        // --- DataSources for Link fields ---
        var dataSources = new LinkedHashMap<String, Object>();
        for (var field : meta.fields()) {
            if (field.widget() == FieldWidget.LINK && field.linkTarget() != null) {
                String linkDoctype = field.linkTarget().doctype();
                String dsKey = "link_" + field.key();
                var pageMap = new LinkedHashMap<String, Object>();
                pageMap.put("size", 50);
                var queryMap = new LinkedHashMap<String, Object>();
                queryMap.put("collection", linkDoctype);
                queryMap.put("page", pageMap);
                var rootDs = new LinkedHashMap<String, Object>();
                rootDs.put("$query", queryMap);
                dataSources.put(dsKey, rootDs);
            }
        }

        // --- Group fields by section ---
        var sectionsMap = new LinkedHashMap<String, List<FieldMeta>>();
        for (var field : meta.fields()) {
            if (field.widget() == FieldWidget.TABLE) continue;
            String sec = field.section() != null ? field.section() : "";
            sectionsMap.computeIfAbsent(sec, k -> new ArrayList<>()).add(field);
        }

        var formContentNodes = new ArrayList<UidlNode>();
        for (var entry : sectionsMap.entrySet()) {
            String sectionName = entry.getKey();
            if (!sectionName.trim().isEmpty()) {
                String secId = "section-" + sectionName.toLowerCase().replaceAll("\\s+", "-");
                formContentNodes.add(sectionHeader(secId, sectionName));
            }
            for (var field : entry.getValue()) {
                String fieldLabelStr = "id".equals(lang) ? field.label().id() : field.label().en();
                if (fieldLabelStr == null || fieldLabelStr.isBlank()) {
                    fieldLabelStr = field.label().en() != null ? field.label().en() : field.key();
                }
                String fullLabel = fieldLabelStr + (Boolean.TRUE.equals(field.required()) ? " *" : "");
                var control = buildFormControlNode(field, lang, meta);
                formContentNodes.add(formRow("row-" + field.key(), fullLabel, control));
            }
        }

        // --- Child tables ---
        var childTableNodes = new ArrayList<UidlNode>();
        boolean hasChildTables = meta.childTables() != null && !meta.childTables().isEmpty();
        if (hasChildTables) {
            for (var childTable : meta.childTables()) {
                var childField = meta.fields().stream()
                        .filter(f -> f.key().equals(childTable.field()))
                        .findFirst()
                        .orElse(null);
                String childLabel = childTable.field();
                if (childField != null) {
                    childLabel = "id".equals(lang) ? childField.label().id() : childField.label().en();
                    if (childLabel == null) childLabel = childField.label().en();
                }
                var style = new LinkedHashMap<String, Object>();
                style.put("width", "w-full");
                style.put("borderWidth", "border-b");
                style.put("borderColor", BORDER_COLOR);

                var props = new LinkedHashMap<String, Object>();
                props.put("title", childLabel);
                props.put("dataSource", childTable.field());
                props.put("paginate", false);

                childTableNodes.add(node("child-table-" + childTable.field(), "DataTable")
                        .props(props)
                        .style(style)
                        .build());
            }
        }

        // --- Transition buttons ---
        var transitionButtons = new ArrayList<UidlNode>();
        if (!isNew && meta.states() != null) {
            for (var tr : meta.states().transitions()) {
                transitionButtons.add(buildTransitionButton(meta, tr, lang));
            }
        }

        var headerActions = new ArrayList<UidlNode>();
        if (input.extraHeaderActions() != null) {
            headerActions.addAll(input.extraHeaderActions());
        }
        headerActions.addAll(transitionButtons);

        // --- Footer actions ---
        var footerActions = new ArrayList<UidlNode>();
        footerActions.add(buttonNode("cancel-btn", "id".equals(lang) ? "Batal" : "Cancel", listRoute, "secondary"));
        if (input.extraFormActions() != null) {
            footerActions.addAll(input.extraFormActions());
        }
        footerActions.add(buildSaveButton(meta, isNew, listRoute, lang));

        boolean useFullWidth = Boolean.TRUE.equals(input.useFullWidth()) ||
                (hasChildTables && input.useFullWidth() == null);

        var headerNode = pageHeader(title, headerActions);

        var footerStyle = new LinkedHashMap<String, Object>();
        footerStyle.put("display", "flex");
        footerStyle.put("justifyContent", "end");
        footerStyle.put("alignItems", "center");
        footerStyle.put("gap", "gap-2");
        footerStyle.put("padding", "p-4");

        var formFooterNode = node("form-actions", "Toolbar")
                .style(footerStyle)
                .children(footerActions)
                .build();

        var errorStyle = new LinkedHashMap<String, Object>();
        errorStyle.put("padding", "px-4");
        errorStyle.put("color", "{primitives.color.error}");

        var errorNode = node("form-error", "Text")
                .props(Map.of("value", Map.of("$bind", "state.formError")))
                .style(errorStyle)
                .visibility(Map.of("condition", Map.of("!=", List.of(Map.of("path", "state.formError"), Map.of("literal", "")))))
                .build();

        UidlNode rootNode;
        if (useFullWidth) {
            var formStyle = new LinkedHashMap<String, Object>();
            formStyle.put("display", "flex");
            formStyle.put("flexDirection", "column");

            var formChildren = new ArrayList<UidlNode>(formContentNodes);
            formChildren.addAll(childTableNodes);

            var formNode = node("form", "Form")
                    .style(formStyle)
                    .children(formChildren)
                    .build();

            rootNode = formPageWrapper(List.of(headerNode, formNode, errorNode, formFooterNode), true);
        } else {
            var shellChildren = new ArrayList<UidlNode>();
            shellChildren.add(headerNode);
            shellChildren.addAll(formContentNodes);
            shellChildren.addAll(childTableNodes);
            shellChildren.add(errorNode);
            shellChildren.add(formFooterNode);

            rootNode = formPageWrapper(List.of(formShell(shellChildren)), false);
        }

        return new UidlDocument(
                UidlDocument.SPEC_VERSION,
                docId,
                title,
                listRoute,
                null,
                state,
                dataSources.isEmpty() ? null : dataSources,
                null,
                rootNode
        );
    }

    private static UidlNode formPageWrapper(List<UidlNode> children, boolean fullWidth) {
        var style = new LinkedHashMap<String, Object>();
        style.put("display", "flex");
        style.put("flexDirection", "column");
        if (!fullWidth) {
            style.put("alignItems", "center");
            style.put("paddingTop", "pt-4");
        }
        style.put("width", "w-full");
        style.put("minHeight", "min-h-full");
        style.put("background", "{primitives.color.surface}");
        style.put("fontSize", "text-base");

        return node("page", "Column")
                .style(style)
                .children(children)
                .build();
    }

    private static UidlNode formShell(List<UidlNode> children) {
        var style = new LinkedHashMap<String, Object>();
        style.put("display", "flex");
        style.put("flexDirection", "column");
        style.put("width", "w-form");
        style.put("maxWidth", "max-w-full");
        style.put("margin", "mx-4 mb-4");
        style.put("background", "{primitives.color.surface-elevated}");
        style.put("borderWidth", "border");
        style.put("borderColor", BORDER_COLOR);
        style.put("borderRadius", "rounded-lg");
        style.put("shadow", "{primitives.shadow.lg}");

        return node("form-shell", "Form")
                .style(style)
                .children(children)
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

        var titleProps = new LinkedHashMap<String, Object>();
        titleProps.put("value", title);
        titleProps.put("heading", 1);

        var titleStyle = new LinkedHashMap<String, Object>();
        titleStyle.put("fontSize", "text-xl");
        titleStyle.put("fontWeight", 600);

        var titleNode = node("form-header-title", "Text")
                .props(titleProps)
                .style(titleStyle)
                .build();

        var actionsStyle = new LinkedHashMap<String, Object>();
        actionsStyle.put("display", "flex");
        actionsStyle.put("gap", "gap-2");

        var actionsNode = node("form-header-actions", "Toolbar")
                .style(actionsStyle)
                .children(actions)
                .build();

        return node("form-header", "Navbar")
                .style(style)
                .children(List.of(titleNode, actionsNode))
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
                .children(List.of(nameControl(unboxControl(control), label)))
                .build();

        return node(id, "Row")
                .props(Map.of("style", gridProps))
                .style(rowStyle)
                .children(List.of(labelNode, controlColumn))
                .build();
    }

    private static UidlNode unboxControl(UidlNode control) {
        if (BOXED_CONTROLS.contains(control.type())) {
            var props = new LinkedHashMap<String, Object>();
            props.put("border", false);
            props.put("size", "small");
            if (control.props() != null) {
                props.putAll(control.props());
            }
            return new UidlNode(control.id(), control.type(), control.name(), props, control.style(), control.children(), control.slots(), control.bindings(), control.events(), control.visibility(), control.repeat(), control.componentId(), control.testId());
        }
        if (control.children() == null || control.children().isEmpty()) {
            return control;
        }
        var newChildren = control.children().stream().map(FormCompiler::unboxControl).toList();
        return new UidlNode(control.id(), control.type(), control.name(), control.props(), control.style(), newChildren, control.slots(), control.bindings(), control.events(), control.visibility(), control.repeat(), control.componentId(), control.testId());
    }

    private static UidlNode nameControl(UidlNode control, String label) {
        if (NAMEABLE_CONTROLS.contains(control.type())) {
            var props = control.props() != null ? new LinkedHashMap<>(control.props()) : new LinkedHashMap<String, Object>();
            if (props.containsKey("aria-label") || props.containsKey("label")) {
                return control;
            }
            props.put("aria-label", label);
            return new UidlNode(control.id(), control.type(), control.name(), props, control.style(), control.children(), control.slots(), control.bindings(), control.events(), control.visibility(), control.repeat(), control.componentId(), control.testId());
        }
        if (control.children() == null || control.children().isEmpty()) {
            return control;
        }
        boolean named = false;
        var newChildren = new ArrayList<UidlNode>();
        for (var child : control.children()) {
            if (named) {
                newChildren.add(child);
            } else {
                var res = nameControl(child, label);
                if (res != child) named = true;
                newChildren.add(res);
            }
        }
        return named
                ? new UidlNode(control.id(), control.type(), control.name(), control.props(), control.style(), newChildren, control.slots(), control.bindings(), control.events(), control.visibility(), control.repeat(), control.componentId(), control.testId())
                : control;
    }

    private static UidlNode buildFormControlNode(FieldMeta field, String lang, FormPageMeta meta) {
        boolean isCheckbox = field.widget() == FieldWidget.CHECKBOX || field.widget() == FieldWidget.SWITCH;
        boolean isReadOnly = Boolean.TRUE.equals(field.readOnly());

        var baseProps = new LinkedHashMap<String, Object>();
        if (!isCheckbox) {
            baseProps.put("size", "small");
            baseProps.put("error", Map.of("$bind", "state.formErrors." + field.key()));
        }
        if (isReadOnly) {
            baseProps.put("disabled", true);
        }

        String fieldId = SemanticNodeId.fieldId("form", meta.name(), field.key());

        if (isCheckbox) {
            var props = new LinkedHashMap<>(baseProps);
            props.put("checked", Map.of("$bind", "state." + field.key()));
            return node(fieldId, field.widget().value())
                    .props(props)
                    .events(changeEvent(field.key()))
                    .build();
        }

        if (field.widget() == FieldWidget.SELECT || field.widget() == FieldWidget.RADIO_GROUP) {
            List<Map<String, String>> optionsList = new ArrayList<>();
            if (field.options() != null && !field.options().isEmpty()) {
                for (var opt : field.options()) {
                    optionsList.add(Map.of("value", opt.value(), "label", opt.label()));
                }
            } else if (meta.states() != null && field.key().equals(meta.states().field())) {
                for (var v : meta.states().values()) {
                    optionsList.add(Map.of("value", v, "label", v));
                }
            }
            var props = new LinkedHashMap<>(baseProps);
            props.put("value", Map.of("$bind", "state." + field.key()));
            props.put("options", optionsList);
            return node(fieldId, field.widget().value())
                    .props(props)
                    .events(changeEvent(field.key()))
                    .build();
        }

        if (field.widget() == FieldWidget.LINK) {
            if (field.linkTarget() != null) {
                String dsKey = "link_" + field.key();
                var linkTarget = field.linkTarget();
                String linkValueKey = linkTarget.valueKey() != null ? linkTarget.valueKey() : "id";
                String linkLabelKey = linkTarget.labelKey() != null ? linkTarget.labelKey() : "name";

                String placeholder = field.placeholder() != null
                        ? field.placeholder()
                        : ("Select " + (field.label() != null && field.label().en() != null ? field.label().en() : field.key()));

                var selectProps = new LinkedHashMap<>(baseProps);
                selectProps.put("value", Map.of("$bind", "state." + field.key()));
                selectProps.put("options", Map.of("$bind", "state.$data." + dsKey + ".rows"));
                selectProps.put("optionValueKey", linkValueKey);
                selectProps.put("optionLabelKey", linkLabelKey);
                selectProps.put("placeholder", placeholder);

                var selectNode = node(fieldId + "-select", "Select")
                        .props(selectProps)
                        .events(changeEvent(field.key()))
                        .build();

                var loadingNode = node(fieldId + "-loading", "Text")
                        .props(Map.of("value", "Loading…"))
                        .style(Map.of("fontSize", "text-xs", "color", TEXT_SECONDARY))
                        .visibility(Map.of("condition", Map.of("==", List.of(Map.of("path", "state.$data." + dsKey + ".status"), Map.of("literal", "loading")))))
                        .build();

                var errorNode = node(fieldId + "-error", "Text")
                        .props(Map.of("value", "Failed to load options"))
                        .style(Map.of("fontSize", "text-xs", "color", "{primitives.color.error}"))
                        .visibility(Map.of("condition", Map.of("==", List.of(Map.of("path", "state.$data." + dsKey + ".status"), Map.of("literal", "error")))))
                        .build();

                var emptyNode = node(fieldId + "-empty", "Text")
                        .props(Map.of("value", "No options"))
                        .style(Map.of("fontSize", "text-xs", "color", TEXT_SECONDARY))
                        .visibility(Map.of("condition", Map.of("and", List.of(
                                Map.of("==", List.of(Map.of("path", "state.$data." + dsKey + ".status"), Map.of("literal", "success"))),
                                Map.of("==", List.of(Map.of("path", "state.$data." + dsKey + ".rows.length"), Map.of("literal", 0)))
                        ))))
                        .build();

                var colStyle = new LinkedHashMap<String, Object>();
                colStyle.put("display", "flex");
                colStyle.put("flexDirection", "column");
                colStyle.put("gap", "gap-1");

                return node(fieldId, "Column")
                        .style(colStyle)
                        .children(List.of(selectNode, loadingNode, errorNode, emptyNode))
                        .build();
            }

            var props = new LinkedHashMap<>(baseProps);
            props.put("value", Map.of("$bind", "state." + field.key()));
            props.put("options", Collections.emptyList());
            return node(fieldId, "Select")
                    .props(props)
                    .events(changeEvent(field.key()))
                    .build();
        }

        String customPlaceholder = field.placeholder() != null ? field.placeholder() : "";

        if (field.widget() == FieldWidget.TEXTAREA) {
            var props = new LinkedHashMap<>(baseProps);
            props.put("value", Map.of("$bind", "state." + field.key()));
            props.put("placeholder", customPlaceholder);
            return node(fieldId, "Textarea")
                    .props(props)
                    .events(changeEvent(field.key()))
                    .build();
        }

        if (field.widget() == FieldWidget.CURRENCY) {
            var props = new LinkedHashMap<>(baseProps);
            props.put("value", Map.of("$bind", "state." + field.key()));
            props.put("placeholder", customPlaceholder.isEmpty() ? "0" : customPlaceholder);
            return node(fieldId, "TextField")
                    .props(props)
                    .events(changeEvent(field.key()))
                    .build();
        }

        if (field.widget() == FieldWidget.DATE) {
            var props = new LinkedHashMap<>(baseProps);
            props.put("value", Map.of("$bind", "state." + field.key()));
            props.put("placeholder", customPlaceholder.isEmpty() ? "YYYY-MM-DD" : customPlaceholder);
            return node(fieldId, "TextField")
                    .props(props)
                    .events(changeEvent(field.key()))
                    .build();
        }

        if (field.widget() == FieldWidget.SLIDER) {
            var props = new LinkedHashMap<>(baseProps);
            props.put("value", Map.of("$bind", "state." + field.key()));
            return node(fieldId, "Slider")
                    .props(props)
                    .events(changeEvent(field.key()))
                    .build();
        }

        var props = new LinkedHashMap<>(baseProps);
        props.put("value", Map.of("$bind", "state." + field.key()));
        props.put("placeholder", customPlaceholder);
        return node(fieldId, "TextField")
                .props(props)
                .events(changeEvent(field.key()))
                .build();
    }

    private static Map<String, Object> changeEvent(String path) {
        var map = new LinkedHashMap<String, Object>();
        map.put("onChange", List.of(Collections.singletonMap("setState", createSetStateMap(path, null))));
        return map;
    }

    private static Map<String, Object> createSetStateMap(String path, Object value) {
        var map = new LinkedHashMap<String, Object>();
        map.put("path", path);
        map.put("value", value);
        return map;
    }

    private static UidlNode buttonNode(String id, String label, String route, String variant) {
        var props = new LinkedHashMap<String, Object>();
        props.put("label", label);
        props.put("variant", variant);

        var events = new LinkedHashMap<String, Object>();
        events.put("onClick", List.of(Collections.singletonMap("navigate", Collections.singletonMap("route", route))));
        return node(id, "Button")
                .props(props)
                .events(events)
                .build();
    }

    private static UidlNode buildSaveButton(FormPageMeta meta, boolean isNew, String listRoute, String lang) {
        String label = "id".equals(lang) ? "Simpan" : "Save";
        var mutate = new LinkedHashMap<String, Object>();
        mutate.put("operation", isNew ? "create" : "update");
        mutate.put("collection", meta.name());
        if (!isNew) {
            mutate.put("id", Map.of("$expr", Map.of("path", "state.id")));
        }
        mutate.put("payload", buildFormPayload(meta));
        mutate.put("version", Map.of("$expr", Map.of("path", "state._meta.version")));
        mutate.put("statusPath", "formStatus");
        mutate.put("resultPath", "savedRecord");
        mutate.put("errorPath", "formError");
        mutate.put("fieldErrorsPath", "formErrors");
        mutate.put("onSuccess", Map.of("navigate", Map.of("route", listRoute)));

        var props = new LinkedHashMap<String, Object>();
        props.put("label", label);
        props.put("variant", "primary");

        return node("save-btn", "Button")
                .props(props)
                .events(Map.of("onClick", List.of(Map.of("mutate", mutate))))
                .build();
    }

    private static Map<String, Object> buildFormPayload(FormPageMeta meta) {
        var payload = new LinkedHashMap<String, Object>();
        for (var field : meta.fields()) {
            if ("id".equals(field.key())) continue;
            if (field.widget() == FieldWidget.TABLE) continue;
            payload.put(field.key(), Map.of("$expr", Map.of("path", "state." + field.key())));
        }
        return payload;
    }

    private static UidlNode buildTransitionButton(FormPageMeta meta, StateTransition transition, String lang) {
        var states = meta.states();
        String label = "id".equals(lang) && transition.label().id() != null
                ? transition.label().id()
                : (transition.label().en() != null ? transition.label().en() : transition.name());
        boolean isPrimary = "submit".equals(transition.name());

        var mutate = new LinkedHashMap<String, Object>();
        mutate.put("operation", "transition");
        mutate.put("collection", meta.name());
        mutate.put("id", Map.of("$expr", Map.of("path", "state.id")));
        mutate.put("transition", transition.name());
        mutate.put("version", Map.of("$expr", Map.of("path", "state._meta.version")));
        mutate.put("statusPath", "formStatus");
        mutate.put("resultPath", "savedRecord");
        mutate.put("errorPath", "formError");
        mutate.put("fieldErrorsPath", "formErrors");

        var onSuccessSeq = List.of(
                Map.of("setState", createSetStateMap(states.field(), Map.of("$bind", "event.record." + states.field()))),
                Map.of("setState", createSetStateMap("_meta.version", Map.of("$bind", "event.meta.version")))
        );
        mutate.put("onSuccess", Collections.singletonMap("sequence", (Object) onSuccessSeq));

        Map<String, Object> condition;
        if (transition.from().size() == 1) {
            condition = Map.of("==", List.of(Map.of("path", "state." + states.field()), Map.of("literal", transition.from().get(0))));
        } else {
            var orList = transition.from().stream()
                    .map(f -> Map.of("==", List.of(Map.of("path", "state." + states.field()), Map.of("literal", f))))
                    .toList();
            condition = Map.of("or", orList);
        }

        var props = new LinkedHashMap<String, Object>();
        props.put("label", label);
        props.put("variant", isPrimary ? "primary" : "secondary");

        return node("transition-" + transition.name(), "Button")
                .props(props)
                .events(Map.of("onClick", List.of(Map.of("mutate", mutate))))
                .visibility(Map.of("condition", condition))
                .build();
    }
}
