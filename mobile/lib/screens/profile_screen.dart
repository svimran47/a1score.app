import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../state/favourites.dart';
import '../state/prefs.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';

const _site = 'https://a1score.app';
const _currencies = ['EUR', 'GBP', 'USD'];

/// Profile: what you follow, appearance, display currency, and about/credits.
/// Everything here is saved on the device; account sync arrives with sign-in.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final prefs = Prefs.instance;
    final f = Favourites.instance;
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListenableBuilder(
        listenable: Listenable.merge([prefs.themeMode, prefs.currency, f.matches, f.leagues, f.teams, f.players]),
        builder: (context, _) => ListView(
          children: [
            const _Header(),
            const SectionBar('My favourites'),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: Space.l, vertical: Space.m),
              child: Row(
                children: [
                  for (final (label, n) in [
                    ('Matches', f.matches.value.length),
                    ('Leagues', f.leagues.value.length),
                    ('Clubs', f.teams.value.length),
                    ('Players', f.players.value.length),
                  ])
                    _Count(label: label, count: n, onTap: () => context.push('/favourites')),
                ],
              ),
            ),
            const SectionBar('Appearance'),
            RadioGroup<ThemeMode>(
              groupValue: prefs.themeMode.value,
              onChanged: (v) => prefs.setTheme(v!),
              child: Column(
                children: [
                  for (final m in ThemeMode.values)
                    RadioListTile<ThemeMode>(
                      value: m,
                      activeColor: c.brand,
                      title: Text(switch (m) {
                        ThemeMode.system => 'System default',
                        ThemeMode.light => 'Light',
                        ThemeMode.dark => 'Dark',
                      }, style: A1Text.settingsLabel.copyWith(color: c.contentPrimary)),
                    ),
                ],
              ),
            ),
            const SectionBar('Display currency'),
            ChipTabs(
              labels: _currencies,
              selected: _currencies.indexOf(prefs.currency.value).clamp(0, _currencies.length - 1),
              onSelected: (i) => prefs.setCurrency(_currencies[i]),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Space.gutter, 0, Space.gutter, Space.l),
              child: Text(
                'Market values are recorded in euros and converted with daily ECB reference rates.',
                style: A1Text.meta.copyWith(color: c.contentTertiary),
              ),
            ),
            const SectionBar('About'),
            const _Version(),
            _Link(label: 'Website', url: _site),
            _Link(label: 'Privacy policy', url: '$_site/privacy'),
            _Link(label: 'Terms of use', url: '$_site/terms'),
            const SectionBar('Data'),
            const _Fact('Market values and transfers', 'Transfermarkt'),
            const _Fact('Fixtures, lineups and stats', 'FotMob'),
            const _Fact('Match momentum', 'A1score model'),
            Padding(
              padding: const EdgeInsets.all(Space.gutter),
              child: Text(
                'Match momentum is A1score’s own model from shots and xG, inspired by Flashscore’s Match Momentum (Opta).',
                style: A1Text.meta.copyWith(color: c.contentTertiary),
              ),
            ),
            const SizedBox(height: Space.xxl),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      color: c.bgPrimary,
      padding: const EdgeInsets.all(Space.gutter),
      child: Row(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: c.bgHighlight,
            child: Icon(Icons.person_outline, size: 30, color: c.brand),
          ),
          const SizedBox(width: Space.xl),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Guest', style: A1Text.sectionTitle.copyWith(color: c.contentPrimary)),
                const SizedBox(height: 2),
                Text(
                  'Favourites and settings are saved on this phone.',
                  style: A1Text.meta.copyWith(color: c.contentSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Count extends StatelessWidget {
  const _Count({required this.label, required this.count, required this.onTap});
  final String label;
  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: Space.s),
        child: Material(
          color: c.bgSecondary,
          borderRadius: BorderRadius.circular(Radii.large),
          child: InkWell(
            borderRadius: BorderRadius.circular(Radii.large),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: Space.l),
              child: Column(
                children: [
                  Text('$count', style: A1Text.calloutValue.copyWith(fontSize: 22, color: c.contentPrimary)),
                  const SizedBox(height: 2),
                  Text(label.toUpperCase(), style: A1Text.sectionBar.copyWith(color: c.contentSecondary, fontSize: 10)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, this.value, this.onTap, this.trailing});
  final String label;
  final String? value;
  final VoidCallback? onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return InkWell(
      onTap: onTap,
      child: Container(
        height: Sizes.settingsRow,
        padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: c.border)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(label, style: A1Text.settingsLabel.copyWith(color: c.contentPrimary)),
            ),
            if (value != null) Text(value!, style: A1Text.statValue.copyWith(color: c.contentSecondary)),
            ?trailing,
          ],
        ),
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => _Row(label: label, value: value);
}

class _Link extends StatelessWidget {
  const _Link({required this.label, required this.url});
  final String label;
  final String url;

  @override
  Widget build(BuildContext context) => _Row(
    label: label,
    trailing: Icon(Icons.open_in_new, size: 18, color: context.c.contentTertiary),
    onTap: () => launchUrl(Uri.parse(url), mode: LaunchMode.inAppBrowserView),
  );
}

class _Version extends StatelessWidget {
  const _Version();

  @override
  Widget build(BuildContext context) => FutureBuilder<PackageInfo>(
    future: PackageInfo.fromPlatform(),
    builder: (_, snap) =>
        _Row(label: 'App version', value: snap.hasData ? '${snap.data!.version} (${snap.data!.buildNumber})' : '…'),
  );
}
