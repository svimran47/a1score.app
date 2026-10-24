import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../state/favourites.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/common.dart';

/// FotMob country codes the competitions feed uses, for section headers.
const _countries = {
  'INT': 'International', 'ENG': 'England', 'ESP': 'Spain', 'GER': 'Germany', 'ITA': 'Italy', 'FRA': 'France',
  'NED': 'Netherlands', 'POR': 'Portugal', 'BEL': 'Belgium', 'SCO': 'Scotland', 'TUR': 'Turkey', 'USA': 'USA',
  'BRA': 'Brazil', 'ARG': 'Argentina', 'MEX': 'Mexico', 'KSA': 'Saudi Arabia', 'SUI': 'Switzerland', 'AUT': 'Austria',
  'DEN': 'Denmark', 'NOR': 'Norway', 'SWE': 'Sweden', 'GRE': 'Greece', 'POL': 'Poland', 'CZE': 'Czechia',
  'JPN': 'Japan', 'KOR': 'South Korea', 'AUS': 'Australia', 'CHN': 'China', 'UKR': 'Ukraine', 'CRO': 'Croatia',
};

/// Leagues tab: valued leagues first, then every competition with fixtures this fortnight, by country.
class LeaguesScreen extends StatefulWidget {
  const LeaguesScreen({super.key});

  @override
  State<LeaguesScreen> createState() => _LeaguesScreenState();
}

class _LeaguesScreenState extends State<LeaguesScreen> {
  late Future<LeagueCatalog> _future = ApiClient.instance.leagueCatalog();
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Scaffold(
      appBar: AppBar(title: const Text('Leagues')),
      body: FutureBuilder<LeagueCatalog>(
        future: _future,
        builder: (context, snap) => AsyncBody<LeagueCatalog>(
          snapshot: snap,
          onRetry: () => setState(() {
            _future = ApiClient.instance.leagueCatalog();
          }),
          builder: (cat) {
            final q = _query.toLowerCase();
            bool hit(LeagueRef l) =>
                q.isEmpty ||
                l.name.toLowerCase().contains(q) ||
                l.country.toLowerCase().contains(q) ||
                (_countries[l.country] ?? '').toLowerCase().contains(q);
            final valued = cat.valued.where(hit).toList();
            final byCountry = <String, List<LeagueRef>>{};
            for (final l in cat.competitions.where(hit)) {
              byCountry.putIfAbsent(l.country, () => []).add(l);
            }
            final countries = byCountry.keys.toList()
              ..sort((a, b) => a == 'INT' ? -1 : (b == 'INT' ? 1 : (_countries[a] ?? a).compareTo(_countries[b] ?? b)));
            return ValueListenableBuilder(
              valueListenable: Favourites.instance.leagues,
              builder: (context, favs, _) {
                final all = {for (final l in [...cat.competitions, ...cat.valued]) l.id: l};
                final mine = [for (final id in favs) if (all[id] != null && hit(all[id]!)) all[id]!];
                return ListView(children: [
                  Padding(
                    padding: const EdgeInsets.all(Space.gutter),
                    child: TextField(
                      onChanged: (v) => setState(() {
                        _query = v;
                      }),
                      style: A1Text.body.copyWith(color: c.contentPrimary),
                      decoration: InputDecoration(
                        isDense: true,
                        prefixIcon: Icon(Icons.search, color: c.contentTertiary),
                        hintText: 'Search competitions or countries',
                        filled: true,
                        fillColor: c.bgSecondary,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(Radii.large), borderSide: BorderSide.none),
                      ),
                    ),
                  ),
                  if (mine.isNotEmpty) ...[
                    const SectionBar('My leagues'),
                    for (final l in mine) _row(context, l),
                  ],
                  if (valued.isNotEmpty) ...[
                    const SectionBar('Top leagues', trailing: 'Total value'),
                    for (final l in valued) _row(context, l, value: true),
                  ],
                  for (final code in countries) ...[
                    SectionBar(_countries[code] ?? code, trailing: '${byCountry[code]!.length}'),
                    for (final l in byCountry[code]!) _row(context, l),
                  ],
                  if (valued.isEmpty && countries.isEmpty)
                    const SizedBox(height: 240, child: EmptyState(icon: Icons.search_off_rounded, title: 'No competitions match')),
                  const SizedBox(height: Space.xxl),
                ]);
              },
            );
          },
        ),
      ),
    );
  }

  Widget _row(BuildContext context, LeagueRef l, {bool value = false}) {
    final c = context.c;
    return _NavRow(
      leading: Crest(url: l.logoUrl, label: l.name, size: Sizes.leagueLogo, radius: Radii.medium),
      title: l.name,
      subtitle: value && (l.valueEur ?? 0) > 0
          ? '${_countries[l.country] ?? l.country} · ${formatEur(l.valueEur)}'
          : (_countries[l.country] ?? l.country),
      subtitleColor: value ? c.brand : null,
      trailing: _FollowStar(id: l.id),
      onTap: () => context.push('/league/${l.id}', extra: l),
    );
  }
}

class _NavRow extends StatelessWidget {
  const _NavRow({required this.leading, required this.title, this.subtitle, this.subtitleColor, this.trailing, this.onTap});
  final Widget leading;
  final String title;
  final String? subtitle;
  final Color? subtitleColor;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Material(
      color: c.bgPrimary,
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: Sizes.leaguesRow + 8,
          padding: const EdgeInsets.only(left: Space.gutter, right: Space.s),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
          child: Row(children: [
            leading,
            const SizedBox(width: Space.l),
            Expanded(
              child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: A1Text.settingsLabel.copyWith(color: c.contentPrimary)),
                if (subtitle != null && subtitle!.isNotEmpty)
                  Text(subtitle!, style: A1Text.meta.copyWith(color: subtitleColor ?? c.contentTertiary)),
              ]),
            ),
            trailing ?? Icon(Icons.chevron_right, color: c.contentTertiary),
          ]),
        ),
      ),
    );
  }
}

class _FollowStar extends StatelessWidget {
  const _FollowStar({required this.id});
  final String id;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final favs = Favourites.instance;
    return ValueListenableBuilder(
      valueListenable: favs.leagues,
      builder: (_, set, _) {
        final on = set.contains(id);
        return IconButton(
          tooltip: on ? 'Unfollow league' : 'Follow league',
          onPressed: () => favs.toggle(favs.leagues, id),
          icon: Icon(on ? Icons.star_rounded : Icons.star_outline_rounded, color: on ? c.favouriteStar : c.statMuted),
        );
      },
    );
  }
}
