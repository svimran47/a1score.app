import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../api/api_client.dart';
import '../api/models.dart';
import '../state/favourites.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/common.dart';

/// Player page: header with value, then Profile, Stats, Transfers and Injuries tabs.
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
    final favs = Favourites.instance;
    final follow = ValueListenableBuilder(
      valueListenable: favs.players,
      builder: (_, set, _) => IconButton(
        tooltip: 'Follow player',
        onPressed: () => favs.toggle(favs.players, widget.id),
        icon: Icon(set.contains(widget.id) ? Icons.star_rounded : Icons.star_outline_rounded),
      ),
    );
    return FutureBuilder<PlayerProfile>(
      future: _future,
      builder: (context, snap) {
        if (!snap.hasData) {
          return Scaffold(
            appBar: AppBar(title: const Text('Player'), actions: [follow]),
            body: AsyncBody<PlayerProfile>(
              snapshot: snap,
              onRetry: () => setState(() {
                _future = ApiClient.instance.player(widget.id);
              }),
              builder: (_) => const SizedBox(),
            ),
          );
        }
        final p = snap.data!;
        final tabs = ['Profile', 'Stats', 'Transfers', if (p.injuries.isNotEmpty) 'Injuries'];
        return DefaultTabController(
          length: tabs.length,
          child: Scaffold(
            appBar: AppBar(
              title: Text(p.name),
              actions: [follow],
              bottom: PrimaryTabBar(labels: tabs),
            ),
            body: TabBarView(children: [
              _ProfileTab(p: p),
              _StatsTab(seasons: p.seasons),
              _TransfersTab(transfers: p.transfers),
              if (p.injuries.isNotEmpty) _InjuriesTab(injuries: p.injuries),
            ]),
          ),
        );
      },
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab({required this.p});
  final PlayerProfile p;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    String? d(DateTime? x) => x == null ? null : DateFormat('d MMM yyyy').format(x);
    return ListView(children: [
      Container(
        color: c.bgPrimary,
        padding: const EdgeInsets.all(Space.gutter),
        child: Row(children: [
          Crest(url: p.photoUrl, label: p.name, size: 72),
          const SizedBox(width: Space.xl),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(p.name, style: A1Text.sectionTitle.copyWith(color: c.contentPrimary)),
              const SizedBox(height: Space.xs),
              if (p.position != null) Text(p.position!, style: A1Text.meta.copyWith(color: c.contentSecondary)),
              if (p.clubName != null) ...[
                const SizedBox(height: Space.s),
                InkWell(
                  onTap: p.clubId == null ? null : () => context.push('/club/${p.clubId}'),
                  child: Row(children: [
                    Crest(url: p.clubLogo, label: p.clubName!, size: 18, radius: Radii.tiny),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(p.clubName!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: A1Text.body.copyWith(color: c.brand, fontWeight: FontWeight.w700)),
                    ),
                  ]),
                ),
              ],
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
        'Full name': p.fullName != p.name ? p.fullName : null,
        'Age': p.age == null ? null : '${p.age}${p.dateOfBirth == null ? '' : ' (${d(p.dateOfBirth)})'}',
        'Nationality': p.nationality,
        'Position': p.position,
        'Other position': p.otherPosition,
        'Height': p.heightCm == null ? null : '${(p.heightCm! / 100).toStringAsFixed(2)} m',
        'Foot': p.foot,
        'Club': p.clubName,
        'League': p.leagueName,
        'Contract until': d(p.contractUntil),
        'Peak value': p.peakEur == null ? null : formatEur(p.peakEur!),
      }.entries)
        if (e.value != null && e.value!.isNotEmpty) _FactRow(label: e.key, value: e.value!),
      if (p.points.isNotEmpty) ...[
        const SectionBar('Value history'),
        for (final pt in p.points.reversed.take(12))
          _FactRow(label: DateFormat('d MMM yyyy').format(pt.date), value: formatEur(pt.valueEur)),
      ],
      const SizedBox(height: Space.xxl),
    ]);
  }
}

/// Season-by-season numbers: apps, goals, assists, minutes, cards.
class _StatsTab extends StatelessWidget {
  const _StatsTab({required this.seasons});
  final List<SeasonLine> seasons;

  @override
  Widget build(BuildContext context) {
    if (seasons.isEmpty) return const EmptyState(icon: Icons.bar_chart_rounded, title: 'No season stats for this player yet');
    final c = context.c;
    final head = A1Text.sectionBar.copyWith(color: c.contentSecondary);
    final val = A1Text.statValue.copyWith(color: c.contentPrimary);
    Widget n(String t, TextStyle s, [double w = 34]) => SizedBox(width: w, child: Text(t, textAlign: TextAlign.center, style: s));
    String v(int? x) => x == null ? '–' : '$x';
    final totals = (
      apps: seasons.fold<int>(0, (a, s) => a + (s.apps ?? 0)),
      goals: seasons.fold<int>(0, (a, s) => a + (s.goals ?? 0)),
      assists: seasons.fold<int>(0, (a, s) => a + (s.assists ?? 0)),
    );
    return ListView(children: [
      Padding(
        padding: const EdgeInsets.all(Space.gutter),
        child: Row(children: [
          for (final (label, value) in [('Apps', totals.apps), ('Goals', totals.goals), ('Assists', totals.assists)])
            Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: Space.s),
                padding: const EdgeInsets.symmetric(vertical: Space.l),
                decoration: BoxDecoration(color: c.bgSecondary, borderRadius: BorderRadius.circular(Radii.large)),
                child: Column(children: [
                  Text('$value', style: A1Text.calloutValue.copyWith(color: c.contentPrimary)),
                  Text(label.toUpperCase(), style: A1Text.sectionBar.copyWith(color: c.contentSecondary)),
                ]),
              ),
            ),
        ]),
      ),
      Container(
        height: Sizes.standingsHeader,
        color: c.bgSectionHeader,
        padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
        child: Row(children: [
          Expanded(child: Text('SEASON', style: head)),
          n('MP', head),
          n('G', head),
          n('A', head),
          n('MIN', head, 44),
          n('YC', head, 30),
        ]),
      ),
      for (final s in seasons)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.m),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
          child: Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(s.season, style: A1Text.statLabel.copyWith(color: c.contentPrimary, fontWeight: FontWeight.w700)),
                Text([s.competition, s.club].whereType<String>().where((x) => x.isNotEmpty).join(' · '),
                    maxLines: 1, overflow: TextOverflow.ellipsis, style: A1Text.meta.copyWith(color: c.contentTertiary)),
              ]),
            ),
            n(v(s.apps), val),
            n(v(s.goals), val.copyWith(fontWeight: FontWeight.w700)),
            n(v(s.assists), val),
            n(v(s.minutes), A1Text.meta.copyWith(color: c.contentSecondary), 44),
            n(v(s.yellow), A1Text.meta.copyWith(color: c.contentSecondary), 30),
          ]),
        ),
      const SizedBox(height: Space.xxl),
    ]);
  }
}

class _TransfersTab extends StatelessWidget {
  const _TransfersTab({required this.transfers});
  final List<TransferItem> transfers;

  @override
  Widget build(BuildContext context) {
    if (transfers.isEmpty) return const EmptyState(icon: Icons.compare_arrows_rounded, title: 'No transfers recorded');
    final c = context.c;
    return ListView(children: [
      const SectionBar('Transfer history', trailing: 'Fee'),
      for (final t in transfers)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.m + 2),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
          child: Row(children: [
            SizedBox(
              width: 74,
              child: Text(t.date == null ? '—' : DateFormat('dd.MM.yyyy').format(t.date!),
                  style: A1Text.meta.copyWith(color: c.contentSecondary)),
            ),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(t.toClub ?? '—', maxLines: 1, overflow: TextOverflow.ellipsis, style: A1Text.statLabel.copyWith(color: c.contentPrimary, fontWeight: FontWeight.w700)),
                Text('from ${t.fromClub ?? '—'}', maxLines: 1, overflow: TextOverflow.ellipsis, style: A1Text.meta.copyWith(color: c.contentTertiary)),
              ]),
            ),
            const SizedBox(width: Space.m),
            Text((t.feeEur ?? 0) > 0 ? formatEur(t.feeEur) : (t.typeLabel ?? '—'),
                style: A1Text.marketValue.copyWith(fontSize: 14, color: c.contentPrimary)),
          ]),
        ),
      const SizedBox(height: Space.xxl),
    ]);
  }
}

class _InjuriesTab extends StatelessWidget {
  const _InjuriesTab({required this.injuries});
  final List<InjuryItem> injuries;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    String d(DateTime? x) => x == null ? '…' : DateFormat('dd.MM.yyyy').format(x);
    return ListView(children: [
      const SectionBar('Injury history'),
      for (final i in injuries)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.m + 2),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
          child: Row(children: [
            Icon(Icons.healing_rounded, size: 18, color: i.active ? c.live : c.contentTertiary),
            const SizedBox(width: Space.l),
            Expanded(child: Text(i.type, style: A1Text.statLabel.copyWith(color: c.contentPrimary))),
            Text('${d(i.start)} – ${i.active ? 'now' : d(i.end)}', style: A1Text.meta.copyWith(color: c.contentSecondary)),
          ]),
        ),
    ]);
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
