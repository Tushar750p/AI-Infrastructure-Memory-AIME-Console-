from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String, primary_order=True, primary_key=True)
    name = Column(String, nullable=False)
    plan = Column(String, default="pro")  # free, pro, enterprise
    status = Column(String, default="ACTIVE")
    mrr = Column(Float, default=199.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="organization")
    servers = relationship("Server", back_populates="organization")

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="SRE")  # Owner, Admin, DevOps Engineer, SRE, Developer, Viewer
    mfa_secret = Column(String, nullable=True)
    mfa_enabled = Column(Boolean, default=False)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="users")

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"))
    environment = Column(String, default="production")
    created_at = Column(DateTime, default=datetime.utcnow)

class Server(Base):
    __tablename__ = "servers"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    ip = Column(String, nullable=False)
    os = Column(String, nullable=False)
    status = Column(String, default="healthy")  # healthy, warning, critical
    uptime = Column(String, default="14d 6h")
    cpu = Column(Float, default=25.0)
    ram = Column(Float, default=40.0)
    disk = Column(Float, default=50.0)
    provider = Column(String, default="AWS EC2")
    region = Column(String, default="us-east-1a")
    ssh_port = Column(Integer, default=22)
    ssh_user = Column(String, default="ubuntu")
    ssh_key = Column(Text, nullable=True)
    running_services = Column(JSON, default=list)
    installed_packages = Column(JSON, default=list)
    kernel_version = Column(String, default="Linux 5.15")
    open_ports = Column(JSON, default=list)
    running_processes = Column(JSON, default=list)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="servers")

class Infrastructure(Base):
    __tablename__ = "infrastructure"

    id = Column(String, primary_key=True)
    type = Column(String, nullable=False)
    name = Column(String, nullable=False)
    resource_id = Column(String, nullable=False)
    region = Column(String, default="us-east-1")
    status = Column(String, default="active")
    config = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    severity = Column(String, default="High")  # Critical, High, Medium, Low
    category = Column(String, nullable=False)
    resource_name = Column(String, nullable=False)
    environment = Column(String, default="Production")
    timestamp = Column(DateTime, default=datetime.utcnow)
    root_cause = Column(Text, nullable=True)
    ai_analysis = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    status = Column(String, default="active")
    risk_level = Column(String, default="HIGH")
    impact = Column(Text, nullable=True)
    estimated_resolution_time = Column(String, default="5m")
    commands = Column(Text, nullable=True)
    assignee = Column(String, nullable=True)
    timeline = Column(JSON, default=list)
    comments = Column(JSON, default=list)

class CommandHistory(Base):
    __tablename__ = "commands_history"

    id = Column(String, primary_key=True)
    command = Column(Text, nullable=False)
    server_id = Column(String, nullable=False)
    server_name = Column(String, nullable=False)
    username = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    output = Column(Text, nullable=True)
    exit_code = Column(Integer, default=0)
    incident_id = Column(String, nullable=True)

class SSHSession(Base):
    __tablename__ = "ssh_sessions"

    id = Column(String, primary_key=True)
    server_id = Column(String, nullable=False)
    username = Column(String, nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    status = Column(String, default="active")
    logs = Column(Text, nullable=True)

class DockerEvent(Base):
    __tablename__ = "docker_events"

    id = Column(String, primary_key=True)
    container_id = Column(String, nullable=False)
    container_name = Column(String, nullable=False)
    event_type = Column(String, nullable=False)  # start, stop, restart, oom
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(JSON, default=dict)

class KubernetesEvent(Base):
    __tablename__ = "kubernetes_events"

    id = Column(String, primary_key=True)
    pod_name = Column(String, nullable=False)
    namespace = Column(String, default="default")
    type = Column(String, default="Warning")
    reason = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class TerraformChange(Base):
    __tablename__ = "terraform_changes"

    id = Column(String, primary_key=True)
    state_file = Column(String, nullable=False)
    changes = Column(JSON, default=dict)
    drift_detected = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class AWSResource(Base):
    __tablename__ = "aws_resources"

    id = Column(String, primary_key=True)
    service_type = Column(String, nullable=False)  # EC2, RDS, S3, IAM, VPC, ALB, CloudWatch, Lambda, EKS, ECS, SG
    resource_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    region = Column(String, default="us-east-1")
    status = Column(String, default="running")
    tags = Column(JSON, default=dict)
    last_sync = Column(DateTime, default=datetime.utcnow)

class MemoryTimeline(Base):
    __tablename__ = "memory_timeline"

    id = Column(String, primary_key=True)
    event_type = Column(String, nullable=False)
    source = Column(String, nullable=False)
    title = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    severity = Column(String, default="healthy")
    actor = Column(String, default="system")

class AIKnowledge(Base):
    __tablename__ = "ai_knowledge"

    id = Column(String, primary_key=True)
    problem = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=False)
    fix = Column(Text, nullable=False)
    commands = Column(Text, nullable=True)
    engineer = Column(String, default="AIME_Agent")
    server_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)  # Incident, Root Cause, Executive, Health, Security
    format = Column(String, default="PDF")  # PDF, Excel, CSV
    generated_at = Column(DateTime, default=datetime.utcnow)
    content_data = Column(JSON, default=dict)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True)
    channel = Column(String, nullable=False)  # Email, Slack, Teams, Telegram
    target = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, default="SENT")
    timestamp = Column(DateTime, default=datetime.utcnow)

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"))
    plan_id = Column(String, default="pro")
    amount = Column(Float, default=49.0)
    currency = Column(String, default="USD")
    status = Column(String, default="ACTIVE")
    current_period_end = Column(DateTime)
    stripe_customer_id = Column(String, nullable=True)

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"))
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    status = Column(String, default="PAID")
    invoice_url = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    actor = Column(String, nullable=False)
    role = Column(String, nullable=False)
    action = Column(String, nullable=False)
    resource = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String, default="127.0.0.1")
    severity = Column(String, default="low")
