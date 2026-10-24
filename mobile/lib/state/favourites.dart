import 'package:flutter/foundation.dart';

/// In-memory follows. TODO: persist locally and sync to Supabase `user_follows`
/// (same table the web app uses) once sign-in is wired.
class Favourites {
  Favourites._();
  static final instance = Favourites._();

  final matches = ValueNotifier<Set<String>>({});
  final leagues = ValueNotifier<Set<String>>({});
  final teams = ValueNotifier<Set<String>>({});
  final players = ValueNotifier<Set<String>>({});

  void toggle(ValueNotifier<Set<String>> list, String id) {
    final next = {...list.value};
    next.contains(id) ? next.remove(id) : next.add(id);
    list.value = next;
  }
}
