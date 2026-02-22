"""Insight Aggregator - Generate analytics insight cards from conversation data."""
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict
import asyncio
import re
from collections import Counter

logger = logging.getLogger(__name__)


async def aggregate_insights(db, project_id: str, date_from: str = None, date_to: str = None):
    """
    Aggregate conversation data to generate insight cards.
    
    Args:
        db: MongoDB database instance
        project_id: Project ID
        date_from: Start date (ISO format)
        date_to: End date (ISO format)
    
    Returns:
        List of insight cards
    """
    try:
        # Default to last 7 days if not specified
        if not date_to:
            date_to = datetime.now(timezone.utc).isoformat()
        if not date_from:
            date_from = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        
        # Fetch messages in date range
        messages = await db.messages.find(
            {
                "project_id": project_id,
                "role": "user",
                "created_at": {"$gte": date_from, "$lte": date_to}
            },
            {"_id": 0, "content": 1, "session_id": 1}
        ).to_list(1000)
        
        if not messages:
            return []
        
        insights = []
        
        # 1. Extract common keywords/phrases (pain points)
        all_content = " ".join([m.get("content", "").lower() for m in messages])
        
        # Extract potential pain point keywords
        pain_keywords = [
            "problem", "issue", "difficult", "hard", "trouble", "can't", "cannot",
            "doesn't work", "not working", "broken", "error", "slow", "confused"
        ]
        pain_mentions = sum(all_content.count(kw) for kw in pain_keywords)
        
        if pain_mentions > 0:
            # Find most common pain point context
            pain_sentences = []
            for msg in messages:
                content = msg.get("content", "").lower()
                for kw in pain_keywords:
                    if kw in content:
                        pain_sentences.append(content[:100])
                        break
            
            if pain_sentences:
                insights.append({
                    "metric_type": "pain_point",
                    "title": "Top Customer Pain Point",
                    "description": f"Users mentioned difficulties {pain_mentions} times. Common themes: {', '.join(set([s.split()[0:3] for s in pain_sentences[:3]])[0][:20])}...",
                    "delta_value": pain_mentions,
                    "trend": "neutral"
                })
        
        # 2. Pricing confusion detection
        pricing_keywords = ["price", "cost", "pricing", "expensive", "cheap", "afford", "pay", "payment"]
        pricing_mentions = sum(all_content.count(kw) for kw in pricing_keywords)
        
        if pricing_mentions > 5:
            insights.append({
                "metric_type": "pricing_interest",
                "title": "High Pricing Interest",
                "description": f"Pricing-related questions came up {pricing_mentions} times in conversations.",
                "delta_value": pricing_mentions,
                "trend": "up"
            })
        
        # 3. Feature requests detection
        feature_keywords = ["feature", "add", "need", "want", "would like", "wish", "could you", "can you add"]
        feature_mentions = sum(all_content.count(kw) for kw in feature_keywords)
        
        if feature_mentions > 3:
            insights.append({
                "metric_type": "feature_requests",
                "title": "Most Requested Features",
                "description": f"Users expressed interest in new features or capabilities {feature_mentions} times.",
                "delta_value": feature_mentions,
                "trend": "up"
            })
        
        # 4. User satisfaction (based on feedback)
        feedback_stats = await db.messages.aggregate([
            {
                "$match": {
                    "project_id": project_id,
                    "created_at": {"$gte": date_from, "$lte": date_to},
                    "feedback": {"$exists": True}
                }
            },
            {
                "$group": {
                    "_id": "$feedback",
                    "count": {"$sum": 1}
                }
            }
        ]).to_list(10)
        
        positive = 0
        negative = 0
        for stat in feedback_stats:
            if stat["_id"] == 1:
                positive = stat["count"]
            elif stat["_id"] == -1:
                negative = stat["count"]
        
        total_feedback = positive + negative
        if total_feedback > 0:
            satisfaction_rate = round((positive / total_feedback) * 100, 1)
            trend = "up" if satisfaction_rate >= 70 else "down" if satisfaction_rate < 50 else "neutral"
            
            insights.append({
                "metric_type": "satisfaction",
                "title": "Customer Satisfaction",
                "description": f"{satisfaction_rate}% positive feedback rate based on {total_feedback} ratings.",
                "delta_value": satisfaction_rate,
                "trend": trend
            })
        
        # 5. Conversation engagement
        total_sessions = len(set([m.get("session_id") for m in messages]))
        avg_messages_per_session = len(messages) / total_sessions if total_sessions > 0 else 0
        
        insights.append({
            "metric_type": "engagement",
            "title": "Conversation Engagement",
            "description": f"Average of {round(avg_messages_per_session, 1)} messages per session across {total_sessions} conversations.",
            "delta_value": round(avg_messages_per_session, 1),
            "trend": "up" if avg_messages_per_session > 3 else "neutral"
        })
        
        return insights
        
    except Exception as e:
        logger.error(f"Insight aggregation error: {e}")
        return []


async def materialize_insights(db, project_id: str, date_from: str = None, date_to: str = None):
    """
    Generate and store insights in database for fast retrieval.
    
    Args:
        db: MongoDB database instance
        project_id: Project ID
        date_from: Start date
        date_to: End date
    """
    try:
        insights = await aggregate_insights(db, project_id, date_from, date_to)
        
        if not insights:
            logger.info(f"No insights generated for project {project_id}")
            return
        
        # Store each insight
        for insight in insights:
            insight_doc = {
                "insight_id": f"ins_{project_id}_{insight['metric_type']}_{int(datetime.now(timezone.utc).timestamp())}",
                "project_id": project_id,
                "date_from": date_from,
                "date_to": date_to,
                "metric_type": insight["metric_type"],
                "title": insight["title"],
                "description": insight["description"],
                "delta_value": insight["delta_value"],
                "trend": insight.get("trend", "neutral"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Upsert to avoid duplicates
            await db.insight_summaries.update_one(
                {
                    "project_id": project_id,
                    "metric_type": insight["metric_type"],
                    "date_from": date_from,
                    "date_to": date_to
                },
                {"$set": insight_doc},
                upsert=True
            )
        
        logger.info(f"Materialized {len(insights)} insights for project {project_id}")
        
    except Exception as e:
        logger.error(f"Error materializing insights: {e}")


def trigger_insight_aggregation(db, project_id: str, date_from: str = None, date_to: str = None):
    """
    Fire-and-forget trigger for insight aggregation.
    """
    try:
        asyncio.create_task(
            materialize_insights(db, project_id, date_from, date_to)
        )
    except Exception as e:
        logger.error(f"Failed to trigger insight aggregation: {e}")
