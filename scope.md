# Project Scope: AuraMirror AI

## 1. Problem Statement
Traditional skincare software operates as isolated, surface-level wrappers that present static numbers without contextualizing daily lifestyle factors behind skin fluctuations. Users standing in front of mirrors each morning lack an actionable, unified system that analyzes their current facial skin scores alongside daily recovery context to deliver targeted ingredient guidance.

## 2. In-Scope: Phase 1 — Web MVP (Current Release)
* **Browser Webcam Vision Capture**: Live WebRTC video stream with interactive oval facial alignment guide, readiness state detection (`readyState >= 2`), and per-scan clean reset of scores, masks, and status badges.
* **YouCam Skin AI REST Integration**: Cloud-based skin analysis requesting 9 standard action types (redness, oiliness, pore, acne, moisture, texture, wrinkle, age_spot, dark_circle_v2) and extracting transparent visual segmentation mask overlays.
* **In-Memory Artifact Extraction & Privacy Cleanup**: Response ZIP archives are processed directly in system memory (BytesIO), avoiding disk retention of result folders. Temporary input files use UUID isolation and deletion is attempted immediately in a logged `finally` block upon completion or error.
* **User Lifestyle Simulation Layer**: Interactive simulation sliders for sleep duration, deep sleep, outdoor UV exposure, water intake, and perceived stress, applied to subsequent coaching requests.
* **Rule-Based Dermatological Ingredient Suggestions**: Deterministic rule-based suggestions linking detected visual skin scores directly to recognized active ingredients (Paula's Choice 2% BHA, The Ordinary 5% Caffeine, Torriden 5D Hyaluronic Acid, SKIN1004 Centella) with zero LLM hallucination and zero arbitrary matching percentages. When all evaluable visual scores meet rule thresholds, the system honestly recommends maintaining current care with zero push for unnecessary products.
* **Honest Error Handling**: Strict HTTP 400/500/502/504 errors on failure with zero synthetic fallback deception.
* **Origin & Binding Security**: Server binds to local loopback (`127.0.0.1:8000`) with CORS strictly limited to local origins (`http://127.0.0.1:8000`, `http://localhost:8000`).
* **Global Ingredient Discovery**: Active ingredient suggestions paired with global Google Search exploration links.

## 3. In-Scope: Phase 2 — Android Native Prototype (Roadmap)
* **Native Android Camera Capture**: Kotlin/CameraX high-precision facial capture with offline lifecycle management and secure backend proxy calls.
* **Health Connect API Read Integration**: User-permissioned reading of supported sleep sessions and hydration logs directly from Android Health Connect.
* **Explicit Data Provenance**: Transparent UI labeling of timestamps, source devices, and honest representation of missing/unrecorded metrics.
* **Privacy & Architecture**: YouCam API secrets maintained strictly on the backend proxy server; zero storage of sensitive biometric images on mobile device.

## 4. Out-of-Scope (All Phases)
* Medical diagnosis, clinical prescription, physiological disease attribution, or therapeutic efficacy claims (strictly general skincare wellness).
* Physical IoT bathroom smart mirror hardware manufacturing.
* Direct in-app payment gateway processing or checkout handling (delegated to external retail search).
* Artificial hallucination of unmeasured biometric sensors or inferred UV/stress diagnostics.

## 5. Target Audience
* Individuals seeking objective daily skincare feedback tailored to their sleep and lifestyle context.
* Digital wellness enthusiasts and developers exploring multimodal computer vision and deterministic rule-mapping pipelines.

## 6. Success Criteria
* End-to-end user loop completed reliably with clear step-by-step progress feedback and complete state reset upon re-scan.
* Zero unhandled frontend exceptions on corrupted or missing facial inputs (strict HTTP 400 validation).
* 100% adherence to open-source safety, non-medical positioning, and clean architecture standards.
