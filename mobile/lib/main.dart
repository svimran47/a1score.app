import 'package:flutter/material.dart';

import 'router.dart';
import 'state/prefs.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Prefs.instance.load();
  runApp(const A1ScoreApp());
}

class A1ScoreApp extends StatelessWidget {
  const A1ScoreApp({super.key});

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: Listenable.merge([Prefs.instance.themeMode, Prefs.instance.currency]),
        builder: (_, _) => MaterialApp.router(
          title: 'A1score',
          debugShowCheckedModeBanner: false,
          theme: buildTheme(Brightness.light),
          darkTheme: buildTheme(Brightness.dark),
          themeMode: Prefs.instance.themeMode.value,
          routerConfig: router,
        ),
      );
}
