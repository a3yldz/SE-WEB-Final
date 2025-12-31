import httpx
import os
import cloudinary
import cloudinary.uploader
from fastapi import UploadFile
from sqlalchemy.orm import Session
from typing import Optional
import uuid
from dotenv import load_dotenv

from app.models.smoke_detection import SmokeDetection
from app.models.fire_report import FireReport

load_dotenv()

ROBOFLOW_API_URL = "https://detect.roboflow.com"
ROBOFLOW_API_KEY = "XoNbKefV5xjEal7LJ744"
ROBOFLOW_MODEL_ID = "smoke-detection-5tkur/3"

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

print(f"[Cloudinary Config] Cloud Name: {CLOUDINARY_CLOUD_NAME}")
print(f"[Cloudinary Config] API Key: {CLOUDINARY_API_KEY[:4]}..." if CLOUDINARY_API_KEY else "[Cloudinary Config] API Key: None")

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True
)

async def upload_to_cloudinary(file_content: bytes, filename: str) -> str:
    """
    Upload image to Cloudinary and return the secure URL.
    """
    try:
        print(f"[Cloudinary] Starting upload for: {filename}")
        print(f"[Cloudinary] File size: {len(file_content)} bytes")
        
        if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
            print("[Cloudinary] ERROR: Missing configuration!")
            print(f"  Cloud Name: {CLOUDINARY_CLOUD_NAME}")
            print(f"  API Key: {CLOUDINARY_API_KEY}")
            print(f"  API Secret: {'set' if CLOUDINARY_API_SECRET else 'None'}")
            return filename
        
        result = cloudinary.uploader.upload(
            file_content,
            folder="smoke-detections",
            public_id=f"detection_{uuid.uuid4().hex[:8]}",
            resource_type="image"
        )
        
        secure_url = result.get("secure_url", "")
        print(f"[Cloudinary] SUCCESS! URL: {secure_url}")
        return secure_url
        
    except Exception as e:
        print(f"[Cloudinary] ERROR: Upload failed - {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return filename 

async def detect_smoke_service(
    file: UploadFile,
    db: Session,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    district: Optional[str] = None,
    city: Optional[str] = None
):
    """
    Smoke Detection Service with Automatic DB Flow:
    1. Upload image to Cloudinary
    2. Call Roboflow AI for smoke detection
    3. Save result to smoke_detections table (with Cloudinary URL)
    4. If risk_score > 50%, auto-create fire_report
    5. Return detection_id and report_id
    """
    contents = await file.read()
    print(f"[SmokeService] File received: {file.filename}, Size: {len(contents)} bytes")
    
    image_url = await upload_to_cloudinary(contents, file.filename or "upload.jpg")
    print(f"[SmokeService] Image URL after upload: {image_url}")
    
    detect_url = f"{ROBOFLOW_API_URL}/{ROBOFLOW_MODEL_ID}"
    params = {"api_key": ROBOFLOW_API_KEY}
    files = {"file": (file.filename or "upload.jpg", contents, file.content_type or "application/octet-stream")}

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(detect_url, params=params, files=files)
        response.raise_for_status()
        result = response.json()

    max_confidence = 0.0
    detections = []
    if result and "predictions" in result:
        for prediction in result["predictions"]:
            if "confidence" in prediction:
                confidence = prediction["confidence"]
                max_confidence = max(max_confidence, confidence)
                detections.append({
                    "confidence": confidence,
                    "class": prediction.get("class", "smoke"),
                    "bbox": prediction.get("bbox", {})
                })

    risk_score = max_confidence * 100
    print(f"[SmokeService] Risk score: {risk_score}%")
    
    location_parts = [p for p in [city, district] if p]
    full_location = ", ".join(location_parts) if location_parts else None
    
    detection_id = str(uuid.uuid4())
    smoke_detection = SmokeDetection(
        id=detection_id,
        image_url=image_url,
        latitude=latitude,
        longitude=longitude,
        district=full_location,
        risk_score=max_confidence,
        status="detected"
    )
    db.add(smoke_detection)
    db.commit()
    db.refresh(smoke_detection)
    print(f"[SmokeService] Saved detection: {detection_id}")
    
    report_created = False
    report_id = None
    
    if risk_score > 50:
        fire_report = FireReport(
            title="AI Auto-Generated Report",
            description=f"Smoke detected with {risk_score:.1f}% confidence at {full_location or 'Unknown Location'}.",
            location=full_location or "Unknown Location",
            image_url=image_url,
            status="pending"
        )
        db.add(fire_report)
        db.commit()
        db.refresh(fire_report)
        report_created = True
        report_id = fire_report.id
        print(f"[SmokeService] Created fire report: {report_id}")
    
    return {
        "success": True,
        "risk_score": risk_score,
        "confidence": max_confidence,
        "detections": detections,
        "detection_count": len(detections),
        "detection_id": detection_id,
        "image_url": image_url,
        "report_created": report_created,
        "report_id": report_id,
        "raw_result": result
    }
