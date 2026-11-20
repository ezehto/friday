I want you to design and create a comprehensive implementation plan for building a personal **Friday AI system**.

The goal is to build a personal AI assistant that becomes the central interface for managing my work, projects, productivity, software development, and career/self-improvement.

Friday should be designed as a **modular, extensible AI platform** that can continuously evolve as I come up with new ideas, workflows, integrations, and capabilities.

Do not start coding immediately. First analyze the requirements, inspect my existing project/workflow where applicable, identify ambiguities and risks, and create the architecture and implementation plan.

---

# 1. Core Vision

Friday should become my primary AI assistant.

I should be able to interact with it through:

- Text
- Voice
- A visual dashboard
- Potentially other interfaces in the future

I should be able to ask things naturally such as:

> "What should I focus on today?"

> "Summarize my important emails."

> "What's blocking my projects?"

> "Prepare my standup."

> "What Jira tickets need my attention?"

> "How am I progressing toward becoming a Senior Software Engineer?"

> "Review this implementation."

> "Plan my week."

> "What did I work on last week?"

> "What should I learn next?"

Friday should understand the context behind these questions and coordinate the appropriate tools, systems, agents, and knowledge sources.

---

# 2. Friday Must Be the Main Agent

Friday should be the **primary/main agent and orchestrator**.

It should not attempt to perform every task itself.

Instead, Friday should be able to:

1. Understand the user's request.
2. Determine what capabilities are required.
3. Decide whether the task can be handled directly.
4. Delegate appropriate work to specialized subagents.
5. Coordinate results from those subagents.
6. Validate the results.
7. Present the final result to me.
8. Request approval when required.
9. Record useful context and outcomes.

Conceptually:

```text
User
  ↓
Friday Main Agent
  ↓
Understand / Plan / Route
  ↓
┌─────────────────────────────────────────┐
│             Subagents                   │
│                                         │
│ Email Agent       Jira Agent             │
│ Project Agent     Calendar Agent         │
│ Coding Agent      Research Agent         │
│ Career Agent      Knowledge Agent        │
│ Automation Agent  Reporting Agent       │
└─────────────────────────────────────────┘
  ↓
Friday Main Agent
  ↓
Validate / Synthesize / Decide
  ↓
Dashboard + Voice + Text
```

The main Friday agent should remain responsible for orchestration and final decision-making.

Subagents should have clearly defined responsibilities and limited context.

Avoid unnecessary multi-agent complexity. Use a subagent only when delegation provides a clear benefit.

---

# 3. Modular Architecture

A critical requirement is that Friday must be **modular by design**.

I expect to continuously come up with new ideas for capabilities that I want to integrate.

Examples could include:

- Finance
- Health/fitness
- Home automation
- News monitoring
- Research
- Document analysis
- Personal analytics
- Additional communication platforms
- Additional project-management systems
- Additional development tools
- Custom AI agents
- Automation workflows
- Reminders
- Personal knowledge management
- Other future ideas

Adding a new capability should NOT require rebuilding the entire system.

Design Friday around clear modules/plugins/integrations.

Separate:

```text
Core Friday
├── Main Agent / Orchestrator
├── Agent Runtime
├── Tool Registry
├── Workflow Engine
├── Memory / Knowledge
├── Integration Layer
├── Permission / Approval System
├── Event System
├── Observability
└── Dashboard API

Feature Modules
├── Email
├── Jira
├── Calendar
├── Projects
├── Coding
├── Career
├── Research
├── Automation
└── Future Modules
```

Each module should have clear interfaces and responsibilities.

Determine whether a plugin architecture, capability registry, tool registry, or another approach is most appropriate.

---

# 4. Existing Claude Workflow Integration

Friday must **extend my existing Claude workflow rather than replace it**.

I already have an existing workflow involving:

- Obsidian
- Second brain
- Claude Code
- Claude-mem
- Project documentation
- Task tracking
- Development workflows
- Structured notes
- Knowledge management

Friday should be able to use this existing ecosystem.

The architecture should clearly define:

```text
Friday
  ↓
Claude Code
  ↓
Claude-mem
  ↓
Obsidian / Second Brain
  ↓
Project / Task / Knowledge Systems
```

Determine whether this exact structure is appropriate or whether it should be improved.

Friday should be able to:

- Retrieve relevant knowledge
- Retrieve previous project context
- Retrieve historical decisions
- Retrieve previous work
- Store useful new knowledge
- Update appropriate documentation
- Connect tasks with project knowledge
- Connect decisions with implementation
- Reuse previous learnings
- Detect stale information
- Detect conflicting information
- Avoid unnecessary duplication
- Maintain documentation consistency

Do not make Friday another isolated knowledge base.

Instead, it should become an orchestration layer over my existing knowledge ecosystem.

---

# 5. Source of Truth

Define a clear source of truth for each type of information.

For example:

```text
Source Code
→ Git repository

Jira Tickets
→ Jira

Calendar
→ Calendar provider

Email
→ Email provider

Project Documentation
→ Obsidian / Second Brain

Historical AI Context
→ Claude-mem

Tasks
→ Task management system

Career Roadmap
→ Second Brain / Career module
```

Do not duplicate data unnecessarily.

Define how synchronization, caching, references, and updates should work.

---

# 6. Token Efficiency

**Token efficiency is a core architectural requirement.**

The system should minimize unnecessary LLM context usage while maintaining quality and reliability.

Do not simply solve token usage by making prompts shorter.

Optimize the entire information flow.

Consider:

### Context Management

- Only retrieve relevant context.
- Avoid loading entire projects unnecessarily.
- Retrieve information progressively.
- Use summaries where appropriate.
- Use references instead of duplicating large documents.
- Use hierarchical context.
- Use metadata before full content.
- Load detailed information only when needed.

### Agent Context

Subagents should receive only the context required for their task.

Avoid sending the entire Friday conversation or entire second brain to every subagent.

For example:

```text
Friday
  ↓
Task: Investigate Jira ticket ABC-123
  ↓
Jira Agent receives:
- Ticket
- Relevant project context
- Related documentation
- Required technical context

NOT:
- Entire second brain
- Entire Jira history
- Entire conversation
- Unrelated projects
```

### Memory Retrieval

Design efficient retrieval strategies for:

- Obsidian
- Claude-mem
- Jira
- Git
- Email
- Calendar
- Other systems

Use layered retrieval:

```text
Metadata
↓
Summary
↓
Relevant sections
↓
Full document only if required
```

### Model Routing

Consider whether different tasks should use different models based on:

- Complexity
- Cost
- Latency
- Context requirements
- Reliability

For example:

```text
Simple classification
→ Small / fast model

Summarization
→ Efficient model

Planning
→ Strong reasoning model

Complex architecture
→ Strong reasoning model

Simple tool execution
→ Small / fast model
```

Do not introduce model complexity unless the benefit is measurable.

### Tool Definitions

Keep tool descriptions and schemas concise.

Use predictable schemas.

Avoid unnecessarily large tool definitions.

Only expose relevant tools to the agent when possible.

### Conversation Management

Do not continuously send the entire conversation history.

Use:

- Conversation summaries
- Task state
- Working memory
- Relevant historical context
- Persistent memory

### Token Budgeting

The system should be able to measure:

- Tokens per request
- Tokens per agent
- Tokens per tool call
- Input/output tokens
- Context retrieval size
- Cost
- Latency

Create mechanisms to identify expensive workflows.

Token efficiency should be treated as a measurable engineering metric.

---

# 7. AI Voice Interface

I want to be able to **talk to Friday naturally**, similar to a real personal assistant.

Research and recommend suitable technologies for:

### Speech-to-Text

Evaluate options for:

- Real-time transcription
- Accuracy
- Latency
- Streaming
- Cost
- Privacy
- API availability

### Text-to-Speech

Evaluate:

- Naturalness
- Latency
- Voice quality
- Streaming
- Cost
- Custom voices if appropriate

### Real-Time Voice

Evaluate technologies/frameworks that support:

```text
Microphone
↓
Speech-to-Text
↓
Friday
↓
Tool / Agent execution
↓
Response
↓
Text-to-Speech
↓
Voice
```

Recommend the best options for the MVP and alternatives for future versions.

Consider technologies such as:

- OpenAI realtime/voice capabilities
- ElevenLabs
- Deepgram
- LiveKit
- WebRTC
- Other appropriate current solutions

Do not assume these are automatically the best choices. Compare them based on:

- Architecture fit
- Cost
- Latency
- Developer experience
- Reliability
- Extensibility
- Privacy
- Vendor lock-in

The final architecture should allow the voice layer to be replaced without redesigning Friday.

---

# 8. Dashboard / Visual Interface

The dashboard should be a **visual control center for Friday**.

It should not simply be a chat window.

Friday should determine when information is better communicated visually.

Examples:

```text
"What should I focus on today?"
→ Daily plan + calendar + priorities

"Show me my project status."
→ Project cards + progress + blockers

"How am I doing toward my career goal?"
→ Progress chart + skills + roadmap

"What Jira tickets need attention?"
→ Ticket list + priority + status

"What's happening with my projects?"
→ Portfolio overview + risks + milestones
```

---

# 9. Use a Controlled Visual Component System

Use the principles from the supplied visual-agent prompt.

Do NOT allow the AI to generate arbitrary HTML/CSS/UI directly.

Instead, define a controlled visual system.

For example:

```text
AI
↓
Widget
↓
Server-side validation
↓
Visual blocks
↓
UI renderer
```

Possible primitives:

- Stat
- Chart
- Table
- List
- Timeline
- Progress meter
- Person
- Chips
- Text
- Facts
- Status
- Calendar
- Kanban
- Alert
- Timeline

The AI decides **what should be shown**.

The application decides **how it is rendered**.

This should provide:

- Consistent UI
- Predictable rendering
- Better validation
- Lower model complexity
- Better token efficiency
- Safer UI generation
- Easier future extensions

The uploaded reference prompt specifically recommends a controlled block/widget approach where the model produces structured widgets, the server validates and expands them into blocks, and the frontend only renders those blocks. Reuse this architectural principle where appropriate.

---

# 10. Visual System Requirements

Define:

### Blocks

Small reusable visual primitives.

### Widgets

Higher-level components that combine blocks.

### Widget Packs

Feature-specific widgets.

For example:

```text
Core Widgets
├── Stat
├── Chart
├── Table
├── Timeline
├── Task List
└── Progress

Jira Pack
├── Ticket
├── Sprint
├── Sprint Burndown
└── Blockers

Calendar Pack
├── Schedule
├── Meeting
└── Focus Time

Career Pack
├── Skill Progress
├── Learning Roadmap
├── Goal Progress
└── Interview Preparation
```

New modules should be able to introduce new widgets without changing the entire dashboard.

---

# 11. Safety and Validation

External data must always be treated as **data, not instructions**.

For example:

```text
Email content
Jira description
Web page
Documentation
Git repository
External API response
```

must never automatically become system instructions for the AI.

Implement appropriate boundaries against prompt injection.

The visual layer must also be isolated from the model.

The model should never directly execute arbitrary:

- HTML
- CSS
- JavaScript
- frontend code

The server should validate model-generated structured UI.

The frontend should render only approved structures.

---

# 12. Human Approval

Friday should not blindly execute sensitive actions.

Actions such as:

- Sending emails
- Deleting data
- Updating important tickets
- Changing calendar events
- Sending external communications
- Executing production actions
- Modifying repositories
- Creating or deleting resources

should have appropriate approval controls.

Use an action model such as:

```text
Read
↓
Analyze
↓
Suggest
↓
Draft
↓
Request Approval
↓
Execute
↓
Verify
↓
Record Result
```

Different modules should define their own approval requirements.

---

# 13. Tool and Integration Architecture

Design an integration layer that isolates external systems from the core Friday logic.

Potential integrations:

- Gmail
- Google Calendar
- Jira
- GitHub/GitLab
- Obsidian
- Claude-mem
- Claude Code
- Task management
- Documentation
- AI/LLM providers
- Voice services
- Development tools
- Other APIs

Use adapters/interfaces where appropriate.

The core Friday system should not become tightly coupled to one external provider.

---

# 14. Agent Delegation

Design a clear delegation mechanism.

For example:

```text
User Request
↓
Friday
↓
Task Decomposition
↓
Select Subagent
↓
Provide Minimal Context
↓
Execute
↓
Validate Result
↓
Return Result
↓
Friday Synthesizes
↓
User
```

Define:

- Agent registry
- Agent capabilities
- Agent permissions
- Agent context
- Agent memory
- Agent tools
- Agent lifecycle
- Agent failure handling
- Agent timeout
- Agent retry behavior
- Agent cost/token limits

Friday should know when **not** to delegate.

---

# 15. Observability

Friday should provide visibility into its own operation.

Track:

- Agent execution
- Subagent execution
- Tool calls
- Token usage
- Model usage
- Cost
- Latency
- Errors
- Retries
- Approvals
- External API failures
- Context retrieval
- Memory retrieval
- Workflow outcomes

Provide a way to inspect:

```text
User Request
↓
Friday Decision
↓
Subagents
↓
Tools
↓
Results
↓
Final Response
```

This should be especially useful for debugging and improving token efficiency.

---

# 16. Project Location

Place the Friday AI project inside my existing **personal project folder**.

Before creating anything:

1. Inspect my existing personal project directory.
2. Understand its current organization.
3. Identify the appropriate location for Friday.
4. Follow the existing project-folder conventions where appropriate.
5. Do not create a duplicate or incorrectly nested project.
6. If there is ambiguity about the correct location, ask me before creating files.

Do not assume a directory structure without inspecting the existing environment first.

---

# 17. Development Workflow

Integrate Friday with my existing development workflow.

The preferred lifecycle is:

```text
Idea
↓
Requirement
↓
Clarification
↓
Architecture
↓
Plan
↓
Task Breakdown
↓
Implementation
↓
Testing
↓
Review
↓
Documentation
↓
Knowledge Capture
↓
Improvement
```

Friday should eventually help automate parts of this lifecycle.

Use my existing:

- Claude Code workflow
- Obsidian second brain
- Claude-mem
- Task management
- Git workflow
- Documentation workflow

where appropriate.

---

# 18. Build in Layers

Do not attempt to build everything at once.

Use incremental development.

Each layer should:

1. Have a clearly defined goal.
2. Have acceptance criteria.
3. Be implemented.
4. Be tested.
5. Be demonstrated.
6. Be documented.
7. Be reviewed before the next layer.

Follow the principle from the supplied visual-agent prompt:

> Build one layer at a time, verify it, then continue.

The reference prompt specifically recommends showing each layer working and running tests before moving to the next.

---

# 19. Suggested Initial Layers

Evaluate and adjust this sequence:

### Layer 0
Project foundation and architecture.

### Layer 1
Friday core agent/orchestrator.

### Layer 2
Tool registry and integration framework.

### Layer 3
Second brain + Claude-mem integration.

### Layer 4
Basic dashboard.

### Layer 5
Controlled visual widget/block system.

### Layer 6
Jira + task management.

### Layer 7
Calendar + daily planning.

### Layer 8
Email integration.

### Layer 9
Subagent delegation.

### Layer 10
Voice interface.

### Layer 11
Coding/development assistant.

### Layer 12
Career/self-improvement module.

### Layer 13
Advanced automation.

Do not assume this ordering is optimal. Analyze dependencies and recommend a better sequence if necessary.

---

# 20. MVP

Define the smallest useful MVP.

The MVP should demonstrate the fundamental Friday architecture rather than trying to implement every capability.

The MVP should ideally prove:

```text
User
↓
Talk to Friday
↓
Friday understands request
↓
Retrieves relevant second-brain context
↓
Uses tools
↓
Delegates when appropriate
↓
Produces structured result
↓
Displays useful visualizations
↓
Maintains context
```

Determine exactly which features belong in the MVP and explicitly identify what should be postponed.

---

# 21. Technology Evaluation

Recommend the technology stack based on:

- Existing skills
- Existing workflow
- Maintainability
- Performance
- Cost
- Token efficiency
- Developer experience
- Extensibility
- Vendor lock-in
- Security
- Deployment complexity

Evaluate:

### Backend
Potential options:
- Python
- Django
- FastAPI
- Other appropriate technologies

### Frontend
Potential options:
- React
- Next.js
- Other appropriate technologies

### AI
Evaluate appropriate LLM providers and model-routing strategies.

### Voice
Evaluate current voice/STT/TTS/realtime options.

### Storage
Evaluate appropriate databases and storage.

### Queue / Async
Evaluate appropriate background processing systems.

### Agent Framework
Determine whether an agent framework is necessary or whether a custom orchestration layer is preferable.

Do not add a framework simply because it is popular.

---

# 22. Architecture Decision Records

For major decisions, provide:

```text
Decision
Problem
Options
Recommendation
Reason
Trade-offs
When to revisit
```

Important decisions should be documented so Friday can maintain architectural continuity over time.

---

# 23. Testing

Define testing at multiple levels:

- Unit tests
- Integration tests
- Agent tests
- Tool tests
- Prompt/tool contract tests
- UI tests
- End-to-end tests
- Security tests
- Prompt injection tests
- Permission tests
- Approval workflow tests
- Token-efficiency tests
- Regression tests

Create test scenarios for important Friday workflows.

---

# 24. Security

Define:

- Authentication
- Authorization
- Secret management
- API credentials
- Least privilege
- Tool permissions
- Agent permissions
- Data isolation
- Audit logs
- Sensitive data handling
- Prompt injection protection
- External-data trust boundaries
- Approval controls

Security should be designed from the beginning rather than added later.

---

# 25. Future Extensibility

Design the architecture so a future module can look conceptually like:

```text
New Feature
↓
Module Definition
├── Capabilities
├── Tools
├── Agents
├── Workflows
├── Integrations
├── Permissions
├── Data
├── Dashboard Widgets
├── Voice Commands
└── Tests
```

Adding a new module should follow a documented and predictable process.

For example:

```text
Create Module
↓
Register Capabilities
↓
Register Tools
↓
Define Permissions
↓
Add Agent if needed
↓
Add Widgets
↓
Add Tests
↓
Connect External Service
↓
Enable Module
```

---

# 26. Expected Output

Before implementation, produce:

1. Executive summary
2. Vision
3. Goals
4. Non-goals
5. Core use cases
6. User journeys
7. Architecture principles
8. System architecture
9. Main Friday agent architecture
10. Subagent architecture
11. Tool architecture
12. Memory architecture
13. Obsidian integration
14. Claude-mem integration
15. Dashboard architecture
16. Visual widget/block architecture
17. Voice architecture
18. Integration architecture
19. Plugin/module architecture
20. Token-efficiency architecture
21. Security architecture
22. Human approval model
23. Observability architecture
24. Testing strategy
25. Recommended technology stack
26. Repository structure
27. Project-folder placement
28. MVP definition
29. Phased roadmap
30. Architecture decision matrix
31. Risks
32. Technical debt considerations
33. Future expansion roadmap
34. Features explicitly excluded from MVP

---

# 27. Important Planning Rules

Before writing implementation code:

1. Inspect the existing project environment.
2. Inspect my existing personal project folder.
3. Inspect the existing Claude workflow where available.
4. Understand the Obsidian/second-brain structure.
5. Understand the Claude-mem setup.
6. Identify existing conventions.
7. Reuse existing infrastructure where practical.
8. Identify conflicts or duplication.
9. Identify missing requirements.
10. Ask questions only where the answer materially affects architecture.

Do not ask me 20 questions at once.

Ask questions in small groups.

If something can be determined by inspecting the existing project, inspect it instead of asking me.

---

# 28. Final Goal

The ultimate goal is not simply to build another chatbot.

The goal is to build a **personal AI operating system**.

Friday should become the central interface connecting:

```text
                    ┌───────────────┐
                    │     USER      │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │    FRIDAY     │
                    │  MAIN AGENT   │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────▼─────┐ ┌────▼─────┐ ┌────▼─────┐
        │ SUBAGENTS │ │  TOOLS   │ │  MEMORY  │
        └─────┬─────┘ └────┬─────┘ └────┬─────┘
              │             │             │
              │             │       ┌─────▼─────┐
              │             │       │  OBSIDIAN  │
              │             │       │ SECOND BRAIN│
              │             │       └─────┬─────┘
              │             │             │
              │       ┌─────▼─────┐ ┌────▼─────┐
              │       │EXTERNAL   │ │CLAUDE-MEM │
              │       │SYSTEMS     │ └──────────┘
              │       └───────────┘
              │
       ┌──────▼───────────────────────────┐
       │                                   │
       │ Email • Jira • Calendar • Git     │
       │ Projects • Coding • Career        │
       │ Research • Automation • Future    │
       │ Modules                           │
       │                                   │
       └───────────────────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │    DASHBOARD      │
                  │  VISUAL + VOICE   │
                  └───────────────────┘
```

The architecture should be **modular, token-efficient, secure, observable, extensible, and practical to build incrementally**.

Do not optimize for building the largest possible system.

Optimize for building the **smallest solid foundation that can evolve into the larger vision**.

Start by analyzing the requirements and existing environment, then present the proposed architecture and implementation roadmap before making significant changes.