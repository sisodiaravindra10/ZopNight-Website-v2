#!/usr/bin/env bash
# ZopDev design-system lint — fail if production HTML at root violates the
# explicit rules in tokens.css.
#
# Rules enforced:
#   1. NO linear-gradient / radial-gradient on components
#      (repeating-linear-gradient for grid washes is permitted)
#   2. border-radius: 0 globally
#      (9999px and 50% permitted for status pills / dots)
#   3. backdrop-filter only on the homepage nav
#   4. Brand spelling — never "Zop.Dev" with a period
#
# Run from repo root:
#   ./lint-design-system.sh
#   VERBOSE=1 ./lint-design-system.sh   (show line numbers)
set -e
cd "$(dirname "$0")"

EXIT=0
EXCLUDE_DIR='_explorations/|node_modules/|brand-launch/'
# Exclusions:
#   index\.html       — frozen safety copy, not edited
#   index\.backup\.html — working homepage (gets the same exceptions: nav blur, grid washes)
#   *-variants\.html  — designer exploration files (cursor, loader, feature-layout)
#   _shell\.html      — page template, not a real page
EXCLUDE_FILE='index\.html$|index\.backup\.html$|-variants\.html$|_shell\.html$'

violation() { echo "❌ $1"; EXIT=1; }

echo ""
echo "[lint] 1 / 4 · gradient ban (repeating-linear-gradient permitted)"
HITS=""
for f in *.html; do
  [ -f "$f" ] || continue
  echo "$f" | grep -qE "$EXCLUDE_DIR|$EXCLUDE_FILE" && continue
  # exclude doc-only lines (· no gradients ·), the permitted repeating wash,
  # and any line that's prose inside <li>, <p>, <h1-6>, <strong>, <code>, <span>
  # (these are pages documenting the brand rule, not violating it)
  found=$(grep -nE 'linear-gradient|radial-gradient' "$f" | \
          grep -vE 'repeating-linear-gradient' | \
          grep -vE '·\s*no\s+(gradients|blur)' | \
          grep -vE '<(li|p|h[1-6]|strong|em|code|span|td|th|figcaption)\b' | \
          grep -vE '^\s*[0-9]+:\s*\*' || true)
  if [ -n "$found" ]; then
    HITS="$HITS  $f\n"
    if [ -n "$VERBOSE" ]; then echo "$found" | sed "s|^|    $f:|"; fi
  fi
done
if [ -n "$HITS" ]; then
  printf "$HITS"
  violation "gradient violations above"
else
  echo "  ok"
fi

echo ""
echo "[lint] 2 / 4 · border-radius ban (9999px + 50% permitted for status pills)"
HITS=""
for f in *.html; do
  [ -f "$f" ] || continue
  echo "$f" | grep -qE "$EXCLUDE_DIR|$EXCLUDE_FILE" && continue
  # allow: 9999px | 50% | mentions inside doc tags
  found=$(grep -nE 'border-radius:\s*[1-9]' "$f" | \
          grep -vE 'border-radius:\s*9999px' | \
          grep -vE 'border-radius:\s*50%' | \
          grep -vE '<code|<p>|<li>|<span' || true)
  if [ -n "$found" ]; then
    HITS="$HITS  $f\n"
    if [ -n "$VERBOSE" ]; then echo "$found" | sed "s|^|    $f:|"; fi
  fi
done
if [ -n "$HITS" ]; then
  printf "$HITS"
  violation "border-radius violations above"
else
  echo "  ok"
fi

echo ""
echo "[lint] 3 / 4 · backdrop-filter ban (homepage nav exception only)"
HITS=""
for f in *.html; do
  [ -f "$f" ] || continue
  echo "$f" | grep -qE "$EXCLUDE_DIR|$EXCLUDE_FILE" && continue
  # only flag actual USAGE lines, not documentation that mentions the rule
  found=$(grep -nE 'backdrop-filter:\s*(blur|saturate|brightness|hue-rotate)' "$f" | \
          grep -v '· no ' || true)
  if [ -n "$found" ]; then
    HITS="$HITS  $f\n"
    if [ -n "$VERBOSE" ]; then echo "$found" | sed "s|^|    $f:|"; fi
  fi
done
if [ -n "$HITS" ]; then
  printf "$HITS"
  violation "backdrop-filter violations above"
else
  echo "  ok"
fi

echo ""
echo "[lint] 4 / 4 · brand-name spelling (no 'Zop.Dev' with a period)"
HITS=$(grep -lE "Zop\.Dev" *.html 2>/dev/null | grep -vE "$EXCLUDE_DIR" || true)
if [ -n "$HITS" ]; then
  echo "$HITS" | sed 's/^/  /'
  violation "stale 'Zop.Dev' brand spelling above"
else
  echo "  ok"
fi

echo ""
if [ $EXIT -eq 0 ]; then
  echo "[lint] ✅ all checks passed"
else
  echo "[lint] ⚠️  fix the violations above and re-run"
  echo "       run with VERBOSE=1 to see line numbers"
fi
exit $EXIT
