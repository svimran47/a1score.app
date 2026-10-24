import 'package:flutter/material.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// Days the date strip and day pager cover, either side of today.
const dayRange = 30;

DateTime dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

/// Page index <-> day, with today at [dayRange].
DateTime dayForIndex(int i) => dateOnly(DateTime.now()).add(Duration(days: i - dayRange));
int indexForDay(DateTime d) => dateOnly(d).difference(dateOnly(DateTime.now())).inDays + dayRange;

/// Horizontal strip of days on the app bar, with the selected day centred and a
/// calendar button that opens a month view.
class DateStrip extends StatefulWidget {
  const DateStrip({super.key, required this.selected, required this.onSelected});
  final DateTime selected;
  final ValueChanged<DateTime> onSelected;

  static const double height = 64;

  @override
  State<DateStrip> createState() => _DateStripState();
}

class _DateStripState extends State<DateStrip> {
  static const _itemWidth = 54.0;
  static const _gap = 6.0;
  final _scroll = ScrollController();
  double _viewport = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _centre(animate: false));
  }

  @override
  void didUpdateWidget(DateStrip old) {
    super.didUpdateWidget(old);
    if (!DateUtils.isSameDay(old.selected, widget.selected)) _centre();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _centre({bool animate = true}) {
    if (!_scroll.hasClients) return;
    final i = indexForDay(widget.selected);
    final target = (Space.m + i * (_itemWidth + _gap) + _itemWidth / 2 - _viewport / 2).clamp(
      0.0,
      _scroll.position.maxScrollExtent,
    );
    if (animate) {
      _scroll.animateTo(target, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    } else {
      _scroll.jumpTo(target);
    }
  }

  Future<void> _openCalendar() async {
    final picked = await showModalBottomSheet<DateTime>(
      context: context,
      showDragHandle: true,
      builder: (_) => _CalendarSheet(selected: widget.selected),
    );
    if (picked != null) widget.onSelected(picked);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final today = dateOnly(DateTime.now());
    return SizedBox(
      height: DateStrip.height,
      child: Row(
        children: [
          Expanded(
            child: LayoutBuilder(
              builder: (context, box) {
                _viewport = box.maxWidth;
                return ListView.separated(
                  controller: _scroll,
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: Space.m, vertical: 6),
                  itemCount: dayRange * 2 + 1,
                  separatorBuilder: (_, _) => const SizedBox(width: _gap),
                  itemBuilder: (_, i) {
                    final d = dayForIndex(i);
                    final active = DateUtils.isSameDay(d, widget.selected);
                    final isToday = d == today;
                    final fg = active ? c.contentInverse : c.appBarContent.withValues(alpha: isToday ? 1 : 0.72);
                    return Material(
                      color: active ? c.brand : Colors.transparent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(Radii.large),
                        side: isToday && !active
                            ? BorderSide(color: c.appBarContent.withValues(alpha: 0.4))
                            : BorderSide.none,
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(Radii.large),
                        onTap: () => widget.onSelected(d),
                        child: SizedBox(
                          width: _itemWidth,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                isToday ? 'TODAY' : DateFormat('EEE').format(d).toUpperCase(),
                                style: A1Text.badge.copyWith(color: fg, fontSize: 10),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                DateFormat('d MMM').format(d),
                                style: A1Text.kickoff.copyWith(color: fg, fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          IconButton(
            tooltip: 'Calendar',
            onPressed: _openCalendar,
            icon: Icon(Icons.calendar_month_outlined, color: c.appBarContent),
          ),
          const SizedBox(width: Space.s),
        ],
      ),
    );
  }
}

class _CalendarSheet extends StatelessWidget {
  const _CalendarSheet({required this.selected});
  final DateTime selected;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final today = dateOnly(DateTime.now());
    Widget quick(String label, int offset) {
      final d = today.add(Duration(days: offset));
      final on = DateUtils.isSameDay(d, selected);
      return Expanded(
        child: OutlinedButton(
          style: OutlinedButton.styleFrom(
            backgroundColor: on ? c.brand : null,
            foregroundColor: on ? c.contentInverse : c.contentPrimary,
            side: BorderSide(color: on ? c.brand : c.border),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.medium)),
            padding: const EdgeInsets.symmetric(horizontal: Space.m),
          ),
          onPressed: () => Navigator.pop(context, d),
          child: FittedBox(child: Text(label.toUpperCase(), maxLines: 1, style: A1Text.chip)),
        ),
      );
    }

    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
            child: Row(
              children: [
                quick('Yesterday', -1),
                const SizedBox(width: Space.m),
                quick('Today', 0),
                const SizedBox(width: Space.m),
                quick('Tomorrow', 1),
              ],
            ),
          ),
          CalendarDatePicker(
            initialDate: selected,
            firstDate: today.subtract(const Duration(days: dayRange)),
            lastDate: today.add(const Duration(days: dayRange)),
            currentDate: today,
            onDateChanged: (d) => Navigator.pop(context, d),
          ),
        ],
      ),
    );
  }
}
