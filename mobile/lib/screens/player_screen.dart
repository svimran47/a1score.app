import 'package:flutter/material.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../api/api_client.dart';
import '../api/models.dart';
import '../state/favourites.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/common.dart';

/// Player page: current value callout, value-over-time chart, facts, history list.
class PlayerScreen extends StatefulWidget {
  const PlayerScreen({super.key, required this.id});
  final String id;

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  late Future<PlayerProfile> _future = ApiClient.instance.player(widget.id);

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final favs = Favourites.instance;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Player'),
        actions: [
          ValueListenableBuilder(
            valueListenable: favs.players,
            builder: (_, set, _) => IconButton(
              tooltip: 'Follow player',
              onPressed: () => favs.toggle(favs.players, widget.id),
              icon: Icon(set.contains(widget.id) ? Icons.star_rounded : Icons.star_outline_rounded),
            ),
          ),
        ],
      ),
      body: FutureBuilder<PlayerProfile>(
        future: _future,
        builder: (context, snap) => AsyncBody<PlayerProfile>(
          snapshot: snap,
          onRetry: () => setState(() { _future = ApiClient.instance.player(widget.id); }),
          builder: (p) => ListView(children: [
            Container(
              color: c.bgPrimary,
              padding: const EdgeInsets.all(Space.gutter),
              child: Row(children: [
                Crest(url: p.photoUrl, label: p.name, size: 64),
                const SizedBox(width: Space.xl),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(p.name, style: A1Text.sectionTitle.copyWith(color: c.contentPrimary)),
                    const SizedBox(height: Space.xs),
                    Text(
                      [p.position, p.clubName].whereType<String>().join(' · '),
                      style: A1Text.meta.copyWith(color: c.contentSecondary),
                    ),
                  ]),
                ),
              ]),
            ),
            _ValueCallout(p: p),
            if (p.points.length >= 2) ...[
              const SectionBar('Market value over time'),
              Padding(
                padding: const EdgeInsets.fromLTRB(Space.gutter, Space.l, Space.gutter, Space.l),
                child: SizedBox(height: Sizes.valueChart, child: ValueChart(points: p.points)),
              ),
            ],
            const SectionBar('Player info'),
            for (final e in {
              'Age': p.age?.toString(),
              'Nationality': p.nationality,
              'Position': p.position,
              'Club': p.clubName,
              'Peak value': p.peakEur == null ? null : formatEur(p.peakEur!),
            }.entries)
              if (e.value != null && e.value!.isNotEmpty) _FactRow(label: e.key, value: e.value!),
            if (p.points.isNotEmpty) ...[
              const SectionBar('Value history'),
              for (final pt in p.points.reversed.take(12))
                _FactRow(label: DateFormat('d MMM yyyy').format(pt.date), value: formatEur(pt.valueEur)),
            ],
            const SizedBox(height: Space.xxl),
          ]),
        ),
      ),
    );
  }
}

class _ValueCallout extends StatelessWidget {
  const _ValueCallout({required this.p});
  final PlayerProfile p;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final diff = p.twelveMonthDiffEur;
    return Container(
      margin: const EdgeInsets.fromLTRB(Space.gutter, Space.s, Space.gutter, Space.l),
      padding: const EdgeInsets.all(Space.xl),
      decoration: BoxDecoration(color: c.bgSecondary, borderRadius: BorderRadius.circular(Radii.large)),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('MARKET VALUE', style: A1Text.sectionBar.copyWith(color: c.contentSecondary)),
            const SizedBox(height: Space.xs),
            Text(p.currentEur == null ? '—' : formatEur(p.currentEur!), style: A1Text.calloutValue.copyWith(color: c.contentPrimary)),
            if (p.asOf != null) Text('Updated ${DateFormat('d MMM yyyy').format(p.asOf!)}', style: A1Text.meta.copyWith(color: c.contentTertiary)),
          ]),
        ),
        if (diff != null)
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('12 MONTHS', style: A1Text.sectionBar.copyWith(color: c.contentSecondary)),
            const SizedBox(height: Space.xs),
            Text(formatTrend(diff), style: A1Text.marketValue.copyWith(color: diff == 0 ? c.contentTertiary : (diff > 0 ? c.win : c.loss))),
          ]),
      ]),
    );
  }
}

class _FactRow extends StatelessWidget {
  const _FactRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      height: Sizes.settingsRow,
      padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
      decoration: BoxDecoration(color: c.bgPrimary, border: Border(bottom: BorderSide(color: c.border))),
      child: Row(children: [
        Expanded(child: Text(label, style: A1Text.statLabel.copyWith(color: c.contentSecondary))),
        Text(value, style: A1Text.statValue.copyWith(color: c.contentPrimary, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

/// Step-free line chart of value over time, brand line with a tinted fill.
class ValueChart extends StatelessWidget {
  const ValueChart({super.key, required this.points});
  final List<ValuePoint> points;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      label: 'Market value from ${formatEur(points.first.valueEur)} to ${formatEur(points.last.valueEur)}',
      child: CustomPaint(
        painter: _ChartPainter(points, line: c.brand, grid: c.border, label: c.contentTertiary),
        size: Size.infinite,
      ),
    );
  }
}

class _ChartPainter extends CustomPainter {
  _ChartPainter(this.points, {required this.line, required this.grid, required this.label});
  final List<ValuePoint> points;
  final Color line;
  final Color grid;
  final Color label;

  @override
  void paint(Canvas canvas, Size size) {
    const bottomPad = 18.0;
    final h = size.height - bottomPad;
    final t0 = points.first.date.millisecondsSinceEpoch.toDouble();
    final t1 = points.last.date.millisecondsSinceEpoch.toDouble();
    final maxV = points.map((p) => p.valueEur).reduce((a, b) => a > b ? a : b).toDouble();
    final top = maxV <= 0 ? 1.0 : maxV * 1.1;

    final gridPaint = Paint()
      ..color = grid
      ..strokeWidth = 1;
    for (var i = 0; i <= 3; i++) {
      final y = h * i / 3;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    Offset at(ValuePoint p) => Offset(
          t1 == t0 ? 0 : (p.date.millisecondsSinceEpoch - t0) / (t1 - t0) * size.width,
          h - p.valueEur / top * h,
        );

    final path = Path()..moveTo(at(points.first).dx, at(points.first).dy);
    for (final p in points.skip(1)) {
      final o = at(p);
      path.lineTo(o.dx, o.dy);
    }
    final fill = Path.from(path)
      ..lineTo(size.width, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(fill, Paint()..color = line.withValues(alpha: 0.12));
    canvas.drawPath(
        path,
        Paint()
          ..color = line
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.5
          ..strokeJoin = StrokeJoin.round);
    canvas.drawCircle(at(points.last), 4, Paint()..color = line);

    void text(String s, Offset o, {bool right = false}) {
      final tp = TextPainter(
        text: TextSpan(text: s, style: TextStyle(color: label, fontSize: 11)),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(right ? o.dx - tp.width : o.dx, o.dy));
    }

    text('${points.first.date.year}', Offset(0, h + 4));
    text('${points.last.date.year}', Offset(size.width, h + 4), right: true);
    text(formatEur(maxV.toInt()), const Offset(0, 2));
  }

  @override
  bool shouldRepaint(_ChartPainter old) => old.points != points || old.line != line;
}
