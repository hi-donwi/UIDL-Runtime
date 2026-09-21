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

class RecipeCompilersTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final PageCompiler compiler = new DefaultPageCompiler();

    @Test
    void testReportCompiler() throws Exception {
        var meta = new ReportPageMeta(
                "SalesSummary",
                new LocalizedText("Ringkasan Penjualan", "Sales Summary"),
                List.of(
                        new ReportColumn("customer", "Customer", "left", "200px", CellFormat.TEXT),
                        new ReportColumn("total", "Total", "right", "120px", CellFormat.CURRENCY)
                ),
                Map.of("$query", Map.of("collection", "SalesOrder")),
                List.of(
                        new ReportFilter("status", new LocalizedText("Status", "Status"), "Select",
                                List.of(new FieldOption("open", "Open"), new FieldOption("closed", "Closed")), "open")
                ),
                List.of(
                        new ReportSummary(new LocalizedText("Total Nilai", "Total Amount"), "sum", "total", null, "currency"),
                        new ReportSummary(new LocalizedText("Jumlah Pesanan", "Order Count"), "count", null, null, "integer")
                )
        );

        var caps = new HostCapabilities(List.of("SalesOrder"));
        var input = new CompilePageInput.ReportInput(meta, caps, new UiPolicy("en", null, null, null), RoutePolicy.DEFAULT);

        UidlDocument doc = compiler.compilePage(input);

        assertThat(doc.id()).isEqualTo("report-salessummary");
        assertThat(doc.name()).isEqualTo("Sales Summary");
        assertThat(doc.dataSources()).containsKey("rows");

        String json = UidlJsonWriter.write(doc);
        JsonNode root = mapper.readTree(json);
        assertThat(root.get("id").asText()).isEqualTo("report-salessummary");
    }

    @Test
    void testDashboardCompiler() throws Exception {
        var meta = new DashboardPageMeta(
                "Executive",
                new LocalizedText("Ringkasan Eksekutif", "Executive Dashboard"),
                List.of(
                        new DashboardKpi(new LocalizedText("Pendapatan", "Revenue"), "Rp 1.500.000.000"),
                        new DashboardKpi(new LocalizedText("Pelanggan Baru", "New Customers"), 142)
                ),
                List.of(
                        new DashboardChart("revenue-trend", new LocalizedText("Tren Pendapatan", "Revenue Trend"),
                                "line", "month", "revenue", "revenue_data", null)
                ),
                List.of(
                        new DashboardShortcut("SalesOrder", new LocalizedText("Pesanan", "Orders"),
                                new LocalizedText("Daftar pesanan", "List of orders"), "/app/list/SalesOrder")
                ),
                null
        );

        var caps = new HostCapabilities(List.of("Executive"));
        var input = new CompilePageInput.DashboardInput(meta, caps, new UiPolicy("en", null, null, null), RoutePolicy.DEFAULT);

        UidlDocument doc = compiler.compilePage(input);

        assertThat(doc.id()).isEqualTo("dashboard-executive");
        assertThat(doc.name()).isEqualTo("Executive Dashboard");

        String json = UidlJsonWriter.write(doc);
        assertThat(json).contains("dashboard-kpis");
        assertThat(json).contains("shortcuts-section");
        assertThat(json).contains("revenue-trend");
    }

    @Test
    void testSettingsCompiler() throws Exception {
        var meta = new SettingsPageMeta(
                "CompanyProfile",
                new LocalizedText("Profil Perusahaan", "Company Profile"),
                List.of(
                        new SettingsSection("general", new LocalizedText("Umum", "General"), List.of(
                                new SettingsField("name", new LocalizedText("Nama Perusahaan", "Company Name"),
                                        FieldWidget.TEXT_FIELD, null, true, false, null, null, null, "PT Contoh", "general", null),
                                new SettingsField("isTaxable", new LocalizedText("Kena Pajak", "Taxable"),
                                        FieldWidget.SWITCH, null, false, false, null, null, null, true, "general", null)
                        ))
                )
        );

        var caps = new HostCapabilities(List.of("CompanyProfile"), List.of("workspace.settings.save"));
        var input = new CompilePageInput.SettingsInput(meta, caps, new UiPolicy("id", null, null, null), RoutePolicy.DEFAULT);

        UidlDocument doc = compiler.compilePage(input);

        assertThat(doc.id()).isEqualTo("settings-companyprofile");
        assertThat(doc.name()).isEqualTo("Profil Perusahaan");
        assertThat(doc.state()).containsEntry("name", "PT Contoh");
        assertThat(doc.state()).containsEntry("isTaxable", true);

        String json = UidlJsonWriter.write(doc);
        assertThat(json).contains("workspace.settings.save");
    }

    @Test
    void testTreeCompiler() throws Exception {
        var meta = new TreePageMeta(
                "Department",
                new LocalizedText("Departemen", "Departments"),
                "name",
                List.of(new FieldMeta("name", new LocalizedText("Nama", "Name"), FieldWidget.TEXT_FIELD, true)),
                List.of(
                        new TreeNode("HQ", new LocalizedText("Kantor Pusat", "Headquarters"), List.of(
                                new TreeNode("FIN", new LocalizedText("Keuangan", "Finance"), null),
                                new TreeNode("ENG", new LocalizedText("Teknik", "Engineering"), null)
                        ))
                ),
                "parentId"
        );

        var caps = new HostCapabilities(List.of("Department"));
        var input = new CompilePageInput.TreeInput(meta, caps, new UiPolicy("en", null, null, null), RoutePolicy.DEFAULT);

        UidlDocument doc = compiler.compilePage(input);

        assertThat(doc.id()).isEqualTo("tree-department");
        assertThat(doc.name()).isEqualTo("Departments");
        assertThat(doc.state()).containsEntry("selectedKey", "");

        String json = UidlJsonWriter.write(doc);
        assertThat(json).contains("tree-view");
        assertThat(json).contains("tree-detail");
    }

    @Test
    void testWizardCompiler() throws Exception {
        var meta = new WizardPageMeta(
                "VendorOnboarding",
                new LocalizedText("Pendaftaran Vendor", "Vendor Onboarding"),
                List.of(
                        new WizardStep("step1", new LocalizedText("Data Dasar", "Basic Info"), List.of(
                                new FieldMeta("companyName", new LocalizedText("Nama PT", "Company Name"), FieldWidget.TEXT_FIELD, true)
                        )),
                        new WizardStep("step2", new LocalizedText("Dokumen", "Documents"), List.of(
                                new FieldMeta("npwp", new LocalizedText("NPWP", "Tax ID"), FieldWidget.TEXT_FIELD, true)
                        ))
                )
        );

        var caps = new HostCapabilities(List.of("VendorOnboarding"));
        var input = new CompilePageInput.WizardInput(meta, caps, new UiPolicy("en", null, null, null), RoutePolicy.DEFAULT);

        UidlDocument doc = compiler.compilePage(input);

        assertThat(doc.id()).isEqualTo("wizard-vendoronboarding");
        assertThat(doc.name()).isEqualTo("Vendor Onboarding");
        assertThat(doc.state()).containsEntry("currentStep", 0);

        String json = UidlJsonWriter.write(doc);
        assertThat(json).contains("wizard-stepper");
        assertThat(json).contains("wizard-prev-btn");
        assertThat(json).contains("wizard-next-btn");
        assertThat(json).contains("wizard-submit-btn");
    }
}
