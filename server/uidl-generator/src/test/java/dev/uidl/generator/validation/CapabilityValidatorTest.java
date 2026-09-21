package dev.uidl.generator.validation;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.uidl.generator.compiler.CompilePageInput;
import dev.uidl.generator.model.*;
import dev.uidl.generator.policy.HostCapabilities;
import dev.uidl.generator.policy.RoutePolicy;
import dev.uidl.generator.policy.UiPolicy;

import static org.assertj.core.api.Assertions.assertThat;

class CapabilityValidatorTest {

    private static final UiPolicy UI = UiPolicy.DEFAULT;
    private static final RoutePolicy ROUTE = RoutePolicy.DEFAULT;

    private static ListPageMeta sampleListMeta(String name) {
        return new ListPageMeta(
                name,
                new LocalizedText(name, "Invoices"),
                "title",
                List.of(new FieldMeta("title", new LocalizedText("title", "Title"),
                        FieldWidget.TEXT_FIELD, null, null, null, null, null, null, null, null)),
                List.of(new ListColumn("title")),
                null,
                new SortSpec("title", "asc"),
                null, null, null
        );
    }

    @Test
    void noIssuesWhenCollectionIsAllowlisted() {
        var caps = new HostCapabilities(List.of("invoices"), List.of(), null, null, null, null, null);
        var input = new CompilePageInput.ListInput(sampleListMeta("invoices"), caps, UI, ROUTE);
        var issues = CapabilityValidator.validate(input);
        assertThat(issues).isEmpty();
    }

    @Test
    void unknownCollectionProducesIssue() {
        var caps = new HostCapabilities(List.of("customers"), List.of(), null, null, null, null, null);
        var input = new CompilePageInput.ListInput(sampleListMeta("invoices"), caps, UI, ROUTE);
        var issues = CapabilityValidator.validate(input);
        assertThat(issues).hasSize(1);
        assertThat(issues.get(0).code()).isEqualTo(CapabilityIssue.Code.UNKNOWN_COLLECTION);
        assertThat(issues.get(0).path()).isEqualTo("meta.name");
    }

    @Test
    void pageSizeLimitExceededProducesIssue() {
        var caps = new HostCapabilities(
                List.of("invoices"), List.of(), null, null, null, null,
                new HostCapabilities.Limits(10, null)
        );
        var meta = new ListPageMeta(
                "invoices",
                new LocalizedText("invoices", "Invoices"),
                "title",
                List.of(new FieldMeta("title", new LocalizedText("title", "Title"),
                        FieldWidget.TEXT_FIELD, null, null, null, null, null, null, null, null)),
                List.of(new ListColumn("title")),
                null,
                new SortSpec("title", "asc"),
                50, null, null
        );
        var input = new CompilePageInput.ListInput(meta, caps, UI, ROUTE);
        var issues = CapabilityValidator.validate(input);
        assertThat(issues).hasSize(1);
        assertThat(issues.get(0).code()).isEqualTo(CapabilityIssue.Code.LIMIT_EXCEEDED);
    }

    @Test
    void filterCountLimitExceededProducesIssue() {
        var caps = new HostCapabilities(
                List.of("invoices"), List.of(), null, null, null, null,
                new HostCapabilities.Limits(null, 1)
        );
        var meta = new ListPageMeta(
                "invoices",
                new LocalizedText("invoices", "Invoices"),
                "title",
                List.of(new FieldMeta("title", new LocalizedText("title", "Title"),
                        FieldWidget.TEXT_FIELD, null, null, null, null, null, null, null, null)),
                List.of(new ListColumn("title")),
                List.of(
                        new ListFilter("status", "Select", null, null),
                        new ListFilter("date", "TextField", null, null)
                ),
                new SortSpec("title", "asc"),
                null, null, null
        );
        var input = new CompilePageInput.ListInput(meta, caps, UI, ROUTE);
        var issues = CapabilityValidator.validate(input);
        assertThat(issues).hasSize(1);
        assertThat(issues.get(0).code()).isEqualTo(CapabilityIssue.Code.LIMIT_EXCEEDED);
    }

    @Test
    void linkTargetNotAllowlistedProducesIssue() {
        var caps = new HostCapabilities(List.of("purchase_orders"), List.of(), null, null, null, null, null);
        var meta = new FormPageMeta(
                "purchase_orders",
                new LocalizedText("po", "Purchase Orders"),
                "title",
                List.of(new FieldMeta("supplier", new LocalizedText("supplier", "Supplier"),
                        FieldWidget.LINK, null, null, null, null,
                        new LinkTarget("suppliers"), null, null, null)),
                null, null
        );
        var input = new CompilePageInput.FormInput(meta, caps, UI, ROUTE);
        var issues = CapabilityValidator.validate(input);
        assertThat(issues).hasSize(1);
        assertThat(issues.get(0).code()).isEqualTo(CapabilityIssue.Code.UNKNOWN_COLLECTION);
        assertThat(issues.get(0).message()).contains("suppliers");
    }
}
