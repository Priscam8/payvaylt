#!/usr/bin/env bash
set -euo pipefail

required_files=(
  "README.md"
  "CONTRIBUTING.md"
  ".editorconfig"
  ".gitignore"
  ".github/CODEOWNERS"
  ".github/pull_request_template.md"
  ".github/workflows/ci.yml"
)

is_text_file() {
  local mime_type
  mime_type="$(file -b --mime-type "$1")"

  [[ "${mime_type}" == text/* ]] \
    || [[ "${mime_type}" == application/json ]] \
    || [[ "${mime_type}" == application/xml ]] \
    || [[ "${mime_type}" == application/x-sh ]] \
    || [[ "${mime_type}" == application/javascript ]]
}

check_required_files() {
  local missing=0

  for path in "${required_files[@]}"; do
    if [[ ! -f "${path}" ]]; then
      echo "Missing required file: ${path}"
      missing=1
    fi
  done

  if [[ "${missing}" -ne 0 ]]; then
    exit 1
  fi
}

check_workflow_triggers() {
  if ! grep -q "pull_request:" .github/workflows/ci.yml; then
    echo "CI workflow must run on pull requests."
    exit 1
  fi
}

check_line_endings() {
  local failed=0

  while IFS= read -r -d '' file; do
    if ! is_text_file "${file}"; then
      continue
    fi

    if grep -q $'\r' "${file}"; then
      echo "Windows line endings detected in ${file}"
      failed=1
    fi
  done < <(find . -type f \
    ! -path "./.git/*" \
    ! -path "./node_modules/*" \
    ! -path "./dist/*" \
    ! -path "./build/*" \
    -print0)

  if [[ "${failed}" -ne 0 ]]; then
    exit 1
  fi
}

check_trailing_whitespace() {
  local failed=0

  while IFS= read -r -d '' file; do
    if grep -n '[[:blank:]]$' "${file}" >/dev/null; then
      echo "Trailing whitespace detected in ${file}"
      failed=1
    fi
  done < <(find . -type f \
    ! -path "./.git/*" \
    ! -path "./node_modules/*" \
    ! -path "./dist/*" \
    ! -path "./build/*" \
    \( -name "*.md" -o -name "*.sh" -o -name "*.yml" -o -name "*.yaml" -o -name ".gitignore" -o -name ".editorconfig" \) \
    -print0)

  if [[ "${failed}" -ne 0 ]]; then
    exit 1
  fi
}

check_shell_syntax() {
  while IFS= read -r -d '' file; do
    bash -n "${file}"
  done < <(find scripts -type f -name "*.sh" -print0)
}

main() {
  check_required_files
  check_workflow_triggers
  check_line_endings
  check_trailing_whitespace
  check_shell_syntax

  echo "Repository health checks passed."
}

main "$@"
