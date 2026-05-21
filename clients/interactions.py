"""
Unified client interaction — activity + relationship memory in one flow.
"""

from __future__ import annotations

from django.utils import timezone

from activities.models import Activity

from .models import Client


INTERACTION_TO_ACTIVITY = {
    "note": Activity.Type.NOTE,
    "call": Activity.Type.CALL,
    "meeting": Activity.Type.MEETING,
}


def record_client_interaction(
    *,
    client: Client,
    user,
    interaction_type: str,
    content: str,
    category: str = "",
    topic: str = "",
    mood: str = "",
    outcome: str = "",
    next_step: str = "",
    concerns: str = "",
    relationship_context: str = "",
    follow_up_on=None,
    schedule_follow_up: bool = False,
    follow_up_content: str = "",
    follow_up_due=None,
) -> dict:
    content = (content or "").strip()
    if not content and interaction_type != "follow_up":
        raise ValueError("Interaction content is required.")

    activity = None
    activity_type = INTERACTION_TO_ACTIVITY.get(interaction_type)
    if activity_type:
        activity = Activity.objects.create(
            client=client,
            author=user,
            type=activity_type,
            category=(category or "Follow up").strip() or "Follow up",
            content=content,
        )

    task = None
    if schedule_follow_up or interaction_type == "follow_up":
        task_content = (follow_up_content or next_step or content or "Follow up").strip()
        task = Activity.objects.create(
            client=client,
            author=user,
            assigned_to=user,
            type=Activity.Type.TASK,
            category="follow_up",
            content=task_content,
            due_date=follow_up_due,
            priority=Activity.TaskPriority.MEDIUM,
        )

    now = timezone.now()
    update_fields = ["last_conversation_at", "updated_at"]
    client.last_conversation_at = now

    if topic.strip():
        client.last_conversation_topic = topic.strip()
        update_fields.append("last_conversation_topic")
    elif content and activity_type in (Activity.Type.CALL, Activity.Type.MEETING):
        client.last_conversation_topic = content[:500]
        update_fields.append("last_conversation_topic")

    if mood.strip():
        client.last_conversation_mood = mood.strip()
        update_fields.append("last_conversation_mood")
    if outcome.strip():
        client.last_conversation_outcome = outcome.strip()
        update_fields.append("last_conversation_outcome")
    if next_step.strip():
        client.next_step = next_step.strip()
        update_fields.append("next_step")
    if concerns.strip():
        client.relationship_concerns = concerns.strip()
        update_fields.append("relationship_concerns")
    if relationship_context.strip():
        client.relationship_context = relationship_context.strip()
        update_fields.append("relationship_context")
    if follow_up_on is not None:
        client.follow_up_on = follow_up_on
        update_fields.append("follow_up_on")

    client.save(update_fields=list(dict.fromkeys(update_fields)))

    from .profile import relationship_memory_payload

    return {
        "activity_id": activity.id if activity else None,
        "task_id": task.id if task else None,
        "relationship_memory": relationship_memory_payload(client),
    }
