import 'dart:convert';

import 'package:a1score/api/api_client.dart';
import 'package:a1score/screens/all_games_screen.dart';
import 'package:a1score/screens/league_screen.dart';
import 'package:a1score/screens/leagues_screen.dart';
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
  if (p.endsWith('/leagues')) return {'data': [{'id': 'pl', 'name': 'Premier League', 'country': 'England'}]};
  if (p.contains('/leagues/')) {
    return {'data': {'name': 'Premier League', 'standings': [{'idx': 1, 'id': 8, 'shortName': 'Arsenal', 'played': 9, 'pts': 23}], 'clubs': []}};
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
    'all games': const AllGamesScreen(),
    'live': const AllGamesScreen(liveOnly: true),
    'match': const MatchScreen(id: '1'),
    'values': const ValuesScreen(),
    'player': const PlayerScreen(id: 'erling-haaland'),
    'leagues': const LeaguesScreen(),
    'league': const LeagueScreen(id: 'pl'),
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
}
