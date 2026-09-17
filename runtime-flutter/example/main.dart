import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

void main() {
  runApp(const ExampleApp());
}

class ExampleApp extends StatelessWidget {
  const ExampleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'UIDL Flutter Example',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2196F3),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      home: const ExampleHome(),
    );
  }
}

class ExampleHome extends StatefulWidget {
  const ExampleHome({super.key});

  @override
  State<ExampleHome> createState() => _ExampleHomeState();
}

class _ExampleHomeState extends State<ExampleHome> {
  int _selectedPage = 0;
  final List<String> _pages = [
    'Login Form',
    'Dashboard',
  ];

  UidlDocument? _loadDocument(String name) {
    try {
      final file = File('example/$name.json');
      if (!file.existsSync()) return null;
      final content = file.readAsStringSync();
      final json = jsonDecode(content) as Map<String, dynamic>;
      return UidlDocument.fromJson(json);
    } catch (e) {
      debugPrint('Error loading document: $e');
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('UIDL Flutter Example'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: List.generate(_pages.length, (index) {
                return ChoiceChip(
                  label: Text(_pages[index]),
                  selected: _selectedPage == index,
                  onSelected: (selected) {
                    setState(() {
                      _selectedPage = index;
                    });
                  },
                );
              }),
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _buildSelectedPage(),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectedPage() {
    switch (_selectedPage) {
      case 0:
        return _buildPage('login_form');
      case 1:
        return _buildPage('dashboard');
      default:
        return const Center(child: Text('Select a page'));
    }
  }

  Widget _buildPage(String fileName) {
    final doc = _loadDocument(fileName);
    if (doc == null) {
      return Center(child: Text('$fileName.json not found'));
    }
    return SingleChildScrollView(
      child: UidlRenderer(
        document: doc,
        onNavigate: (route, params) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Navigate to: $route')),
          );
        },
        onApi: (url, method, body, headers) async {
          debugPrint('API Call: $method $url');
          debugPrint('Body: $body');
          await Future.delayed(const Duration(seconds: 1));
          return {'success': true};
        },
      ),
    );
  }
}
