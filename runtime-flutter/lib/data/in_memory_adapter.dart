import 'data_source.dart';

class InMemoryDataAdapter implements DataAdapter {
  final Map<String, List<Map<String, dynamic>>> collections;

  InMemoryDataAdapter([Map<String, List<Map<String, dynamic>>>? initialCollections])
      : collections = initialCollections != null
            ? Map<String, List<Map<String, dynamic>>>.from(initialCollections)
            : <String, List<Map<String, dynamic>>>{};

  @override
  Future<List<Map<String, dynamic>>> query(String target, Map<String, dynamic> params) async {
    final rows = collections[target] ?? const [];
    return List<Map<String, dynamic>>.from(rows);
  }
}
