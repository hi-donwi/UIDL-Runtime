package dev.uidl.generator.compiler;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;

import dev.uidl.generator.json.UidlJsonWriter;
import dev.uidl.generator.json.UidlModule;
import dev.uidl.generator.model.*;
import dev.uidl.generator.policy.HostCapabilities;
import dev.uidl.generator.policy.RoutePolicy;
import dev.uidl.generator.policy.UiPolicy;
import dev.uidl.generator.uidl.UidlDocument;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ListCompilerTest {

    private static final UiPolicy UI = UiPolicy.DEFAULT;
    private static final RoutePolicy ROUTE = RoutePolicy.DEFAULT;
    private static final ObjectMapper MAPPER = UidlJsonWriter.mapper().registerModule(new UidlModule());

    private static HostCapabilities caps(String... collections) {
        return new HostCapabilities(List.of(collections), List.of(), null, null, null, null, null);
    }

    private static ListPageMeta invoiceMeta() {
        return new ListPageMeta(
                "invoices",
                new LocalizedText("invoices", "Invoices"),
                "title",
                List.of(
                        new FieldMeta("title", new LocalizedText("title", "Title"),
                                FieldWidget.TEXT_FIELD, null, null, null, null, null, null, null, null),
                        new FieldMeta("amount", new LocalizedText("amount", "Amount"),
                                FieldWidget.CURRENCY, null, null, null, null, null, null, null, null),
                        new FieldMeta("status", new LocalizedText("status", "Status"),
                                FieldWidget.SELECT, null, null, null,
                                List.of(new FieldOption("draft", "Draft"), new FieldOption("submitted", "Submitted")),
                                null, null, null, null)
                ),
                List.of(new ListColumn("title"), new ListColumn("amount", null, "right"), new ListColumn("status")),
                List.of(new ListFilter("status", "Select", null, null)),
                new SortSpec("title", "asc"),
                20, "status", null
        );
    }

    @Test
    void compilesValidDocument() throws Exception {
        var input = new CompilePageInput.ListInput(invoiceMeta(), caps("invoices"), UI, ROUTE);
        UidlDocument doc = ListCompiler.compile(input);

        assertThat(doc.version()).isEqualTo("1.0");
        assertThat(doc.id()).isEqualTo("list-invoices");
        assertThat(doc.name()).isEqualTo("Invoices");
        assertThat(doc.root()).isNotNull();
        assertThat(doc.root().type()).isEqualTo("Container");

        // Serialize to JSON and verify it's valid
        String json = MAPPER.writeValueAsString(doc);
        JsonNode tree = MAPPER.readTree(json);
        assertThat(tree.has("version")).isTrue();
        assertThat(tree.get("version").asText()).isEqualTo("1.0");
        assertThat(tree.has("root")).isTrue();
        assertThat(tree.get("root").has("children")).isTrue();
    }

    @Test
    void outputContainsDataSourceWithQuery() throws Exception {
        var input = new CompilePageInput.ListInput(invoiceMeta(), caps("invoices"), UI, ROUTE);
        UidlDocument doc = ListCompiler.compile(input);

        assertThat(doc.dataSources()).containsKey("rows");
        @SuppressWarnings("unchecked")
        Map<String, Object> rows = (Map<String, Object>) doc.dataSources().get("rows");
        assertThat(rows).containsKey("$query");
    }

    @Test
    void outputIsDeterministic() throws Exception {
        var input = new CompilePageInput.ListInput(invoiceMeta(), caps("invoices"), UI, ROUTE);
        String json1 = MAPPER.writeValueAsString(ListCompiler.compile(input));
        String json2 = MAPPER.writeValueAsString(ListCompiler.compile(input));
        assertThat(json1).isEqualTo(json2);
    }

    @Test
    void containsSearchAndFilterNodes() throws Exception {
        var input = new CompilePageInput.ListInput(invoiceMeta(), caps("invoices"), UI, ROUTE);
        UidlDocument doc = ListCompiler.compile(input);
        String json = MAPPER.writeValueAsString(doc);

        assertThat(json).contains("list-invoices-search");
        assertThat(json).contains("filter-status");
        assertThat(json).contains("reset-filters-btn");
    }

    @Test
    void containsTableWithColumns() throws Exception {
        var input = new CompilePageInput.ListInput(invoiceMeta(), caps("invoices"), UI, ROUTE);
        UidlDocument doc = ListCompiler.compile(input);
        String json = MAPPER.writeValueAsString(doc);

        assertThat(json).contains("list-invoices-table");
        assertThat(json).contains("\"format\":\"currency\"");
        assertThat(json).contains("\"format\":\"status\"");
    }

    @Test
    void containsPaginationNodes() throws Exception {
        var input = new CompilePageInput.ListInput(invoiceMeta(), caps("invoices"), UI, ROUTE);
        UidlDocument doc = ListCompiler.compile(input);
        String json = MAPPER.writeValueAsString(doc);

        assertThat(json).contains("list-invoices-page");
        assertThat(json).contains("Previous");
        assertThat(json).contains("Next");
    }

    @Test
    void stateContainsFilterEntries() {
        var input = new CompilePageInput.ListInput(invoiceMeta(), caps("invoices"), UI, ROUTE);
        UidlDocument doc = ListCompiler.compile(input);

        assertThat(doc.state()).containsKey("filter_status");
        assertThat(doc.state().get("filter_status")).isEqualTo("");
        assertThat(doc.state().get("page")).isEqualTo(1);
        assertThat(doc.state().get("sortField")).isEqualTo("title");
    }

    @Test
    void rejectsUnknownCollection() {
        var input = new CompilePageInput.ListInput(invoiceMeta(), caps("customers"), UI, ROUTE);
        assertThatThrownBy(() -> ListCompiler.compile(input))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("hostCapabilities rejected");
    }
}
