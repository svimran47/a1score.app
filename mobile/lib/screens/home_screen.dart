import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/common.dart';
import '../widgets/date_strip.dart';
import '../widgets/match_widgets.dart';

/// Same order as TOP_LEAGUE_IDS on the website: these lead the day's list.
const _topLeagues = ['47', '87', '54', '55', '53', '61', '57', '42', '73', '10216'];

int _rank(LeagueRef l) {
  final i = _topLeagues.indexOf(l.id);
  return i < 0 ? _topLeagues.length : i;
}

/// All games: date row with a calendar dropdown, then the day's matches by league.
/// Swipe left or right to change day.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  DateTime _day = dateOnly(DateTime.now());
  final _pages = PageController(initialPage: dayRange);

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
        title: Row(children: [
          Icon(Icons.sports_soccer, size: 22, color: c.appBarContent),
          const SizedBox(width: 10),
          const Text('Football'),
        ]),
        actions: [
          IconButton(tooltip: 'Search', onPressed: () => context.push('/values'), icon: const Icon(Icons.search)),
          IconButton(
            tooltip: 'Favourites',
            onPressed: () => context.push('/favourites'),
            icon: const Icon(Icons.star_rounded),
          ),
          const SizedBox(width: Space.s),
        ],
      ),
      body: Column(children: [
        DateHeader(selected: _day, onSelected: _goTo),
        Expanded(
          child: PageView.builder(
            controller: _pages,
            itemCount: dayRange * 2 + 1,
            onPageChanged: (i) => setState(() {
              _day = dayForIndex(i);
            }),
            itemBuilder: (_, i) => _DayMatches(day: dayForIndex(i)),
          ),
        ),
      ]),
    );
  }
}

class _DayMatches extends StatefulWidget {
  const _DayMatches({required this.day});
  final DateTime day;

  @override
  State<_DayMatches> createState() => _DayMatchesState();
}

class _DayMatchesState extends State<_DayMatches> {
  late Future<List<LeagueGroup>> _future;
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

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return FutureBuilder<List<LeagueGroup>>(
      future: _future,
      builder: (context, snap) => AsyncBody<List<LeagueGroup>>(
        snapshot: snap,
        onRetry: _load,
        isEmpty: (g) => g.isEmpty,
        empty: const EmptyState(icon: Icons.sports_soccer, title: 'No matches on this day'),
        builder: (groups) => RefreshIndicator(
          color: c.brand,
          onRefresh: () async {
            _load();
            await _future;
          },
          child: CustomScrollView(slivers: [
            for (final g in groups) ...[
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
            const SliverToBoxAdapter(child: SizedBox(height: Space.xxl)),
          ]),
        ),
      ),
    );
  }
}
