package dev.uidl.generator.id;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SemanticNodeIdTest {

    @Test
    void sameInputProducesSameId() {
        String id1 = SemanticNodeId.fieldId("list", "invoices", "amount");
        String id2 = SemanticNodeId.fieldId("list", "invoices", "amount");
        assertThat(id1).isEqualTo(id2);
    }

    @Test
    void differentFieldProducesDifferentId() {
        String id1 = SemanticNodeId.fieldId("list", "invoices", "amount");
        String id2 = SemanticNodeId.fieldId("list", "invoices", "status");
        assertThat(id1).isNotEqualTo(id2);
    }

    @Test
    void differentRecipeProducesDifferentId() {
        String id1 = SemanticNodeId.fieldId("list", "invoices", "amount");
        String id2 = SemanticNodeId.fieldId("form", "invoices", "amount");
        assertThat(id1).isNotEqualTo(id2);
    }

    @Test
    void listNodeIdsAreDeterministic() {
        assertThat(SemanticNodeId.listSearch("invoices")).isEqualTo("list-invoices-search");
        assertThat(SemanticNodeId.listTable("invoices")).isEqualTo("list-invoices-table");
        assertThat(SemanticNodeId.listPage("invoices")).isEqualTo("list-invoices-page");
    }

    @Test
    void rootAndToolbarIds() {
        assertThat(SemanticNodeId.root("list", "invoices")).isEqualTo("list-invoices-root");
        assertThat(SemanticNodeId.toolbar("list", "invoices")).isEqualTo("list-invoices-toolbar");
    }
}
