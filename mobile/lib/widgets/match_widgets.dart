import 'package:flutter/material.dart';

import '../api/models.dart';
import '../state/favourites.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import 'common.dart';

/// 50 dp league header; favourite leagues get the tinted background.
class LeagueHeader extends StatelessWidget {
  const LeagueHeader({super.key, required this.league, this.onTap});
  final LeagueRef league;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return ValueListenableBuilder(
      valueListenable: Favourites.instance.leagues,
      builder: (context, favs, _) => Material(
        color: favs.contains(league.id) ? c.bgFavourite : c.bgSectionHeader,
        child: InkWell(
          onTap: onTap,
          child: SizedBox(
            height: Sizes.leagueHeader,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
              child: Row(children: [
                Container(
                  width: Sizes.leagueLogo,
                  height: Sizes.leagueLogo,
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(color: c.bgCard, borderRadius: BorderRadius.circular(Radii.medium)),
                  child: Crest(url: league.logoUrl, label: league.name, size: 24, radius: Radii.small),
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(league.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: A1Text.leagueName.copyWith(color: c.contentPrimary)),
                    if (league.country.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(league.country.toUpperCase(), style: A1Text.countryLabel.copyWith(color: c.contentSecondary)),
                    ],
                  ]),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

/// The 60 dp match row. Column x-positions follow layout-spec.md §4.
class MatchRow extends StatelessWidget {
  const MatchRow({super.key, required this.match, this.onTap, this.showOdds = false});
  final MatchSummary match;
  final VoidCallback? onTap;
  final bool showOdds;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final m = match;
    final scoreColor = m.isLive ? c.live : c.contentPrimary;
    TextStyle name(bool bold) => A1Text.teamName.copyWith(color: c.contentPrimary, fontWeight: bold ? FontWeight.w700 : FontWeight.w400);

    Widget status;
    if (m.isLive) {
      status = Text(m.status == MatchStatus.halftime ? 'HT' : (m.minute ?? 'LIVE'), style: A1Text.liveMinute.copyWith(color: c.live));
    } else if (m.status == MatchStatus.postponed || m.status == MatchStatus.cancelled) {
      status = Text(m.status == MatchStatus.postponed ? 'PPD' : 'CANC', style: A1Text.badge.copyWith(color: c.contentTertiary));
    } else if (m.status == MatchStatus.finished) {
      status = Text('FT', style: A1Text.kickoff.copyWith(color: c.contentTertiary));
    } else {
      status = Text(m.kickoff == null ? '—' : hourMinute(m.kickoff!), style: A1Text.kickoff.copyWith(color: c.contentPrimary));
    }

    return Material(
      color: c.bgPrimary,
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: Sizes.matchRow,
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
          child: Row(children: [
            SizedBox(width: 39, child: _FavStar(id: m.id, label: '${m.home.name} – ${m.away.name}')),
            Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Crest(url: m.home.crestUrl, label: m.home.name),
              const SizedBox(height: 7),
              Crest(url: m.away.crestUrl, label: m.away.name),
            ]),
            const SizedBox(width: 10),
            Expanded(
              child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(m.home.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: name(m.winner == 1)),
                const SizedBox(height: 5),
                Text(m.away.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: name(m.winner == -1)),
              ]),
            ),
            SizedBox(width: 47, child: Center(child: status)),
            const SizedBox(width: 17),
            SizedBox(
              width: 28,
              child: m.hasStarted
                  ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Text('${m.home.score ?? 0}', style: A1Text.rowScore.copyWith(color: scoreColor)),
                      const SizedBox(height: 5),
                      Text('${m.away.score ?? 0}', style: A1Text.rowScore.copyWith(color: scoreColor)),
                    ])
                  : null,
            ),
            if (showOdds && m.odds != null) ...[
              const SizedBox(width: 15),
              SizedBox(
                width: 22,
                child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                  for (final o in [m.odds!.home, m.odds!.draw, m.odds!.away])
                    Text(o.current.toStringAsFixed(2), style: A1Text.odds.copyWith(color: c.contentTertiary)),
                ]),
              ),
            ],
            const SizedBox(width: 14),
          ]),
        ),
      ),
    );
  }
}

class _FavStar extends StatelessWidget {
  const _FavStar({required this.id, this.label});
  final String id;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return ValueListenableBuilder(
      valueListenable: Favourites.instance.matches,
      builder: (context, favs, _) {
        final on = favs.contains(id);
        return IconButton(
          tooltip: on ? 'Unfollow match' : 'Follow match',
          padding: EdgeInsets.zero,
          iconSize: 20,
          onPressed: () => Favourites.instance.toggle(Favourites.instance.matches, id, label: label),
          icon: Icon(on ? Icons.star_rounded : Icons.star_outline_rounded, color: on ? c.favouriteStar : c.statMuted),
        );
      },
    );
  }
}

/// 56 dp market value row: rank, photo, name + club line, value + trend.
class ValueRow extends StatelessWidget {
  const ValueRow({super.key, required this.player, this.rank, this.onTap, this.highlight = false});
  final PlayerValueRow player;
  final int? rank;
  final VoidCallback? onTap;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final p = player;
    final meta = [p.clubName, p.position, if (p.age != null) '${p.age}'].whereType<String>().where((s) => s.isNotEmpty).join(' · ');
    final t = p.trend;
    final tColor = t == null || t.diffEur == 0 ? c.contentTertiary : (t.diffEur > 0 ? c.win : c.loss);
    return Material(
      color: highlight ? c.bgHighlight : c.bgPrimary,
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: Sizes.valueRow,
          padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
          child: Row(children: [
            if (rank != null)
              SizedBox(width: 30, child: Text('$rank', textAlign: TextAlign.center, style: A1Text.statValue.copyWith(fontWeight: FontWeight.w700, color: c.contentPrimary))),
            Crest(url: p.photoUrl, label: p.name, size: Sizes.playerPhoto),
            const SizedBox(width: Space.l),
            Expanded(
              child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: A1Text.valueName.copyWith(color: c.contentPrimary)),
                if (meta.isNotEmpty)
                  Row(children: [
                    if (p.clubLogo != null) ...[Crest(url: p.clubLogo, label: p.clubName ?? '', size: 14), const SizedBox(width: 5)],
                    Expanded(child: Text(meta, maxLines: 1, overflow: TextOverflow.ellipsis, style: A1Text.meta.copyWith(color: c.contentTertiary))),
                  ]),
              ]),
            ),
            const SizedBox(width: Space.m),
            Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(formatEur(p.valueEur), style: A1Text.marketValue.copyWith(color: c.contentPrimary)),
              if (t != null) Text(formatTrend(t.diffEur), style: A1Text.marketTrend.copyWith(color: tColor)),
            ]),
          ]),
        ),
      ),
    );
  }
}
