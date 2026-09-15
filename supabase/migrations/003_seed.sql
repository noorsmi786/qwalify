-- ==============================================================================
-- DEMO SEED SCRIPT
-- Populates demo tenant (Acme Corp), 12 leads, conversations, messages, and bookings
-- ==============================================================================

do $$
declare
  v_tenant_id uuid;
  v_user_jordan_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_user_priya_id uuid := '00000000-0000-0000-0000-000000000002'::uuid;
  v_lead_sarah_id uuid := '10000000-0000-0000-0000-000000000001'::uuid;
  v_lead_marcus_id uuid := '10000000-0000-0000-0000-000000000002'::uuid;
  v_lead_elena_id uuid := '10000000-0000-0000-0000-000000000003'::uuid;
  v_conv_sarah_id uuid;
begin
  -- 1. Create or fetch Demo Tenant
  select id into v_tenant_id from public.tenants where slug = 'acme-corp' limit 1;
  
  if v_tenant_id is null then
    insert into public.tenants (id, name, slug, timezone, plan)
    values ('a0000000-0000-0000-0000-000000000001'::uuid, 'Acme Corp', 'acme-corp', 'America/New_York', 'pro')
    returning id into v_tenant_id;
  end if;

  -- 2. Create Follow Up Sequence if not exists
  if not exists (select 1 from public.follow_up_sequences where tenant_id = v_tenant_id) then
    insert into public.follow_up_sequences (tenant_id, name, phase1_days, phase2_weeks, cool_after_days, is_default)
    values (v_tenant_id, 'Default Outreach Cadence', 7, 8, 56, true);
  end if;

  -- 3. Seed Leads
  insert into public.leads (id, tenant_id, full_name, contact, source_channel, status, score, tags, notes, is_handoff_ready, last_contact_at)
  values
    (v_lead_sarah_id, v_tenant_id, 'Sarah Mitchell', '+1 (555) 234-5678', 'whatsapp', 'hot', 87, array['enterprise', 'urgent', 'demo-requested'], 'Very interested in enterprise tier. Inquiring about API access.', true, now() - interval '2 hours'),
    (v_lead_marcus_id, v_tenant_id, 'Marcus Okafor', 'marcus.okafor@techventures.io', 'email', 'qualifying', 61, array['smb', 'trial'], 'Currently testing free tier.', false, now() - interval '1 day'),
    (v_lead_elena_id, v_tenant_id, 'Elena Vasquez', '+44 20 7946 0321', 'telegram', 'booked', 92, array['enterprise', 'international'], 'Booked demo for upcoming Friday.', false, now() - interval '2 days'),
    ('10000000-0000-0000-0000-000000000004'::uuid, v_tenant_id, 'Tyler Brooks', '+1 (555) 987-6543', 'whatsapp', 'warm', 54, array['startup'], 'Exploring options for Q4.', false, now() - interval '3 days'),
    ('10000000-0000-0000-0000-000000000005'::uuid, v_tenant_id, 'Amara Diallo', 'amara@growthops.co', 'slack', 'cold', 28, array['agency'], 'Low budget at this stage.', false, now() - interval '5 days'),
    ('10000000-0000-0000-0000-000000000006'::uuid, v_tenant_id, 'Noah Chen', '+1 (555) 321-0987', 'whatsapp', 'new', 10, array[]::text[], 'Newly incoming inquiry.', false, now() - interval '30 minutes'),
    ('10000000-0000-0000-0000-000000000007'::uuid, v_tenant_id, 'Isabelle Fontaine', 'i.fontaine@luxecorp.fr', 'email', 'hot', 79, array['enterprise', 'french-market'], 'Bilingual team requirement.', true, now() - interval '4 hours'),
    ('10000000-0000-0000-0000-000000000008'::uuid, v_tenant_id, 'Raj Patel', '+91 98765 43210', 'whatsapp', 'cooled', 15, array['smb', 'no-budget'], 'Unresponsive after week 2 follow-ups.', false, now() - interval '2 weeks'),
    ('10000000-0000-0000-0000-000000000009'::uuid, v_tenant_id, 'Keisha Washington', '+1 (555) 456-7890', 'telegram', 'qualifying', 45, array['mid-market'], 'Comparing with competitors.', false, now() - interval '18 hours'),
    ('10000000-0000-0000-0000-000000000010'::uuid, v_tenant_id, 'Luca Romano', 'luca.romano@italiansolutions.it', 'email', 'warm', 63, array['mid-market', 'integration-needed'], 'Needs Salesforce CRM connector.', false, now() - interval '1 day'),
    ('10000000-0000-0000-0000-000000000011'::uuid, v_tenant_id, 'Diana Thornton', '+1 (555) 111-2222', 'whatsapp', 'booked', 88, array['enterprise', 'priority'], 'Demo confirmed with enterprise rep.', false, now() - interval '2 days'),
    ('10000000-0000-0000-0000-000000000012'::uuid, v_tenant_id, 'Ahmed Al-Rashid', '+971 50 123 4567', 'whatsapp', 'hot', 81, array['mena-market', 'high-value'], 'Regional expansion lead.', true, now() - interval '6 hours')
  on conflict (tenant_id, contact) do nothing;

  -- 4. Create Conversation for Sarah Mitchell
  insert into public.conversations (id, tenant_id, lead_id, channel, state)
  values ('20000000-0000-0000-0000-000000000001'::uuid, v_tenant_id, v_lead_sarah_id, 'whatsapp', 'active')
  on conflict (lead_id, channel) do update set updated_at = now()
  returning id into v_conv_sarah_id;

  -- 5. Seed Messages for Sarah Mitchell
  insert into public.messages (tenant_id, conversation_id, lead_id, sender, content, channel, created_at)
  values
    (v_tenant_id, v_conv_sarah_id, v_lead_sarah_id, 'lead', 'Hi, I saw your ad on LinkedIn. Can you tell me more about your product?', 'whatsapp', now() - interval '3 hours'),
    (v_tenant_id, v_conv_sarah_id, v_lead_sarah_id, 'ai', 'Hi Sarah! Thanks for reaching out 👋 I am Qwalify AI assistant. What is the biggest challenge your sales team is facing right now?', 'whatsapp', now() - interval '2 hours 59 minutes'),
    (v_tenant_id, v_conv_sarah_id, v_lead_sarah_id, 'lead', 'We are wasting so much time on unqualified leads. Our reps spend 70% of their time on people who never convert.', 'whatsapp', now() - interval '2 hours 50 minutes'),
    (v_tenant_id, v_conv_sarah_id, v_lead_sarah_id, 'ai', 'That is a common pain point — Qwalify qualifies leads automatically so reps only speak with purchase-ready prospects. What size is your sales team?', 'whatsapp', now() - interval '2 hours 49 minutes'),
    (v_tenant_id, v_conv_sarah_id, v_lead_sarah_id, 'lead', 'We have about 25 reps. Enterprise SaaS company — $50M ARR. Budget is not an issue if the ROI is proven.', 'whatsapp', now() - interval '2 hours 40 minutes'),
    (v_tenant_id, v_conv_sarah_id, v_lead_sarah_id, 'ai', 'With 25 reps, Qwalify typically saves 15–20 hours per rep/week. Would you like to see a live demo tailored to your workflows? I can book a 30-min slot.', 'whatsapp', now() - interval '2 hours 38 minutes'),
    (v_tenant_id, v_conv_sarah_id, v_lead_sarah_id, 'lead', 'Yes definitely. Also — do you have API access? We want to sync with our CRM.', 'whatsapp', now() - interval '2 hours 30 minutes'),
    (v_tenant_id, v_conv_sarah_id, v_lead_sarah_id, 'ai', 'Absolutely — REST API, webhooks, and native CRM integrations. I am flagging your conversation for our enterprise solutions team right now 🚀 What timezone are you in?', 'whatsapp', now() - interval '2 hours 28 minutes'),
    (v_tenant_id, v_conv_sarah_id, v_lead_sarah_id, 'lead', 'EST. Any morning next week works.', 'whatsapp', now() - interval '2 hours 20 minutes'),
    (v_tenant_id, v_conv_sarah_id, v_lead_sarah_id, 'human', 'Hi Sarah, this is Jordan from the enterprise team — I have taken over from the AI. I have you booked for Monday Sep 22 at 10am EST. Looking forward to meeting! 🎯', 'whatsapp', now() - interval '2 hours')
  on conflict do nothing;

  -- 6. Seed Score Progression for Sarah
  insert into public.qualification_scores (tenant_id, lead_id, score, reason, created_at)
  values
    (v_tenant_id, v_lead_sarah_id, 10, 'Initial greeting & qualification initiation', now() - interval '3 hours'),
    (v_tenant_id, v_lead_sarah_id, 35, 'Pain point defined (sales rep bandwidth waste)', now() - interval '2 hours 50 minutes'),
    (v_tenant_id, v_lead_sarah_id, 68, 'Enterprise ARR scale confirmed ($50M+ ARR, 25 reps)', now() - interval '2 hours 40 minutes'),
    (v_tenant_id, v_lead_sarah_id, 78, 'Demo confirmed and API interest stated', now() - interval '2 hours 30 minutes'),
    (v_tenant_id, v_lead_sarah_id, 87, 'Timezone provided and human handoff completed', now() - interval '2 hours')
  on conflict do nothing;

  -- 7. Seed Booking for Elena
  insert into public.bookings (tenant_id, lead_id, scheduled_at, duration_mins, status, notes)
  values
    (v_tenant_id, v_lead_elena_id, now() + interval '3 days', 30, 'confirmed', 'Enterprise UK time slot')
  on conflict do nothing;

end $$;
