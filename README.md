# Team-10
# Team name: Cherubim
# Team members:
1. Arya Shetty
2. Haarshita Mahapatra
3. Pradyumna Jadhav

# 🚨 UrbanTriage
- Predictive Waste Mapping and Secure Clearance Verification System
- An AI-verified, closed-loop platform enabling corporations to transparently fund, track, and prove the true community impact of their ESG and CSR investments.
- Built for Argonyx '26 under the theme Intelligent Threat Detection and Situational Awareness System (Aligned with UN SDG 11 – Sustainable Cities and Communities).

# 🌍 The Problem
Unmanaged urban waste and illegal dumping "black spots" are critical urban threats affecting public health, safety, and environmental sustainability. Traditional grievance platforms are purely reactive, easily manipulated, and lack the verifiable audit trails required by corporations to confidently deploy CSR (Corporate Social Responsibility) funding for cleanups.

# 💡 The Solution
- UrbanTriage is an intelligence and verification layer, not just a garbage classification app. It transforms raw citizen reports and CCTV feeds into verified situational awareness.
- We distinguish between a single littered bottle (normal waste) and a severe illegal dumping threat (accumulation zone) using a custom AI vision pipeline. Once a threat is mapped, volunteers can clean it, and our AI-assisted clearance loop verifies the resolution, generating auditable proof of impact for municipal authorities and corporate sponsors.

# ✨ Key Features (Hackathon MVP)
- Intelligent Threat Scoring: Uses YOLO11 object detection to count waste items and calculate accumulation density. 3+ items or >40% image area coverage triggers a "Severe Accumulation Zone" threat.
- Passive & Active Surveillance Modes: Accepts user-uploaded geo-tagged photos (Passive) or interfaces with live secure camera feeds (Active).
- Situational Awareness Dashboard: Real-time translation of JSON threat payloads into dynamic heatmap markers (Red = Active Threat, Green = Verified Cleared).
- AI Clearance Verification: Multi-stage evidence verification (Before vs. After photos) backed by Gemini 3.5 Flash-Lite to prevent fraud and ensure actual cleanup.
- Corporate CSR Integration: A ready-made ESG compliance portal allowing private corporations to sponsor hotspots and receive tamper-proof, AI-verified certificates of impact.

# 🛠️ Technical Architecture
Tech Stack
- Frontend: Next.js 14 App Router, React, HTML5 Geolocation API, Browser Local Storage.
- Backend API: Python Flask (server.py), Next.js API Proxy (/api/analyze), EXIF GPS Parser.
- Computer Vision: Ultralytics YOLO11n (Alope Trash Detection Weights), OpenCV, Custom Area-Filtering Algorithms.
- Context Engine: Gemini 3.5 Flash-Lite & Custom Decision Engine (Threat Validation & Veto Logic).

System Workflow
- Data Ingestion: User uploads an image via the Next.js UI. Form data & EXIF metadata are extracted by the Flask Server.
- AI Vision Processing: Image is passed to the YOLO11 model. Bounding boxes are generated, and background noise is aggressively filtered based on total image area ratios.
- Context & Validation: Raw pixels and filtered detections are analyzed. The Decision Engine applies threat logic (accumulation vs. singular waste).
- Payload Synthesis: The system generates a synthesized JSON payload with an authenticity flag, confidence scores, bounding boxes, and coordinates.
- Situational Awareness: The annotated image URL and map markers are synced to the frontend state, updating the dashboard in real-time.

# 💼 Business Model (Monetization)
- We do not monetize the waste itself; we monetize verifiable data.
- B2B Enterprise SaaS: Tech parks and SEZs pay a subscription to integrate our API with their security cameras for automated perimeter dumping alerts, ensuring compliance with SEBI BRSR guidelines.
- B2B CSR Verification: Corporations sponsor "Red Hotspots" to meet Section 135 CSR mandates. UrbanTriage acts as the verification layer, charging a platform fee to provide audit-ready proof that their funds cleared physical urban threats.
- B2C Gamification (Zero-Cash): Volunteers earn "Urban Points" for AI-verified cleanups, subsidized by corporate sponsors and redeemable for local utility benefits.
