import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/models.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../util/images.dart';
import 'common.dart';

/// What the badge under each player shows.
enum PitchView { overview, value, age }

/// Both XIs on one pitch, home in the bottom half and away in the top half.
/// Tap a player for their details.
class LineupPitch extends StatelessWidget {
  const LineupPitch({super.key, required this.home, required this.away, required this.view});
  final TeamLineup home;
  final TeamLineup away;
  final PitchView view;

  static const _grass = Color(0xFF2E7D4F);
  static const _grassDark = Color(0xFF2A7349);

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 0.6,
      child: LayoutBuilder(builder: (context, box) {
        final w = box.maxWidth, h = box.maxHeight;
        final spots = [
          ..._place(home, top: false),
          ..._place(away, top: true),
        ];
        return Stack(children: [
          const Positioned.fill(child: CustomPaint(painter: _PitchPainter(_grass, _grassDark))),
          if (away.formation != null) Positioned(left: 10, top: 8, child: _FormationTag(away.formation!)),
          if (home.formation != null) Positioned(left: 10, bottom: 8, child: _FormationTag(home.formation!)),
          for (final (p, x, y) in spots)
            Positioned(
              left: x * w - 36,
              top: y * h - 26,
              width: 72,
              child: _PlayerSpot(player: p, view: view),
            ),
        ]);
      }),
    );
  }

  /// Pitch coordinates (0..1) for each starter. Uses FotMob's verticalLayout when
  /// present, otherwise spreads players across the rows of the formation.
  List<(LineupPlayer, double, double)> _place(TeamLineup t, {required bool top}) {
    final out = <(LineupPlayer, double, double)>[];
    final hasLayout = t.starters.every((p) => p.x != null && p.y != null);
    if (hasLayout) {
      for (final p in t.starters) {
        // y: 0 = opponent's goal, 1 = own goal. Keep each side in its half.
        final depth = (p.y!).clamp(0.0, 1.0);
        final y = top ? 0.5 - depth * 0.44 : 0.5 + depth * 0.44;
        final x = top ? 1 - p.x! : p.x!;
        out.add((p, x.clamp(0.08, 0.92), y));
      }
      return out;
    }
    final rows = [1, ...(t.formation ?? '4-4-2').split('-').map((s) => int.tryParse(s) ?? 0).where((n) => n > 0)];
    var i = 0;
    for (var r = 0; r < rows.length; r++) {
      final depth = 1 - r / rows.length; // GK deepest
      for (var k = 0; k < rows[r] && i < t.starters.length; k++, i++) {
        final x = (k + 1) / (rows[r] + 1);
        final y = top ? 0.5 - depth * 0.44 : 0.5 + depth * 0.44;
        out.add((t.starters[i], top ? 1 - x : x, y));
      }
    }
    return out;
  }
}

class _FormationTag extends StatelessWidget {
  const _FormationTag(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(Radii.base)),
        child: Text(text, style: A1Text.badge.copyWith(color: Colors.white, fontSize: 11)),
      );
}

class _PlayerSpot extends StatelessWidget {
  const _PlayerSpot({required this.player, required this.view});
  final LineupPlayer player;
  final PitchView view;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final p = player;
    final badge = switch (view) {
      PitchView.overview => p.rating?.toStringAsFixed(1),
      PitchView.value => (p.valueEur ?? 0) > 0 ? formatEur(p.valueEur) : null,
      PitchView.age => p.age?.toString(),
    };
    final rc = p.rating == null
        ? c.statMuted
        : (p.rating! >= 7.5 ? c.win : (p.rating! >= 6.5 ? const Color(0xFFE0A100) : c.loss));
    return GestureDetector(
      onTap: () => showPlayerSheet(context, p),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Stack(clipBehavior: Clip.none, children: [
          Container(
            decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 1.5)),
            child: Crest(url: p.id.isEmpty ? null : fotmobPlayerImage(p.id), label: p.name, size: 34),
          ),
          if (badge != null)
            Positioned(
              right: -14,
              top: -4,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: view == PitchView.overview ? rc : c.appBar,
                  borderRadius: BorderRadius.circular(Radii.base),
                ),
                child: Text(badge, style: A1Text.badge.copyWith(color: Colors.white, fontSize: 10)),
              ),
            ),
          if (p.goals > 0)
            const Positioned(left: -6, bottom: -2, child: Icon(Icons.sports_soccer, size: 13, color: Colors.white)),
          if (p.red || p.yellow)
            Positioned(
              left: -4,
              top: 0,
              child: Container(width: 7, height: 10, color: p.red ? const Color(0xFFD32F2F) : const Color(0xFFFFD600)),
            ),
        ]),
        const SizedBox(height: 2),
        Text(
          '${p.shirt == null ? '' : '${p.shirt} '}${p.shortName}${p.captain ? ' (C)' : ''}',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: A1Text.meta.copyWith(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
        ),
      ]),
    );
  }
}

/// Bottom sheet with a lineup player's details and a link to their profile.
void showPlayerSheet(BuildContext context, LineupPlayer p) {
  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (sheet) {
      final c = sheet.c;
      Widget row(String k, String v) => Padding(
            padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.m),
            child: Row(children: [
              Expanded(child: Text(k, style: A1Text.statLabel.copyWith(color: c.contentSecondary))),
              Text(v, style: A1Text.statValue.copyWith(color: c.contentPrimary, fontWeight: FontWeight.w700)),
            ]),
          );
      return SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Crest(url: p.id.isEmpty ? null : fotmobPlayerImage(p.id), label: p.name, size: 64),
          const SizedBox(height: Space.m),
          Text(p.name, style: A1Text.sectionTitle.copyWith(color: c.contentPrimary)),
          const SizedBox(height: Space.m),
          if (p.shirt != null) row('Shirt', p.shirt!),
          if (p.rating != null) row('Rating', p.rating!.toStringAsFixed(1)),
          if ((p.valueEur ?? 0) > 0) row('Market value', formatEur(p.valueEur)),
          if (p.age != null) row('Age', '${p.age}'),
          if (p.goals > 0) row('Goals', '${p.goals}'),
          Padding(
            padding: const EdgeInsets.all(Space.gutter),
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: c.buttonPrimaryBg,
                minimumSize: const Size.fromHeight(44),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.large)),
              ),
              onPressed: () {
                Navigator.pop(sheet);
                context.push('/player/${playerSlug(p.name)}');
              },
              child: Text('PLAYER PROFILE', style: A1Text.chip),
            ),
          ),
        ]),
      );
    },
  );
}

class _PitchPainter extends CustomPainter {
  const _PitchPainter(this.grass, this.stripe);
  final Color grass;
  final Color stripe;

  @override
  void paint(Canvas canvas, Size s) {
    canvas.drawRect(Offset.zero & s, Paint()..color = grass);
    final band = s.height / 12;
    for (var i = 0; i < 12; i += 2) {
      canvas.drawRect(Rect.fromLTWH(0, i * band, s.width, band), Paint()..color = stripe);
    }
    final line = Paint()
      ..color = Colors.white.withValues(alpha: 0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    const m = 8.0;
    canvas.drawRect(Rect.fromLTWH(m, m, s.width - 2 * m, s.height - 2 * m), line);
    canvas.drawLine(Offset(m, s.height / 2), Offset(s.width - m, s.height / 2), line);
    canvas.drawCircle(Offset(s.width / 2, s.height / 2), s.width * 0.13, line);
    final boxW = s.width * 0.56, boxH = s.height * 0.13;
    final sixW = s.width * 0.26, sixH = s.height * 0.05;
    canvas.drawRect(Rect.fromLTWH((s.width - boxW) / 2, m, boxW, boxH), line);
    canvas.drawRect(Rect.fromLTWH((s.width - boxW) / 2, s.height - m - boxH, boxW, boxH), line);
    canvas.drawRect(Rect.fromLTWH((s.width - sixW) / 2, m, sixW, sixH), line);
    canvas.drawRect(Rect.fromLTWH((s.width - sixW) / 2, s.height - m - sixH, sixW, sixH), line);
  }

  @override
  bool shouldRepaint(_PitchPainter old) => false;
}
