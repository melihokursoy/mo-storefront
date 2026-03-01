# mo-storefront

A modern monorepo for building storefront applications, powered by [Nx](https://nx.dev).

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/melihokursoy/mo-storefront.git
cd mo-storefront

# Install dependencies
npm install
# or: yarn install / pnpm install / bun install
```

## Development

### Build & Test

```bash
# Build all packages
npx nx run-many --target=build

# Run tests
npx nx run-many --target=test

# Lint code
npx nx run-many --target=lint

# Type check
npx nx run-many --target=typecheck
```

### Create New Packages

To add a new library to the workspace:

```bash
npx nx generate @nx/js:lib packages/my-package --publishable
```

## Project Structure

This is an Nx monorepo with the following structure:

```
mo-storefront/
├── packages/           # Workspace packages/libraries
├── .claude/            # Claude Code configuration
│   └── commands/       # Custom Claude Code commands
├── _spec/              # Feature specification templates
├── nx.json            # Nx workspace configuration
├── package.json       # Root dependencies
└── tsconfig.json      # TypeScript configuration
```

## Custom Commands

This project includes custom [Claude Code](https://claude.com/claude-code) commands for streamlined development:

- **`/spec`** - Create a feature specification and branch
- **`/commit`** - Generate a commit message from staged changes

### Development Workflow

1. Use `/spec "feature description"` to create a feature specification and branch
2. Implement the feature on the new branch
3. Use `/commit` to create a well-formatted commit message
4. Push to GitHub and create a pull request

## Technologies

- **[Nx](https://nx.dev)** - Build system and monorepo management
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Prettier](https://prettier.io/)** - Code formatting

## License

MIT

## Resources

- [Nx Documentation](https://nx.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Nx Console Extension](https://nx.dev/getting-started/editor-setup)
