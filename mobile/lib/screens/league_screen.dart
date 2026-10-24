import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../state/favourites.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';
import 'standings_table.dart';
import '../util/format.dart';
import '../widgets/match_widgets.dart';

/// League page: header, then Standings, Top scorers and Market value tabs.
class LeagueScreen extends StatefulWidget {
  const LeagueScreen({super.key, required this.id, this.league});
  final String id;
  final LeagueRef? league;

  @override
  State<LeagueScreen> createState() => _LeagueScreenState();
}

class _LeagueScreenState extends State<LeagueScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 3, vsync: this);
  StandingsMode _mode = StandingsMode.short;

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  late Future<LeagueDetail?> _future = ApiClient.instance.league(widget.id);

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final l = widget.league;
    final favs = Favourites.instance;
    return Scaffold(
      appBar: AppBar(
        title: FutureBuilder<LeagueDetail?>(
          future: _future,
          builder: (_, snap) => Text(l?.name ?? snap.data?.name ?? 'League'),
        ),
        actions: [
          ValueListenableBuilder(
            valueListenable: favs.leagues,
            builder: (_, set, _) => IconButton(
              tooltip: 'Follow league',
              onPressed: () => favs.toggle(favs.leagues, widget.id),
              icon: Icon(set.contains(widget.id) ? Icons.star_rounded : Icons.star_outline_rounded),
            ),
          ),
        ],
        bottom: PrimaryTabBar(controller: _tabs, labels: const ['Standings', 'Top scorers', 'Market value']),
      ),
      body: FutureBuilder<LeagueDetail?>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.done && !snap.hasError && snap.data == null) {
            return const EmptyState(icon: Icons.table_rows_outlined, title: 'No table for this competition');
          }
          return AsyncBody<LeagueDetail?>(
            snapshot: snap,
            onRetry: () => setState(() { _future = ApiClient.instance.league(widget.id); }),
            builder: (detail) => TabBarView(
              controller: _tabs,
              children: [
                ListView(
                  children: [
                    _header(c, l ?? LeagueRef(id: widget.id, name: detail!.name ?? 'League'), detail!),
                    ChipTabs(
                      labels: const ['Short', 'Full', 'Form'],
                      selected: _mode.index,
                      onSelected: (i) => setState(() {
                        _mode = StandingsMode.values[i];
                      }),
                    ),
                    StandingsTable(rows: detail.standings, mode: _mode),
                    if (detail.legend.isNotEmpty) StandingsLegend(items: detail.legend),
                    const SizedBox(height: Space.xxl),
                  ],
                ),
                _Leaders(scorers: detail.topScorers, assists: detail.topAssists),
                _ClubValues(clubs: detail.clubs),
              ],
            ),
          );
        },
      ),
    );
  }
}

Widget _header(A1Colors c, LeagueRef l, LeagueDetail d) => Container(
  color: c.bgPrimary,
  padding: const EdgeInsets.all(Space.gutter),
  child: Row(
    children: [
      Crest(url: l.logoUrl, label: l.name, size: Sizes.crestTile, radius: Radii.large),
      const SizedBox(width: Space.l),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l.name, style: A1Text.sectionTitle.copyWith(color: c.contentPrimary)),
            Text(
              [if (l.country.isNotEmpty) l.country.toUpperCase(), if (d.season != null) d.season!].join(' · '),
              style: A1Text.countryLabel.copyWith(color: c.contentSecondary),
            ),
          ],
        ),
      ),
      if (d.totalValueEur != null && d.totalValueEur! > 0)
        Text(formatEur(d.totalValueEur), style: A1Text.marketValue.copyWith(color: c.contentPrimary)),
    ],
  ),
);

/// Clubs ranked by squad value, the league page's valuation table.
class _ClubValues extends StatelessWidget {
  const _ClubValues({required this.clubs});
  final List<ClubValueRow> clubs;

  @override
  Widget build(BuildContext context) {
    if (clubs.isEmpty) return const EmptyState(icon: Icons.euro_rounded, title: 'No squad values for this league');
    return ListView(
      children: [
        const SectionBar('Club', trailing: 'Squad value'),
        for (final (i, club) in clubs.indexed)
          ValueRow(
            rank: i + 1,
            onTap: club.id.isEmpty ? null : () => context.push('/club/${club.id}'),
            player: PlayerValueRow(
              id: club.id,
              name: club.name,
              valueEur: club.squadValueEur,
              photoUrl: club.logoUrl,
              position: club.squadSize == null ? null : '${club.squadSize} players',
            ),
          ),
      ],
    );
  }
}

/// Top scorers and assists, as on the website's league page.
class _Leaders extends StatelessWidget {
  const _Leaders({required this.scorers, required this.assists});
  final List<LeaderRow> scorers;
  final List<LeaderRow> assists;

  @override
  Widget build(BuildContext context) {
    if (scorers.isEmpty && assists.isEmpty) {
      return const EmptyState(icon: Icons.sports_soccer, title: 'No scorer stats for this competition yet');
    }
    final c = context.c;
    Widget row(int i, LeaderRow p) => Container(
          padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.m + 2),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
          child: Row(children: [
            SizedBox(width: 24, child: Text('${i + 1}', style: A1Text.statValue.copyWith(fontWeight: FontWeight.w700, color: c.contentSecondary))),
            Crest(url: p.imageUrl, label: p.name, size: 36),
            const SizedBox(width: Space.l),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: A1Text.valueName.copyWith(fontSize: 14, color: c.contentPrimary)),
                if (p.teamName != null) Text(p.teamName!, style: A1Text.meta.copyWith(color: c.contentTertiary)),
              ]),
            ),
            Text('${p.value}', style: A1Text.calloutValue.copyWith(fontSize: 20, color: c.brand)),
          ]),
        );
    return ListView(children: [
      if (scorers.isNotEmpty) ...[const SectionBar('Top scorers', trailing: 'Goals'), for (final (i, p) in scorers.indexed) row(i, p)],
      if (assists.isNotEmpty) ...[const SectionBar('Top assists', trailing: 'Assists'), for (final (i, p) in assists.indexed) row(i, p)],
    ]);
  }
}
