package dev.uidl.server;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;

/**
 * Integration tests for the UIDL Server REST endpoints.
 * Payloads must match the generator model records exactly.
 */
@QuarkusTest
class CompileResourceTest {

    // ── Health ────────────────────────────────────────────────────────────

    @Test
    void testHealthEndpoint() {
        given()
                .when().get("/api/v1/health")
                .then()
                .statusCode(200)
                .body("status", equalTo("UP"))
                .body("service", equalTo("uidl-server"));
    }

    // ── Compile: List recipe ─────────────────────────────────────────────

    @Test
    void testCompileListPageSuccess() {
        Map<String, Object> request = Map.of(
                "recipe", "list",
                "meta", listMeta("customer", "Pelanggan", "Customers")
        );

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when().post("/api/v1/compile")
                .then()
                .statusCode(200)
                .body("version", equalTo("1.0"))
                .body("id", equalTo("list-customer"))
                .body("root", notNullValue())
                .body("root.type", notNullValue());
    }

    // ── Compile: Form recipe ─────────────────────────────────────────────

    @Test
    void testCompileFormPageSuccess() {
        Map<String, Object> request = Map.of(
                "recipe", "form",
                "meta", formMeta("order", "Pesanan", "Order"),
                "recordId", "ORD-123"
        );

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when().post("/api/v1/compile")
                .then()
                .statusCode(200)
                .body("version", equalTo("1.0"))
                .body("id", equalTo("form-order-ord-123"))
                .body("state.id", equalTo("ORD-123"));
    }

    @Test
    void testCompileFormNewRecord() {
        Map<String, Object> request = Map.of(
                "recipe", "form",
                "meta", formMeta("invoice", "Faktur", "Invoice")
        );

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when().post("/api/v1/compile")
                .then()
                .statusCode(200)
                .body("version", equalTo("1.0"))
                .body("id", equalTo("form-invoice-new"))
                .body("state.id", equalTo(""));
    }

    // ── Compile: Dashboard recipe ────────────────────────────────────────

    @Test
    void testCompileDashboardPageSuccess() {
        Map<String, Object> request = Map.of(
                "recipe", "dashboard",
                "meta", Map.of(
                        "name", "sales",
                        "label", Map.of("id", "Dashboard Penjualan", "en", "Sales Dashboard"),
                        "kpis", List.of(
                                Map.of("label", Map.of("id", "Total", "en", "Total"), "value", 1500000)
                        )
                )
        );

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when().post("/api/v1/compile")
                .then()
                .statusCode(200)
                .body("version", equalTo("1.0"))
                .body("id", equalTo("dashboard-sales"));
    }

    // ── Compile: Settings recipe ─────────────────────────────────────────

    @Test
    void testCompileSettingsPageSuccess() {
        Map<String, Object> request = Map.of(
                "recipe", "settings",
                "meta", Map.of(
                        "name", "general",
                        "label", Map.of("id", "Pengaturan Umum", "en", "General Settings"),
                        "sections", List.of(Map.of(
                                "id", "display",
                                "label", Map.of("id", "Tampilan", "en", "Display"),
                                "fields", List.of(Map.of(
                                        "key", "theme",
                                        "label", Map.of("id", "Tema", "en", "Theme"),
                                        "widget", "Select"
                                ))
                        ))
                )
        );

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when().post("/api/v1/compile")
                .then()
                .statusCode(200)
                .body("version", equalTo("1.0"))
                .body("id", equalTo("settings-general"));
    }

    // ── Compile: Wizard recipe ───────────────────────────────────────────

    @Test
    void testCompileWizardPageSuccess() {
        Map<String, Object> request = Map.of(
                "recipe", "wizard",
                "meta", Map.of(
                        "name", "onboarding",
                        "label", Map.of("id", "Pendaftaran", "en", "Onboarding"),
                        "steps", List.of(
                                Map.of(
                                        "id", "step1",
                                        "label", Map.of("id", "Info Dasar", "en", "Basic Info"),
                                        "fields", List.of(Map.of(
                                                "key", "fullName",
                                                "label", Map.of("id", "Nama Lengkap", "en", "Full Name"),
                                                "widget", "TextField"
                                        ))
                                ),
                                Map.of(
                                        "id", "step2",
                                        "label", Map.of("id", "Konfirmasi", "en", "Confirm"),
                                        "fields", List.of(Map.of(
                                                "key", "agree",
                                                "label", Map.of("id", "Setuju", "en", "Agree"),
                                                "widget", "Checkbox"
                                        ))
                                )
                        )
                )
        );

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when().post("/api/v1/compile")
                .then()
                .statusCode(200)
                .body("version", equalTo("1.0"))
                .body("id", equalTo("wizard-onboarding"));
    }

    // ── Compile: Tree recipe ─────────────────────────────────────────────

    @Test
    void testCompileTreePageSuccess() {
        Map<String, Object> request = Map.of(
                "recipe", "tree",
                "meta", Map.of(
                        "name", "category",
                        "label", Map.of("id", "Kategori", "en", "Category"),
                        "titleField", "name",
                        "parentField", "parent",
                        "fields", List.of(Map.of(
                                "key", "name",
                                "label", Map.of("id", "Nama", "en", "Name"),
                                "widget", "TextField"
                        )),
                        "nodes", List.of(Map.of(
                                "key", "root",
                                "label", Map.of("id", "Akar", "en", "Root")
                        ))
                )
        );

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when().post("/api/v1/compile")
                .then()
                .statusCode(200)
                .body("version", equalTo("1.0"))
                .body("id", equalTo("tree-category"));
    }

    // ── Compile: Report recipe ───────────────────────────────────────────

    @Test
    void testCompileReportPageSuccess() {
        Map<String, Object> request = Map.of(
                "recipe", "report",
                "meta", Map.of(
                        "name", "monthly_sales",
                        "label", Map.of("id", "Laporan Penjualan", "en", "Sales Report"),
                        "columns", List.of(
                                Map.of("key", "month", "label", "Month"),
                                Map.of("key", "revenue", "label", "Revenue")
                        ),
                        "dataSource", Map.of("$static", List.of(
                                Map.of("month", "Jan", "revenue", 10000),
                                Map.of("month", "Feb", "revenue", 12000)
                        ))
                )
        );

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when().post("/api/v1/compile")
                .then()
                .statusCode(200)
                .body("version", equalTo("1.0"))
                .body("id", equalTo("report-monthly_sales"));
    }

    // ── Error conditions ─────────────────────────────────────────────────

    @Test
    void testCompileMissingRecipeFailsWith400ProblemDetails() {
        // Use a mutable map since Map.of doesn't allow null values
        Map<String, Object> request = new HashMap<>();
        request.put("meta", Map.of("name", "customer"));

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when().post("/api/v1/compile")
                .then()
                .statusCode(400)
                .body("status", equalTo(400))
                .body("code", equalTo("MISSING_RECIPE"))
                .body("title", equalTo("Bad Request"));
    }

    @Test
    void testCompileMissingMetaFailsWith400() {
        Map<String, Object> request = Map.of("recipe", "list");

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when().post("/api/v1/compile")
                .then()
                .statusCode(400)
                .body("status", equalTo(400))
                .body("code", equalTo("MISSING_META"));
    }

    @Test
    void testCompileInvalidMetaFailsWith400() {
        Map<String, Object> request = Map.of(
                "recipe", "list",
                "meta", Map.of("invalid", true)
        );

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when().post("/api/v1/compile")
                .then()
                .statusCode(400)
                .body("status", equalTo(400))
                .body("code", equalTo("JSON_PARSE_ERROR"));
    }

    // ── Validate endpoint ────────────────────────────────────────────────

    @Test
    void testValidateEndpointReturnsValid() {
        Map<String, Object> request = Map.of(
                "recipe", "list",
                "meta", listMeta("invoice", "Faktur", "Invoice"),
                "hostCapabilities", Map.of(
                        "collections", List.of("invoice"),
                        "commands", List.of()
                )
        );

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when().post("/api/v1/validate")
                .then()
                .statusCode(200)
                .body("valid", equalTo(true))
                .body("issues", empty());
    }

    @Test
    void testValidateEndpointReturnsIssuesWhenNotAllowlisted() {
        Map<String, Object> request = Map.of(
                "recipe", "list",
                "meta", listMeta("secret_table", "Rahasia", "Secret"),
                "hostCapabilities", Map.of(
                        "collections", List.of("allowed_table"),
                        "commands", List.of()
                )
        );

        given()
                .contentType(ContentType.JSON)
                .body(request)
                .when().post("/api/v1/validate")
                .then()
                .statusCode(200)
                .body("valid", equalTo(false))
                .body("issues", hasSize(greaterThan(0)))
                .body("issues[0].code", equalTo("UNKNOWN_COLLECTION"));
    }

    // ── Test helpers ─────────────────────────────────────────────────────

    /**
     * Builds a correct ListPageMeta JSON payload matching the generator model.
     */
    private static Map<String, Object> listMeta(String name, String labelId, String labelEn) {
        return Map.of(
                "name", name,
                "label", Map.of("id", labelId, "en", labelEn),
                "titleField", "name",
                "fields", List.of(
                        Map.of("key", "name", "label", Map.of("id", "Nama", "en", "Name"), "widget", "TextField"),
                        Map.of("key", "email", "label", Map.of("id", "Email", "en", "Email"), "widget", "TextField")
                ),
                "columns", List.of(
                        Map.of("field", "name"),
                        Map.of("field", "email")
                ),
                "defaultSort", Map.of("field", "name", "dir", "asc"),
                "pageSize", 20
        );
    }

    /**
     * Builds a correct FormPageMeta JSON payload matching the generator model.
     */
    private static Map<String, Object> formMeta(String name, String labelId, String labelEn) {
        return Map.of(
                "name", name,
                "label", Map.of("id", labelId, "en", labelEn),
                "titleField", "name",
                "fields", List.of(
                        Map.of("key", "name", "label", Map.of("id", "Nama", "en", "Name"), "widget", "TextField")
                )
        );
    }
}
