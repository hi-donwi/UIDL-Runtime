import 'package:flutter/material.dart';

class ThemeResolver {
  static Color? parseColor(dynamic value) {
    if (value == null) return null;
    if (value is Color) return value;
    if (value is int) return Color(value);

    if (value is String) {
      String hex = value.trim();
      if (hex.startsWith('#')) {
        hex = hex.substring(1);
        if (hex.length == 6) {
          hex = 'FF$hex';
        } else if (hex.length == 3) {
          hex = 'FF${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}';
        }
        final intVal = int.tryParse(hex, radix: 16);
        if (intVal != null) return Color(intVal);
      } else if (hex.startsWith('rgba(') || hex.startsWith('rgb(')) {
        final match = RegExp(r'\d+').allMatches(hex).toList();
        if (match.length >= 3) {
          final r = int.parse(match[0].group(0)!);
          final g = int.parse(match[1].group(0)!);
          final b = int.parse(match[2].group(0)!);
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
    Color? color = parseColor(style['color']);

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
