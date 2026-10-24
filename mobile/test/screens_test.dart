import 'dart:convert';

import 'package:a1score/api/api_client.dart';
import 'package:a1score/api/models.dart';
import 'package:a1score/widgets/momentum.dart';
import 'package:a1score/screens/all_games_screen.dart';
import 'package:a1score/screens/club_screen.dart';
import 'package:a1score/screens/home_screen.dart';
import 'package:a1score/screens/league_screen.dart';
import 'package:a1score/screens/leagues_screen.dart';
import 'package:a1score/screens/market_screen.dart';
import 'package:a1score/screens/match_screen.dart';
import 'package:a1score/screens/news_screen.dart';
import 'package:a1score/screens/player_screen.dart';
import 'package:a1score/screens/values_screen.dart';
import 'package:a1score/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

// Debug-mode smoke tests: each screen loads data and renders without framework
// assertions (e.g. setState callbacks returning a Future), which release
// builds don't check.
final _team = {'id': 8, 'name': 'Arsenal', 'score': 2};
final _team2 = {'id': 9, 'name': 'Chelsea', 'score': 1};
final _finished = {'started': true, 'finished': true};

Object? _body(Uri u) {
  final p = u.path;
  if (p.endsWith('/matches')) {
    return {
      'leagues': [
        {'id': 47, 'name': 'Premier League', 'ccode': 'ENG', 'matches': [
          {'id': 1, 'home': _team, 'away': _team2, 'status': _finished},
        ]},
      ],
    };
  }
  if (RegExp(r'/matches/\d+$').hasMatch(p)) {
    return {
      'data': {
        'general': {'matchId': 1, 'leagueName': 'Premier League'},
        'status': _finished,
        'teams': {'home': _team, 'away': _team2},
        'shotmap': {'shots': [
          {'teamId': 8, 'min': 12, 'expectedGoals': 0.4, 'eventType': 'Goal', 'isOnTarget': true},
          {'teamId': 9, 'min': 30, 'expectedGoals': 0.1, 'eventType': 'Miss'},
        ]},
        'events': [{'type': 'Goal', 'time': 12, 'isHome': true}],
        'lineup': {
          'homeTeam': {'starters': [{'name': 'Bukayo Saka', 'marketValue': 150000000}]},
          'awayTeam': {'starters': [{'name': 'Cole Palmer', 'marketValue': 130000000}]},
        },
      },
    };
  }
  if (p.endsWith('/players/movers')) {
    return {'data': {
      'risers': [{'slug': 'lamine-yamal', 'fullName': 'Lamine Yamal', 'latestValue': 200000000, 'diff': 20000000}],
      'fallers': [{'slug': 'vinicius-junior', 'fullName': 'Vinicius Junior', 'latestValue': 150000000, 'diff': -20000000}],
    }};
  }
  if (p.endsWith('/transfers')) {
    return {'data': [{'id': 't1', 'fromClubName': 'Bayer 04 Leverkusen', 'toClubName': 'Liverpool FC', 'date': '2025-07-01', 'feeEur': 125000000,
      'player': {'commonName': 'Florian Wirtz', 'slug': 'florian-wirtz'}}]};
  }
  if (p.contains('/clubs/')) {
    return {'data': {
      'id': 'c1', 'name': 'Real Madrid', 'country': 'Spain', 'league': {'id': 'es1', 'name': 'LaLiga'},
      'totalSquadValue': 1340000000, 'squadSize': 24, 'averageAge': '26.1',
      'firstTeamPlayers': [
        {'slug': 'kylian-mbappe', 'fullName': 'Kylian Mbappé', 'latestMarketValue': 180000000, 'positionGroup': 'ATT', 'position': 'Centre-Forward', 'age': 27},
        {'slug': 'thibaut-courtois', 'fullName': 'Thibaut Courtois', 'latestMarketValue': 20000000, 'positionGroup': 'GK', 'position': 'Goalkeeper', 'age': 34},
      ],
      'team': {'venue': {'name': 'Santiago Bernabéu', 'city': 'Madrid', 'capacity': 83186}, 'manager': {'name': 'Xabi Alonso'},
        'recentForm': [{'result': 'W', 'score': '2-0', 'opponent': 'Sevilla'}], 'leagueTable': {'rank': 1, 'pts': 24, 'played': 9}},
      'honours': [{'competitionName': 'Champions League', 'titleCount': 15, 'latestSeason': '2023/24'}],
      'snapshots': [{'date': '2025-06-01', 'totalMarketValue': 1300000000}, {'date': '2026-06-01', 'totalMarketValue': 1340000000}],
      'transfers': {'recordArrivals': [{'fromClubName': 'Liverpool FC', 'toClubName': 'Real Madrid', 'feeEur': 10000000, 'player': {'commonName': 'Trent Alexander-Arnold'}}], 'recordDepartures': []},
    }};
  }
  if (p.endsWith('/clubs')) {
    return {'data': [{'id': 'c1', 'name': 'Real Madrid', 'totalSquadValue': 1340000000, 'leagueName': 'LaLiga', 'playerCount': 24}]};
  }
  if (p.endsWith('/most-valuable')) {
    return {'data': [{'slug': 'erling-haaland', 'name': 'Erling Haaland', 'valueEur': 180000000}]};
  }
  if (p.contains('/players/')) {
    return {
      'data': {
        'identity': {'displayName': 'Erling Haaland'},
        'seasonStats': [{'season': '2025/2026', 'competition': 'Premier League', 'clubName': 'Man City', 'appearances': 31, 'goals': 27, 'assists': 5}],
        'transfers': [{'date': '2022-07-01', 'fromClubName': 'Dortmund', 'toClubName': 'Man City', 'feeEur': 60000000}],
        'injuries': [{'type': 'Ankle injury', 'startDate': '2025-03-01', 'endDate': '2025-04-01', 'status': 'recovered'}],
        'valuation': {'points': [
          {'date': '2024-06-01', 'valueEur': 170000000},
          {'date': '2025-06-01', 'valueEur': 180000000},
        ]},
      },
    };
  }
  if (p.endsWith('/leagues')) {
    return {
      'data': [{'id': 'pl', 'name': 'Premier League', 'country': 'England', 'totalMarketValue': 5100000000, 'clubCount': 20}],
      'competitions': [{'id': '48', 'name': 'Championship', 'ccode': 'ENG'}, {'id': '42', 'name': 'Champions League', 'ccode': 'INT'}],
    };
  }
  if (p.contains('/leagues/')) {
    return {'data': {
      'name': 'Premier League',
      'standings': [{'idx': 1, 'id': 8, 'shortName': 'Arsenal', 'played': 9, 'pts': 23, 'wins': 7, 'draws': 2, 'losses': 0, 'goalConDiff': 15,
        'form': [{'result': 'W'}, {'result': 'D'}, {'result': 'W'}]}],
      'legend': [{'title': 'Champions League', 'color': '#2AD572'}],
      'topScorers': [{'name': 'Erling Haaland', 'teamName': 'Man City', 'value': 11}],
      'clubs': [],
    }};
  }
  if (p.endsWith('/news')) return {'items': [{'title': 'Headline', 'url': 'https://a1score.app'}]};
  return null;
}

void main() {
  setUp(() {
    ApiClient.instance = ApiClient(
      baseUrl: 'https://test/api',
      httpClient: MockClient((req) async {
        final b = _body(req.url);
        return b == null ? http.Response('{"error":"not found"}', 404) : http.Response.bytes(utf8.encode(jsonEncode(b)), 200);
      }),
    );
  });

  final screens = <String, Widget>{
    'home': const HomeScreen(),
    'all games': const AllGamesScreen(),
    'live': const AllGamesScreen(liveOnly: true),
    'match': const MatchScreen(id: '1'),
    'values': const ValuesScreen(),
    'player': const PlayerScreen(id: 'erling-haaland'),
    'leagues': const LeaguesScreen(),
    'league': const LeagueScreen(id: 'pl'),
    'market': const MarketScreen(),
    'club': const ClubScreen(id: 'c1'),
    'market clubs': const MarketScreen(initialTab: 1),
    'market movers': const MarketScreen(initialTab: 2),
    'market transfers': const MarketScreen(initialTab: 3),
    'market leagues': const MarketScreen(initialTab: 4),
    'news': const NewsScreen(),
  };

  for (final e in screens.entries) {
    testWidgets('${e.key} screen loads without errors', (tester) async {
      await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: e.value));
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.takeException(), isNull);
      expect(find.byType(CircularProgressIndicator), findsNothing);
      await tester.pumpWidget(const SizedBox());
    });
  }

  testWidgets('all games swipes to the next day and picks a day from the dropdown', (tester) async {
    await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: const HomeScreen()));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.textContaining('Today '), findsOneWidget);
    expect(find.text('Arsenal'), findsOneWidget);

    await tester.fling(find.byType(PageView), const Offset(-400, 0), 1500);
    await tester.pumpAndSettle();
    expect(find.textContaining('Tomorrow '), findsOneWidget);

    await tester.tap(find.byTooltip('Calendar'));
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('Yesterday ').last);
    await tester.pumpAndSettle();
    expect(find.textContaining('Yesterday '), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('league table switches between short, full and form', (tester) async {
    await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: const LeagueScreen(id: 'pl')));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('VALUE'), findsNothing);
    await tester.tap(find.text('FULL'));
    await tester.pump();
    expect(find.text('GD'), findsOneWidget);
    expect(find.text('+15'), findsOneWidget);
    await tester.tap(find.text('FORM'));
    await tester.pump();
    expect(find.text('W'), findsNWidgets(2));
    expect(find.text('Champions League'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('leagues tab lists competitions by country', (tester) async {
    await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: const LeaguesScreen()));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Championship'), findsOneWidget);
    expect(find.text('INTERNATIONAL'), findsOneWidget);
    expect(find.text('ENGLAND'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('momentum favours the side creating chances', () {
    final v = computeMomentum([
      const MatchShot(minute: 10, isHome: true, xg: 0.5, onTarget: true),
      const MatchShot(minute: 60, isHome: false, xg: 0.3),
    ], 90);
    expect(v.length, 90);
    expect(v[9], greaterThan(0));
    expect(v[59], lessThan(0));
    expect(v.every((x) => x >= -1 && x <= 1), isTrue);
  });

  testWidgets('club page shows squad by position and transfers', (tester) async {
    tester.view.physicalSize = const Size(1080, 4000);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: const ClubScreen(id: 'c1')));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Xabi Alonso'), findsOneWidget);
    await tester.tap(find.text('SQUAD'));
    await tester.pumpAndSettle();
    expect(find.text('FORWARDS'), findsOneWidget);
    expect(find.text('Kylian Mbappé'), findsOneWidget);
    await tester.tap(find.text('TRANSFERS'));
    await tester.pumpAndSettle();
    expect(find.text('Trent Alexander-Arnold'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('player page has stats, transfers and injuries tabs', (tester) async {
    await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: const PlayerScreen(id: 'erling-haaland')));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.text('STATS'));
    await tester.pumpAndSettle();
    expect(find.text('27'), findsWidgets);
    await tester.tap(find.text('INJURIES'));
    await tester.pumpAndSettle();
    expect(find.text('Ankle injury'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
