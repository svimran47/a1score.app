import 'package:flutter/material.dart';

import 'tokens.dart';

/// Type roles from layout-spec.md §2. Figtree for UI, Oxanium for big numbers.
/// Both are bundled in assets/fonts (SIL OFL), so text renders offline.
abstract final class A1Text {
  static TextStyle _ui(double size, double line, FontWeight w, {double tracking = 0}) =>
      TextStyle(fontFamily: 'Figtree', fontSize: size, height: line / size, fontWeight: w, letterSpacing: tracking);

  static TextStyle _num(double size, double line, FontWeight w) => TextStyle(
        fontFamily: 'Oxanium',
        fontSize: size,
        height: line / size,
        fontWeight: w,
        fontFeatures: const [FontFeature.tabularFigures()],
      );

  static const _tab = [FontFeature.tabularFigures()];

  static TextStyle get appBarTitle => _ui(18, 24, FontWeight.w700);
  static TextStyle get dateRow => _ui(17, 24, FontWeight.w700);
  static TextStyle get leagueName => _ui(16, 20, FontWeight.w700);
  static TextStyle get countryLabel => _ui(12, 16, FontWeight.w700, tracking: 0.6);
  static TextStyle get teamName => _ui(14.5, 20, FontWeight.w400);
  static TextStyle get liveMinute => _ui(13, 16, FontWeight.w700);
  static TextStyle get rowScore => _ui(15, 20, FontWeight.w700).copyWith(fontFeatures: _tab);
  static TextStyle get kickoff => _ui(12, 16, FontWeight.w400).copyWith(fontFeatures: _tab);
  static TextStyle get odds => _ui(10, 13, FontWeight.w400).copyWith(fontFeatures: _tab);
  static TextStyle get badge => _ui(9, 12, FontWeight.w700, tracking: 0.4);
  static TextStyle get primaryTab => _ui(13, 16, FontWeight.w700, tracking: 0.6);
  static TextStyle get chip => _ui(12, 16, FontWeight.w700, tracking: 0.6);
  static TextStyle get sectionBar => _ui(12, 16, FontWeight.w700, tracking: 1.0);
  static TextStyle get breadcrumb => _ui(12, 16, FontWeight.w400, tracking: 0.6);
  static TextStyle get detailScore => _num(46, 48, FontWeight.w700);
  static TextStyle get detailScoreCollapsed => _num(22, 24, FontWeight.w700);
  static TextStyle get detailStatus => _ui(12, 16, FontWeight.w700);
  static TextStyle get detailTeam => _ui(16, 20, FontWeight.w400);
  static TextStyle get sectionTitle => _ui(18, 24, FontWeight.w700);
  static TextStyle get statLabel => _ui(14, 18, FontWeight.w400);
  static TextStyle get statValue => _ui(14, 18, FontWeight.w400).copyWith(fontFeatures: _tab);
  static TextStyle get calloutValue => _num(28, 32, FontWeight.w600);
  static TextStyle get newsHero => _ui(24, 30, FontWeight.w700);
  static TextStyle get newsItem => _ui(16, 22, FontWeight.w700);
  static TextStyle get meta => _ui(12, 16, FontWeight.w400);
  static TextStyle get settingsLabel => _ui(15, 20, FontWeight.w400);
  static TextStyle get navLabel => _ui(11, 14, FontWeight.w400);
  static TextStyle get valueName => _ui(15, 20, FontWeight.w700);
  static TextStyle get marketValue => _ui(15, 20, FontWeight.w700).copyWith(fontFeatures: _tab);
  static TextStyle get marketTrend => _ui(11, 14, FontWeight.w700);
  static TextStyle get body => _ui(14, 20, FontWeight.w400);
}

ThemeData buildTheme(Brightness brightness) {
  final c = brightness == Brightness.dark ? A1Colors.dark : A1Colors.light;
  final base = ThemeData(
    useMaterial3: true,
    brightness: brightness,
    scaffoldBackgroundColor: c.bgPrimary,
    colorScheme: ColorScheme.fromSeed(
      seedColor: c.brand,
      brightness: brightness,
      primary: c.brand,
      surface: c.bgPrimary,
      error: c.live,
    ),
    dividerColor: c.border,
    splashFactory: InkRipple.splashFactory,
    extensions: [c],
  );
  return base.copyWith(
    textTheme: base.textTheme.apply(
      fontFamily: 'Figtree',
      bodyColor: c.contentPrimary,
      displayColor: c.contentPrimary,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: c.appBar,
      foregroundColor: c.appBarContent,
      elevation: 0,
      scrolledUnderElevation: 0,
      toolbarHeight: Sizes.appBar,
      titleSpacing: Space.gutter,
      titleTextStyle: A1Text.appBarTitle.copyWith(color: c.appBarContent),
    ),
    dividerTheme: DividerThemeData(color: c.border, thickness: 1, space: 1),
  );
}
