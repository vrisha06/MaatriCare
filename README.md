# MaatriCare+

Early maternal risk detection and referral tracking for rural public health (SIH 2026, PS 26133).
See `MaatriCare PRD.pdf` for the full product requirements.

## What's built (hackathon demo scope)

- **ASHA view** (mobile-first, works offline): register pregnant women, record vitals and danger signs,
  see an on-device risk score with reasons, and sync later. Records queue in the browser until
  the server is reachable.
- **Risk engine** (`shared/`): deterministic danger-sign and BP/Hb rules plus a logistic-regression
  model. Rules can only raise risk. The same code scores on the device and on the server.
- **Doctor view**: risk-ranked worklist, confirm/override with a reason, create referrals and move
  them through Created → Accepted → In transit → Arrived → Outcome recorded → Closed.
- **Admin view**: village risk heatmap, referral completion, overdue referrals, audit-chain check.
- **Audit log**: every clinical action is written to an append-only, SHA-256 hash-chained log.
- **Health guide chatbot** (`/chat`, no login; also in the ASHA menu): Hindi and English, understands
  Hinglish, read-aloud and voice input where the browser supports them. Answers are fixed, reviewed
  text, and any danger-sign word always gets the "call 108" answer. Runs on the device, so it works offline.

> The model is trained on **synthetic data** (`ml/train.py`) and is not clinically validated.
> It is decision support only.

## Run it

Requires Node 22.5+ (uses the built-in `node:sqlite`) and, only for retraining, Python 3.10+ with
`pip install -r ml/requirements.txt`.

```bash
npm install
npm run seed      # creates server/data/maatricare.db with demo data
npm run dev       # API on :4000, web app on http://localhost:5173
```

Or as a single process: `npm run build && npm start`, then open http://localhost:4000.

Demo logins (password `demo123`): `asha.sunita`, `asha.meena`, `asha.rekha`, `asha.geeta`
(ASHAs), `dr.anil` (Kheri PHC), `dr.kavita` (Sitapur District Hospital), `admin`.

Other commands: `npm test` (risk engine + API tests), `npm run train` (retrain → `shared/model.json`).

## Layout

```
shared/   risk engine, model.json, validation — used by server and web
server/   Express API, SQLite schema, auth, audit chain, seed, tests
web/      React (Vite) app for ASHA, doctor and admin roles
ml/       synthetic data generator and model training
```

## Not built yet

IVR for feature phones, more regional languages, teleconsultation, 108 EMS and SMS integration, ABDM/FHIR server, child and
chronic risk models, blockchain anchoring, lab-slot and medicine-stock visibility.
