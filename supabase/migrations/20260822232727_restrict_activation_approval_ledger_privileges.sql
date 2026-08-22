revoke all on public.campaign_activation_approvals from service_role;
revoke all on public.campaign_activation_approval_audit from service_role;
revoke all on sequence public.campaign_activation_approval_audit_id_seq from service_role;

grant select, insert, update on public.campaign_activation_approvals to service_role;
grant select, insert on public.campaign_activation_approval_audit to service_role;
grant usage, select on sequence public.campaign_activation_approval_audit_id_seq to service_role;
