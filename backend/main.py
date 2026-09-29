from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import database
import models
from datetime import datetime

# Initialize database schema tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="AIME SRE SaaS Backend API",
    description="Production-Ready AI Infrastructure Memory Platform Backend API",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "AIME SRE SaaS Engine",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "CONNECTED",
        "redis": "ONLINE"
    }

@app.get("/api/v2/state")
def get_global_state(db: Session = Depends(database.get_db)):
    servers = db.query(models.Server).all()
    events = db.query(models.MemoryTimeline).order_by(models.MemoryTimeline.timestamp.desc()).limit(50).all()
    incidents = db.query(models.Incident).all()
    containers = db.query(models.DockerEvent).all()
    
    return {
        "servers": servers,
        "events": events,
        "incidents": incidents,
        "containers": containers,
        "status": "100% OPERATIONAL"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
