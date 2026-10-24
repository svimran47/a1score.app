import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/common.dart';
import '../widgets/match_widgets.dart';

const _filters = ['all', 'live', 'finished', 'upcoming'];
const _filterLabels = ['All', 'Live', 'Finished', 'Scheduled'];

/// All Games (and the Live tab, which opens with the live filter selected).
class AllGamesScreen extends StatefulWidget {
  const AllGamesScreen({super.key, this.liveOnly = false});
  final bool liveOnly;

  @override
  State<AllGamesScreen> createState() => _AllGamesScreenState();
}

class _AllGamesScreenState extends State<AllGamesScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs =
      TabController(length: _filters.length, vsync: this, initialIndex: widget.liveOnly ? 1 : 0)
        ..addListener(() {
          if (!_tabs.indexIsChanging) _load();
        });
  DateTime _day = DateTime.now();
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
    _tabs.dispose();
    super.dispose();
  }

  void _load() {
    final future = ApiClient.instance.matches(date: yyyymmdd(_day), filter: _filters[_tabs.index]);
    setState(() { _future = future; });
    _poll?.cancel();
    future.then((groups) {
      final anyLive = groups.any((g) => g.matches.any((m) => m.isLive));
      if (mounted && anyLive) {
        _poll = Timer(const Duration(seconds: 15), _load);
      }
    }, onError: (_) {});
  }

  bool get _isToday => DateUtils.isSameDay(_day, DateTime.now());

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _day,
      firstDate: now.subtract(const Duration(days: 30)),
      lastDate: now.add(const Duration(days: 30)),
    );
    if (picked != null) {
      _day = picked;
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          Icon(Icons.sports_soccer, size: 22, color: c.appBarContent),
          const SizedBox(width: 10),
          const Text('Football'),
        ]),
        actions: [
          IconButton(tooltip: 'Search', onPressed: () => context.push('/values'), icon: const Icon(Icons.search)),
          IconButton(tooltip: 'Settings', onPressed: () => context.push('/settings'), icon: const Icon(Icons.person_outline)),
          const SizedBox(width: Space.s),
        ],
        bottom: PrimaryTabBar(controller: _tabs, labels: _filterLabels),
      ),
      body: Column(children: [
        SizedBox(
          height: Sizes.dateRow,
          child: Row(children: [
            IconButton(
              tooltip: 'Previous day',
              onPressed: () {
                _day = _day.subtract(const Duration(days: 1));
                _load();
              },
              icon: Icon(Icons.chevron_left, color: c.contentPrimary),
            ),
            Expanded(
              child: Text(
                _isToday ? 'Today ${dayMonth(_day)}' : dayMonth(_day),
                style: A1Text.dateRow.copyWith(color: c.contentPrimary),
              ),
            ),
            IconButton(
              tooltip: 'Next day',
              onPressed: () {
                _day = _day.add(const Duration(days: 1));
                _load();
              },
              icon: Icon(Icons.chevron_right, color: c.contentPrimary),
            ),
            IconButton(tooltip: 'Pick a date', onPressed: _pickDate, icon: Icon(Icons.calendar_month_outlined, color: c.contentPrimary)),
            const SizedBox(width: Space.s),
          ]),
        ),
        Expanded(
          child: FutureBuilder<List<LeagueGroup>>(
            future: _future,
            builder: (context, snap) => AsyncBody<List<LeagueGroup>>(
              snapshot: snap,
              onRetry: _load,
              isEmpty: (g) => g.isEmpty,
              empty: EmptyState(
                icon: Icons.sports_soccer,
                title: _tabs.index == 1 ? 'No live matches right now' : 'No matches on this day',
              ),
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
                      itemBuilder: (_, i) => MatchRow(
                        match: g.matches[i],
                        onTap: () => context.push('/match/${g.matches[i].id}'),
                      ),
                    ),
                  ],
                  const SliverToBoxAdapter(child: SizedBox(height: Space.xxl)),
                ]),
              ),
            ),
          ),
        ),
      ]),
    );
  }
}
