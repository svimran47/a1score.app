import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../util/images.dart';
import '../widgets/common.dart';

const _categories = [null, 'transfers', 'premier-league', 'champions-league'];
const _categoryLabels = ['Top', 'Transfers', 'Premier League', 'Champions League'];

class NewsScreen extends StatefulWidget {
  const NewsScreen({super.key});

  @override
  State<NewsScreen> createState() => _NewsScreenState();
}

class _NewsScreenState extends State<NewsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: _categories.length, vsync: this)
    ..addListener(() {
      if (!_tabs.indexIsChanging) setState(_load);
    });
  late Future<List<NewsItem>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  // Block body on purpose: setState(_load) must not hand back the Future.
  void _load() {
    _future = ApiClient.instance.news(category: _categories[_tabs.index]);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _open(NewsItem n) async {
    final uri = Uri.tryParse(n.url);
    if (uri != null) await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Scaffold(
      appBar: AppBar(
        title: const Text('News'),
        bottom: PrimaryTabBar(controller: _tabs, labels: _categoryLabels),
      ),
      body: FutureBuilder<List<NewsItem>>(
        future: _future,
        builder: (context, snap) => AsyncBody<List<NewsItem>>(
          snapshot: snap,
          onRetry: () => setState(_load),
          isEmpty: (l) => l.isEmpty,
          empty: const EmptyState(icon: Icons.article_outlined, title: 'No stories right now'),
          builder: (items) => RefreshIndicator(
            color: c.brand,
            onRefresh: () async {
              setState(_load);
              await _future;
            },
            child: ListView.builder(
              itemCount: items.length,
              itemBuilder: (_, i) => i == 0 ? _Hero(item: items[0], onTap: () => _open(items[0])) : _Item(item: items[i], onTap: () => _open(items[i])),
            ),
          ),
        ),
      ),
    );
  }
}

String _meta(NewsItem n) => [relativeTime(n.publishedAt), n.source].whereType<String>().where((s) => s.isNotEmpty).join(' · ');

class _Hero extends StatelessWidget {
  const _Hero({required this.item, required this.onTap});
  final NewsItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Material(
      color: c.bgPrimary,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(Space.gutter),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (item.imageUrl != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(Radii.large),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.network(resolveImage(item.imageUrl)!, fit: BoxFit.cover, errorBuilder: (_, _, _) => Container(color: c.bgSecondary)),
                ),
              ),
            const SizedBox(height: Space.l),
            Text(item.title, style: A1Text.newsHero.copyWith(color: c.contentPrimary)),
            const SizedBox(height: Space.s),
            Text(_meta(item), style: A1Text.meta.copyWith(color: c.contentTertiary)),
          ]),
        ),
      ),
    );
  }
}

class _Item extends StatelessWidget {
  const _Item({required this.item, required this.onTap});
  final NewsItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Material(
      color: c.bgPrimary,
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: Sizes.newsItem,
          padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.l),
          decoration: BoxDecoration(border: Border(top: BorderSide(color: c.border))),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: Text(item.title, maxLines: 3, overflow: TextOverflow.ellipsis, style: A1Text.newsItem.copyWith(color: c.contentPrimary))),
                Text(_meta(item), style: A1Text.meta.copyWith(color: c.contentTertiary)),
              ]),
            ),
            if (item.imageUrl != null) ...[
              const SizedBox(width: Space.l),
              ClipRRect(
                borderRadius: BorderRadius.circular(Radii.medium),
                child: Image.network(resolveImage(item.imageUrl)!, width: 120, height: 84, fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(width: 120, height: 84, color: c.bgSecondary)),
              ),
            ],
          ]),
        ),
      ),
    );
  }
}
