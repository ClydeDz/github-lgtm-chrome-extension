---
name: create-pr
description: "Create or prepare a GitHub pull request for this Chrome extension repo. Use when writing the PR title/body, checking issue references, and validating the repo's required build, test, and version-bump steps."
---

# Create a pull request for GitHub LGTM

Use this workflow when preparing a pull request for this repository. Keep the PR aligned with the project's contribution process and the repository's existing `.github/pull_request_template.md`.

## Repo-specific context

- Read `AGENTS.md`, `.github/pull_request_template.md`, and `docs/CONTRIBUTING.md` before drafting or opening a PR.
- This repo is a plain JavaScript Manifest V3 Chrome extension. There is no backend and the extension stores user data in `chrome.storage.sync` only.
- Any release change must bump the version in both `src/manifest.json` and `package.json`.
- The supported validation flow is `npm ci` → `npm run lint` → `npm run build:prod` → `npm run test:ci`.
- Keep `README.md` and `docs/README.md` in sync when editing documentation.

## Procedure

1. Inspect the branch, repo state, and working tree. Confirm the change set is scoped to one reviewable unit and does not include unrelated work.
2. Read `.github/pull_request_template.md` and follow it exactly. Keep the existing headings, order, checkbox wording, and checklist items. Do not replace the template with a new format or add extra sections such as “Summary of changes” or “Testing.”
3. Review the actual code changes and choose a concise PR title. It should state the user-visible change or fix in a short, direct way.
4. Find related open issues with `gh issue list --state open` and compare them to the change. In the template's “Does this fix an open issue?” section, list only issues the PR actually resolves as `Closes #<number>`. Mention issues that are related but not fixed separately; do not invent a link where the connection is uncertain.
5. Run the repo's required validation locally before marking the checklist complete. At minimum, use the documented CI flow: `npm ci`, `npm run lint`, `npm run build:prod`, and `npm run test:ci`. If any command fails, report the failing output and do not claim the checklist item passed.
6. Fill in the template body using the repo's real change details:
   - Under “What has changed and why?”, write a short bullet list of the actual code and behavior changes.
   - Use simple, direct sentences and common words.
   - Keep each bullet focused on one change.
   - State facts only; avoid vague claims or marketing language.
7. Answer the “Type of change” section by selecting one matching checkbox. Do not pick more than one type unless the change clearly fits multiple categories and the repository template explicitly allows it.
8. For the checklist items, only mark them complete when the evidence supports it. Leave “I've manually tested this change locally…” unchecked when no manual testing was performed.
9. Check whether the branch is ready to publish. Do not commit or push user changes without permission. If the branch is not pushed, or contains uncommitted changes that require a commit, ask before taking those steps.
10. Open the PR with GitHub CLI after the branch is available on GitHub, for example: `gh pr create --title "<title>" --body-file <path-to-template-output>` or equivalent `gh pr create --title "<title>" --body "<body>"`. Report the PR URL and any validation failures.

## Accuracy checks

- Only reference an issue when its open description matches the change and the PR resolves it.
- Only mark checklist items complete when there is evidence for them.
- Do not claim manual testing passed unless it was performed.
- If `gh` is missing or not authenticated, report the blocker and stop; do not switch to another GitHub client.
- Do not add extra PR sections or summaries beyond the repository template.
