import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/theme/presets.dart';

void main() {
  group('UidlPresets and UidlThemePreset', () {
    test('all presets have valid properties and distinct IDs', () {
      final presets = UidlPresets.all;
      expect(presets.length, equals(4));

      final ids = presets.map((p) => p.id).toSet();
      expect(ids.length, equals(4));

      for (final preset in presets) {
        expect(preset.id, isNotEmpty);
        expect(preset.name, isNotEmpty);
      }
    });

    test('findById retrieves expected presets', () {
      final light = UidlPresets.findById('preset-light');
      expect(light, isNotNull);
      expect(light!.brightness, equals(Brightness.light));

      final dark = UidlPresets.findById('preset-dark');
      expect(dark, isNotNull);
      expect(dark!.brightness, equals(Brightness.dark));

      final meridianLight = UidlPresets.findById('meridian-light');
      expect(meridianLight, isNotNull);
      expect(meridianLight!.brightness, equals(Brightness.light));

      final meridianDark = UidlPresets.findById('meridian-dark');
      expect(meridianDark, isNotNull);
      expect(meridianDark!.brightness, equals(Brightness.dark));

      expect(UidlPresets.findById('non-existent'), isNull);
    });

    test('toMap converts preset into valid map with hex colors', () {
      final preset = UidlPresets.defaultLight;
      final map = preset.toMap();

      expect(map['id'], equals('preset-light'));
      expect(map['name'], equals('Default Light'));
      expect(map['brightness'], equals('light'));
      expect(map['primaryColor'], startsWith('#'));
      expect(map['secondaryColor'], startsWith('#'));
      expect(map['backgroundColor'], startsWith('#'));
      expect(map['surfaceColor'], startsWith('#'));
      expect(map['errorColor'], startsWith('#'));
    });

    test('toThemeData generates valid Flutter ThemeData', () {
      final lightTheme = UidlPresets.defaultLight.toThemeData();
      expect(lightTheme.brightness, equals(Brightness.light));
      expect(lightTheme.colorScheme.primary, isNotNull);

      final darkTheme = UidlPresets.defaultDark.toThemeData();
      expect(darkTheme.brightness, equals(Brightness.dark));
      expect(darkTheme.colorScheme.primary, isNotNull);

      final meridianTheme = UidlPresets.meridianLight.toThemeData();
      expect(meridianTheme.brightness, equals(Brightness.light));
      expect(meridianTheme.useMaterial3, isTrue);
    });
  });
}
