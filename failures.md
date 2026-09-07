# RONIN Engineering Failures & Lessons

> A transparent record of the problems, incorrect assumptions, implementation mistakes, and validation failures encountered while building RONIN. This document is intentionally kept as part of the project history rather than hiding failed approaches.

## Purpose

RONIN is a predictive, point-in-time, Solana-focused market intelligence system. Its development involved repeated corrections across data engineering, temporal validation, feature engineering, model evaluation, execution analysis, and live-system integration.

This file documents what went wrong, how it was discovered, what was changed, and what the failure taught us.

The failures below are engineering and research findings. They are not evidence that the final system is profitable or that future predictions are guaranteed to be correct.

---

## 1. Initial Historical Pipeline / Point-in-Time Risk

### Problem

The first versions of the historical research pipeline did not have sufficiently explicit point-in-time guarantees across every feature source.

The major risk was allowing information that was only known after a prediction decision time to influence a feature.

### Why it mattered

A predictive model can appear extremely strong if future information accidentally leaks into its inputs. Such a model is not predictive in live operation because the same information would not be available at decision time.

### Resolution

RONIN's historical dataset was rebuilt around explicit decision timestamps and completed snapshot buckets.

For a decision at time `T`, only information satisfying the point-in-time rules is permitted. Partial/future buckets are excluded.

Wallet features were also rebuilt directly from historical trades constrained by:

`event_time <= decision_time`

rather than treating the later-aggregated wallet statistics table as a direct PIT-safe feature source.

### Validation

The PIT validation pipeline reported:

- 2,500 PIT sample rows
- 2,500 distinct PIT keys
- 0 leakage violations
- 0 bucket-count mismatches

The full temporal split validation also reported zero exact PIT-key overlap between train, validation, and test.

### Lesson

**Point-in-time correctness must be designed into the data pipeline, not assumed after the model is trained.**

---

## 2. Wallet Statistics Were Not Safe as Direct PIT Features

### Problem

`wallet_stats.parquet` contains aggregate wallet history, but its aggregate state is not automatically valid for every historical prediction timestamp.

Using it directly could expose information accumulated after a decision time.

### Resolution

RONIN stopped treating the table as a direct PIT feature source.

Wallet behavior was reconstructed from the underlying historical trades using each prediction's decision timestamp.

### Result

The token-specific PIT wallet feature builder produced one feature row for every PIT sample row, with zero temporal violations and zero reconstruction mismatches.

### Lesson

**An aggregate table is not automatically a point-in-time table. Provenance and temporal semantics matter.**

---

## 3. Historical Labeling Bugs

### Problems

The first versions of the forward-labeling pipeline contained incorrect or insufficiently explicit handling around:

- decision-price semantics
- future snapshot selection
- MFE calculation
- MAE calculation
- future-only filtering

### Resolution

The label builder was corrected so that:

- decision price uses the latest completed price available at decision time
- forward return uses a future `price_close`
- MFE uses the future `price_high`
- MAE uses the future `price_low`
- future rows must occur after the decision time and within the selected horizon

The research threshold remained a historical label definition of `+0.5%`, not a promised trading target.

### Validation

The label validator confirmed:

- no invalid-price label violations
- zero MFE/MAE ordering violations
- zero threshold violations
- zero impossible-return violations
- forward labels are future-only

### Lesson

**A label is part of the scientific experiment. A small timestamp or price-definition mistake can invalidate an otherwise sophisticated model.**

---

## 4. MAE Query / Calculation Error

### Problem

The MAE calculation contained a query issue in an earlier implementation.

### Resolution

The query was corrected and the full label dataset was regenerated.

### Validation

The resulting MFE/MAE labels passed the dedicated validation checks, including ordering and future-only constraints.

### Lesson

**Derived risk metrics need independent validation, not just successful execution.**

---

## 5. Partial Snapshot Buckets

### Problem

The snapshot data uses 60-second buckets. A decision occurring inside a bucket creates a dangerous ambiguity: the bucket may contain activity that happened after the decision timestamp.

Using the entire bucket would leak future information.

### Resolution

RONIN only uses completed buckets where the bucket end timestamp is less than or equal to the decision time.

The live feature builder implements the same rule.

### Validation

The PIT validator explicitly tested future-bucket exclusion and reported zero temporal leakage violations.

### Lesson

**Bucketed data requires explicit treatment of partial intervals.**

---

## 6. Full-Corpus Path Error

### Problem

An early full-corpus PIT build referenced the wrong snapshot path.

The actual source was:

`C:\ronin-data\pumpfun\snapshots.parquet`

rather than the initially assumed location.

### Resolution

The builder was corrected to use the actual PumpFun corpus path.

### Result

The full PIT dataset was successfully built with:

- 26,934,864 snapshot rows processed
- 769,082 distinct tokens
- 3,845,410 PIT rows
- 3,845,410 distinct PIT keys
- 0 duplicate PIT keys

### Lesson

**Never infer a production/research file path when the actual data layout can be inspected directly.**

---

## 7. Missing Market-Size Inputs in the Full PIT Feature Pipeline

### Problem

The first full-corpus PIT build did not preserve all market-size/trade-size fields required by the 37-feature implementation.

Missing fields included:

- `avg_trade_sol`
- `median_trade_sol`
- `largest_buy_sol`
- `largest_sell_sol`

### Resolution

The full PIT builder was repaired to carry the required fields through the pipeline.

The dataset was rebuilt and verified without changing the row/key counts.

### Lesson

**A dataset can be structurally complete while still being semantically incomplete for the downstream feature contract.**

---

## 8. Out-of-Range Source Curve Value

### Problem

Two sample rows contained `latest_curve_pct_eob` values above 100, including approximately `108.56`.

The feature builder initially assumed the source field must always be bounded from 0 to 100 and therefore failed on the unexpected value.

### Resolution

The source value was preserved rather than silently clamped or fabricated.

The feature builder was changed so it does not impose an unsupported 0–100 assumption on the raw source field.

### Lesson

**Do not silently rewrite source data merely to satisfy an assumption in downstream code. Investigate the semantic contract first.**

---

## 9. Initial Logistic Model Was Not the Final Model

### Problem

The first baseline model was a logistic regression. It established a useful baseline but was not sufficiently expressive for the nonlinear relationships present in the data.

The first implementation also produced convergence warnings at the original iteration limit.

### Resolution

The baseline was improved with preprocessing and class balancing, and the model was evaluated against a nonlinear baseline.

The nonlinear approach produced materially stronger validation ranking performance.

### Lesson

**A baseline is supposed to be beaten. Its job is to establish a reference point, not to become the production model simply because it works.**

---

## 10. Raw Model Scores Were Mistaken for Probabilities

### Problem

The raw model outputs had ranking value but were not calibrated probabilities.

Their average magnitude was far above the actual event rate.

### Resolution

Temporal calibration was introduced using the validation period.

Calibration substantially improved Brier score while preserving ranking performance.

### Lesson

**A score that ranks opportunities well is not automatically a probability. Probability claims require calibration.**

---

## 11. `curve_progress_ratio` Looked Useful but Was Harmful

### Problem

`curve_progress_ratio` was initially included among the engineered features because it appeared intuitively relevant to token lifecycle behavior.

Validation ablation showed the opposite: removing it improved performance.

### Evidence

Removing the curve feature improved validation performance approximately from:

- 300s AUC: `0.8426 → 0.8608`
- 300s AP: `0.340 → 0.384`
- 300s top-5 lift: `6.60x → 7.58x`

and:

- 900s AUC: `0.8326 → 0.8512`
- 900s AP: `0.340 → 0.385`
- 900s top-5 lift: `6.31x → 7.29x`

Bootstrap testing over 1,000 paired resamples supported the improvement.

### Resolution

`curve_progress_ratio` was removed from the final candidate set.

The final frozen feature set contains **36 features**.

### Lesson

**Intuition does not outrank evidence. A feature that sounds meaningful can actively hurt generalization.**

---

## 12. Regime Instability

### Problem

The relationship between curve state and the target changed dramatically between the training and validation periods.

Observed event rates by curve region shifted substantially, and the overall validation event rate was much higher than the training event rate.

### Why it mattered

A feature can be predictive inside one historical regime while becoming misleading after the market distribution changes.

### Resolution

The unstable curve feature was removed from the frozen candidate set.

Regime analysis was also performed to identify where the model's ranking performance degraded.

### Lesson

**Non-stationarity is a first-class problem in market prediction. Historical relationships are not laws of nature.**

---

## 13. Low-Activity / Low-Information Regimes Performed Poorly

### Finding

Regime analysis showed substantially weaker model discrimination in some low-information conditions.

Examples included approximately:

- low activity AUC: `0.571`
- low concentration AUC: `0.612`
- low volatility AUC: `0.614`
- low volume/trade AUC: `0.635`

Higher-activity/late-life-cycle regimes performed materially better, with some AUC values around `0.89–0.91`.

### Resolution

The system incorporates abstention/quality gating rather than forcing a prediction when evidence quality is poor.

A frozen abstention analysis showed that filtering low-activity candidates improved ranking metrics.

### Lesson

**A predictive system needs the ability to say “I don't have enough information.”**

---

## 14. Validation Performance Was Not Enough

### Problem

The validation results were promising enough to create a temptation to declare the model successful before true out-of-sample testing.

### Resolution

The model/feature configuration was frozen before the locked test evaluation.

The test set was evaluated once and then treated as locked.

### Locked OOS Results

300s:

- ROC-AUC: `0.8541`
- AP: `0.4232`
- top-1% hit rate: `63.70%`
- top-5% hit rate: `55.02%`
- top-10% hit rate: `44.68%`

900s:

- ROC-AUC: `0.8378`
- AP: `0.4256`
- top-1% hit rate: `65.72%`
- top-5% hit rate: `57.47%`
- top-10% hit rate: `45.86%`

These are historical ranking results, not guarantees of live accuracy or profitability.

### Lesson

**The test set is for confirmation, not for endless experimentation. Once locked, leave it alone.**

---

## 15. Execution Reality Was Worse Than Statistical Performance

### Problem

Strong historical ranking metrics do not automatically translate into executable trades.

The execution-aware analysis exposed a major gap between statistical opportunity and demonstrated tradability.

### Findings

Using a conservative analytical round-trip cost assumption of approximately 7%:

- 300s top-5 median MFE: `+4.29%`, cost-adjusted approximately `-2.71%`
- 900s top-5 median MFE: `+7.24%`, cost-adjusted approximately `+0.24%`

Median MAE was also severe:

- 300s top-5 median MAE: approximately `-29.51%`
- 900s top-5 median MAE: approximately `-37.14%`

### Resolution

The project explicitly refused to claim demonstrated executable profitability.

The overall execution verdict remained **UNDETERMINED / NOT READY FOR LIVE OR PAPER MECHANICAL EXECUTION** at that evaluation stage.

### Lesson

**A model can be statistically interesting and still be economically unusable. Execution must be measured separately.**

---

## 16. MFE Mean vs Median Exposed Extreme-Tail Risk

### Problem

Mean MFE looked spectacular in some top-ranked cohorts because a small number of extreme moves heavily influenced the average.

### Finding

For the top-5 cohort, 300s mean MFE was approximately `+40.92%` while median MFE was only approximately `+4.29%`.

This large gap demonstrates that extreme winners were driving the mean.

### Resolution

Median and distribution-aware metrics were included alongside mean metrics.

### Lesson

**In heavy-tailed markets, averages can tell a dangerously flattering story. Distribution shape matters.**

---

## 17. Missing Forward Observations at Window Edges

### Problem

Some prediction rows lacked sufficient future snapshot coverage to produce complete long-horizon labels.

The full label build had approximately 979,834 null 900-second labels.

### Resolution

These rows were not silently treated as failures. The missingness was preserved and accounted for in downstream evaluation.

### Lesson

**Missing future observations are a data-availability problem, not automatically negative outcomes.**

---

## 18. Model Serialization Verification Mistakes

### Problem

During Phase K verification, a verification command accidentally attempted to parse a CSV file using `json.load()`.

The file was:

`final_oos_test_metrics.csv`

The correct parser was `csv.DictReader`.

### Result

Python correctly raised a `JSONDecodeError` before the actual model equivalence check ran.

### Resolution

The verification was rewritten as a clean script and rerun correctly.

### Final Result

The serialized model reproduced the frozen validation baseline exactly:

- 300s validation AUC: `0.860839`
- 900s validation AUC: `0.851214`
- delta: `0.000000`

### Lesson

**Verification code is itself software and can fail. A failed verification command is not evidence that the model is broken.**

---

## 19. Windows Path / Environment Mistake During Model Verification

### Problem

One verification attempt used an incorrect Windows path literal format.

### Resolution

The path was corrected and the model registry loaded successfully.

### Lesson

**Environment-specific path handling can create false negatives during otherwise correct verification.**

---

## 20. Prisma / Local Tooling Failure During Prediction Contract Work

### Problem

Phase I encountered a local Prisma CLI/runtime setup issue.

The expected Prisma engine dependencies were incomplete/broken because of interrupted or ignored package build scripts.

### Resolution

The existing Prisma 6.19.3 installation in the pnpm store was located and used.

The missing/broken engine dependency was repaired without introducing an unnecessary root-level Prisma dependency.

The prediction-contract migration was then generated and applied successfully.

### Result

`prisma migrate status` reported the database schema was up to date.

The migration was additive and did not require destructive data changes.

### Lesson

**Tooling failures should be repaired at the environment/dependency layer rather than triggering an unnecessary architecture rewrite.**

---

## 21. Live Helius Normalization Limitation

### Problem

During Phase L inspection, the live ingestion architecture revealed that normalized `TokenTransfer` records do not always contain sufficient information to directly reconstruct reliable wallet buy/sell direction.

The observed normalization included cases where `from` was empty and `to` was derived from post-token-balance ownership information.

### Why it matters

Wallet-level participation and flow are part of the frozen feature contract. Fabricating buy/sell direction would make the live features inconsistent with the historical training data.

### Resolution / Requirement

The live aggregation layer must derive wallet behavior only from information actually present in the real transaction stream or explicitly mark the data as insufficient.

The system must not fabricate wallet behavior merely to satisfy `RAW_FIELDS`.

### Lesson

**A live feature pipeline is only valid when its inputs have the same semantic meaning as the training inputs.**

---

## 22. Live vs Historical Feature Semantics

### Problem

The historical dataset has rich, already-aggregated information, while live ingestion begins from raw transactions and market observations.

Simply calculating fields with the same names is not enough if their underlying semantics differ.

### Resolution

Phase J explicitly defined the `RAW_FIELDS` contract required before the 36 frozen formulas can be applied.

The live aggregation layer must produce those fields from actual observable information before inference.

### Lesson

**Feature parity means semantic parity, not merely matching column names.**

---

## 23. Latency Was Initially an Architectural Risk

### Problem

A predictive system can produce an accurate forecast too late to be useful.

If Ronin waits for a large price movement, performs expensive analysis, then sends a Telegram alert, the signal can become a post-event description rather than a useful forecast.

### Resolution / Design Principle

The live architecture is being built around:

- incremental state updates
- PIT-safe live features
- fast inference
- selective deeper verification
- explicit stage timestamps
- prediction latency measurement
- lead-time measurement

The intended hot path is:

`stream → state update → features → inference → forecast`

with expensive investigation reserved for selected candidates.

### Lesson

**Prediction quality without latency awareness is incomplete. A forecast must be evaluated on both correctness and how early it arrives.**

---

## 24. Prediction Accuracy Is Not the Same as Lead Time

### Problem

A system can correctly predict a direction after the movement has already started.

That produces a correct label but an operationally poor signal.

### Resolution

RONIN's future evaluation must track the relationship between:

- prediction timestamp
- beginning of meaningful movement
- target/hit timestamp
- decision-window expiry

Lead time is treated as a core metric.

### Lesson

**“Was Ronin right?” is incomplete. The more important operational question is “How early was Ronin right?”**

---

## 25. The Model Is Not the Entire Intelligence System

### Problem

Early thinking risked treating the frozen model as if it were the entire Ronin intelligence layer.

### Resolution

The architecture separates:

- ingestion
- candidate discovery
- state intelligence
- feature engineering
- model inference
- verification
- prediction contracts
- outcome tracking
- evaluation
- controlled adaptation

The frozen 36-feature model is the v0.1 predictive foundation, not the final architecture ceiling.

### Lesson

**A production predictive system is an ecosystem of data, state, models, verification, timing, and feedback, not a single `predict()` call.**

---

## 26. Overlapping Predictions Require Careful Evaluation

### Problem

Repeated predictions on the same asset can produce highly correlated outcomes.

Counting every prediction as an independent success can inflate apparent statistical confidence.

### Resolution / Design Rule

RONIN evaluation must account for:

- overlapping prediction windows
- repeated predictions on the same token
- unique assets
- temporal clustering
- regime dependence

### Lesson

**A large number of rows is not automatically a large number of independent observations.**

---

## 27. Historical Success Does Not Prove Future Profitability

### Problem

The OOS results were strong enough that it would be easy to overstate them as proof of a profitable trading strategy.

### Resolution

The project explicitly separated:

1. statistical ranking performance
2. probability calibration
3. execution viability
4. realized P&L
5. live performance

The current evidence supports the first categories under controlled historical evaluation but does not establish guaranteed live profitability.

### Lesson

**Do not turn a good benchmark into a marketing promise.**

---

# Final Research Position

RONIN's development has repeatedly followed the same pattern:

`ASSUMPTION → IMPLEMENTATION → FAILURE / CONTRADICTION → INVESTIGATION → CORRECTION → VALIDATION`

The project intentionally preserves failed approaches because they demonstrate how the system became more trustworthy.

The most important lessons are:

1. **Never allow future information into a prediction.**
2. **Never confuse model scores with probabilities.**
3. **Never assume an intuitive feature is useful. Measure it.**
4. **Never use historical validation as proof of live profitability.**
5. **Never fabricate missing live data to satisfy a feature contract.**
6. **Never confuse statistical accuracy with executable opportunity.**
7. **Never treat correlated predictions as independent evidence without checking.**
8. **Never ignore latency and lead time in a short-horizon prediction system.**
9. **Always preserve a locked out-of-sample evaluation.**
10. **Give the system permission to say `NO VALID PREDICTION`.**

RONIN is intentionally documented as an evolving research and engineering system, including the mistakes that shaped its current design.
