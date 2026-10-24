import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';

/// Light/dark/system choice shared with MaterialApp.
final themeMode = ValueNotifier(ThemeMode.system);

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ValueListenableBuilder(
        valueListenable: themeMode,
        builder: (_, mode, _) => ListView(children: [
          const SectionBar('Appearance'),
          RadioGroup<ThemeMode>(
            groupValue: mode,
            onChanged: (v) => themeMode.value = v!,
            child: Column(children: [
              for (final m in ThemeMode.values)
                RadioListTile<ThemeMode>(
                  value: m,
                  activeColor: c.brand,
                  title: Text(switch (m) { ThemeMode.system => 'System default', ThemeMode.light => 'Light', ThemeMode.dark => 'Dark' },
                      style: A1Text.settingsLabel.copyWith(color: c.contentPrimary)),
                ),
            ]),
          ),
          const SectionBar('About'),
          ListTile(
            title: Text('Data server', style: A1Text.settingsLabel.copyWith(color: c.contentPrimary)),
            subtitle: Text(ApiClient.instance.baseUrl, style: A1Text.meta.copyWith(color: c.contentTertiary)),
          ),
          ListTile(
            title: Text('Market values', style: A1Text.settingsLabel.copyWith(color: c.contentPrimary)),
            subtitle: Text('Transfermarkt', style: A1Text.meta.copyWith(color: c.contentTertiary)),
          ),
          const SizedBox(height: Space.xxl),
        ]),
      ),
    );
  }
}
