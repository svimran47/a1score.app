import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Follows, saved on the device. Each follow keeps a label (team names, player
/// name...) so the Favourites screen can list it without another request.
/// TODO: sync to Supabase `user_follows` (same table the web app uses) once sign-in is wired.
class Favourites {
  Favourites._();
  static final instance = Favourites._();

  final matches = ValueNotifier<Set<String>>({});
  final leagues = ValueNotifier<Set<String>>({});
  final teams = ValueNotifier<Set<String>>({});
  final players = ValueNotifier<Set<String>>({});
  final labels = <String, String>{};

  SharedPreferences? _prefs;

  Map<String, ValueNotifier<Set<String>>> get _lists =>
      {'matches': matches, 'leagues': leagues, 'teams': teams, 'players': players};

  Future<void> load(SharedPreferences prefs) async {
    _prefs = prefs;
    for (final e in _lists.entries) {
      e.value.value = (prefs.getStringList('fav.${e.key}') ?? const []).toSet();
    }
    try {
      labels.addAll(Map<String, String>.from(jsonDecode(prefs.getString('fav.labels') ?? '{}') as Map));
    } catch (_) {}
  }

  String? label(String id) => labels[id];

  void toggle(ValueNotifier<Set<String>> list, String id, {String? label}) {
    final next = {...list.value};
    if (next.contains(id)) {
      next.remove(id);
    } else {
      next.add(id);
      if (label != null && label.isNotEmpty) labels[id] = label;
    }
    list.value = next;
    _save();
  }

  void _save() {
    final p = _prefs;
    if (p == null) return;
    for (final e in _lists.entries) {
      p.setStringList('fav.${e.key}', e.value.value.toList());
    }
    p.setString('fav.labels', jsonEncode(labels));
  }
}
