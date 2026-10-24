import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/common.dart';
import '../widgets/home_widgets.dart';
import 'values_screen.dart';

const _tabs = ['Players', 'Clubs', 'Movers', 'Transfers', 'Leagues'];

/// Market tab: every market value view the website has, one tab each.
class MarketScreen extends StatefulWidget {
  const MarketScreen({super.key, this.initialTab = 0});
  final int initialTab;

  @override
  State<MarketScreen> createState() => _MarketScreenState();
}

class _MarketScreenState extends State<MarketScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController =
      TabController(length: _tabs.length, vsync: this, initialIndex: widget.initialTab);

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Market values'),
        actions: [
          IconButton(tooltip: 'Settings', onPressed: () => context.push('/settings'), icon: const Icon(Icons.person_outline)),
          const SizedBox(width: Space.s),
        ],
        bottom: PrimaryTabBar(controller: _tabController, labels: _tabs),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [ValuesScreenBody(), _ClubsTab(), _MoversTab(), _TransfersTab(), _LeaguesTab()],
      ),
    );
  }
}

/// FutureBuilder + AsyncBody with pull to refresh.
class _Loader<T> extends StatefulWidget {
  const _Loader({super.key, required this.load, required this.builder, this.isEmpty, this.emptyTitle = 'Nothing to show yet'});
  final Future<T> Function() load;
  final Widget Function(T data) builder;
  final bool Function(T data)? isEmpty;
  final String emptyTitle;

  @override
  State<_Loader<T>> createState() => _LoaderState<T>();
}

class _LoaderState<T> extends State<_Loader<T>> with AutomaticKeepAliveClientMixin {
  late Future<T> _future = widget.load();

  @override
  bool get wantKeepAlive => true;

  void _reload() {
    setState(() {
      _future = widget.load();
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final c = context.c;
    return FutureBuilder<T>(
      future: _future,
      builder: (context, snap) => AsyncBody<T>(
        snapshot: snap,
        onRetry: _reload,
        isEmpty: widget.isEmpty,
        empty: EmptyState(icon: Icons.euro_rounded, title: widget.emptyTitle),
        builder: (data) => RefreshIndicator(
          color: c.brand,
          onRefresh: () async {
            _reload();
            await _future;
          },
          child: widget.builder(data),
        ),
      ),
    );
  }
}

class _ClubsTab extends StatelessWidget {
  const _ClubsTab();

  @override
  Widget build(BuildContext context) => _Loader<List<ClubValueRow>>(
        load: () => ApiClient.instance.clubs(limit: 100),
        isEmpty: (l) => l.isEmpty,
        builder: (clubs) {
          final total = clubs.fold<int>(0, (a, c) => a + c.squadValueEur);
          return ListView(children: [
            _TotalBanner(label: 'Top ${clubs.length} squads combined', valueEur: total),
            const SectionBar('Club', trailing: 'Squad value'),
            for (var i = 0; i < clubs.length; i++) ClubRankTile(club: clubs[i], rank: i + 1),
          ]);
        },
      );
}

class _MoversTab extends StatefulWidget {
  const _MoversTab();

  @override
  State<_MoversTab> createState() => _MoversTabState();
}

class _MoversTabState extends State<_MoversTab> {
  int _side = 0;

  @override
  Widget build(BuildContext context) => _Loader<ValueMovers>(
        load: () => ApiClient.instance.movers(limit: 20),
        isEmpty: (m) => m.risers.isEmpty && m.fallers.isEmpty,
        emptyTitle: 'No value changes yet',
        builder: (m) {
          final rows = _side == 0 ? m.risers : m.fallers;
          return ListView(children: [
            ChipTabs(
              labels: const ['Biggest risers', 'Biggest fallers'],
              selected: _side,
              onSelected: (i) => setState(() {
                _side = i;
              }),
            ),
            const SectionBar('Player', trailing: 'Value · change'),
            for (final p in rows)
              MoverTile(player: p, onTap: () => context.push('/player/${p.id.isEmpty ? playerSlug(p.name) : p.id}')),
          ]);
        },
      );
}

const _transferTypes = ['moves', 'ends', 'records'];
const _transferLabels = ['Latest moves', 'Contract ends', 'Record fees'];

class _TransfersTab extends StatefulWidget {
  const _TransfersTab();

  @override
  State<_TransfersTab> createState() => _TransfersTabState();
}

class _TransfersTabState extends State<_TransfersTab> {
  int _type = 0;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Column(children: [
      Container(
        color: c.bgPrimary,
        child: ChipTabs(
          labels: _transferLabels,
          selected: _type,
          onSelected: (i) => setState(() {
            _type = i;
          }),
        ),
      ),
      Expanded(
        child: _Loader<List<TransferItem>>(
          key: ValueKey(_type),
          load: () => ApiClient.instance.transfers(limit: 50, type: _transferTypes[_type]),
          isEmpty: (l) => l.isEmpty,
          emptyTitle: 'No transfers recorded yet',
          builder: (rows) => ListView(children: [
            for (final t in rows)
              TransferTile(transfer: t, onTap: t.playerSlug == null ? null : () => context.push('/player/${t.playerSlug}')),
          ]),
        ),
      ),
    ]);
  }
}

class _LeaguesTab extends StatelessWidget {
  const _LeaguesTab();

  @override
  Widget build(BuildContext context) => _Loader<List<LeagueRef>>(
        load: ApiClient.instance.leagues,
        isEmpty: (l) => l.every((x) => (x.valueEur ?? 0) == 0),
        builder: (all) {
          final leagues = all.where((l) => (l.valueEur ?? 0) > 0).toList()
            ..sort((a, b) => b.valueEur!.compareTo(a.valueEur!));
          final top = leagues.first.valueEur!;
          return ListView(children: [
            const SectionBar('League', trailing: 'Total value'),
            for (final (i, l) in leagues.indexed)
              _LeagueValueRow(league: l, rank: i + 1, fraction: l.valueEur! / top),
          ]);
        },
      );
}

class _LeagueValueRow extends StatelessWidget {
  const _LeagueValueRow({required this.league, required this.rank, required this.fraction});
  final LeagueRef league;
  final int rank;
  final double fraction;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final l = league;
    final avg = (l.clubCount ?? 0) > 0 ? '${formatEur(l.valueEur! ~/ l.clubCount!)} avg squad' : null;
    return InkWell(
      onTap: () => context.push('/league/${l.id}', extra: l),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.l),
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
        child: Row(children: [
          SizedBox(
            width: 24,
            child: Text('$rank', style: A1Text.statValue.copyWith(fontWeight: FontWeight.w700, color: c.contentSecondary)),
          ),
          Crest(url: l.logoUrl, label: l.name, size: 30, radius: Radii.small),
          const SizedBox(width: Space.l),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(
                  child: Text(l.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: A1Text.valueName.copyWith(fontSize: 14, color: c.contentPrimary)),
                ),
                Text(formatEur(l.valueEur), style: A1Text.marketValue.copyWith(fontSize: 14, color: c.brand)),
              ]),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(Sizes.statBar / 2),
                child: LinearProgressIndicator(
                  value: fraction,
                  minHeight: Sizes.statBar,
                  color: c.brand,
                  backgroundColor: c.bgSecondary,
                ),
              ),
              if (avg != null) ...[
                const SizedBox(height: 4),
                Text('${l.country} · $avg', style: A1Text.meta.copyWith(color: c.contentTertiary)),
              ],
            ]),
          ),
        ]),
      ),
    );
  }
}

class _TotalBanner extends StatelessWidget {
  const _TotalBanner({required this.label, required this.valueEur});
  final String label;
  final int valueEur;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      margin: const EdgeInsets.all(Space.gutter),
      padding: const EdgeInsets.symmetric(horizontal: Space.xl, vertical: Space.l),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [c.appBar, c.brand]),
        borderRadius: BorderRadius.circular(Radii.xl),
      ),
      child: Row(children: [
        Expanded(child: Text(label, style: A1Text.body.copyWith(color: Colors.white.withValues(alpha: 0.85)))),
        Text(formatEur(valueEur), style: A1Text.calloutValue.copyWith(color: Colors.white)),
      ]),
    );
  }
}
