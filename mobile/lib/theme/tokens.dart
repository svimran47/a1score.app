import 'package:flutter/material.dart';

/// Design tokens generated from design-tokens.json ("Royal" palette).
/// Sizes are logical px and match layout-spec.md.
@immutable
class A1Colors extends ThemeExtension<A1Colors> {
  const A1Colors({
    required this.brand,
    required this.brandPressed,
    required this.live,
    required this.liveBg,
    required this.appBar,
    required this.appBarContent,
    required this.bgPrimary,
    required this.bgSecondary,
    required this.bgSectionHeader,
    required this.bgFavourite,
    required this.bgHighlight,
    required this.bgCard,
    required this.contentPrimary,
    required this.contentSecondary,
    required this.contentTertiary,
    required this.contentInverse,
    required this.border,
    required this.borderStrong,
    required this.buttonPrimaryBg,
    required this.statHome,
    required this.statAway,
    required this.statMuted,
    required this.win,
    required this.draw,
    required this.loss,
    required this.favouriteStar,
  });

  final Color brand;
  final Color brandPressed;
  final Color live;
  final Color liveBg;
  final Color appBar;
  final Color appBarContent;
  final Color bgPrimary;
  final Color bgSecondary;
  final Color bgSectionHeader;
  final Color bgFavourite;
  final Color bgHighlight;
  final Color bgCard;
  final Color contentPrimary;
  final Color contentSecondary;
  final Color contentTertiary;
  final Color contentInverse;
  final Color border;
  final Color borderStrong;
  final Color buttonPrimaryBg;
  final Color statHome;
  final Color statAway;
  final Color statMuted;
  final Color win;
  final Color draw;
  final Color loss;
  final Color favouriteStar;

  static const light = A1Colors(
    brand: Color(0xFF7C3AED),
    brandPressed: Color(0xFF6D28D9),
    live: Color(0xFFCE1240),
    liveBg: Color(0xFFFDE8EE),
    appBar: Color(0xFF1E1240),
    appBarContent: Color(0xFFFFFFFF),
    bgPrimary: Color(0xFFFFFFFF),
    bgSecondary: Color(0xFFF0F2F5),
    bgSectionHeader: Color(0xFFF0F2F5),
    bgFavourite: Color(0xFFF3EEFF),
    bgHighlight: Color(0xFFF3EEFF),
    bgCard: Color(0xFFFFFFFF),
    contentPrimary: Color(0xFF0E1A2B),
    contentSecondary: Color(0xFF4B5565),
    contentTertiary: Color(0xFF6B7280),
    contentInverse: Color(0xFFFFFFFF),
    border: Color(0xFFE6E8EC),
    borderStrong: Color(0xFFC9CED6),
    buttonPrimaryBg: Color(0xFF1E1240),
    statHome: Color(0xFF0E1A2B),
    statAway: Color(0xFF7C3AED),
    statMuted: Color(0xFF9AA1AC),
    win: Color(0xFF067647),
    draw: Color(0xFFB54708),
    loss: Color(0xFFB42318),
    favouriteStar: Color(0xFF7C3AED),
  );

  static const dark = A1Colors(
    brand: Color(0xFFA78BFA),
    brandPressed: Color(0xFF8B5CF6),
    live: Color(0xFFFB7185),
    liveBg: Color(0xFF3B0A1A),
    appBar: Color(0xFF1E1240),
    appBarContent: Color(0xFFF4F1FF),
    bgPrimary: Color(0xFF0F0A1F),
    bgSecondary: Color(0xFF1A1330),
    bgSectionHeader: Color(0xFF241A40),
    bgFavourite: Color(0xFF2A1F4D),
    bgHighlight: Color(0xFF2A1F4D),
    bgCard: Color(0xFF1A1330),
    contentPrimary: Color(0xFFF4F1FF),
    contentSecondary: Color(0xFFC4BDD9),
    contentTertiary: Color(0xFF9A92B3),
    contentInverse: Color(0xFF0F0A1F),
    border: Color(0xFF2A2145),
    borderStrong: Color(0xFF3D3360),
    buttonPrimaryBg: Color(0xFF7C3AED),
    statHome: Color(0xFFF4F1FF),
    statAway: Color(0xFFA78BFA),
    statMuted: Color(0xFF4A4166),
    win: Color(0xFF32D583),
    draw: Color(0xFFFDB022),
    loss: Color(0xFFF97066),
    favouriteStar: Color(0xFFFDE047),
  );

  @override
  A1Colors copyWith() => this;

  @override
  A1Colors lerp(ThemeExtension<A1Colors>? other, double t) =>
      t < 0.5 || other is! A1Colors ? this : other;
}

/// Spacing scale (4 dp base).
abstract final class Space {
  static const double xs = 2;
  static const double s = 4;
  static const double m = 8;
  static const double l = 12;
  static const double xl = 16;
  static const double xxl = 24;
  static const double xxxl = 32;
  static const double gutter = 16;
}

abstract final class Radii {
  static const double tiny = 2;
  static const double small = 3;
  static const double base = 4;
  static const double medium = 6;
  static const double large = 8;
  static const double xl = 16;
}

/// Component box sizes measured in layout-spec.md.
abstract final class Sizes {
  static const double appBar = 56;
  static const double bottomNav = 56;
  static const double dateRow = 48;
  static const double leagueHeader = 50;
  static const double matchRow = 60;
  static const double linkRow = 46;
  static const double tabBar = 42;
  static const double tabIndicator = 4;
  static const double chip = 30;
  static const double sectionBar = 26;
  static const double breadcrumb = 38;
  static const double detailHeader = 153;
  static const double detailHeaderCollapsed = 56;
  static const double crestTile = 48;
  static const double statRow = 41;
  static const double statBar = 6;
  static const double statCallout = 68;
  static const double standingsRow = 38;
  static const double standingsHeader = 23;
  static const double positionBadge = 19;
  static const double formBadge = 20;
  static const double h2hRow = 58;
  static const double leaguesRow = 46;
  static const double settingsRow = 46;
  static const double newsItem = 116;
  static const double valueRow = 56;
  static const double playerPhoto = 40;
  static const double teamCrest = 18;
  static const double leagueLogo = 32;
  static const double valueChart = 160;
}

extension A1ThemeX on BuildContext {
  A1Colors get c => Theme.of(this).extension<A1Colors>()!;
}
