#!/usr/bin/env bash
set -euo pipefail

OUT="expertwitness-context.txt"
: > "$OUT"

grab() {
  local label="$1"
  local pattern="$2"

  echo "====================" >> "$OUT"
  echo "=== $label" >> "$OUT"
  echo "====================" >> "$OUT"

  find src -iname "$pattern" -type f | while read -r file; do
    echo -e "\n----- FILE: \$file -----\n" >> "$OUT"
    cat "\$file" >> "$OUT"
    echo -e "\n" >> "$OUT"
  done
}

grab "PortalAssignments" "*PortalAssignments*"
grab "PDRoleBasedSelect" "*PDRoleBasedSelect*"
grab "StaffDirectory" "*StaffDirectory*"
grab "UpcomingEvents" "*UpcomingEvents*"
grab "ExpertWitnessDirectory (if any)" "*ExpertWitness*"

echo "Wrote context to \$OUT"
