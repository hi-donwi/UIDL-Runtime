/// A UIDL theme's token data: named primitive and semantic groups a document
/// may reference.
///
/// Token data ships as JSON in `conformance/themes/` (generated from the
/// reference runtime's presets by `pnpm export:themes`); [ThemeTokens.fromJson]
/// parses that shape. Resolution mirrors the reference engine
/// (`packages/core/src/theme/engine.ts`) and is asserted by conformance cases.
class ThemeTokens {
  final Map<String, Map<String, dynamic>> primitives;
  final Map<String, Map<String, dynamic>> semantics;

  const ThemeTokens({
    required this.primitives,
    required this.semantics,
  });

  factory ThemeTokens.fromJson(Map<String, dynamic> raw) {
    return ThemeTokens(
      primitives: _tokenGroups(raw['primitives']),
      semantics: _tokenGroups(raw['semantics']),
    );
  }

  static Map<String, Map<String, dynamic>> _tokenGroups(dynamic raw) {
    if (raw is! Map<String, dynamic>) {
      return const {};
    }
    final groups = <String, Map<String, dynamic>>{};
    raw.forEach((category, value) {
      if (value is Map<String, dynamic>) {
        groups[category] = value;
      }
    });
    return groups;
  }
}

/// Cross-platform theme token resolution, mirroring the reference runtime's
/// theme engine (packages/core/src/theme/engine.ts). Conformance cases assert
/// this behaviour, so the rules here must not drift from the TypeScript (and
/// Kotlin/Android) implementations.
class ThemeTokenResolver {
  /// Categories that map to CSS custom properties; mirrors CSS_VAR_CATEGORIES.
  static const Set<String> cssVarCategories = {
    'color',
    'spacing',
    'radius',
    'shadow',
    'font',
    'border',
  };

  static const Set<String> semanticCategories = {
    'color',
    'spacing',
    'radius',
    'shadow',
    'typography',
  };

  /// Turns a braced token reference into its CSS custom property:
  /// `{primitives.color.primary}` → `var(--color-primary)`. Dots after the
  /// category join with "-", so `{primitives.border.width.thin}` hits
  /// `--border-width-thin` too. Returns null for anything that is not a
  /// braced primitives reference.
  static String? tokenRefToCssVar(String ref) {
    if (!ref.startsWith('{') || !ref.endsWith('}')) {
      return null;
    }
    final parts = ref.substring(1, ref.length - 1).split('.');
    if (parts.length < 3 || parts.first != 'primitives') {
      return null;
    }
    final category = parts[1];
    if (!cssVarCategories.contains(category)) {
      return null;
    }
    return 'var(--$category-${parts.sublist(2).join('-')})';
  }

  /// Resolves a bare token path to its theme value without dereferencing
  /// nested `{...}` refs (semantic holders stay opaque, matching the
  /// reference runtime). Returns null for paths outside the
  /// primitives/semantics token spaces or for unknown categories.
  static dynamic resolveToken(ThemeTokens theme, String path) {
    final parts = path.split('.');
    final Map<String, Map<String, dynamic>> groups;
    switch (parts.first) {
      case 'primitives':
        groups = theme.primitives;
      case 'semantics':
        groups = theme.semantics;
      default:
        return null;
    }
    if (parts.length < 2) {
      return null;
    }
    final category = parts[1];
    final known = parts.first == 'primitives' ? cssVarCategories : semanticCategories;
    if (!known.contains(category)) {
      return null;
    }
    // Dotted key parts join with "-" to match tokenRefToCssVar, so
    // `primitives.border.width.thin` and `primitives.border.width-thin` hit one key.
    final key = parts.sublist(2).join('-');
    return groups[category]?[key];
  }
}
