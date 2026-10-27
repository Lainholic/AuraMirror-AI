# Product Requirements Document (PRD): AuraMirror AI

## 1. Product Overview
AuraMirror AI is an interactive smart mirror vision assistant that combines computer vision, user lifestyle simulation, and rule-based dermatological ingredient suggestions to deliver daily skincare wellness coaching and global ingredient-oriented product discovery.

## 2. Product Roadmap & Phasing
* **Phase 1 — Web MVP (Current Milestone)**: Browser-based webcam video capture, cloud skin analysis, in-memory ZIP extraction, lifestyle simulation controls, rule-based active ingredient suggestions, and local origin protection.
* **Phase 2 — Android Native Prototype (Upcoming Milestone)**: Kotlin native app with CameraX, Android Health Connect reading for sleep and hydration, and backend proxy token security.

## 3. User Personas
* **Persona A (Active Professional, 28-40)**: Experiences fluctuating skin conditions due to irregular sleep schedules and screen fatigue. Needs quick, daily clarity on how their sleep and hydration relate to skin oiliness and hydration, and what specific active ingredients will support their skin barrier today.
* **Persona B (Skincare Novice)**: Overwhelmed by thousands of commercial skincare products. Needs an honest, objective mirror terminal that identifies visible areas of concern and suggests representative active ingredients with zero marketing jargon or fake match percentages.

## 4. User Journey & Core Flow
1. **Camera Framing**: User opens the web terminal; the front camera activates with a centering oval guide and readiness detection (`readyState >= 2`).
2. **One-Click Vision Scan**: User triggers the scan; all previous scores, masks, recommendations, and status badges are cleanly reset. The live webcam frame is captured, resized, and sent to the cloud skin AI pipeline.
3. **Lifestyle Input Adjustment**: User reviews or tweaks their recent sleep hours, deep sleep duration, outdoor UV exposure, water intake, and perceived stress. Adjustments are dynamically applied to coaching requests upon scan.
4. **Score & Mask Visualization**: The terminal renders camera-based skin scores and allows toggling visual masks (T-Zone Sebum, Periorbital Dark Circles, Pores, Redness) directly on the face with race-condition render protection.
5. **Rule-Based Skincare Coaching & Ingredients**: The terminal delivers an immediate headline summary, lifestyle correlation points, morning/evening/lifestyle skincare tips, and curated active ingredient cards linked to global search. When all evaluable scores meet rule thresholds (`optimal_balance`), no products are pushed.

## 5. Functional Requirements

### FR-1: Vision Sensor & Capture (Phase 1)
* **FR-1.1**: The system must access the user's front-facing camera via standard WebRTC `navigator.mediaDevices.getUserMedia` with readiness state verification (`readyState >= 2`).
* **FR-1.2**: An oval alignment overlay must guide the user to center their face within 600x600 square framing.
* **FR-1.3**: Missing or blank video capture must immediately fail with an honest HTTP 400 error without fallback to synthetic sample images.
* **FR-1.4**: Triggering a new scan must immediately reset all existing scores, masks, products, routines, and engine badges to prevent stale result retention upon scan failure.

### FR-2: Cloud Skin AI Pipeline
* **FR-2.1**: The backend must upload captured frames to secure cloud storage via authenticated pre-signed URL using UUID-isolated temporary filenames.
* **FR-2.2**: The backend must trigger YouCam Skin Analysis REST API and poll synchronously until completion (1.5s interval, max 25 retries).
* **FR-2.3**: The backend must process score metrics and PNG visual masks in-memory from the ZIP archive (BytesIO), avoiding disk retention of result folders.
* **FR-2.4**: Deletion of any temporary facial image created on disk during initial crop must be attempted immediately upon completion or failure in a logged `finally` block.

### FR-3: Interactive Mask Canvas
* **FR-3.1**: The frontend must render transparent, color-coded visual masks for Oiliness (T-Zone), Dark Circles, Pores, and Redness on demand.
* **FR-3.2**: Mask switching must be instantaneous. Asynchronous image loads must use a render token to prevent race condition drawing if a mask is deselected or cleared.

### FR-4: Rule-Based Skincare Coaching
* **FR-4.1**: The system cross-references visual skin scores with lifestyle simulation inputs.
* **FR-4.2**: Skincare recommendations are mapped using a rule-based table of recognized dermatological ingredients (Salicylic Acid, Niacinamide, Caffeine, Hyaluronic Acid, Centella) to avoid generative text hallucinations, unverified efficacy claims, and arbitrary percentage scores.
* **FR-4.3**: When all evaluable skin scores meet rule thresholds (`optimal_balance`), the system displays a positive maintenance message and recommends zero unnecessary products.
* **FR-4.4**: Network or API failures return honest HTTP 400/500/502/504 errors with zero synthetic fallback deception.

### FR-5: Global Ingredient & Commerce Discovery
* **FR-5.1**: Each recommendation highlights representative active ingredients with functional badges. No artificial matching percentages or unverified efficacy claims are permitted.
* **FR-5.2**: Product cards provide sanitized `https://` global Google Search links for international retail exploration.

## 6. Non-Functional Requirements
* **Security & Binding**: Server binds strictly to local loopback (`127.0.0.1:8000`) with CORS restricted to local origins. API keys must reside exclusively on the server (`.env` or local secrets). Frontend rendering must use strict DOM text assignment (`textContent`) to prevent DOM-XSS.
* **Resilience**: Missing or invalid metric scores must render gracefully (`--` and `0%`) rather than faking arbitrary default scores.
* **Compliance**: UI and documentation must prominently display non-medical wellness disclaimers.
