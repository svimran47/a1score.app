import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../state/favourites.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';

/// Everything you follow, grouped by kind. Tap to open, tap the star to unfollow.
class FavouritesScreen extends StatelessWidget {
  const FavouritesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final f = Favourites.instance;
    final groups = [
      ('Matches', f.matches, '/match/', Icons.sports_soccer),
      ('Leagues', f.leagues, '/league/', Icons.emoji_events_outlined),
      ('Clubs', f.teams, '/club/', Icons.shield_outlined),
      ('Players', f.players, '/player/', Icons.person_outline),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Favourites')),
      body: ListenableBuilder(
        listenable: Listenable.merge([for (final g in groups) g.$2]),
        builder: (context, _) {
          if (groups.every((g) => g.$2.value.isEmpty)) {
            return const EmptyState(
              icon: Icons.star_outline_rounded,
              title: 'Nothing followed yet',
              body: 'Tap the star on a match, league, club or player and it shows up here.',
            );
          }
          return ListView(
            children: [
              for (final (title, list, path, icon) in groups)
                if (list.value.isNotEmpty) ...[
                  SectionBar(title, trailing: '${list.value.length}'),
                  for (final id in list.value)
                    _FavRow(
                      label: f.label(id) ?? '$title · $id',
                      icon: icon,
                      onTap: () => context.push('$path$id'),
                      onUnfollow: () => f.toggle(list, id),
                    ),
                ],
              const SizedBox(height: Space.xxl),
            ],
          );
        },
      ),
    );
  }
}

class _FavRow extends StatelessWidget {
  const _FavRow({required this.label, required this.icon, required this.onTap, required this.onUnfollow});
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final VoidCallback onUnfollow;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return InkWell(
      onTap: onTap,
      child: Container(
        height: Sizes.settingsRow,
        padding: const EdgeInsets.only(left: Space.gutter),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: c.border)),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: c.contentTertiary),
            const SizedBox(width: Space.l),
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: A1Text.settingsLabel.copyWith(color: c.contentPrimary),
              ),
            ),
            IconButton(
              tooltip: 'Unfollow',
              onPressed: onUnfollow,
              icon: Icon(Icons.star_rounded, color: c.favouriteStar),
            ),
          ],
        ),
      ),
    );
  }
}
