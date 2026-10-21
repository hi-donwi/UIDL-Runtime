package dev.uidl.generator.conformance;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
    void testThemeCasesAgainstSharedExport() throws Exception {
        Path repoRoot = findRepoRoot();
        Path casesDir = repoRoot.resolve("conformance/cases/theme");
        Path themesDir = repoRoot.resolve("conformance/themes");
        if (!Files.exists(casesDir)) {
            // If running standalone without repo root, skip external fixture directory
            return;
        }

        Map<String, ThemeTokens> cache = new HashMap<>();
        try (var stream = Files.list(casesDir)) {
            var caseFiles = stream.filter(p -> p.toString().endsWith(".json")).toList();
            for (var file : caseFiles) {
                JsonNode caseNode = mapper.readTree(file.toFile());
                if (!"active".equals(caseNode.path("status").asText())) {
                    continue;
                }
                JsonNode input = caseNode.get("input");
                String caseId = caseNode.path("id").asText();
                String themeName = input.path("theme").asText();
                String ref = input.path("ref").asText();

                ThemeTokens theme = cache.computeIfAbsent(themeName, name -> loadTheme(themesDir, name, caseId));
                JsonNode actual = ref.startsWith("{")
                        ? mapper.valueToTree(ThemeTokens.tokenRefToCssVar(ref))
                        : mapper.valueToTree(theme.resolveToken(ref));
                assertThat(actual)
                        .as("Case %s", caseId)
                        .isEqualTo(caseNode.get("expected"));
            }
        }
    }

    @Test
    void testEmittedTokenRefsResolveInEveryShippedTheme() throws Exception {
        Path moduleMain = Path.of("src/main/java");
        Path repoRoot = findRepoRoot();
        Path themesDir = repoRoot.resolve("conformance/themes");
        if (!Files.isDirectory(moduleMain) || !Files.isDirectory(themesDir)) {
            // If running standalone without the module sources or repo root, skip fixtures
            return;
        }

        // Every {primitives.*}/{semantics.*} literal the production compilers emit.
        Pattern tokenRef = Pattern.compile("\\{(primitives|semantics)\\.[A-Za-z0-9_.-]+\\}");
        Set<String> emitted = new TreeSet<>();
        try (var stream = Files.walk(moduleMain)) {
            for (Path source : stream.filter(p -> p.toString().endsWith(".java")).toList()) {
                Matcher matcher = tokenRef.matcher(Files.readString(source));
                while (matcher.find()) {
                    emitted.add(matcher.group());
                }
            }
        }
        assertThat(emitted).as("production compilers emit token refs").isNotEmpty();

        Map<String, ThemeTokens> themes = new HashMap<>();
        try (var stream = Files.list(themesDir)) {
            for (var file : stream.filter(p -> p.toString().endsWith(".json")).toList()) {
                String name = file.getFileName().toString().replace(".json", "");
                themes.put(name, ThemeTokens.parse(mapper.readTree(file.toFile())));
            }
        }
        assertThat(themes).as("shipped themes export").isNotEmpty();

        for (String ref : emitted) {
            String path = ref.substring(1, ref.length() - 1);
            for (var theme : themes.entrySet()) {
                assertThat(theme.getValue().resolveToken(path))
                        .as("Emitted ref %s must resolve in theme %s", ref, theme.getKey())
                        .isNotNull();
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

    private ThemeTokens loadTheme(Path themesDir, String themeName, String caseId) {
        Path file = themesDir.resolve(themeName + ".json");
        assertThat(Files.isRegularFile(file))
                .as("Case %s names theme '%s' but %s does not exist", caseId, themeName, file)
                .isTrue();
        try {
            return ThemeTokens.parse(mapper.readTree(file.toFile()));
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Theme %s could not be parsed: %s".formatted(themeName, e.getMessage()), e);
        }
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
