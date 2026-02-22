"""Email Summary Worker - Async email generation and sending after lead capture."""
import os
import asyncio
import logging
import resend
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Get env vars AFTER loading .env
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info(f"[EMAIL INIT] Resend configured with API key: {RESEND_API_KEY[:10]}...")
else:
    logger.warning("[EMAIL INIT] RESEND_API_KEY not found in environment")


async def send_lead_summary_email(db, project_id: str, lead_id: str, session_id: str):
    """
    Generate AI summary of conversation and send email to lead.
    Runs fully async and non-blocking.
    
    Args:
        db: MongoDB database instance
        project_id: Project ID
        lead_id: Lead ID
        session_id: Session ID
    """
    try:
        logger.info(f"[EMAIL SEND] Starting email generation for lead {lead_id}")
        
        # Update status to pending
        await db.leads.update_one(
            {"lead_id": lead_id},
            {"$set": {"summary_email_status": "pending"}}
        )
        
        # Fetch lead info
        lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
        if not lead or not lead.get("email"):
            logger.error(f"[EMAIL SEND] Lead {lead_id} has no email")
            await db.leads.update_one(
                {"lead_id": lead_id},
                {"$set": {"summary_email_status": "failed", "error": "No email address"}}
            )
            return
        
        # Fetch project info
        project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
        if not project:
            logger.error(f"Project {project_id} not found")
            return
        
        # Fetch conversation history
        messages = await db.messages.find(
            {"session_id": session_id},
            {"_id": 0, "role": 1, "content": 1}
        ).sort("created_at", 1).to_list(100)
        
        if not messages:
            logger.error(f"No messages found for session {session_id}")
            return
        
        # Build conversation text
        conversation_text = ""
        for msg in messages:
            role = "User" if msg["role"] == "user" else "AI Assistant"
            conversation_text += f"{role}: {msg['content']}\n\n"
        
        # Generate summary using LLM
        summary_prompt = f"""You are an AI assistant summarizing a conversation between a potential customer and a business chatbot.

Business: {project.get('name', '')}
{project.get('description', '')}

Conversation:
{conversation_text}

Generate a professional email summary that includes:
1. Brief overview of what the customer was looking for
2. Key requirements or pain points discussed
3. Solutions or information provided
4. Recommended next steps with a clear call-to-action

Keep it concise (3-4 paragraphs) and actionable. Use a warm, professional tone."""
        
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"email_summary_{lead_id}",
                system_message="You are a helpful AI assistant summarizing customer conversations."
            ).with_model("openai", "gpt-4o-mini")
            
            summary_content = await chat.send_message(UserMessage(text=summary_prompt))
        except Exception as e:
            logger.error(f"LLM summary generation failed: {e}")
            summary_content = f"Thank you for your interest in {project.get('name', '')}. Our team will review your conversation and get back to you shortly."
        
        # Build HTML email
        html_email = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: {project.get('primary_color', '#7C3AED')}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
        .summary {{ background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid {project.get('primary_color', '#7C3AED')}; }}
        .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #888; }}
        h1 {{ margin: 0; font-size: 24px; }}
        p {{ margin: 10px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{project.get('name', 'Our Team')}</h1>
        </div>
        <div class="content">
            <p>Hi {lead.get('name', 'there')},</p>
            
            <p>Thank you for chatting with us! Here's a summary of our conversation:</p>
            
            <div class="summary">
                {summary_content.replace(chr(10), '<br>')}
            </div>
            
            <p>If you have any questions or would like to discuss further, feel free to reply to this email.</p>
            
            <p>Best regards,<br>
            <strong>{project.get('name', 'The Team')}</strong></p>
            
            <div class="footer">
                <p>This email was sent because you interacted with our chatbot.</p>
            </div>
        </div>
    </div>
</body>
</html>"""
        
        # Send email via Resend
        if not RESEND_API_KEY or RESEND_API_KEY == '':
            logger.error(f"[EMAIL SEND] RESEND_API_KEY is empty or not configured. Current value: '{RESEND_API_KEY}'")
            await db.leads.update_one(
                {"lead_id": lead_id},
                {"$set": {"summary_email_status": "failed", "error": "RESEND_API_KEY not configured"}}
            )
            return
        
        try:
            params = {
                "from": SENDER_EMAIL,
                "to": [lead["email"]],
                "subject": f"Summary of your conversation with {project.get('name', 'us')}",
                "html": html_email
            }
            
            # Use asyncio.to_thread for sync Resend SDK
            email_response = await asyncio.to_thread(resend.Emails.send, params)
            
            # Update status to sent
            await db.leads.update_one(
                {"lead_id": lead_id},
                {"$set": {
                    "summary_email_status": "sent",
                    "summary_email_sent_at": datetime.now(timezone.utc).isoformat(),
                    "email_id": email_response.get("id")
                }}
            )
            
            logger.info(f"Email sent successfully to {lead['email']} for lead {lead_id}")
            
        except Exception as e:
            logger.error(f"Failed to send email via Resend: {e}")
            await db.leads.update_one(
                {"lead_id": lead_id},
                {"$set": {"summary_email_status": "failed", "error": str(e)}}
            )
    
    except Exception as e:
        logger.error(f"Email summary worker error for lead {lead_id}: {e}")
        try:
            await db.leads.update_one(
                {"lead_id": lead_id},
                {"$set": {"summary_email_status": "failed", "error": str(e)}}
            )
        except:
            pass


def trigger_email_summary(db, project_id: str, lead_id: str, session_id: str):
    """
    Fire-and-forget trigger for email summary.
    Creates async task without blocking.
    """
    try:
        logger.info(f"[EMAIL WORKER] Creating async task for lead {lead_id}")
        asyncio.create_task(
            send_lead_summary_email(db, project_id, lead_id, session_id)
        )
        logger.info(f"[EMAIL WORKER] Async task created successfully for lead {lead_id}")
    except Exception as e:
        logger.error(f"[EMAIL WORKER] Failed to trigger email summary: {e}")
