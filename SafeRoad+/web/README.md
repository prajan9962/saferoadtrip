# SafeRoad+ Web Application Dashboard

The mission control web interface for SafeRoad+, built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, **MapLibre GL JS**, and **Firebase Authentication**.

---

## 💻 Web Modules

1. **Mission Control Map (`SafeRoadMapScreen.tsx`)**:
   - High-performance OpenStreetMap vector and raster tiles rendered via MapLibre GL.
   - Dynamic Convoy Safe Bubble polygon overlay.
   - Real-time location marker tracking for Leader, Members, and SOS beacons.
2. **Dynamic Safe Bubble Monitor (`SafeBubbleMonitor.tsx`)**:
   - Convoy radius tuning (100m - 5000m).
   - Real-time straggler warnings & sound alert triggers.
   - GPS telemetry simulator suite.
3. **Emergency Dispatch & SOS Command (`LeaderSosCommand.tsx`, `SosEmergencyModal.tsx`)**:
   - Authority escalation dispatch.
   - Incident timeline & resolved status archiving.
4. **AI Safety Copilot (`AiSafetyGuideView.tsx`)**:
   - Powered by Gemini 2.5 for live convoy recommendations, rest stop scheduling, and weather risk guidance.
5. **Authority Incident Portal (`AuthorityDashboard.tsx`)**:
   - Police (112), Medical (108), and Disaster (NDRF 1070) dispatch tracking.

---

## 🚀 Running the Web App

```bash
# 1. Install dependencies
npm install

# 2. Run Vite dev server
npm run dev

# 3. Build production bundle
npm run build
```
