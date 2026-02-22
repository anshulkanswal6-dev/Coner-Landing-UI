"""Learning Extraction Worker - Extract patterns from feedback for self-learning RAG."""
import logging
from datetime import datetime, timezone
from typing import List
import asyncio

logger = logging.getLogger(__name__)


async def extract_learned_pattern(
    db,
    embedding_model,
    project_id: str,
    message_id: str,
    feedback: int
):
    """
    Extract learned pattern from user feedback.
    
    Args:
        db: MongoDB database instance
        embedding_model: Sentence transformer model
        project_id: Project ID
        message_id: Message ID that received feedback
        feedback: 1 (positive) or -1 (negative)
    """
    try:
        # Fetch the message
        message = await db.messages.find_one({"message_id": message_id}, {"_id": 0})
        if not message:
            logger.error(f"Message {message_id} not found")
            return
        
        session_id = message.get("session_id")
        
        # Fetch user query (previous user message)
        user_msg = await db.messages.find_one(
            {
                "session_id": session_id,
                "role": "user",
                "created_at": {"$lt": message.get("created_at")}
            },
            {"_id": 0}
        )
        
        if not user_msg:
            logger.error(f"No user query found for message {message_id}")
            return
        
        query = user_msg.get("content", "")
        response = message.get("content", "")
        
        # Determine pattern type
        pattern_type = "success" if feedback == 1 else "objection"
        
        # Create pattern content
        if feedback == 1:
            # Success pattern
            pattern_content = f"""Q: {query}
A: {response}
[This response was marked helpful by users]"""
        else:
            # Objection/failure pattern
            pattern_content = f"""Q: {query}
A (needs improvement): {response}
[This response received negative feedback - consider alternative approaches]"""
        
        # Generate embedding
        combined_text = f"{query} {response}"
        combined_text = combined_text.replace("\n", " ").strip()[:8000]
        
        try:
            embedding = embedding_model.encode(combined_text).tolist()
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            return
        
        # Calculate metadata weight (higher for positive feedback)
        metadata_weight = 1.2 if feedback == 1 else 0.8
        
        # Check if similar pattern already exists (avoid duplicates)
        existing = await db.learned_patterns.find_one({
            "project_id": project_id,
            "message_id": message_id
        })
        
        if existing:
            logger.info(f"Pattern already exists for message {message_id}")
            return
        
        # Store learned pattern
        pattern_id = f"lp_{message_id}"
        await db.learned_patterns.insert_one({
            "pattern_id": pattern_id,
            "project_id": project_id,
            "message_id": message_id,
            "pattern_type": pattern_type,
            "query": query,
            "response": response,
            "content": pattern_content,
            "embedding": embedding,
            "metadata_weight": metadata_weight,
            "feedback_value": feedback,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"Learned pattern extracted: {pattern_type} for message {message_id}")
        
    except Exception as e:
        logger.error(f"Learning extraction error for message {message_id}: {e}")


def trigger_learning_extraction(db, embedding_model, project_id: str, message_id: str, feedback: int):
    """
    Fire-and-forget trigger for learning extraction.
    Creates async task without blocking.
    """
    try:
        asyncio.create_task(
            extract_learned_pattern(db, embedding_model, project_id, message_id, feedback)
        )
    except Exception as e:
        logger.error(f"Failed to trigger learning extraction: {e}")


async def search_learned_patterns(
    db,
    project_id: str,
    query_embedding: List[float],
    top_k: int = 3
) -> List[dict]:
    """
    Search for relevant learned patterns (used in RAG pipeline).
    
    Args:
        db: MongoDB database instance
        project_id: Project ID
        query_embedding: Query embedding vector
        top_k: Number of patterns to return
    
    Returns:
        List of relevant learned patterns
    """
    try:
        import numpy as np
        
        patterns = await db.learned_patterns.find(
            {"project_id": project_id},
            {"_id": 0, "content": 1, "embedding": 1, "pattern_type": 1, "metadata_weight": 1}
        ).to_list(100)
        
        if not patterns:
            return []
        
        scored = []
        for p in patterns:
            if p.get("embedding"):
                # Calculate cosine similarity
                a = np.array(query_embedding)
                b = np.array(p["embedding"])
                sim = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))
                
                # Apply metadata weight
                weighted_score = sim * p.get("metadata_weight", 1.0)
                
                scored.append({
                    "content": p["content"],
                    "pattern_type": p["pattern_type"],
                    "score": weighted_score,
                    "raw_similarity": sim
                })
        
        # Sort by weighted score and return top_k
        scored.sort(key=lambda x: x["score"], reverse=True)
        
        # Only return patterns with score > 0.3
        relevant = [p for p in scored if p["raw_similarity"] > 0.3]
        
        return relevant[:top_k]
        
    except Exception as e:
        logger.error(f"Error searching learned patterns: {e}")
        return []
