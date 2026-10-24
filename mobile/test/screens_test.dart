import 'dart:convert';

import 'package:a1score/api/api_client.dart';
import 'package:a1score/screens/all_games_screen.dart';
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
        return b == null ? http.Response('{"error":"not found"}', 404) : http.Response(jsonEncode(b), 200);
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
}
