# 20-rule-based-recommender

## What to build

Rule-based recommender engine: clinical advisor authors rules in structured DSL (IF avg(score, last 3 sessions, category='X') < threshold THEN recommend ADD/REMOVE/FREQUENCY_ADJUST), system generates ranked recommendations during periodic review, doctor accepts/modifies/rejects with reason logging. Audit trail for all recommendations and decisions.

## Acceptance criteria

- [ ] `GET /v1/rules` — list all rules (filterable by active/inactive)
- [ ] `POST /v1/rules` — create rule (requires HITL review before activation)
- [ ] `PATCH /v1/rules/:id` — update rule (requires HITL review to reactivate)
- [ ] `DELETE /v1/rules/:id` — soft delete (deactivates rule)
- [ ] Rule DSL format: `IF avg(score, last N sessions, category='X') < Y THEN recommend ACTION [games from category='Z' with difficulty='W']`
- [ ] `GET /v1/students/:id/recommendations` — generate recommendations for student based on active rules
- [ ] Recommendation format: `{ rule_id, rule_citation, recommendation: { action: 'ADD'|'REMOVE'|'FREQUENCY_ADJUST', game_id?, category?, suggested_frequency? }, confidence_score }`
- [ ] `POST /v1/recommendations/:id/accept` — doctor accepts recommendation (logs decision with reason)
- [ ] `POST /v1/recommendations/:id/modify` — doctor modifies recommendation (logs decision with reason)
- [ ] `POST /v1/recommendations/:id/reject` — doctor rejects recommendation (logs decision with reason)
- [ ] All decisions logged: actor, timestamp, reason, before/after state
- [ ] Prisma: Rule, Recommendation, RecommendationDecision models
- [ ] Frontend: Rule authoring UI with DSL input and preview, recommendation list with accept/modify/reject actions, recommendation history timeline
- [ ] Integration tests: rule evaluation produces correct recommendations, decision logging is complete

## Blocked by

- [12-game-result-ingestion.md](./12-game-result-ingestion.md) (needs score data to evaluate rules)

## User stories

- #58: Doctor sees ranked list of recommended game changes (add/remove/frequency adjustment) during periodic review, each with rule citation
- #59: Doctor accepts, modifies, or rejects each recommendation
- #60: Clinic Admin or clinical advisor authors rules in structured DSL
- #61: Every recommendation, doctor decision, and override is logged with actor, timestamp, and reason

## QA checklist

- [ ] Rule DSL parser handles all defined grammar
- [ ] Invalid rules are rejected with helpful error messages
- [ ] Recommendations are ranked by confidence score
- [ ] Rule citation is displayed for each recommendation (for transparency)
- [ ] All accept/modify/reject actions log reason (required field)
- [ ] Recommendation history is complete and chronological
- [ ] Rules only fire during periodic review (not ad-hoc)
- [ ] Modified recommendations store both original suggestion and final decision