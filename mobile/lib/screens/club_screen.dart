import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../state/favourites.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/common.dart';
import '../widgets/home_widgets.dart';
import '../widgets/match_widgets.dart';
import 'player_screen.dart' show ValueChart;

const _groups = [('GK', 'Goalkeepers'), ('DEF', 'Defenders'), ('MID', 'Midfielders'), ('ATT', 'Forwards')];

/// Club page: header with squad value, then Overview, Squad and Transfers tabs.
class ClubScreen extends StatefulWidget {
  const ClubScreen({super.key, required this.id});
  final String id;

  @override
  State<ClubScreen> createState() => _ClubScreenState();
}

class _ClubScreenState extends State<ClubScreen> {
  late Future<ClubDetail> _future = ApiClient.instance.club(widget.id);

  @override
  Widget build(BuildContext context) {
    final favs = Favourites.instance;
    final follow = ValueListenableBuilder(
      valueListenable: favs.teams,
      builder: (_, set, _) => IconButton(
        tooltip: 'Follow club',
        onPressed: () => favs.toggle(favs.teams, widget.id),
        icon: Icon(set.contains(widget.id) ? Icons.star_rounded : Icons.star_outline_rounded),
      ),
    );
    return FutureBuilder<ClubDetail>(
      future: _future,
      builder: (context, snap) {
        if (!snap.hasData) {
          return Scaffold(
            appBar: AppBar(title: const Text('Club'), actions: [follow]),
            body: AsyncBody<ClubDetail>(
              snapshot: snap,
              onRetry: () => setState(() {
                _future = ApiClient.instance.club(widget.id);
              }),
              builder: (_) => const SizedBox(),
            ),
          );
        }
        final club = snap.data!;
        return DefaultTabController(
          length: 3,
          child: Scaffold(
            appBar: AppBar(
              title: Text(club.name),
              actions: [follow],
              bottom: const PrimaryTabBar(labels: ['Overview', 'Squad', 'Transfers']),
            ),
            body: TabBarView(children: [
              _Overview(club: club),
              _Squad(club: club),
              _Transfers(club: club),
            ]),
          ),
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.club});
  final ClubDetail club;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final sub = [club.leagueName, club.country].whereType<String>().where((s) => s.isNotEmpty).join(' · ');
    return Container(
      color: c.bgPrimary,
      padding: const EdgeInsets.all(Space.gutter),
      child: Row(children: [
        Crest(url: club.logoUrl, label: club.name, size: 64, radius: Radii.large),
        const SizedBox(width: Space.xl),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(club.name, style: A1Text.sectionTitle.copyWith(color: c.contentPrimary)),
            if (sub.isNotEmpty)
              InkWell(
                onTap: club.leagueId == null ? null : () => context.push('/league/${club.leagueId}'),
                child: Text(sub.toUpperCase(), style: A1Text.countryLabel.copyWith(color: c.contentSecondary)),
              ),
          ]),
        ),
      ]),
    );
  }
}

class _Overview extends StatelessWidget {
  const _Overview({required this.club});
  final ClubDetail club;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    Widget stat(String label, String value) => Expanded(
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: Space.s),
            padding: const EdgeInsets.symmetric(vertical: Space.l),
            decoration: BoxDecoration(color: c.bgSecondary, borderRadius: BorderRadius.circular(Radii.large)),
            child: Column(children: [
              Text(value, style: A1Text.calloutValue.copyWith(fontSize: 22, color: c.contentPrimary)),
              const SizedBox(height: 2),
              Text(label.toUpperCase(), style: A1Text.sectionBar.copyWith(color: c.contentSecondary)),
            ]),
          ),
        );
    Widget fact(String label, String value) => Container(
          height: Sizes.settingsRow,
          padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
          child: Row(children: [
            Text(label, style: A1Text.statLabel.copyWith(color: c.contentSecondary)),
            const SizedBox(width: Space.l),
            Expanded(
              child: Text(value,
                  textAlign: TextAlign.right,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: A1Text.statValue.copyWith(color: c.contentPrimary, fontWeight: FontWeight.w700)),
            ),
          ]),
        );
    return ListView(children: [
      _Header(club: club),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: Space.l, vertical: Space.s),
        child: Row(children: [
          stat('Squad value', formatEur(club.squadValueEur)),
          stat('Players', club.squadSize == null ? '—' : '${club.squadSize}'),
          stat('Avg age', club.averageAge == null ? '—' : club.averageAge!.toStringAsFixed(1)),
        ]),
      ),
      if (club.form.isNotEmpty) ...[
        const SectionBar('Form'),
        Padding(
          padding: const EdgeInsets.all(Space.gutter),
          child: Row(children: [
            for (final (result, score, opponent) in club.form)
              Expanded(
                child: Tooltip(
                  message: '$score $opponent',
                  child: Column(children: [
                    Container(
                      width: 28,
                      height: 28,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: result == 'W' ? c.win : (result == 'L' ? c.loss : c.draw),
                        borderRadius: BorderRadius.circular(Radii.base),
                      ),
                      child: Text(result, style: A1Text.chip.copyWith(color: Colors.white)),
                    ),
                    const SizedBox(height: 4),
                    Text(score, style: A1Text.meta.copyWith(color: c.contentSecondary)),
                  ]),
                ),
              ),
          ]),
        ),
      ],
      const SectionBar('Club info'),
      if (club.leaguePosition != null) fact('League position', club.leaguePosition!),
      if (club.nextMatch != null) fact('Next match', club.nextMatch!),
      if (club.manager != null) fact('Manager', club.manager!),
      if (club.venue != null && club.venue!.isNotEmpty) fact('Stadium', club.venue!),
      if (club.country != null) fact('Country', club.country!),
      if (club.honours.isNotEmpty) ...[
        const SectionBar('Honours', trailing: 'Titles'),
        for (final (name, titles, latest) in club.honours)
          fact(latest == null ? name : '$name (last $latest)', '$titles'),
      ],
      if (club.valueHistory.length >= 2) ...[
        const SectionBar('Squad value over time'),
        Padding(
          padding: const EdgeInsets.all(Space.gutter),
          child: SizedBox(height: Sizes.valueChart, child: ValueChart(points: club.valueHistory)),
        ),
      ],
      const SizedBox(height: Space.xxl),
    ]);
  }
}

/// Squad grouped by position, each player with their value, like the website's squad table.
class _Squad extends StatelessWidget {
  const _Squad({required this.club});
  final ClubDetail club;

  @override
  Widget build(BuildContext context) {
    if (club.squad.isEmpty) return const EmptyState(icon: Icons.groups_outlined, title: 'No squad listed for this club');
    final known = _groups.map((g) => g.$1).toSet();
    final other = club.squad.where((p) => !known.contains(p.group)).toList();
    return ListView(children: [
      for (final (key, label) in _groups)
        if (club.squad.any((p) => p.group == key)) ...[
          SectionBar(label, trailing: formatEur(club.squad.where((p) => p.group == key).fold<int>(0, (a, p) => a + p.valueEur))),
          for (final p in club.squad.where((p) => p.group == key)) _row(context, p),
        ],
      if (other.isNotEmpty) ...[
        const SectionBar('Other'),
        for (final p in other) _row(context, p),
      ],
      const SizedBox(height: Space.xxl),
    ]);
  }

  Widget _row(BuildContext context, SquadPlayer p) => ValueRow(
        player: PlayerValueRow(
          id: p.id,
          name: p.name,
          valueEur: p.valueEur,
          photoUrl: p.photoUrl,
          position: p.position,
          age: p.age,
        ),
        onTap: () => context.push('/player/${p.id.isEmpty ? playerSlug(p.name) : p.id}'),
      );
}

class _Transfers extends StatefulWidget {
  const _Transfers({required this.club});
  final ClubDetail club;

  @override
  State<_Transfers> createState() => _TransfersState();
}

class _TransfersState extends State<_Transfers> {
  int _side = 0;

  @override
  Widget build(BuildContext context) {
    final rows = _side == 0 ? widget.club.arrivals : widget.club.departures;
    return ListView(children: [
      ChipTabs(
        labels: const ['Arrivals', 'Departures'],
        selected: _side,
        onSelected: (i) => setState(() {
          _side = i;
        }),
      ),
      if (rows.isEmpty)
        const SizedBox(height: 240, child: EmptyState(icon: Icons.compare_arrows_rounded, title: 'No transfers recorded')),
      for (final t in rows)
        TransferTile(transfer: t, onTap: t.playerSlug == null ? null : () => context.push('/player/${t.playerSlug}')),
    ]);
  }
}
