import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import '../util/format.dart';

/// Network image in a circle or rounded tile, with an initials fallback.
class Crest extends StatelessWidget {
  const Crest({super.key, required this.url, required this.label, this.size = Sizes.teamCrest, this.radius});
  final String? url;
  final String label;
  final double size;
  final double? radius;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final r = BorderRadius.circular(radius ?? size / 2);
    final fallback = Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: c.bgSecondary, borderRadius: r),
      child: Text(initials(label),
          style: A1Text.badge.copyWith(fontSize: size * 0.4, color: c.contentSecondary, letterSpacing: 0)),
    );
    if (url == null || url!.isEmpty) return fallback;
    return ClipRRect(
      borderRadius: r,
      child: Image.network(url!, width: size, height: size, fit: BoxFit.contain,
          errorBuilder: (_, _, _) => fallback),
    );
  }
}

/// Grey caps bar used for "1ST HALF", "TV CHANNEL", table headers.
class SectionBar extends StatelessWidget {
  const SectionBar(this.label, {super.key, this.trailing});
  final String label;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final style = A1Text.sectionBar.copyWith(color: c.contentSecondary);
    return Container(
      height: Sizes.sectionBar,
      color: c.bgSectionHeader,
      padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
      child: Row(children: [
        Expanded(child: Text(label.toUpperCase(), style: style)),
        if (trailing != null) Text(trailing!.toUpperCase(), style: style),
      ]),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(Space.gutter, Space.l, Space.gutter, Space.m),
        child: Text(text, style: A1Text.sectionTitle.copyWith(color: context.c.contentPrimary)),
      );
}

/// Level-2 tabs: 30 dp chips, radius 6, brand fill when active.
class ChipTabs extends StatelessWidget {
  const ChipTabs({super.key, required this.labels, required this.selected, required this.onSelected});
  final List<String> labels;
  final int selected;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return SizedBox(
      height: Sizes.chip + Space.l * 2,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: Space.gutter, vertical: Space.l),
        itemCount: labels.length,
        separatorBuilder: (_, _) => const SizedBox(width: Space.m),
        itemBuilder: (_, i) {
          final active = i == selected;
          return Material(
            color: active ? c.brand : c.bgSecondary,
            borderRadius: BorderRadius.circular(Radii.medium),
            child: InkWell(
              borderRadius: BorderRadius.circular(Radii.medium),
              onTap: () => onSelected(i),
              child: Container(
                height: Sizes.chip,
                padding: const EdgeInsets.symmetric(horizontal: Space.l),
                alignment: Alignment.center,
                child: Text(labels[i].toUpperCase(),
                    style: A1Text.chip.copyWith(color: active ? c.contentInverse : c.contentSecondary)),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Level-1 tabs: 42 dp, caps, brand underline 4 dp.
class PrimaryTabBar extends StatelessWidget implements PreferredSizeWidget {
  const PrimaryTabBar({super.key, required this.labels, this.controller});
  final List<String> labels;
  final TabController? controller;

  @override
  Size get preferredSize => const Size.fromHeight(Sizes.tabBar + 1);

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(color: c.bgPrimary, border: Border(bottom: BorderSide(color: c.border))),
      child: TabBar(
        controller: controller,
        isScrollable: true,
        tabAlignment: TabAlignment.start,
        padding: const EdgeInsets.symmetric(horizontal: Space.xs),
        labelPadding: const EdgeInsets.symmetric(horizontal: 14),
        labelColor: c.brand,
        unselectedLabelColor: c.contentSecondary,
        labelStyle: A1Text.primaryTab,
        unselectedLabelStyle: A1Text.primaryTab,
        dividerHeight: 0,
        indicatorSize: TabBarIndicatorSize.label,
        indicator: UnderlineTabIndicator(
          borderSide: BorderSide(color: c.brand, width: Sizes.tabIndicator),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(Radii.tiny)),
        ),
        tabs: [for (final l in labels) Tab(height: Sizes.tabBar, text: l.toUpperCase())],
      ),
    );
  }
}

/// Stat row: values at the gutters, centred label, split bar growing from the centre.
class StatSplitRow extends StatelessWidget {
  const StatSplitRow({
    super.key,
    required this.label,
    required this.home,
    required this.away,
    required this.homeNum,
    required this.awayNum,
  });

  final String label;
  final String home;
  final String away;
  final double homeNum;
  final double awayNum;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final total = homeNum + awayNum;
    final hp = total == 0 ? 0.0 : homeNum / total;
    final ap = total == 0 ? 0.0 : awayNum / total;
    final homeLeads = homeNum >= awayNum && total > 0;
    final awayLeads = awayNum >= homeNum && total > 0;
    TextStyle v(bool lead) => A1Text.statValue.copyWith(
        color: c.contentPrimary, fontWeight: lead && homeNum != awayNum ? FontWeight.w700 : FontWeight.w400);

    return SizedBox(
      height: Sizes.statRow,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Row(children: [
            SizedBox(width: 56, child: Text(home, style: v(homeLeads))),
            Expanded(
                child: Text(label,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: A1Text.statLabel.copyWith(color: c.contentPrimary))),
            SizedBox(width: 56, child: Text(away, textAlign: TextAlign.right, style: v(awayLeads))),
          ]),
          const SizedBox(height: Space.s + 2),
          Row(children: [
            Expanded(child: _Bar(fraction: hp, color: homeLeads ? c.statHome : c.statMuted, fromEnd: true)),
            const SizedBox(width: Space.xs),
            Expanded(child: _Bar(fraction: ap, color: awayLeads ? c.statAway : c.statMuted)),
          ]),
        ]),
      ),
    );
  }
}

class _Bar extends StatelessWidget {
  const _Bar({required this.fraction, required this.color, this.fromEnd = false});
  final double fraction;
  final Color color;
  final bool fromEnd;

  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(Sizes.statBar / 2),
        child: Container(
          height: Sizes.statBar,
          color: context.c.bgSecondary,
          alignment: fromEnd ? Alignment.centerRight : Alignment.centerLeft,
          child: FractionallySizedBox(widthFactor: fraction.clamp(0, 1), child: Container(color: color)),
        ),
      );
}

/// Highlighted stat card: big numbers at the sides, label centred.
class StatCallout extends StatelessWidget {
  const StatCallout({super.key, required this.label, required this.home, required this.away, this.homeNum, this.awayNum});
  final String label;
  final String home;
  final String away;
  final double? homeNum;
  final double? awayNum;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final total = (homeNum ?? 0) + (awayNum ?? 0);
    return Container(
      margin: const EdgeInsets.fromLTRB(Space.gutter, Space.s, Space.gutter, Space.m),
      padding: const EdgeInsets.symmetric(horizontal: Space.xl, vertical: 10),
      height: Sizes.statCallout,
      decoration: BoxDecoration(color: c.bgSecondary, borderRadius: BorderRadius.circular(Radii.large)),
      child: Column(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Row(children: [
          Text(home, style: A1Text.calloutValue.copyWith(color: c.contentPrimary)),
          Expanded(child: Text(label, textAlign: TextAlign.center, style: A1Text.statLabel.copyWith(color: c.contentPrimary))),
          Text(away, style: A1Text.calloutValue.copyWith(color: c.contentPrimary)),
        ]),
        if (total > 0)
          Row(children: [
            Expanded(child: _Bar(fraction: homeNum! / total, color: homeNum! >= awayNum! ? c.statHome : c.statMuted, fromEnd: true)),
            const SizedBox(width: Space.xs),
            Expanded(child: _Bar(fraction: awayNum! / total, color: awayNum! >= homeNum! ? c.statAway : c.statMuted)),
          ]),
      ]),
    );
  }
}

/// Loading / error / empty wrapper for FutureBuilder results.
class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({super.key, required this.snapshot, required this.builder, this.onRetry, this.isEmpty, this.empty});
  final AsyncSnapshot<T> snapshot;
  final Widget Function(T data) builder;
  final VoidCallback? onRetry;
  final bool Function(T data)? isEmpty;
  final Widget? empty;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    if (snapshot.hasError) {
      return EmptyState(
        icon: Icons.wifi_off_rounded,
        title: 'Couldn’t load this',
        body: '${snapshot.error}',
        actionLabel: onRetry == null ? null : 'Try again',
        onAction: onRetry,
      );
    }
    if (!snapshot.hasData) {
      return Center(child: CircularProgressIndicator(color: c.brand, strokeWidth: 2.5));
    }
    final data = snapshot.data as T;
    if (isEmpty?.call(data) ?? false) return empty ?? const EmptyState(icon: Icons.inbox_outlined, title: 'Nothing here yet');
    return builder(data);
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.body, this.actionLabel, this.onAction});
  final IconData icon;
  final String title;
  final String? body;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Space.xxl),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 300),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 64, color: c.borderStrong),
            const SizedBox(height: Space.l),
            Text(title, textAlign: TextAlign.center, style: A1Text.leagueName.copyWith(color: c.contentPrimary)),
            if (body != null) ...[
              const SizedBox(height: Space.s),
              Text(body!, textAlign: TextAlign.center, style: A1Text.body.copyWith(color: c.contentSecondary)),
            ],
            if (actionLabel != null) ...[
              const SizedBox(height: Space.xl),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: c.buttonPrimaryBg,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.base)),
                ),
                onPressed: onAction,
                child: Text(actionLabel!.toUpperCase(), style: A1Text.chip),
              ),
            ],
          ]),
        ),
      ),
    );
  }
}
