package dev.uidl.generator.conformance;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;

import dev.uidl.generator.compiler.CompilePageInput;
import dev.uidl.generator.compiler.DefaultPageCompiler;
import dev.uidl.generator.compiler.PageCompiler;
import dev.uidl.generator.json.UidlJsonWriter;
import dev.uidl.generator.model.*;
import dev.uidl.generator.policy.HostCapabilities;
import dev.uidl.generator.policy.RoutePolicy;
import dev.uidl.generator.policy.UiPolicy;
import dev.uidl.generator.uidl.UidlDocument;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConformanceRunnerTest {

    private final ObjectMapper mapper = UidlJsonWriter.mapper();
    private final PageCompiler compiler = new DefaultPageCompiler();

    private Path findRepoRoot() {
        Path cur = Path.of("").toAbsolutePath();
        while (cur != null) {
            if (Files.isDirectory(cur.resolve("conformance/cases"))) {
                return cur;
            }
            cur = cur.getParent();
        }
        // Fallback relative to module
        return Path.of("../..");
    }

    @Test
    void testErrorCasesAgainstDocumentValidation() throws Exception {
        Path repoRoot = findRepoRoot();
        Path errorCasesDir = repoRoot.resolve("conformance/cases/error");

        if (!Files.exists(errorCasesDir)) {
            // If running standalone without repo root, skip external fixture directory
            return;
        }

        try (var stream = Files.list(errorCasesDir)) {
            var caseFiles = stream.filter(p -> p.toString().endsWith(".json")).toList();
            for (var file : caseFiles) {
                JsonNode caseNode = mapper.readTree(file.toFile());
                if ("DOCUMENT_VALIDATION".equals(caseNode.path("expected").asText())) {
                    JsonNode input = caseNode.get("input");
                    String caseId = caseNode.path("id").asText();

                    // Deserialization / validation should reject invalid document structure
                    assertThatThrownBy(() -> mapper.treeToValue(input, UidlDocument.class))
                            .as("Case %s should fail document validation", caseId)
                            .isInstanceOf(Exception.class);
                }
            }
        }
    }

    @Test
    void testAllCompilersProduceSpecCompliantDocuments() throws Exception {
        var caps = new HostCapabilities(List.of("Doc1", "Supplier", "DocItem"), List.of("Doc1", "workspace.settings.save"));
        var uiPolicy = new UiPolicy("en", null, null, "USD");
        var routePolicy = RoutePolicy.DEFAULT;

        // 1. List
        var listMeta = new ListPageMeta(
                "Doc1",
                new LocalizedText("Dok 1", "Doc 1"),
                "name",
                List.of(new FieldMeta("name", new LocalizedText("Nama", "Name"), FieldWidget.TEXT_FIELD, true)),
                List.of(new ListColumn("name", "200px", "left")),
                null,
                new SortSpec("name", "asc"),
                20,
                null,
                null
        );
        assertValidUidl(compiler.compilePage(new CompilePageInput.ListInput(listMeta, caps, uiPolicy, routePolicy)));

        // 2. Form
        var formMeta = new FormPageMeta(
                "Doc1",
                new LocalizedText("Dok 1", "Doc 1"),
                "name",
                List.of(
                        new FieldMeta("name", new LocalizedText("Nama", "Name"), FieldWidget.TEXT_FIELD, true),
                        new FieldMeta("vendor", new LocalizedText("Pemasok", "Vendor"), FieldWidget.LINK, false,
                                null, new LinkTarget("Supplier", "id", "name"), null, null, null)
                ),
                null,
                null
        );
        assertValidUidl(compiler.compilePage(new CompilePageInput.FormInput(formMeta, caps, uiPolicy, routePolicy)));

        // 3. Report
        var reportMeta = new ReportPageMeta(
                "Doc1",
                new LocalizedText("Laporan", "Report"),
                List.of(new ReportColumn("name", "Name", "left", "200px", CellFormat.TEXT)),
                "Doc1",
                null,
                null
        );
        assertValidUidl(compiler.compilePage(new CompilePageInput.ReportInput(reportMeta, caps, uiPolicy, routePolicy)));

        // 4. Dashboard
        var dashMeta = new DashboardPageMeta(
                "Doc1",
                new LocalizedText("Dasbor", "Dashboard"),
                List.of(new DashboardKpi(new LocalizedText("Total", "Total"), 100)),
                null,
                null,
                null
        );
        assertValidUidl(compiler.compilePage(new CompilePageInput.DashboardInput(dashMeta, caps, uiPolicy, routePolicy)));

        // 5. Settings
        var setMeta = new SettingsPageMeta(
                "Doc1",
                new LocalizedText("Pengaturan", "Settings"),
                List.of(new SettingsSection("sec1", new LocalizedText("S1", "S1"), List.of(
                        new SettingsField("name", new LocalizedText("Nama", "Name"), FieldWidget.TEXT_FIELD,
                                null, false, false, null, null, null, "val", "sec1", null)
                )))
        );
        assertValidUidl(compiler.compilePage(new CompilePageInput.SettingsInput(setMeta, caps, uiPolicy, routePolicy)));

        // 6. Tree
        var treeMeta = new TreePageMeta(
                "Doc1",
                new LocalizedText("Pohon", "Tree"),
                "name",
                List.of(new FieldMeta("name", new LocalizedText("Nama", "Name"), FieldWidget.TEXT_FIELD, true)),
                List.of(new TreeNode("1", new LocalizedText("Root", "Root"), null)),
                "parentId"
        );
        assertValidUidl(compiler.compilePage(new CompilePageInput.TreeInput(treeMeta, caps, uiPolicy, routePolicy)));

        // 7. Wizard
        var wizMeta = new WizardPageMeta(
                "Doc1",
                new LocalizedText("Panduan", "Wizard"),
                List.of(new WizardStep("s1", new LocalizedText("Langkah 1", "Step 1"), List.of(
                        new FieldMeta("name", new LocalizedText("Nama", "Name"), FieldWidget.TEXT_FIELD, true)
                )))
        );
        assertValidUidl(compiler.compilePage(new CompilePageInput.WizardInput(wizMeta, caps, uiPolicy, routePolicy)));
    }

    private void assertValidUidl(UidlDocument doc) throws Exception {
        // Core schema requirements
        assertThat(doc.version()).isEqualTo(UidlDocument.SPEC_VERSION);
        assertThat(doc.id()).isNotBlank();
        assertThat(doc.name()).isNotBlank();
        assertThat(doc.root()).isNotNull();
        assertThat(doc.root().id()).isNotBlank();
        assertThat(doc.root().type()).isNotBlank();

        // Serializes to JSON and round-trips
        String json = UidlJsonWriter.write(doc);
        JsonNode tree = mapper.readTree(json);

        assertThat(tree.has("version")).isTrue();
        assertThat(tree.has("id")).isTrue();
        assertThat(tree.has("name")).isTrue();
        assertThat(tree.has("root")).isTrue();

        UidlDocument parsed = mapper.readValue(json, UidlDocument.class);
        assertThat(parsed.id()).isEqualTo(doc.id());
        assertThat(parsed.name()).isEqualTo(doc.name());
        assertThat(parsed.root().id()).isEqualTo(doc.root().id());
    }
}
