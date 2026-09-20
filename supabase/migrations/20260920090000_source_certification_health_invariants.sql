-- Lock truthful Bond source certification classification/health pairs.
-- This prevents service code from recording states that the readiness evaluator
-- can never accept (for example SOURCE_UNAVAILABLE + HEALTHY).

alter table public.verification_source_certifications
  drop constraint if exists verification_source_certifications_classification_health_check;

alter table public.verification_source_certifications
  add constraint verification_source_certifications_classification_health_check
  check (
    (classification in ('MACHINE_VERIFIED','PROOF_SUPPORTED') and health = 'HEALTHY')
    or (classification = 'COMMUNITY_PROGRESS_ONLY' and health in ('HEALTHY','DEGRADED'))
    or (classification = 'SOURCE_UNAVAILABLE' and health in ('DEGRADED','OFFLINE'))
    or (classification = 'REMOVED_FOR_INTEGRITY' and health = 'REMOVED')
  );
