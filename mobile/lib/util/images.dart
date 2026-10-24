import 'dart:convert';

import '../api/api_client.dart';

/// The website returns its own image proxy paths (/img/player/123, /img/asset/...),
/// which are relative to the site. Resolve them against the API's origin.
String? resolveImage(String? url) {
  if (url == null || url.isEmpty) return null;
  if (!url.startsWith('/')) return url;
  final base = ApiClient.instance.baseUrl;
  final origin = base.endsWith('/api') ? base.substring(0, base.length - 4) : base;
  return '$origin$url';
}

/// Player photo for a FotMob player id, through the site's asset proxy
/// (same as sanitizeImageUrl does for league leaders).
String fotmobPlayerImage(Object id) {
  final url = 'https://images.fotmob.com/image_resources/playerimages/$id.png';
  return '/img/asset/${base64Url.encode(utf8.encode(url)).replaceAll('=', '')}';
}
