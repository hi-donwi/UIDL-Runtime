import { getByPath } from "../state/createDocumentState";

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
  | AggExpr;

export function evaluate(expr: unknown, scope: RenderScope): unknown {
  if (!expr || typeof expr !== "object") {
    return expr;
  }

  if ("literal" in expr) {
    return (expr as LiteralExpr).literal;
  }

  if ("path" in expr) {
    return resolvePath((expr as PathExpr).path, scope);
  }

  if ("agg" in expr && "over" in expr) {
    return evaluateAgg(expr as AggExpr, scope);
  }

  if ("==" in expr) {
    const [left, right] = (expr as EqExpr)["=="];
    return evaluate(left, scope) === evaluate(right, scope);
  }

  if ("!=" in expr) {
    const [left, right] = (expr as NeqExpr)["!="];
    return evaluate(left, scope) !== evaluate(right, scope);
  }

  if ("and" in expr) {
    const [left, right] = (expr as AndExpr).and;
    return Boolean(evaluate(left, scope)) && Boolean(evaluate(right, scope));
  }

  if ("or" in expr) {
    const [left, right] = (expr as OrExpr).or;
    return Boolean(evaluate(left, scope)) || Boolean(evaluate(right, scope));
  }

  if ("not" in expr) {
    return !evaluate((expr as NotExpr).not, scope);
  }

  if ("if" in expr) {
    const [cond, trueVal, falseVal] = (expr as IfExpr).if;
    return evaluate(cond, scope) ? evaluate(trueVal, scope) : evaluate(falseVal, scope);
  }

  if ("??" in expr) {
    const [left, right] = (expr as CoalesceExpr)["??"];
    const leftVal = evaluate(left, scope);
    if (leftVal !== undefined && leftVal !== null) {
      return leftVal;
    }
    return evaluate(right, scope);
  }

  return undefined;
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

function resolvePath(path: string, scope: RenderScope): unknown {
  if (path.startsWith("local.") && scope.local) {
    return getByPath(scope.local, path.replace("local.", ""));
  }
  if (path.startsWith("state.") && scope.state) {
    return getByPath(scope.state, path.replace("state.", ""));
  }
  if (path.startsWith("session.") && scope.session) {
    return getByPath(scope.session, path.replace("session.", ""));
  }
  if (path.startsWith("route.") && scope.route) {
    return getByPath(scope.route, path.replace("route.", ""));
  }
  if (path.startsWith("data.") && scope.data) {
    return getByPath(scope.data, path.replace("data.", ""));
  }
  return undefined;
}
