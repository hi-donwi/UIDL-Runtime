const List<String> renderScopePrefixes = ['local', 'state', 'session', 'route', 'data', 'event'];

final RegExp bindPrefixPattern = RegExp(r'^(local|state|session|route|data|event)(\..+)?$');

bool isBindPath(String path) {
  return bindPrefixPattern.hasMatch(path);
}

dynamic getByPath(dynamic obj, String path) {
  if (obj == null) return null;
  final keys = path.split('.');
  dynamic current = obj;

  for (final key in keys) {
    if (current is Map && current.containsKey(key)) {
      current = current[key];
    } else if (current is List) {
      final index = int.tryParse(key);
      if (index != null && index >= 0 && index < current.length) {
        current = current[index];
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  return current;
}

void setByPath(Map<String, dynamic> obj, String path, dynamic value) {
  final keys = path.split('.');
  final lastKey = keys.removeLast();
  Map<String, dynamic> current = obj;

  for (final key in keys) {
    if (!current.containsKey(key) || current[key] is! Map) {
      current[key] = <String, dynamic>{};
    }
    current = current[key] as Map<String, dynamic>;
  }

  current[lastKey] = value;
}

dynamic resolvePath(String path, Map<String, dynamic> scope) {
  for (final prefix in renderScopePrefixes) {
    if (path.startsWith('$prefix.')) {
      final target = scope[prefix];
      if (target == null) return null;
      return getByPath(target, path.substring(prefix.length + 1));
    } else if (path == prefix) {
      return scope[prefix];
    }
  }

  // Fallback: direct path resolution against scope
  return getByPath(scope, path);
}

dynamic resolveBinding(dynamic value, Map<String, dynamic> scope) {
  if (value is Map && value.containsKey(r'$bind')) {
    final bindPath = value[r'$bind'];
    if (bindPath is String) {
      return resolvePath(bindPath, scope);
    }
  }
  return value;
}
