import 'package:flutter/material.dart';
import 'theme_adapter.dart';

/// Predefined UIDL theme presets matching the canonical UIDL specification.
class UidlThemePreset {
  final String id;
  final String name;
  final Brightness brightness;
  final Color primaryColor;
  final Color secondaryColor;
  final Color backgroundColor;
  final Color surfaceColor;
  final Color errorColor;

  const UidlThemePreset({
    required this.id,
    required this.name,
    required this.brightness,
    required this.primaryColor,
    required this.secondaryColor,
    required this.backgroundColor,
    required this.surfaceColor,
    required this.errorColor,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'brightness': brightness == Brightness.dark ? 'dark' : 'light',
      'primaryColor': '#${_colorToHex(primaryColor)}',
      'secondaryColor': '#${_colorToHex(secondaryColor)}',
      'backgroundColor': '#${_colorToHex(backgroundColor)}',
      'surfaceColor': '#${_colorToHex(surfaceColor)}',
      'errorColor': '#${_colorToHex(errorColor)}',
    };
  }

  static String _colorToHex(Color color) {
    final a = (color.a * 255.0).round().clamp(0, 255);
    final r = (color.r * 255.0).round().clamp(0, 255);
    final g = (color.g * 255.0).round().clamp(0, 255);
    final b = (color.b * 255.0).round().clamp(0, 255);
    return '${a.toRadixString(16).padLeft(2, '0')}'
        '${r.toRadixString(16).padLeft(2, '0')}'
        '${g.toRadixString(16).padLeft(2, '0')}'
        '${b.toRadixString(16).padLeft(2, '0')}';
  }

  ThemeData toThemeData() {
    return UidlThemeAdapter.toFlutterTheme(toMap());
  }
}

class UidlPresets {
  static const defaultLight = UidlThemePreset(
    id: 'preset-light',
    name: 'Default Light',
    brightness: Brightness.light,
    primaryColor: Color(0xFF1976D2),
    secondaryColor: Color(0xFF00796B),
    backgroundColor: Color(0xFFF8FAFC),
    surfaceColor: Color(0xFFFFFFFF),
    errorColor: Color(0xFFD32F2F),
  );

  static const defaultDark = UidlThemePreset(
    id: 'preset-dark',
    name: 'Default Dark',
    brightness: Brightness.dark,
    primaryColor: Color(0xFF90CAF9),
    secondaryColor: Color(0xFF80CBC4),
    backgroundColor: Color(0xFF0F172A),
    surfaceColor: Color(0xFF1E293B),
    errorColor: Color(0xFFEF5350),
  );

  static const meridianLight = UidlThemePreset(
    id: 'meridian-light',
    name: 'Meridian Light',
    brightness: Brightness.light,
    primaryColor: Color(0xFF1E3A8A),
    secondaryColor: Color(0xFF0284C7),
    backgroundColor: Color(0xFFF1F5F9),
    surfaceColor: Color(0xFFFFFFFF),
    errorColor: Color(0xFFDC2626),
  );

  static const meridianDark = UidlThemePreset(
    id: 'meridian-dark',
    name: 'Meridian Dark',
    brightness: Brightness.dark,
    primaryColor: Color(0xFF60A5FA),
    secondaryColor: Color(0xFF38BDF8),
    backgroundColor: Color(0xFF0B132B),
    surfaceColor: Color(0xFF1C2541),
    errorColor: Color(0xFFF87171),
  );

  static List<UidlThemePreset> get all => [
        defaultLight,
        defaultDark,
        meridianLight,
        meridianDark,
      ];

  static UidlThemePreset? findById(String id) {
    for (final p in all) {
      if (p.id == id) return p;
    }
    return null;
  }
}
