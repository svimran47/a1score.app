import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../state/favourites.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/common.dart';
import '../widgets/match_widgets.dart';
import '../widgets/lineup_pitch.dart';
import '../widgets/momentum.dart';
import 'standings_table.dart';

const _tabs = ['Summary', 'Stats', 'Lineups', 'Market value', 'H2H', 'Standings'];

class MatchScreen extends StatefulWidget {
  const MatchScreen({super.key, required this.id});
  final String id;

  @override
  State<MatchScreen> createState() => _MatchScreenState();
}

class _MatchScreenState extends State<MatchScreen> {
  late Future<MatchDetail> _future;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  void _load() {
    final f = ApiClient.instance.match(widget.id);
    setState(() { _future = f; });
    _poll?.cancel();
    f.then((d) {
      if (mounted && d.summary.isLive) _poll = Timer(const Duration(seconds: 10), _load);
    }, onError: (_) {});
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return FutureBuilder<MatchDetail>(
      future: _future,
      builder: (context, snap) {
        if (!snap.hasData) {
          return Scaffold(appBar: AppBar(title: const Text('Match')), body: AsyncBody(snapshot: snap, onRetry: _load, builder: (_) => const SizedBox()));
        }
        final d = snap.data!;
        return DefaultTabController(
          length: _tabs.length,
          child: Scaffold(
            body: NestedScrollView(
              headerSliverBuilder: (context, _) => [
                SliverAppBar(
                  pinned: true,
                  title: const Text('Football'),
                  actions: [
                    ValueListenableBuilder(
                      valueListenable: Favourites.instance.matches,
                      builder: (_, favs, _) {
                        final on = favs.contains(widget.id);
                        return IconButton(
                          tooltip: on ? 'Unfollow match' : 'Follow match',
                          onPressed: () => Favourites.instance.toggle(Favourites.instance.matches, widget.id,
                              label: '${d.summary.home.name} – ${d.summary.away.name}'),
                          icon: Icon(on ? Icons.star_rounded : Icons.star_outline_rounded),
                        );
                      },
                    ),
                  ],
                ),
                SliverToBoxAdapter(child: _Breadcrumb(detail: d)),
                SliverToBoxAdapter(child: _ScoreHeader(m: d.summary)),
                SliverPersistentHeader(pinned: true, delegate: _TabsDelegate(c.bgPrimary)),
              ],
              body: TabBarView(children: [
                _SummaryTab(d: d),
                _StatsTab(d: d),
                _LineupsTab(d: d),
                _ValueTab(d: d),
                _H2hTab(d: d),
                d.standings.isEmpty
                    ? const EmptyState(icon: Icons.table_rows_outlined, title: 'No table for this competition')
                    : ListView(children: [
                        StandingsTable(rows: d.standings, highlightIds: {d.summary.home.id, d.summary.away.id}),
                      ]),
              ]),
            ),
          ),
        );
      },
    );
  }
}

class _TabsDelegate extends SliverPersistentHeaderDelegate {
  _TabsDelegate(this.bg);
  final Color bg;
  @override
  double get minExtent => Sizes.tabBar + 1;
  @override
  double get maxExtent => Sizes.tabBar + 1;
  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) =>
      ColoredBox(color: bg, child: const PrimaryTabBar(labels: _tabs));
  @override
  bool shouldRebuild(covariant _TabsDelegate old) => old.bg != bg;
}

class _Breadcrumb extends StatelessWidget {
  const _Breadcrumb({required this.detail});
  final MatchDetail detail;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final parts = [
      if (detail.country.isNotEmpty) '${detail.country}: ',
    ];
    return Container(
      height: Sizes.breadcrumb,
      padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
      decoration: BoxDecoration(color: c.bgSecondary, border: Border(bottom: BorderSide(color: c.borderStrong.withValues(alpha: 0.5)))),
      child: Row(children: [
        Expanded(
          child: Text.rich(
            TextSpan(style: A1Text.breadcrumb.copyWith(color: c.contentSecondary), children: [
              TextSpan(text: parts.join().toUpperCase()),
              TextSpan(text: detail.leagueName.toUpperCase(), style: TextStyle(fontWeight: FontWeight.w700, color: c.contentPrimary)),
              if (detail.summary.round != null) TextSpan(text: ' · ROUND ${detail.summary.round}'),
            ]),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ]),
    );
  }
}

class _ScoreHeader extends StatelessWidget {
  const _ScoreHeader({required this.m});
  final MatchSummary m;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final scoreColor = m.isLive ? c.live : c.contentPrimary;
    String statusText;
    if (m.status == MatchStatus.halftime) {
      statusText = 'Half-time';
    } else if (m.isLive) {
      statusText = m.minute ?? 'Live';
    } else if (m.status == MatchStatus.finished) {
      statusText = 'Finished';
    } else {
      statusText = m.status == MatchStatus.scheduled ? '' : m.status.name;
    }

    Widget team(TeamRef t) => Column(children: [
          Container(
            width: Sizes.crestTile,
            height: Sizes.crestTile,
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(color: c.bgCard, borderRadius: BorderRadius.circular(Radii.large)),
            child: Crest(url: t.crestUrl, label: t.name, size: 40, radius: Radii.medium),
          ),
          const SizedBox(height: Space.m),
          Text(t.name, maxLines: 2, textAlign: TextAlign.center, overflow: TextOverflow.ellipsis, style: A1Text.detailTeam.copyWith(color: c.contentPrimary)),
        ]);

    return Container(
      height: Sizes.detailHeader,
      color: c.bgSecondary,
      padding: const EdgeInsets.fromLTRB(Space.xl, Space.xl, Space.xl, 0),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: team(m.home)),
        Expanded(
          child: Column(children: [
            if (m.kickoff != null) Text(fullDateTime(m.kickoff!), style: A1Text.meta.copyWith(color: c.contentSecondary)),
            const SizedBox(height: 2),
            Text(
              m.hasStarted ? '${m.home.score ?? 0}-${m.away.score ?? 0}' : (m.kickoff == null ? 'vs' : hourMinute(m.kickoff!)),
              style: A1Text.detailScore.copyWith(color: scoreColor),
            ),
            if (statusText.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: Space.s),
                child: Text(statusText, style: A1Text.detailStatus.copyWith(color: m.isLive ? c.live : c.contentSecondary)),
              ),
          ]),
        ),
        Expanded(child: team(m.away)),
      ]),
    );
  }
}

class _SummaryTab extends StatelessWidget {
  const _SummaryTab({required this.d});
  final MatchDetail d;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final top = d.stats.isNotEmpty ? d.stats.first.lines.take(4).toList() : <StatLine>[];
    return ListView(padding: EdgeInsets.zero, children: [
      if (d.summary.hasStarted && d.shots.isNotEmpty) ...[
        const SectionTitle('Match momentum'),
        MomentumChart(detail: d),
      ],
      if (d.homeXiValueEur != null && d.awayXiValueEur != null) ...[
        const SectionTitle('Squad value'),
        StatCallout(
          label: 'XI value',
          home: formatEur(d.homeXiValueEur),
          away: formatEur(d.awayXiValueEur),
          homeNum: d.homeXiValueEur!.toDouble(),
          awayNum: d.awayXiValueEur!.toDouble(),
        ),
      ],
      if (top.isNotEmpty) ...[
        const SectionTitle('Top stats'),
        for (final s in top) StatSplitRow(label: s.label, home: s.home, away: s.away, homeNum: s.homeNum, awayNum: s.awayNum),
      ],
      if (d.info.isNotEmpty) ...[
        const SizedBox(height: Space.l),
        const SectionBar('Match information'),
        for (final e in d.info.entries)
          Container(
            height: Sizes.settingsRow,
            padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
            decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
            child: Row(children: [
              Text(e.key, style: A1Text.body.copyWith(color: c.contentSecondary)),
              const SizedBox(width: Space.l),
              Expanded(child: Text(e.value, textAlign: TextAlign.right, maxLines: 1, overflow: TextOverflow.ellipsis, style: A1Text.body.copyWith(color: c.contentPrimary))),
            ]),
          ),
      ],
      if (top.isEmpty && d.info.isEmpty && d.homeXiValueEur == null)
        const Padding(padding: EdgeInsets.only(top: 80), child: EmptyState(icon: Icons.schedule, title: 'Details appear closer to kick-off')),
      const SizedBox(height: Space.xxl),
    ]);
  }
}

class _StatsTab extends StatefulWidget {
  const _StatsTab({required this.d});
  final MatchDetail d;
  @override
  State<_StatsTab> createState() => _StatsTabState();
}

class _StatsTabState extends State<_StatsTab> {
  int _period = 0;

  @override
  Widget build(BuildContext context) {
    final groups = widget.d.stats;
    if (groups.isEmpty) return const EmptyState(icon: Icons.bar_chart, title: 'No stats yet');
    return ListView(padding: EdgeInsets.zero, children: [
      // Half-time periods need /matches/{id}/stats?period= (api-contract.md §1).
      ChipTabs(labels: const ['Match'], selected: _period, onSelected: (i) => setState(() => _period = i)),
      for (final g in groups) ...[
        SectionTitle(g.title),
        for (final s in g.lines) StatSplitRow(label: s.label, home: s.home, away: s.away, homeNum: s.homeNum, awayNum: s.awayNum),
      ],
      const SizedBox(height: Space.xxl),
    ]);
  }
}

/// Same source as the website's Values tab: starters' Transfermarkt values from the lineup.
class _ValueTab extends StatelessWidget {
  const _ValueTab({required this.d});
  final MatchDetail d;

  @override
  Widget build(BuildContext context) {
    final hasTotals = d.homeXiValueEur != null && d.awayXiValueEur != null;
    if (!hasTotals && d.homeXi.isEmpty && d.awayXi.isEmpty) {
      return const EmptyState(icon: Icons.euro, title: 'Values appear when lineups are confirmed');
    }
    List<PlayerValueRow> byValue(List<PlayerValueRow> l) => [...l]..sort((a, b) => b.valueEur.compareTo(a.valueEur));
    Widget section(String title, List<PlayerValueRow> players) => Column(children: [
          SectionBar(title, trailing: 'Value'),
          for (final p in byValue(players)) ValueRow(player: p, onTap: () => context.push('/player/${p.id}')),
        ]);
    return ListView(padding: EdgeInsets.zero, children: [
      if (hasTotals)
        StatCallout(
          label: 'XI value',
          home: formatEur(d.homeXiValueEur),
          away: formatEur(d.awayXiValueEur),
          homeNum: d.homeXiValueEur!.toDouble(),
          awayNum: d.awayXiValueEur!.toDouble(),
        ),
      if (d.homeXi.isNotEmpty) section('${d.summary.home.name} XI', d.homeXi),
      if (d.awayXi.isNotEmpty) section('${d.summary.away.name} XI', d.awayXi),
      if (d.homeBench.isNotEmpty) section('${d.summary.home.name} bench', d.homeBench),
      if (d.awayBench.isNotEmpty) section('${d.summary.away.name} bench', d.awayBench),
      const SizedBox(height: Space.xxl),
    ]);
  }
}

class _H2hTab extends StatelessWidget {
  const _H2hTab({required this.d});
  final MatchDetail d;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    if (d.h2h.isEmpty) return const EmptyState(icon: Icons.history, title: 'No previous meetings');
    return ListView(padding: EdgeInsets.zero, children: [
      const SectionTitle('Previous meetings'),
      for (final m in d.h2h)
        Container(
          height: Sizes.h2hRow,
          padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
          child: Row(children: [
            SizedBox(width: 48, child: Text(m.date == null ? '' : dayMonth(m.date!), style: A1Text.meta.copyWith(color: c.contentSecondary))),
            Expanded(
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                for (final t in [m.home, m.away])
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Row(children: [
                      Crest(url: t.crestUrl, label: t.name, size: 18),
                      const SizedBox(width: Space.m),
                      Expanded(child: Text(t.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: A1Text.teamName.copyWith(color: c.contentPrimary))),
                      Text('${t.score ?? '-'}', style: A1Text.rowScore.copyWith(color: c.contentPrimary)),
                    ]),
                  ),
              ]),
            ),
          ]),
        ),
      const SizedBox(height: Space.xxl),
    ]);
  }
}

/// Both XIs on the pitch (switch badges between rating, value and age), then
/// substitutes, coaches and missing players for each side.
class _LineupsTab extends StatefulWidget {
  const _LineupsTab({required this.d});
  final MatchDetail d;

  @override
  State<_LineupsTab> createState() => _LineupsTabState();
}

class _LineupsTabState extends State<_LineupsTab> {
  PitchView _view = PitchView.overview;

  @override
  Widget build(BuildContext context) {
    final d = widget.d;
    final home = d.homeLineup, away = d.awayLineup;
    if (home == null || away == null) {
      return const EmptyState(icon: Icons.groups_outlined, title: 'Lineups appear about an hour before kick-off');
    }
    final c = context.c;
    Widget sideRows(LineupPlayer Function(int) at, int count) => Column(children: [
          for (var i = 0; i < count; i++)
            InkWell(
              onTap: () => showPlayerSheet(context, at(i)),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.m),
                decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
                child: Row(children: [
                  SizedBox(width: 28, child: Text(at(i).shirt ?? '', style: A1Text.statValue.copyWith(color: c.contentSecondary))),
                  Expanded(child: Text(at(i).name, style: A1Text.statLabel.copyWith(color: c.contentPrimary))),
                  if ((at(i).valueEur ?? 0) > 0) Text(formatEur(at(i).valueEur), style: A1Text.meta.copyWith(color: c.contentSecondary)),
                ]),
              ),
            ),
        ]);
    return ListView(padding: EdgeInsets.zero, children: [
      ChipTabs(
        labels: const ['Overview', 'Market value', 'Age'],
        selected: _view.index,
        onSelected: (i) => setState(() {
          _view = PitchView.values[i];
        }),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(Radii.large),
          child: LineupPitch(home: home, away: away, view: _view),
        ),
      ),
      const SizedBox(height: Space.l),
      for (final (team, l) in [(d.summary.home, home), (d.summary.away, away)]) ...[
        SectionBar(team.name, trailing: l.formation),
        sideRows((i) => l.starters[i], l.starters.length),
        if (l.subs.isNotEmpty) ...[
          const SectionBar('Substitutes'),
          sideRows((i) => l.subs[i], l.subs.length),
        ],
        if (l.coach != null) ...[
          const SectionBar('Coach'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.m),
            child: Text(l.coach!, style: A1Text.statLabel.copyWith(color: c.contentPrimary)),
          ),
        ],
        if (l.missing.isNotEmpty) ...[
          const SectionBar('Missing players'),
          for (final (name, reason) in l.missing)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.m),
              decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
              child: Row(children: [
                Icon(Icons.healing_rounded, size: 16, color: c.live),
                const SizedBox(width: Space.m),
                Expanded(child: Text(name, style: A1Text.statLabel.copyWith(color: c.contentPrimary))),
                Text(reason, style: A1Text.meta.copyWith(color: c.contentTertiary)),
              ]),
            ),
        ],
      ],
      const SizedBox(height: Space.xxl),
    ]);
  }
}
