import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../api/models.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// A1score's momentum model: per-minute pressure from the shot map.
/// Each shot adds threat (a base for the attempt, plus its xG, plus a bonus when
/// on target); pressure carries over from minute to minute and fades, so a spell
/// of chances builds a run of bars. Returns one value per minute in -1..1,
/// positive when the home side is on top.
List<double> computeMomentum(List<MatchShot> shots, int lastMinute) {
  if (shots.isEmpty || lastMinute <= 0) return const [];
  final home = List<double>.filled(lastMinute + 1, 0);
  final away = List<double>.filled(lastMinute + 1, 0);
  for (final s in shots) {
    final m = s.minute.clamp(0, lastMinute);
    final threat = 0.1 + (s.xg ?? 0.08) * 0.9 + (s.onTarget ? 0.1 : 0);
    (s.isHome ? home : away)[m] += threat;
  }
  const carry = 0.75;
  var ph = 0.0, pa = 0.0;
  final raw = <double>[];
  for (var m = 1; m <= lastMinute; m++) {
    ph = ph * carry + home[m];
    pa = pa * carry + away[m];
    raw.add(ph - pa);
  }
  final peak = math.max(0.3, raw.fold<double>(0, (a, v) => math.max(a, v.abs())));
  return [for (final v in raw) v / peak];
}

/// Last minute to chart: the live minute, or full time (90, or later if shots say so).
int momentumEnd(MatchDetail d) {
  final lastShot = d.shots.fold<int>(0, (a, s) => math.max(a, s.minute));
  if (d.summary.isLive) {
    final live = int.tryParse(RegExp(r'\d+').stringMatch(d.summary.minute ?? '') ?? '');
    return math.max(live ?? 0, lastShot);
  }
  return math.max(90, lastShot);
}

/// Match Momentum card: bars above the line for the home side, below for the away side.
class MomentumChart extends StatelessWidget {
  const MomentumChart({super.key, required this.detail});
  final MatchDetail detail;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final end = momentumEnd(detail);
    final values = computeMomentum(detail.shots, end);
    if (values.isEmpty) return const SizedBox.shrink();
    final s = detail.summary;
    Widget team(TeamRef t, Color color) => Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 10, height: 10, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
          const SizedBox(width: 6),
          Text(t.name, style: A1Text.meta.copyWith(color: c.contentSecondary)),
        ]);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(Space.gutter, Space.l, Space.gutter, Space.s),
        child: Row(children: [
          team(s.home, c.statHome),
          const Spacer(),
          team(s.away, c.statAway),
        ]),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
        child: SizedBox(
          height: 120,
          width: double.infinity,
          child: CustomPaint(
            painter: _MomentumPainter(
              values: values,
              goals: detail.goals,
              home: c.statHome,
              away: c.statAway,
              grid: c.border,
              label: c.contentTertiary,
              goal: c.brand,
            ),
          ),
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(Space.gutter, Space.m, Space.gutter, 0),
        child: Text(
          'A1score momentum model from shots and xG, inspired by Flashscore’s Match Momentum (Opta).',
          style: A1Text.meta.copyWith(color: c.contentTertiary, fontSize: 11),
        ),
      ),
    ]);
  }
}

class _MomentumPainter extends CustomPainter {
  _MomentumPainter({
    required this.values,
    required this.goals,
    required this.home,
    required this.away,
    required this.grid,
    required this.label,
    required this.goal,
  });
  final List<double> values;
  final List<MatchGoal> goals;
  final Color home, away, grid, label, goal;

  static const _labelHeight = 14.0;

  @override
  void paint(Canvas canvas, Size size) {
    final n = math.max(values.length, 90);
    final chartH = size.height - _labelHeight;
    final mid = chartH / 2;
    final slot = size.width / n;
    final barW = math.max(1.0, slot * 0.7);
    final line = Paint()..color = grid..strokeWidth = 1;

    // Half-time divider and centre line.
    final ht = 45 * slot;
    canvas.drawLine(Offset(ht, 0), Offset(ht, chartH), line);
    canvas.drawLine(Offset(0, mid), Offset(size.width, mid), line);

    final hp = Paint()..color = home;
    final ap = Paint()..color = away;
    for (var i = 0; i < values.length; i++) {
      final v = values[i];
      if (v.abs() < 0.02) continue;
      final x = i * slot + (slot - barW) / 2;
      final h = v.abs() * (mid - 8);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          v > 0 ? Rect.fromLTWH(x, mid - h, barW, h) : Rect.fromLTWH(x, mid, barW, h),
          const Radius.circular(1),
        ),
        v > 0 ? hp : ap,
      );
    }

    // Goal markers at the top (home) or bottom (away) edge.
    final gp = Paint()..color = goal;
    for (final g in goals) {
      final x = (g.minute - 0.5).clamp(0, n) * slot;
      canvas.drawCircle(Offset(x, g.isHome ? 4 : chartH - 4), 4, gp);
    }

    for (final m in [0, 45, 90]) {
      final tp = TextPainter(
        text: TextSpan(text: "$m'", style: A1Text.meta.copyWith(fontSize: 10, color: label)),
        textDirection: TextDirection.ltr,
      )..layout();
      final x = (m * slot - tp.width / 2).clamp(0, size.width - tp.width).toDouble();
      tp.paint(canvas, Offset(x, chartH + 2));
    }
  }

  @override
  bool shouldRepaint(_MomentumPainter old) => old.values != values || old.goals != goals || old.home != home;
}
