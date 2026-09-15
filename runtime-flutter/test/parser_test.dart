import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

void main() {
  group('UidlParser & VersionGuard', () {
    test('parses a valid document successfully', () {
      final json = {
        'version': '1.0.0',
        'id': 'test-doc',
        'name': 'Test Document',
        'root': {
          'id': 'root',
          'type': 'Column',
          'children': [
            {'id': 'txt', 'type': 'Text', 'props': {'value': 'Hello'}},
          ],
        },
      };

      final doc = UidlParser.parse(json);
      expect(doc.id, 'test-doc');
      expect(doc.version, '1.0.0');
      expect(doc.root.type, 'Column');
      expect(doc.root.children.length, 1);
      expect(doc.root.children.first.props['value'], 'Hello');
    });

    test('rejects malformed version with MALFORMED_VERSION', () {
      final json = {
        'version': 'invalid-version',
        'id': 'test-doc',
        'root': {'id': 'root', 'type': 'Column'},
      };

      expect(
        () => UidlParser.parse(json),
        throwsA(predicate((e) =>
            e is DocumentVersionException &&
            e.code == UidlErrorCodes.malformedVersion)),
      );
    });

    test('rejects unsupported major version with UNSUPPORTED_VERSION', () {
      final json = {
        'version': '2.0.0',
        'id': 'test-doc',
        'root': {'id': 'root', 'type': 'Column'},
      };

      expect(
        () => UidlParser.parse(json),
        throwsA(predicate((e) =>
            e is DocumentVersionException &&
            e.code == UidlErrorCodes.unsupportedVersion)),
      );
    });

    test('rejects document without root node with INVALID_DOCUMENT', () {
      final json = {
        'version': '1.0.0',
        'id': 'test-doc',
      };

      expect(
        () => UidlParser.parse(json),
        throwsA(predicate((e) =>
            e is UidlException && e.code == UidlErrorCodes.invalidDocument)),
      );
    });
  });
}
