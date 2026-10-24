/// App-side models from api-contract.md. Parsers are tolerant: they accept the
/// current FotMob-shaped payloads from a1score.app and the v1 contract shapes.
library;

typedef Json = Map<String, dynamic>;

T? _pick<T>(Json? j, List<String> keys) {
  if (j == null) return null;
  for (final k in keys) {
    final v = j[k];
    if (v is T) return v;
  }
  return null;
}

String _str(Json? j, List<String> keys, [String fallback = '']) =>
    (_pick<Object>(j, keys))?.toString() ?? fallback;

int? _int(Object? v) => v is num ? v.toInt() : int.tryParse('${v ?? ''}');

double? _double(Object? v) => v is num ? v.toDouble() : double.tryParse('${v ?? ''}');

/// Same rule as the website's profile links: lowercase, accents dropped, hyphens.
String playerSlug(String name) {
  const from = 'àáâãäåçèéêëìíîïñòóôõöøùúûüýÿćčđłńšśžźżğışřůő';
  const to = 'aaaaaaceeeeiiiinoooooouuuuyyccdlnsszzzgisruo';
  final b = StringBuffer();
  for (final ch in name.toLowerCase().split('')) {
    final i = from.indexOf(ch);
    b.write(i >= 0 ? to[i] : ch);
  }
  return b.toString().replaceAll(RegExp(r'[^a-z0-9]+'), '-').replaceAll(RegExp(r'^-+|-+$'), '');
}

enum MatchStatus { scheduled, live, halftime, finished, postponed, cancelled }

class TeamRef {
  const TeamRef({required this.id, required this.name, this.crestUrl, this.score});
  final String id;
  final String name;
  final String? crestUrl;
  final int? score;

  factory TeamRef.fromJson(Json? j) => TeamRef(
        id: _str(j, ['id']),
        name: _str(j, ['name', 'longName'], '—'),
        crestUrl: _pick<String>(j, ['crestUrl', 'imageUrl', 'logoUrl']),
        score: _int(j?['score']),
      );
}

class LeagueRef {
  const LeagueRef({required this.id, required this.name, this.country = '', this.logoUrl, this.valueEur, this.clubCount});
  final String id;
  final String name;
  final String country;
  final String? logoUrl;

  /// Total squad value, for leagues the site values.
  final int? valueEur;
  final int? clubCount;

  factory LeagueRef.fromJson(Json? j) => LeagueRef(
        id: _str(j, ['id', 'primaryId']),
        name: _str(j, ['name', 'leagueName'], '—'),
        country: _str(j, ['country', 'ccode', 'countryCode']),
        logoUrl: _pick<String>(j, ['logoUrl', 'imageUrl']),
        valueEur: _int(j?['totalMarketValue']),
        clubCount: _int(j?['clubCount']),
      );
}

/// /api/leagues?scope=all: valued leagues plus every competition with fixtures this fortnight.
class LeagueCatalog {
  const LeagueCatalog({required this.valued, required this.competitions});
  final List<LeagueRef> valued;
  final List<LeagueRef> competitions;
}

class OddsValue {
  const OddsValue(this.current, this.opening);
  final double current;
  final double? opening;
}

class Odds1x2 {
  const Odds1x2(this.home, this.draw, this.away);
  final OddsValue home;
  final OddsValue draw;
  final OddsValue away;

  static Odds1x2? fromJson(Json? j) {
    if (j == null) return null;
    OddsValue? v(String k) {
      final o = j[k];
      if (o is Json) {
        final cur = _double(o['current'] ?? o['value']);
        return cur == null ? null : OddsValue(cur, _double(o['opening']));
      }
      final cur = _double(o);
      return cur == null ? null : OddsValue(cur, null);
    }

    final h = v('home'), d = v('draw'), a = v('away');
    return h == null || d == null || a == null ? null : Odds1x2(h, d, a);
  }
}

class MatchSummary {
  const MatchSummary({
    required this.id,
    required this.kickoff,
    required this.status,
    required this.home,
    required this.away,
    this.minute,
    this.round,
    this.odds,
  });

  final String id;
  final DateTime? kickoff;
  final MatchStatus status;
  final String? minute;
  final String? round;
  final TeamRef home;
  final TeamRef away;
  final Odds1x2? odds;

  bool get isLive => status == MatchStatus.live || status == MatchStatus.halftime;
  bool get hasStarted => isLive || status == MatchStatus.finished;

  /// 1 = home won, -1 = away won, 0 = draw/unknown. Only meaningful when finished.
  int get winner {
    if (status != MatchStatus.finished) return 0;
    final h = home.score ?? 0, a = away.score ?? 0;
    return h > a ? 1 : (a > h ? -1 : 0);
  }

  factory MatchSummary.fromJson(Json j) {
    final st = j['status'];
    MatchStatus status;
    String? minute;
    if (st is String) {
      status = MatchStatus.values.firstWhere((s) => s.name == st, orElse: () => MatchStatus.scheduled);
      minute = j['minute'] as String?;
    } else {
      final s = st is Json ? st : <String, dynamic>{};
      final reason = _str(s['reason'] as Json?, ['short']);
      final live = _str(s['liveTime'] as Json?, ['short']);
      if (s['cancelled'] == true) {
        status = reason.toLowerCase().startsWith('pp') ? MatchStatus.postponed : MatchStatus.cancelled;
      } else if (j['isFinished'] == true || s['finished'] == true) {
        status = MatchStatus.finished;
      } else if (j['isLive'] == true || (s['started'] == true)) {
        status = reason == 'HT' || live == 'HT' ? MatchStatus.halftime : MatchStatus.live;
        minute = live.isEmpty ? null : live;
      } else {
        status = MatchStatus.scheduled;
      }
    }
    final ts = _int(j['timeTS']);
    final iso = _pick<String>(j, ['kickoff']) ?? _pick<String>(st is Json ? st : null, ['utcTime']);
    return MatchSummary(
      id: _str(j, ['id']),
      kickoff: ts != null ? DateTime.fromMillisecondsSinceEpoch(ts) : DateTime.tryParse(iso ?? ''),
      status: status,
      minute: minute,
      round: _pick<String>(j, ['round']),
      home: TeamRef.fromJson(j['home'] as Json?),
      away: TeamRef.fromJson(j['away'] as Json?),
      odds: Odds1x2.fromJson(j['odds'] as Json?),
    );
  }
}

class LeagueGroup {
  const LeagueGroup(this.league, this.matches);
  final LeagueRef league;
  final List<MatchSummary> matches;

  factory LeagueGroup.fromJson(Json j) => LeagueGroup(
        j['league'] is Json ? LeagueRef.fromJson(j['league'] as Json) : LeagueRef.fromJson(j),
        [for (final m in (j['matches'] as List? ?? const [])) MatchSummary.fromJson(m as Json)],
      );
}

class StatLine {
  const StatLine(this.label, this.home, this.away);
  final String label;
  final String home;
  final String away;

  double get homeNum => _double(home.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;
  double get awayNum => _double(away.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;
}

class StatGroup {
  const StatGroup(this.title, this.lines);
  final String title;
  final List<StatLine> lines;
}

class H2hMatch {
  const H2hMatch({required this.date, required this.home, required this.away});
  final DateTime? date;
  final TeamRef home;
  final TeamRef away;
}

class StandingRow {
  const StandingRow({
    required this.pos,
    required this.team,
    required this.played,
    required this.goals,
    required this.points,
    this.zoneColor,
    this.squadValueEur,
    this.wins,
    this.draws,
    this.losses,
    this.goalDiff,
    this.form = const [],
    this.clubId,
  });
  final int pos;
  final TeamRef team;
  final int played;
  final String goals;
  final int points;
  final String? zoneColor;
  final int? squadValueEur;
  final int? wins;
  final int? draws;
  final int? losses;
  final int? goalDiff;

  /// Last five results, oldest first: 'W', 'D' or 'L'.
  final List<String> form;

  /// a1score club id when the site matched this team to a club it values.
  final String? clubId;

  factory StandingRow.fromJson(Json j) => StandingRow(
        pos: _int(j['idx'] ?? j['pos']) ?? 0,
        team: TeamRef(
          id: _str(j, ['id']),
          name: _str(j, ['shortName', 'name']),
          crestUrl: _pick<String>(j, ['imageUrl', 'crestUrl']),
        ),
        played: _int(j['played']) ?? 0,
        goals: _str(j, ['scoresStr'], '${j['goalsFor'] ?? 0}:${j['goalsAgainst'] ?? 0}'),
        points: _int(j['pts'] ?? j['points']) ?? 0,
        zoneColor: _pick<String>(j, ['qualColor']),
        squadValueEur: _int(j['totalSquadValue']),
        wins: _int(j['wins']),
        draws: _int(j['draws']),
        losses: _int(j['losses']),
        goalDiff: _int(j['goalConDiff']),
        form: [
          for (final f in (j['form'] as List? ?? const []))
            if (f is Json && f['result'] is String) (f['result'] as String).toUpperCase(),
        ],
        clubId: _pick<String>(j, ['clubId']),
      );
}

class MatchDetail {
  const MatchDetail({
    required this.summary,
    required this.leagueName,
    required this.country,
    required this.stats,
    required this.h2h,
    required this.standings,
    this.homeXiValueEur,
    this.awayXiValueEur,
    this.homeXi = const [],
    this.awayXi = const [],
    this.homeBench = const [],
    this.awayBench = const [],
    this.info = const {},
    this.shots = const [],
    this.goals = const [],
  });

  final MatchSummary summary;
  final String leagueName;
  final String country;
  final List<StatGroup> stats;
  final List<H2hMatch> h2h;
  final List<StandingRow> standings;
  final int? homeXiValueEur;
  final int? awayXiValueEur;

  /// Lineup players with Transfermarkt values, from `lineup` in /api/matches/:id.
  final List<PlayerValueRow> homeXi;
  final List<PlayerValueRow> awayXi;
  final List<PlayerValueRow> homeBench;
  final List<PlayerValueRow> awayBench;
  final Map<String, String> info;

  /// Shot map, for the momentum chart.
  final List<MatchShot> shots;

  /// Goals from the match events, for the momentum chart's markers.
  final List<MatchGoal> goals;

  factory MatchDetail.fromJson(Json d) {
    final general = d['general'] as Json? ?? {};
    final teams = d['teams'] as Json? ?? {};
    final status = d['status'] as Json? ?? {};
    final home = teams['home'] as Json?;
    final away = teams['away'] as Json?;
    final summary = MatchSummary.fromJson({
      'id': d['id'] ?? general['matchId'],
      'kickoff': general['matchTimeUTCDate'],
      'status': status,
      'isLive': status['isLive'],
      'isFinished': status['finished'],
      'round': general['matchRound'],
      'home': home,
      'away': away,
    });

    final groups = <StatGroup>[];
    for (final g in (d['stats'] as List? ?? const [])) {
      if (g is! Json) continue;
      final lines = <StatLine>[];
      for (final s in (g['stats'] as List? ?? const [])) {
        if (s is! Json) continue;
        final pair = s['stats'];
        if (pair is List && pair.length == 2 && pair[0] != null && pair[1] != null) {
          lines.add(StatLine(_str(s, ['title']), '${pair[0]}', '${pair[1]}'));
        }
      }
      if (lines.isNotEmpty) groups.add(StatGroup(_str(g, ['title'], 'Stats'), lines));
    }

    final h2h = <H2hMatch>[];
    final h2hJson = d['h2h'] as Json?;
    for (final m in (h2hJson?['matches'] as List? ?? const [])) {
      if (m is! Json) continue;
      h2h.add(H2hMatch(
        date: DateTime.tryParse(_str(m['time'] as Json?, ['utcTime'], _str(m, ['matchDate']))),
        home: TeamRef.fromJson(m['home'] as Json?),
        away: TeamRef.fromJson(m['away'] as Json?),
      ));
    }

    final table = d['table'] as Json?;
    final info = <String, String>{};
    final box = d['infoBox'] as Json?;
    if (box != null) {
      String? txt(Object? v) => v is Json ? _str(v, ['text', 'name']) : v?.toString();
      final ref = txt(box['referee']);
      final stad = txt(box['stadium']);
      if (ref != null && ref.isNotEmpty) info['Referee'] = ref;
      if (stad != null && stad.isNotEmpty) info['Venue'] = stad;
      final att = txt(box['attendance']);
      if (att != null && att.isNotEmpty) info['Attendance'] = att;
    }

    final lineup = d['lineup'] as Json?;
    List<PlayerValueRow> players(String side, String key) {
      final rows = <PlayerValueRow>[];
      for (final p in ((lineup?[side] as Json?)?[key] as List? ?? const [])) {
        if (p is! Json) continue;
        final name = _str(p, ['name'], '—');
        final shirt = _str(p, ['shirtNumber']);
        rows.add(PlayerValueRow(
          id: playerSlug(name),
          name: name,
          valueEur: _int(p['marketValue']) ?? 0,
          position: shirt.isEmpty ? null : '#$shirt',
        ));
      }
      return rows;
    }

    int? xiTotal(Json? team, String side, List<PlayerValueRow> xi) {
      final t = _int(team?['totalStarterMarketValue'] ?? (lineup?[side] as Json?)?['totalStarterMarketValue']);
      if (t != null && t > 0) return t;
      final sum = xi.fold<int>(0, (a, p) => a + p.valueEur);
      return sum > 0 ? sum : null;
    }

    final homeXi = players('homeTeam', 'starters');
    final awayXi = players('awayTeam', 'starters');

    final homeId = _str(home, ['id']);
    final shots = <MatchShot>[];
    for (final sh in ((d['shotmap'] as Json?)?['shots'] as List? ?? const [])) {
      if (sh is! Json) continue;
      final min = _int(sh['min']);
      if (min == null) continue;
      shots.add(MatchShot(
        minute: min + (_int(sh['minAdded']) ?? 0),
        isHome: _str(sh, ['teamId']) == homeId,
        xg: _double(sh['expectedGoals']),
        onTarget: sh['isOnTarget'] == true,
        isGoal: sh['eventType'] == 'Goal',
      ));
    }
    final goals = <MatchGoal>[];
    for (final e in (d['events'] as List? ?? const [])) {
      if (e is! Json || e['type'] != 'Goal') continue;
      final min = _int(e['time']);
      if (min == null) continue;
      goals.add(MatchGoal(minute: min + (_int(e['overloadTime']) ?? 0), isHome: e['isHome'] == true));
    }

    return MatchDetail(
      summary: summary,
      leagueName: _str(general, ['leagueName']),
      country: _str(general, ['countryCode']),
      stats: groups,
      h2h: h2h,
      standings: [for (final r in (table?['standings'] as List? ?? const [])) StandingRow.fromJson(r as Json)],
      homeXiValueEur: xiTotal(home, 'homeTeam', homeXi),
      awayXiValueEur: xiTotal(away, 'awayTeam', awayXi),
      homeXi: homeXi,
      awayXi: awayXi,
      homeBench: players('homeTeam', 'subs'),
      awayBench: players('awayTeam', 'subs'),
      info: info,
      shots: shots,
      goals: goals,
    );
  }
}

class MatchShot {
  const MatchShot({required this.minute, required this.isHome, this.xg, this.onTarget = false, this.isGoal = false});
  final int minute;
  final bool isHome;
  final double? xg;
  final bool onTarget;
  final bool isGoal;
}

class MatchGoal {
  const MatchGoal({required this.minute, required this.isHome});
  final int minute;
  final bool isHome;
}

class ValueTrend {
  const ValueTrend(this.diffEur);
  final int diffEur;
}

class PlayerValueRow {
  const PlayerValueRow({
    required this.id,
    required this.name,
    required this.valueEur,
    this.photoUrl,
    this.position,
    this.age,
    this.clubName,
    this.clubLogo,
    this.trend,
  });

  final String id;
  final String name;
  final int valueEur;
  final String? photoUrl;
  final String? position;
  final int? age;
  final String? clubName;
  final String? clubLogo;
  final ValueTrend? trend;

  factory PlayerValueRow.fromJson(Json j) {
    final club = (j['club'] ?? j['currentClub']) as Json?;
    final trend = j['trend'] as Json?;
    return PlayerValueRow(
      id: _str(j, ['slug', 'id']),
      name: _str(j, ['name', 'commonName', 'fullName', 'displayName'], '—'),
      valueEur: _int(j['valueEur'] ?? j['marketValue'] ?? j['latestMarketValue'] ?? j['latestValue']) ?? 0,
      photoUrl: _pick<String>(j, ['photoUrl', 'imageUrl', 'photo']),
      position: _pick<String>(j, ['position']),
      age: _int(j['age']),
      clubName: _pick<String>(club, ['name']),
      clubLogo: _pick<String>(club, ['logoUrl', 'crestUrl']),
      trend: trend != null
          ? ValueTrend(_int(trend['diffEur']) ?? 0)
          : (j['diff'] is num ? ValueTrend(_int(j['diff'])!) : null),
    );
  }
}

/// /api/players/movers — biggest value changes since the previous valuation.
class ValueMovers {
  const ValueMovers({required this.risers, required this.fallers});
  final List<PlayerValueRow> risers;
  final List<PlayerValueRow> fallers;

  factory ValueMovers.fromJson(Json j) => ValueMovers(
        risers: [for (final p in (j['risers'] as List? ?? const [])) PlayerValueRow.fromJson(p as Json)],
        fallers: [for (final p in (j['fallers'] as List? ?? const [])) PlayerValueRow.fromJson(p as Json)],
      );
}

/// /api/transfers row (the website's TransferRecord).
class TransferItem {
  const TransferItem({
    required this.playerName,
    this.playerSlug,
    this.photoUrl,
    this.position,
    this.fromClub,
    this.toClub,
    this.feeEur,
    this.typeLabel,
    this.date,
  });
  final String playerName;
  final String? playerSlug;
  final String? photoUrl;
  final String? position;
  final String? fromClub;
  final String? toClub;
  final int? feeEur;
  final String? typeLabel;
  final DateTime? date;

  factory TransferItem.fromJson(Json j) {
    final p = j['player'] as Json?;
    return TransferItem(
      playerName: _str(p, ['commonName', 'fullName'], 'Player'),
      playerSlug: _pick<String>(p, ['slug']),
      photoUrl: _pick<String>(p, ['photoUrl']),
      position: _pick<String>(p, ['position']),
      fromClub: _pick<String>(j, ['fromClubName']),
      toClub: _pick<String>(j, ['toClubName']),
      feeEur: _int(j['feeEur']),
      typeLabel: _pick<String>(j, ['displayType', 'transferType']),
      date: DateTime.tryParse(_str(j, ['date'])),
    );
  }
}

class ValuePoint {
  const ValuePoint(this.date, this.valueEur);
  final DateTime date;
  final int valueEur;
}

class PlayerProfile {
  const PlayerProfile({
    required this.name,
    required this.points,
    this.fullName,
    this.photoUrl,
    this.clubId,
    this.clubName,
    this.clubLogo,
    this.leagueName,
    this.position,
    this.otherPosition,
    this.age,
    this.dateOfBirth,
    this.nationality,
    this.heightCm,
    this.foot,
    this.contractUntil,
    this.currentEur,
    this.asOf,
    this.peakEur,
    this.twelveMonthDiffEur,
    this.seasons = const [],
    this.transfers = const [],
    this.injuries = const [],
  });

  final String name;
  final String? fullName;
  final String? photoUrl;
  final String? clubId;
  final String? clubName;
  final String? clubLogo;
  final String? leagueName;
  final String? position;
  final String? otherPosition;
  final int? age;
  final DateTime? dateOfBirth;
  final String? nationality;
  final int? heightCm;
  final String? foot;
  final DateTime? contractUntil;
  final int? currentEur;
  final DateTime? asOf;
  final int? peakEur;
  final int? twelveMonthDiffEur;
  final List<ValuePoint> points;
  final List<SeasonLine> seasons;
  final List<TransferItem> transfers;
  final List<InjuryItem> injuries;

  factory PlayerProfile.fromJson(Json j) {
    final identity = j['identity'] as Json? ?? j;
    final valuation = j['valuation'] as Json?;
    final rawPoints =
        (valuation?['points'] ?? j['marketValues'] ?? j['marketValueHistory'] ?? j['valueHistory']) as List? ?? const [];
    final points = <ValuePoint>[];
    for (final p in rawPoints) {
      if (p is! Json) continue;
      final d = DateTime.tryParse(_str(p, ['date']));
      final v = _int(p['valueEur'] ?? p['value'] ?? p['marketValue']);
      if (d != null && v != null) points.add(ValuePoint(d, v));
    }
    points.sort((a, b) => a.date.compareTo(b.date));
    final club = (j['club'] ?? j['currentClub']) as Json?;
    final current = valuation?['current'] as Json?;
    final dob = DateTime.tryParse(_str(identity, ['dateOfBirth']));
    final now = DateTime.now();
    final age = _int(identity['age']) ??
        (dob == null ? null : now.year - dob.year - ((now.month < dob.month || (now.month == dob.month && now.day < dob.day)) ? 1 : 0));
    final nat = identity['nationality'];
    final currentEur = _int(current?['valueEur'] ?? j['latestMarketValue'] ?? j['marketValue']) ??
        (points.isEmpty ? null : points.last.valueEur);
    final peak = _int((valuation?['peak'] as Json?)?['valueEur']) ??
        (points.isEmpty ? null : points.map((p) => p.valueEur).reduce((a, b) => a > b ? a : b));
    int? yearDiff = _int((valuation?['twelveMonth'] as Json?)?['diffEur']);
    if (yearDiff == null && points.length >= 2 && currentEur != null) {
      final cutoff = now.subtract(const Duration(days: 365));
      final before = points.lastWhere((p) => p.date.isBefore(cutoff), orElse: () => points.first);
      yearDiff = currentEur - before.valueEur;
    }
    final transfers = [
      for (final t in (j['transfers'] as List? ?? const []))
        if (t is Json)
          TransferItem(
            playerName: '',
            fromClub: _pick<String>(t, ['fromClubName']),
            toClub: _pick<String>(t, ['toClubName']),
            feeEur: _int(t['feeEur']),
            typeLabel: _pick<String>(t, ['transferType', 'feeStatus']),
            date: DateTime.tryParse(_str(t, ['date'])),
          ),
    ]..sort((a, b) => (b.date ?? DateTime(0)).compareTo(a.date ?? DateTime(0)));
    return PlayerProfile(
      name: _str(identity, ['displayName', 'commonName', 'fullName', 'name'], '—'),
      fullName: _pick<String>(identity, ['fullName']),
      photoUrl: _pick<String>(identity, ['photoUrl', 'imageUrl']),
      clubId: club == null ? null : _str(club, ['id']),
      clubName: _pick<String>(club, ['name']),
      clubLogo: _pick<String>(club, ['logoUrl']),
      leagueName: _pick<String>(club?['league'] as Json?, ['name']),
      position: _pick<String>(identity, ['position']),
      otherPosition: _pick<String>(identity, ['subPosition']),
      age: age,
      dateOfBirth: dob,
      nationality: nat is List ? nat.whereType<String>().join(', ') : nat as String?,
      heightCm: _int(identity['heightCm']),
      foot: _pick<String>(identity, ['preferredFoot']),
      contractUntil: DateTime.tryParse(_str(identity, ['contractUntil'])),
      currentEur: currentEur,
      asOf: DateTime.tryParse(_str(current, ['asOf'])) ?? (points.isEmpty ? null : points.last.date),
      peakEur: peak,
      twelveMonthDiffEur: yearDiff,
      points: points,
      seasons: [for (final r in (j['seasonStats'] as List? ?? const [])) if (r is Json) SeasonLine.fromJson(r)],
      transfers: transfers,
      injuries: [for (final r in (j['injuries'] as List? ?? const [])) if (r is Json) InjuryItem.fromJson(r)],
    );
  }
}

/// One season in one competition (SeasonStats / FotMob career rows).
class SeasonLine {
  const SeasonLine({
    required this.season,
    required this.competition,
    this.club,
    this.apps,
    this.goals,
    this.assists,
    this.minutes,
    this.yellow,
    this.red,
    this.rating,
  });
  final String season;
  final String competition;
  final String? club;
  final int? apps;
  final int? goals;
  final int? assists;
  final int? minutes;
  final int? yellow;
  final int? red;
  final double? rating;

  factory SeasonLine.fromJson(Json j) => SeasonLine(
        season: _str(j, ['season'], '—'),
        competition: _str(j, ['competition'], ''),
        club: _pick<String>(j, ['clubName']),
        apps: _int(j['appearances']),
        goals: _int(j['goals']),
        assists: _int(j['assists']),
        minutes: _int(j['minutesPlayed']),
        yellow: _int(j['yellowCards']),
        red: _int(j['redCards']),
        rating: _double(j['rating']),
      );
}

class InjuryItem {
  const InjuryItem({required this.type, this.start, this.end, this.active = false});
  final String type;
  final DateTime? start;
  final DateTime? end;
  final bool active;

  factory InjuryItem.fromJson(Json j) => InjuryItem(
        type: _str(j, ['type'], 'Injury'),
        start: DateTime.tryParse(_str(j, ['startDate'])),
        end: DateTime.tryParse(_str(j, ['endDate'])),
        active: j['status'] == 'active',
      );
}

class NewsItem {
  const NewsItem({required this.title, required this.url, this.imageUrl, this.source, this.publishedAt});
  final String title;
  final String url;
  final String? imageUrl;
  final String? source;
  final DateTime? publishedAt;

  factory NewsItem.fromJson(Json j) => NewsItem(
        title: _str(j, ['title'], ''),
        url: _str(j, ['url', 'link']),
        imageUrl: _pick<String>(j, ['imageUrl', 'image']),
        source: _pick<String>(j, ['source']),
        publishedAt: DateTime.tryParse(_str(j, ['publishedAt', 'date'])),
      );
}

class ClubValueRow {
  const ClubValueRow({
    required this.id,
    required this.name,
    required this.squadValueEur,
    this.logoUrl,
    this.squadSize,
    this.leagueName,
    this.averageAge,
  });
  final String id;
  final String name;
  final int squadValueEur;
  final String? logoUrl;
  final int? squadSize;
  final String? leagueName;
  final double? averageAge;

  factory ClubValueRow.fromJson(Json j) => ClubValueRow(
        id: _str(j, ['id']),
        name: _str(j, ['name'], '—'),
        squadValueEur: _int(j['totalSquadValue'] ?? j['totalMarketValue']) ?? 0,
        logoUrl: _pick<String>(j, ['logoUrl']),
        squadSize: _int(j['squadSize'] ?? j['playerCount']),
        leagueName: _pick<String>(j, ['leagueName']),
        averageAge: _double(j['averageAge']),
      );
}

/// /api/leagues/:id — the same payload the website's league page renders.
/// Zone key under a league table, e.g. Champions League, Relegation.
class LegendItem {
  const LegendItem(this.title, this.color);
  final String title;
  final String color;
}

/// Top scorer / assist leader.
class LeaderRow {
  const LeaderRow({required this.name, required this.value, this.teamName, this.imageUrl});
  final String name;
  final num value;
  final String? teamName;
  final String? imageUrl;

  factory LeaderRow.fromJson(Json j) => LeaderRow(
        name: _str(j, ['name'], '—'),
        value: (j['value'] as num?) ?? 0,
        teamName: _pick<String>(j, ['teamName']),
        imageUrl: _pick<String>(j, ['imageUrl']),
      );
}

class LeagueDetail {
  const LeagueDetail({
    required this.standings,
    required this.clubs,
    this.name,
    this.season,
    this.totalValueEur,
    this.legend = const [],
    this.topScorers = const [],
    this.topAssists = const [],
  });
  final String? name;
  final String? season;
  final int? totalValueEur;
  final List<StandingRow> standings;
  final List<ClubValueRow> clubs;
  final List<LegendItem> legend;
  final List<LeaderRow> topScorers;
  final List<LeaderRow> topAssists;

  factory LeagueDetail.fromJson(Json j) {
    final clubs = [for (final c in (j['clubs'] as List? ?? const [])) ClubValueRow.fromJson(c as Json)]
      ..sort((a, b) => b.squadValueEur.compareTo(a.squadValueEur));
    return LeagueDetail(
      name: _pick<String>(j, ['name']),
      season: _pick<String>(j, ['season']),
      totalValueEur: _int(j['totalMarketValue']),
      standings: [for (final r in (j['standings'] as List? ?? const [])) StandingRow.fromJson(r as Json)],
      clubs: clubs,
      legend: [
        for (final l in (j['legend'] as List? ?? const []))
          if (l is Json) LegendItem(_str(l, ['title', 'name']), _str(l, ['color'])),
      ],
      topScorers: [for (final p in (j['topScorers'] as List? ?? const [])) LeaderRow.fromJson(p as Json)],
      topAssists: [for (final p in (j['topAssists'] as List? ?? const [])) LeaderRow.fromJson(p as Json)],
    );
  }
}

/// /api/clubs/:id?include=details — the website's club page data.
class ClubDetail {
  const ClubDetail({
    required this.id,
    required this.name,
    required this.squad,
    this.logoUrl,
    this.country,
    this.leagueId,
    this.leagueName,
    this.squadValueEur,
    this.squadSize,
    this.averageAge,
    this.venue,
    this.manager,
    this.form = const [],
    this.nextMatch,
    this.leaguePosition,
    this.honours = const [],
    this.valueHistory = const [],
    this.arrivals = const [],
    this.departures = const [],
  });
  final String id;
  final String name;
  final String? logoUrl;
  final String? country;
  final String? leagueId;
  final String? leagueName;
  final int? squadValueEur;
  final int? squadSize;
  final double? averageAge;
  final List<SquadPlayer> squad;
  final String? venue;
  final String? manager;

  /// Last results as (result, score, opponent).
  final List<(String, String, String)> form;
  final String? nextMatch;
  final String? leaguePosition;

  /// (competition, titles, latest season)
  final List<(String, int, String?)> honours;
  final List<ValuePoint> valueHistory;
  final List<TransferItem> arrivals;
  final List<TransferItem> departures;

  factory ClubDetail.fromJson(Json j) {
    final team = j['team'] as Json?;
    final venue = team?['venue'] as Json?;
    final next = team?['nextMatch'] as Json?;
    final table = team?['leagueTable'] as Json?;
    final transfers = j['transfers'] as Json?;
    final league = j['league'] as Json?;
    List<TransferItem> moves(String key) => [
          for (final t in (transfers?[key] as List? ?? const []))
            if (t is Json) TransferItem.fromJson(t),
        ];
    final players = (j['firstTeamPlayers'] as List?)?.isNotEmpty == true ? j['firstTeamPlayers'] : j['players'];
    final nextDate = DateTime.tryParse(_str(next, ['date']));
    return ClubDetail(
      id: _str(j, ['id']),
      name: _str(j, ['name'], '—'),
      logoUrl: _pick<String>(j, ['logoUrl']),
      country: _pick<String>(j, ['country']) ?? _pick<String>(league, ['country']),
      leagueId: _pick<String>(league, ['id']),
      leagueName: _pick<String>(league, ['name']),
      squadValueEur: _int(j['totalSquadValue'] ?? j['totalMarketValue']),
      squadSize: _int(j['squadSize']),
      averageAge: _double(j['averageAge']),
      squad: [for (final p in (players as List? ?? const [])) if (p is Json) SquadPlayer.fromJson(p)],
      venue: venue == null
          ? null
          : [
              _str(venue, ['name']),
              if (venue['city'] != null) _str(venue, ['city']),
              if (venue['capacity'] != null) '${_int(venue['capacity'])} seats',
            ].where((s) => s.isNotEmpty).join(' · '),
      manager: _pick<String>(team?['manager'] as Json?, ['name']),
      form: [
        for (final f in (team?['recentForm'] as List? ?? const []))
          if (f is Json) (_str(f, ['result']).toUpperCase(), _str(f, ['score']), _str(f, ['opponent'])),
      ],
      nextMatch: next == null
          ? null
          : '${next['isHome'] == true ? 'vs' : 'at'} ${_str(next, ['opponent'])}'
              '${nextDate == null ? '' : ' · ${nextDate.day}.${nextDate.month}.'}'
              ' · ${_str(next, ['tournament'])}',
      leaguePosition: table == null
          ? null
          : '${_int(table['rank'])}. · ${_int(table['pts'])} pts from ${_int(table['played'])} games',
      honours: [
        for (final h in (j['honours'] as List? ?? const []))
          if (h is Json) (_str(h, ['competitionName']), _int(h['titleCount']) ?? 0, _pick<String>(h, ['latestSeason'])),
      ],
      valueHistory: [
        for (final s in (j['snapshots'] as List? ?? const []))
          if (s is Json && DateTime.tryParse(_str(s, ['date'])) != null && _int(s['totalMarketValue']) != null)
            ValuePoint(DateTime.parse(_str(s, ['date'])), _int(s['totalMarketValue'])!),
      ],
      arrivals: moves('recordArrivals'),
      departures: moves('recordDepartures'),
    );
  }
}

class SquadPlayer {
  const SquadPlayer({
    required this.id,
    required this.name,
    required this.valueEur,
    this.photoUrl,
    this.position,
    this.group,
    this.age,
    this.contractUntil,
  });
  final String id;
  final String name;
  final int valueEur;
  final String? photoUrl;
  final String? position;

  /// Goalkeeper / Defender / Midfielder / Forward, as the website groups the squad.
  final String? group;
  final int? age;
  final DateTime? contractUntil;

  factory SquadPlayer.fromJson(Json j) => SquadPlayer(
        id: _str(j, ['slug', 'id']),
        name: _str(j, ['commonName', 'fullName', 'name'], '—'),
        valueEur: _int(j['latestMarketValue'] ?? j['marketValue']) ?? 0,
        photoUrl: _pick<String>(j, ['photoUrl']),
        position: _pick<String>(j, ['position']),
        group: _pick<String>(j, ['positionGroup']),
        age: _int(j['age']),
        contractUntil: DateTime.tryParse(_str(j, ['contractUntil'])),
      );
}
