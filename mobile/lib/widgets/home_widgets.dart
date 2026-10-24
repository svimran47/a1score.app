import 'package:flutter/material.dart';

import '../api/models.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import 'common.dart';

/// Section title with an optional "See all" action, as on the website home.
class HomeSectionHeader extends StatelessWidget {
  const HomeSectionHeader(this.title, {super.key, this.icon, this.actionLabel, this.onAction});
  final String title;
  final IconData? icon;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.fromLTRB(Space.gutter, Space.xl, Space.s, Space.s),
      child: Row(
        children: [
          if (icon != null) ...[Icon(icon, size: 20, color: c.brand), const SizedBox(width: Space.m)],
          Expanded(
            child: Text(title, style: A1Text.sectionTitle.copyWith(color: c.contentPrimary)),
          ),
          if (actionLabel != null)
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(foregroundColor: c.brand),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(actionLabel!.toUpperCase(), style: A1Text.chip),
                  const Icon(Icons.chevron_right, size: 18),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Big match card for the "Live now" / "Top matches" carousel.
class FeaturedMatchCard extends StatelessWidget {
  const FeaturedMatchCard({super.key, required this.match, required this.league, this.onTap});
  final MatchSummary match;
  final LeagueRef league;
  final VoidCallback? onTap;

  static const double width = 248;
  static const double height = 124;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final m = match;
    final String status;
    final Color statusColor;
    if (m.isLive) {
      status = m.status == MatchStatus.halftime ? 'HT' : (m.minute ?? 'LIVE');
      statusColor = c.live;
    } else if (m.status == MatchStatus.finished) {
      status = 'FT';
      statusColor = c.contentTertiary;
    } else if (m.status == MatchStatus.postponed || m.status == MatchStatus.cancelled) {
      status = m.status == MatchStatus.postponed ? 'PPD' : 'CANC';
      statusColor = c.contentTertiary;
    } else {
      status = m.kickoff == null ? '—' : hourMinute(m.kickoff!);
      statusColor = c.brand;
    }

    Widget side(TeamRef t, bool winner) => Row(
      children: [
        Crest(url: t.crestUrl, label: t.name, size: 22),
        const SizedBox(width: Space.m),
        Expanded(
          child: Text(
            t.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: A1Text.teamName.copyWith(
              color: c.contentPrimary,
              fontWeight: winner ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ),
        if (m.hasStarted)
          Text(
            '${t.score ?? 0}',
            style: A1Text.rowScore.copyWith(fontSize: 17, color: m.isLive ? c.live : c.contentPrimary),
          ),
      ],
    );

    return SizedBox(
      width: width,
      child: Material(
        color: c.bgCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.xl),
          side: BorderSide(color: m.isLive ? c.live.withValues(alpha: 0.5) : c.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(Space.l, Space.m + 2, Space.l, Space.m + 2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Crest(url: league.logoUrl, label: league.name, size: 14, radius: Radii.tiny),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        league.name.toUpperCase(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: A1Text.badge.copyWith(color: c.contentSecondary),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: m.isLive ? c.liveBg : c.bgSecondary,
                        borderRadius: BorderRadius.circular(Radii.base),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (m.isLive) ...[
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(color: c.live, shape: BoxShape.circle),
                            ),
                            const SizedBox(width: 4),
                          ],
                          Text(status, style: A1Text.liveMinute.copyWith(fontSize: 11, color: statusColor)),
                        ],
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                side(m.home, m.winner == 1),
                const SizedBox(height: Space.m),
                side(m.away, m.winner == -1),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Player card for the most valuable carousel: photo, value, club.
class PlayerValueCard extends StatelessWidget {
  const PlayerValueCard({super.key, required this.player, required this.rank, this.onTap});
  final PlayerValueRow player;
  final int rank;
  final VoidCallback? onTap;

  static const double width = 132;
  static const double height = 176;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final p = player;
    return SizedBox(
      width: width,
      child: Material(
        color: c.bgCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.xl),
          side: BorderSide(color: c.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Stack(
            children: [
              Positioned.fill(
                bottom: 74,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [c.bgHighlight, c.bgCard],
                    ),
                  ),
                ),
              ),
              Positioned(
                top: Space.m,
                left: Space.m,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(color: c.appBar, borderRadius: BorderRadius.circular(Radii.base)),
                  child: Text('#$rank', style: A1Text.badge.copyWith(color: c.appBarContent, fontSize: 11)),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(Space.m, Space.l, Space.m, Space.m + 2),
                child: Column(
                  children: [
                    Crest(url: p.photoUrl, label: p.name, size: 64),
                    const Spacer(),
                    Text(
                      p.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: A1Text.valueName.copyWith(fontSize: 14, color: c.contentPrimary),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (p.clubLogo != null) ...[
                          Crest(url: p.clubLogo, label: p.clubName ?? '', size: 12),
                          const SizedBox(width: 4),
                        ],
                        Flexible(
                          child: Text(
                            p.clubName ?? p.position ?? '',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: A1Text.meta.copyWith(color: c.contentTertiary),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: Space.s),
                    Text(
                      formatEur(p.valueEur),
                      style: A1Text.calloutValue.copyWith(fontSize: 20, height: 1.1, color: c.brand),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Riser / faller row: photo, name + club, new value and change.
class MoverTile extends StatelessWidget {
  const MoverTile({super.key, required this.player, this.onTap});
  final PlayerValueRow player;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final p = player;
    final diff = p.trend?.diffEur ?? 0;
    final up = diff > 0;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.m),
        child: Row(
          children: [
            Crest(url: p.photoUrl, label: p.name, size: 36),
            const SizedBox(width: Space.l),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: A1Text.valueName.copyWith(fontSize: 14, color: c.contentPrimary),
                  ),
                  Text(
                    p.clubName ?? p.position ?? '',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: A1Text.meta.copyWith(color: c.contentTertiary),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(formatEur(p.valueEur), style: A1Text.marketValue.copyWith(fontSize: 14, color: c.contentPrimary)),
                Container(
                  margin: const EdgeInsets.only(top: 2),
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: (up ? c.win : c.loss).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(Radii.base),
                  ),
                  child: Text(formatTrend(diff), style: A1Text.marketTrend.copyWith(color: up ? c.win : c.loss)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Latest transfer row: player, from → to, fee.
class TransferTile extends StatelessWidget {
  const TransferTile({super.key, required this.transfer, this.onTap});
  final TransferItem transfer;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final t = transfer;
    final fee = (t.feeEur ?? 0) > 0 ? formatEur(t.feeEur) : (t.typeLabel ?? '—');
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.m + 2),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: c.border)),
        ),
        child: Row(
          children: [
            Crest(url: t.photoUrl, label: t.playerName, size: 36),
            const SizedBox(width: Space.l),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t.playerName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: A1Text.valueName.copyWith(fontSize: 14, color: c.contentPrimary),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          t.fromClub ?? '—',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: A1Text.meta.copyWith(color: c.contentTertiary),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Icon(Icons.arrow_forward_rounded, size: 12, color: c.brand),
                      ),
                      Flexible(
                        child: Text(
                          t.toClub ?? '—',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: A1Text.meta.copyWith(color: c.contentPrimary, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: Space.m),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(fee, style: A1Text.marketValue.copyWith(fontSize: 14, color: c.contentPrimary)),
                if (t.date != null) Text(dayMonth(t.date!), style: A1Text.meta.copyWith(color: c.contentTertiary)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Club ranked by squad value: rank, crest, name + league, value.
class ClubRankTile extends StatelessWidget {
  const ClubRankTile({super.key, required this.club, required this.rank, this.onTap});
  final ClubValueRow club;
  final int rank;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final meta = [
      club.leagueName,
      if (club.squadSize != null) '${club.squadSize} players',
    ].whereType<String>().join(' · ');
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.m + 2),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: c.border)),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 24,
              child: Text(
                '$rank',
                style: A1Text.statValue.copyWith(fontWeight: FontWeight.w700, color: c.contentSecondary),
              ),
            ),
            Crest(url: club.logoUrl, label: club.name, size: 30, radius: Radii.small),
            const SizedBox(width: Space.l),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    club.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: A1Text.valueName.copyWith(fontSize: 14, color: c.contentPrimary),
                  ),
                  if (meta.isNotEmpty)
                    Text(
                      meta,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: A1Text.meta.copyWith(color: c.contentTertiary),
                    ),
                ],
              ),
            ),
            Text(formatEur(club.squadValueEur), style: A1Text.marketValue.copyWith(fontSize: 14, color: c.brand)),
          ],
        ),
      ),
    );
  }
}
