import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../state/favourites.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';

/// Leagues tab: Market value entry at the top, then every competition A-Z.
class LeaguesScreen extends StatefulWidget {
  const LeaguesScreen({super.key});

  @override
  State<LeaguesScreen> createState() => _LeaguesScreenState();
}

class _LeaguesScreenState extends State<LeaguesScreen> {
  late Future<List<LeagueRef>> _future = ApiClient.instance.leagues();
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Scaffold(
      appBar: AppBar(title: const Text('Leagues')),
      body: FutureBuilder<List<LeagueRef>>(
        future: _future,
        builder: (context, snap) => AsyncBody<List<LeagueRef>>(
          snapshot: snap,
          onRetry: () => setState(() { _future = ApiClient.instance.leagues(); }),
          builder: (all) {
            final q = _query.toLowerCase();
            final list = q.isEmpty
                ? all
                : all.where((l) => l.name.toLowerCase().contains(q) || l.country.toLowerCase().contains(q)).toList();
            return ListView(children: [
              Padding(
                padding: const EdgeInsets.all(Space.gutter),
                child: TextField(
                  onChanged: (v) => setState(() => _query = v),
                  style: A1Text.body.copyWith(color: c.contentPrimary),
                  decoration: InputDecoration(
                    isDense: true,
                    prefixIcon: Icon(Icons.search, color: c.contentTertiary),
                    hintText: 'Search competitions',
                    filled: true,
                    fillColor: c.bgSecondary,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(Radii.large), borderSide: BorderSide.none),
                  ),
                ),
              ),
              const SectionBar('Market value'),
              _NavRow(
                leading: Container(
                  width: Sizes.leagueLogo,
                  height: Sizes.leagueLogo,
                  decoration: BoxDecoration(color: c.brand, borderRadius: BorderRadius.circular(Radii.medium)),
                  child: Icon(Icons.euro_rounded, color: c.contentInverse, size: 20),
                ),
                title: 'Most valuable players',
                subtitle: 'Transfermarkt values, all leagues',
                onTap: () => context.push('/values'),
              ),
              const SectionBar('All competitions'),
              for (final l in list)
                _NavRow(
                  leading: Crest(url: l.logoUrl, label: l.name, size: Sizes.leagueLogo, radius: Radii.medium),
                  title: l.name,
                  subtitle: l.country,
                  trailing: _FollowStar(id: l.id),
                  onTap: () => context.push('/league/${l.id}', extra: l),
                ),
              const SizedBox(height: Space.xxl),
            ]);
          },
        ),
      ),
    );
  }
}

class _NavRow extends StatelessWidget {
  const _NavRow({required this.leading, required this.title, this.subtitle, this.trailing, this.onTap});
  final Widget leading;
  final String title;
  final String? subtitle;
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
                  Text(subtitle!, style: A1Text.meta.copyWith(color: c.contentTertiary)),
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
