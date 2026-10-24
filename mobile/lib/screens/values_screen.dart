import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';
import '../widgets/match_widgets.dart';

// Values the /api/players/most-valuable `position` filter matches on.
const _positions = [null, 'Goalkeeper', 'Defender', 'Midfield', 'Attack'];
const _positionLabels = ['All', 'Goalkeepers', 'Defenders', 'Midfielders', 'Forwards'];

/// Player Market Value category: most valuable players, filtered by position, paged.
class ValuesScreen extends StatelessWidget {
  const ValuesScreen({super.key, this.title = 'Most valuable players'});
  final String title;

  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text(title)), body: const ValuesScreenBody());
}

/// The ranking list on its own, so the League page can reuse it as a tab.
class ValuesScreenBody extends StatefulWidget {
  const ValuesScreenBody({super.key, this.leagueId});
  final String? leagueId;

  @override
  State<ValuesScreenBody> createState() => _ValuesScreenBodyState();
}

class _ValuesScreenBodyState extends State<ValuesScreenBody> {
  static const _pageSize = 25;
  int _pos = 0;
  final _rows = <PlayerValueRow>[];
  int _page = 0;
  bool _loading = false;
  bool _done = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _more();
  }

  void _reset(int pos) {
    setState(() {
      _pos = pos;
      _rows.clear();
      _page = 0;
      _done = false;
      _error = null;
    });
    _more();
  }

  Future<void> _more() async {
    if (_loading || _done) return;
    setState(() => _loading = true);
    final pos = _pos;
    try {
      final next = await ApiClient.instance
          .mostValuable(position: _positions[pos], league: widget.leagueId, page: _page + 1, limit: _pageSize);
      if (!mounted || pos != _pos) return;
      setState(() {
        _rows.addAll(next);
        _page++;
        _done = next.length < _pageSize;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Column(children: [
      Container(color: c.bgPrimary, child: ChipTabs(labels: _positionLabels, selected: _pos, onSelected: _reset)),
      const SectionBar('Player', trailing: 'Market value'),
      Expanded(child: _body(c)),
    ]);
  }

  Widget _body(A1Colors c) {
    if (_rows.isEmpty && _error != null) {
      return EmptyState(icon: Icons.wifi_off_rounded, title: 'Couldn’t load values', body: '$_error', actionLabel: 'Try again', onAction: () => _reset(_pos));
    }
    if (_rows.isEmpty && _loading) return Center(child: CircularProgressIndicator(color: c.brand, strokeWidth: 2.5));
    if (_rows.isEmpty) return const EmptyState(icon: Icons.euro_rounded, title: 'No players found');
    return NotificationListener<ScrollNotification>(
      onNotification: (n) {
        if (n.metrics.pixels > n.metrics.maxScrollExtent - 400) _more();
        return false;
      },
      child: ListView.builder(
        itemCount: _rows.length + 1,
        itemBuilder: (_, i) {
          if (i == _rows.length) {
            return SizedBox(
              height: 64,
              child: Center(child: _loading ? CircularProgressIndicator(color: c.brand, strokeWidth: 2) : const SizedBox.shrink()),
            );
          }
          final p = _rows[i];
          return ValueRow(player: p, rank: i + 1, onTap: () => context.push('/player/${p.id}'));
        },
      ),
    );
  }
}
