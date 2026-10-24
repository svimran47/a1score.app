import 'package:intl/intl.dart';

/// Display currency for every value in the app (set from the Profile page).
abstract final class Money {
  static String code = 'EUR';
  static double rate = 1;
  static String get symbol => switch (code) { 'GBP' => '£', 'USD' => r'$', _ => '€' };

  static void use(String newCode, double newRate) {
    code = newCode;
    rate = newRate;
  }
}

/// €180m, €62.5m, €950k, €1.32bn — matches the web app's money format.
/// Values arrive in euros and are shown in [Money.code].
String formatEur(int? eur) {
  if (eur == null || eur <= 0) return '—';
  final v = eur * Money.rate;
  final s = Money.symbol;
  if (v >= 1000000000) return '$s${(v / 1e9).toStringAsFixed(2)}bn';
  if (v >= 1000000) {
    final m = v / 1e6;
    return '$s${m >= 100 || (m - m.round()).abs() < 0.05 ? m.toStringAsFixed(0) : m.toStringAsFixed(1)}m';
  }
  if (v >= 1000) return '$s${(v / 1e3).toStringAsFixed(0)}k';
  return '$s${v.round()}';
}

String formatTrend(int diffEur) {
  if (diffEur == 0) return '—';
  return '${diffEur > 0 ? '▲' : '▼'} ${formatEur(diffEur.abs())}';
}

String yyyymmdd(DateTime d) => DateFormat('yyyyMMdd').format(d);
String dayMonth(DateTime d) => DateFormat('dd.MM.').format(d.toLocal());
String hourMinute(DateTime d) => DateFormat('HH:mm').format(d.toLocal());
String fullDateTime(DateTime d) => DateFormat('dd.MM.yyyy HH:mm').format(d.toLocal());

String relativeTime(DateTime? d) {
  if (d == null) return '';
  final diff = DateTime.now().difference(d);
  if (diff.inMinutes < 60) return '${diff.inMinutes.clamp(1, 59)} min ago';
  if (diff.inHours < 24) return '${diff.inHours} h ago';
  return dayMonth(d);
}

String initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  return (parts.length == 1 ? parts.first.substring(0, 1) : '${parts.first[0]}${parts.last[0]}').toUpperCase();
}
