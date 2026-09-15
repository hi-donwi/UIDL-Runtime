import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

void main() {
  group('Cross-Platform Conformance Suite (spec v1)', () {
    final casesDir = Directory('../conformance/cases');
    if (!casesDir.existsSync()) {
      fail('Conformance cases directory not found at ${casesDir.path}');
    }

    final List<Map<String, dynamic>> activeCases = [];

    for (final entity in casesDir.listSync(recursive: true)) {
      if (entity is File && entity.path.endsWith('.json')) {
        final content = entity.readAsStringSync();
        final json = jsonDecode(content) as Map<String, dynamic>;
        if (json['status'] == 'active') {
          activeCases.add(json);
        }
      }
    }

    group('expression', () {
      final exprCases = activeCases.where((c) => c['class'] == 'expression');
      for (final c in exprCases) {
        test('evaluates ${c['id']}', () {
          final context = c['context'] as Map<String, dynamic>? ?? {};
          final result = ExpressionEvaluator.evaluate(c['input'], context);
          expect(result, c['expected']);
        });
      }
    });

    group('condition', () {
      final condCases = activeCases.where((c) => c['class'] == 'condition');
      for (final c in condCases) {
        test('condition ${c['id']}', () {
          final context = c['context'] as Map<String, dynamic>? ?? {};
          final result = ExpressionEvaluator.evaluateCondition(c['input'], context);
          expect(result, c['expected']);
        });
      }
    });

    group('binding', () {
      final bindCases = activeCases.where((c) => c['class'] == 'binding');
      for (final c in bindCases) {
        test('resolves ${c['id']}', () {
          final context = c['context'] as Map<String, dynamic>? ?? {};
          final input = c['input'] as Map<String, dynamic>;
          final bindPath = input[r'$bind'] as String;
          final result = resolvePath(bindPath, context);
          expect(result, c['expected']);
        });
      }
    });

    group('action', () {
      final actionCases = activeCases.where((c) => c['class'] == 'action');
      for (final c in actionCases) {
        test('accepts ${c['id']}', () {
          final input = c['input'] as Map<String, dynamic>;
          final hasKnown = input.keys.any((k) => ActionDispatcher.knownActionKinds.contains(k));
          expect(hasKnown, c['expected']);
        });
      }
    });

    group('error', () {
      final errorCases = activeCases.where((c) => c['class'] == 'error');
      for (final c in errorCases) {
        test('rejects ${c['id']} with expected error', () {
          final input = c['input'];
          expect(
            () => UidlParser.parse(input),
            throwsA(isA<UidlException>()),
          );
        });
      }
    });

    group('render', () {
      final renderCases = activeCases.where((c) => c['class'] == 'render');
      for (final c in renderCases) {
        test('constructs document for ${c['id']}', () {
          final doc = UidlDocument.fromJson(c['input'] as Map<String, dynamic>);
          expect(doc.id, isNotNull);
          expect(doc.root, isNotNull);
        });
      }
    });

    group('data', () {
      final dataCases = activeCases.where((c) => c['class'] == 'data');
      for (final c in dataCases) {
        test('resolves dataSource for ${c['id']}', () {
          final input = c['input'] as Map<String, dynamic>;
          final state = <String, dynamic>{};
          final data = <String, dynamic>{};
          DataSourceRunner.initializeDataSources(
            {input['key'] as String: input['config']},
            state,
            data,
          );
          if (c['expected'] == true) {
            expect(state.containsKey(r'$data'), isTrue);
          }
        });
      }
    });
  });
}
