package dev.uidl.generator.compiler;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;

import dev.uidl.generator.json.UidlJsonWriter;
import dev.uidl.generator.model.*;
import dev.uidl.generator.policy.HostCapabilities;
import dev.uidl.generator.policy.RoutePolicy;
import dev.uidl.generator.policy.UiPolicy;
import dev.uidl.generator.uidl.UidlDocument;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FormCompilerTest {

    private final ObjectMapper mapper = new ObjectMapper();

    private FormPageMeta sampleMeta() {
        return new FormPageMeta(
                "PurchaseOrder",
                new LocalizedText("Pesanan Pembelian", "Purchase Order"),
                "title",
                List.of(
                        new FieldMeta("title", new LocalizedText("Judul", "Title"), FieldWidget.TEXT_FIELD, true),
                        new FieldMeta("amount", new LocalizedText("Jumlah", "Amount"), FieldWidget.CURRENCY, false),
                        new FieldMeta("vendor", new LocalizedText("Pemasok", "Vendor"), FieldWidget.LINK, false,
                                null, new LinkTarget("Supplier", "id", "name"), null, null, null),
                        new FieldMeta("status", new LocalizedText("Status", "Status"), FieldWidget.SELECT, false)
                ),
                new DocumentStates(
                        "status",
                        List.of("Draft", "Submitted", "Approved"),
                        "Draft",
                        List.of(
                                new StateTransition("submit", new LocalizedText("Kirim", "Submit"), List.of("Draft"), "Submitted"),
                                new StateTransition("approve", new LocalizedText("Setujui", "Approve"), List.of("Submitted"), "Approved")
                        )
                ),
                List.of(new ChildTableRef("items", "PurchaseOrderItem"))
        );
    }

    private HostCapabilities sampleCapabilities() {
        return new HostCapabilities(
                List.of("PurchaseOrder", "Supplier", "PurchaseOrderItem"),
                List.of("PurchaseOrder")
        );
    }

    @Test
    void compileNewFormProducesCreateMutateAndEmptyState() throws Exception {
        var input = new CompilePageInput.FormInput(
                sampleMeta(),
                "new",
                sampleCapabilities(),
                new UiPolicy("en", null, null, null),
                RoutePolicy.DEFAULT,
                null,
                null,
                null,
                null,
                null,
                null
        );

        UidlDocument doc = FormCompiler.compile(input);

        assertThat(doc.version()).isEqualTo(UidlDocument.SPEC_VERSION);
        assertThat(doc.id()).isEqualTo("form-purchaseorder-new");
        assertThat(doc.name()).isEqualTo("New Purchase Order");
        assertThat(doc.state()).containsEntry("id", "");
        assertThat(doc.state()).containsEntry("status", "Draft");
        assertThat(doc.state()).containsEntry("title", "");
        assertThat(doc.state()).containsEntry("amount", 0);

        // DataSources should have the link_vendor query
        assertThat(doc.dataSources()).containsKey("link_vendor");

        // Serializes cleanly to valid JSON
        String json = UidlJsonWriter.write(doc);
        JsonNode root = mapper.readTree(json);
        assertThat(root.get("id").asText()).isEqualTo("form-purchaseorder-new");
    }

    @Test
    void compileEditFormProducesTransitionButtonsAndEditState() throws Exception {
        var input = new CompilePageInput.FormInput(
                sampleMeta(),
                "PO-001",
                sampleCapabilities(),
                new UiPolicy("en", null, null, null),
                RoutePolicy.DEFAULT,
                null,
                Map.of("title", "Initial Title", "amount", 50000),
                2,
                null,
                null,
                null
        );

        UidlDocument doc = FormCompiler.compile(input);

        assertThat(doc.id()).isEqualTo("form-purchaseorder-po-001");
        assertThat(doc.name()).isEqualTo("Purchase Order (PO-001)");
        assertThat(doc.state()).containsEntry("id", "PO-001");
        assertThat(doc.state()).containsEntry("title", "Initial Title");
        assertThat(doc.state()).containsEntry("amount", 50000);

        String json = UidlJsonWriter.write(doc);
        // Should contain transition buttons
        assertThat(json).contains("transition-submit");
        assertThat(json).contains("transition-approve");
        assertThat(json).contains("child-table-items");
    }

    @Test
    void unknownCollectionFailsClosed() {
        var unallowedCaps = new HostCapabilities(
                List.of("Supplier"), // PurchaseOrder missing!
                List.of()
        );

        var input = new CompilePageInput.FormInput(
                sampleMeta(),
                "new",
                unallowedCaps,
                null,
                null
        );

        assertThatThrownBy(() -> FormCompiler.compile(input))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("collection \"PurchaseOrder\" is not in hostCapabilities.collections");
    }

    @Test
    void determinismSameInputProducesSameJson() {
        var input1 = new CompilePageInput.FormInput(sampleMeta(), sampleCapabilities(), null, null);
        var input2 = new CompilePageInput.FormInput(sampleMeta(), sampleCapabilities(), null, null);

        String json1 = UidlJsonWriter.write(FormCompiler.compile(input1));
        String json2 = UidlJsonWriter.write(FormCompiler.compile(input2));

        assertThat(json1).isEqualTo(json2);
    }
}
