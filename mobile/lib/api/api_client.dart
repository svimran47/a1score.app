import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models.dart';

/// Thin client over the a1score.app API (see api-contract.md).
/// Override the base URL at build time: --dart-define=A1_API=https://staging.a1score.app/api
class ApiClient {
  ApiClient({http.Client? httpClient, String? baseUrl})
      : _http = httpClient ?? http.Client(),
        baseUrl = baseUrl ?? const String.fromEnvironment('A1_API', defaultValue: 'https://a1score.app/api');

  /// Replaceable so widget tests can inject a fake HTTP client.
  static ApiClient instance = ApiClient();

  final http.Client _http;
  final String baseUrl;
  final _etags = <String, String>{};
  final _bodies = <String, Object?>{};

  Future<Object?> _get(String path, [Map<String, String?> query = const {}]) async {
    final q = {for (final e in query.entries) if (e.value != null && e.value!.isNotEmpty) e.key: e.value!};
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: q.isEmpty ? null : q);
    final key = uri.toString();
    final headers = {'Accept': 'application/json', if (_etags[key] != null) 'If-None-Match': _etags[key]!};
    final res = await _http.get(uri, headers: headers).timeout(const Duration(seconds: 15));
    if (res.statusCode == 304 && _bodies.containsKey(key)) return _bodies[key];
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, _errorMessage(res.body) ?? 'Request failed (${res.statusCode})');
    }
    final body = jsonDecode(utf8.decode(res.bodyBytes));
    final etag = res.headers['etag'];
    if (etag != null) {
      _etags[key] = etag;
      _bodies[key] = body;
    }
    return body;
  }

  String? _errorMessage(String body) {
    try {
      final j = jsonDecode(body);
      return j is Map ? j['error']?.toString() : null;
    } catch (_) {
      return null;
    }
  }

  /// `date` is YYYYMMDD; filter is all | live | finished | upcoming.
  Future<List<LeagueGroup>> matches({String? date, String filter = 'all'}) async {
    final j = await _get('/matches', {'date': date, 'filter': filter}) as Json;
    return [for (final l in (j['leagues'] ?? j['data'] ?? const []) as List) LeagueGroup.fromJson(l as Json)];
  }

  Future<MatchDetail> match(String id) async {
    final j = await _get('/matches/$id') as Json;
    return MatchDetail.fromJson((j['data'] ?? j) as Json);
  }

  Future<List<PlayerValueRow>> mostValuable({String? position, String? league, int page = 1, int limit = 25}) async {
    final j = await _get('/players/most-valuable', {
      'position': position,
      'league': league,
      'page': '$page',
      'limit': '$limit',
    }) as Json;
    return [for (final p in (j['data'] as List? ?? const [])) PlayerValueRow.fromJson(p as Json)];
  }

  Future<ValueMovers> movers({int limit = 6}) async {
    final j = await _get('/players/movers', {'limit': '$limit'}) as Json;
    return ValueMovers.fromJson((j['data'] ?? j) as Json);
  }

  Future<List<TransferItem>> transfers({int limit = 20, String type = 'moves'}) async {
    final j = await _get('/transfers', {'limit': '$limit', 'type': type}) as Json;
    return [for (final t in (j['data'] as List? ?? const [])) TransferItem.fromJson(t as Json)];
  }

  /// Clubs ranked by squad value.
  Future<List<ClubValueRow>> clubs({int limit = 24}) async {
    final j = await _get('/clubs', {'limit': '$limit'}) as Json;
    return [for (final c in (j['data'] as List? ?? const [])) ClubValueRow.fromJson(c as Json)];
  }

  Future<ClubDetail> club(String id) async {
    final j = await _get('/clubs/$id', {'include': 'details'}) as Json;
    return ClubDetail.fromJson((j['data'] ?? j) as Json);
  }

  /// EUR → [code] reference rate from /api/fx (ECB).
  Future<double> fxRate(String code) async {
    final j = await _get('/fx') as Json;
    final r = (j['rates'] as Json?)?[code];
    if (r is! num) throw ApiException(503, 'No $code rate');
    return r.toDouble();
  }

  Future<PlayerProfile> player(String idOrSlug) async {
    final j = await _get('/players/$idOrSlug') as Json;
    return PlayerProfile.fromJson((j['data'] ?? j) as Json);
  }

  Future<List<LeagueRef>> leagues() async {
    final j = await _get('/leagues') as Json;
    return [for (final l in (j['data'] as List? ?? const [])) LeagueRef.fromJson(l as Json)];
  }

  Future<LeagueCatalog> leagueCatalog() async {
    final j = await _get('/leagues', {'scope': 'all'}) as Json;
    return LeagueCatalog(
      valued: [for (final l in (j['data'] as List? ?? const [])) LeagueRef.fromJson(l as Json)],
      competitions: [for (final l in (j['competitions'] as List? ?? const [])) LeagueRef.fromJson(l as Json)],
    );
  }

  /// League page data (standings with squad values, clubs). Null on 404, i.e. before
  /// /api/leagues/[id] is deployed or for a league the site doesn't know.
  Future<LeagueDetail?> league(String id) async {
    try {
      final j = await _get('/leagues/$id') as Json;
      return LeagueDetail.fromJson((j['data'] ?? j) as Json);
    } on ApiException catch (e) {
      if (e.status == 404) return null;
      rethrow;
    }
  }

  Future<List<NewsItem>> news({String? category}) async {
    final j = await _get('/news', {'category': category}) as Json;
    return [for (final n in (j['items'] as List? ?? const [])) NewsItem.fromJson(n as Json)];
  }
}

class ApiException implements Exception {
  ApiException(this.status, this.message);
  final int status;
  final String message;
  @override
  String toString() => message;
}
