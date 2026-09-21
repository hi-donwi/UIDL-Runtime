import '../actions/action_dispatcher.dart';
import '../data/data_source.dart';
import '../model/document.dart';
import '../registry/component_registry.dart';

class UidlRenderContext {
  final Map<String, dynamic> state;
  final Map<String, dynamic> data;
  final Map<String, dynamic> session;
  final Map<String, dynamic> route;
  final ComponentRegistry registry;
  late final ActionDispatcher dispatcher;

  UidlRenderContext({
    required this.state,
    required this.data,
    required this.session,
    required this.route,
    ComponentRegistry? registry,
    NavigationHandler? onNavigate,
    SnackbarHandler? onSnackbar,
    MutationHandler? onMutate,
    CommandHandler? onCommand,
    DownloadHandler? onDownload,
    ApiHandler? onApi,
    QueryHandler? onQuery,
    void Function()? onStateChanged,
  }) : registry = registry ?? ComponentRegistry() {
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
      onStateChanged: onStateChanged,
    );
  }

  factory UidlRenderContext.fromDocument(
    UidlDocument document, {
    Map<String, dynamic>? initialData,
    Map<String, dynamic>? session,
    Map<String, dynamic>? route,
    ComponentRegistry? registry,
    NavigationHandler? onNavigate,
    SnackbarHandler? onSnackbar,
    MutationHandler? onMutate,
    CommandHandler? onCommand,
    DownloadHandler? onDownload,
    ApiHandler? onApi,
    QueryHandler? onQuery,
    void Function()? onStateChanged,
  }) {
    final state = Map<String, dynamic>.from(document.initialState);
    final data = Map<String, dynamic>.from(initialData ?? {});

    DataSourceRunner.initializeDataSources(document.dataSources, state, data);

    return UidlRenderContext(
      state: state,
      data: data,
      session: session ?? {},
      route: route ?? {},
      registry: registry,
      onNavigate: onNavigate,
      onSnackbar: onSnackbar,
      onMutate: onMutate,
      onCommand: onCommand,
      onDownload: onDownload,
      onApi: onApi,
      onQuery: onQuery,
      onStateChanged: onStateChanged,
    );
  }

  Map<String, dynamic> get scope => {
        'state': state,
        'data': data,
        'session': session,
        'route': route,
      };
}
