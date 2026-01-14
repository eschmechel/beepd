# Contributing to Beepd

Thank you for your interest in contributing to Beepd! This document provides guidelines and best practices for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

---

## Code of Conduct

By participating in this project, you agree to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other contributors

---

## Getting Started

### Prerequisites

- Node.js 20.x LTS
- pnpm 9.x
- Git

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/beepd.git
cd beepd

# Add upstream remote
git remote add upstream https://github.com/your-org/beepd.git

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
```

See [docs/SETUP.md](./docs/SETUP.md) for detailed setup instructions.

---

## Development Workflow

### Branch Strategy

```
main                    # Production-ready code
├── develop             # Integration branch
│   ├── feature/*       # New features
│   ├── fix/*           # Bug fixes
│   └── chore/*         # Maintenance
```

### Creating a Feature Branch

```bash
# Sync with upstream
git checkout develop
git pull upstream develop

# Create feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in small, focused commits
2. Run tests frequently: `pnpm test`
3. Ensure code passes linting: `pnpm lint`
4. Ensure types are correct: `pnpm typecheck`

### Submitting Changes

```bash
# Push your branch
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

---

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`pnpm test`)
- [ ] Code is linted (`pnpm lint`)
- [ ] Types are correct (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Documentation is updated (if needed)
- [ ] Commit messages follow guidelines

### PR Title Format

```
<type>(<scope>): <description>

Examples:
feat(mobile): add push notification support
fix(api): handle rate limiting errors
docs(readme): update installation steps
chore(deps): update dependencies
```

### PR Description Template

```markdown
## Summary

Brief description of what this PR does.

## Changes

- Change 1
- Change 2
- Change 3

## Testing

Describe how you tested these changes.

## Screenshots (if applicable)

Add screenshots for UI changes.

## Checklist

- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated
- [ ] No console.log statements
```

### Review Process

1. At least one approval required
2. All CI checks must pass
3. No merge conflicts
4. Reviewer may request changes

---

## Coding Standards

### TypeScript

- Use strict TypeScript
- Prefer `type` over `interface` for simple types
- Export types explicitly
- Avoid `any` - use `unknown` if type is truly unknown

```typescript
// Good
type UserSettings = {
  mode: SharingMode;
  radiusMeters: number;
};

// Avoid
interface IUserSettings {
  mode: any;
}
```

### React

- Use functional components
- Prefer hooks over class components
- Use meaningful component names
- Keep components small and focused

```typescript
// Good
export function NearbyUserCard({ user, onSelect }: NearbyUserCardProps) {
  return (
    <div onClick={() => onSelect(user.id)}>
      <span>{user.displayName}</span>
    </div>
  );
}

// Avoid
export function Card(props: any) {
  // ...
}
```

### File Organization

```
components/
├── Button/
│   ├── Button.tsx        # Component
│   ├── Button.test.tsx   # Tests
│   └── index.ts          # Export
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | PascalCase (components), camelCase (utils) | `NearbyList.tsx`, `geolocation.ts` |
| Components | PascalCase | `NearbyUserCard` |
| Functions | camelCase | `calculateDistance` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RADIUS_METERS` |
| Types | PascalCase | `UserSettings` |

---

## Commit Messages

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that doesn't fix or add |
| `test` | Adding/updating tests |
| `chore` | Maintenance tasks |

### Scopes

| Scope | Description |
|-------|-------------|
| `api` | Backend API changes |
| `web` | Web app changes |
| `mobile` | Mobile app changes |
| `ui` | Shared UI package |
| `shared` | Shared utilities |
| `docs` | Documentation |
| `ci` | CI/CD changes |

### Examples

```
feat(mobile): add background location tracking

Implement background location updates using expo-location.
Updates are batched every 30 seconds to conserve battery.

Closes #123
```

```
fix(api): handle expired JWT gracefully

Return 401 with clear error message instead of 500.
```

```
chore(deps): update dependencies

- vitest 1.2.0 -> 1.3.0
- @types/node 20.10.0 -> 20.11.0
```

---

## Testing Requirements

### Coverage Minimums

| Metric | Minimum |
|--------|---------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

### What to Test

- Business logic functions (unit tests)
- API endpoints (integration tests)
- React components (component tests)
- Critical user flows (E2E tests)

### What NOT to Test

- Third-party library internals
- Static content
- Implementation details

See [docs/TESTING.md](./docs/TESTING.md) for detailed testing guidelines.

---

## Documentation

### When to Update Docs

- New features require documentation
- API changes require updated API docs
- Configuration changes require setup updates

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `docs/SETUP.md` | Development setup |
| `docs/ARCHITECTURE.md` | System design |
| `docs/API.md` | API reference |
| `docs/DEPLOYMENT.md` | Deployment guide |

### Code Comments

- Comment "why", not "what"
- Use JSDoc for public functions
- Keep comments up-to-date

```typescript
/**
 * Calculate the distance between two geographic coordinates.
 * Uses the Haversine formula for accuracy over short distances.
 * 
 * @param from - Starting coordinate
 * @param to - Ending coordinate
 * @returns Distance in meters
 */
export function calculateDistance(from: Coordinate, to: Coordinate): number {
  // Use Haversine formula because Earth is not flat
  // and we need accuracy for proximity detection
  // ...
}
```

---

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Security**: Email security@beepd.app (do not open public issues)

---

## Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes for significant contributions
- GitHub contributors page

Thank you for contributing to Beepd!
