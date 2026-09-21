import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

void main() {
  group('BindingResolver', () {
    final scope = {
      'state': {
        'user': {'name': 'Alice', 'role': 'admin'},
        'count': 10,
      },
      'route': {'id': 'order_123'},
      'session': {'token': 'jwt_abc'},
      'data': {
        'products': [
          {'name': 'Widget A'},
          {'name': 'Widget B'},
        ],
      },
    };

    test('resolves simple and nested state paths', () {
      expect(resolvePath('state.user.name', scope), 'Alice');
      expect(resolvePath('state.user.role', scope), 'admin');
      expect(resolvePath('state.count', scope), 10);
    });

    test('resolves route and session scopes', () {
      expect(resolvePath('route.id', scope), 'order_123');
      expect(resolvePath('session.token', scope), 'jwt_abc');
    });

    test('resolves list elements by index', () {
      expect(resolvePath('data.products.0.name', scope), 'Widget A');
      expect(resolvePath('data.products.1.name', scope), 'Widget B');
    });

    test('returns null for missing keys without throwing', () {
      expect(resolvePath('state.non_existent', scope), isNull);
      expect(resolvePath('state.user.non_existent.deep', scope), isNull);
      expect(resolvePath('unknown_scope.foo', scope), isNull);
    });

    test(r'resolves $bind objects', () {
      expect(resolveBinding({r'$bind': 'state.user.name'}, scope), 'Alice');
      expect(resolveBinding({r'$bind': 'route.id'}, scope), 'order_123');
      expect(resolveBinding('plain_literal', scope), 'plain_literal');
    });

    test('setByPath updates nested state', () {
      final state = <String, dynamic>{'counter': 0};
      setByPath(state, 'counter', 1);
      expect(state['counter'], 1);

      setByPath(state, 'profile.settings.darkMode', true);
      expect((state['profile'] as Map)['settings']['darkMode'], true);
    });
  });
}
