import { DocumentSchema } from "../schemas/document";
import { assertSupportedDocumentVersion, DocumentVersionError } from "../version";
import { generateUidlFromPrompt } from "./aiPromptGenerator";
import { validateUidlSemantic, type SemanticValidationOptions } from "../validate/validateSemantic";
import type { UIDLDocument } from "../types";

export interface AiPipelineIssue {
  phase: "synthesis" | "schema" | "semantic";
  code: string;
  message: string;
  path?: string;
  nodeId?: string;
}

export interface AiPipelineMetrics {
  nodeCount: number;
  maxDepth: number;
  durationMs: number;
}

export interface AiPipelineResult {
  success: boolean;
  document?: UIDLDocument;
  rawCandidate?: unknown;
  issues: AiPipelineIssue[];
  metrics: AiPipelineMetrics;
}

export interface AiPipelineOptions {
  /** Custom generator function. Defaults to `generateUidlFromPrompt`. */
  generator?: (prompt: string) => unknown;
  /** Semantic validation options (e.g. depth/node bounds, component allowlists). */
  semanticOptions?: SemanticValidationOptions;
}

/**
 * Validates any candidate JSON or object against schema and semantic gates.
 * Ensures fail-closed execution before rendering: never trusts untrusted input.
 */
export function validateAndSanitizeUidl(
  candidate: unknown,
  options?: Omit<AiPipelineOptions, "generator">
): AiPipelineResult {
  const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  const issues: AiPipelineIssue[] = [];

  // Phase 1: Schema Gate
  if (!candidate || typeof candidate !== "object") {
    const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime;
    return {
      success: false,
      rawCandidate: candidate,
      issues: [
        {
          phase: "schema",
          code: "INVALID_JSON_ROOT",
          message: "Candidate document must be a non-null object",
        },
      ],
      metrics: { nodeCount: 0, maxDepth: 0, durationMs: elapsed },
    };
  }

  const parseResult = DocumentSchema.safeParse(candidate);
  if (!parseResult.success) {
    for (const zodIssue of parseResult.error.issues) {
      issues.push({
        phase: "schema",
        code: "SCHEMA_VALIDATION_ERROR",
        message: zodIssue.message,
        path: zodIssue.path.join("."),
      });
    }
  }

  const doc = parseResult.success ? (parseResult.data as UIDLDocument) : undefined;

  // Version Check
  if (doc?.version) {
    try {
      assertSupportedDocumentVersion(doc.version);
    } catch (err) {
      if (err instanceof DocumentVersionError) {
        issues.push({
          phase: "schema",
          code: err.code,
          message: err.message,
          path: "version",
        });
      } else {
        issues.push({
          phase: "schema",
          code: "UNSUPPORTED_VERSION",
          message: err instanceof Error ? err.message : String(err),
          path: "version",
        });
      }
    }
  }

  // Phase 2: Semantic & Safety Gate (only if schema passed)
  let nodeCount = 0;
  let maxDepth = 0;

  if (doc && issues.length === 0) {
    const semanticResult = validateUidlSemantic(doc, options?.semanticOptions);
    nodeCount = semanticResult.nodeCount;
    maxDepth = semanticResult.maxDepth;

    if (!semanticResult.valid) {
      for (const semIssue of semanticResult.issues) {
        issues.push({
          phase: "semantic",
          code: semIssue.code,
          message: semIssue.message,
          path: semIssue.path,
          nodeId: semIssue.nodeId,
        });
      }
    }
  }

  const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime;

  return {
    success: issues.length === 0 && doc !== undefined,
    document: issues.length === 0 ? doc : undefined,
    rawCandidate: candidate,
    issues,
    metrics: {
      nodeCount,
      maxDepth,
      durationMs: elapsed,
    },
  };
}

/**
 * End-to-end AI UIDL generation pipeline:
 * Synthesizes candidate document from natural language prompt,
 * passes it through strict schema & semantic gates, and returns a validated document.
 */
export function executeAiPipeline(
  prompt: string,
  options?: AiPipelineOptions
): AiPipelineResult {
  const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  const generateFn = options?.generator ?? generateUidlFromPrompt;

  let candidate: unknown;
  try {
    candidate = generateFn(prompt);
  } catch (err) {
    const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime;
    return {
      success: false,
      issues: [
        {
          phase: "synthesis",
          code: "SYNTHESIS_FAILED",
          message: err instanceof Error ? err.message : String(err),
        },
      ],
      metrics: {
        nodeCount: 0,
        maxDepth: 0,
        durationMs: elapsed,
      },
    };
  }

  return validateAndSanitizeUidl(candidate, {
    semanticOptions: options?.semanticOptions,
  });
}
