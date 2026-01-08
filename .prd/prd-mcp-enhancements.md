# PRD MCP Server Enhancements - PRD

## Overview
This PRD outlines critical improvements to the PRD MCP server to resolve path resolution bugs, task parsing limitations, and workspace isolation friction points identified during pilot testing. These enhancements will enable seamless integration with OpenCode agents without manual symlink configuration.

## Problem Statement
The current `prd_mcp` server (v1.0.0) has three critical usability gaps that prevent smooth agent integration:

1. **Workspace Isolation**: Server defaults to `~/.config/opencode/prd_mcp/.prd/` instead of project-specific `.prd/` directories, requiring manual symlinks
2. **Brittle Path Handling**: Tools reject relative/absolute paths, only accepting naked filenames (e.g., `auth.md` works, `./.prd/auth.md` fails)
3. **Strict Task Parsing**: Only recognizes GFM checkboxes (`- [ ]`), ignoring heading-based tasks (`### Task 1.1: Title`) used in many PRD templates

**Impact**: Agents encounter "File not found" errors even when files exist, require manual debugging, and must restructure PRD formats to match parser expectations—violating the principle of minimal agent friction.

## Goals
- [ ] **Zero-Config Setup**: Agents can use PRD MCP tools immediately without manual symlink configuration
- [ ] **Path Flexibility**: Tools accept absolute paths, relative paths, and naked filenames transparently
- [ ] **Format Flexibility**: Parser supports both checkbox tasks and heading-based tasks without configuration
- [ ] **Performance**: Maintain <50ms scan time for typical projects (<100 PRD files)
- [ ] **Backward Compatibility**: Existing checkbox-based PRDs continue working without changes

## Non-Goals
- **MCP Protocol Changes**: Not modifying the MCP transport layer or core protocol
- **Database Migration**: Not adding persistent storage; remains file-based scanning
- **Multi-Project Support**: Not supporting simultaneous monitoring of multiple `.prd/` directories (single root only)
- **PRD Validation Logic**: Not adding complex validation beyond structure checks (syntax only, not semantics)
- **Real-time Watching**: Not implementing file watchers (relying on 5-second cache invalidation is sufficient)

## Requirements

### Functional Requirements

- **[FR-1] Root Path Configuration**
  - Server MUST accept `--root=<path>` command-line argument to set the PRD directory
  - Server MUST default to `process.cwd()/.prd/` when `--root` is not provided
  - Server MUST validate the directory exists on startup and fail fast with clear error if missing

- **[FR-2] Path Normalization**
  - All tool handlers MUST accept these path formats:
    - Naked filename: `auth.md`
    - Relative path: `./.prd/auth.md`, `prd/auth.md`
    - Absolute path: `/home/user/project/.prd/auth.md`
  - Tool handlers MUST strip directory prefixes and use only filename for lookups
  - Tool handlers MUST preserve absolute paths for error messages (debugging)

- **[FR-3] Multi-Format Task Parsing**
  - Parser MUST recognize GFM checkboxes: `- [ ] Task text`
  - Parser MUST recognize heading tasks: `### Task 1.1: Task text` or `## Task 1.1: Task text`
  - Parser MUST ignore tasks outside "Task Breakdown" sections (configurable)
  - Parser MUST support nested checkbox tasks (indentation-based)

- **[FR-4] Task ID Stability**
  - Task IDs MUST remain stable across file edits (not line-number dependent)
  - Task IDs for heading-based tasks MUST use heading content hash, not position
  - Task IDs for checkbox tasks MUST use content hash + line number for uniqueness

- **[FR-5] Error Messages**
  - "File not found" errors MUST include the full path searched
  - "No tasks found" errors MUST indicate which file was scanned
  - Path resolution errors MUST show the normalized path used

### Non-Functional Requirements

- **[NFR-1] Performance**
  - Directory scan MUST complete in <50ms for ≤100 files
  - Task parsing MUST process ≥1000 lines/second
  - Cache invalidation MUST NOT trigger full re-scans more than once per 5 seconds

- **[NFR-2] Backward Compatibility**
  - All existing checkbox-based PRDs MUST parse identically to v1.0.0
  - All existing tool behaviors MUST remain unchanged (only input handling expands)
  - No breaking changes to JSON-RPC method signatures or response formats

- **[NFR-3] Reliability**
  - Server MUST handle malformed markdown without crashing
  - Server MUST handle missing `.prd/` directory gracefully (return empty state)
  - Server MUST provide clear error messages for all failure modes

- **[NFR-4] Security**
  - Server MUST NOT traverse above configured root directory (path traversal protection)
  - Server MUST validate all file inputs are within root directory boundary

### Technical Requirements

- **[TR-1] TypeScript 5.4+**: Leverage strict typing for path handling
- **[TR-2] Node.js 18+**: Use modern `path` module with `path.resolve()` and `path.normalize()`
- **[TR-3] No New Dependencies**: Implement with existing `fs`, `path` modules only
- **[TR-4] Module Structure**: Maintain separation of concerns (scanner, updater, identifier)

## Proposed Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     OpenCode Agent                          │
└────────────────────────┬────────────────────────────────────┘
                         │ JSON-RPC
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  PRD MCP Server (Enhanced)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   index.ts  │───▶│ Tool Handler │───▶│Path Resolver │   │
│  │ (Entry Pt)  │    │  (Router)    │    │  (NEW)       │   │
│  └─────────────┘    └──────────────┘    └──────────────┘   │
│                              │                               │
│                              ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Project Scanner (Enhanced)               │  │
│  │  ┌──────────────────┐      ┌─────────────────────┐  │  │
│  │  │ Path Validator   │      │  Multi-Format       │  │  │
│  │  │ (Root Boundary)  │      │  Task Parser        │  │  │
│  │  └──────────────────┘      └─────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                               │
│                              ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 File Updater (Enhanced)               │  │
│  │  ┌──────────────────┐      ┌─────────────────────┐  │  │
│  │  │Path Sanitizer    │      │  Task State Manager │  │  │
│  │  │(Normalization)   │      │  (Cache Invalidation)│ │  │
│  │  └──────────────────┘      └─────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  .prd/ Directory    │
              │  (Project Root)     │
              └─────────────────────┘
```

### Component Breakdown

- **Path Resolver (NEW)**: Centralized path normalization utility
  - **Responsibilities**: Strip directory prefixes, validate root boundary, resolve relative paths
  - **Technology**: Node.js `path` module, custom validation logic
  - **Scaling**: O(1) operations, no performance impact

- **Project Scanner (ENHANCED)**: Multi-format task parser
  - **Responsibilities**: Directory scanning, task extraction (checkboxes + headings), state caching
  - **Technology**: `fs.readdirSync`, regex patterns, 5-second in-memory cache
  - **Scaling**: Linear with file count, acceptable for <1000 files

- **File Updater (ENHANCED)**: Task state manager with path sanitization
  - **Responsibilities**: Checkbox toggling, task addition, file writes with sanitized paths
  - **Technology**: `fs.readFileSync/writeFileSync`, string manipulation
  - **Scaling**: O(n) where n = file size (typically <10KB)

- **Tool Handler (MODIFIED)**: Request router with path normalization
  - **Responsibilities**: Input validation, path sanitization, error formatting
  - **Technology**: JSON-RPC schema validation
  - **Scaling**: Constant time per request

### Data Flow

**Query Flow (e.g., `get_next_tasks`):**
1. Agent sends request with `file_filter: "./.prd/auth.md"`
2. Tool Handler receives request → Path Resolver
3. Path Resolver extracts filename: `auth.md`
4. Project Scanner checks cache (5-second TTL)
5. If cache miss: Scan `.prd/` directory → Parse all files
6. Filter tasks by `auth.md` → Return pending tasks
7. Tool Handler formats response → Agent

**Mutation Flow (e.g., `complete_task`):**
1. Agent sends request with `file: "./.prd/auth.md"`, `task_text: "Implement login"`
2. Tool Handler → Path Resolver → Extracts `auth.md`
3. File Updater resolves full path: `<root>/.prd/auth.md`
4. Read file → Find task line → Replace `[ ]` with `[x]`
5. Write file → Invalidate cache (`currentState = null`)
6. Return success → Agent

**Error Handling Flow:**
1. Path Resolver validates path is within root boundary
2. If path traversal detected: Return error "Path outside project root"
3. If file not found: Return error with full searched path
4. If parsing fails: Log error, skip file, continue scanning

## Technical Considerations

### Technology Choices

| Technology | Justification | Alternatives Considered |
|------------|---------------|-------------------------|
| TypeScript Path Module | Built-in, cross-platform, battle-tested | Custom path logic (rejected: reinventing wheel), `path` polyfills (rejected: unnecessary) |
| Regex-Based Parser | Simple, fast, sufficient for markdown | AST parsing (rejected: overkill, slower), unified diff (rejected: complex) |
| In-Memory Cache | No external dependencies, fast for <1000 files | Redis (rejected: adds infrastructure), filesystem cache (rejected: slow I/O) |
| Content Hash IDs | Stable across edits, collision-resistant | UUIDs (rejected: unstable), line numbers (rejected: unstable) |

### Trade-offs Analyzed

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Path Resolution: Strip vs. Resolve** | Strip: Simple, works now | Resolve: More robust, handles `..` | ✅ **Strip first** (Phase 1), enhance with resolve in Phase 2 |
| **Task Parsing: Regex vs. AST** | Regex: Fast, simple | AST: More accurate, handles edge cases | ✅ **Regex** (sufficient for PRD format), add AST if needed later |
| **Cache: Time-based vs. Event-based** | Time: Simple, no dependencies | Event: More accurate, requires chokidar | ✅ **Time-based** (5s), chokidar already installed but not critical |
| **Heading Tasks: Strict vs. Loose** | Strict: `### Task X.Y` only | Loose: Any `###` with keywords | ✅ **Loose** (more flexible), configurable regex |

### Risks and Mitigations

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| **Path Traversal Attacks** | High (security) | Low | Validate all paths are within root using `path.resolve()` and prefix comparison |
| **Cache Coherency** | Medium (stale data) | Medium | 5-second TTL is acceptable for manual workflows; explicit invalidation on writes |
| **Performance Degradation** | Medium (slow agents) | Low | Benchmark with 1000+ files; add file count limits if needed |
| **Breaking Existing PRDs** | High (adoption blocker) | Low | Comprehensive test suite with real PRD examples; backward-compat tests |
| **Heading Format Ambiguity** | Low (false positives) | Medium | Limit parsing to "Task Breakdown" sections; add opt-in config |

## Implementation Strategy

### Phase 1: Core Path Fixes (P0 - Week 1)
**Focus**: Eliminate "File not found" errors and workspace isolation

**Definition of Done**:
- [ ] Server accepts `--root` argument and scans correct directory
- [ ] All tools handle `./.prd/file.md`, `/abs/path/file.md`, and `file.md` identically
- [ ] Existing checkbox-based PRDs work without modification
- [ ] Unit tests pass for path normalization edge cases

### Phase 2: Enhanced Parsing (P1 - Week 2)
**Focus**: Support heading-based task formats

**Definition of Done**:
- [ ] Parser recognizes `### Task X.Y: Title` as valid tasks
- [ ] Task IDs remain stable when line numbers shift
- [ ] Both checkbox and heading tasks coexist in same file
- [ ] Integration tests cover mixed-format PRDs

### Phase 3: Polish & Documentation (P2 - Week 3)
**Focus**: DX improvements, documentation, error messages

**Definition of Done**:
- [ ] README updated with `--root` usage examples
- [ ] Error messages include full paths for debugging
- [ ] Performance benchmarks documented
- [ ] Migration guide for existing users

## Task Breakdown

### High Priority (P0) - Blockers for launch

- [ ] **[TASK-1.1]** Implement `--root` argument parsing in `index.ts`
  - **Complexity**: Simple
  - **Dependencies**: None
  - **Parallelizable**: No (foundational)
  - **Testing**: Required (Manual startup test + unit test)
  - **Acceptance Criteria**:
    - [ ] Server starts with `node build/index.js --root=/custom/path`
    - [ ] Server defaults to `process.cwd()/.prd/` when no `--root` provided
    - [ ] Server exits with error code 1 if root directory doesn't exist
    - [ ] Server logs the resolved root path on startup

- [ ] **[TASK-1.2]** Create `PathResolver` utility class
  - **Complexity**: Simple
  - **Dependencies**: None
  - **Parallelizable**: Yes - Can run concurrently with TASK-1.3
  - **Testing**: Required (Unit tests with edge cases)
  - **Acceptance Criteria**:
    - [ ] `normalizePath(inputPath, rootDir)` extracts filename from any path format
    - [ ] `resolvePath(inputPath, rootDir)` returns absolute path within root
    - [ ] `validatePath(inputPath, rootDir)` throws error if path traversal attempted
    - [ ] Handles edge cases: `../evil.md`, `/etc/passwd`, `./../../file.md`

- [ ] **[TASK-1.3]** Integrate `PathResolver` into all tool handlers
  - **Complexity**: Simple
  - **Dependencies**: TASK-1.2
  - **Parallelizable**: Yes - Can run concurrently with TASK-1.2
  - **Testing**: Required (Integration tests for each tool)
  - **Acceptance Criteria**:
    - [ ] `get_next_tasks` accepts `file_filter: "./.prd/auth.md"`
    - [ ] `complete_task` accepts `file: "/home/user/.prd/auth.md"`
    - [ ] `validate_prd_structure` accepts `file: "auth.md"`
    - [ ] All tools return same result regardless of path format

- [ ] **[TASK-1.4]** Update `opencode.json` MCP configuration
  - **Complexity**: Simple
  - **Dependencies**: TASK-1.1
  - **Parallelizable**: No (requires TASK-1.1 complete)
  - **Testing**: Recommended (Manual test with agent)
  - **Acceptance Criteria**:
    - [ ] `opencode.json` passes `process.cwd` as `--root` argument
    - [ ] MCP server starts with correct project directory
    - [ ] Agent can call tools without manual symlink setup

- [ ] **[TASK-1.5]** Add error message enhancement
  - **Complexity**: Simple
  - **Dependencies**: TASK-1.2
  - **Parallelizable**: Yes
  - **Testing**: Recommended (Manual test with invalid paths)
  - **Acceptance Criteria**:
    - [ ] "File not found" errors include full searched path
    - [ ] "Path traversal" errors explain security restriction
    - [ ] "Directory not found" errors show attempted path

### Medium Priority (P1) - Important but not blocking

- [ ] **[TASK-2.1]** Refactor `ProjectScanner.parseTasks()` for multiple patterns
  - **Complexity**: Medium
  - **Dependencies**: None
  - **Parallelizable**: No (core parser change)
  - **Testing**: Required (Unit tests for each pattern)
  - **Acceptance Criteria**:
    - [ ] Recognizes `- [ ] Task text` (existing behavior)
    - [ ] Recognizes `### Task 1.1: Task text` (new)
    - [ ] Recognizes `## Task 1.1: Task text` (new)
    - [ ] Ignores headings outside "Task Breakdown" sections
    - [ ] Maintains line number mapping for context extraction

- [ ] **[TASK-2.2]** Update `TaskIdentifier.generateId()` for content-based hashing
  - **Complexity**: Medium
  - **Dependencies**: TASK-2.1
  - **Parallelizable**: No (depends on parser changes)
  - **Testing**: Required (Unit tests for ID stability)
  - **Acceptance Criteria**:
    - [ ] Checkbox task IDs: `${filename}:${line}:${contentHash}` (unchanged)
    - [ ] Heading task IDs: `${filename}:${headingContentHash}`
    - [ ] IDs remain stable when lines are inserted above
    - [ ] IDs change when task text is modified

- [ ] **[TASK-2.3]** Update `extractContext()` for heading-based tasks
  - **Complexity**: Medium
  - **Dependencies**: TASK-2.1
  - **Parallelizable**: No (depends on parser changes)
  - **Testing**: Recommended (Unit tests with various markdown structures)
  - **Acceptance Criteria**:
    - [ ] Extracts content until next heading or task
    - [ ] Handles nested lists under headings
    - [ ] Preserves indentation and formatting

- [ ] **[TASK-2.4]** Add integration test for mixed-format PRDs
  - **Complexity**: Simple
  - **Dependencies**: TASK-2.1, TASK-2.2, TASK-2.3
  - **Parallelizable**: No (requires parser complete)
  - **Testing**: Required (Integration test)
  - **Acceptance Criteria**:
    - [ ] Test file contains both checkboxes and headings
    - [ ] `get_all_tasks` returns both types
    - [ ] `complete_task` works for both types
    - [ ] Task counts match manual inspection

### Low Priority (P2) - Nice to have

- [ ] **[TASK-3.1]** Add performance benchmark suite
  - **Complexity**: Simple
  - **Dependencies**: None
  - **Parallelizable**: Yes
  - **Testing**: Recommended (Benchmark tests)
  - **Acceptance Criteria**:
    - [ ] Benchmark scans 10, 100, 1000 files
    - [ ] Results logged to console
    - [ ] Fails if scan time >100ms for 100 files

- [ ] **[TASK-3.2]** Update README.md with new configuration
  - **Complexity**: Simple
  - **Dependencies**: TASK-1.1, TASK-1.4
  - **Parallelizable**: Yes
  - **Testing**: None (documentation)
  - **Acceptance Criteria**:
    - [ ] Documents `--root` argument
    - [ ] Examples of path formats (naked, relative, absolute)
    - [ ] Examples of heading-based tasks
    - [ ] Migration guide from v1.0.0

- [ ] **[TASK-3.3]** Add configuration file support (optional)
  - **Complexity**: Medium
  - **Dependencies**: TASK-1.1
  - **Parallelizable**: Yes
  - **Testing**: Recommended (Unit tests)
  - **Acceptance Criteria**:
    - [ ] Reads `.prd-mcp.json` if present
    - [ ] Supports `root` and `taskFormats` config
    - [ ] Falls back to CLI args if config missing
    - [ ] Documented in README

## Success Metrics

### Baseline (Current State)
- **Agent Friction**: 3 manual interventions required per project (symlink creation, path debugging, format refactoring)
- **Setup Time**: 5-10 minutes per project (manual symlink configuration)
- **"File Not Found" Errors**: ~20% of tool calls fail due to path issues
- **Supported Formats**: 1 (GFM checkboxes only)

### Target (Post-Implementation)
- **Agent Friction**: 0 manual interventions (zero-config)
- **Setup Time**: <30 seconds (add MCP to opencode.json, done)
- **"File Not Found" Errors**: 0% (all path formats work)
- **Supported Formats**: 2+ (checkboxes + headings, extensible)

### Measurement Method
- Count manual symlink steps in pilot projects
- Time from "add MCP" to "first successful tool call"
- Error logs from agent interactions over 1-week sprint
- Format coverage via integration test suite

## Open Questions

- **[Q1]** Should heading-based tasks require a "Task Breakdown" section marker, or parse globally?
  - **Options**: (A) Parse all headings globally, (B) Only within `## Task Breakdown` sections, (C) Configurable
  - **Decision Owner**: TBD (architect decision)
  - **Recommendation**: Option B (section-scoped) to avoid false positives

- **[Q2]** Should we add file watching with chokidar for real-time updates?
  - **Options**: (A) Yes, immediate updates, (B) No, 5-second cache is sufficient, (C) Opt-in via config
  - **Decision Owner**: TBD (performance testing needed)
  - **Recommendation**: Option C (opt-in) for power users

- **[Q3]** Should task IDs be exposed to agents, or remain internal?
  - **Options**: (A) Expose in API responses, (B) Keep internal, (C) Expose optionally
  - **Decision Owner**: TBD (UX decision)
  - **Recommendation**: Option B (internal) to avoid coupling agent logic to implementation

## Appendices

### Code Snippets

#### Path Resolver Implementation
```typescript
// src/pathResolver.ts
import * as path from "path";

export class PathResolver {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
  }

  /**
   * Extracts filename from any path format
   * Examples:
   * - "auth.md" → "auth.md"
   * - "./.prd/auth.md" → "auth.md"
   * - "/home/user/.prd/auth.md" → "auth.md"
   */
  normalizePath(inputPath: string): string {
    return path.basename(inputPath);
  }

  /**
   * Resolves input path to absolute path within root
   * Throws if path traversal attempted
   */
  resolvePath(inputPath: string): string {
    const resolved = path.resolve(this.rootDir, inputPath);
    if (!resolved.startsWith(this.rootDir)) {
      throw new Error(`Path traversal detected: ${inputPath}`);
    }
    return resolved;
  }

  /**
   * Validates path is within root directory
   */
  validatePath(inputPath: string): boolean {
    try {
      this.resolvePath(inputPath);
      return true;
    } catch {
      return false;
    }
  }
}
```

#### Multi-Format Task Parser
```typescript
// src/taskParser.ts
export enum TaskFormat {
  CHECKBOX = "checkbox",
  HEADING = "heading"
}

export interface ParsedTask {
  format: TaskFormat;
  id: string;
  text: string;
  line: number;
  completed: boolean;
  context: string;
}

export class MultiFormatTaskParser {
  private patterns = {
    checkbox: /^(\s*)-\s\[([ x])\]\s+(.+)$/,
    heading: /^#{2,3}\s+(?:Task\s+)?[\w\.]+:\s+(.+)$/i
  };

  parseTask(line: string, lineNumber: number, file: string): ParsedTask | null {
    // Try checkbox pattern
    const checkboxMatch = line.match(this.patterns.checkbox);
    if (checkboxMatch) {
      const [, indent, checkbox, text] = checkboxMatch;
      return {
        format: TaskFormat.CHECKBOX,
        id: this.generateCheckboxId(file, lineNumber, text),
        text: text.trim(),
        line: lineNumber,
        completed: checkbox === "x",
        context: "" // Extracted separately
      };
    }

    // Try heading pattern
    const headingMatch = line.match(this.patterns.heading);
    if (headingMatch) {
      const [, text] = headingMatch;
      return {
        format: TaskFormat.HEADING,
        id: this.generateHeadingId(file, text),
        text: text.trim(),
        line: lineNumber,
        completed: false, // Headings are not completable
        context: ""
      };
    }

    return null;
  }

  private generateCheckboxId(file: string, line: number, text: string): string {
    const hash = crypto.createHash("md5").update(text).digest("hex").substring(0, 8);
    return `${file}:${line}:${hash}`;
  }

  private generateHeadingId(file: string, text: string): string {
    const hash = crypto.createHash("md5").update(text).digest("hex").substring(0, 8);
    return `${file}:heading:${hash}`;
  }
}
```

### Migration Guide

#### For Existing Users (v1.0.0 → v2.0.0)

**Step 1: Remove Manual Symlinks**
```bash
# If you created symlinks like this:
ln -s /home/user/project/.prd ~/.config/opencode/prd_mcp/.prd

# Remove them:
rm ~/.config/opencode/prd_mcp/.prd
```

**Step 2: Update opencode.json**
```json
{
  "mcp": {
    "prd_mcp": {
      "type": "local",
      "command": [
        "node",
        "/home/dev/.config/opencode/prd_mcp/build/index.js",
        "--root={cwd}/.prd"
      ],
      "enabled": true
    }
  }
}
```

**Step 3: Restart OpenCode**
```bash
# Exit OpenCode and restart
opencode
```

**Step 4: Verify Setup**
```bash
# Test with agent conversation
"Use prd_mcp to get the next pending tasks"
```

No PRD format changes required—all existing PRDs continue working.

---

**Document Version**: 2.0  
**Last Updated**: 2025-01-06  
**Status**: Ready for Implementation
