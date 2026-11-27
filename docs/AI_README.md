# HomeSync — AI Multi-Agent System

## 1. Overview

HomeSync uses a multi-agent AI architecture to analyze household responsibilities, physical workload, mental load, workload distribution, and possible improvements.

The system is built with Node.js, JavaScript, and the OpenAI Agents SDK.

The architecture consists of one main orchestrator and four specialized AI agents.

## 2. Agent Architecture

### HomeSync Manager
**Role:** Main orchestrator.

Responsibilities:
- Understand user requests.
- Select appropriate specialist agents.
- Delegate tasks to specialists.
- Pass relevant information between agents.
- Combine specialist results into one response.
- Ask clarifying questions when information is missing.

### Task Analysis Agent
**Role:** Household task analysis.

Responsibilities:
- Identify household activities.
- Distinguish physical work from mental load.
- Identify planning, remembering, organizing, and coordination.
- Detect missing information.
- Avoid inventing task ownership or responsibilities.

### Workload Calculation Agent
**Role:** Workload calculation.

Responsibilities:
- Calculate weekly workload using task frequency and duration.
- Convert minutes into hours.
- Calculate physical and mental workload separately when data is available.
- Preserve unknown values instead of inventing information.

Formula:

Weekly workload = Task frequency per week × Task duration in minutes / 60

### Fairness Analysis Agent
**Role:** Household workload balance analysis.

Responsibilities:
- Evaluate the distribution of household responsibilities.
- Consider physical workload and mental load.
- Identify possible workload imbalances.
- Distinguish time differences from overall fairness.
- Identify missing information.

### Recommendation Agent
**Role:** Workload distribution recommendations.

Responsibilities:
- Suggest practical ways to distribute household responsibilities.
- Consider physical and mental workload.
- Provide alternative distribution scenarios.
- Never change task assignments without user approval.

## 3. Agent Communication

HomeSync Manager coordinates the specialist agents through agent tools using the OpenAI Agents SDK.

Typical workflow for a fairness and redistribution request:

1. Task Analysis Agent identifies household tasks and mental load.
2. Workload Calculation Agent calculates weekly workload when sufficient data is available.
3. Fairness Analysis Agent evaluates possible workload imbalances.
4. Recommendation Agent suggests alternatives when requested.
5. HomeSync Manager combines the results and responds to the user.

Not every specialist is required for every request. The Manager selects agents according to the user's request.

## 4. Technology Stack

- JavaScript (ES Modules)
- Node.js
- OpenAI Agents SDK (`@openai/agents`)
- OpenAI API
- Express.js
- Zod
- Node.js built-in test runner

## 5. Project Structure

```text
backend/
├── src/
│   ├── ai/
│   │   ├── agentConfig.js
│   │   ├── homeSyncManager.js
│   │   ├── taskAnalysisAgent.js
│   │   ├── workloadCalculationAgent.js
│   │   ├── fairnessAnalysisAgent.js
│   │   ├── recommendationAgent.js
│   │   └── aiRoutes.js
│   ├── app.js
│   └── config.js
└── test/
    ├── ai.test.js
    └── ai-api.test.js
```

## 6. API Integration

The AI system exposes an Express endpoint:

`POST /api/ai`

Request:

```json
{
  "message": "Anna cooks dinner every day for 40 minutes. Mark washes dishes every day for 15 minutes."
}
```

Successful response:

```json
{
  "success": true,
  "reply": "AI-generated response"
}
```

The endpoint validates user input, applies rate limiting, and sends the request to HomeSync Manager.

## 7. Environment Configuration

The backend requires an OpenAI API key.

Configure these variables in the backend `.env` file:

```env
OPENAI_API_KEY=your_secret_api_key
OPENAI_DEFAULT_MODEL=your_supported_model
```

Never commit `.env` or expose API keys in source code.

## 8. Testing

Run the specialist orchestration test:

```bash
node test/ai.test.js
```

Run the HTTP API integration test:

```bash
node --test test/ai-api.test.js
```

The tests performed during development confirmed:
- Task Analysis Agent invocation.
- Workload Calculation Agent invocation.
- Fairness Analysis Agent invocation.
- Recommendation Agent invocation.
- Sequential delegation through HomeSync Manager.
- Successful HTTP request to `/api/ai`.
- Successful AI response with HTTP status 200.

## 9. Important System Rules

The AI system must:
- Never invent household tasks or facts.
- Never assume who performs or manages a task.
- Distinguish physical work from mental load.
- Preserve missing information as unknown.
- Avoid judging or blaming household members.
- Avoid treating equal working hours as automatic fairness.
- Never change household assignments without explicit approval.
- Respond in the same language as the user.

## 10. Current Development Status

Implemented:
- Five AI agents.
- Specialist delegation through HomeSync Manager.
- OpenAI API configuration.
- Express AI endpoint.
- Agent orchestration tests.
- HTTP API integration test.
- Initial Git commits on `feature/homesync-ai-agents`.

Remaining integration work:
- Connect the frontend to `POST /api/ai`.
- Add appropriate authentication and user-level access controls.
- Perform broader scenario and error-handling tests.
- Validate the complete application integration.

The AI multi-agent backend module has a working initial implementation and has passed the described development tests.