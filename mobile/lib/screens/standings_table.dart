import 'package:flutter/material.dart';

import '../api/models.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/common.dart';

enum StandingsMode { short, full, form }

/// League table: 23 dp caps header, 38 dp rows, 19 dp position badges.
/// Short shows points with squad value, Full adds W/D/L and goal difference, Form the last five.
class StandingsTable extends StatelessWidget {
  const StandingsTable({super.key, required this.rows, this.highlightIds = const {}, this.mode = StandingsMode.short});
  final List<StandingRow> rows;
  final Set<String> highlightIds;
  final StandingsMode mode;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    if (rows.isEmpty) {
      return const EmptyState(icon: Icons.table_rows_outlined, title: 'No table for this competition');
    }
    final head = A1Text.sectionBar.copyWith(color: c.contentSecondary);
    // The website's table pairs each club's points with its squad value.
    final showValue = mode == StandingsMode.short && rows.any((r) => (r.squadValueEur ?? 0) > 0);
    final full = mode == StandingsMode.full;
    final form = mode == StandingsMode.form;
    Widget num(String t, TextStyle s, [double w = 34]) => SizedBox(width: w, child: Text(t, textAlign: TextAlign.center, style: s));
    final sub = A1Text.statValue.copyWith(color: c.contentSecondary);

    return Column(children: [
      Container(
        height: Sizes.standingsHeader,
        color: c.bgSectionHeader,
        padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
        child: Row(children: [
          SizedBox(width: 30, child: Text('#', style: head)),
          Expanded(child: Text('TEAM', style: head)),
          if (!form) num('MP', head, full ? 26 : 34),
          if (full) ...[num('W', head, 24), num('D', head, 24), num('L', head, 24)],
          if (!form) num('G', head, 48),
          if (full) num('GD', head, 32),
          if (form) SizedBox(width: 5 * 22, child: Text('FORM', textAlign: TextAlign.center, style: head)),
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
                if (!form) num('${r.played}', sub, full ? 26 : 34),
                if (full) ...[num('${r.wins ?? '–'}', sub, 24), num('${r.draws ?? '–'}', sub, 24), num('${r.losses ?? '–'}', sub, 24)],
                if (!form) num(r.goals, sub, 48),
                if (full) num(r.goalDiff == null ? '–' : (r.goalDiff! > 0 ? '+${r.goalDiff}' : '${r.goalDiff}'), sub, 32),
                if (form) SizedBox(width: 5 * 22, child: _Form(results: r.form)),
                num('${r.points}', A1Text.statValue.copyWith(color: c.contentPrimary, fontWeight: FontWeight.w700)),
                if (showValue)
                  num((r.squadValueEur ?? 0) > 0 ? formatEur(r.squadValueEur) : '—', A1Text.meta.copyWith(color: c.contentSecondary), 60),
              ]),
            ),
          ),
        ),
    ]);
  }

  static Color? zone(String? hex) => _zone(hex);

  static Color? _zone(String? hex) {
    if (hex == null || hex.isEmpty) return null;
    final h = hex.replaceFirst('#', '');
    final v = int.tryParse(h.length == 6 ? 'FF$h' : h, radix: 16);
    return v == null ? null : Color(v);
  }
}

/// Last five results as W/D/L badges, most recent on the right.
class _Form extends StatelessWidget {
  const _Form({required this.results});
  final List<String> results;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      for (final r in results.length > 5 ? results.sublist(results.length - 5) : results)
        Container(
          width: Sizes.formBadge,
          height: Sizes.formBadge,
          margin: const EdgeInsets.symmetric(horizontal: 1),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: r == 'W' ? c.win : (r == 'L' ? c.loss : c.draw),
            borderRadius: BorderRadius.circular(Radii.small),
          ),
          child: Text(r, style: A1Text.badge.copyWith(color: Colors.white)),
        ),
    ]);
  }
}

/// Zone key under the table (Champions League, relegation, ...).
class StandingsLegend extends StatelessWidget {
  const StandingsLegend({super.key, required this.items});
  final List<LegendItem> items;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.fromLTRB(Space.gutter, Space.l, Space.gutter, 0),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        for (final l in items)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 3),
            child: Row(children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(color: StandingsTable.zone(l.color) ?? c.statMuted, borderRadius: BorderRadius.circular(Radii.tiny)),
              ),
              const SizedBox(width: Space.m),
              Expanded(child: Text(l.title, style: A1Text.meta.copyWith(color: c.contentSecondary))),
            ]),
          ),
      ]),
    );
  }
}
