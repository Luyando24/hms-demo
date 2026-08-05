-- Complete an outpatient consultation atomically.
-- The function is SECURITY DEFINER because clinicians are intentionally not granted
-- direct billing-table write access. Authorization is enforced from the protected
-- profile role before any mutation is performed.

create or replace function public.complete_consultation(
  target_patient_id uuid,
  target_queue_id uuid,
  note_subjective text default null,
  note_objective text default null,
  note_assessment text default null,
  note_plan text default null,
  diagnosis_code text default null,
  diagnosis_description text default null,
  prescribed_items jsonb default '[]'::jsonb,
  lab_tests jsonb default '[]'::jsonb,
  radiology_studies jsonb default '[]'::jsonb,
  billing_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  clinical_note_id uuid;
  prescription_id uuid;
  lab_order_id uuid;
  radiology_order_id uuid;
  invoice_id uuid;
  item jsonb;
  item_count integer := 0;
  lab_count integer := 0;
  radiology_count integer := 0;
  invoice_total numeric := 0;
  item_quantity numeric;
  item_unit_price numeric;
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;

  select p.role
    into actor_role
    from public.profiles as p
   where p.id = actor_id;

  if actor_role is null or actor_role not in ('ADMIN', 'DOCTOR') then
    raise exception 'Only an authorized clinician can complete a consultation';
  end if;

  if not exists (
    select 1
      from public.patients as p
     where p.id = target_patient_id
  ) then
    raise exception 'Patient not found';
  end if;

  if not exists (
    select 1
      from public.walkin_queue as q
     where q.id = target_queue_id
       and q.patient_id = target_patient_id
       and q.status <> 'COMPLETED'
  ) then
    raise exception 'The active queue entry was not found for this patient';
  end if;

  if jsonb_typeof(prescribed_items) <> 'array'
     or jsonb_typeof(lab_tests) <> 'array'
     or jsonb_typeof(radiology_studies) <> 'array'
     or jsonb_typeof(billing_items) <> 'array' then
    raise exception 'Consultation order inputs must be JSON arrays';
  end if;

  if nullif(btrim(coalesce(diagnosis_description, '')), '') is not null
     and nullif(btrim(coalesce(diagnosis_code, '')), '') is null then
    raise exception 'An ICD-10 code is required when a diagnosis is supplied';
  end if;

  insert into public.clinical_notes (
    patient_id,
    provider_id,
    subjective,
    objective,
    assessment,
    plan
  )
  values (
    target_patient_id,
    actor_id,
    nullif(btrim(coalesce(note_subjective, '')), ''),
    nullif(btrim(coalesce(note_objective, '')), ''),
    nullif(btrim(coalesce(note_assessment, '')), ''),
    nullif(btrim(coalesce(note_plan, '')), '')
  )
  returning id into clinical_note_id;

  if nullif(btrim(coalesce(diagnosis_code, '')), '') is not null then
    insert into public.diagnosis (
      note_id,
      icd10_code,
      description,
      is_primary
    )
    values (
      clinical_note_id,
      upper(btrim(diagnosis_code)),
      nullif(btrim(coalesce(diagnosis_description, '')), ''),
      true
    );
  end if;

  if jsonb_array_length(prescribed_items) > 0 then
    insert into public.prescriptions (patient_id, provider_id, status)
    values (target_patient_id, actor_id, 'PENDING')
    returning id into prescription_id;

    for item in select value from jsonb_array_elements(prescribed_items)
    loop
      if nullif(item ->> 'drug_id', '') is null
         or not exists (
           select 1
             from public.inventory_items as inventory
            where inventory.id = (item ->> 'drug_id')::uuid
         ) then
        raise exception 'A prescribed medication is invalid';
      end if;

      if nullif(btrim(coalesce(item ->> 'dosage', '')), '') is null
         or nullif(btrim(coalesce(item ->> 'frequency', '')), '') is null
         or nullif(btrim(coalesce(item ->> 'duration', '')), '') is null
         or coalesce((item ->> 'quantity_prescribed')::integer, 0) <= 0 then
        raise exception 'Every prescription requires dosage, frequency, duration, and a positive quantity';
      end if;

      insert into public.prescription_items (
        prescription_id,
        drug_id,
        dosage,
        frequency,
        duration,
        quantity_prescribed,
        quantity_dispensed,
        instructions
      )
      values (
        prescription_id,
        (item ->> 'drug_id')::uuid,
        btrim(item ->> 'dosage'),
        btrim(item ->> 'frequency'),
        btrim(item ->> 'duration'),
        (item ->> 'quantity_prescribed')::integer,
        0,
        nullif(btrim(coalesce(item ->> 'instructions', '')), '')
      );
      item_count := item_count + 1;
    end loop;
  end if;

  for item in select value from jsonb_array_elements(lab_tests)
  loop
    if nullif(btrim(coalesce(item ->> 'test_name', '')), '') is null then
      raise exception 'Every lab order requires a test name';
    end if;

    insert into public.lab_orders (patient_id, provider_id, priority, status)
    values (
      target_patient_id,
      actor_id,
      case
        when upper(coalesce(item ->> 'priority', 'NORMAL')) in ('NORMAL', 'URGENT', 'CRITICAL')
          then upper(coalesce(item ->> 'priority', 'NORMAL'))
        else 'NORMAL'
      end,
      'ORDERED'
    )
    returning id into lab_order_id;

    insert into public.lab_results (
      order_id,
      test_name,
      unit,
      reference_range,
      status
    )
    values (
      lab_order_id,
      btrim(item ->> 'test_name'),
      nullif(btrim(coalesce(item ->> 'unit', '')), ''),
      nullif(btrim(coalesce(item ->> 'reference_range', '')), ''),
      'PENDING'
    );
    lab_count := lab_count + 1;
  end loop;

  for item in select value from jsonb_array_elements(radiology_studies)
  loop
    if nullif(btrim(coalesce(item ->> 'modality', '')), '') is null
       or nullif(btrim(coalesce(item ->> 'body_part', '')), '') is null then
      raise exception 'Every radiology order requires a modality and body region';
    end if;

    insert into public.radiology_orders (
      patient_id,
      provider_id,
      modality,
      body_part,
      status
    )
    values (
      target_patient_id,
      actor_id,
      btrim(item ->> 'modality'),
      btrim(item ->> 'body_part'),
      'ORDERED'
    )
    returning id into radiology_order_id;

    insert into public.radiology_results (
      order_id,
      findings,
      conclusion,
      is_finalized
    )
    values (radiology_order_id, '', '', false);
    radiology_count := radiology_count + 1;
  end loop;

  for item in select value from jsonb_array_elements(billing_items)
  loop
    item_quantity := coalesce((item ->> 'quantity')::numeric, 0);
    item_unit_price := coalesce((item ->> 'unit_price')::numeric, -1);

    if nullif(btrim(coalesce(item ->> 'description', '')), '') is null
       or item_quantity <= 0
       or item_unit_price < 0 then
      raise exception 'Every billing item requires a description, positive quantity, and non-negative price';
    end if;

    invoice_total := invoice_total + (item_quantity * item_unit_price);
  end loop;

  if jsonb_array_length(billing_items) > 0 then
    insert into public.invoices (patient_id, total_amount, paid_amount, status)
    values (target_patient_id, invoice_total, 0, 'UNPAID')
    returning id into invoice_id;

    for item in select value from jsonb_array_elements(billing_items)
    loop
      item_quantity := (item ->> 'quantity')::numeric;
      item_unit_price := (item ->> 'unit_price')::numeric;

      insert into public.invoice_items (
        invoice_id,
        description,
        quantity,
        unit_price,
        total_price
      )
      values (
        invoice_id,
        btrim(item ->> 'description'),
        item_quantity,
        item_unit_price,
        item_quantity * item_unit_price
      );
    end loop;
  end if;

  update public.walkin_queue
     set status = 'COMPLETED'
   where id = target_queue_id
     and patient_id = target_patient_id;

  return jsonb_build_object(
    'clinical_note_id', clinical_note_id,
    'prescription_id', prescription_id,
    'invoice_id', invoice_id,
    'prescription_item_count', item_count,
    'lab_order_count', lab_count,
    'radiology_order_count', radiology_count,
    'invoice_total', invoice_total
  );
end;
$$;

revoke all on function public.complete_consultation(
  uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, jsonb, jsonb
) from public;
grant execute on function public.complete_consultation(
  uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, jsonb, jsonb
) to authenticated;
