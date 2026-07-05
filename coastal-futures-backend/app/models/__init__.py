"""Modèles SQLAlchemy — calqués sur DIAGS/ClassDiagram.png.

Périmètre v1 (auth + candidatures) : User, Call, Application, AdminInvite,
AuditLog, Notification, Subscriber, ContactMessage. Les autres entités du
diagramme (Content, Mentorship, Project, Indicator…) arriveront par lots.
"""
from .user import User
from .call import Call
from .application import Application
from .admin import AdminInvite, AuditLog, Notification
from .messaging import Subscriber, ContactMessage
from .content import Content
from .thread import Thread, Message
from .mentorship import MentorRequest, Mentorship, MentorSession
from .mapproject import MapProject
from .authtoken import OtpCode, AuthToken

__all__ = [
    "User",
    "Call",
    "Application",
    "AdminInvite",
    "AuditLog",
    "Notification",
    "Subscriber",
    "ContactMessage",
    "Content",
    "Thread",
    "Message",
    "MentorRequest",
    "Mentorship",
    "MentorSession",
    "MapProject",
    "OtpCode",
    "AuthToken",
]
