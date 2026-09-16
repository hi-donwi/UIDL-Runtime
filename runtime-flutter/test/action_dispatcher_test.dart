import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

void main() {
  group('ActionDispatcher setState', () {
    test('rejects document writes into the reserved \$data envelope', () async {
      final state = <String, dynamic>{'count': 0};
      final dispatcher = ActionDispatcher(state: state, scope: <String, dynamic>{});

      await expectLater(
        dispatcher.execute({
          'setState': {'path': r'$data.invoices.status', 'value': 'success'},
        }),
        throwsA(
          isA<UidlException>().having(
            (error) => error.code,
            'code',
            UidlErrorCodes.invalidState,
          ),
        ),
      );
      expect(state.containsKey(r'$data'), isFalse);
      expect(state['count'], 0);
    });

    test('still writes ordinary state paths', () async {
      final state = <String, dynamic>{'count': 0};
      final dispatcher = ActionDispatcher(state: state, scope: <String, dynamic>{});

      await dispatcher.execute({
        'setState': {'path': 'count', 'value': 2},
      });

      expect(state['count'], 2);
    });
  });
}
