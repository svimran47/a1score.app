import 'package:flutter/material.dart';

import 'router.dart';
import 'screens/settings_screen.dart';
import 'theme/app_theme.dart';

void main() => runApp(const A1ScoreApp());

class A1ScoreApp extends StatelessWidget {
  const A1ScoreApp({super.key});

  @override
  Widget build(BuildContext context) => ValueListenableBuilder(
        valueListenable: themeMode,
        builder: (_, mode, _) => MaterialApp.router(
          title: 'A1score',
          debugShowCheckedModeBanner: false,
          theme: buildTheme(Brightness.light),
          darkTheme: buildTheme(Brightness.dark),
          themeMode: mode,
          routerConfig: router,
        ),
      );
}
