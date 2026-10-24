import 'package:flutter/material.dart';

import '../api/models.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/common.dart';

/// League table: 23 dp caps header, 38 dp rows, 19 dp position badges.
class StandingsTable extends StatelessWidget {
  const StandingsTable({super.key, required this.rows, this.highlightIds = const {}});
  final List<StandingRow> rows;
  final Set<String> highlightIds;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    if (rows.isEmpty) {
      return const EmptyState(icon: Icons.table_rows_outlined, title: 'No table for this competition');
    }
    final head = A1Text.sectionBar.copyWith(color: c.contentSecondary);
    // The website's table pairs each club's points with its squad value.
    final showValue = rows.any((r) => (r.squadValueEur ?? 0) > 0);
    Widget num(String t, TextStyle s, [double w = 34]) => SizedBox(width: w, child: Text(t, textAlign: TextAlign.center, style: s));

    return Column(children: [
      Container(
        height: Sizes.standingsHeader,
        color: c.bgSectionHeader,
        padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
        child: Row(children: [
          SizedBox(width: 30, child: Text('#', style: head)),
          Expanded(child: Text('TEAM', style: head)),
          num('MP', head),
          num('G', head, 48),
          num('PTS', head),
          if (showValue) num('VALUE', head, 60),
        ]),
      ),
      for (final r in rows)
        Material(
          color: highlightIds.contains(r.team.id) ? c.bgHighlight : c.bgPrimary,
          child: InkWell(
            child: Container(
              height: Sizes.standingsRow,
              padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
              decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
              child: Row(children: [
                SizedBox(
                  width: 30,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      width: Sizes.positionBadge,
                      height: Sizes.positionBadge,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: _zone(r.zoneColor) ?? Colors.transparent,
                        borderRadius: BorderRadius.circular(Radii.small),
                      ),
                      child: Text('${r.pos}',
                          style: A1Text.badge.copyWith(color: _zone(r.zoneColor) == null ? c.contentPrimary : Colors.white)),
                    ),
                  ),
                ),
                Crest(url: r.team.crestUrl, label: r.team.name),
                const SizedBox(width: Space.m),
                Expanded(
                  child: Text(r.team.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: A1Text.statLabel.copyWith(color: c.contentPrimary, fontWeight: highlightIds.contains(r.team.id) ? FontWeight.w700 : FontWeight.w400)),
                ),
                num('${r.played}', A1Text.statValue.copyWith(color: c.contentSecondary)),
                num(r.goals, A1Text.statValue.copyWith(color: c.contentSecondary), 48),
                num('${r.points}', A1Text.statValue.copyWith(color: c.contentPrimary, fontWeight: FontWeight.w700)),
                if (showValue)
                  num((r.squadValueEur ?? 0) > 0 ? formatEur(r.squadValueEur) : '—', A1Text.meta.copyWith(color: c.contentSecondary), 60),
              ]),
            ),
          ),
        ),
    ]);
  }

  static Color? _zone(String? hex) {
    if (hex == null || hex.isEmpty) return null;
    final h = hex.replaceFirst('#', '');
    final v = int.tryParse(h.length == 6 ? 'FF$h' : h, radix: 16);
    return v == null ? null : Color(v);
  }
}
