# A1score native app (Flutter)

Standalone Android/iOS app for a1score.app, replacing the Capacitor web wrapper.
Layout and sizes follow the Flashscore-derived layout spec, with the Royal palette (`lib/theme/tokens.dart`).
This folder is separate from the Capacitor app in `/android`; the two don't share build files.

## Run

```
cd mobile
flutter pub get
flutter run                                   # uses https://a1score.app/api
flutter run --dart-define=A1_API=http://10.0.2.2:3000/api   # local Next.js dev server from the emulator
flutter build apk --release
```

## What talks to which endpoint

| Screen | Endpoint | Status |
|---|---|---|
| All games / Live | `/api/matches?date&filter` | exists |
| Match | `/api/matches/:id` | exists |
| Match, Market value tab | `lineup` in `/api/matches/:id` (same as the website's Values tab) | exists |
| Most valuable players | `/api/players/most-valuable` | exists |
| Player | `/api/players/:id` | exists |
| Leagues | `/api/leagues` | exists |
| League standings and club values | `/api/leagues/:id` (wraps `getLeagueById`, same data as the league page) | added in PR #6 |
| News | `/api/news?category` | exists |

Odds render on match rows once `/api/matches` includes an `odds` object (see `docs/api-contract.md`).

## Not done yet

- Favourites are in memory only; sync to Supabase `user_follows` needs sign-in.
- Push notifications, search, half-time stats, team pages.
- App icon and splash still use the Flutter defaults.

Fonts: Figtree and Oxanium (SIL Open Font License), bundled in `assets/fonts`.
