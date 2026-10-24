import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/common.dart';
import '../widgets/date_strip.dart';
import '../widgets/home_widgets.dart';
import '../widgets/match_widgets.dart';

/// Same order as TOP_LEAGUE_IDS on the website: these lead the day's list.
const _topLeagues = ['47', '87', '54', '55', '53', '61', '57', '42', '73', '10216'];

int _rank(LeagueRef l) {
  final i = _topLeagues.indexOf(l.id);
  return i < 0 ? _topLeagues.length : i;
}

/// Data on the home page that doesn't depend on the selected day.
class _HomeExtras {
  _HomeExtras()
    : valuable = ApiClient.instance.mostValuable(limit: 10),
      movers = ApiClient.instance.movers(limit: 5),
      transfers = ApiClient.instance.transfers(limit: 5),
      clubs = ApiClient.instance.clubs(limit: 5);
  final Future<List<PlayerValueRow>> valuable;
  final Future<ValueMovers> movers;
  final Future<List<TransferItem>> transfers;
  final Future<List<ClubValueRow>> clubs;
}

/// Home: the website's home sections under a date strip; swipe left/right to change day.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  DateTime _day = dateOnly(DateTime.now());
  final _pages = PageController(initialPage: dayRange);
  _HomeExtras _extras = _HomeExtras();

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  void _goTo(DateTime d) {
    final target = indexForDay(d).clamp(0, dayRange * 2);
    final current = _pages.page?.round() ?? indexForDay(_day);
    if ((target - current).abs() <= 2) {
      _pages.animateToPage(target, duration: const Duration(milliseconds: 300), curve: Curves.easeOutCubic);
    } else {
      _pages.jumpToPage(target);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Scaffold(
      appBar: AppBar(
        titleSpacing: Space.gutter,
        title: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: c.brand, borderRadius: BorderRadius.circular(Radii.large)),
              child: Text('A1', style: A1Text.badge.copyWith(fontSize: 12, color: Colors.white)),
            ),
            const SizedBox(width: 10),
            const Text('A1score'),
          ],
        ),
        actions: [
          IconButton(tooltip: 'Search', onPressed: () => context.push('/values'), icon: const Icon(Icons.search)),
          IconButton(
            tooltip: 'Settings',
            onPressed: () => context.push('/settings'),
            icon: const Icon(Icons.person_outline),
          ),
          const SizedBox(width: Space.s),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(DateStrip.height),
          child: DateStrip(selected: _day, onSelected: _goTo),
        ),
      ),
      body: PageView.builder(
        controller: _pages,
        itemCount: dayRange * 2 + 1,
        onPageChanged: (i) => setState(() {
          _day = dayForIndex(i);
        }),
        itemBuilder: (_, i) => _HomeDay(
          day: dayForIndex(i),
          extras: _extras,
          onRefreshExtras: () => setState(() {
            _extras = _HomeExtras();
          }),
        ),
      ),
    );
  }
}

const _filterLabels = ['All', 'Live', 'Finished', 'Scheduled'];

class _HomeDay extends StatefulWidget {
  const _HomeDay({required this.day, required this.extras, required this.onRefreshExtras});
  final DateTime day;
  final _HomeExtras extras;
  final VoidCallback onRefreshExtras;

  @override
  State<_HomeDay> createState() => _HomeDayState();
}

class _HomeDayState extends State<_HomeDay> {
  late Future<List<LeagueGroup>> _future;
  Timer? _poll;
  int _filter = 0;
  bool _expanded = false;

  static const _collapsedLeagues = 6;

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
    final future = ApiClient.instance.matches(date: yyyymmdd(widget.day)).then((groups) {
      return [...groups]..sort((a, b) => _rank(a.league).compareTo(_rank(b.league)));
    });
    setState(() {
      _future = future;
    });
    _poll?.cancel();
    future.then((groups) {
      if (mounted && groups.any((g) => g.matches.any((m) => m.isLive))) {
        _poll = Timer(const Duration(seconds: 30), _load);
      }
    }, onError: (_) {});
  }

  bool _matchesFilter(MatchSummary m) => switch (_filter) {
    1 => m.isLive,
    2 => m.status == MatchStatus.finished,
    3 => !m.hasStarted && m.status == MatchStatus.scheduled,
    _ => true,
  };

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return RefreshIndicator(
      color: c.brand,
      onRefresh: () async {
        _load();
        widget.onRefreshExtras();
        await _future;
      },
      child: FutureBuilder<List<LeagueGroup>>(
        future: _future,
        builder: (context, snap) => CustomScrollView(
          slivers: [
            ..._matchSlivers(context, snap),
            ..._valueSlivers(context),
            const SliverToBoxAdapter(child: SizedBox(height: Space.xxl)),
          ],
        ),
      ),
    );
  }

  List<Widget> _matchSlivers(BuildContext context, AsyncSnapshot<List<LeagueGroup>> snap) {
    final c = context.c;
    if (snap.hasError) {
      return [
        SliverToBoxAdapter(
          child: SizedBox(
            height: 260,
            child: EmptyState(
              icon: Icons.wifi_off_rounded,
              title: 'Couldn’t load matches',
              body: '${snap.error}',
              actionLabel: 'Try again',
              onAction: _load,
            ),
          ),
        ),
      ];
    }
    if (!snap.hasData) {
      return [
        SliverToBoxAdapter(
          child: SizedBox(
            height: 200,
            child: Center(child: CircularProgressIndicator(color: c.brand, strokeWidth: 2.5)),
          ),
        ),
      ];
    }

    final groups = snap.data!;
    final all = [
      for (final g in groups)
        for (final m in g.matches) (m, g.league),
    ];
    final live = all.where((e) => e.$1.isLive).toList();
    final featured = (live.isNotEmpty ? live : all.where((e) => _rank(e.$2) < _topLeagues.length).toList())
        .take(8)
        .toList();
    if (featured.isEmpty) featured.addAll(all.take(8));

    final filtered = [
      for (final g in groups)
        if (g.matches.where(_matchesFilter).isNotEmpty) LeagueGroup(g.league, g.matches.where(_matchesFilter).toList()),
    ];
    final shown = _expanded ? filtered : filtered.take(_collapsedLeagues).toList();
    final counts = [
      all.length,
      live.length,
      all.where((e) => e.$1.status == MatchStatus.finished).length,
      all.where((e) => !e.$1.hasStarted && e.$1.status == MatchStatus.scheduled).length,
    ];

    return [
      if (featured.isNotEmpty) ...[
        SliverToBoxAdapter(
          child: HomeSectionHeader(
            live.isNotEmpty ? 'Live now' : 'Top matches',
            icon: live.isNotEmpty ? Icons.sensors : Icons.local_fire_department_outlined,
          ),
        ),
        SliverToBoxAdapter(
          child: SizedBox(
            height: FeaturedMatchCard.height,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
              itemCount: featured.length,
              separatorBuilder: (_, _) => const SizedBox(width: Space.m),
              itemBuilder: (_, i) => FeaturedMatchCard(
                match: featured[i].$1,
                league: featured[i].$2,
                onTap: () => context.push('/match/${featured[i].$1.id}'),
              ),
            ),
          ),
        ),
      ],
      SliverToBoxAdapter(child: HomeSectionHeader('Matches', icon: Icons.sports_soccer)),
      SliverToBoxAdapter(
        child: ChipTabs(
          labels: [for (var i = 0; i < _filterLabels.length; i++) '${_filterLabels[i]} ${counts[i]}'],
          selected: _filter,
          onSelected: (i) => setState(() {
            _filter = i;
          }),
        ),
      ),
      if (filtered.isEmpty)
        SliverToBoxAdapter(
          child: SizedBox(
            height: 180,
            child: EmptyState(
              icon: Icons.sports_soccer,
              title: _filter == 1 ? 'No live matches right now' : 'No matches on this day',
            ),
          ),
        ),
      for (final g in shown) ...[
        SliverToBoxAdapter(
          child: LeagueHeader(
            league: g.league,
            onTap: g.league.id.isEmpty ? null : () => context.push('/league/${g.league.id}', extra: g.league),
          ),
        ),
        SliverList.builder(
          itemCount: g.matches.length,
          itemBuilder: (_, i) => MatchRow(match: g.matches[i], onTap: () => context.push('/match/${g.matches[i].id}')),
        ),
      ],
      if (filtered.length > _collapsedLeagues)
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(Space.gutter, Space.l, Space.gutter, 0),
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: c.brand,
                side: BorderSide(color: c.border),
                minimumSize: const Size.fromHeight(42),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.large)),
              ),
              onPressed: () => setState(() {
                _expanded = !_expanded;
              }),
              child: Text(
                (_expanded ? 'Show fewer competitions' : 'Show all ${filtered.length} competitions').toUpperCase(),
                style: A1Text.chip,
              ),
            ),
          ),
        ),
    ];
  }

  List<Widget> _valueSlivers(BuildContext context) {
    final x = widget.extras;
    return [
      SliverToBoxAdapter(
        child: HomeSectionHeader(
          'Most valuable players',
          icon: Icons.trending_up_rounded,
          actionLabel: 'See all',
          onAction: () => context.push('/values'),
        ),
      ),
      SliverToBoxAdapter(
        child: _Section<List<PlayerValueRow>>(
          future: x.valuable,
          failed: 'Market values couldn’t be loaded. Try again in a moment.',
          builder: (players) => SizedBox(
            height: PlayerValueCard.height,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
              itemCount: players.length,
              separatorBuilder: (_, _) => const SizedBox(width: Space.m),
              itemBuilder: (_, i) => PlayerValueCard(
                player: players[i],
                rank: i + 1,
                onTap: () =>
                    context.push('/player/${players[i].id.isEmpty ? playerSlug(players[i].name) : players[i].id}'),
              ),
            ),
          ),
        ),
      ),
      const SliverToBoxAdapter(child: HomeSectionHeader('Market movers', icon: Icons.swap_vert_rounded)),
      SliverToBoxAdapter(
        child: _Section<ValueMovers>(
          future: x.movers,
          failed: 'Value changes couldn’t be loaded.',
          isEmpty: (m) => m.risers.isEmpty && m.fallers.isEmpty,
          builder: (m) => _MoversCard(movers: m),
        ),
      ),
      const SliverToBoxAdapter(child: HomeSectionHeader('Latest transfers', icon: Icons.compare_arrows_rounded)),
      SliverToBoxAdapter(
        child: _Section<List<TransferItem>>(
          future: x.transfers,
          failed: 'Transfers couldn’t be loaded. Try again in a moment.',
          builder: (rows) => Column(
            children: [
              for (final t in rows)
                TransferTile(
                  transfer: t,
                  onTap: t.playerSlug == null ? null : () => context.push('/player/${t.playerSlug}'),
                ),
            ],
          ),
        ),
      ),
      const SliverToBoxAdapter(child: HomeSectionHeader('Top clubs by squad value', icon: Icons.shield_outlined)),
      SliverToBoxAdapter(
        child: _Section<List<ClubValueRow>>(
          future: x.clubs,
          failed: 'Squad values couldn’t be loaded. Try again in a moment.',
          builder: (clubs) => Column(
            children: [for (var i = 0; i < clubs.length; i++) ClubRankTile(club: clubs[i], rank: i + 1)],
          ),
        ),
      ),
    ];
  }
}

/// A home section that shows an honest notice instead of sample data when it fails.
class _Section<T> extends StatelessWidget {
  const _Section({required this.future, required this.builder, required this.failed, this.isEmpty});
  final Future<T> future;
  final Widget Function(T data) builder;
  final String failed;
  final bool Function(T data)? isEmpty;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return FutureBuilder<T>(
      future: future,
      builder: (context, snap) {
        Widget notice(String text) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.xl),
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: A1Text.body.copyWith(color: c.contentTertiary),
          ),
        );
        if (snap.hasError) return notice(failed);
        if (!snap.hasData) {
          return SizedBox(
            height: 80,
            child: Center(child: CircularProgressIndicator(color: c.brand, strokeWidth: 2)),
          );
        }
        final data = snap.data as T;
        final empty = isEmpty?.call(data) ?? (data is List && data.isEmpty);
        return empty ? notice('Nothing to show yet.') : builder(data);
      },
    );
  }
}

class _MoversCard extends StatefulWidget {
  const _MoversCard({required this.movers});
  final ValueMovers movers;

  @override
  State<_MoversCard> createState() => _MoversCardState();
}

class _MoversCardState extends State<_MoversCard> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final rows = _tab == 0 ? widget.movers.risers : widget.movers.fallers;
    return Column(
      children: [
        ChipTabs(
          labels: const ['Risers', 'Fallers'],
          selected: _tab,
          onSelected: (i) => setState(() {
            _tab = i;
          }),
        ),
        for (final p in rows)
          MoverTile(player: p, onTap: () => context.push('/player/${p.id.isEmpty ? playerSlug(p.name) : p.id}')),
      ],
    );
  }
}
