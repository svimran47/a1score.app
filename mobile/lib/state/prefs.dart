import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../util/format.dart';
import 'favourites.dart';

/// App preferences saved on the device: theme and display currency.
class Prefs {
  Prefs._();
  static final instance = Prefs._();

  final themeMode = ValueNotifier(ThemeMode.system);

  /// EUR, GBP or USD; values are stored in euros and converted with ECB rates (/api/fx).
  final currency = ValueNotifier('EUR');

  SharedPreferences? _prefs;

  Future<void> load() async {
    final p = _prefs = await SharedPreferences.getInstance();
    themeMode.value = ThemeMode.values.asNameMap()[p.getString('theme')] ?? ThemeMode.system;
    await Favourites.instance.load(p);
    // Not awaited: a saved non-euro currency needs /api/fx, and startup must not
    // wait on the network. Values show in euros until the rate arrives.
    setCurrency(p.getString('currency') ?? 'EUR', save: false);
  }

  void setTheme(ThemeMode m) {
    themeMode.value = m;
    _prefs?.setString('theme', m.name);
  }

  Future<void> setCurrency(String code, {bool save = true}) async {
    if (save) _prefs?.setString('currency', code);
    if (code == 'EUR') {
      Money.use('EUR', 1);
      currency.value = code;
      return;
    }
    try {
      final rate = await ApiClient.instance.fxRate(code);
      Money.use(code, rate);
      currency.value = code;
    } catch (_) {
      // Rates unavailable: keep showing euros, as the website does.
      Money.use('EUR', 1);
      currency.value = 'EUR';
    }
  }
}
