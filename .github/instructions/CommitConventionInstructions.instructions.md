---
applyTo: 'gitlens.***,**/commits/**'
---
# Git Commit Conventions

## Format
```
<type>(<scope>): <description>

<body>

<footer>
```

## Types
- `feat` - new feature
- `fix` - bug fix
- `refactor` - code restructure (no behavior change)
- `perf` - performance improvement
- `style` - formatting only
- `test` - add/fix tests
- `docs` - documentation
- `build` - dependencies, build tools
- `ops` - CI/CD, infra, deployment
- `chore` - misc tasks (.gitignore, init)

## Rules
- **Scope**: optional context, not issue IDs
- **Description**: imperative present tense, lowercase, no period
- **Breaking changes**: add `!` before `:` (e.g., `feat!:`) and `BREAKING CHANGE:` in footer
- **Footer**: issue refs (`Closes #123`), breaking change details

## Examples
```
feat: add email notifications
feat(cart): add checkout button
fix(api): correct checksum calculation
feat!: remove endpoint

BREAKING CHANGE: list endpoint removed
```

---