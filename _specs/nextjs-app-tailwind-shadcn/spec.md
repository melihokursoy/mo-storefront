# Spec for Next.js App With Tailwind And Shadcn UI

branch: feature/nextjs-app-tailwind-shadcn

## Summary

Generate a new Next.js application within the monorepo workspace using Nx generators. The app should be pre-configured with Tailwind CSS for styling and Shadcn UI component library for accessible, composable UI components. The application should use a flat directory structure without a `src` folder, following modern Next.js conventions.

## Functional Requirements

- Generate a new Next.js application using `@nx/next` Nx plugin
- Configure Tailwind CSS for utility-first styling
- Set up Shadcn UI component library with out-of-the-box components
- Use a flat directory structure at the app root (no `src` folder)
- Ensure the app is properly integrated into the monorepo workspace
- App should be ready to serve immediately after generation
- Include necessary configuration files (tailwind.config.js, next.config.js, etc.)
- Configure TypeScript for type safety

## Possible Edge Cases

- Conflicting Tailwind configuration with other apps in the monorepo
- Nx cache invalidation after adding new dependencies
- Shadcn UI component installation conflicts with existing packages
- Next.js version compatibility with Tailwind and Shadcn
- Path aliases configuration in monorepo context

## Acceptance Criteria

- [ ] Next.js app is successfully generated with `npx nx generate @nx/next:app`
- [ ] Tailwind CSS is properly installed and configured
- [ ] Shadcn UI is initialized and at least one component is successfully added
- [ ] Project structure uses flat layout (no src directory)
- [ ] App runs without errors: `npx nx serve apps/<app-name>`
- [ ] Build completes successfully: `npx nx build apps/<app-name>`
- [ ] TypeScript compilation passes without errors
- [ ] Tailwind styles are applied correctly in the app
- [ ] Shadcn components render properly in the browser

## Open Questions

- Should we use `src` directory or root-level pages? (Requirement: no src folder)
- Which Shadcn UI components should be pre-installed?
- Should the app include example pages or start minimal?
- What import path alias should be used (@/components, etc.)?

## Testing Guidelines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Verify the Next.js app can be generated without errors
- Verify Tailwind CSS is properly configured and styles are applied
- Verify Shadcn UI components are installed and importable
- Verify the app builds successfully
- Verify the app serves without errors
