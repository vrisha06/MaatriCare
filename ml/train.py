"""Train the maternal risk model on synthetic data and export it for the JS risk engine.

The data is SYNTHETIC: a hand-written risk function over common obstetric risk
factors generates the labels. The model is a demo baseline and is not clinically
validated. Replace the generator with real, approved data before any clinical use.

Usage: python ml/train.py  ->  writes shared/model.json
"""
import json
from datetime import date
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

SEED = 42
N = 20000
OUT = Path(__file__).resolve().parent.parent / "shared" / "model.json"

# Must match featurize() in shared/features.js.
FEATURES = [
    "age_under_18", "age_over_35", "sbp", "dbp", "hb", "bmi_low", "bmi_high",
    "grand_multipara", "prev_csection", "prev_loss", "short_stature",
]


def featurize(age, sbp, dbp, hb, height_cm, weight_kg, parity, prev_csection, prev_loss):
    bmi = weight_kg / (height_cm / 100) ** 2
    return np.column_stack([
        age < 18, age > 35, sbp, dbp, hb, bmi < 18.5, bmi >= 30,
        parity >= 4, prev_csection, prev_loss, height_cm < 145,
    ]).astype(float)


def synthesize(rng, n):
    age = np.clip(rng.normal(24, 4.5, n), 15, 45)
    sbp = np.clip(rng.normal(114, 15, n), 85, 190)
    dbp = np.clip(sbp * 0.62 + rng.normal(0, 7, n), 50, 125)
    hb = np.clip(rng.normal(10.6, 1.7, n), 4, 15)
    height = np.clip(rng.normal(152, 6, n), 135, 175)
    weight = np.clip(rng.normal(52, 9, n), 32, 110)
    parity = rng.poisson(1.3, n)
    prev_cs = (parity > 0) & (rng.random(n) < 0.12)
    prev_loss = rng.random(n) < 0.10

    x = featurize(age, sbp, dbp, hb, height, weight, parity, prev_cs, prev_loss)
    bmi = weight / (height / 100) ** 2
    logit = (
        -3.4
        + 1.2 * (age < 18) + 1.0 * (age > 35)
        + 0.07 * np.maximum(sbp - 120, 0) + 0.09 * np.maximum(dbp - 80, 0)
        + 0.65 * np.maximum(10 - hb, 0)
        + 0.6 * (bmi < 18.5) + 0.7 * (bmi >= 30)
        + 0.8 * (parity >= 4) + 1.0 * prev_cs + 1.1 * prev_loss + 0.7 * (height < 145)
    )
    y = rng.random(n) < 1 / (1 + np.exp(-logit))
    return x, y.astype(int)


def main():
    rng = np.random.default_rng(SEED)
    x, y = synthesize(rng, N)
    x_tr, x_te, y_tr, y_te = train_test_split(x, y, test_size=0.25, random_state=SEED, stratify=y)

    scaler = StandardScaler().fit(x_tr)
    model = LogisticRegression(max_iter=1000).fit(scaler.transform(x_tr), y_tr)
    p = model.predict_proba(scaler.transform(x_te))[:, 1]

    # "Moderate" threshold = lowest score that still flags 85% of true high-risk cases.
    moderate = float(np.quantile(p[y_te == 1], 0.15))
    high = 0.5
    flagged = p >= moderate
    metrics = {
        "auc": round(float(roc_auc_score(y_te, p)), 3),
        "sensitivity": round(float(flagged[y_te == 1].mean()), 3),
        "false_positive_rate": round(float(flagged[y_te == 0].mean()), 3),
        "n_train": int(len(y_tr)),
        "n_test": int(len(y_te)),
        "prevalence": round(float(y.mean()), 3),
    }

    OUT.write_text(json.dumps({
        "version": f"maternal-lr-{date.today().isoformat()}",
        "synthetic": True,
        "features": FEATURES,
        "mean": scaler.mean_.round(6).tolist(),
        "scale": scaler.scale_.round(6).tolist(),
        "coef": model.coef_[0].round(6).tolist(),
        "intercept": round(float(model.intercept_[0]), 6),
        "thresholds": {"moderate": round(moderate, 4), "high": high},
        "metrics": metrics,
    }, indent=2) + "\n")
    print(f"wrote {OUT}")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
