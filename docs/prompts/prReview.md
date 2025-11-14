# PR Review Guidelines

Review pull requests for this Mac OS X 10.1 Aqua-themed portfolio with the following criteria:

## Code Quality

- **Self-documenting code**: Code should explain itself. Comments should only appear for obscure components, tricky logic, or non-obvious decisions. If code needs a comment, consider if it can be made clearer instead. Comments should be natural and human-like, not verbose or robotic.
- Functions should be small (< 50 lines) and focused (single responsibility)
- Use early returns for readability
- Proper TypeScript types (no `any`)
- Follow naming conventions (PascalCase for components, camelCase for functions, UPPER_SNAKE_CASE for constants)

## Design & Aesthetics

- Maintains Mac OS X 10.1 Aqua aesthetic (gel buttons, pinstripes, soft shadows, signature blue)
- Feels like a desktop app, not a website (window chrome, menubar, dock)
- No responsive breakpoints (this is a desktop OS, not a responsive website)
- Use semantic styling: Tailwind classes should convey meaning and purpose, not just visual appearance

## Technical Standards

- Follows project structure conventions
- Proper error handling and accessibility features
- No TODOs or placeholders
- Complete implementation with all required imports

## Security

- Validates and sanitizes all user inputs
- No sensitive information exposed in client-side code
- Proper handling of user-generated content
- No XSS vulnerabilities (especially in content rendering)
- Secure handling of external URLs and iframes
- No hardcoded secrets or API keys

## Maintainability

- **Simple solutions over clever ones**: Code should be straightforward and easy to understand
- **Easy future iteration**: Solutions should allow for easy modification and extension
- Avoid over-engineering or premature optimization
- Clear separation of concerns
- Functions and components are focused and reusable
- Changes should be small and incremental, not massive rewrites

## Performance

- Proper memoization where needed
- No unnecessary re-renders
- Efficient data structures and algorithms
- Lazy loading where appropriate

## Review Focus

- Is the code simple and readable over clever?
- Does it maintain the Aqua aesthetic?
- Are there unnecessary comments that should be removed or code that should be clearer?
- Are there security vulnerabilities, especially around user input and content rendering?
- Will this solution be easy to modify or extend in the future?
- Does it follow the project's conventions and structure?
