package dev.uidl.generator.compiler;

import dev.uidl.generator.uidl.UidlDocument;

/**
 * Deterministic, pure page compiler: same input → byte-identical UidlDocument.
 */
public interface PageCompiler {

    /**
     * Compile a recipe input into a valid UIDL document.
     *
     * @param input the recipe-specific input (meta + host capabilities + policies)
     * @return a valid {@link UidlDocument} ready for JSON serialization
     * @throws IllegalArgumentException if the input is invalid
     */
    UidlDocument compilePage(CompilePageInput input);
}
