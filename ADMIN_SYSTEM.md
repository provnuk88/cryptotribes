# CryptoTribes - Admin System Specification

**Version**: 1.0
**Last Updated**: 2025-12-01
**Status**: Pre-Development

---

## Table of Contents

1. [Overview](#1-overview)
2. [Role Hierarchy](#2-role-hierarchy)
3. [Permissions Matrix](#3-permissions-matrix)
4. [Admin Panel Features](#4-admin-panel-features)
5. [Security & Authentication](#5-security--authentication)
6. [Audit Logging](#6-audit-logging)
7. [Database Schema](#7-database-schema)
8. [API Endpoints](#8-api-endpoints)
9. [UI Wireframes](#9-ui-wireframes)
10. [Implementation Priority](#10-implementation-priority)

---

## 1. Overview

### 1.1 Purpose

The Admin System provides game operators with tools to:
- Manage seasons (create, configure, monitor)
- Moderate players and tribes
- Handle anti-cheat and reports
- Compensate for bugs
- Monitor system health

### 1.2 Core Principles

**Security First**:
- All admin actions logged permanently
- Multi-factor authentication for Super Admin
- IP whitelist for sensitive operations
- No admin can act anonymously

**Fairness**:
- Transparent moderation (players see ban reasons)
- Appeal process for disputed bans
- Compensation only for confirmed bugs
- No favoritism (audit trail prevents bias)

**Game Integrity**:
- Cannot change constants mid-season
- Battle rollback only for critical bugs (requires confirmation)
- Disqualifications require evidence + approval

---

## 2. Role Hierarchy

### 2.1 Role Structure

```
┌─────────────────────────────────────────┐
│         SUPER ADMIN (1-2 people)        │
│  Full system access, creates admins     │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼────────┐ ┌─────▼──────────────┐
│  GAME MASTER   │ │    MODERATOR       │
│  (3-5 people)  │ │   (5-10 people)    │
│ Season mgmt    │ │  Player moderation │
└────────────────┘ └────────────────────┘
```

### 2.2 Super Admin

**Who**: Founders, CTO, Lead Developer

**Responsibilities**:
- System-level configuration
- Financial operations (prize distribution)
- Critical bug fixes
- Admin management (promote/demote)

**Access Level**: FULL (read/write to all systems)

---

### 2.3 Game Master

**Who**: Game designers, senior community managers

**Responsibilities**:
- Season creation and configuration
- Balance monitoring (if meta is broken)
- High-level moderation (tribe disqualification proposals)
- Player statistics and analytics

**Access Level**: HIGH (season management, moderation, analytics)

---

### 2.4 Moderator

**Who**: Community managers, support staff

**Responsibilities**:
- Handle player reports (offensive names, chat spam)
- Issue warnings and short-term bans (1-7 days)
- Investigate multi-accounting claims
- Answer player appeals

**Access Level**: LIMITED (player moderation only)

---

## 3. Permissions Matrix

| Action | Super Admin | Game Master | Moderator |
|--------|-------------|-------------|-----------|
| **System** |
| Create/Delete Admins | ✅ | ❌ | ❌ |
| View Audit Logs (All) | ✅ | ❌ | ❌ |
| View Audit Logs (Own Team) | ✅ | ✅ | ✅ |
| Change Game Constants | ✅ (between seasons) | ❌ | ❌ |
| Access Database Directly | ✅ | ❌ | ❌ |
| **Seasons** |
| Create New Season | ✅ | ✅ | ❌ |
| Configure Ring System | ✅ | ✅ | ❌ |
| Start/Stop Season | ✅ | ❌ | ❌ |
| Force End Season | ✅ | ❌ | ❌ |
| Delete Season | ✅ | ❌ | ❌ |
| View Season Analytics | ✅ | ✅ | ❌ |
| **Players** |
| View Player Details | ✅ | ✅ | ✅ |
| Flag for Review | ✅ | ✅ | ✅ |
| Issue Warning | ✅ | ✅ | ✅ |
| Ban (1-7 days) | ✅ | ✅ | ✅ |
| Ban (30+ days) | ✅ | ✅ | ❌ |
| Permanent Ban | ✅ | ❌ | ❌ |
| Kick from Season | ✅ | ✅ | ❌ |
| Give Compensation (gold/units) | ✅ (with reason) | ❌ | ❌ |
| **Tribes** |
| View Tribe Details | ✅ | ✅ | ✅ |
| View Treasury Logs | ✅ | ✅ | ❌ |
| View Chat Logs | ✅ | ✅ | ✅ (with report) |
| Flag Tribe for Review | ✅ | ✅ | ✅ |
| Propose Disqualification | ✅ | ✅ | ❌ |
| Approve Disqualification | ✅ | ❌ | ❌ |
| **Battles** |
| View Battle Logs | ✅ | ✅ | ❌ |
| Replay Battle (recalculate) | ✅ | ❌ | ❌ |
| Rollback Battle | ✅ (with confirmation) | ❌ | ❌ |
| **Payments** |
| View Payment History | ✅ | ✅ | ❌ |
| Process Prize Distribution | ✅ | ❌ | ❌ |
| Issue Refunds | ✅ | ❌ | ❌ |
| **Moderation** |
| View Reports Queue | ✅ | ✅ | ✅ |
| Resolve Reports | ✅ | ✅ | ✅ |
| View Appeal Queue | ✅ | ✅ | ❌ |
| Approve Appeals | ✅ | ✅ | ❌ |

---

## 4. Admin Panel Features

### 4.1 Dashboard (Homepage)

**URL**: `/admin/dashboard`

**Displays**:
```
┌─────────────────────────────────────────────────────┐
│  CRYPTOTRIBES ADMIN PANEL                           │
├─────────────────────────────────────────────────────┤
│  Current Season: Season 3: Winter War (Active)      │
│  Day 7 of 10                                        │
│  Players: 847 / 1000 registered                     │
│  Active Tribes: 70                                  │
│  Battles Today: 3,241                               │
│                                                     │
│  Server Status: ✅ Healthy                          │
│  - API Latency: 45ms (p95)                          │
│  - WebSocket Connections: 812                       │
│  - Database: ✅ Connected                           │
│  - Redis Queue: ✅ Running (23 jobs pending)        │
├─────────────────────────────────────────────────────┤
│  🚨 ALERTS (Action Required)                         │
│  [ ! ] 3 players flagged for multi-accounting       │
│  [ ! ] 12 reports pending moderation                │
│  [ ⚠ ] Battle queue slow (avg 45s, target <10s)     │
│  [ ⚠ ] Top tribe 40% ahead (snowball risk)          │
└─────────────────────────────────────────────────────┘

Quick Actions:
[Create New Season] [View Reports] [Player Search] [System Logs]
```

---

### 4.2 Season Management

**URL**: `/admin/seasons`

#### 4.2.1 Season List

```
SEASONS
┌────────────────────────────────────────────────────┐
│ Season 3: Winter War                               │
│ Status: Active (Day 7/10)                          │
│ Players: 847    Tribes: 70    Battles: 12,304     │
│ Prize Pool: $18,030                                │
│ [View Details] [Analytics] [End Season]            │
└────────────────────────────────────────────────────┘

│ Season 2: Autumn Conquest                          │
│ Status: Completed (2025-11-15 - 2025-11-24)       │
│ Players: 612    Winner: "Iron Legion"             │
│ [View Results] [Archive]                           │
└────────────────────────────────────────────────────┘

[+ Create New Season]
```

#### 4.2.2 Create New Season (Super Admin + Game Master)

**URL**: `/admin/seasons/create`

**Form Fields**:

**Step 1: Basic Information**
```
Season Name: [Season 4: Spring Uprising        ]
Season Number: [4] (auto-incremented)

Timeline:
├── Registration Opens:  [2025-12-10 16:00 UTC]
├── Registration Closes: [2025-12-14 16:00 UTC]
├── Season Starts:       [2025-12-15 16:00 UTC]
└── Season Ends:         [2025-12-24 16:00 UTC] (10 days)

Entry Fee: [$25] USDT
Expected Players: [800] (used for territory scaling)
```

**Step 2: Ring Configuration (Adaptive Map)**
```
Preset: ( ) Casual  (•) Competitive  ( ) Hardcore

OR Advanced Configuration:
├── Ring Count: [4] rings
├── Center Territories: [5] (fixed)
├── Inner Ring Base: [15] territories (scales with players)
├── Outer Ring Base: [30] territories (scales with players)
├── Edge Ring: [ ] Enable (for 800+ players)
│
├── NPC Difficulty Multiplier: [1.0x]
│   └── Preview: Edge NPC = 190 units, Ring = 390, Center = 600
│
└── PvP Unlock: Ring [2]+ (players can't attack ring 1 territories)
    └── Safe Period: [48] hours (PvP disabled entirely)
```

**Step 3: Game Constants (Optional Override)**
```
Use Default Constants: (•) Yes  ( ) No

[ Show Advanced ] (collapsed by default)

If "No" selected:
├── Unit Stats
│   ├── Militia:   Cost [10]g, HP [100], DMG [10]
│   ├── Spearman:  Cost [25]g, HP [120], DMG [15]
│   ├── Archer:    Cost [30]g, HP [80],  DMG [20]
│   └── Cavalry:   Cost [50]g, HP [150], DMG [25]
│
├── Building Costs (JSON editor)
│   └── [Load from File] [Export Current]
│
└── Economic Settings
    ├── Base Gold Generation: [10]g/hr
    ├── Territory Upkeep: [20]g/hr
    └── Diminishing Returns: [100%, 80%, 60%, 40%, 20%]

⚠️ WARNING: Changing constants can break game balance!
   Only modify if you know what you're doing.
```

**Step 4: Prize Pool**
```
Prize Distribution:
(•) Auto-Calculate (85% of entry fees)
    └── Estimated: $17,000 (for 800 players)

( ) Manual Override
    └── Total Prize Pool: $[____]

Distribution Breakdown:
├── Tribal Prizes (60%): $10,200
│   ├── Rank 1: $5,610 (55%)
│   ├── Rank 2: $3,774 (37%)
│   ├── Rank 3: $816 (8%)
│
├── Individual Prizes (30%): $5,100
│   └── 5 Categories × $1,020 each
│
└── Participation Rewards (10%): $1,700
```

**Step 5: Review & Publish**
```
Season Summary:
✓ Season 4: Spring Uprising
✓ Dec 15 - Dec 24 (10 days)
✓ 800 expected players, $17,000 prize pool
✓ Competitive preset (4 rings, standard difficulty)
✓ Using default game constants

[Go Back] [Create Season Draft] [Publish Season]
```

---

### 4.3 Player Management

**URL**: `/admin/players`

#### 4.3.1 Player Search

```
Search Player:
[Search by wallet / username / tribe       ] [Search]

Filters:
[Season: All ▼] [Status: All ▼] [Flagged Only: ☐]

Recent Flagged Players:
┌────────────────────────────────────────────────────┐
│ 🚩 WarriorBot42                                     │
│ Wallet: 0x1a2b...                                  │
│ Reason: Multi-accounting (same IP as 3 others)    │
│ Flagged by: GameMaster_Alice on 2025-12-01        │
│ [Investigate] [Ban] [Dismiss]                      │
└────────────────────────────────────────────────────┘
```

#### 4.3.2 Player Detail Page

**URL**: `/admin/players/:playerId`

```
PLAYER DETAILS: WarriorKing

┌─────────────────────────────────────────────────────┐
│ ACCOUNT INFO                                        │
├─────────────────────────────────────────────────────┤
│ Wallet: 0x742d35cc6634c0532925a3b844bc9e7595f0beb  │
│ Username: WarriorKing                               │
│ Joined: 2025-11-25 16:00 UTC                        │
│ Last Active: 2025-12-01 14:30 UTC (2 hours ago)    │
│ Current Season: Season 3 (Day 7)                    │
│ Tribe: Warriors of Winter (Chieftain)               │
│ Status: ✅ Active                                   │
│ Flagged: ❌ No                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ GAME STATS (Season 3)                               │
├─────────────────────────────────────────────────────┤
│ Victory Points: 2,450 (Rank #12 / 847)             │
│ Gold: 3,200                                         │
│ Army: 320 units                                     │
│   ├── Militia: 150                                  │
│   ├── Spearman: 80                                  │
│   ├── Archer: 60                                    │
│   └── Cavalry: 30                                   │
│ Buildings:                                          │
│   ├── Barracks: Level 7                             │
│   ├── Warehouse: Level 5                            │
│   └── Workshop: Level 6                             │
│ Territories Garrisoned: 8                           │
│ Battles: 45 (32 W / 13 L = 71% win rate)           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ANTI-CHEAT SIGNALS                                  │
├─────────────────────────────────────────────────────┤
│ Wallet Age: 450 days ✅                             │
│ Transaction Count: 234 txs ✅                       │
│ Behavior Score: 92/100 ✅                           │
│ IP Address: 185.234.12.45 (New York, US) ✅        │
│ Similar IP Matches: None ✅                         │
│ Entry Fee Paid: $25 USDT ✅                         │
│ Payment Method: Direct USDT transfer ✅             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ MODERATION HISTORY                                  │
├─────────────────────────────────────────────────────┤
│ No warnings or bans on record.                      │
└─────────────────────────────────────────────────────┘

ADMIN ACTIONS:
[Flag for Review] [Issue Warning] [Kick from Season] [Ban Player]
[Give Compensation] [View Battle History] [View Activity Log]
```

#### 4.3.3 Player Actions

**Flag for Review**:
```
FLAG PLAYER: WarriorKing

Reason: [Multi-accounting suspected        ▼]
        Options:
        - Multi-accounting suspected
        - Unusual behavior pattern
        - Reported by other players
        - Testing / false positive

Evidence (optional):
[Multiple accounts from same IP: 0x742d..., 0x834f..., 0x921a...]

Priority: ( ) Low  (•) Medium  ( ) High

[Submit Flag]
```

**Issue Warning**:
```
ISSUE WARNING: WarriorKing

Reason: [Offensive tribe name           ]
Severity: (•) Verbal Warning  ( ) Written Warning  ( ) Final Warning

Message to Player:
[Your tribe name "F***Warriors" violates our TOS.
Please change it within 24 hours or face suspension.]

[Send Warning] [Cancel]
```

**Ban Player**:
```
BAN PLAYER: WarriorKing

Duration: ( ) 1 day  ( ) 7 days  ( ) 30 days  (•) Permanent

Reason: [Multi-accounting (confirmed)    ]

Evidence:
[Same IP address as 3 other accounts: Player1, Player2, Player3.
All 4 accounts created on same day (2025-11-25).
All 4 in same tribe, coordinating suspiciously.]

Public Reason (shown to player):
[Your account has been permanently banned for multi-accounting
(creating multiple accounts to gain unfair advantage).
This violates Section 3.2 of our Terms of Service.]

⚠️ WARNING: This action will:
- Remove player from current season immediately
- Forfeit all entry fees (no refund)
- Block wallet from future seasons
- Log action permanently in audit trail

Requires Super Admin approval: [Request Approval] (if Game Master)

[Confirm Ban] [Cancel]
```

**Give Compensation** (Super Admin only):
```
GIVE COMPENSATION: WarriorKing

Bug/Issue: [Battle calculation bug caused incorrect casualties]

Compensation Type:
(•) Gold  ( ) Units  ( ) Both

Gold: [500]g
Units:
├── Militia: [0]
├── Spearman: [0]
├── Archer: [20]
└── Cavalry: [0]

Reason (required, visible in audit log):
[Bug in battle formula on 2025-12-01 caused player to lose 20 archers
incorrectly. Battle #4521. Compensating with 20 archers.]

Attach Evidence (optional):
[Upload screenshot / link to GitHub issue]

⚠️ This action will be logged and audited.

[Submit Compensation] [Cancel]
```

---

### 4.4 Tribe Management

**URL**: `/admin/tribes/:tribeId`

```
TRIBE DETAILS: Warriors of Winter

┌─────────────────────────────────────────────────────┐
│ TRIBE INFO                                          │
├─────────────────────────────────────────────────────┤
│ Name: Warriors of Winter                            │
│ Tag: [WOW]                                          │
│ Season: Season 3 (Day 7)                            │
│ Formation: Self-organized                           │
│ Created: 2025-11-23 12:00 UTC                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ MEMBERS (12/12)                                     │
├─────────────────────────────────────────────────────┤
│ Chieftain:                                          │
│ ├── WarriorKing (2,450 VP, #12)                    │
│                                                     │
│ Captains:                                           │
│ ├── Captain1 (1,800 VP, #35)                       │
│ └── Captain2 (1,600 VP, #48)                       │
│                                                     │
│ Warriors:                                           │
│ ├── Warrior1 (1,200 VP, #87)                       │
│ ├── Warrior2 (1,100 VP, #102)                      │
│ ├── ... (7 more)                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ PERFORMANCE                                         │
├─────────────────────────────────────────────────────┤
│ Total VP: 18,500 (Rank #3 / 70 tribes)             │
│ Territories Controlled: 14                          │
│ Treasury: 4,200g                                    │
│ Active Wars: vs "Red Dragons" (started Day 5)      │
│ Win Rate: 68% (134 W / 63 L)                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ANTI-CHEAT FLAGS                                    │
├─────────────────────────────────────────────────────┤
│ Multi-accounting detected: ❌ No                    │
│ Suspicious coordination: ⚠️ Borderline              │
│   └── 8/12 members attack same targets within 5min │
│ IP Clustering: ⚠️ 2 members share IP (same house?) │
│ Reports from other tribes: 2 reports                │
│   ├── Report #1: "They're cheating!" (no evidence) │
│   └── Report #2: "Bot-like behavior" (dismissed)   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TREASURY LOG (Last 10 transactions)                 │
├─────────────────────────────────────────────────────┤
│ 2025-12-01 14:30 | Withdrawal | -500g | Chieftain  │
│   Reason: "Fund cavalry training for center push"  │
│ 2025-12-01 12:00 | Territory Tax | +120g | Auto    │
│ 2025-12-01 10:00 | Battle Loot | +200g | Captain1  │
│ ... (7 more)                                        │
└─────────────────────────────────────────────────────┘

ADMIN ACTIONS:
[Flag Tribe] [Propose Disqualification] [View All Treasury Logs]
[View Battle History] [View Chat Logs (requires justification)]
```

**Propose Disqualification** (Game Master):
```
PROPOSE DISQUALIFICATION: Warriors of Winter

Reason: [Multi-accounting ring detected    ]

Evidence:
[3 members (WarriorKing, Warrior5, Warrior9) are confirmed multi-accounts:
- Same IP address (185.234.12.45)
- Created on same day
- Wallet ages < 30 days (below minimum)
- Suspicious coordination patterns

This gives the tribe an unfair advantage.]

Proposed Action:
(•) Disqualify entire tribe from Season 3
( ) Ban only the 3 flagged members (keep tribe with 9/12)

⚠️ This action requires Super Admin approval.

[Submit Proposal] [Cancel]
```

**Approve Disqualification** (Super Admin only):
```
DISQUALIFICATION PROPOSAL #42

Proposed by: GameMaster_Alice
Date: 2025-12-01 15:00 UTC
Target: Warriors of Winter (Tribe Rank #3)

Reason: Multi-accounting ring (3/12 members confirmed)
Evidence: [View Evidence Package]

Proposed Action: Disqualify entire tribe

Impact:
- 12 players removed from Season 3
- $300 entry fees forfeited (12 × $25)
- 14 territories released (become neutral)
- Leaderboard recalculated

Decision:
(•) Approve Disqualification
( ) Reject Proposal (keep under review)
( ) Ban only flagged members (partial action)

Comments (optional):
[Evidence is conclusive. Tribe will be disqualified and banned from
future seasons. Entry fees forfeited as per TOS Section 3.2.]

[Submit Decision]
```

---

### 4.5 Moderation Queue

**URL**: `/admin/moderation`

```
REPORTS QUEUE (12 pending)

Filter: [All ▼] [Status: Pending ▼] [Sort by: Date ▼]

┌────────────────────────────────────────────────────┐
│ Report #1234                              PENDING  │
│ Type: Offensive Username                           │
│ Target: Player "N@ziKiller88" (0x8a3f...)         │
│ Reporter: Player "CleanGamer" (0x2c4d...)         │
│ Timestamp: 2025-12-01 14:32 UTC                    │
│                                                    │
│ Details: "Username contains offensive reference"  │
│                                                    │
│ [View Player] [Ban User] [Warning] [Dismiss]      │
└────────────────────────────────────────────────────┘

│ Report #1235                              UNDER REVIEW │
│ Type: Multi-accounting                           │
│ Target: Tribe "BotFarm123"                       │
│ Reporter: Player "Detective99" (0x7e1a...)       │
│ Timestamp: 2025-12-01 13:15 UTC                  │
│ Assigned to: GameMaster_Bob                      │
│                                                  │
│ Evidence: "5 members same IP, all created same  │
│ day, suspicious names (Bot1, Bot2, etc.)"       │
│                                                  │
│ [View Tribe] [Flag All Members] [Dismiss]       │
└──────────────────────────────────────────────────┘

│ Report #1236                              PENDING │
│ Type: Exploit / Bug Abuse                        │
│ Target: Player "ExploitKing" (0x9b2c...)        │
│ Reporter: Player "Victim123" (0x3f8d...)        │
│ Timestamp: 2025-12-01 12:00 UTC                  │
│                                                  │
│ Details: "Player somehow trained 500 cavalry    │
│ instantly, possible gold hack"                   │
│                                                  │
│ [Investigate] [View Battle Logs] [Dismiss]      │
└──────────────────────────────────────────────────┘

[Load More...]
```

**Report Detail & Resolution**:
```
REPORT #1234: Offensive Username

Target Player: N@ziKiller88
├── Wallet: 0x8a3f4b2c...
├── Season 3, Day 7
├── Tribe: None (solo)
├── VP: 450 (Rank #456)
└── Account Age: 45 days

Reporter: CleanGamer
├── Wallet: 0x2c4d8e1f...
├── Report History: 2 reports (1 valid, 1 dismissed)
└── Reputation: Good

Report Content:
"This username contains a reference to Nazis which is offensive
and violates your Terms of Service Section 5.3 (Offensive Content).
Please take action."

Moderator Notes:
[Username clearly violates TOS. Nazi reference is banned.
Player will receive warning and 24h to change username.
If not changed, 7-day ban.]

Resolution:
(•) Issue Warning + Force Username Change
( ) Ban (1 day)
( ) Ban (7 days)
( ) Dismiss (not a violation)

Message to Offender:
[Your username "N@ziKiller88" violates our Terms of Service
Section 5.3 (Offensive Content). You have 24 hours to change
your username or your account will be suspended for 7 days.]

Message to Reporter:
[Thank you for your report. We have issued a warning to the
player and required them to change their username within 24 hours.]

[Submit Resolution] [Request Escalation to Game Master]
```

---

### 4.6 Battle Logs (Super Admin only)

**URL**: `/admin/battles`

```
BATTLE SEARCH

Battle ID: [4521] [Search]
OR
Player: [WarriorKing] [Search]
Territory: [#23] [Search]
Date Range: [2025-12-01] to [2025-12-01] [Search]

───────────────────────────────────────────────────

BATTLE #4521

Timestamp: 2025-12-01 12:34:56 UTC
Territory: #23 (Ring, Plains terrain)
Type: PvP Territory Capture

┌─────────────────────────────────────────────────────┐
│ ATTACKER: WarriorKing (Tribe: WOW)                  │
├─────────────────────────────────────────────────────┤
│ Army:                                               │
│ ├── 50 Cavalry (2500g cost)                        │
│ Formation: Offensive (+15% damage)                  │
│ Power (calculated): 323,437                         │
│ RNG Variance: +5% → 339,608 final power            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ DEFENDER: EnemyPlayer (Tribe: RED)                  │
├─────────────────────────────────────────────────────┤
│ Army:                                               │
│ ├── 100 Archers (3000g cost)                       │
│ Formation: Defensive (+20% defense)                 │
│ Power (calculated): 172,800                         │
│ RNG Variance: -5% → 164,160 final power            │
│ Position Bonus: 1.2x (defender)                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ RESULT: Attacker Victory                            │
├─────────────────────────────────────────────────────┤
│ Casualties:                                         │
│ ├── Attacker: 20 cavalry lost (40%)                │
│ └── Defender: 60 archers lost (60%)                │
│                                                     │
│ VP Awarded:                                         │
│ ├── Attacker: +187 VP                              │
│ └── Defender: +50 VP (participation)               │
│                                                     │
│ Territory Transferred: YES                          │
│ ├── Previous Owner: Tribe RED                      │
│ └── New Owner: Tribe WOW                           │
│                                                     │
│ Gold Looted: 0 (territory capture, not raid)       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TECHNICAL DETAILS                                   │
├─────────────────────────────────────────────────────┤
│ Battle Seed: a1b2c3d4e5f6 (deterministic)          │
│ Processing Time: 5.234 seconds                      │
│ Queue Position: 2 (waited 18s)                      │
│ Database Transaction: SUCCESS                       │
│ WebSocket Notification: SENT (both players)         │
└─────────────────────────────────────────────────────┘

ADMIN ACTIONS (Super Admin only):
[Replay Battle] (recalculate with same seed)
[Rollback Battle] (undo, return units) ⚠️ DANGEROUS
[Flag as Suspicious] (add to investigation queue)

⚠️ WARNING: Rollback will:
- Return all units to original owners
- Reverse territory ownership change
- Reverse VP changes
- Add note to audit log
- Notify both players

Only use if confirmed bug in battle formula.
```

**Battle Rollback Confirmation**:
```
ROLLBACK BATTLE #4521

Reason (required):
[Bug in cavalry counter calculation (GitHub issue #234).
Formula incorrectly applied 2x multiplier instead of 1.5x.
This caused attacker to win when defender should have won.]

Evidence:
[Link to GitHub issue: https://github.com/cryptotribes/issues/234]
[Battle recalculation shows defender should have had 207,360 power]

Actions that will be taken:
✓ Return 20 cavalry to WarriorKing (attacker)
✓ Return 60 archers to EnemyPlayer (defender)
✓ Transfer territory #23 back to Tribe RED
✓ Reverse VP changes (-187 attacker, -50 defender)
✓ Notify both players via in-game message
✓ Add note to public changelog (transparency)
✓ Log action in audit trail

This action is IRREVERSIBLE once confirmed.

Requires Two-Factor Authentication:
[Enter 6-digit code from Google Authenticator: ______]

[Confirm Rollback] [Cancel]
```

---

### 4.7 System Configuration

**URL**: `/admin/config` (Super Admin only)

```
GAME CONSTANTS (Global Defaults)

⚠️ Changes apply to NEW SEASONS ONLY.
   Active seasons will NOT be affected.

┌─────────────────────────────────────────────────────┐
│ UNIT STATS                                          │
├─────────────────────────────────────────────────────┤
│ Militia:                                            │
│ ├── Cost: [10]g                                    │
│ ├── HP: [100]                                      │
│ └── Damage: [10]                                   │
│                                                     │
│ Spearman:                                           │
│ ├── Cost: [25]g                                    │
│ ├── HP: [120]                                      │
│ └── Damage: [15]                                   │
│                                                     │
│ Archer:                                             │
│ ├── Cost: [30]g                                    │
│ ├── HP: [80]                                       │
│ └── Damage: [20]                                   │
│                                                     │
│ Cavalry:                                            │
│ ├── Cost: [50]g                                    │
│ ├── HP: [150]                                      │
│ └── Damage: [25]                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ BUILDING COSTS (per level)                          │
├─────────────────────────────────────────────────────┤
│ Barracks: [100, 200, 400, 800, 1500, 2000, 2500, 3000, 3000]
│ Warehouse: [80, 150, 300, 600, 1000, 1500, 1800, 2000, 2000]
│ Workshop: [150, 300, 600, 1200, 2000, 3000, 3500, 4000, 4000]
│
│ [Edit JSON] [Import from File] [Export to File]    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ECONOMIC SETTINGS                                   │
├─────────────────────────────────────────────────────┤
│ Base Gold Generation: [10]g/hr                      │
│ Territory Upkeep: [20]g/hr                          │
│ Army Upkeep: [1]g/hr per [10] units                │
│                                                     │
│ Diminishing Returns (by territory count):          │
│ ├── 1-5:  [100]%                                   │
│ ├── 6-10: [80]%                                    │
│ ├── 11-15: [60]%                                   │
│ ├── 16-20: [40]%                                   │
│ └── 21+:  [20]%                                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ANTI-SNOWBALL MECHANICS                             │
├─────────────────────────────────────────────────────┤
│ Leader Upkeep Penalties:                            │
│ ├── Rank 1: +[50]%                                 │
│ ├── Rank 2: +[25]%                                 │
│ └── Rank 3: +[10]%                                 │
│                                                     │
│ Underdog VP Bonuses:                                │
│ ├── Rank 4-6:  +[15]%                              │
│ ├── Rank 7-10: +[25]%                              │
│ └── Rank 11+:  +[50]%                              │
└─────────────────────────────────────────────────────┘

[Save Changes] [Reset to Default] [View Change History]

⚠️ Changes will be logged in audit trail.
   Super Admin approval required.
```

---

### 4.8 Analytics & Reports

**URL**: `/admin/analytics`

```
SEASON 3 ANALYTICS (Day 7/10)

┌─────────────────────────────────────────────────────┐
│ PLAYER ENGAGEMENT                                   │
├─────────────────────────────────────────────────────┤
│ Registered: 847 players                             │
│ Active (last 24h): 782 (92%)                        │
│ Active (last 48h): 812 (96%)                        │
│ Inactive (3+ days): 35 (4%)                         │
│                                                     │
│ Average Session Length: 68 minutes                  │
│ Daily Logins per Player: 4.2                        │
│ Peak Concurrent Users: 512 (2025-12-01 20:00 UTC)  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ COMBAT STATISTICS                                   │
├─────────────────────────────────────────────────────┤
│ Total Battles: 12,304                               │
│ PvP Battles: 8,421 (68%)                            │
│ PvE Battles: 3,883 (32%)                            │
│                                                     │
│ Average Battles per Player: 14.5                    │
│ Battles per Day: 1,758 avg                          │
│                                                     │
│ Unit Composition (armies):                          │
│ ├── Militia: 28%                                   │
│ ├── Spearman: 24%                                  │
│ ├── Archer: 26%                                    │
│ └── Cavalry: 22%                                   │
│                                                     │
│ ✅ Diversity Score: 0.95 (good balance)            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ECONOMIC HEALTH                                     │
├─────────────────────────────────────────────────────┤
│ Total Gold in Circulation: 2.4M                     │
│ Average Gold per Player: 2,835g                     │
│ Median Gold per Player: 1,920g                      │
│                                                     │
│ Gold Generation (hourly):                           │
│ ├── Passive: 8,470g/hr                             │
│ ├── Territories: 32,400g/hr                         │
│ └── Total: 40,870g/hr                              │
│                                                     │
│ Gold Sinks (hourly):                                │
│ ├── Territory Upkeep: 18,200g/hr                   │
│ ├── Army Upkeep: 6,340g/hr                         │
│ └── Total: 24,540g/hr                              │
│                                                     │
│ Net Income: +16,330g/hr (inflation risk: LOW)      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ LEADERBOARD HEALTH                                  │
├─────────────────────────────────────────────────────┤
│ Top Tribe VP: 25,400                                │
│ 5th Tribe VP: 18,100                                │
│ Gap: 40% (⚠️ borderline snowball risk)             │
│                                                     │
│ Gini Coefficient: 0.58 (✅ acceptable, target <0.65)│
│                                                     │
│ Territory Distribution:                             │
│ ├── Top 5 tribes: 68 territories (68%)             │
│ ├── Next 10 tribes: 25 territories (25%)           │
│ └── Rest: 7 territories (7%)                       │
│                                                     │
│ ⚠️ Recommendation: Monitor top tribe closely.       │
│    If gap exceeds 50% by Day 8, consider           │
│    announcing "Underdog Bonus Event" (double VP)   │
└─────────────────────────────────────────────────────┘

[Export Full Report (CSV)] [View Historical Data] [Set Alerts]
```

---

## 5. Security & Authentication

### 5.1 Admin Authentication

**Super Admin**:
- Email + Password + Google Authenticator (2FA)
- IP Whitelist (only office IPs)
- Session timeout: 30 minutes
- Re-authentication required for critical actions (battle rollback, prize distribution)

**Game Master / Moderator**:
- Wallet-based authentication (same as players)
- Admin wallet addresses stored in `.env` (whitelist)
- Session timeout: 2 hours
- No IP restrictions (can work remotely)

**Login Flow**:
```
1. User navigates to /admin
2. If not authenticated → redirect to /admin/login

Super Admin Login:
├── Email: [admin@cryptotribes.io]
├── Password: [********]
├── 2FA Code: [______] (Google Authenticator)
└── [Login]

Game Master/Moderator Login:
├── [Connect Wallet] (MetaMask/WalletConnect)
├── Sign message to verify wallet ownership
├── Server checks if wallet in ADMIN_WALLETS whitelist
├── If yes → grant access with appropriate role
└── If no → show "Access Denied"
```

### 5.2 Environment Variables

```bash
# .env (Super Admin)
SUPER_ADMIN_EMAIL=admin@cryptotribes.io
SUPER_ADMIN_PASSWORD_HASH=<bcrypt hash>
SUPER_ADMIN_2FA_SECRET=<Google Authenticator secret>
SUPER_ADMIN_IP_WHITELIST=185.234.12.0/24,10.0.0.0/8

# .env (Game Masters & Moderators)
GAME_MASTER_WALLETS=0x742d35cc...,0x8a3f4b2c...,0x2c4d8e1f...
MODERATOR_WALLETS=0x9b2c3d4e...,0x5f6g7h8i...,0x1j2k3l4m...

# JWT
ADMIN_JWT_SECRET=<strong random secret>
ADMIN_JWT_EXPIRES_IN=2h
```

### 5.3 Role Checking Middleware

```javascript
// server/middlewares/adminAuth.js
function requireSuperAdmin(req, res, next) {
  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Super Admin access required'
    });
  }
  next();
}

function requireGameMasterOrAbove(req, res, next) {
  if (!['super_admin', 'game_master'].includes(req.admin.role)) {
    return res.status(403).json({
      error: 'Game Master or Super Admin access required'
    });
  }
  next();
}

// Usage
app.post('/admin/battles/rollback',
  authenticate,
  requireSuperAdmin,
  rollbackBattleHandler
);
```

---

## 6. Audit Logging

### 6.1 Audit Log Schema

```javascript
// models/AdminAuditLog.js
{
  _id: ObjectId,

  // Who
  adminId: ObjectId, // ref: Admin
  adminRole: String, // 'super_admin' | 'game_master' | 'moderator'
  adminWallet: String, // or email for Super Admin

  // What
  action: String, // 'BAN_PLAYER', 'CREATE_SEASON', 'GIVE_COMPENSATION', etc.
  actionCategory: String, // 'moderation', 'season', 'battle', 'payment'

  // Where
  target: {
    type: String, // 'user', 'tribe', 'battle', 'season'
    id: ObjectId,
    name: String // optional, for readability
  },

  // Why
  reason: String, // required for sensitive actions
  evidence: String, // optional, links to proof

  // Details
  changes: Object, // before/after state
  metadata: Object, // any additional context

  // When
  timestamp: Date,

  // Result
  status: String, // 'success', 'failed', 'pending_approval'
  approvedBy: ObjectId, // if requires approval
  approvalTimestamp: Date
}
```

### 6.2 Logged Actions

**High-Risk Actions** (always logged):
- Ban player (any duration)
- Give compensation (gold/units)
- Rollback battle
- Disqualify tribe
- Create/delete season
- Change game constants
- Process prize distribution
- Delete admin

**Medium-Risk Actions** (logged):
- Kick player from season
- Flag player/tribe for review
- Issue warning
- Resolve report
- Force end season

**Low-Risk Actions** (not logged):
- View player details
- Search players
- View analytics
- Navigate admin panel

### 6.3 Audit Log Viewing

**URL**: `/admin/audit-logs` (Super Admin only)

```
AUDIT LOGS

Filter:
├── Admin: [All Admins ▼]
├── Action: [All Actions ▼]
├── Date Range: [Last 7 Days ▼]
└── Status: [All ▼]

[Search]

Results (234 logs):

┌────────────────────────────────────────────────────┐
│ 2025-12-01 15:30 UTC                               │
│ Admin: GameMaster_Alice (Game Master)              │
│ Action: PROPOSE_TRIBE_DISQUALIFICATION             │
│ Target: Tribe "Warriors of Winter" (#3)           │
│ Reason: Multi-accounting (3/12 members confirmed) │
│ Status: PENDING_APPROVAL                           │
│ [View Details]                                     │
└────────────────────────────────────────────────────┘

│ 2025-12-01 14:45 UTC                               │
│ Admin: SuperAdmin_Dev (Super Admin)               │
│ Action: GIVE_COMPENSATION                          │
│ Target: Player "WarriorKing" (0x742d...)          │
│ Amount: 20 Archers (600g value)                   │
│ Reason: Battle calculation bug (#234)             │
│ Status: SUCCESS                                    │
│ [View Details]                                     │
└────────────────────────────────────────────────────┘

│ 2025-12-01 12:00 UTC                               │
│ Admin: Moderator_John (Moderator)                 │
│ Action: BAN_PLAYER                                 │
│ Target: Player "N@ziKiller88" (0x8a3f...)         │
│ Duration: 7 days                                   │
│ Reason: Offensive username (TOS 5.3)              │
│ Status: SUCCESS                                    │
│ [View Details]                                     │
└────────────────────────────────────────────────────┘

[Load More...]
```

**Audit Log Detail**:
```
AUDIT LOG #5421

Timestamp: 2025-12-01 14:45:32 UTC
Action: GIVE_COMPENSATION
Category: Player Management

┌─────────────────────────────────────────────────────┐
│ ADMIN DETAILS                                       │
├─────────────────────────────────────────────────────┤
│ Admin: SuperAdmin_Dev                               │
│ Role: Super Admin                                   │
│ Wallet: 0xDEV_WALLET (hidden for security)         │
│ IP Address: 185.234.12.45 (Office - New York)      │
│ Session ID: sess_a1b2c3d4e5f6                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TARGET                                              │
├─────────────────────────────────────────────────────┤
│ Player: WarriorKing                                 │
│ Wallet: 0x742d35cc6634c0532925a3b844bc9e7595f0beb  │
│ Season: Season 3 (Day 7)                            │
│ Tribe: Warriors of Winter (Chieftain)               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ACTION DETAILS                                      │
├─────────────────────────────────────────────────────┤
│ Compensation Given:                                 │
│ ├── Gold: 0g                                       │
│ └── Units: 20 Archers (value: 600g)               │
│                                                     │
│ Reason:                                             │
│ "Battle calculation bug on 2025-12-01 caused       │
│ player to lose 20 archers incorrectly.             │
│ Battle #4521. Compensating with 20 archers."       │
│                                                     │
│ Evidence:                                           │
│ └── GitHub Issue: https://github.com/.../issues/234│
│ └── Battle Log: /admin/battles/4521                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ STATE CHANGES                                       │
├─────────────────────────────────────────────────────┤
│ Before:                                             │
│ └── Army: { archer: 60, ... }                      │
│                                                     │
│ After:                                              │
│ └── Army: { archer: 80, ... }                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ APPROVAL CHAIN (if required)                        │
├─────────────────────────────────────────────────────┤
│ No approval required (Super Admin action)           │
└─────────────────────────────────────────────────────┘

Status: SUCCESS
Result: Player received 20 archers. In-game notification sent.
```

---

## 7. Database Schema

### 7.1 Admin Collection

```javascript
// models/Admin.js
const adminSchema = new mongoose.Schema({
  // Identity
  role: {
    type: String,
    enum: ['super_admin', 'game_master', 'moderator'],
    required: true
  },

  // Super Admin (email-based)
  email: {
    type: String,
    unique: true,
    sparse: true, // allows null for non-Super Admins
    lowercase: true
  },
  passwordHash: String, // bcrypt hash
  twoFactorSecret: String, // Google Authenticator

  // Game Master / Moderator (wallet-based)
  walletAddress: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true
  },

  // Profile
  name: String,
  joinedAt: Date,
  lastLogin: Date,

  // Permissions (optional granular permissions)
  customPermissions: {
    canBanPlayers: Boolean,
    canGiveCompensation: Boolean,
    canRollbackBattles: Boolean,
    canCreateSeasons: Boolean,
    canDisqualifyTribes: Boolean
  },

  // Status
  active: {
    type: Boolean,
    default: true
  },

  // Metadata
  createdBy: ObjectId, // ref: Admin (Super Admin who created this admin)
  createdAt: Date,
  updatedAt: Date
});

adminSchema.index({ email: 1 });
adminSchema.index({ walletAddress: 1 });
adminSchema.index({ role: 1, active: 1 });

module.exports = mongoose.model('Admin', adminSchema);
```

### 7.2 Admin Audit Log Collection

```javascript
// models/AdminAuditLog.js
const auditLogSchema = new mongoose.Schema({
  // Who
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  adminRole: {
    type: String,
    enum: ['super_admin', 'game_master', 'moderator'],
    required: true
  },
  adminIdentifier: String, // wallet or email

  // What
  action: {
    type: String,
    required: true,
    index: true
  },
  actionCategory: {
    type: String,
    enum: ['moderation', 'season', 'battle', 'payment', 'system'],
    required: true,
    index: true
  },

  // Where
  target: {
    type: {
      type: String,
      enum: ['user', 'tribe', 'battle', 'season', 'admin', 'system']
    },
    id: mongoose.Schema.Types.ObjectId,
    name: String
  },

  // Why
  reason: String,
  evidence: String,

  // Details
  changesBefore: mongoose.Schema.Types.Mixed,
  changesAfter: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,

  // Context
  ipAddress: String,
  sessionId: String,

  // When
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Result
  status: {
    type: String,
    enum: ['success', 'failed', 'pending_approval'],
    default: 'success'
  },
  errorMessage: String,

  // Approval (if required)
  requiresApproval: Boolean,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvalTimestamp: Date,
  approvalComments: String
});

auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ 'target.type': 1, 'target.id': 1 });
auditLogSchema.index({ status: 1 });

module.exports = mongoose.model('AdminAuditLog', auditLogSchema);
```

---

## 8. API Endpoints

### 8.1 Admin Authentication

```
POST /api/admin/auth/login/super
POST /api/admin/auth/login/wallet
POST /api/admin/auth/refresh
POST /api/admin/auth/logout
POST /api/admin/auth/verify-2fa
```

### 8.2 Season Management

```
GET    /api/admin/seasons
GET    /api/admin/seasons/:seasonId
POST   /api/admin/seasons/create (Super Admin + Game Master)
PUT    /api/admin/seasons/:seasonId (Super Admin + Game Master)
DELETE /api/admin/seasons/:seasonId (Super Admin only)
POST   /api/admin/seasons/:seasonId/start (Super Admin only)
POST   /api/admin/seasons/:seasonId/end (Super Admin only)
GET    /api/admin/seasons/:seasonId/analytics
```

### 8.3 Player Management

```
GET    /api/admin/players/search?q=wallet&season=X
GET    /api/admin/players/:playerId
POST   /api/admin/players/:playerId/flag
POST   /api/admin/players/:playerId/warn
POST   /api/admin/players/:playerId/ban
POST   /api/admin/players/:playerId/kick
POST   /api/admin/players/:playerId/compensate (Super Admin only)
GET    /api/admin/players/:playerId/battles
GET    /api/admin/players/:playerId/activity
```

### 8.4 Tribe Management

```
GET    /api/admin/tribes/search?q=name&season=X
GET    /api/admin/tribes/:tribeId
POST   /api/admin/tribes/:tribeId/flag
POST   /api/admin/tribes/:tribeId/propose-disqualify (Game Master)
POST   /api/admin/tribes/:tribeId/approve-disqualify (Super Admin)
GET    /api/admin/tribes/:tribeId/treasury-logs (Game Master+)
GET    /api/admin/tribes/:tribeId/chat-logs (with justification)
```

### 8.5 Moderation

```
GET    /api/admin/moderation/reports?status=pending
GET    /api/admin/moderation/reports/:reportId
POST   /api/admin/moderation/reports/:reportId/resolve
GET    /api/admin/moderation/appeals?status=pending
POST   /api/admin/moderation/appeals/:appealId/approve
POST   /api/admin/moderation/appeals/:appealId/reject
```

### 8.6 Battle Management

```
GET    /api/admin/battles/search?battleId=X&playerId=Y
GET    /api/admin/battles/:battleId
POST   /api/admin/battles/:battleId/replay (Super Admin)
POST   /api/admin/battles/:battleId/rollback (Super Admin + 2FA)
POST   /api/admin/battles/:battleId/flag
```

### 8.7 System Configuration

```
GET    /api/admin/config/constants (Super Admin)
PUT    /api/admin/config/constants (Super Admin)
GET    /api/admin/config/admins (Super Admin)
POST   /api/admin/config/admins (Super Admin)
DELETE /api/admin/config/admins/:adminId (Super Admin)
```

### 8.8 Audit Logs

```
GET    /api/admin/audit-logs?admin=X&action=Y&from=Z (Super Admin)
GET    /api/admin/audit-logs/:logId (Super Admin)
```

### 8.9 Analytics

```
GET    /api/admin/analytics/dashboard?seasonId=X
GET    /api/admin/analytics/engagement?seasonId=X
GET    /api/admin/analytics/economy?seasonId=X
GET    /api/admin/analytics/leaderboard?seasonId=X
GET    /api/admin/analytics/balance?seasonId=X
```

---

## 9. UI Wireframes

### 9.1 Technology Stack for Admin Panel

**Option A: Custom React Admin Panel**
- React 18 + Vite
- TailwindCSS for styling
- React Router for navigation
- TanStack Table for data tables
- Recharts for analytics graphs

**Option B: Use Admin Framework (Recommended for MVP)**
- [React-Admin](https://marmelab.com/react-admin/) - most popular
- [AdminJS](https://adminjs.co/) - auto-generates admin from models
- [Refine](https://refine.dev/) - modern, headless

**My Vote**: **React-Admin** (saves 2-3 weeks of development)

### 9.2 Layout Structure

```
┌────────────────────────────────────────────────────────┐
│ HEADER                                                 │
│ [CryptoTribes Admin] [Dashboard] [Seasons] [Players]  │
│                      [Tribes] [Reports] [Config]       │
│                                          [Logout]      │
├────────────┬───────────────────────────────────────────┤
│ SIDEBAR    │ MAIN CONTENT AREA                         │
│            │                                           │
│ Dashboard  │ (Dynamic content based on route)          │
│ ───────    │                                           │
│ Seasons    │                                           │
│  └─ Active │                                           │
│  └─ Past   │                                           │
│  └─ Create │                                           │
│ ───────    │                                           │
│ Players    │                                           │
│  └─ Search │                                           │
│  └─ Flagged│                                           │
│ ───────    │                                           │
│ Tribes     │                                           │
│  └─ Search │                                           │
│  └─ Flagged│                                           │
│ ───────    │                                           │
│ Reports    │                                           │
│  └─ Pending│                                           │
│  └─ Solved │                                           │
│ ───────    │                                           │
│ Battles    │                                           │
│ Analytics  │                                           │
│ ───────    │                                           │
│ Config     │ (Super Admin only)                        │
│ Audit Logs │ (Super Admin only)                        │
│            │                                           │
└────────────┴───────────────────────────────────────────┘
```

---

## 10. Implementation Priority

### Phase 1: Critical (Week 1-2)
**Must have for Season 1 launch**

1. ✅ Admin Authentication (Super Admin + wallet-based)
2. ✅ Role-based access control (3 roles)
3. ✅ Audit logging (all admin actions)
4. ✅ Player Management (view, flag, ban, kick)
5. ✅ Basic Moderation Queue (view reports, resolve)

**Deliverable**: Admins can moderate players and handle reports

---

### Phase 2: Important (Week 3-4)
**Needed before Season 1 but not Day 1**

6. ✅ Season Management (create, configure Ring System)
7. ✅ Tribe Management (view, flag, disqualify proposal)
8. ✅ Battle Logs (view battles, flag suspicious)
9. ✅ Basic Analytics Dashboard (player count, battles, VP)
10. ✅ Compensation System (give gold/units)

**Deliverable**: Admins can manage seasons and compensate for bugs

---

### Phase 3: Nice-to-Have (Week 5-6)
**Can be added after Season 1 launch**

11. ✅ Advanced Analytics (engagement, economy, balance metrics)
12. ✅ Battle Rollback (for critical bugs)
13. ✅ Appeal System (players can contest bans)
14. ✅ Treasury Logs (view tribe treasury transactions)
15. ✅ Chat Logs (for investigation with justification)

**Deliverable**: Full-featured admin panel with deep insights

---

### Phase 4: Future (Post-Season 1)
**After proving the game works**

16. ⏳ Admin Dashboard Widgets (customizable)
17. ⏳ Automated Anti-Cheat Triggers (flag players automatically)
18. ⏳ Email Notifications (for admins on critical events)
19. ⏳ Export Reports (CSV, PDF for analytics)
20. ⏳ Admin Activity Heatmap (see when admins are most active)

---

## Summary

### Key Decisions (Confirmed)

✅ **3 Roles**: Super Admin, Game Master, Moderator
✅ **Compensation Allowed**: Super Admin can give resources (with reason logged)
✅ **Battle Rollback**: Super Admin only, with confirmation (pre-season testing prevents need)
✅ **Tribe Disqualification**: Game Master proposes, Super Admin approves
✅ **Admin Panel UI**: Build after project base is set up
✅ **Mid-Season Constants**: NO changes during active season (only between seasons)

### Development Timeline Estimate

- **Phase 1** (Critical): 2 weeks
- **Phase 2** (Important): 2 weeks
- **Phase 3** (Nice-to-Have): 2 weeks
- **Total**: 6 weeks for full admin system

**Recommendation**: Build Phase 1 + Phase 2 (4 weeks) before Season 1 launch. Phase 3 can be added based on operational needs.

---

**Next Steps**:
1. Create Admin models (Admin, AdminAuditLog)
2. Implement authentication (Super Admin email + Game Master wallet)
3. Build role-checking middleware
4. Create basic admin API endpoints
5. Set up React-Admin framework for UI

---

**End of Admin System Specification**
