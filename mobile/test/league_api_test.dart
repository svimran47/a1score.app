import 'dart:convert';

import 'package:a1score/api/api_client.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

// /api/leagues/[id] returns getLeagueById() as `data`. Field names follow that data layer
// (FotMob standings rows, leaders); values are from a1score.app's Premier League page on 2026-10-27.
final _premierLeague = {
  'success': true,
  'data': {
    'id': 'cmuihndux0003b23fizizm4a0',
    'name': 'Premier League',
    'country': 'England',
    'transfermarktId': 'GB1',
    'totalMarketValue': 0,
    'clubCount': 20,
    'clubs': [],
    'standings': [
      {'idx': 1, 'name': 'Man City', 'played': 8, 'pts': 21},
      {'idx': 2, 'name': 'Arsenal FC', 'played': 8, 'pts': 21},
    ],
    'legend': [],
    'topScorers': [{'name': 'Erling Haaland', 'rank': 1, 'teamName': 'Manchester City', 'value': 9}],
    'topAssists': [],
  },
};

ApiClient _client(int status, String body, {String type = 'application/json'}) => ApiClient(
      baseUrl: 'https://a1score.app/api',
      httpClient: MockClient((_) async => http.Response(body, status, headers: {'content-type': type})),
    );

void main() {
  test('parses the league route response into table and scorers', () async {
    final d = await _client(200, jsonEncode(_premierLeague)).league('47');
    expect(d, isNotNull);
    expect(d!.name, 'Premier League');
    expect(d.standings.map((r) => r.team.name), ['Man City', 'Arsenal FC']);
    expect(d.standings.first.points, 21);
    expect(d.topScorers.single.name, 'Erling Haaland');
    expect(d.topScorers.single.value, 9);
  });

  test('a league the site does not know is null', () async {
    final c = _client(404, jsonEncode({'success': false, 'error': 'League not found'}));
    expect(await c.league('999999'), isNull);
  });

  test('a site without the league route is an error, not an empty table', () async {
    final c = _client(404, '<!DOCTYPE html><title>404: This page could not be found.</title>', type: 'text/html');
    await expectLater(
      c.league('47'),
      throwsA(isA<ApiException>().having((e) => e.status, 'status', 404).having((e) => e.fromApi, 'fromApi', false)),
    );
  });
}
