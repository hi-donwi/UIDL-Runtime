import 'package:flutter/material.dart';
import 'theme_resolver.dart';

class UidlThemeAdapter {
  static ThemeData toFlutterTheme(Map<String, dynamic>? uidlTheme, {String? name}) {
    if (uidlTheme == null || uidlTheme.isEmpty) {
      return ThemeData();
    }

    final primaryColor = ThemeResolver.parseColor(uidlTheme['primaryColor'] ?? uidlTheme['primary']);
    final secondaryColor = ThemeResolver.parseColor(uidlTheme['secondaryColor'] ?? uidlTheme['secondary']);
    final surfaceColor = ThemeResolver.parseColor(uidlTheme['surfaceColor'] ?? uidlTheme['surface']);
    final errorColor = ThemeResolver.parseColor(uidlTheme['errorColor'] ?? uidlTheme['error']);
    final backgroundColor = ThemeResolver.parseColor(uidlTheme['backgroundColor'] ?? uidlTheme['background']);

    final brightness = uidlTheme['brightness'] == 'dark'
        ? Brightness.dark
        : Brightness.light;

    final colorScheme = ColorScheme(
      brightness: brightness,
      primary: primaryColor ?? (brightness == Brightness.dark ? Colors.blue.shade300 : Colors.blue.shade700),
      onPrimary: Colors.white,
      secondary: secondaryColor ?? (brightness == Brightness.dark ? Colors.teal.shade300 : Colors.teal.shade700),
      onSecondary: Colors.white,
      surface: surfaceColor ?? (brightness == Brightness.dark ? Colors.grey.shade900 : Colors.white),
      onSurface: brightness == Brightness.dark ? Colors.white : Colors.black,
      error: errorColor ?? Colors.red,
      onError: Colors.white,
    );

    final textTheme = _buildTextTheme(uidlTheme['textStyle'], brightness);

    return ThemeData(
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: backgroundColor,
      textTheme: textTheme,
      useMaterial3: true,
    );
  }

  static TextTheme _buildTextTheme(Map<String, dynamic>? textStyle, Brightness brightness) {
    final baseColor = brightness == Brightness.dark ? Colors.white : Colors.black87;

    if (textStyle == null) {
      return TextTheme(
        bodyLarge: TextStyle(color: baseColor),
        bodyMedium: TextStyle(color: baseColor),
        bodySmall: TextStyle(color: baseColor.withValues(alpha: 0.7)),
        titleLarge: TextStyle(color: baseColor, fontWeight: FontWeight.bold),
        titleMedium: TextStyle(color: baseColor, fontWeight: FontWeight.w600),
        titleSmall: TextStyle(color: baseColor, fontWeight: FontWeight.w500),
      );
    }

    final fontFamily = textStyle['fontFamily'] as String?;
    final fontSize = textStyle['fontSize'] is num
        ? (textStyle['fontSize'] as num).toDouble()
        : null;

    return TextTheme(
      bodyLarge: TextStyle(
        fontFamily: fontFamily,
        fontSize: fontSize != null ? fontSize + 4 : null,
        color: baseColor,
      ),
      bodyMedium: TextStyle(
        fontFamily: fontFamily,
        fontSize: fontSize,
        color: baseColor,
      ),
      bodySmall: TextStyle(
        fontFamily: fontFamily,
        fontSize: fontSize != null ? fontSize - 2 : null,
        color: baseColor.withValues(alpha: 0.7),
      ),
      titleLarge: TextStyle(
        fontFamily: fontFamily,
        fontSize: fontSize != null ? fontSize + 8 : null,
        fontWeight: FontWeight.bold,
        color: baseColor,
      ),
      titleMedium: TextStyle(
        fontFamily: fontFamily,
        fontSize: fontSize != null ? fontSize + 4 : null,
        fontWeight: FontWeight.w600,
        color: baseColor,
      ),
      titleSmall: TextStyle(
        fontFamily: fontFamily,
        fontSize: fontSize,
        fontWeight: FontWeight.w500,
        color: baseColor,
      ),
    );
  }

  static Map<String, dynamic> fromFlutterTheme(ThemeData theme) {
    return {
      'primaryColor': theme.colorScheme.primary.toARGB32(),
      'secondaryColor': theme.colorScheme.secondary.toARGB32(),
      'surfaceColor': theme.colorScheme.surface.toARGB32(),
      'errorColor': theme.colorScheme.error.toARGB32(),
      'backgroundColor': theme.scaffoldBackgroundColor.toARGB32(),
      'brightness': theme.brightness == Brightness.dark ? 'dark' : 'light',
    };
  }
}
