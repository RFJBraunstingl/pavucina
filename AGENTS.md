<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Coding guidelines
- always produce code that is well-structured, readable by humans, and maintainable by humans
- always keep files as small as possible while keeping cohesion high (code files should ideally not exceed 100 lines and should never exceed around 200 lines)
- always keep model files (objects, classes, types) in separate files
- always extract util methods in some other file to keep the implementation files short and easy to read
- always use meaningful names for variables, functions, and classes
- always use consistent formatting and indentation
- never use deprecated APIs or features
- never split a single function or class into it's own file if there are similar files - cohesion is important