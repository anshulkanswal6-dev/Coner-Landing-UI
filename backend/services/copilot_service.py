"""Founder Copilot Service - Intelligent conversation analysis and insights."""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json

logger = logging.getLogger(__name__)


class FounderCopilotService:
    """Service to handle natural language analytics queries with actual conversation analysis."""
    
    def __init__(self, db, emergent_llm_key: str):
        self.db = db
        self.llm_key = emergent_llm_key
    
    async def query(self, project_id: str, natural_query: str) -> Dict[str, Any]:
        """
        Process natural language query by analyzing actual conversation content.
        
        Args:
            project_id: Project ID
            natural_query: User's natural language question
        
        Returns:
            Conversational insights from actual customer conversations
        """
        try:
            # Fetch recent conversation data
            conversation_data = await self._fetch_conversation_data(project_id)
            
            if not conversation_data["user_messages"] or len(conversation_data["user_messages"]) == 0:
                return {
                    "status": "success",
                    "query": natural_query,
                    "explanation": "I don't have enough conversation data yet to analyze. Once you have some customer interactions, I'll be able to provide insights about what they're asking, trending topics, pricing questions, pain points, and more!",
                    "data": {"total_conversations": 0}
                }
            
            # Use LLM to intelligently analyze conversations and answer the query
            answer = await self._analyze_with_llm(natural_query, conversation_data)
            
            return {
                "status": "success",
                "query": natural_query,
                "explanation": answer["explanation"],
                "data": answer.get("data", {}),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Copilot query error: {e}")
            return {
                "status": "error",
                "query": natural_query,
                "error": str(e),
                "explanation": "I encountered an error analyzing your data. Please try rephrasing your question."
            }
    
    async def _fetch_conversation_data(self, project_id: str) -> Dict[str, Any]:
        """
        Fetch comprehensive conversation data for intelligent analysis.
        Returns actual message content, leads, feedback, and stats.
        """
        # Get last 30 days
        now = datetime.now(timezone.utc)
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        seven_days_ago = (now - timedelta(days=7)).isoformat()
        
        # Fetch customer messages (what they're actually asking)
        user_messages = await self.db.messages.find(
            {
                "project_id": project_id,
                "role": "user",
                "created_at": {"$gte": thirty_days_ago}
            },
            {
                "_id": 0,
                "content": 1,
                "created_at": 1,
                "feedback": 1,
                "session_id": 1
            }
        ).sort("created_at", -1).limit(150).to_list(150)
        
        # Fetch recent messages for recency analysis
        recent_messages = await self.db.messages.find(
            {
                "project_id": project_id,
                "role": "user",
                "created_at": {"$gte": seven_days_ago}
            },
            {"_id": 0, "content": 1, "created_at": 1}
        ).limit(50).to_list(50)
        
        # Fetch lead requirements to understand demand
        leads = await self.db.leads.find(
            {"project_id": project_id, "created_at": {"$gte": thirty_days_ago}},
            {"_id": 0, "requirements": 1, "status": 1, "created_at": 1}
        ).to_list(50)
        
        # Fetch messages with negative feedback (pain points)
        negative_messages = await self.db.messages.find(
            {
                "project_id": project_id,
                "feedback": -1,
                "created_at": {"$gte": thirty_days_ago}
            },
            {"_id": 0, "content": 1, "session_id": 1}
        ).limit(30).to_list(30)
        
        # Get corresponding user messages for negative feedback
        negative_user_msgs = []
        if negative_messages:
            session_ids = list(set([m["session_id"] for m in negative_messages if "session_id" in m]))
            if session_ids:
                negative_user_msgs = await self.db.messages.find(
                    {
                        "project_id": project_id,
                        "role": "user",
                        "session_id": {"$in": session_ids}
                    },
                    {"_id": 0, "content": 1}
                ).limit(30).to_list(30)
        
        # Basic stats
        total_conversations = await self.db.conversations.count_documents(
            {"project_id": project_id, "started_at": {"$gte": thirty_days_ago}}
        )
        
        recent_conversations = await self.db.conversations.count_documents(
            {"project_id": project_id, "started_at": {"$gte": seven_days_ago}}
        )
        
        positive_feedback = await self.db.messages.count_documents(
            {"project_id": project_id, "feedback": 1, "created_at": {"$gte": thirty_days_ago}}
        )
        
        negative_feedback = await self.db.messages.count_documents(
            {"project_id": project_id, "feedback": -1, "created_at": {"$gte": thirty_days_ago}}
        )
        
        return {
            "user_messages": user_messages,
            "recent_messages": recent_messages,
            "negative_user_msgs": negative_user_msgs,
            "leads": leads,
            "total_conversations": total_conversations,
            "recent_conversations": recent_conversations,
            "positive_feedback": positive_feedback,
            "negative_feedback": negative_feedback,
            "thirty_day_count": len(user_messages),
            "seven_day_count": len(recent_messages)
        }
    
    async def _analyze_with_llm(self, query: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use LLM to intelligently analyze actual conversation content and provide founder insights.
        """
        # Build context from actual customer messages
        all_messages = "\n".join([
            f"[{msg.get('created_at', '')[:10]}] Customer: {msg['content'][:150]}" 
            for msg in data["user_messages"][:80]  # Sample to fit in context
        ])
        
        # Recent messages for trend analysis
        recent_context = "\n".join([
            f"Customer: {msg['content'][:100]}" 
            for msg in data["recent_messages"][:30]
        ])
        
        # Messages that got negative feedback (pain points)
        pain_context = "\n".join([
            f"Customer (got negative feedback): {msg['content'][:100]}" 
            for msg in data["negative_user_msgs"][:20]
        ]) if data["negative_user_msgs"] else "No negative feedback yet."
        
        # Lead requirements
        lead_context = "\n".join([
            f"- {lead.get('requirements', 'N/A')[:100]}" 
            for lead in data["leads"][:15] if lead.get("requirements")
        ]) if data["leads"] else "No leads captured yet."
        
        # Build comprehensive analysis prompt
        analysis_prompt = f"""You are Corner AI, an intelligent analytics assistant helping a business founder understand their customer conversations in depth.

**Context (Last 30 Days)**:
- Total Conversations: {data['total_conversations']}
- Customer Messages Analyzed: {data['thirty_day_count']}
- Recent (Last 7 Days): {data['seven_day_count']} messages in {data['recent_conversations']} conversations
- Leads Captured: {len(data['leads'])}
- Customer Satisfaction: {data['positive_feedback']} positive, {data['negative_feedback']} negative feedback

**All Customer Messages (Last 30 Days)**:
{all_messages[:4000]}

**Recent Messages (Last 7 Days)**:
{recent_context[:1500]}

**Messages That Got Negative Feedback (Pain Points)**:
{pain_context[:1500]}

**Lead Requirements**:
{lead_context[:1500]}

---

**Founder's Question**: "{query}"

**Your Task**:
Analyze the ACTUAL customer messages above and provide a conversational, insightful answer. You're talking to the founder as their intelligent assistant who has read all their customer conversations.

**Guidelines**:
1. Reference SPECIFIC customer language and patterns you see
2. If asked about trends, compare recent (7 days) vs overall (30 days)
3. Point out exact quotes or paraphrases from customers when relevant
4. Be actionable - suggest what the founder should pay attention to
5. If you spot pricing questions, feature requests, or pain points, call them out with examples
6. Compare time periods if the question implies it
7. Be conversational, like you're a team member briefing the founder

**Question Types You Handle**:
- "What are customers asking?" → List main topics with examples
- "What's trending?" → Compare recent vs earlier messages
- "Any pricing questions?" → Find and quote pricing-related queries
- "What are the pain points?" → Reference the negative feedback messages
- "Product demand?" → Analyze what features/products customers want from messages and lead requirements
- "Last 3 days vs before?" → Do time-based comparison
- "Unresolved queries?" → Identify recurring questions that might not be getting good answers

Give a natural, conversational 3-5 paragraph answer. Use bullet points sparingly and only for lists. Sound like a smart coworker, not a robot."""

        try:
            chat = LlmChat(
                api_key=self.llm_key,
                session_id=f"copilot_{hash(query) % 10000}"
            ).with_model("openai", "gpt-4o-mini")
            
            explanation = await chat.send_message(UserMessage(text=analysis_prompt))
            
            # Build data summary
            satisfaction_rate = 0
            if (data['positive_feedback'] + data['negative_feedback']) > 0:
                satisfaction_rate = round(
                    (data['positive_feedback'] / (data['positive_feedback'] + data['negative_feedback']) * 100),
                    1
                )
            
            data_summary = {
                "total_conversations_30d": data['total_conversations'],
                "total_messages_30d": data['thirty_day_count'],
                "recent_conversations_7d": data['recent_conversations'],
                "recent_messages_7d": data['seven_day_count'],
                "leads_captured": len(data['leads']),
                "satisfaction_rate": satisfaction_rate,
                "positive_feedback": data['positive_feedback'],
                "negative_feedback": data['negative_feedback']
            }
            
            return {
                "explanation": explanation,
                "data": data_summary
            }
            
        except Exception as e:
            logger.error(f"LLM analysis error: {e}")
            # Fallback to simpler response
            return {
                "explanation": f"Based on analyzing {data['thirty_day_count']} customer messages over the last 30 days, I can see your customers are actively engaging with your chatbot. You've had {data['total_conversations']} conversations, with {data['recent_conversations']} in the last week. To get specific insights, try asking: 'What are the most common questions?' or 'Are there any pricing concerns?' or 'What are customers saying recently?'",
                "data": {
                    "total_messages": data['thirty_day_count'],
                    "recent_messages": data['seven_day_count'],
                    "total_conversations": data['total_conversations']
                }
            }
