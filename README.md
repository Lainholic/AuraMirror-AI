# 🪞 AuraMirror AI: Smart Mirror & Wearable-Driven Skincare Agent

> **An interactive proof-of-concept combining webcam-based YouCam skin analysis, simulated wearable lifelog inputs, rule-based dermatological ingredient suggestions, and international retail exploration via Google Search.**

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![YouCam Skin AI](https://img.shields.io/badge/YouCam-Skin%20AI%20API-ff69b4.svg)](https://yce.perfectcorp.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 The Vision & Problem

When people stand in front of a bathroom mirror or open their laptop camera in the morning, they often wonder:
* *"Why does my skin look so tired and oily today?"*
* *"What active ingredients should I explore for my specific concern right now?"*
* *"Which real-world skincare products contain these ingredients?"*

Current skin apps operate as **surface-level wrappers**: they display arbitrary scores without explaining how visual skin scores relate to daily recovery (sleep deprivation, outdoor UV exposure, hydration), or they generate unverified percentage claims.

**AuraMirror AI** transforms a laptop webcam or smart mirror display into a **camera-based skincare wellness prototype**:
1. **Webcam Vision Capture**: Captures front-facing facial frame via WebRTC with an intuitive face alignment guide, readiness verification, and clean state reset.
2. **Real-World YouCam Skin AI Integration**: End-to-end cloud pipeline calling YouCam's official REST API to extract visual scores (Oiliness, Pores, Dark Circles, Moisture, Redness, Wrinkles, Texture, Acne) and segmentation masks.
3. **Simulated Wearable Lifelog Fusion**: Users can adjust lifestyle telemetry (sleep duration, deep sleep, outdoor UV exposure, hydration, stress) to contextualize daily skincare routines.
4. **Rule-Based Dermatological Ingredient Suggestions**: Links detected visual scores directly to recognized active ingredients (Salicylic Acid, Niacinamide, Caffeine, Hyaluronic Acid, Centella Asiatica) with **zero LLM hallucination** and **zero arbitrary match percentages**. When all evaluable scores meet rule thresholds, no products are pushed.
5. **Global Retail Exploration**: Directly links identified active ingredients with global Google Search results for international product exploration.

---

## 🏗️ Architecture

```
[Vision Input Tier]
 └── 💻 Laptop / Desktop WebCam (WebRTC with Oval Guide & ReadyState Check)
           │ (Captured JPEG Binary)
           ▼
[FastAPI Backend Engine] ─── (server.py on 127.0.0.1:8000)
 ├── 1. AWS S3 Binary Stream Upload Slot (UUID-Isolated Temp Image)
 ├── 2. YouCam Skin Analysis REST API (/s2s/v2.0/task/skin-analysis)
 ├── 3. In-Memory ZIP Decompression (BytesIO - Result Archives Processed In-Memory)
 └── 4. Immediate Temp Face Image File Cleanup Attempted (Logged `finally` block)
           │
           ▼
[Rule-Based Ingredient Suggestions Engine]
 ├── Evaluates Visual Skin Scores against Heuristic Thresholds (<75 or <80)
 ├── Deterministic Rule Mapping (Paula's Choice BHA, The Ordinary Caffeine, Torriden Hyaluronic)
 └── Zero LLM Hallucination / Honest Empty State on Optimal Balance
           │
           ▼
[Global Retail Discovery Pipeline]
 └── International Google Search Exploration Links (HTTPS)
```

---

## 🚀 Key Features

* **Real-time Glassmorphism Smart Mirror HUD**: Ambient glow, digital clock, date, weather simulation, and honest score indicators (`--` for unmeasured).
* **Interactive AI Mask Overlay Canvas**: Toggle transparent, colored visual masks directly over your face to inspect problem zones (T-zone sebum, periorbital fatigue, pore clusters) with race-condition render protection.
* **Wearable Sync Simulator**: Adjust sleep, deep sleep, UV hours, and hydration sliders to observe how wellness suggestions adapt dynamically upon subsequent scans.
* **Per-Scan Clean State Reset**: Every scan cleanly resets previous scores, masks, products, and status badges, ensuring no stale data carryover upon network failure.
* **Rule-Based Ingredient Cards**: Rich product cards displaying representative active ingredients, skincare purpose, and direct global Google search links. Honest empty state when all evaluated scores meet thresholds.
* **Privacy & Network Security**: Zero client-side API key exposure, no synthetic sample replacement on camera failure, in-memory ZIP extraction, attempted deletion of temporary facial input images in logged finally block, and localhost CORS restriction.

---

## 🛠️ Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/Lainholic/AuraMirror-AI.git
cd AuraMirror-AI
```

### 2. Install dependencies
```bash
pip install fastapi uvicorn requests pillow pydantic
```

### 3. Configure API Credentials
Set your YouCam API key as an environment variable:
```bash
# Windows PowerShell
$env:YOUCAM_API_KEY="your_youcam_api_key_here"

# Linux / macOS
export YOUCAM_API_KEY="your_youcam_api_key_here"
```

### 4. Run the Server
```bash
python server.py
```
Open **`http://127.0.0.1:8000`** in any modern web browser (Brave, Chrome, Edge).

---

## ⚖️ Disclaimer
AuraMirror AI is an interactive wellness prototype and educational proof-of-concept developed for hackathon demonstration. It does not provide medical diagnosis, clinical dermatological treatment, physiological disease attribution, or professional medical advice.

## 👥 Built With AI
Developed and engineered with **Google Antigravity Agent (Annie)** using iterative pair programming, automated REST pipeline verification, and adversarial cross-validation.

## 📄 License
MIT License.
