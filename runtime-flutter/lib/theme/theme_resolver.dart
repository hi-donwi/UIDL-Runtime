import 'package:flutter/material.dart';

class ThemeResolver {
  static Color? parseColor(dynamic value) {
    if (value == null) return null;
    if (value is Color) return value;
    if (value is int) {
      final a = (value >> 24) & 0xFF;
      final r = (value >> 16) & 0xFF;
      final g = (value >> 8) & 0xFF;
      final b = value & 0xFF;
      return Color.fromARGB(a, r, g, b);
    }

    if (value is String) {
      String hex = value.trim();
      if (hex.startsWith('#')) {
        hex = hex.substring(1);
        int a = 0xFF;
        int r = 0;
        int g = 0;
        int b = 0;

        if (hex.length == 8) {
          a = int.tryParse(hex.substring(0, 2), radix: 16) ?? 0xFF;
          r = int.tryParse(hex.substring(2, 4), radix: 16) ?? 0;
          g = int.tryParse(hex.substring(4, 6), radix: 16) ?? 0;
          b = int.tryParse(hex.substring(6, 8), radix: 16) ?? 0;
        } else if (hex.length == 6) {
          r = int.tryParse(hex.substring(0, 2), radix: 16) ?? 0;
          g = int.tryParse(hex.substring(2, 4), radix: 16) ?? 0;
          b = int.tryParse(hex.substring(4, 6), radix: 16) ?? 0;
        } else if (hex.length == 3) {
          r = int.tryParse('${hex[0]}${hex[0]}', radix: 16) ?? 0;
          g = int.tryParse('${hex[1]}${hex[1]}', radix: 16) ?? 0;
          b = int.tryParse('${hex[2]}${hex[2]}', radix: 16) ?? 0;
        } else {
          return null;
        }

        return Color.fromARGB(a, r, g, b);
      } else if (hex.startsWith('rgba(') || hex.startsWith('rgb(')) {
        final match = RegExp(r'\d+\.?\d*').allMatches(hex).toList();
        if (match.length >= 3) {
          final r = int.tryParse(match[0].group(0)!) ?? 0;
          final g = int.tryParse(match[1].group(0)!) ?? 0;
          final b = int.tryParse(match[2].group(0)!) ?? 0;
          double a = 1.0;
          if (match.length >= 4) {
            a = double.tryParse(match[3].group(0)!) ?? 1.0;
          }
          return Color.fromRGBO(r, g, b, a);
        }
      }
    }
    return null;
  }

  static EdgeInsets? parsePadding(dynamic value) {
    if (value == null) return null;
    if (value is num) return EdgeInsets.all(value.toDouble());
    if (value is List) {
      if (value.length == 2) {
        return EdgeInsets.symmetric(
          vertical: (value[0] as num).toDouble(),
          horizontal: (value[1] as num).toDouble(),
        );
      }
      if (value.length == 4) {
        return EdgeInsets.fromLTRB(
          (value[3] as num).toDouble(),
          (value[0] as num).toDouble(),
          (value[1] as num).toDouble(),
          (value[2] as num).toDouble(),
        );
      }
    }
    return null;
  }

  static TextStyle resolveTextStyle(Map<String, dynamic>? style, BuildContext context) {
    if (style == null) return Theme.of(context).textTheme.bodyMedium ?? const TextStyle();

    double? fontSize;
    FontWeight? fontWeight;
    final Color? color = parseColor(style['color']);

    if (style.containsKey('fontSize')) {
      final fs = style['fontSize'];
      if (fs is num) fontSize = fs.toDouble();
    }

    if (style.containsKey('fontWeight')) {
      final fw = style['fontWeight'].toString();
      if (fw == 'bold' || fw == '700') fontWeight = FontWeight.bold;
      if (fw == '600') fontWeight = FontWeight.w600;
      if (fw == '500') fontWeight = FontWeight.w500;
      if (fw == 'normal' || fw == '400') fontWeight = FontWeight.normal;
    }

    return TextStyle(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
    );
  }
}
