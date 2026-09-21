import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

void main() {
  group('Example UIDL Documents', () {
    test('Login form document parses correctly', () {
      final file = File('example/login_form.json');
      if (!file.existsSync()) return;

      final content = file.readAsStringSync();
      final json = jsonDecode(content) as Map<String, dynamic>;
      final doc = UidlDocument.fromJson(json);

      expect(doc.id, 'example-login');
      expect(doc.name, 'Login Form');
      expect(doc.root.type, 'Column');
      expect(doc.initialState, contains('email'));
      expect(doc.initialState, contains('password'));
    });

    test('Dashboard document parses correctly', () {
      final file = File('example/dashboard.json');
      if (!file.existsSync()) return;

      final content = file.readAsStringSync();
      final json = jsonDecode(content) as Map<String, dynamic>;
      final doc = UidlDocument.fromJson(json);

      expect(doc.id, 'example-dashboard');
      expect(doc.name, 'Dashboard');
      expect(doc.root.type, 'ListView');
    });

    test('Login form has expected nodes', () {
      final file = File('example/login_form.json');
      if (!file.existsSync()) return;

      final content = file.readAsStringSync();
      final json = jsonDecode(content) as Map<String, dynamic>;
      final doc = UidlDocument.fromJson(json);

      final root = doc.root;
      expect(root.children.length, greaterThanOrEqualTo(3));

      final form = root.children.firstWhere(
        (n) => n.id == 'form',
        orElse: () => throw StateError('form not found'),
      );
      expect(form.type, 'Form');

      final emailField = form.children.firstWhere(
        (n) => n.id == 'email_field',
        orElse: () => throw StateError('email_field not found'),
      );
      expect(emailField.type, 'TextField');

      final passwordField = form.children.firstWhere(
        (n) => n.id == 'password_field',
        orElse: () => throw StateError('password_field not found'),
      );
      expect(passwordField.type, 'TextField');
      expect(passwordField.props['obscureText'], true);
    });

    test('Dashboard has expected stat cards', () {
      final file = File('example/dashboard.json');
      if (!file.existsSync()) return;

      final content = file.readAsStringSync();
      final json = jsonDecode(content) as Map<String, dynamic>;
      final doc = UidlDocument.fromJson(json);

      final root = doc.root;
      expect(root.children.length, greaterThanOrEqualTo(4));

      final statsRow = root.children.firstWhere(
        (n) => n.id == 'stats_row',
        orElse: () => throw StateError('stats_row not found'),
      );
      expect(statsRow.type, 'Row');

      final addBtn = root.children.firstWhere(
        (n) => n.id == 'add_button',
        orElse: () => throw StateError('add_button not found'),
      );
      expect(addBtn.type, 'Button');
      expect(addBtn.props['label'], 'Add New Item');
    });
  });
}
