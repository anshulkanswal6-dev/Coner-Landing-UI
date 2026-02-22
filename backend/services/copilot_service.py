"""Founder Copilot Service - Natural language analytics queries."""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json

logger = logging.getLogger(__name__)


class FounderCopilotService:
    """Service to handle natural language analytics queries."""
    
    def __init__(self, db, emergent_llm_key: str):
        self.db = db
        self.llm_key = emergent_llm_key
    
    async def query(self, project_id: str, natural_query: str) -> Dict[str, Any]:
        """
        Process natural language query and return structured analytics data.
        
        Args:
            project_id: Project ID
            natural_query: User's natural language question
        
        Returns:
            Structured response with data and explanation
        """
        try:
            # Step 1: Convert NL query to structured query intent
            intent = await self._parse_query_intent(natural_query)
            
            # Step 2: Fetch relevant data based on intent
            data = await self._fetch_analytics_data(project_id, intent)
            
            # Step 3: Generate human-readable explanation
            explanation = await self._generate_explanation(natural_query, data)
            
            return {
                "status": "success",
                "query": natural_query,
                "data": data,
                "explanation": explanation,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Copilot query error: {e}")
            return {
                "status": "error",
                "query": natural_query,
                "error": str(e),
                "explanation": "I encountered an error processing your query. Please try rephrasing it."
            }
    
    async def _parse_query_intent(self, query: str) -> Dict[str, Any]:
        """
        Use LLM to parse query intent and extract parameters.
        """
        system_prompt = """You are a query intent parser. Given a natural language analytics question, extract:
1. query_type: one of [trends, comparison, count, rate, top_items, time_range]
2. metric: what they're asking about (conversations, leads, satisfaction, etc.)
3. time_range: recent/last_week/last_month/all_time
4. filters: any specific filters mentioned

Respond ONLY with valid JSON.

Examples:
"How many leads did we get this week?" → {"query_type": "count", "metric": "leads", "time_range": "last_week"}
"What's the satisfaction trend?" → {"query_type": "trends", "metric": "satisfaction", "time_range": "recent"}
"Show me top pain points" → {"query_type": "top_items", "metric": "pain_points", "time_range": "recent"}"""
        
        try:
            chat = LlmChat(
                api_key=self.llm_key,
                session_id=f"copilot_intent"
            ).with_model("openai", "gpt-4o-mini")
            
            response = await chat.send_message(UserMessage(
                text=f"Parse this query: {query}"
            ))
            
            # Extract JSON from response
            import re
            json_match = re.search(r'\{[^}]+\}', response)
            if json_match:
                intent = json.loads(json_match.group())
            else:
                # Fallback intent
                intent = {"query_type": "count", "metric": "conversations", "time_range": "recent"}
            
            return intent
            
        except Exception as e:
            logger.error(f"Intent parsing error: {e}")
            return {"query_type": "count", "metric": "conversations", "time_range": "recent"}
    
    async def _fetch_analytics_data(self, project_id: str, intent: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fetch actual analytics data based on parsed intent.
        IMPORTANT: Only returns aggregated/structured data, NO PII.
        """
        query_type = intent.get("query_type")
        metric = intent.get("metric")
        time_range = intent.get("time_range", "recent")
        
        # Calculate date range
        date_filter = self._get_date_filter(time_range)
        
        data = {}
        
        # Handle different query types
        if query_type == "count":
            if metric == "leads":
                count = await self.db.leads.count_documents({
                    "project_id": project_id,
                    **date_filter
                })
                data["count"] = count
                data["metric"] = "leads"
            
            elif metric == "conversations":
                count = await self.db.conversations.count_documents({
                    "project_id": project_id,
                    **date_filter
                })
                data["count"] = count
                data["metric"] = "conversations"
            
            elif metric == "messages":
                count = await self.db.messages.count_documents({
                    "project_id": project_id,
                    **date_filter
                })
                data["count"] = count
                data["metric"] = "messages"
        
        elif query_type in ["rate", "trends"] and metric == "satisfaction":
            # Calculate satisfaction rate
            positive = await self.db.messages.count_documents({
                "project_id": project_id,
                "feedback": 1,
                **date_filter
            })
            negative = await self.db.messages.count_documents({
                "project_id": project_id,
                "feedback": -1,
                **date_filter
            })
            total = positive + negative
            rate = round((positive / total * 100), 1) if total > 0 else 0
            
            data["satisfaction_rate"] = rate
            data["positive_count"] = positive
            data["negative_count"] = negative
            data["total_feedback"] = total
        
        elif query_type == "top_items":
            if metric in ["pain_points", "issues", "problems"]:
                # Aggregate common keywords from user messages
                messages = await self.db.messages.find(
                    {
                        "project_id": project_id,
                        "role": "user",
                        **date_filter
                    },
                    {"_id": 0, "content": 1}
                ).limit(200).to_list(200)
                
                # Simple keyword extraction
                pain_keywords = ["problem", "issue", "difficult", "trouble", "error", "broken", "slow"]
                keyword_counts = {kw: 0 for kw in pain_keywords}
                
                for msg in messages:
                    content = msg.get("content", "").lower()
                    for kw in pain_keywords:
                        if kw in content:
                            keyword_counts[kw] += 1
                
                top_items = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:5]
                data["top_pain_points"] = [{"keyword": k, "count": v} for k, v in top_items if v > 0]
        
        elif query_type == "comparison":
            # Lead status breakdown
            pipeline = [
                {"$match": {"project_id": project_id, **date_filter}},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]
            lead_stats = await self.db.leads.aggregate(pipeline).to_list(20)
            data["lead_breakdown"] = {stat["_id"]: stat["count"] for stat in lead_stats}
        
        data["time_range"] = time_range
        return data
    
    def _get_date_filter(self, time_range: str) -> Dict[str, Any]:
        """Convert time_range string to MongoDB date filter."""
        now = datetime.now(timezone.utc)
        
        if time_range == "last_week":
            start_date = (now - timedelta(days=7)).isoformat()
            return {"created_at": {"$gte": start_date}}
        elif time_range == "last_month":
            start_date = (now - timedelta(days=30)).isoformat()
            return {"created_at": {"$gte": start_date}}
        elif time_range == "recent":
            start_date = (now - timedelta(days=7)).isoformat()
            return {"created_at": {"$gte": start_date}}
        else:
            return {}  # all_time
    
    async def _generate_explanation(self, query: str, data: Dict[str, Any]) -> str:
        """
        Generate human-readable explanation of the data.
        """
        system_prompt = """You are a helpful analytics assistant. Given a user's question and the data fetched, provide a clear, concise explanation in natural language. Focus on insights and trends. Keep it under 3 sentences."""
        
        try:
            chat = LlmChat(
                api_key=self.llm_key,
                session_id=f"copilot_explain"
            ).with_model("openai", "gpt-4o-mini")
            
            prompt = f"""User asked: "{query}"

Data retrieved:
{json.dumps(data, indent=2)}

Provide a natural language explanation:"""
            
            explanation = await chat.send_message(UserMessage(text=prompt))
            return explanation
            
        except Exception as e:
            logger.error(f"Explanation generation error: {e}")
            return f"Here's what I found: {json.dumps(data)}"
