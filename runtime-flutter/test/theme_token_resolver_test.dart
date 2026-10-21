import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

void main() {
  final theme = ThemeTokens.fromJson({
    'primitives': {
      'color': {
        'primary': '#4B39EF',
        'surface-container-low': '#F6F8FB',
      },
      'border': {
        'width-thin': '1px',
        'style-solid': 'solid',
      },
      'elevation': {'low': '0 1px 2px'},
    },
    'semantics': {
      'color': {'text-on-primary': '{primitives.color.primary}'},
      'typography': {
        'headline-medium': {
          'fontSize': 'text-2xl',
          'fontWeight': 600,
        },
      },
    },
  });

  group('ThemeTokenResolver', () {
    test('braced primitives ref becomes a css custom property', () {
      expect(
        ThemeTokenResolver.tokenRefToCssVar('{primitives.color.primary}'),
        'var(--color-primary)',
      );
    });

    test('dotted key parts join with dashes', () {
      expect(
        ThemeTokenResolver.tokenRefToCssVar('{primitives.border.width.thin}'),
        'var(--border-width-thin)',
      );
    });

    test('non-primitives or malformed refs resolve to null', () {
      expect(
        ThemeTokenResolver.tokenRefToCssVar('{semantics.color.text-on-primary}'),
        isNull,
      );
      expect(
        ThemeTokenResolver.tokenRefToCssVar('{primitives.elevation.low}'),
        isNull,
      );
      expect(ThemeTokenResolver.tokenRefToCssVar('{primitives.color}'), isNull);
      expect(
        ThemeTokenResolver.tokenRefToCssVar('primitives.color.primary'),
        isNull,
      );
    });

    test('bare paths resolve primitive and semantic values', () {
      expect(
        ThemeTokenResolver.resolveToken(
          theme,
          'primitives.color.surface-container-low',
        ),
        '#F6F8FB',
      );
      expect(
        ThemeTokenResolver.resolveToken(theme, 'primitives.border.width-thin'),
        '1px',
      );
      expect(
        ThemeTokenResolver.resolveToken(theme, 'primitives.border.width.thin'),
        '1px',
      );
    });

    test('semantic holders stay opaque token references', () {
      expect(
        ThemeTokenResolver.resolveToken(theme, 'semantics.color.text-on-primary'),
        '{primitives.color.primary}',
      );
    });

    test('typography tokens resolve as maps', () {
      expect(
        ThemeTokenResolver.resolveToken(
          theme,
          'semantics.typography.headline-medium',
        ),
        {
          'fontSize': 'text-2xl',
          'fontWeight': 600,
        },
      );
    });

    test('unknown token spaces and categories resolve to null', () {
      expect(
        ThemeTokenResolver.resolveToken(theme, 'components.button.primary'),
        isNull,
      );
      expect(
        ThemeTokenResolver.resolveToken(theme, 'primitives.elevation.low'),
        isNull,
      );
      expect(ThemeTokenResolver.resolveToken(theme, 'semantics.color'), isNull);
      expect(ThemeTokenResolver.resolveToken(theme, 'primitives'), isNull);
    });

    test('fromJson tolerates missing token groups', () {
      final empty = ThemeTokens.fromJson(const {});
      expect(empty.primitives, isEmpty);
      expect(empty.semantics, isEmpty);
      expect(
        ThemeTokenResolver.resolveToken(empty, 'primitives.color.primary'),
        isNull,
      );
    });
  });
}
