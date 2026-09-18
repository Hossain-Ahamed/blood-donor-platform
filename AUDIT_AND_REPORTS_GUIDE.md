# Audit Logs & Abuse Reports System Guide

A comprehensive architectural, structural, and operational guide to the **Abuse Reporting & Moderation Queue** and the **Immutable Audit Logging System** in the RoktoLink Blood Donation Platform.

---

## Table of Contents
1. [High-Level Architecture & Flow](#1-high-level-architecture--flow)
2. [UML Diagrams Suite](#2-uml-diagrams-suite)
   - [2.1 UML Class Diagram (Structural Model)](#21-uml-class-diagram-structural-model)
   - [2.2 UML Use Case Diagram (Functional Model)](#22-uml-use-case-diagram-functional-model)
   - [2.3 UML Sequence Diagram (Adjudication & Auditing Flow)](#23-uml-sequence-diagram-adjudication--auditing-flow)
   - [2.4 UML Activity Diagram (Moderation & Self-Defense Pipeline)](#24-uml-activity-diagram-moderation--self-defense-pipeline)
   - [2.5 UML Entity Relationship Diagram (Data Model)](#25-uml-entity-relationship-diagram-data-model)
3. [Abuse Reporting & Moderation Subsystem](#3-abuse-reporting--moderation-subsystem)
   - [3.1 Reporting Entrypoints in UI](#31-reporting-entrypoints-in-ui)
   - [3.2 Input Sanitization & Anti-Spam Cooldown](#32-input-sanitization--anti-spam-cooldown)
   - [3.3 Admin Moderation Queue & Resolution Workflow](#33-admin-moderation-queue--resolution-workflow)
   - [3.4 Self-Account Protection Mechanism](#34-self-account-protection-mechanism)
   - [3.5 Polymorphic Target Enrichment](#35-polymorphic-target-enrichment)
4. [Immutable Audit Logging Subsystem](#4-immutable-audit-logging-subsystem)
   - [4.1 Append-Only Compliance Architecture](#41-append-only-compliance-architecture)
   - [4.2 Logged Administrative Operations](#42-logged-administrative-operations)
   - [4.3 Changeset Structure (Before vs After)](#43-changeset-structure-before-vs-after)
   - [4.4 Audit Viewer & Compliance Export](#44-audit-viewer--compliance-export)
5. [Human-Readable Formatting Layer](#5-human-readable-formatting-layer)
6. [Security & Safeguards Matrix](#6-security--safeguards-matrix)
7. [Verification & Developer Guide](#7-verification--developer-guide)

---

## 1. High-Level Architecture & Flow

```mermaid
flowchart TD
    subgraph Users ["Actors & Clients"]
        R[Requester / Donor]
        A[Platform Administrator]
    end

    subgraph Web ["Next.js Frontend (apps/web)"]
        RD[ReportDialog Modal]
        ADR["Admin Reports Queue (/admin/reports)"]
        ADL["Admin Audit Logs (/admin/audit-logs)"]
        ADU["Admin Users Table (/admin/users)"]
    end

    subgraph API ["NestJS Backend (apps/api)"]
        RC[ReportsController / ReportsService]
        AC[AdminAuditLogsController / AuditLogsService]
        UC[AdminUsersController / AdminUsersService]
        Sanitizer[sanitize-html]
        Guard[Auth & Admin Guard]
    end

    subgraph Cache ["Redis (cache-manager)"]
        Cooldown["report:cooldown:{userId}:{targetId}\n(15-min Anti-Spam TTL)"]
        Stampede["Stampede Lock & Memoization\n(reports:list, audit:list)"]
    end

    subgraph Database ["PostgreSQL (blood_platform)"]
        TReports[(reports)]
        TAudit[(audit_logs)]
        TUsers[(users)]
        TRequests[(requests)]
    end

    %% Report Creation Flow
    R -->|1. Submit Report| RD
    RD -->|POST /v1/reports| RC
    RC -->|Check Cooldown| Cooldown
    RC -->|Sanitize Reason| Sanitizer
    RC -->|Save Pending Report| TReports

    %% Admin Moderation Flow
    A -->|2. Investigate Queue| ADR
    ADR -->|GET /v1/reports| RC
    RC -->|Fetch & Enrich Targets| TReports
    RC -.->|Read metadata| TUsers
    RC -.->|Read metadata| TRequests
    RC -->|Cache Stampede Shield| Stampede

    %% Admin Action & Audit Flow
    A -->|3. Resolve & Penalty| ADR
    ADR -->|PATCH /v1/reports/:id| RC
    RC -->|Self-Block Guard Check| RC
    RC -->|Optional Action: Block User| TUsers
    RC -->|Optional Action: Cancel Req| TRequests
    RC -->|Record Audit Entry| AC
    AC -->|Append Only Insert| TAudit

    %% Direct Admin Actions
    A -->|4. Manage Users| ADU
    ADU -->|PATCH /v1/admin/users/:id| UC
    UC -->|Self-Action Guard Check| UC
    UC -->|Record Audit Entry| AC

    %% Audit Log Inspection
    A -->|5. Compliance Review| ADL
    ADL -->|GET /v1/admin/audit-logs| AC
    AC -->|Enrich Target Summaries| TAudit
```

---

## 2. UML Diagrams Suite

### 2.1 UML Class Diagram (Structural Model)

This diagram captures the internal structural model across entities, services, controllers, DTOs, and shared types.

```mermaid
classDiagram
    direction TB

    class User {
        +UUID id
        +String google_id
        +String email
        +String name
        +String avatar_url
        +String phone
        +UserRole role
        +Boolean is_active
        +Date created_at
        +Date updated_at
        +Date deleted_at
    }

    class BloodRequest {
        +UUID id
        +UUID requester_id
        +BloodGroup blood_group
        +ComponentType component_type
        +Int units_needed
        +Int units_fulfilled
        +UrgencyLevel urgency
        +String area_name
        +String hospital_name
        +RequestStatus status
        +Date expires_at
        +Date created_at
    }

    class Report {
        +UUID id
        +UUID reporter_id
        +ReportTargetType target_type
        +UUID target_id
        +String reason
        +ReportStatus status
        +UUID reviewed_by
        +Date created_at
        +Date reviewed_at
    }

    class AuditLog {
        +UUID id
        +UUID admin_id
        +String action
        +String target_type
        +UUID target_id
        +Record meta
        +Date created_at
    }

    class ReportsController {
        -ReportsService reportsService
        +create(req, dto) Promise~Report~
        +findAll(query) Promise~PaginatedReports~
        +getStats(fresh) Promise~ReportStats~
        +update(id, dto, req) Promise~Report~
    }

    class ReportsService {
        -Repository~Report~ reportRepository
        -Repository~User~ userRepository
        -Repository~BloodRequest~ requestRepository
        -AuditLogsService auditLogsService
        -Cache cacheManager
        +create(userId, dto) Promise~Report~
        +findAll(query) Promise~PaginatedReports~
        +getStats(fresh) Promise~ReportStats~
        +update(id, dto, adminId) Promise~Report~
        -enrichTargets(reports) Promise~EnrichedReport[]~
    }

    class AdminAuditLogsController {
        -AuditLogsService auditLogsService
        +findAll(query) Promise~PaginatedAuditLogs~
        +getStats(fresh) Promise~AuditStats~
        +getAdmins(fresh) Promise~AdminSummary[]~
        +exportCsv(query, res) Promise~void~
    }

    class AuditLogsService {
        -Repository~AuditLog~ auditLogRepository
        -Repository~User~ userRepository
        -Repository~BloodRequest~ requestRepository
        -Cache cacheManager
        +record(adminId, action, targetType, targetId, meta) Promise~AuditLog~
        +findAll(query) Promise~PaginatedAuditLogs~
        +getStats(fresh) Promise~AuditStats~
        +getAdmins(fresh) Promise~AdminSummary[]~
        -enrichTargets(logs) Promise~EnrichedAuditLog[]~
    }

    class AdminUsersService {
        -Repository~User~ userRepository
        -AuditLogsService auditLogsService
        -Cache cacheManager
        +updateUserRole(adminId, targetId, role, reason) Promise~User~
        +updateUserStatus(adminId, targetId, is_active, reason) Promise~User~
    }

    class EnrichedReport {
        +User reporter
        +User reviewer
        +TargetSummary target
    }

    class EnrichedAuditLog {
        +User admin
        +TargetSummary target
    }

    class TargetSummary {
        +String id
        +String type
        +String label
        +String details
        +String status
        +Record extra
    }

    %% Relationships
    User "1" --> "*" Report : submits (reporter_id)
    User "1" --> "*" Report : moderates (reviewed_by)
    User "1" --> "*" AuditLog : executes (admin_id)
    User "1" --> "*" BloodRequest : creates (requester_id)

    ReportsController ..> ReportsService : delegates
    AdminAuditLogsController ..> AuditLogsService : delegates

    ReportsService --> AuditLogsService : calls record()
    AdminUsersService --> AuditLogsService : calls record()

    ReportsService --> Report : manages
    AuditLogsService --> AuditLog : appends
    AdminUsersService --> User : mutates

    Report <|-- EnrichedReport : extends
    AuditLog <|-- EnrichedAuditLog : extends
    EnrichedReport *-- TargetSummary : includes
    EnrichedAuditLog *-- TargetSummary : includes
```

---

### 2.2 UML Use Case Diagram (Functional Model)

```mermaid
flowchart LR
    %% Actors
    User(("👤 User\n(Requester / Donor)"))
    Admin(("🛡️ Platform Admin"))
    Auditor(("📋 Auditor /\nCompliance Officer"))

    subgraph PlatformBoundary ["RoktoLink Platform Boundary"]
        subgraph AbuseReporting ["Abuse Reporting Subsystem"]
            UC1(["Submit Blood Request Report"])
            UC2(["Submit Donor Misconduct / Extortion Report"])
            UC3(["Sanitize Content & Block Spam Cooldown"])
            UC4(["View Abuse Reports Queue"])
            UC5(["Inspect Report Details & Target Info"])
            UC6(["Adjudicate Report (Action / Review / Dismiss)"])
            UC7(["Block Abusive User Account"])
            UC8(["Cancel Fraudulent Blood Request"])
            UC9(["Self-Account Protection Guard"])
        end

        subgraph AuditLogging ["Immutable Audit Trail Subsystem"]
            UC10(["Record Append-Only Audit Entry"])
            UC11(["View & Filter Administrative Audit Trail"])
            UC12(["Inspect Changeset (Before vs After JSON)"])
            UC13(["Export Audit Logs for Compliance (CSV)"])
        end
    end

    %% User Interactions
    User --> UC1
    User --> UC2
    UC1 -.->|"<<include>>"| UC3
    UC2 -.->|"<<include>>"| UC3

    %% Admin Moderation Interactions
    Admin --> UC4
    Admin --> UC5
    Admin --> UC6
    UC6 -.->|"<<extend>>"| UC7
    UC6 -.->|"<<extend>>"| UC8
    UC7 -.->|"<<include>>"| UC9
    UC6 -.->|"<<include>>"| UC10
    UC7 -.->|"<<include>>"| UC10
    UC8 -.->|"<<include>>"| UC10

    %% Audit Interactions
    Admin --> UC11
    Admin --> UC12
    Admin --> UC13
    Auditor --> UC11
    Auditor --> UC12
    Auditor --> UC13
```

---

### 2.3 UML Sequence Diagram (Adjudication & Auditing Flow)

The following sequence illustrates an administrator resolving a fraudulent blood request report, issuing a cancellation, and creating an immutable audit entry:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator
    participant Web as Admin Reports UI (/admin/reports)
    participant RC as ReportsController
    participant RS as ReportsService
    participant AS as AuditLogsService
    participant Redis as Redis Cache
    participant DB as PostgreSQL

    Admin->>Web: Clicks "Action" on Report #R123
    Admin->>Web: Selects "Actioned" & checks "Cancel Blood Request"
    Admin->>Web: Clicks "Confirm & Save"
    Web->>RC: PATCH /v1/reports/R123 { status: "ACTIONED", action_target: "CANCEL_REQUEST" }

    RC->>RS: update("R123", dto, adminId)
    RS->>DB: SELECT * FROM reports WHERE id = 'R123'
    DB-->>RS: report (target_type='REQUEST', target_id='REQ456')

    %% Administrative Action
    RS->>DB: SELECT * FROM requests WHERE id = 'REQ456'
    DB-->>RS: request (status='OPEN')
    RS->>DB: UPDATE requests SET status = 'CANCELLED' WHERE id = 'REQ456'
    
    %% Audit Entry 1: Cancel Request Action
    RS->>AS: record(adminId, "CANCEL_REQUEST", "REQUEST", "REQ456", { before: { status: 'OPEN' }, after: { status: 'CANCELLED' } })
    AS->>DB: INSERT INTO audit_logs (admin_id, action, target_type, target_id, meta, created_at)

    %% Report Resolution Update
    RS->>DB: UPDATE reports SET status = 'ACTIONED', reviewed_by = adminId, reviewed_at = NOW() WHERE id = 'R123'

    %% Audit Entry 2: Review Report Action
    RS->>AS: record(adminId, "REVIEW_REPORT", "REPORT", "R123", { before: { status: 'PENDING' }, after: { status: 'ACTIONED' } })
    AS->>DB: INSERT INTO audit_logs (admin_id, action, target_type, target_id, meta, created_at)

    %% Cache Invalidation
    RS->>Redis: Invalidate keys ("reports:stats", "admin:dashboard:stats", "cache:target:REQUEST:REQ456")
    
    RS-->>RC: updatedReport
    RC-->>Web: 200 OK (Report Object)
    Web-->>Admin: Show Success Toast ("Report resolved successfully")
```

---

### 2.4 UML Activity Diagram (Moderation & Self-Defense Pipeline)

```mermaid
stateDiagram-v2
    [*] --> SelectReport: Admin opens /admin/reports and selects report
    SelectReport --> DecideResolution: Review reporter info & target details

    state DecideResolution {
        [*] --> Choice
        Choice --> Dismiss: Deemed Invalid / Spam
        Choice --> Reviewed: Noted without penalty
        Choice --> Actioned: Verified infraction
    }

    Dismiss --> SaveResolution: Set status = DISMISSED
    Reviewed --> SaveResolution: Set status = REVIEWED

    state Actioned {
        [*] --> CheckActionTarget: Check penalty options
        CheckActionTarget --> NoPenalty: No direct mutation
        CheckActionTarget --> PenaltyUser: Penalty = BLOCK_USER
        CheckActionTarget --> PenaltyRequest: Penalty = CANCEL_REQUEST

        state PenaltyUser {
            [*] --> GuardCheck: Is target_id == adminId?
            GuardCheck --> SelfActionRejected: YES (Target is SELF)
            GuardCheck --> ExecuteUserBlock: NO (Target is other user)
            SelfActionRejected --> ThrowBadRequest: 400 Bad Request\n"Admins cannot block self"
            ExecuteUserBlock --> UpdateUserTable: UPDATE users SET is_active = false
            UpdateUserTable --> RecordUserBlockAudit: AuditLog: BLOCK_USER
        }

        state PenaltyRequest {
            [*] --> UpdateRequestTable: UPDATE requests SET status = 'CANCELLED'
            UpdateRequestTable --> RecordReqCancelAudit: AuditLog: CANCEL_REQUEST
        }
    }

    ThrowBadRequest --> [*]: Abort with User-Friendly Toast
    NoPenalty --> SaveResolution: Set status = ACTIONED
    RecordUserBlockAudit --> SaveResolution
    RecordReqCancelAudit --> SaveResolution

    SaveResolution --> UpdateReportRecord: UPDATE reports SET status, reviewed_by, reviewed_at
    UpdateReportRecord --> RecordReportAudit: AuditLog: REVIEW_REPORT
    RecordReportAudit --> ClearCache: Invalidate Redis stats & listings
    ClearCache --> [*]: Refresh Admin Dashboard
```

---

### 2.5 UML Entity Relationship Diagram (Data Model)

```mermaid
erDiagram
    USERS ||--o{ REPORTS : "files report (reporter_id)"
    USERS ||--o{ REPORTS : "reviews report (reviewed_by)"
    USERS ||--o{ AUDIT_LOGS : "executes action (admin_id)"
    USERS ||--o{ BLOOD_REQUESTS : "creates request (requester_id)"

    USERS {
        uuid id PK
        varchar google_id
        varchar email
        varchar name
        varchar avatar_url
        varchar phone
        varchar role "USER | ADMIN"
        boolean is_active
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    REPORTS {
        uuid id PK
        uuid reporter_id FK
        varchar target_type "USER | REQUEST"
        uuid target_id
        text reason
        varchar status "PENDING | REVIEWED | DISMISSED | ACTIONED"
        uuid reviewed_by FK
        timestamp created_at
        timestamp reviewed_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid admin_id FK
        varchar action "BLOCK_USER | UNBLOCK_USER | CHANGE_ROLE | CANCEL_REQUEST | REVIEW_REPORT | DELETE_REQUEST"
        varchar target_type "USER | REQUEST | REPORT"
        uuid target_id
        jsonb meta "changeset { before, after, reason, admin_note }"
        timestamp created_at
    }

    BLOOD_REQUESTS {
        uuid id PK
        uuid requester_id FK
        varchar blood_group "A_POS | A_NEG | B_POS | B_NEG | AB_POS | AB_NEG | O_POS | O_NEG"
        varchar component_type "WHOLE_BLOOD | PLATELETS | PLASMA | RBC | CRYO"
        integer units_needed
        integer units_fulfilled
        varchar urgency "NORMAL | URGENT | CRITICAL"
        varchar area_name
        varchar hospital_name
        varchar status "OPEN | PARTIALLY_FULFILLED | FULFILLED | EXPIRED | CANCELLED"
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }
```

---

## 3. Abuse Reporting & Moderation Subsystem

### 3.1 Reporting Entrypoints in UI

| Entrypoint | Component | Infraction Focus | Target Type |
| :--- | :--- | :--- | :--- |
| **Request Header** | `RequestDetailHeader.tsx` | Fake emergency, commercial blood seller, scam hospital | `REQUEST` |
| **Donor Card** | `RequesterResponseItem.tsx` | Donor demanding payment, extortion, harassment, no-show | `USER` |
| **Donor Modal** | `DonorProfileModal.tsx` | False identity, fraudulent credentials, misbehavior | `USER` |

#### Preset Options in `ReportDialog`:
- 💰 **Demanding money or payment for blood donation (strictly prohibited)**
- ⚠️ **Fake or fraudulent blood request**
- 🚫 **Harassment, hate speech, or inappropriate behavior**
- ❌ **No-show after committing without notice**
- 🎭 **Impersonation or deceptive identity**
- 📝 **Other misconduct**

---

### 3.2 Input Sanitization & Anti-Spam Cooldown

1. **Anti-XSS**: All user-submitted reasons pass through `sanitize-html` before reaching the database, stripping script tags and malicious payloads.
2. **Duplicate Cooldown**: ReportsService maintains a Redis key:
   ```text
   report:cooldown:{userId}:{targetId}  (TTL: 900 seconds = 15 minutes)
   ```
   Submitting duplicate reports within 15 minutes returns `400 Bad Request` with:
   *"You have already submitted a report for this item recently. Our admin team is reviewing it."*

---

### 3.3 Admin Moderation Queue & Resolution Workflow

The Moderation Queue at `/admin/reports` features:
- **Summary Metrics**: Pending count, actioned count, dismissed count, and total reports.
- **Filter Toolbar**: Filter by status (`PENDING`, `REVIEWED`, `ACTIONED`, `DISMISSED`), target type (`USER`, `REQUEST`), or search by reason/reporter name.
- **Detailed Inspection**: Shows the reporter’s identity, target details, and unedited reason text.
- **Resolution Decisions**:
  - `ACTIONED`: Confirms abuse; enables one-click penalties (`BLOCK_USER` or `CANCEL_REQUEST`).
  - `REVIEWED`: Infraction investigated and closed without active penalty.
  - `DISMISSED`: Flagged report deemed invalid, spam, or a false alarm.

---

### 3.4 Self-Account Protection Mechanism

To prevent administrative lockout or rogue behavior:
1. **Backend Guard**: Both `AdminUsersService` and `ReportsService` verify:
   ```ts
   if (targetId === adminId && !is_active) {
     throw new BadRequestException("Administrators cannot block their own account.");
   }
   if (targetId === adminId && role !== UserRole.ADMIN) {
     throw new BadRequestException("Administrators cannot remove their own administrator privileges.");
   }
   ```
2. **Frontend Safeguard**: The Admin UI detects if `report.target_id === currentAdmin.id`. It hides the block checkbox, displays a yellow `Self-Account Protected` alert, and disables the action trigger.

---

### 3.5 Polymorphic Target Enrichment

Because `reports` and `audit_logs` store polymorphic target references (`target_type` + `target_id`), the services batch-load target entities and construct a unified `TargetSummary`:
- **Blood Request Targets**: Automatically resolves blood group and unit count into clean human-readable text (`O+ (1 unit) at Dhaka Medical`).
- **User Targets**: Resolves user name, email, phone, and current status (`ACTIVE` vs `BLOCKED`).

---

## 4. Immutable Audit Logging Subsystem

### 4.1 Append-Only Compliance Architecture
- Audit records can **only be created**.
- The API intentionally exposes **no PATCH, PUT, or DELETE** endpoints for `/admin/audit-logs`.
- All administrative operations record before/after state snapshots in PostgreSQL `jsonb` columns.

---

### 4.2 Logged Administrative Operations

| Action | Source Module | Trigger | Metadata Captured |
| :--- | :--- | :--- | :--- |
| `BLOCK_USER` | `AdminUsersService` / `ReportsService` | Admin blocks abusive user | `{ reason, before: { is_active: true }, after: { is_active: false } }` |
| `UNBLOCK_USER` | `AdminUsersService` | Admin restores user access | `{ reason, before: { is_active: false }, after: { is_active: true } }` |
| `CHANGE_ROLE` | `AdminUsersService` | Admin promotes/demotes role | `{ reason, before: { role }, after: { role } }` |
| `CANCEL_REQUEST` | `ReportsService` | Admin cancels fraudulent request | `{ reason, before: { status }, after: { status: "CANCELLED" } }` |
| `DELETE_REQUEST` | `AdminRequestsService` | Admin deletes inappropriate post | `{ reason, deleted_at }` |
| `REVIEW_REPORT` | `ReportsService` | Admin adjudicates abuse report | `{ before: { status }, after: { status }, admin_note, action_target }` |

---

### 4.3 Changeset Structure (Before vs After)

```json
{
  "reason": "Blocked via Report #f92969c2: Demanding money from requester",
  "before": {
    "is_active": true
  },
  "after": {
    "is_active": false
  },
  "admin_note": "Confirmed demanding 5,000 BDT before donating blood."
}
```

---

### 4.4 Audit Viewer & Compliance Export

The Audit Log page (`/admin/audit-logs`) provides:
1. **Multi-Column Filtering**:
   - Filter by specific admin.
   - Filter by action code.
   - Filter by target type (`USER`, `REQUEST`, `REPORT`).
   - Filter by date range (`From` and `To`).
2. **Interactive Changeset Inspector**:
   - Visual side-by-side diff of `before` and `after` values.
   - Raw JSON toggle for engineering and forensics.
3. **CSV Export**:
   - Endpoint: `GET /v1/admin/audit-logs/export`
   - Exports the currently filtered audit logs directly to a downloadable CSV file.

---

## 5. Human-Readable Formatting Layer

Internal database columns use machine-friendly enums (`O_POS`, `WHOLE_BLOOD`, `CRITICAL`). Formatting occurs at both the API enrichment layer and frontend presentation layer:

```mermaid
graph LR
    DB[(PostgreSQL)] -->|"req.blood_group = 'O_POS'"| BE[ReportsService / AuditLogsService]
    BE -->|"formatBloodGroup('O_POS')\n=> 'O+'"| APIOut[Enriched JSON API Response]
    APIOut -->|"label: 'O+ (1 unit) at saads'"| FE[Next.js Admin Client]
    FE -->|"toHumanReadable(target?.label)"| UI[Browser Render: 'O+ (1 unit) at saads']
```

### Key Functions (`@repo/shared` & `@/lib/labels`):
- **`formatBloodGroup(bg)`**: Case-insensitively converts `O_POS`, `o_pos`, `a_neg`, `AB_POS` into `O+`, `A-`, `AB+`.
- **`toHumanReadable(str)`**:
  - Replaces embedded enum strings (`O_POS (1 units)` $\rightarrow$ `O+ (1 unit)`).
  - Normalizes unit count grammar (`1 units` $\rightarrow$ `1 unit`, `2 units` $\rightarrow$ `2 units`).
  - Converts system constants (`WHOLE_BLOOD` $\rightarrow$ `Whole Blood`, `CRITICAL` $\rightarrow$ `Critical`, `URGENT` $\rightarrow$ `Urgent`).

---

## 6. Security & Safeguards Matrix

| Threat / Scenario | Defense Mechanism | Implementation File |
| :--- | :--- | :--- |
| **Self-Deactivation** | Admin cannot deactivate own account | `apps/api/src/modules/admin/admin-users.service.ts` |
| **Self-Demotion** | Admin cannot remove own ADMIN role | `apps/api/src/modules/admin/admin-users.service.ts` |
| **Self-Block via Report** | Moderation action rejects self-block | `apps/api/src/modules/reports/reports.service.ts` |
| **Report Spam Flooding** | 15-minute Redis cooldown | `apps/api/src/modules/reports/reports.service.ts` |
| **Stored XSS in Reports** | `sanitize-html` payload stripping | `apps/api/src/modules/reports/reports.service.ts` |
| **Raw JSON Toast Errors** | `ApiError.extractMessage` cleanly unwraps nested errors | `apps/web/src/lib/api/client.ts` |
| **Cache Stampede / Dog-piling** | `getOrSetWithStampedeProtection` memoizes simultaneous DB queries | `apps/api/src/common/utils/cache.util.ts` |

---

## 7. Verification & Developer Guide

### 7.1 Running Automated Unit Tests
```bash
pnpm --filter api test
```
*Executes all 4 unit test suites (requests, donor profiles, audit logs, and reports moderation).*

### 7.2 Building the Project
```bash
# Rebuild shared contracts and formatting utilities
pnpm --filter @repo/shared build

# Full monorepo production build
pnpm -r build
```

### 7.3 Managing Redis Cache
```bash
# Check active report cooldowns
docker exec RoktoLink_redis redis-cli KEYS "*report*"

# Clear all cached stats and lists
docker exec RoktoLink_redis redis-cli FLUSHALL
```
