# Technical Specification (SPEC): AuraMirror AI

## 1. System Architecture

```
[Phase 1 Client: Web Browser]
  ├── HTML5 / CSS3 Glassmorphism HUD (Smart Mirror Theme - Global English Interface)
  ├── WebRTC MediaStream (Webcam Video & ReadyState Check >= 2)
  ├── Per-Scan Clean State Reset (Zero stale result carryover, badge reset)
  ├── Interactive 2D Canvas Mask Renderer (Tinted alpha blend overlays with render token)
  ├── User Lifestyle Simulation Controls (Sleep, Deep Sleep, UV, Water, Stress)
  └── Vanilla ES6 Client State Management (Async Fetch, DOM XSS Defense)
        │
        │ HTTP / JSON (REST - Local Loopback 127.0.0.1:8000)
        ▼
[Application Tier: FastAPI Backend Engine] (server.py)
  ├── Endpoint 1: POST /api/analyze (YouCam Cloud Pipeline Coordinator)
  │     ├── Base64 Frame Decoder & Square Crop (Pillow 600x600)
  │     ├── UUID-Isolated Temporary Input Image (`input_{uuid.hex}.jpg`)
  │     ├── AWS S3 Pre-signed Upload Slot Acquisition
  │     ├── YouCam Task Dispatch (/s2s/v2.0/task/skin-analysis)
  │     ├── Synchronous Polling Worker (1.5s interval, max 25 retries, 20s timeout)
  │     ├── In-Memory ZIP Decompression (BytesIO - In-Memory result archive extraction)
  │     └── Immediate Temp Face Image Cleanup Attempted (Logged `finally` block)
  │
  ├── Endpoint 2: POST /api/prescribe (Rule-Based Ingredient Suggestions Engine)
  │     ├── Input Numerical Validation (0-100 range, rejects non-numeric/empty evaluations)
  │     ├── Deterministic Ingredient Lookup (`RULE_BASED_INGREDIENTS`)
  │     ├── Threshold-Driven Suggestions (<75 or <80)
  │     ├── Empty Product List when all evaluable scores meet rule thresholds (`optimal_balance`)
  │     └── Global Google Search Exploration URLs (HTTPS)
  │
  └── Static Asset Server (Mirror HUD UI, CSS, JS)

[Phase 2 Client: Android Native Prototype] (Roadmap)
  ├── Kotlin / CameraX Native Facial Capture
  ├── Android Health Connect API Read Service (Sleep Sessions, Hydration Records)
  ├── Permission & Provenance Manager (Device ID, Timestamp, Missing Data Flags)
  └── Secure Backend Proxy Client (No API secrets stored in APK)
```

## 2. API Endpoints Specification

### 2.1 POST `/api/analyze`
* **Request**:
  ```json
  {
    "image_base64": "data:image/jpeg;base64,..."
  }
  ```
  *(Note: Missing or whitespace-only `image_base64` strictly returns HTTP 400)*
* **Response**:
  ```json
  {
    "status": "success",
    "task_id": "string",
    "score_info": {
      "skin_age": 28,
      "all": { "score": 84 },
      "oiliness": { "ui_score": 68 },
      "pore": { "ui_score": 90 },
      "dark_circle_v2": { "ui_score": 77 },
      "moisture": { "ui_score": 79 },
      "redness": { "ui_score": 86 }
    },
    "masks": {
      "oiliness_output.png": "data:image/png;base64,...",
      "dark_circle_v2_output.png": "data:image/png;base64,..."
    }
  }
  ```

### 2.2 POST `/api/prescribe`
* **Request**:
  ```json
  {
    "skin_metrics": { "skin_age": 28, "overall_score": 84, "oiliness": 68, "dark_circle": 77 },
    "wearable_data": { "sleep_hours": 5.0, "deep_sleep_min": 45, "uv_exposure_hours": 2.5, "water_intake_ml": 900, "stress_level": "Moderate" }
  }
  ```
* **Response (Rule-Based Schema)**:
  ```json
  {
    "source": "rule_based_ingredient_engine",
    "assessment_status": "targeted_concerns",
    "disclaimer": "This analysis is for general skincare wellness education and is not a medical diagnosis.",
    "headline": "Targeted skincare guidance for identified concerns with 5.0h sleep habits",
    "root_causes": [
      "Observed visual metrics indicate targeted areas for topical barrier support.",
      "Daily hydration (900ml) and UV exposure (2.5h) support topical barrier protection."
    ],
    "routine": {
      "morning": "Cleanse gently with a mild cleanser, apply targeted formula to areas of concern, and finish with broad-spectrum sunscreen.",
      "evening": "Wash thoroughly, replenish the skin moisture barrier with a light nighttime moisturizer, and rest.",
      "lifestyle": "Increase daily water intake toward 2,000ml and prioritize consistent recovery sleep."
    },
    "recommendations": [
      {
        "tag": "T-Zone Sebum & Pores",
        "product_name": "Skin Perfecting 2% BHA Liquid Exfoliant",
        "brand": "Paula's Choice",
        "active_ingredients": "Salicylic Acid (BHA 2%), Green Tea Extract",
        "purpose": "Clears clogged T-zone pores and balances sebum levels",
        "buy_url": "https://www.google.com/search?q=Paulas+Choice+2+BHA+Liquid+Exfoliant"
      }
    ]
  }
  ```
  *(Note: When all visual skin scores are within healthy thresholds, `assessment_status` is `optimal_balance` and `recommendations` is honestly returned as an empty array `[]`)*

## 3. Security & Robustness Engineering
* **Credential Isolation**: All vendor API credentials (`YOUCAM_API_KEY`) are strictly managed via environment variables or backend configuration files. Zero secret tokens are exposed to the client.
* **Privacy by In-Memory Result Handling**: Result ZIP files are parsed directly in system memory. Temporary facial input images written to disk during cropping use UUID filenames and deletion is attempted immediately in a logged `finally` block upon pipeline completion or error.
* **Network & Host Isolation**: Local backend binds strictly to `127.0.0.1:8000` with CORS restricted to local origins (`http://127.0.0.1:8000`, `http://localhost:8000`) to prevent unauthorized cross-origin proxy relay across external websites.
* **Deterministic Suggestions over LLM Hallucination**: Product and ingredient guidance is mapped using threshold heuristics from established skincare ingredients, completely eliminating generative hallucinations, fake match percentages, and arbitrary efficacy metrics.
* **Honest Null-State Handling**: If a skin score cannot be computed by the vision model, the frontend displays `--` rather than substituting simulated fallback scores.
* **Non-Medical Boundary**: All outputs include explicit wellness disclaimers adhering to general digital wellness guidelines.
