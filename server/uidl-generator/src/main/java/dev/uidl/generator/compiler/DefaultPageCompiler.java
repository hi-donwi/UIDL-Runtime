package dev.uidl.generator.compiler;

import dev.uidl.generator.uidl.UidlDocument;

/**
 * Default implementation of {@link PageCompiler}.
 * Dispatches to the appropriate recipe compiler using pattern matching on {@link CompilePageInput}.
 */
public final class DefaultPageCompiler implements PageCompiler {

    @Override
    public UidlDocument compilePage(CompilePageInput input) {
        if (input == null) {
            throw new IllegalArgumentException("CompilePageInput must not be null");
        }

        return switch (input) {
            case CompilePageInput.ListInput li -> ListCompiler.compile(li);
            case CompilePageInput.FormInput fi -> FormCompiler.compile(fi);
            case CompilePageInput.ReportInput ri -> ReportCompiler.compile(ri);
            case CompilePageInput.DashboardInput di -> DashboardCompiler.compile(di);
            case CompilePageInput.SettingsInput si -> SettingsCompiler.compile(si);
            case CompilePageInput.TreeInput ti -> TreeCompiler.compile(ti);
            case CompilePageInput.WizardInput wi -> WizardCompiler.compile(wi);
        };
    }
}
