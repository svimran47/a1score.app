import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'api/models.dart';
import 'screens/all_games_screen.dart';
import 'screens/favourites_screen.dart';
import 'screens/home_screen.dart';
import 'screens/league_screen.dart';
import 'screens/leagues_screen.dart';
import 'screens/match_screen.dart';
import 'screens/news_screen.dart';
import 'screens/player_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/values_screen.dart';
import 'theme/app_theme.dart';
import 'theme/tokens.dart';

final _rootKey = GlobalKey<NavigatorState>();

final router = GoRouter(
  navigatorKey: _rootKey,
  initialLocation: '/',
  routes: [
    StatefulShellRoute.indexedStack(
      builder: (context, state, shell) => _Shell(shell: shell),
      branches: [
        StatefulShellBranch(routes: [GoRoute(path: '/', builder: (_, _) => const HomeScreen())]),
        StatefulShellBranch(routes: [GoRoute(path: '/live', builder: (_, _) => const AllGamesScreen(liveOnly: true))]),
        StatefulShellBranch(routes: [GoRoute(path: '/favourites', builder: (_, _) => const FavouritesScreen())]),
        StatefulShellBranch(routes: [GoRoute(path: '/news', builder: (_, _) => const NewsScreen())]),
        StatefulShellBranch(routes: [GoRoute(path: '/leagues', builder: (_, _) => const LeaguesScreen())]),
      ],
    ),
    // Detail pages cover the bottom bar, like the reference app.
    GoRoute(parentNavigatorKey: _rootKey, path: '/match/:id', builder: (_, s) => MatchScreen(id: s.pathParameters['id']!)),
    GoRoute(
      parentNavigatorKey: _rootKey,
      path: '/league/:id',
      builder: (_, s) => LeagueScreen(id: s.pathParameters['id']!, league: s.extra is LeagueRef ? s.extra as LeagueRef : null),
    ),
    GoRoute(parentNavigatorKey: _rootKey, path: '/values', builder: (_, _) => const ValuesScreen()),
    GoRoute(parentNavigatorKey: _rootKey, path: '/player/:id', builder: (_, s) => PlayerScreen(id: s.pathParameters['id']!)),
    GoRoute(parentNavigatorKey: _rootKey, path: '/settings', builder: (_, _) => const SettingsScreen()),
  ],
);

class _Shell extends StatelessWidget {
  const _Shell({required this.shell});
  final StatefulNavigationShell shell;

  static const _items = [
    (Icons.sports_soccer_outlined, Icons.sports_soccer, 'All games'),
    (Icons.play_circle_outline, Icons.play_circle, 'Live'),
    (Icons.star_outline_rounded, Icons.star_rounded, 'Favourites'),
    (Icons.article_outlined, Icons.article, 'News'),
    (Icons.emoji_events_outlined, Icons.emoji_events, 'Leagues'),
  ];

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBarTheme(
        data: NavigationBarThemeData(
          height: Sizes.bottomNav + 8,
          backgroundColor: c.bgPrimary,
          indicatorColor: Colors.transparent,
          labelTextStyle: WidgetStateProperty.resolveWith(
              (s) => A1Text.navLabel.copyWith(color: s.contains(WidgetState.selected) ? c.brand : c.contentSecondary)),
          iconTheme: WidgetStateProperty.resolveWith(
              (s) => IconThemeData(size: 24, color: s.contains(WidgetState.selected) ? c.brand : c.contentSecondary)),
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(border: Border(top: BorderSide(color: c.border))),
          child: NavigationBar(
            selectedIndex: shell.currentIndex,
            onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
            destinations: [
              for (final (off, on, label) in _items) NavigationDestination(icon: Icon(off), selectedIcon: Icon(on), label: label),
            ],
          ),
        ),
      ),
    );
  }
}
