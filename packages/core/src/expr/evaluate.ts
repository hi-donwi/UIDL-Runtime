import { resolvePath } from "../state/bindings";

export interface RenderScope {
  theme?: unknown;
  local?: Record<string, unknown>;
  state?: Record<string, unknown>;
  session?: Record<string, unknown>;
  route?: Record<string, unknown>;
  data?: Record<string, unknown>;
  index?: number;
}

export interface LiteralExpr {
  literal: unknown;
}

export interface PathExpr {
  path: string;
}

export interface EqExpr {
  "==": [Expr, Expr];
}

export interface NeqExpr {
  "!=": [Expr, Expr];
}

export interface AndExpr {
  and: [Expr, Expr];
}

export interface OrExpr {
  or: [Expr, Expr];
}

export interface NotExpr {
  not: Expr;
}

export interface IfExpr {
  if: [Expr, Expr, Expr];
}

export interface CoalesceExpr {
  "??": [Expr, Expr];
}

/**
 * Aggregate a numeric field across a collection already in scope.
 *
 * List pages need a real total in their KPI row. Rather than open the evaluator up to
 * arbitrary arithmetic, this stays declarative: name a collection path, a field, and one of
 * three fixed reducers. Non-numeric and missing values are skipped rather than coerced, so a
 * blank cell cannot silently turn a total into NaN.
 */
export interface AggExpr {
  agg: "sum" | "count" | "avg";
  over: string;
  field?: string;
}

/**
 * The canonical expression shape (spec: `spec/semantics/expressions.md`). One `op`, operands
 * in `left`/`right` (binary) or `test`/`then`/`else`/`v` where the op shape demands it.
 * `$bind`-wrapped operands resolve against the same render scope as `{path}`.
 *
 * The legacy keyed shapes (`{"==": [...]}`, `{"and": [...]}`, …) above remain supported and
 * are documented aliases of these ops — a runtime accepts either form.
 */
export type BinaryOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "and"
  | "or"
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "contains"
  | "startsWith"
  | "coalesce";

export interface OpExpr {
  op: BinaryOp | "not" | "if";
  left?: Expr;
  right?: Expr;
  v?: Expr;
  test?: Expr;
  then?: Expr;
  else?: Expr;
}

/** A `{"$bind": "<scope>.<path>"}` leaf — resolved against the render scope. */
export interface BindExpr {
  $bind: string;
}

/** A `{"$expr": <Expr>}` leaf — an expression node carrying another expression as its value. */
export interface WrappedExpr {
  $expr: Expr;
}

export type Expr =
  | LiteralExpr
  | PathExpr
  | EqExpr
  | NeqExpr
  | AndExpr
  | OrExpr
  | NotExpr
  | IfExpr
  | CoalesceExpr
  | AggExpr
  | OpExpr
  | BindExpr
  | WrappedExpr;

/** Hard recursion cap — UIDL is untrusted input; bounded expression depth is a security rule (plan §23). */
export const MAX_EXPR_DEPTH = 64;

/** Internal marker: a subtree exceeded the depth budget. Only raised inside `evaluateDepth`. */
class ExpressionDepthError extends Error {}

/**
 * Evaluates a declarative expression tree to a plain value. Never executes host code.
 * Deterministic across runtimes for the same input; anything that cannot be computed
 * (unknown prefix, missing key, non-numeric operand to a numeric op, divide-by-zero,
 * wrong operand types) resolves to `undefined` or `null`, never a throw. If the tree is
 * deeper than `MAX_EXPR_DEPTH` the whole expression resolves to `undefined` rather than
 * recursing unboundedly.
 */
export function evaluate(expr: unknown, scope: RenderScope): unknown {
  try {
    return evaluateDepth(expr, scope, 0);
  } catch (error) {
    if (error instanceof ExpressionDepthError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[uidl-runtime] Expression exceeds maximum depth of ${MAX_EXPR_DEPTH}; aborting evaluation`);
      }
      return undefined;
    }
    throw error;
  }
}

function evaluateDepth(expr: unknown, scope: RenderScope, depth: number): unknown {
  if (depth > MAX_EXPR_DEPTH) {
    throw new ExpressionDepthError();
  }

  if (!expr || typeof expr !== "object") {
    return expr;
  }

  const node = expr as Record<string, unknown>;

  if ("literal" in node) {
    return (node as unknown as LiteralExpr).literal;
  }

  // Canonical-leaf `{"$bind": "state.x"}` inside an expression tree.
  if (typeof node.$bind === "string" && Object.keys(node).length === 1) {
    return resolvePath(node.$bind, scope);
  }

  // Canonical-leaf `{"$expr": <expr>}` — evaluate the wrapped expression.
  if ("$expr" in node && Object.keys(node).length === 1) {
    return evaluateDepth(node.$expr, scope, depth + 1);
  }

  if ("path" in node && typeof node.path === "string") {
    return resolvePath(node.path, scope);
  }

  if ("agg" in node && "over" in node) {
    return evaluateAgg(node as unknown as AggExpr, scope);
  }

  if ("op" in node) {
    return evaluateOp(node as unknown as OpExpr, scope, depth);
  }

  if ("==" in node) {
    const [left, right] = (node as unknown as EqExpr)["=="];
    return evaluateDepth(left, scope, depth + 1) === evaluateDepth(right, scope, depth + 1);
  }

  if ("!=" in node) {
    const [left, right] = (node as unknown as NeqExpr)["!="];
    return evaluateDepth(left, scope, depth + 1) !== evaluateDepth(right, scope, depth + 1);
  }

  if ("and" in node) {
    const [left, right] = (node as unknown as AndExpr).and;
    return Boolean(evaluateDepth(left, scope, depth + 1)) && Boolean(evaluateDepth(right, scope, depth + 1));
  }

  if ("or" in node) {
    const [left, right] = (node as unknown as OrExpr).or;
    return Boolean(evaluateDepth(left, scope, depth + 1)) || Boolean(evaluateDepth(right, scope, depth + 1));
  }

  if ("not" in node) {
    return !evaluateDepth((node as unknown as NotExpr).not, scope, depth + 1);
  }

  if ("if" in node) {
    const [cond, trueVal, falseVal] = (node as unknown as IfExpr).if;
    return evaluateDepth(cond, scope, depth + 1)
      ? evaluateDepth(trueVal, scope, depth + 1)
      : evaluateDepth(falseVal, scope, depth + 1);
  }

  if ("??" in node) {
    const [left, right] = (node as unknown as CoalesceExpr)["??"];
    const leftVal = evaluateDepth(left, scope, depth + 1);
    if (leftVal !== undefined && leftVal !== null) {
      return leftVal;
    }
    return evaluateDepth(right, scope, depth + 1);
  }

  return undefined;
}

function evaluateOp(node: OpExpr, scope: RenderScope, depth: number): unknown {
  const op = node.op;

  switch (op) {
    case "eq":
      return evalOperand(node.left, scope, depth) === evalOperand(node.right, scope, depth);
    case "neq":
      return evalOperand(node.left, scope, depth) !== evalOperand(node.right, scope, depth);
    case "gt":
      return numericCompare(node.left, node.right, scope, depth, (a, b) => a > b);
    case "gte":
      return numericCompare(node.left, node.right, scope, depth, (a, b) => a >= b);
    case "lt":
      return numericCompare(node.left, node.right, scope, depth, (a, b) => a < b);
    case "lte":
      return numericCompare(node.left, node.right, scope, depth, (a, b) => a <= b);
    case "and":
      return Boolean(evalOperand(node.left, scope, depth)) && Boolean(evalOperand(node.right, scope, depth));
    case "or":
      return Boolean(evalOperand(node.left, scope, depth)) || Boolean(evalOperand(node.right, scope, depth));
    case "not":
      return !evalOperand(node.v, scope, depth);
    case "add":
      return arithmetic(node.left, node.right, scope, depth, (a, b) => a + b);
    case "subtract":
      return arithmetic(node.left, node.right, scope, depth, (a, b) => a - b);
    case "multiply":
      return arithmetic(node.left, node.right, scope, depth, (a, b) => a * b);
    case "divide":
      return arithmetic(node.left, node.right, scope, depth, (a, b) => (b === 0 ? null : a / b));
    case "contains":
      return contains(evalOperand(node.left, scope, depth), evalOperand(node.right, scope, depth));
    case "startsWith":
      return startsWith(evalOperand(node.left, scope, depth), evalOperand(node.right, scope, depth));
    case "coalesce": {
      const left = evalOperand(node.left, scope, depth);
      if (left !== undefined && left !== null) return left;
      return evalOperand(node.right, scope, depth);
    }
    case "if": {
      const test = evalOperand(node.test, scope, depth);
      return test ? evalOperand(node.then, scope, depth) : evalOperand(node.else, scope, depth);
    }
    default:
      return undefined;
  }
}

function evalOperand(operand: Expr | undefined, scope: RenderScope, depth: number): unknown {
  return evaluateDepth(operand, scope, depth + 1);
}

function numericCompare(
  left: Expr | undefined,
  right: Expr | undefined,
  scope: RenderScope,
  depth: number,
  compare: (a: number, b: number) => boolean,
): boolean | null {
  const a = toFiniteNumber(evalOperand(left, scope, depth));
  const b = toFiniteNumber(evalOperand(right, scope, depth));
  if (a === null || b === null) return null;
  return compare(a, b);
}

function arithmetic(
  left: Expr | undefined,
  right: Expr | undefined,
  scope: RenderScope,
  depth: number,
  apply: (a: number, b: number) => number | null,
): number | null {
  const a = toFiniteNumber(evalOperand(left, scope, depth));
  const b = toFiniteNumber(evalOperand(right, scope, depth));
  if (a === null || b === null) return null;
  return apply(a, b);
}

function toFiniteNumber(value: unknown): number | null {
  const asNumber = typeof value === "number" ? value : Number(value);
  return Number.isFinite(asNumber) ? asNumber : null;
}

function contains(container: unknown, value: unknown): boolean | null {
  if (Array.isArray(container)) return container.includes(value);
  if (typeof container === "string" && typeof value === "string") return container.includes(value);
  return null;
}

function startsWith(string: unknown, prefix: unknown): boolean | null {
  if (typeof string !== "string" || typeof prefix !== "string") return null;
  return string.startsWith(prefix);
}

function evaluateAgg(expr: AggExpr, scope: RenderScope): number {
  const source = resolvePath(expr.over, scope);
  const rows = Array.isArray(source) ? source : [];
  if (expr.agg === "count") return rows.length;
  if (!expr.field) return 0;

  const values: number[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const raw = (row as Record<string, unknown>)[expr.field];
    const value = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
    if (typeof value === "number" && Number.isFinite(value)) values.push(value);
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  if (expr.agg === "sum") return total;
  return values.length === 0 ? 0 : total / values.length;
}