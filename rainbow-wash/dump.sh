find src -type f \( -name "*.jsx" -o -name "*.js" -o -name "*.css" \) | sort | while read f; do echo; echo "===== $f ====="; cat "$f"; done

