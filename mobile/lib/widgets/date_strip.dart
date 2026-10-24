import 'package:flutter/material.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// Days the date header and day pager cover, either side of today.
const dayRange = 10;

DateTime dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

/// Page index <-> day, with today at [dayRange].
DateTime dayForIndex(int i) => dateOnly(DateTime.now()).add(Duration(days: i - dayRange));
int indexForDay(DateTime d) => dateOnly(d).difference(dateOnly(DateTime.now())).inDays + dayRange;

/// "Today 25.10.", "Yesterday 24.10.", "Sun 26.10."
String dayLabel(DateTime d) {
  final dm = DateFormat('dd.MM.').format(d);
  return switch (dateOnly(d).difference(dateOnly(DateTime.now())).inDays) {
    0 => 'Today $dm',
    1 => 'Tomorrow $dm',
    -1 => 'Yesterday $dm',
    _ => '${DateFormat('EEE').format(d)} $dm',
  };
}

/// The 48 dp date row under the app bar: selected day on the left, calendar button
/// on the right that drops down a short scrolling list of days.
class DateHeader extends StatelessWidget {
  const DateHeader({super.key, required this.selected, required this.onSelected});
  final DateTime selected;
  final ValueChanged<DateTime> onSelected;

  Future<void> _open(BuildContext context) async {
    final box = context.findRenderObject() as RenderBox?;
    final top = box == null ? 120.0 : box.localToGlobal(Offset(0, box.size.height)).dy;
    final picked = await showDialog<DateTime>(
      context: context,
      barrierColor: Colors.black26,
      builder: (_) => _DayDropdown(selected: selected, top: top),
    );
    if (picked != null) onSelected(picked);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Material(
      color: c.bgPrimary,
      child: InkWell(
        onTap: () => _open(context),
        child: Container(
          height: Sizes.dateRow,
          padding: const EdgeInsets.only(left: Space.gutter, right: Space.s),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
          child: Row(children: [
            Expanded(child: Text(dayLabel(selected), style: A1Text.dateRow.copyWith(color: c.contentPrimary))),
            IconButton(
              tooltip: 'Calendar',
              onPressed: () => _open(context),
              icon: Icon(Icons.calendar_month_outlined, color: c.contentPrimary),
            ),
          ]),
        ),
      ),
    );
  }
}

/// Dropdown under the calendar button: one row per day, scrolls up and down,
/// opened on the selected day.
class _DayDropdown extends StatefulWidget {
  const _DayDropdown({required this.selected, required this.top});
  final DateTime selected;
  final double top;

  @override
  State<_DayDropdown> createState() => _DayDropdownState();
}

class _DayDropdownState extends State<_DayDropdown> {
  static const _rowHeight = 44.0;
  static const _visibleRows = 7;
  late final _scroll = ScrollController(
    initialScrollOffset: (indexForDay(widget.selected) - _visibleRows ~/ 2).clamp(0, dayRange * 2) * _rowHeight,
  );

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final today = dateOnly(DateTime.now());
    return Stack(children: [
      Positioned(
        top: widget.top,
        right: Space.m,
        width: 200,
        height: _rowHeight * _visibleRows,
        child: Material(
          color: c.bgCard,
          elevation: 8,
          borderRadius: BorderRadius.circular(Radii.large),
          clipBehavior: Clip.antiAlias,
          child: ListView.builder(
            controller: _scroll,
            itemExtent: _rowHeight,
            itemCount: dayRange * 2 + 1,
            itemBuilder: (_, i) {
              final d = dayForIndex(i);
              final on = DateUtils.isSameDay(d, widget.selected);
              return InkWell(
                onTap: () => Navigator.pop(context, d),
                child: Container(
                  color: on ? c.bgHighlight : null,
                  padding: const EdgeInsets.symmetric(horizontal: Space.xl),
                  alignment: Alignment.centerLeft,
                  child: Text(
                    dayLabel(d),
                    style: A1Text.settingsLabel.copyWith(
                      color: on ? c.brand : c.contentPrimary,
                      fontWeight: on || d == today ? FontWeight.w700 : FontWeight.w400,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    ]);
  }
}
