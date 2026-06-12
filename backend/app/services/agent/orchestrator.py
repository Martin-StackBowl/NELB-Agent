"""NELB Unified Agent — Natural language orchestrator using o4-mini.

This endpoint provides a single natural language interface to all four brains.
The o4-mini reasoning model:
1. Understands user intent
2. Decides which brain to call (allocate, recall, assist, or profile)
3. Extracts parameters from natural language
4. Routes to the appropriate tool
5. Formats the response

Example queries:
- "Find me a cleaner near Hatfield with budget R500"
- "Who did I tile a kitchen for last year?"
- "Which drill bit for a 6mm wall plug?"
- "What's my reliability score?"
"""

from openai import AsyncAzureOpenAI
from app.config import settings
from app.schemas.agent import RunRequest, RunResponse
from sqlalchemy.ext.asyncio import AsyncSession


ORCHESTRATOR_SYSTEM_PROMPT = """You are NELB, an intelligent job allocation assistant for community-level gig economies.

You have access to four tools:

1. **allocate_job** - Find and rank workers for a job
   Use when: User wants to find workers, post a job, or hire someone
   Required: job_category, description, budget, location (latitude/longitude), radius_km
   
2. **recall_memory** - Query a worker's job history
   Use when: Worker asks about their past jobs, clients, or work history (e.g. "who did I work for", "how many jobs did I do")
   Required: worker_id, query (natural language question)
   
3. **work_assist** - Answer practical work-related questions
   Use when: User asks how to do something, needs advice about tools/materials/techniques/safety
   Required: question

4. **profile_lookup** - Look up the current worker's profile information
   Use when: User asks about their OWN profile data: skills, reliability score, availability, location, stats, rating
   Examples: "what are my skills?", "what's my reliability score?", "am I available?", "what's my average rating?"
   Required: worker_id

**CRITICAL INSTRUCTIONS:**
- Always call ONE tool based on the user's intent
- For profile questions (skills, reliability, availability, stats) → use profile_lookup
- For job history questions (past jobs, clients, dates) → use recall_memory
- For practical work questions (tools, materials, safety) → use work_assist
- For finding workers / posting jobs → use allocate_job
- Extract ALL required parameters from the message
- For locations: If user mentions a place name, use approximate coordinates for Pretoria areas
- Default radius_km to 5.0 if not specified
- DO NOT answer questions directly - ALWAYS use the appropriate tool

**Location coordinates for common Pretoria areas:**
- Hatfield: -25.7479, 28.2293
- Sunnyside: -25.7625, 28.2120
- Brooklyn: -25.7330, 28.2515
- Centurion: -25.7700, 28.1900
- Arcadia: -25.7550, 28.2400

**Job categories:**
cleaning, gardening, painting, plumbing, electrical, tiling, carpentry, moving, general repair
"""


async def run_agent(request: RunRequest, db: AsyncSession) -> RunResponse:
    """Unified natural language agent endpoint."""
    
    if not settings.azure_ai_foundry_api_key:
        return RunResponse(
            tool_used="none",
            response="Agent not configured. Please set Azure AI Foundry credentials.",
            raw_result=None,
        )
    
    try:
        client = AsyncAzureOpenAI(
            azure_endpoint=settings.azure_ai_foundry_endpoint,
            api_key=settings.azure_ai_foundry_api_key,
            api_version=settings.azure_ai_foundry_api_version,
        )
        
        # Build context from request
        context_parts = [f"User message: {request.message}"]
        if request.worker_id:
            context_parts.append(f"Worker ID: {request.worker_id}")
        if request.latitude and request.longitude:
            context_parts.append(f"User location: {request.latitude}, {request.longitude}")
        if request.radius_km:
            context_parts.append(f"Search radius: {request.radius_km}km")
        
        user_message = "\n".join(context_parts)
        
        # Define tools for o4-mini
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "allocate_job",
                    "description": "Find and rank workers for a job based on skills, reliability, distance, and fairness",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "job_category": {
                                "type": "string",
                                "enum": ["cleaning", "gardening", "painting", "plumbing", "electrical", "tiling", "carpentry", "moving", "general repair"],
                                "description": "The job category",
                            },
                            "description": {
                                "type": "string",
                                "description": "Description of the work needed",
                            },
                            "budget": {
                                "type": "number",
                                "description": "Budget in local currency (Rands)",
                            },
                            "latitude": {
                                "type": "number",
                                "description": "Job location latitude",
                            },
                            "longitude": {
                                "type": "number",
                                "description": "Job location longitude",
                            },
                            "radius_km": {
                                "type": "number",
                                "description": "Search radius in kilometers (default 5.0)",
                            },
                        },
                        "required": ["job_category", "description", "budget", "latitude", "longitude"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "recall_memory",
                    "description": "Query a worker's job history using natural language",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "worker_id": {
                                "type": "string",
                                "description": "Worker's UUID",
                            },
                            "query": {
                                "type": "string",
                                "description": "Natural language question about job history",
                            },
                        },
                        "required": ["worker_id", "query"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "work_assist",
                    "description": "Answer practical work-related questions about tools, techniques, and procedures",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "question": {
                                "type": "string",
                                "description": "The work-related question",
                            },
                            "job_context": {
                                "type": "string",
                                "description": "Optional context about current job",
                            },
                        },
                        "required": ["question"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "profile_lookup",
                    "description": "Look up the current worker's profile information including skills, reliability score, availability status, location, job statistics, and average rating. Use when the user asks about their own profile data.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "worker_id": {
                                "type": "string",
                                "description": "Worker's UUID",
                            },
                        },
                        "required": ["worker_id"],
                    },
                },
            },
        ]
        
        # Call o4-mini with tool calling
        response = await client.chat.completions.create(
            model=settings.azure_ai_foundry_deployment,
            messages=[
                {"role": "system", "content": ORCHESTRATOR_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            tools=tools,
            tool_choice="auto",
            max_completion_tokens=1000,
        )
        
        message = response.choices[0].message
        
        # Check if tool was called
        if not message.tool_calls:
            return RunResponse(
                tool_used="none",
                response=message.content or "I need more information to help you. Can you provide more details?",
                raw_result=None,
            )
        
        tool_call = message.tool_calls[0]
        tool_name = tool_call.function.name
        
        import json
        tool_args = json.loads(tool_call.function.arguments)
        
        print(f"[Orchestrator] Tool selected: {tool_name}")
        print(f"[Orchestrator] Arguments: {tool_args}")
        
        # Route to appropriate brain
        if tool_name == "allocate_job":
            from app.services.allocation.engine import allocate_job
            from app.schemas.agent import AllocationRequest, JobLocation
            
            allocation_request = AllocationRequest(
                job_category=tool_args["job_category"],
                description=tool_args["description"],
                budget=tool_args["budget"],
                location=JobLocation(
                    latitude=tool_args["latitude"],
                    longitude=tool_args["longitude"],
                    address="",
                ),
                radius_km=tool_args.get("radius_km", 5.0),
            )
            
            result = await allocate_job(allocation_request, db)
            
            # Format response
            if result.recommendations:
                top = result.recommendations[0]
                response_text = (
                    f"Found {len(result.recommendations)} workers for your {tool_args['job_category']} job.\n\n"
                    f"**Top recommendation:** {top.worker_name}\n"
                    f"- Composite score: {top.composite_score}%\n"
                    f"- Distance: {top.distance_km}km away\n"
                    f"- Skills: {', '.join(top.skills)}\n"
                    f"- Recent jobs: {top.recent_jobs_7d} in past 7 days\n\n"
                    f"{result.explanation}"
                )
            else:
                response_text = result.explanation
            
            return RunResponse(
                tool_used="allocate_job",
                response=response_text,
                raw_result=result,
            )
        
        elif tool_name == "recall_memory":
            from app.services.memory.recall import recall_memory
            from app.schemas.agent import RecallRequest
            from uuid import UUID
            
            recall_request = RecallRequest(
                worker_id=UUID(tool_args["worker_id"]),
                query=tool_args["query"],
            )
            
            result = await recall_memory(recall_request, db)
            
            return RunResponse(
                tool_used="recall_memory",
                response=result.answer,
                raw_result=result,
            )
        
        elif tool_name == "work_assist":
            from app.services.assistant.assist import work_assist
            from app.schemas.agent import AssistRequest
            from uuid import UUID
            
            assist_request = AssistRequest(
                worker_id=request.worker_id or UUID("00000000-0000-0000-0000-000000000000"),
                question=tool_args["question"],
                job_context=tool_args.get("job_context", ""),
            )
            
            result = await work_assist(assist_request)
            
            return RunResponse(
                tool_used="work_assist",
                response=result.answer,
                raw_result=result,
            )
        
        elif tool_name == "profile_lookup":
            from app.services.profile.lookup import profile_lookup
            from app.schemas.agent import ProfileRequest
            from uuid import UUID
            
            profile_request = ProfileRequest(
                worker_id=UUID(tool_args["worker_id"]),
            )
            
            result = await profile_lookup(profile_request, db)
            
            # Format a natural language response from profile data
            skills_str = ", ".join(result.skills) if result.skills else "none listed"
            availability = "available for work" if result.is_available else "currently unavailable"
            rating_str = f"{result.average_rating}/5" if result.average_rating else "no ratings yet"
            
            response_text = (
                f"Here's your profile information:\n\n"
                f"**{result.name}**\n"
                f"- Skills: {skills_str}\n"
                f"- Reliability score: {result.reliability_score}%\n"
                f"- Average rating: {rating_str}\n"
                f"- Location: {result.address}\n"
                f"- Status: {availability}\n"
                f"- Total jobs completed: {result.total_jobs}\n"
                f"- Jobs in last 7 days: {result.recent_jobs_7d}"
            )
            
            return RunResponse(
                tool_used="profile_lookup",
                response=response_text,
                raw_result=result,
            )
        
        else:
            return RunResponse(
                tool_used="unknown",
                response=f"Unknown tool: {tool_name}",
                raw_result=None,
            )
    
    except Exception as e:
        print(f"[Orchestrator] Error: {str(e)}")
        return RunResponse(
            tool_used="error",
            response=f"Error: {str(e)}",
            raw_result=None,
        )
