import base64
import json
import logging
import os
import sys
import time
import uuid
import zipfile
import requests
from io import BytesIO
from PIL import Image

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AuraMirror")

app = FastAPI(title="AuraMirror Skin AI MVP")

# Security: Restrict CORS strictly to local origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
SECRETS_PATH = os.environ.get("YOUCAM_SECRETS_PATH", os.path.join(BASE_DIR, "secrets", "youcam_api.json"))
if not os.path.exists(SECRETS_PATH) and os.path.exists(r"C:\AI\.secrets\youcam_api.json"):
    SECRETS_PATH = r"C:\AI\.secrets\youcam_api.json"

CACHE_DIR = os.path.join(BASE_DIR, "cache")
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

def get_youcam_api_key():
    env_key = os.environ.get("YOUCAM_API_KEY", "").strip()
    if env_key:
        return env_key
    if os.path.exists(SECRETS_PATH):
        try:
            with open(SECRETS_PATH, "r", encoding="utf-8") as f:
                key = json.load(f).get("api_key", "").strip()
                if key:
                    return key
        except Exception as e:
            logger.warning(f"Failed to read secrets file: {e}")
    return ""

def format_metric(val):
    if val is None or val == "":
        return "N/A"
    return str(val)

# Rule-Based Dermatological Ingredient Suggestions Table (Honest & Non-hallucinatory)
RULE_BASED_INGREDIENTS = {
    "oiliness": {
        "tag": "T-Zone Sebum & Pores",
        "product_name": "Skin Perfecting 2% BHA Liquid Exfoliant",
        "brand": "Paula's Choice",
        "active_ingredients": "Salicylic Acid (BHA 2%), Green Tea Extract",
        "purpose": "Clears clogged T-zone pores and balances sebum levels",
        "buy_url": "https://www.google.com/search?q=Paulas+Choice+2+BHA+Liquid+Exfoliant"
    },
    "dark_circle": {
        "tag": "Eye Fatigue & Dark Circles",
        "product_name": "Caffeine Solution 5% + EGCG",
        "brand": "The Ordinary",
        "active_ingredients": "Caffeine (5%), Epigallocatechin Gallatyl Glucoside (EGCG)",
        "purpose": "Reduces the appearance of eye contour puffiness and dark circles",
        "buy_url": "https://www.google.com/search?q=The+Ordinary+Caffeine+Solution+5+EGCG"
    },
    "moisture": {
        "tag": "Barrier & Deep Hydration",
        "product_name": "DIVE-IN Low Molecular Hyaluronic Acid Serum",
        "brand": "Torriden",
        "active_ingredients": "5D Complex Hyaluronic Acid, D-Panthenol, Allantoin",
        "purpose": "Provides instant deep hydration and replenishes the skin moisture barrier",
        "buy_url": "https://www.google.com/search?q=Torriden+DIVE+IN+Hyaluronic+Acid+Serum"
    },
    "redness": {
        "tag": "Calming & Barrier Relief",
        "product_name": "Madagascar Centella Ampoule",
        "brand": "SKIN1004",
        "active_ingredients": "Centella Asiatica Extract (100%), Madecassic Acid",
        "purpose": "Soothes irritated skin and calms facial redness",
        "buy_url": "https://www.google.com/search?q=SKIN1004+Madagascar+Centella+Ampoule"
    },
    "pore": {
        "tag": "Pore Refinement",
        "product_name": "Niacinamide 10% + Zinc 1%",
        "brand": "The Ordinary",
        "active_ingredients": "Niacinamide (Vitamin B3 10%), Zinc PCA (1%)",
        "purpose": "Tightens enlarged pores and refines irregular skin texture",
        "buy_url": "https://www.google.com/search?q=The+Ordinary+Niacinamide+10+Zinc+1"
    }
}

class AnalyzeRequest(BaseModel):
    image_base64: str | None = None

class PrescribeRequest(BaseModel):
    skin_metrics: dict
    wearable_data: dict

@app.get("/")
def read_root():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "AuraMirror AI API Server is running. Static index.html not yet found."}

@app.post("/api/analyze")
def analyze_skin(req: AnalyzeRequest):
    if not req.image_base64 or not req.image_base64.strip():
        raise HTTPException(status_code=400, detail="Webcam facial frame is missing. Please face the camera and scan.")

    api_key = get_youcam_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="YouCam API key is not configured on the server.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    base_url = "https://yce-api-01.makeupar.com"

    temp_img_path = os.path.join(CACHE_DIR, f"input_{uuid.uuid4().hex}.jpg")
    try:
        # 1. Prepare Image
        try:
            data = req.image_base64
            if "," in data:
                data = data.split(",")[1]
            img_bytes = base64.b64decode(data)
            im = Image.open(BytesIO(img_bytes)).convert("RGB")
            # Ensure square crop for optimal facial detection
            w, h = im.size
            min_dim = min(w, h)
            left = (w - min_dim) // 2
            top = (h - min_dim) // 2
            cropped = im.crop((left, top, left + min_dim, top + min_dim))
            final_im = cropped.resize((600, 600), Image.LANCZOS)
            final_im.save(temp_img_path, quality=95)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Image preprocessing failed: {str(e)}")

        file_size = os.path.getsize(temp_img_path)
        file_name = os.path.basename(temp_img_path)

        # 2. YouCam File Upload Slot
        slot_resp = requests.post(f"{base_url}/s2s/v2.0/file", headers=headers, json={
            "files": [{"content_type": "image/jpeg", "file_name": file_name, "file_size": file_size}]
        }, timeout=20).json()

        file_obj = slot_resp["data"]["files"][0]
        file_id = file_obj["file_id"]
        req_obj = file_obj["requests"][0]
        upload_url = req_obj["url"]
        upload_headers = req_obj.get("headers", {"Content-Type": "image/jpeg"})

        with open(temp_img_path, "rb") as f:
            put_resp = requests.put(upload_url, data=f, headers=upload_headers, timeout=30)
        if put_resp.status_code not in [200, 201]:
            raise HTTPException(status_code=500, detail="S3 Upload Failed")

        # 3. Create Skin Analysis Task
        actions = ["redness", "oiliness", "pore", "acne", "moisture", "texture", "wrinkle", "age_spot", "dark_circle_v2"]
        task_resp = requests.post(f"{base_url}/s2s/v2.0/task/skin-analysis", headers=headers, json={
            "src_file_id": file_id,
            "dst_actions": actions
        }, timeout=20).json()

        task_id = task_resp.get("data", {}).get("task_id")
        if not task_id:
            raise HTTPException(status_code=400, detail=f"Task creation error: {task_resp}")

        # 4. Synchronous Poll Result (1.5s interval, max 25 retries)
        zip_url = None
        for _ in range(25):
            time.sleep(1.5)
            poll = requests.get(f"{base_url}/s2s/v2.0/task/skin-analysis/{task_id}", headers=headers, timeout=20).json()
            st = poll.get("data", {}).get("task_status")
            if st == "success":
                zip_url = poll["data"]["results"]["url"]
                break
            elif st == "error":
                err_msg = poll.get("data", {}).get("error_message", "Unknown skin analysis error")
                raise HTTPException(status_code=400, detail=err_msg)

        if not zip_url:
            raise HTTPException(status_code=504, detail="Skin analysis polling timed out")

        # 5. In-Memory ZIP Decompression (Zero disk retention of result archives)
        zip_bytes = requests.get(zip_url, timeout=30).content
        score_data = {}
        masks = {}

        with zipfile.ZipFile(BytesIO(zip_bytes), "r") as zf:
            for item in zf.namelist():
                base = os.path.basename(item)
                if base == "score_info.json":
                    score_data = json.loads(zf.read(item).decode("utf-8"))
                elif base.endswith("_output.png"):
                    masks[base] = f"data:image/png;base64,{base64.b64encode(zf.read(item)).decode('utf-8')}"

        if not score_data:
            raise HTTPException(status_code=502, detail="Skin analysis result archive missing score_info.json")

        return {
            "status": "success",
            "task_id": task_id,
            "score_info": score_data,
            "masks": masks
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_img_path):
            try:
                os.remove(temp_img_path)
            except Exception as cleanup_err:
                logger.warning(f"[Privacy Cleanup] Failed to remove temporary face image: {cleanup_err}")

@app.post("/api/prescribe")
def prescribe_routine(req: PrescribeRequest):
    metrics = req.skin_metrics
    wearable = req.wearable_data

    sleep_h = wearable.get('sleep_hours', 7.0)
    water_ml = wearable.get('water_intake_ml', 1000)
    uv_h = wearable.get('uv_exposure_hours', 2.0)

    # F-02-A Strict Validation: Ensure at least one supported evaluable metric exists (0 <= score <= 100, no booleans)
    evaluated_keys = ["oiliness", "dark_circle", "moisture", "redness", "pore"]
    valid_evals = [k for k in evaluated_keys if isinstance(metrics.get(k), (int, float)) and not isinstance(metrics.get(k), bool) and 0 <= metrics[k] <= 100]
    if not valid_evals:
        raise HTTPException(status_code=400, detail="No evaluable numerical skin scores found in supported categories. Please scan face first.")

    # Honest concern detection: flag only metrics below healthy thresholds (< 75 or < 80)
    concerns = []
    if "oiliness" in valid_evals and metrics['oiliness'] < 75:
        concerns.append("oiliness")
    if "dark_circle" in valid_evals and metrics['dark_circle'] < 80:
        concerns.append("dark_circle")
    if "moisture" in valid_evals and metrics['moisture'] < 75:
        concerns.append("moisture")
    if "redness" in valid_evals and metrics['redness'] < 80:
        concerns.append("redness")
    if "pore" in valid_evals and metrics['pore'] < 75:
        concerns.append("pore")

    # F-02 Solution: If all evaluable metrics are in healthy range, explicitly return optimal status with ZERO forced products
    if not concerns:
        return {
            "source": "rule_based_ingredient_engine",
            "assessment_status": "optimal_balance",
            "disclaimer": "This analysis is for general skincare wellness education and is not a medical diagnosis.",
            "headline": f"Available scores meet the prototype's rule thresholds ({sleep_h}h sleep context)",
            "root_causes": [
                "Only available, valid scores were evaluated; missing categories were not assessed.",
                f"Lifestyle inputs ({sleep_h}h sleep, {water_ml}ml water, {uv_h}h UV) recorded for wellness context."
            ],
            "routine": {
                "morning": "Maintain your gentle cleansing routine and apply daily broad-spectrum sun protection.",
                "evening": "Apply light restorative nighttime moisturizer and get adequate rest.",
                "lifestyle": f"Continue steady water intake ({water_ml}ml) and maintain consistent sleep hygiene."
            },
            "recommendations": []  # Zero forced products when skin is healthy
        }

    # Map genuine concerns to established active ingredients
    selected_recommendations = []
    for c in concerns[:3]:
        if c in RULE_BASED_INGREDIENTS:
            selected_recommendations.append(RULE_BASED_INGREDIENTS[c])

    # F-02-B Solution: General wellness routine without hardcoding unindicated ingredients
    return {
        "source": "rule_based_ingredient_engine",
        "assessment_status": "targeted_concerns",
        "disclaimer": "This analysis is for general skincare wellness education and is not a medical diagnosis.",
        "headline": f"Targeted skincare guidance for identified scores ({sleep_h}h sleep context)",
        "root_causes": [
            "Observed visual metrics indicate targeted areas for topical barrier support.",
            f"Lifestyle inputs ({sleep_h}h sleep, {water_ml}ml water, {uv_h}h UV) recorded for wellness context."
        ],
        "routine": {
            "morning": "Cleanse gently with a mild cleanser, apply targeted formula to areas of concern, and finish with broad-spectrum sunscreen.",
            "evening": "Wash thoroughly, replenish the skin moisture barrier with a light nighttime moisturizer, and rest.",
            "lifestyle": f"Increase daily water intake toward 2,000ml and prioritize consistent recovery sleep."
        },
        "recommendations": selected_recommendations
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
