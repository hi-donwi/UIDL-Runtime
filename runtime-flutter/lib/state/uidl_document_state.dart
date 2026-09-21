import 'package:flutter/foundation.dart';
import '../actions/action_dispatcher.dart';
import '../binding/binding_resolver.dart';
import '../data/data_source.dart';
import '../model/document.dart';
import '../registry/component_registry.dart';

class UidlDocumentState extends ChangeNotifier {
  final UidlDocument document;
  late final Map<String, dynamic> state;
  late final Map<String, dynamic> data;
  final Map<String, dynamic> session;
  final Map<String, dynamic> route;
  final ComponentRegistry registry;
  late final ActionDispatcher dispatcher;

  NavigationHandler? onNavigate;
  SnackbarHandler? onSnackbar;
  MutationHandler? onMutate;
  CommandHandler? onCommand;
  DownloadHandler? onDownload;
  ApiHandler? onApi;
  QueryHandler? onQuery;

  UidlDocumentState({
    required this.document,
    Map<String, dynamic>? initialData,
    Map<String, dynamic>? session,
    Map<String, dynamic>? route,
    ComponentRegistry? registry,
    this.onNavigate,
    this.onSnackbar,
    this.onMutate,
    this.onCommand,
    this.onDownload,
    this.onApi,
    this.onQuery,
  })  : session = session ?? {},
        route = route ?? {},
        registry = registry ?? ComponentRegistry() {
    state = Map<String, dynamic>.from(document.initialState);
    data = Map<String, dynamic>.from(initialData ?? {});
    DataSourceRunner.initializeDataSources(document.dataSources, state, data);

    dispatcher = ActionDispatcher(
      state: state,
      scope: scope,
      onNavigate: onNavigate,
      onSnackbar: onSnackbar,
      onMutate: onMutate,
      onCommand: onCommand,
      onDownload: onDownload,
      onApi: onApi,
      onQuery: onQuery,
      onStateChanged: notifyListeners,
    );
  }

  Map<String, dynamic> get scope => {
        'state': state,
        'data': data,
        'session': session,
        'route': route,
      };

  dynamic getState(String path) {
    final targetPath = path.startsWith('state.') ? path.substring(6) : path;
    return resolvePath('state.$targetPath', scope);
  }

  void setState(String path, dynamic value) {
    final targetPath = path.startsWith('state.') ? path.substring(6) : path;
    setByPath(state, targetPath, value);
    notifyListeners();
  }

  Future<void> executeAction(dynamic action, [dynamic eventPayload]) async {
    await dispatcher.execute(action, eventPayload);
  }

  void updateSession(String key, dynamic value) {
    session[key] = value;
    notifyListeners();
  }

  void updateRoute(String key, dynamic value) {
    route[key] = value;
    notifyListeners();
  }
}
