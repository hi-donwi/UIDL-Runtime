import '../binding/binding_resolver.dart';
import '../spec/constants.dart';

class ExpressionEvaluator {
  static dynamic evaluate(dynamic expr, Map<String, dynamic> scope) {
    return _evaluateDepth(expr, scope, 0);
  }

  static bool evaluateCondition(dynamic expr, Map<String, dynamic> scope) {
    final result = evaluate(expr, scope);
    if (result == null) return false;
    if (result is bool) return result;
    if (result is num) return result != 0;
    if (result is String) return result.isNotEmpty;
    if (result is List) return result.isNotEmpty;
    if (result is Map) return result.isNotEmpty;
    return false;
  }

  static dynamic _evaluateDepth(dynamic node, Map<String, dynamic> scope, int depth) {
    if (node == null) return null;

    if (depth > maxExpressionDepth) {
      // Bounded complexity rule: abort evaluation beyond maximum depth
      return null;
    }

    if (node is num || node is bool || node is String) {
      return node;
    }

    if (node is! Map) {
      return node;
    }

    final map = Map<String, dynamic>.from(node);

    // 1. Literal leaf
    if (map.containsKey('literal')) {
      return map['literal'];
    }

    // 2. $bind leaf
    if (map.containsKey(r'$bind')) {
      final bindPath = map[r'$bind'];
      if (bindPath is String) {
        return resolvePath(bindPath, scope);
      }
      return null;
    }

    // 3. $expr wrapper leaf
    if (map.containsKey(r'$expr')) {
      return _evaluateDepth(map[r'$expr'], scope, depth + 1);
    }

    // 4. Path leaf
    if (map.containsKey('path')) {
      final path = map['path'];
      if (path is String) {
        return resolvePath(path, scope);
      }
      return null;
    }

    // 5. Canonical op form: {"op": "...", ...}
    if (map.containsKey('op')) {
      return _evaluateOp(map, scope, depth);
    }

    // 6. Legacy prefix/infix forms
    if (map.containsKey('==')) {
      final operands = map['=='];
      if (operands is List && operands.length >= 2) {
        return _strictEquals(
          _evaluateDepth(operands[0], scope, depth + 1),
          _evaluateDepth(operands[1], scope, depth + 1),
        );
      }
      return false;
    }

    if (map.containsKey('!=')) {
      final operands = map['!='];
      if (operands is List && operands.length >= 2) {
        return !_strictEquals(
          _evaluateDepth(operands[0], scope, depth + 1),
          _evaluateDepth(operands[1], scope, depth + 1),
        );
      }
      return true;
    }

    if (map.containsKey('and')) {
      final operands = map['and'];
      if (operands is List && operands.length >= 2) {
        final left = _evaluateDepth(operands[0], scope, depth + 1);
        if (!evaluateCondition(left, scope)) return false;
        final right = _evaluateDepth(operands[1], scope, depth + 1);
        return evaluateCondition(right, scope);
      }
      return false;
    }

    if (map.containsKey('or')) {
      final operands = map['or'];
      if (operands is List && operands.length >= 2) {
        final left = _evaluateDepth(operands[0], scope, depth + 1);
        if (evaluateCondition(left, scope)) return true;
        final right = _evaluateDepth(operands[1], scope, depth + 1);
        return evaluateCondition(right, scope);
      }
      return false;
    }

    if (map.containsKey('not')) {
      final operand = map['not'];
      return !evaluateCondition(_evaluateDepth(operand, scope, depth + 1), scope);
    }

    if (map.containsKey('if')) {
      final operands = map['if'];
      if (operands is List && operands.length >= 3) {
        final cond = _evaluateDepth(operands[0], scope, depth + 1);
        return evaluateCondition(cond, scope)
            ? _evaluateDepth(operands[1], scope, depth + 1)
            : _evaluateDepth(operands[2], scope, depth + 1);
      }
      return null;
    }

    if (map.containsKey('??')) {
      final operands = map['??'];
      if (operands is List && operands.length >= 2) {
        final left = _evaluateDepth(operands[0], scope, depth + 1);
        if (left != null) return left;
        return _evaluateDepth(operands[1], scope, depth + 1);
      }
      return null;
    }

    return null;
  }

  static dynamic _evaluateOp(Map<String, dynamic> node, Map<String, dynamic> scope, int depth) {
    final op = node['op'] as String?;
    if (op == null) return null;

    dynamic evalOperand(dynamic operand) => _evaluateDepth(operand, scope, depth + 1);

    switch (op) {
      case 'eq':
        return _strictEquals(evalOperand(node['left']), evalOperand(node['right']));

      case 'ne':
      case 'neq':
        return !_strictEquals(evalOperand(node['left']), evalOperand(node['right']));

      case 'gt':
        return _numericCompare(evalOperand(node['left']), evalOperand(node['right']), (a, b) => a > b);

      case 'gte':
        return _numericCompare(evalOperand(node['left']), evalOperand(node['right']), (a, b) => a >= b);

      case 'lt':
        return _numericCompare(evalOperand(node['left']), evalOperand(node['right']), (a, b) => a < b);

      case 'lte':
        return _numericCompare(evalOperand(node['left']), evalOperand(node['right']), (a, b) => a <= b);

      case 'and':
        final left = evalOperand(node['left']);
        if (!evaluateCondition(left, scope)) return false;
        final right = evalOperand(node['right']);
        return evaluateCondition(right, scope);

      case 'or':
        final left = evalOperand(node['left']);
        if (evaluateCondition(left, scope)) return true;
        final right = evalOperand(node['right']);
        return evaluateCondition(right, scope);

      case 'not':
        final operand = node.containsKey('v') ? node['v'] : node['right'] ?? node['left'];
        return !evaluateCondition(evalOperand(operand), scope);

      case 'add':
        return _arithmetic(evalOperand(node['left']), evalOperand(node['right']), (a, b) => a + b);

      case 'subtract':
        return _arithmetic(evalOperand(node['left']), evalOperand(node['right']), (a, b) => a - b);

      case 'multiply':
        return _arithmetic(evalOperand(node['left']), evalOperand(node['right']), (a, b) => a * b);

      case 'divide':
        return _arithmetic(evalOperand(node['left']), evalOperand(node['right']), (a, b) => b == 0 ? null : a / b);

      case 'contains':
        return _contains(evalOperand(node['left']), evalOperand(node['right']));

      case 'startsWith':
        return _startsWith(evalOperand(node['left']), evalOperand(node['right']));

      case 'coalesce':
        final left = evalOperand(node['left']);
        if (left != null) return left;
        return evalOperand(node['right']);

      case 'if':
      case 'ternary':
        final test = evalOperand(node.containsKey('test') ? node['test'] : node['condition']);
        return evaluateCondition(test, scope)
            ? evalOperand(node['then'])
            : evalOperand(node['else']);

      default:
        return null;
    }
  }

  static bool _strictEquals(dynamic a, dynamic b) {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    // Strict type parity: 1 != "1"
    if (a is num && b is! num) return false;
    if (b is num && a is! num) return false;
    if (a is bool && b is! bool) return false;
    if (b is bool && a is! bool) return false;
    if (a is String && b is! String) return false;
    if (b is String && a is! String) return false;

    // In UIDL spec, objects/maps and lists compare by reference identity
    if ((a is Map && b is Map) || (a is List && b is List)) {
      return identical(a, b);
    }

    return a == b;
  }

  static num? _toFiniteNumber(dynamic value) {
    if (value is num) {
      return value.isFinite ? value : null;
    }
    if (value is String) {
      final parsed = num.tryParse(value);
      return (parsed != null && parsed.isFinite) ? parsed : null;
    }
    return null;
  }

  static bool? _numericCompare(dynamic left, dynamic right, bool Function(num a, num b) compare) {
    final a = _toFiniteNumber(left);
    final b = _toFiniteNumber(right);
    if (a == null || b == null) return null;
    return compare(a, b);
  }

  static num? _arithmetic(dynamic left, dynamic right, num? Function(num a, num b) apply) {
    final a = _toFiniteNumber(left);
    final b = _toFiniteNumber(right);
    if (a == null || b == null) return null;
    return apply(a, b);
  }

  static bool? _contains(dynamic container, dynamic value) {
    if (container is List) {
      return container.contains(value);
    }
    if (container is String && value is String) {
      return container.contains(value);
    }
    return null;
  }

  static bool? _startsWith(dynamic str, dynamic prefix) {
    if (str is String && prefix is String) {
      return str.startsWith(prefix);
    }
    return null;
  }
}
