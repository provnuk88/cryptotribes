# PROMPT: Project Structure Generation for Kingdoms: Extraction Wars

## YOUR ROLE

You are a Senior Game Developer and Software Architect with 20+ years of experience building scalable multiplayer browser games. You specialize in MERN stack architecture, real-time systems, and competitive gaming platforms with real-money stakes.

Your expertise includes:
- Domain-Driven Design (DDD) and Clean Architecture
- SOLID principles, DRY, KISS in practice
- Microservices-ready monolith patterns
- Real-time multiplayer game backends (queues, state management, race conditions)
- Financial transaction systems requiring ACID compliance
- Horizontal scaling strategies for gaming platforms

## YOUR TASK

Analyze the provided Game Design Document (GDD) for "Kingdoms: Extraction Wars" and generate a complete, production-ready project folder structure.

<requirements>
- Output MUST be valid JSON format
- Structure must support 300-1000 concurrent players scaling to 10,000+
- Follow "Folder by Feature" pattern for business logic modules
- Separate concerns: game logic, economy, combat, tribes, territories
- Include reusable services, shared utilities, and type definitions
- Plan for future WebSocket migration (MVP uses REST + polling)
- Support admin panel, CMS dashboard, and main game client
- Include test structure mirroring source structure
- Add infrastructure configs (Docker, CI/CD, monitoring)
</requirements>

<constraints>
- Tech stack: Node.js 18+, Express.js, MongoDB + Mongoose, Bull.js + Redis, React 18 + Vite, Tailwind CSS
- MVP timeline: 4 months solo developer
- No over-engineering: balance between scalability and delivery speed
- Prioritize battle system and economy isolation (most critical for bugs/exploits)
</constraints>

## ANALYSIS STEPS

Before generating the structure, complete these steps:

<step_1>
Read the entire GDD thoroughly. Identify all game systems:
- Buildings (3 types, 10 levels each)
- Units (4 types with counter system)
- Combat (auto-resolve, queue-based, deterministic + RNG)
- Territories (50 tiles, 3 tiers, 3 terrains)
- Tribes (12 players, roles, treasury, voting)
- Economy (gold generation, upkeep, diminishing returns)
- VP system (hourly generation, battle rewards, underdog bonuses)
- Seasons (10 days, events, prizes)
- Anti-cheat (wallet verification, behavioral analysis)
- Payments (USDT + Stripe integration)
</step_1>

<step_2>
Map each system to isolated modules. Consider:
- Which modules share data? (e.g., combat needs units + territories + tribes)
- Which modules must be transaction-safe? (economy, battles, payments)
- Which modules need queue processing? (battles, VP generation, cron jobs)
- Which modules have admin overrides? (seasons, events, bans)
</step_2>

<step_3>
Define shared layers:
- Domain entities (User, Tribe, Territory, Battle, etc.)
- Repository pattern for data access
- Service layer for business logic
- Controller layer for HTTP/API
- Event emitters for cross-module communication
- Middleware (auth, rate limiting, validation)
</step_3>

<step_4>
Plan frontend architecture:
- Game map (Canvas-based, top-down 2D)
- Dashboard panels (buildings, army, tribe)
- Real-time updates (polling → future WebSocket)
- Admin panel (separate build or route-protected?)
- State management (Zustand recommended)
</step_4>

## OUTPUT FORMAT

Generate a JSON object with the following structure:

```json
{
  "project_name": "kingdoms-extraction-wars",
  "architecture_pattern": "string - describe the pattern used",
  "structure": {
    "root_files": [
      {
        "name": "filename",
        "purpose": "brief description"
      }
    ],
    "directories": [
      {
        "name": "directory_name",
        "purpose": "what this directory contains and why",
        "subdirectories": [...],
        "files": [
          {
            "name": "filename",
            "purpose": "what this file does",
            "exports": ["list of main exports if applicable"],
            "dependencies": ["internal modules this file depends on"]
          }
        ]
      }
    ]
  },
  "module_dependency_graph": {
    "module_name": ["depends_on_module_1", "depends_on_module_2"]
  },
  "database_collections": [
    {
      "name": "collection_name",
      "purpose": "what data it stores",
      "key_fields": ["field1", "field2"],
      "indexes": ["index definitions"]
    }
  ],
  "api_route_groups": [
    {
      "prefix": "/api/v1/resource",
      "module": "source module",
      "endpoints_count": 5,
      "auth_required": true
    }
  ],
  "background_jobs": [
    {
      "name": "job_name",
      "schedule": "cron expression or trigger",
      "purpose": "what it does"
    }
  ],
  "critical_paths": [
    {
      "name": "path_name",
      "description": "why this is critical",
      "files_involved": ["file1.ts", "file2.ts"],
      "transaction_required": true
    }
  ],
  "scalability_notes": [
    "note about horizontal scaling",
    "note about database sharding potential"
  ],
  "mvp_priority": {
    "phase_1": ["module1", "module2"],
    "phase_2": ["module3", "module4"],
    "phase_3": ["module5", "module6"],
    "post_mvp": ["module7"]
  }
}
```

## QUALITY CHECKLIST

Before finalizing, verify:

- [ ] Every GDD system has a corresponding module
- [ ] Battle system is fully isolated with clear interfaces
- [ ] Economy calculations are centralized (single source of truth)
- [ ] No circular dependencies between modules
- [ ] Test files mirror source structure
- [ ] Shared types are in dedicated types/ or shared/ directory
- [ ] Environment configs are externalized
- [ ] Sensitive operations (payments, bans) have audit logging planned
- [ ] Rate limiting middleware is positioned correctly
- [ ] CORS and security middleware are at app level

## ADDITIONAL CONTEXT

<game_specifics>
- Combat is async auto-resolve (no real-time during battle)
- Battles use queue (Bull.js) to prevent race conditions
- VP updates every 10 minutes via cron
- Territory state must be consistent (optimistic locking required)
- Wallet authentication via Web3 signature verification
- 10-day seasons with 5 scripted events
</game_specifics>

<anti_patterns_to_avoid>
- God services that do everything
- Direct database access from controllers
- Business logic in route handlers
- Hardcoded game constants (use config files)
- Mixing sync and async patterns inconsistently
- Scattered validation logic
</anti_patterns_to_avoid>

---

## GDD DOCUMENT

The full Game Design Document is attached. Read it completely before generating the structure.

[ATTACH: GDD.md file here]

---

## EXECUTION

1. Read the GDD completely
2. Follow the analysis steps
3. Generate the JSON structure
4. Validate against the quality checklist
5. Output ONLY the JSON (no markdown wrapping, no explanations before or after)
