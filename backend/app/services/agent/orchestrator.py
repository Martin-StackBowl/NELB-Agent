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
   Use when: User asks about ANY of their own personal/profile data: name, email, phone, skills, reliability score, availability, location, address, stats, rating, total jobs, recent jobs
   Examples: "what's my name?", "what are my skills?", "what's my reliability score?", "am I available?", "what's my average rating?", "where am I located?", "what's my email?"
   Required: worker_id
   NOTE: If the user asks ANY personal question about themselves, use this tool. It has all their profile data.

**CRITICAL INSTRUCTIONS:**
- Always call ONE tool based on the user's intent
- **Accumulate information across the conversation.** If an earlier message already gave you the job category, budget, or description, DO NOT ask for it again — combine it with the latest message. Example: user says "I need a cleaner for my house", you ask for budget, user replies "R3000" → you now have category=cleaning + budget=3000, so call allocate_job immediately.
- For allocate_job you only NEED job_category and budget. Description is optional — infer a sensible one from the conversation if the user didn't give one (e.g. "House cleaning"). Location comes from the request context. Never block on a missing description.
- The moment you have job_category and budget, call allocate_job. Do not ask further clarifying questions.
- For profile questions (skills, reliability, availability, stats) → use profile_lookup
- For job history questions (past jobs, clients, dates) → use recall_memory
- For practical work questions (tools, materials, safety) → use work_assist
- For finding workers / posting jobs → use allocate_job
- Extract ALL required parameters from the message
- For locations: If user mentions a place name, use approximate coordinates for Pretoria areas
- Default radius_km to 5.0 if not specified
- If the user's question is completely unrelated to work, jobs, or their profile (e.g. weather, politics, general trivia, "do I have a car?"), respond directly WITHOUT calling a tool: "I don't have that information. I can help with job allocation, your work history, your profile stats, or practical work questions."
- When in doubt about whether something is in the profile, call profile_lookup anyway — it's better to check than to refuse.
- When you call a tool and get results, answer ONLY the specific question asked. Do not dump the entire result — extract the relevant piece. For example, if asked "what's my rating?" just say "Your average rating is 4.8/5" — don't list all profile fields.

**Location coordinates for common Pretoria areas:**
- Pretoria CBD: -25.7463, 28.1885
- Sunnyside: -25.7625, 28.2120
- Brooklyn: -25.7330, 28.2515
- Centurion: -25.7700, 28.1900
- Arcadia: -25.7550, 28.2400

**Job categories and keyword mapping — use the EXACT category name:**
- `cleaning` — cleaner, clean, cleaning, house clean, office clean, domestic
- `gardening` — gardener, gardening, garden, lawn, mow, hedge, trim, yard work, plants
- `painting` — painter, painting, paint, repaint, walls
- `plumbing` — plumber, plumbing, pipe, tap, leak, drain, toilet
- `electrical` — electrician, electrical, wiring, socket, switch, lights
- `tiling` — tiler, tiling, tiles, tile, grout, floor tiles
- `carpentry` — carpenter, carpentry, wood, shelves, furniture, doors
- `moving` — moving, packing, removals, transport belongings
- `general repair` — handyman, repairs, fix, general maintenance

**IMPORTANT:** "cleaner for my yard" = `cleaning` (the person is a cleaner, the location is a yard). "yard work" or "mow my lawn" = `gardening`. The noun describing the WORKER TYPE determines the category, not the location.
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
                *[
                    {"role": t.role, "content": t.content}
                    for t in (request.history or [])
                    if t.role in ("user", "assistant") and t.content
                ],
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
                exclude_worker_id=request.worker_id,  # self-exclusion: logged-in worker cannot hire themselves
            )
            
            result = await allocate_job(allocation_request, db)
            
            # Format response: ranked worker bullets then the existing explanation
            # (which already contains "Recommended: ... Why ... [doc1]" intact).
            if result.recommendations:
                pool = len(result.recommendations)

                # Build ranked worker bullets — name on its own line, metrics below
                worker_lines = []
                for i, w in enumerate(result.recommendations):
                    block = (
                        f"#{i+1}  **{w.worker_name}** — {w.composite_score}%\n"
                        f"Skill {w.skill_score}% · Reliability {w.reliability_score}% · "
                        f"Distance {w.distance_km}km · Budget {w.budget_score}% (est. R{w.estimated_price:.0f}) · "
                        f"Fairness {w.fairness_score}%"
                    )
                    worker_lines.append(block)

                workers_text = "\n\n".join(worker_lines)

                response_text = (
                    f"Found {pool} workers for your {tool_args['job_category']} job:\n\n"
                    f"{workers_text}\n\n"
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
            if not request.worker_id:
                return RunResponse(
                    tool_used="recall_memory",
                    response="You'll need to log in first so I know whose work history to look up. Use the Log in button in the top-right corner.",
                    raw_result=None,
                )
            from app.services.memory.recall import recall_memory
            from app.schemas.agent import RecallRequest

            recall_request = RecallRequest(
                worker_id=request.worker_id,  # authenticated identity, not LLM-supplied
                query=tool_args.get("query", request.message),
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
            if not request.worker_id:
                return RunResponse(
                    tool_used="profile_lookup",
                    response="You'll need to log in first so I can pull up your profile. Use the Log in button in the top-right corner.",
                    raw_result=None,
                )
            from app.services.profile.lookup import profile_lookup
            from app.schemas.agent import ProfileRequest

            profile_request = ProfileRequest(
                worker_id=request.worker_id,  # authenticated identity, not LLM-supplied
            )
            
            result = await profile_lookup(profile_request, db)
            
            print(f"[Orchestrator] Profile lookup successful for {result.name}")
            print(f"[Orchestrator] Profile data: skills={result.skills}, reliability={result.reliability_score}, total_jobs={result.total_jobs}")
            
            # Have o4-mini answer the specific question using the profile data
            import json
            profile_data = result.model_dump(mode="json")
            
            summary_messages = [
                {
                    "role": "system",
                    "content": (
                        "You are NELB. The user asked a question about their profile. "
                        "Below is their full profile data from the database. "
                        "If the user asks for a specific field (e.g. 'what's my rating?'), answer just that field concisely. "
                        "If the user asks for their full profile, stats, or overview, format ALL fields nicely. "
                        "If the data doesn't contain the answer to their question, say: 'That information isn't in your profile.' "
                        "Always respond with at least one sentence."
                    ),
                },
                {
                    "role": "user",
                    "content": f"User's question: {request.message}\n\nProfile data: {json.dumps(profile_data, default=str)}",
                },
            ]
            
            # Format profile data first (fallback-first approach)
            skills_str = ", ".join(result.skills) if result.skills else "none listed"
            availability = "available for work" if result.is_available else "currently unavailable"
            rating_str = f"{result.average_rating}/5" if result.average_rating else "no ratings yet"
            
            fallback_response = (
                f"**{result.name}**\n\n"
                f"📋 **Skills:** {skills_str}\n"
                f"✅ **Reliability:** {result.reliability_score}%\n"
                f"⭐ **Average Rating:** {rating_str}\n"
                f"📊 **Status:** {availability}\n"
                f"💼 **Total Jobs:** {result.total_jobs}\n"
                f"🕐 **Recent Jobs (7d):** {result.recent_jobs_7d}"
            )
            
            # Try to get a smarter summarization, but always have fallback ready
            try:
                print(f"[Orchestrator] Attempting profile summarization with o4-mini...")
                import asyncio
                summary_response = await asyncio.wait_for(
                    client.chat.completions.create(
                        model=settings.azure_ai_foundry_deployment,
                        messages=summary_messages,
                        max_completion_tokens=200,
                    ),
                    timeout=10.0
                )
                response_text = summary_response.choices[0].message.content
                print(f"[Orchestrator] Raw response from o4-mini: '{response_text}'")
                print(f"[Orchestrator] Response length: {len(response_text) if response_text else 0}")
                if not response_text or len(response_text.strip()) < 10:
                    print(f"[Orchestrator] Empty or too short response from o4-mini, using fallback")
                    response_text = fallback_response
                else:
                    print(f"[Orchestrator] Successfully summarized profile")
            except asyncio.TimeoutError:
                print(f"[Orchestrator] Profile summarization timed out after 10s, using fallback")
                response_text = fallback_response
            except Exception as e:
                print(f"[Orchestrator] Profile summarization failed: {type(e).__name__}: {str(e)}")
                response_text = fallback_response
            
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
