#!/bin/sh
# Поднимает версию кэша ?v=NNNNNNNNN во всех файлах. Без найденной версии ничего не трогает.
set -e
cd "$(dirname "$0")/.."
OLD=$(grep -o "[0-9]\{9\}" tools/version.js | head -1)
[ -n "$OLD" ] || { echo "bump: версия не найдена" >&2; exit 1; }
NEW=$((OLD+1))
grep -rl "v=$OLD" --include=*.html --include=*.js --include=*.css . | grep -v node_modules | xargs sed -i "s/v=$OLD/v=$NEW/g"
sed -i "s/$OLD/$NEW/" tools/version.js
echo "bump: $OLD → $NEW"
