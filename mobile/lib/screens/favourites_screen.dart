import 'package:flutter/material.dart';

import '../state/favourites.dart';
import '../widgets/common.dart';

/// Favourites tab. Shows counts for now; full lists arrive with the follows sync.
class FavouritesScreen extends StatelessWidget {
  const FavouritesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final f = Favourites.instance;
    return Scaffold(
      appBar: AppBar(title: const Text('Favourites')),
      body: ListenableBuilder(
        listenable: Listenable.merge([f.matches, f.leagues, f.teams, f.players]),
        builder: (context, _) {
          final total = f.matches.value.length + f.leagues.value.length + f.teams.value.length + f.players.value.length;
          if (total == 0) {
            return const EmptyState(
              icon: Icons.star_outline_rounded,
              title: 'Nothing followed yet',
              body: 'Tap the star on a match, league or player and it shows up here.',
            );
          }
          return ListView(children: [
            const SectionBar('Following'),
            for (final e in {
              'Matches': f.matches.value.length,
              'Leagues': f.leagues.value.length,
              'Teams': f.teams.value.length,
              'Players': f.players.value.length,
            }.entries)
              ListTile(title: Text(e.key), trailing: Text('${e.value}')),
          ]);
        },
      ),
    );
  }
}
