package dev.uidl.generator.compiler;

import dev.uidl.generator.model.*;
import dev.uidl.generator.policy.HostCapabilities;
import dev.uidl.generator.policy.RoutePolicy;
import dev.uidl.generator.policy.UiPolicy;

/**
 * Sealed input hierarchy for recipe compilation.
 * Each recipe has its own input variant carrying the recipe-specific meta.
 */
public sealed interface CompilePageInput {

    PageRecipe recipe();
    HostCapabilities hostCapabilities();
    UiPolicy uiPolicy();
    RoutePolicy routePolicy();

    record ListInput(
            ListPageMeta meta,
            HostCapabilities hostCapabilities,
            UiPolicy uiPolicy,
            RoutePolicy routePolicy
    ) implements CompilePageInput {
        @Override public PageRecipe recipe() { return PageRecipe.LIST; }
    }

    record FormInput(
            FormPageMeta meta,
            String recordId,
            HostCapabilities hostCapabilities,
            UiPolicy uiPolicy,
            RoutePolicy routePolicy,
            String listRoute,
            java.util.Map<String, Object> initialData,
            Integer initialVersion,
            java.util.List<dev.uidl.generator.uidl.UidlNode> extraHeaderActions,
            java.util.List<dev.uidl.generator.uidl.UidlNode> extraFormActions,
            Boolean useFullWidth
    ) implements CompilePageInput {
        public FormInput(
                FormPageMeta meta,
                HostCapabilities hostCapabilities,
                UiPolicy uiPolicy,
                RoutePolicy routePolicy
        ) {
            this(meta, "new", hostCapabilities, uiPolicy, routePolicy, null, null, null, null, null, null);
        }

        public FormInput(
                FormPageMeta meta,
                String recordId,
                HostCapabilities hostCapabilities,
                UiPolicy uiPolicy,
                RoutePolicy routePolicy
        ) {
            this(meta, recordId, hostCapabilities, uiPolicy, routePolicy, null, null, null, null, null, null);
        }

        @Override public PageRecipe recipe() { return PageRecipe.FORM; }
    }

    record ReportInput(
            ReportPageMeta meta,
            HostCapabilities hostCapabilities,
            UiPolicy uiPolicy,
            RoutePolicy routePolicy
    ) implements CompilePageInput {
        @Override public PageRecipe recipe() { return PageRecipe.REPORT; }
    }

    record DashboardInput(
            DashboardPageMeta meta,
            HostCapabilities hostCapabilities,
            UiPolicy uiPolicy,
            RoutePolicy routePolicy
    ) implements CompilePageInput {
        @Override public PageRecipe recipe() { return PageRecipe.DASHBOARD; }
    }

    record SettingsInput(
            SettingsPageMeta meta,
            HostCapabilities hostCapabilities,
            UiPolicy uiPolicy,
            RoutePolicy routePolicy
    ) implements CompilePageInput {
        @Override public PageRecipe recipe() { return PageRecipe.SETTINGS; }
    }

    record TreeInput(
            TreePageMeta meta,
            HostCapabilities hostCapabilities,
            UiPolicy uiPolicy,
            RoutePolicy routePolicy
    ) implements CompilePageInput {
        @Override public PageRecipe recipe() { return PageRecipe.TREE; }
    }

    record WizardInput(
            WizardPageMeta meta,
            HostCapabilities hostCapabilities,
            UiPolicy uiPolicy,
            RoutePolicy routePolicy
    ) implements CompilePageInput {
        @Override public PageRecipe recipe() { return PageRecipe.WIZARD; }
    }
}
