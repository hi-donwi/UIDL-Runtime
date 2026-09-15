import '../binding/binding_resolver.dart';

abstract class DataAdapter {
  Future<List<Map<String, dynamic>>> query(String target, Map<String, dynamic> params);
}

class DataSourceRunner {
  static void initializeDataSources(
    Map<String, dynamic> dataSources,
    Map<String, dynamic> state,
    Map<String, dynamic> data,
  ) {
    if (!state.containsKey(r'$data')) {
      state[r'$data'] = <String, dynamic>{};
    }
    final dollarData = state[r'$data'] as Map<String, dynamic>;

    for (final entry in dataSources.entries) {
      final name = entry.key;
      final config = entry.value;

      if (config is List) {
        data[name] = config;
        dollarData[name] = {
          'status': 'ready',
          'rows': config,
          'total': config.length,
          'error': null,
        };
      } else if (config is Map && config.containsKey(r'$query')) {
        dollarData[name] = {
          'status': 'idle',
          'rows': [],
          'total': 0,
          'error': null,
        };
      }
    }
  }

  static dynamic resolveDataSourceRows(dynamic dataSource, Map<String, dynamic> scope) {
    if (dataSource is List) {
      return dataSource;
    }
    if (dataSource is String) {
      final bound = resolvePath(dataSource, scope);
      if (bound is List) return bound;
      if (scope.containsKey('data') && scope['data'] is Map) {
        final dataMap = scope['data'] as Map;
        if (dataMap.containsKey(dataSource) && dataMap[dataSource] is List) {
          return dataMap[dataSource];
        }
      }
    }
    if (dataSource is Map && dataSource.containsKey(r'$bind')) {
      final bound = resolveBinding(dataSource, scope);
      if (bound is List) return bound;
    }
    return null;
  }
}
