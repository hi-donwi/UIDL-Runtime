import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

void main() {
  group('ExpressionEvaluator', () {
    test('evaluates literals', () {
      expect(ExpressionEvaluator.evaluate({'literal': 42}, {}), 42);
      expect(ExpressionEvaluator.evaluate({'literal': 'hello'}, {}), 'hello');
      expect(ExpressionEvaluator.evaluate({'literal': true}, {}), true);
    });

    test('evaluates arithmetic with divide-by-zero protection', () {
      expect(
        ExpressionEvaluator.evaluate({
          'op': 'add',
          'left': {'literal': 10},
          'right': {'literal': 5},
        }, {}),
        15,
      );

      expect(
        ExpressionEvaluator.evaluate({
          'op': 'divide',
          'left': {'literal': 10},
          'right': {'literal': 2},
        }, {}),
        5.0,
      );

      expect(
        ExpressionEvaluator.evaluate({
          'op': 'divide',
          'left': {'literal': 10},
          'right': {'literal': 0},
        }, {}),
        isNull,
      );
    });

    test('evaluates comparisons and strict equality', () {
      expect(
        ExpressionEvaluator.evaluate({
          'op': 'eq',
          'left': {'literal': 1},
          'right': {'literal': '1'},
        }, {}),
        isFalse,
      );

      expect(
        ExpressionEvaluator.evaluate({
          'op': 'gt',
          'left': {'literal': 10},
          'right': {'literal': 5},
        }, {}),
        isTrue,
      );
    });

    test('evaluates strings and arrays: contains, startsWith, coalesce', () {
      expect(
        ExpressionEvaluator.evaluate({
          'op': 'contains',
          'left': {'literal': 'universal ui'},
          'right': {'literal': 'ui'},
        }, {}),
        isTrue,
      );

      expect(
        ExpressionEvaluator.evaluate({
          'op': 'startsWith',
          'left': {'literal': 'prefix_item'},
          'right': {'literal': 'prefix'},
        }, {}),
        isTrue,
      );

      expect(
        ExpressionEvaluator.evaluate({
          'op': 'coalesce',
          'left': {'literal': null},
          'right': {'literal': 'fallback'},
        }, {}),
        'fallback',
      );
    });

    test('aborts evaluation beyond max depth of 64', () {
      // Build an expression nested 70 levels deep
      dynamic deeplyNested = {'literal': 1};
      for (int i = 0; i < 70; i++) {
        deeplyNested = {'op': 'add', 'left': deeplyNested, 'right': {'literal': 1}};
      }

      final result = ExpressionEvaluator.evaluate(deeplyNested, {});
      expect(result, isNull);
    });
  });
}
