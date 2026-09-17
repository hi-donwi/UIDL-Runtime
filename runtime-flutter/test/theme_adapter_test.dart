import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

void main() {
  group('ThemeResolver', () {
    test('parses hex color correctly', () {
      final red = ThemeResolver.parseColor('#FF0000');
      expect(red, isNotNull);
      expect(red!.red, 255);
      expect(red.green, 0);
      expect(red.blue, 0);

      final green = ThemeResolver.parseColor('#00FF00');
      expect(green, isNotNull);
      expect(green!.green, 255);

      final blue = ThemeResolver.parseColor('#0000FF');
      expect(blue, isNotNull);
      expect(blue!.blue, 255);

      final withAlpha = ThemeResolver.parseColor('#80FF0000');
      expect(withAlpha, isNotNull);
      expect(withAlpha!.alpha, 128);
    });

    test('parses rgb/rgba color correctly', () {
      final red = ThemeResolver.parseColor('rgb(255, 0, 0)');
      expect(red, isNotNull);
      expect(red!.red, 255);

      final green = ThemeResolver.parseColor('rgba(0, 255, 0, 0.5)');
      expect(green, isNotNull);
      expect(green!.green, 255);
    });

    test('returns null for invalid color', () {
      expect(ThemeResolver.parseColor('invalid'), isNull);
      expect(ThemeResolver.parseColor(null), isNull);
    });

    test('parses padding correctly', () {
      expect(ThemeResolver.parsePadding(8), const EdgeInsets.all(8));
      expect(
        ThemeResolver.parsePadding([4, 8]),
        const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      );
      expect(
        ThemeResolver.parsePadding([1, 2, 3, 4]),
        const EdgeInsets.fromLTRB(4, 1, 2, 3),
      );
    });
  });

  group('UidlThemeAdapter', () {
    test('converts UIDL theme to Flutter ThemeData', () {
      final uidlTheme = {
        'primaryColor': '#2196F3',
        'secondaryColor': '#FF9800',
        'brightness': 'light',
      };

      final theme = UidlThemeAdapter.toFlutterTheme(uidlTheme);

      expect(theme.brightness, Brightness.light);
      expect(theme.colorScheme.primary.red, 33);
      expect(theme.colorScheme.secondary.red, 255);
    });

    test('handles dark theme', () {
      final uidlTheme = {
        'brightness': 'dark',
      };

      final theme = UidlThemeAdapter.toFlutterTheme(uidlTheme);

      expect(theme.brightness, Brightness.dark);
    });

    test('returns default theme for null input', () {
      final theme = UidlThemeAdapter.toFlutterTheme(null);
      expect(theme, isA<ThemeData>());
    });

    test('converts Flutter theme back to UIDL format', () {
      final flutterTheme = ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blue,
          brightness: Brightness.light,
        ),
      );

      final uidlTheme = UidlThemeAdapter.fromFlutterTheme(flutterTheme);

      expect(uidlTheme['brightness'], 'light');
      expect(uidlTheme['primaryColor'], isNotNull);
      expect(uidlTheme['secondaryColor'], isNotNull);
    });
  });
}
