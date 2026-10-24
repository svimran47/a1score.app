import 'package:a1score/api/models.dart';
import 'package:a1score/util/format.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('formats euro values like the mockups', () {
    expect(formatEur(180000000), '€180m');
    expect(formatEur(62500000), '€62.5m');
    expect(formatEur(950000), '€950k');
  });

  test('parses a FotMob-shaped live match', () {
    final m = MatchSummary.fromJson({
      'id': 1,
      'home': {'id': 8, 'name': 'Arsenal', 'score': 2},
      'away': {'id': 9, 'name': 'Chelsea', 'score': 1},
      'status': {'started': true, 'finished': false, 'liveTime': {'short': "67'"}},
    });
    expect(m.isLive, isTrue);
    expect(m.minute, "67'");
    expect(m.home.score, 2);
  });

  test('parses a finished match winner', () {
    final m = MatchSummary.fromJson({
      'id': 2,
      'home': {'name': 'A', 'score': 0},
      'away': {'name': 'B', 'score': 3},
      'status': {'started': true, 'finished': true},
    });
    expect(m.status, MatchStatus.finished);
    expect(m.winner, -1);
  });

  test('reads XI values from the lineup like the website', () {
    final d = MatchDetail.fromJson({
      'general': {'matchId': 1},
      'status': {'started': true, 'finished': true},
      'teams': {'home': {'name': 'A'}, 'away': {'name': 'B'}},
      'lineup': {
        'homeTeam': {'starters': [{'name': 'Martin Ødegaard', 'marketValue': 85000000}, {'name': 'X', 'marketValue': 5000000}]},
        'awayTeam': {'totalStarterMarketValue': 900000000, 'starters': []},
      },
    });
    expect(d.homeXiValueEur, 90000000);
    expect(d.awayXiValueEur, 900000000);
    expect(d.homeXi.first.id, 'martin-odegaard');
  });
}
