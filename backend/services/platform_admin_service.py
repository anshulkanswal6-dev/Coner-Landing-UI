"""Platform Admin Analytics - Global statistics across all users and projects."""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

logger = logging.getLogger(__name__)


async def get_platform_stats(db) -> Dict[str, Any]:
    """
    Get platform-wide statistics across all users and projects.
    
    Returns comprehensive metrics for platform admin dashboard.
    """
    try:
        now = datetime.now(timezone.utc)
        seven_days_ago = (now - timedelta(days=7)).isoformat()
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        
        # Core metrics
        total_users = await db.users.count_documents({})
        total_projects = await db.projects.count_documents({})
        total_conversations = await db.conversations.count_documents({})
        total_messages = await db.messages.count_documents({})
        total_leads = await db.leads.count_documents({})
        
        # Active users (logged in or created project in last 30 days)
        active_users_30d = await db.users.count_documents({
            "created_at": {"$gte": thirty_days_ago}
        })
        
        active_users_7d = await db.users.count_documents({
            "created_at": {"$gte": seven_days_ago}
        })
        
        # Recent activity
        conversations_7d = await db.conversations.count_documents({
            "started_at": {"$gte": seven_days_ago}
        })
        
        conversations_30d = await db.conversations.count_documents({
            "started_at": {"$gte": thirty_days_ago}
        })
        
        messages_7d = await db.messages.count_documents({
            "created_at": {"$gte": seven_days_ago}
        })
        
        messages_30d = await db.messages.count_documents({
            "created_at": {"$gte": thirty_days_ago}
        })
        
        leads_7d = await db.leads.count_documents({
            "created_at": {"$gte": seven_days_ago}
        })
        
        leads_30d = await db.leads.count_documents({
            "created_at": {"$gte": thirty_days_ago}
        })
        
        # Knowledge base stats
        total_knowledge_sources = await db.knowledge_sources.count_documents({})
        total_knowledge_chunks = await db.knowledge_chunks.count_documents({})
        
        # Feedback stats
        total_positive_feedback = await db.messages.count_documents({"feedback": 1})
        total_negative_feedback = await db.messages.count_documents({"feedback": -1})
        
        # Top projects by activity (conversations)
        top_projects_pipeline = [
            {
                "$group": {
                    "_id": "$project_id",
                    "conversation_count": {"$sum": 1}
                }
            },
            {"$sort": {"conversation_count": -1}},
            {"$limit": 10}
        ]
        
        top_projects_data = await db.conversations.aggregate(top_projects_pipeline).to_list(10)
        
        # Enrich with project names
        top_projects = []
        for item in top_projects_data:
            project = await db.projects.find_one(
                {"project_id": item["_id"]},
                {"_id": 0, "name": 1, "user_id": 1}
            )
            if project:
                top_projects.append({
                    "project_id": item["_id"],
                    "project_name": project.get("name", "Unknown"),
                    "conversation_count": item["conversation_count"]
                })
        
        # User growth (new users per day for last 7 days)
        user_growth = []
        for i in range(7):
            day_start = (now - timedelta(days=i+1)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            day_end = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            
            count = await db.users.count_documents({
                "created_at": {"$gte": day_start, "$lt": day_end}
            })
            
            user_growth.append({
                "date": day_start[:10],
                "new_users": count
            })
        
        user_growth.reverse()  # Oldest to newest
        
        # Agent mode distribution
        acquisition_projects = await db.projects.count_documents({"agent_mode": "acquisition"})
        support_projects = await db.projects.count_documents({"agent_mode": "support"})
        
        # Calculate averages
        avg_conversations_per_project = round(total_conversations / total_projects, 1) if total_projects > 0 else 0
        avg_messages_per_conversation = round(total_messages / total_conversations, 1) if total_conversations > 0 else 0
        avg_projects_per_user = round(total_projects / total_users, 1) if total_users > 0 else 0
        
        # Overall satisfaction rate
        total_feedback = total_positive_feedback + total_negative_feedback
        satisfaction_rate = round((total_positive_feedback / total_feedback * 100), 1) if total_feedback > 0 else 0
        
        return {
            "status": "success",
            "generated_at": now.isoformat(),
            
            # Core Metrics
            "total_users": total_users,
            "total_projects": total_projects,
            "total_conversations": total_conversations,
            "total_messages": total_messages,
            "total_leads": total_leads,
            
            # Active Users
            "active_users_7d": active_users_7d,
            "active_users_30d": active_users_30d,
            
            # Recent Activity
            "conversations_7d": conversations_7d,
            "conversations_30d": conversations_30d,
            "messages_7d": messages_7d,
            "messages_30d": messages_30d,
            "leads_7d": leads_7d,
            "leads_30d": leads_30d,
            
            # Knowledge Base
            "total_knowledge_sources": total_knowledge_sources,
            "total_knowledge_chunks": total_knowledge_chunks,
            
            # Feedback
            "total_positive_feedback": total_positive_feedback,
            "total_negative_feedback": total_negative_feedback,
            "satisfaction_rate": satisfaction_rate,
            
            # Averages
            "avg_conversations_per_project": avg_conversations_per_project,
            "avg_messages_per_conversation": avg_messages_per_conversation,
            "avg_projects_per_user": avg_projects_per_user,
            
            # Agent Modes
            "acquisition_projects": acquisition_projects,
            "support_projects": support_projects,
            
            # Top Projects
            "top_projects": top_projects,
            
            # Growth
            "user_growth_7d": user_growth
        }
        
    except Exception as e:
        logger.error(f"Platform stats error: {e}")
        return {
            "status": "error",
            "error": str(e)
        }
