# Create Learning Documentation

Create a comprehensive learning document for a technical refactor, feature, or architectural decision. The document should be structured for knowledge sharing and suitable for public codebases.

## Document Structure

### Header

- **Date:** [Current date]
- **Context:** [Brief description of what was being worked on]
- **Outcome:** [What was achieved]

### 1. The Problem

- Clearly state what problem was being solved
- List specific issues or pain points
- Include code smells or technical debt indicators
- Quantify the impact if possible (e.g., "50+ lines of boilerplate per window type")

### 2. Design Patterns Used

For each pattern, include:

**Pattern Name: [Name]**

**Problem:** [What specific problem this pattern solves]

**Solution:** [Code example showing the implementation]

```typescript
// Show actual code from the codebase
```

**Benefits:**

- **Benefit 1:** [Clear, specific benefit]
- **Benefit 2:** [Another benefit]
- **Benefit 3:** [Third benefit]

**Key Insight:**

> [2-3 sentence explanation of why this pattern was chosen and how it creates leverage. Write in first person plural: "We used..." or "This allows us to..."]

### 3. Architecture Decisions

For each major decision:

**Decision:** [What was decided]

**Reasoning:**

- [Clear explanation of why this choice was made]
- [What alternatives were considered]
- [What trade-offs exist]

**Trade-off:** [Honest assessment of what was given up or what complexity was added]

### 4. Building Leverage

Show concrete before/after:

**Before: [Adding Feature/Component]**

```typescript
// Show the old way - verbose, duplicated code
```

**After: [Adding Feature/Component]**

```typescript
// Show the new way - clean, reusable
```

**Leverage Created:**

- **X% reduction** in [metric]
- **Consistent behavior** across [scope]
- **Single point of change** for [what]
- **Future features** can be added [how easily]

### 5. UI/UX Patterns

For each UX improvement:

**Pattern:** [Pattern name]

**Implementation:**

```typescript
// Code showing how it works
```

**UX Benefit:** [What the user experiences]

### 6. Key Points

Summarize the most important takeaways:

**Topic 1: [Name]**
[2-3 sentences explaining the concept and its importance]

**Topic 2: [Name]**
[2-3 sentences]

Continue for 3-5 key topics covering:

- Code reusability
- State management approach
- Design patterns summary
- How to extend the system
- Consistency guarantees

### 7. Key Metrics

Quantify improvements:

- **Lines of code reduced:** [number]
- **Time to [action]:** [before] → [after]
- **Consistency:** [metric]%
- **Test coverage:** [what can be tested]

### 8. Future Extensibility

List what this architecture enables:

1. **[Feature]** - [How it's enabled]
2. **[Feature]** - [How it's enabled]
3. **[Feature]** - [How it's enabled]

### 9. Lessons Learned

Numbered list of insights:

1. **[Insight]** - [Brief explanation]
2. **[Insight]** - [Brief explanation]
3. **[Insight]** - [Brief explanation]

### 10. Conclusion

2-3 paragraphs summarizing:

- What was achieved
- How it creates leverage
- Why it matters for the project

## Writing Guidelines

### Tone

- **Professional but accessible** - Technical but not academic
- **First person plural** - "We used...", "We implemented..."
- **Confident but humble** - Show decisions without being preachy
- **No interview language** - Avoid "talking points", "interview answers", etc.

### Code Examples

- Use actual code from the codebase
- Include file paths in comments when helpful
- Show before/after when demonstrating improvements
- Keep examples focused and readable

### Structure

- **Clear headings** - Easy to scan
- **Bullet points** - For lists and benefits
- **Code blocks** - For all code examples
- **Bold for emphasis** - Key terms and metrics

### Content Principles

- **Show, don't just tell** - Use code examples
- **Be specific** - Quantify improvements
- **Explain trade-offs** - Honest about decisions
- **Focus on leverage** - How this helps future work
- **Connect to patterns** - Reference established patterns

### What to Include

- ✅ Concrete code examples
- ✅ Before/after comparisons
- ✅ Quantified metrics
- ✅ Design pattern explanations
- ✅ Architecture rationale
- ✅ Future extensibility

### What to Avoid

- ❌ Interview prep language
- ❌ Vague statements without examples
- ❌ Overly academic tone
- ❌ Marketing speak
- ❌ Unsubstantiated claims

## Example Prompts

### For a Refactor

"Document the [feature/refactor] we just completed. Focus on the design patterns we used, how we eliminated duplication, and the leverage this creates for future development."

### For a New Feature

"Create a learning doc for the [feature] implementation. Explain the architecture decisions, patterns used, and how this enables future features."

### For an Architecture Decision

"Document our decision to [use X approach]. Include the alternatives we considered, trade-offs, and how this decision creates leverage."

## Output Format

Create a markdown file in `/docs/learnings/` with the filename:
`[feature-name]-[topic].md`

For example:

- `window-lifecycle-management-patterns.md`
- `routing-strategy-implementation.md`
- `state-management-architecture.md`
