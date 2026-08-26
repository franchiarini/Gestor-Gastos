create or replace function public.get_shared_space_balance_monthly(
  p_espacio_id uuid,
  p_mes date
)
returns table (
  mes date,
  historial_completo boolean,
  ingresos_declarados_hasta_ahora numeric,
  cantidad_integrantes_mes integer,
  cantidad_declaraciones integer,
  declaraciones_completas boolean,
  gastos_totales numeric,
  balance_conjunto numeric,
  calculo_proporcional_aplicable boolean,
  calculo_proporcional_disponible boolean,
  proportional_reasons text[],
  composicion_proporcional_constante boolean,
  integrantes jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_mes date;
  v_mes_siguiente date;
  v_mes_actual date;
  v_inicio_mes timestamptz;
  v_inicio_mes_siguiente timestamptz;
  v_fecha_creacion_local date;
  v_historial_desde date;
  v_historial_completo boolean;
  v_ingresos_declarados numeric;
  v_cantidad_integrantes integer;
  v_cantidad_declaraciones integer;
  v_declaraciones_completas boolean;
  v_cantidad_gastos integer;
  v_gastos_totales numeric;
  v_balance_conjunto numeric;
  v_calculo_aplicable boolean;
  v_calculo_disponible boolean;
  v_reasons text[];
  v_composicion_constante boolean;
  v_integrantes jsonb;
  v_total_pagado numeric;
  v_total_esperado numeric;
  v_total_diferencias numeric;
  v_asignacion_por_gasto_valida boolean;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if p_espacio_id is null then
    raise exception 'El espacio es obligatorio.';
  end if;

  if p_mes is null then
    raise exception 'El mes es obligatorio.';
  end if;

  v_mes := pg_catalog.date_trunc('month', p_mes)::date;
  v_mes_siguiente := (v_mes + interval '1 month')::date;
  v_mes_actual := pg_catalog.date_trunc(
    'month',
    now() at time zone 'America/Argentina/Buenos_Aires'
  )::date;

  if v_mes > v_mes_actual then
    raise exception 'No se puede consultar el balance de un mes futuro.';
  end if;

  v_inicio_mes :=
    v_mes::timestamp at time zone 'America/Argentina/Buenos_Aires';
  v_inicio_mes_siguiente :=
    v_mes_siguiente::timestamp at time zone 'America/Argentina/Buenos_Aires';

  perform pg_catalog.pg_advisory_xact_lock_shared(
    pg_catalog.hashtextextended(p_espacio_id::text, 0)
  );

  select
    (e.fecha_creacion at time zone 'America/Argentina/Buenos_Aires')::date,
    e.historial_membresias_completo_desde
  into
    v_fecha_creacion_local,
    v_historial_desde
  from public.espacios as e
  join public.membresias as m
    on m.espacio_id = e.id
  where e.id = p_espacio_id
    and e.tipo = 'COMPARTIDO'
    and e.estado in ('ACTIVO', 'ARCHIVADO')
    and m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
  for share of e, m;

  if not found then
    raise exception 'No tenés acceso activo a este espacio compartido.';
  end if;

  v_historial_completo :=
    v_fecha_creacion_local >= v_mes_siguiente
    or (
      v_historial_desde is not null
      and v_historial_desde <= GREATEST(v_mes, v_fecha_creacion_local)
    );

  if exists (
    select 1
    from public.gastos as g
    left join public.membresias as m
      on m.id = g.pagado_por_membresia_id
     and m.espacio_id = g.espacio_id
    where g.espacio_id = p_espacio_id
      and g.fecha >= v_mes
      and g.fecha < v_mes_siguiente
      and m.id is null
  ) then
    raise exception 'Se detectó una inconsistencia entre un gasto y su membresía pagadora.';
  end if;

  if exists (
    select 1
    from public.gastos as g
    where g.espacio_id = p_espacio_id
      and g.fecha >= v_mes
      and g.fecha < v_mes_siguiente
      and (
        g.monto in (
          'NaN'::numeric,
          'Infinity'::numeric,
          '-Infinity'::numeric
        )
        or g.monto <= 0
        or g.monto <> pg_catalog.round(g.monto, 2)
      )
  ) then
    raise exception 'Se detectó un monto de gasto inválido para calcular el balance.';
  end if;

  if exists (
    with month_members as (
      select distinct mp.membresia_id
      from public.membresia_periodos as mp
      where mp.espacio_id = p_espacio_id
        and mp.fecha_inicio < v_inicio_mes_siguiente
        and (mp.fecha_fin is null or mp.fecha_fin > v_inicio_mes)
    ),
    month_declarations as (
      select ide.membresia_id
      from public.ingresos_declarados_espacio as ide
      where ide.espacio_id = p_espacio_id
        and ide.mes = v_mes
    ),
    month_payers as (
      select distinct g.pagado_por_membresia_id as membresia_id
      from public.gastos as g
      where g.espacio_id = p_espacio_id
        and g.fecha >= v_mes
        and g.fecha < v_mes_siguiente
    ),
    collection_members as (
      select mm.membresia_id from month_members as mm
      union
      select md.membresia_id from month_declarations as md
      union
      select mp.membresia_id from month_payers as mp
    )
    select 1
    from collection_members as cm
    left join public.membresias as m
      on m.id = cm.membresia_id
     and m.espacio_id = p_espacio_id
    left join public.usuarios as u
      on u.id = m.usuario_id
    where m.id is null or u.id is null
  ) then
    raise exception 'Se detectó una inconsistencia en los integrantes históricos del espacio.';
  end if;

  with month_expenses as (
    select
      g.id,
      g.pagado_por_membresia_id,
      g.monto,
      g.fecha,
      g.fecha::timestamp at time zone
        'America/Argentina/Buenos_Aires' as inicio_dia,
      (g.fecha + 1)::timestamp at time zone
        'America/Argentina/Buenos_Aires' as fin_dia
    from public.gastos as g
    where g.espacio_id = p_espacio_id
      and g.fecha >= v_mes
      and g.fecha < v_mes_siguiente
  ),
  expense_summary as (
    select
      pg_catalog.count(*)::integer as cantidad_gastos,
      COALESCE(pg_catalog.sum(me.monto), 0::numeric) as gastos_totales
    from month_expenses as me
  ),
  month_members as (
    select distinct mp.membresia_id
    from public.membresia_periodos as mp
    where mp.espacio_id = p_espacio_id
      and mp.fecha_inicio < v_inicio_mes_siguiente
      and (mp.fecha_fin is null or mp.fecha_fin > v_inicio_mes)
  ),
  month_member_declarations as (
    select
      mm.membresia_id,
      ide.id as declaracion_id,
      ide.monto
    from month_members as mm
    left join public.ingresos_declarados_espacio as ide
      on ide.espacio_id = p_espacio_id
     and ide.mes = v_mes
     and ide.membresia_id = mm.membresia_id
  ),
  month_member_summary as (
    select
      pg_catalog.count(*)::integer as cantidad_integrantes,
      pg_catalog.count(mmd.declaracion_id)::integer as cantidad_declaraciones
    from month_member_declarations as mmd
  ),
  all_declarations as (
    select
      ide.membresia_id,
      ide.monto
    from public.ingresos_declarados_espacio as ide
    where ide.espacio_id = p_espacio_id
      and ide.mes = v_mes
  ),
  declared_income_summary as (
    select COALESCE(pg_catalog.sum(ad.monto), 0::numeric) as monto
    from all_declarations as ad
  ),
  expense_members as (
    select distinct
      me.id as gasto_id,
      mp.membresia_id
    from month_expenses as me
    join public.membresia_periodos as mp
      on mp.espacio_id = p_espacio_id
     and mp.fecha_inicio < me.fin_dia
     and (mp.fecha_fin is null or mp.fecha_fin > me.inicio_dia)
  ),
  expense_declaration_stats as (
    select
      me.id as gasto_id,
      me.monto,
      me.fecha,
      pg_catalog.count(em.membresia_id)::integer as integrantes_relevantes,
      pg_catalog.count(ide.id)::integer as declaraciones_relevantes,
      COALESCE(pg_catalog.sum(ide.monto), 0::numeric) as ingresos_relevantes,
      (
        me.fecha >= v_fecha_creacion_local
        and v_historial_desde is not null
        and me.fecha >= v_historial_desde
      ) as historial_gasto_completo
    from month_expenses as me
    left join expense_members as em
      on em.gasto_id = me.id
    left join public.ingresos_declarados_espacio as ide
      on ide.espacio_id = p_espacio_id
     and ide.mes = v_mes
     and ide.membresia_id = em.membresia_id
    group by me.id, me.monto, me.fecha
  ),
  reason_flags as (
    select
      (
        es.cantidad_gastos > 0
        and (
          not v_historial_completo
          or COALESCE(
            pg_catalog.bool_or(not eds.historial_gasto_completo),
            false
          )
        )
      ) as history_incomplete,
      COALESCE(
        pg_catalog.bool_or(eds.integrantes_relevantes = 0),
        false
      ) as no_relevant_members,
      COALESCE(
        pg_catalog.bool_or(
          eds.integrantes_relevantes > 0
          and eds.declaraciones_relevantes < eds.integrantes_relevantes
        ),
        false
      ) as missing_declarations,
      COALESCE(
        pg_catalog.bool_or(
          eds.integrantes_relevantes > 0
          and eds.declaraciones_relevantes = eds.integrantes_relevantes
          and eds.ingresos_relevantes = 0
        ),
        false
      ) as zero_relevant_income
    from expense_summary as es
    left join expense_declaration_stats as eds
      on true
    group by es.cantidad_gastos
  ),
  reasons as (
    select COALESCE(
      array(
        select reason_data.reason
        from (
          values
            (1, 'HISTORY_INCOMPLETE'::text, rf.history_incomplete),
            (2, 'NO_RELEVANT_MEMBERS'::text, rf.no_relevant_members),
            (3, 'MISSING_DECLARATIONS'::text, rf.missing_declarations),
            (4, 'ZERO_RELEVANT_INCOME'::text, rf.zero_relevant_income)
        ) as reason_data(orden, reason, presente)
        where reason_data.presente
        order by reason_data.orden
      ),
      array[]::text[]
    ) as valores
    from reason_flags as rf
  ),
  availability as (
    select
      es.cantidad_gastos,
      es.gastos_totales,
      es.cantidad_gastos > 0 as aplicable,
      (
        es.cantidad_gastos = 0
        or pg_catalog.cardinality(r.valores) = 0
      ) as disponible,
      r.valores as reasons
    from expense_summary as es
    cross join reasons as r
  ),
  distributable_expenses as (
    select eds.gasto_id, eds.monto, eds.ingresos_relevantes
    from expense_declaration_stats as eds
    where eds.historial_gasto_completo
      and eds.integrantes_relevantes > 0
      and eds.declaraciones_relevantes = eds.integrantes_relevantes
      and eds.ingresos_relevantes > 0
  ),
  quota_integer_inputs as (
    select
      de.gasto_id,
      em.membresia_id,
      de.monto * 100 as gasto_centavos,
      de.ingresos_relevantes * 100 as ingresos_relevantes_centavos,
      (de.monto * 100) * (ide.monto * 100) as numerador
    from distributable_expenses as de
    join expense_members as em
      on em.gasto_id = de.gasto_id
    join public.ingresos_declarados_espacio as ide
      on ide.espacio_id = p_espacio_id
     and ide.mes = v_mes
     and ide.membresia_id = em.membresia_id
  ),
  quota_floor as (
    select
      qii.gasto_id,
      qii.membresia_id,
      qii.gasto_centavos,
      pg_catalog.div(
        qii.numerador,
        qii.ingresos_relevantes_centavos
      ) as cuota_base_centavos,
      pg_catalog.mod(
        qii.numerador,
        qii.ingresos_relevantes_centavos
      ) as resto_numerador
    from quota_integer_inputs as qii
  ),
  quota_ranked as (
    select
      qf.gasto_id,
      qf.membresia_id,
      qf.cuota_base_centavos,
      qf.gasto_centavos
        - pg_catalog.sum(qf.cuota_base_centavos) over (
            partition by qf.gasto_id
          ) as centavos_residuales,
      pg_catalog.row_number() over (
        partition by qf.gasto_id
        order by qf.resto_numerador desc, qf.membresia_id asc
      ) as posicion_resto
    from quota_floor as qf
  ),
  allocations as (
    select
      qr.gasto_id,
      qr.membresia_id,
      qr.cuota_base_centavos
        + case
            when qr.posicion_resto <= qr.centavos_residuales then 1
            else 0
          end as centavos_asignados
    from quota_ranked as qr
  ),
  allocation_by_expense as (
    select
      de.gasto_id,
      de.monto * 100 as gasto_centavos,
      COALESCE(pg_catalog.sum(a.centavos_asignados), 0::numeric) as centavos_asignados
    from distributable_expenses as de
    left join allocations as a
      on a.gasto_id = de.gasto_id
    group by de.gasto_id, de.monto
  ),
  allocation_integrity as (
    select not exists (
      select 1
      from allocation_by_expense as abe
      where abe.centavos_asignados is distinct from abe.gasto_centavos
    ) as valida
  ),
  monthly_allocations as (
    select
      a.membresia_id,
      pg_catalog.sum(a.centavos_asignados) / 100::numeric as aporte_esperado
    from allocations as a
    group by a.membresia_id
  ),
  paid_amounts as (
    select
      me.pagado_por_membresia_id as membresia_id,
      pg_catalog.sum(me.monto) as monto_pagado
    from month_expenses as me
    group by me.pagado_por_membresia_id
  ),
  collection_members as (
    select mm.membresia_id from month_members as mm
    union
    select ad.membresia_id from all_declarations as ad
    union
    select pa.membresia_id from paid_amounts as pa
  ),
  expense_member_presence as (
    select
      em.membresia_id,
      pg_catalog.count(distinct em.gasto_id) as cantidad_gastos
    from expense_members as em
    group by em.membresia_id
  ),
  composition as (
    select
      (
        av.aplicable
        and av.disponible
        and not exists (
          select 1
          from expense_member_presence as emp
          where emp.cantidad_gastos <> av.cantidad_gastos
        )
      ) as constante
    from availability as av
  ),
  common_members as (
    select emp.membresia_id
    from expense_member_presence as emp
    cross join availability as av
    cross join composition as c
    where c.constante
      and emp.cantidad_gastos = av.cantidad_gastos
  ),
  common_income as (
    select COALESCE(pg_catalog.sum(ide.monto), 0::numeric) as total
    from common_members as cm
    join public.ingresos_declarados_espacio as ide
      on ide.espacio_id = p_espacio_id
     and ide.mes = v_mes
     and ide.membresia_id = cm.membresia_id
  ),
  member_values as (
    select
      cm.membresia_id,
      u.nombre,
      m.estado as estado_actual,
      (mm.membresia_id is not null) as relevante_mes,
      ad.monto as ingreso_declarado,
      (ad.membresia_id is not null) as tiene_declaracion,
      (
        mm.membresia_id is not null
        and ad.membresia_id is null
      ) as declaracion_pendiente,
      COALESCE(pa.monto_pagado, 0::numeric) as monto_pagado,
      case
        when av.disponible and av.aplicable then
          COALESCE(ma.aporte_esperado, 0::numeric)
        when av.disponible and not av.aplicable then 0::numeric
        else null
      end as aporte_esperado,
      case
        when av.disponible and av.aplicable then
          COALESCE(pa.monto_pagado, 0::numeric)
          - COALESCE(ma.aporte_esperado, 0::numeric)
        when av.disponible and not av.aplicable then 0::numeric
        else null
      end as diferencia,
      case
        when c.constante and common_member.membresia_id is not null then
          ad.monto / NULLIF(ci.total, 0::numeric)
        else null
      end as participacion_proporcional
    from collection_members as cm
    join public.membresias as m
      on m.id = cm.membresia_id
     and m.espacio_id = p_espacio_id
    join public.usuarios as u
      on u.id = m.usuario_id
    left join month_members as mm
      on mm.membresia_id = cm.membresia_id
    left join all_declarations as ad
      on ad.membresia_id = cm.membresia_id
    left join paid_amounts as pa
      on pa.membresia_id = cm.membresia_id
    left join monthly_allocations as ma
      on ma.membresia_id = cm.membresia_id
    left join common_members as common_member
      on common_member.membresia_id = cm.membresia_id
    cross join availability as av
    cross join composition as c
    cross join common_income as ci
  ),
  member_output as (
    select
      COALESCE(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'membershipId', mv.membresia_id,
            'name', mv.nombre,
            'currentStatus', mv.estado_actual,
            'relevantThisMonth', mv.relevante_mes,
            'declaredIncome', mv.ingreso_declarado,
            'hasDeclaration', mv.tiene_declaracion,
            'pendingDeclaration', mv.declaracion_pendiente,
            'paidAmount', mv.monto_pagado,
            'expectedContribution', mv.aporte_esperado,
            'difference', mv.diferencia,
            'proportionalParticipation', mv.participacion_proporcional
          )
          order by mv.relevante_mes desc, mv.nombre asc, mv.membresia_id asc
        ),
        '[]'::jsonb
      ) as integrantes,
      COALESCE(pg_catalog.sum(mv.monto_pagado), 0::numeric) as total_pagado,
      COALESCE(pg_catalog.sum(mv.aporte_esperado), 0::numeric) as total_esperado,
      COALESCE(pg_catalog.sum(mv.diferencia), 0::numeric) as total_diferencias
    from member_values as mv
  )
  select
    dis.monto,
    mms.cantidad_integrantes,
    mms.cantidad_declaraciones,
    (
      v_historial_completo
      and mms.cantidad_declaraciones = mms.cantidad_integrantes
    ),
    av.cantidad_gastos,
    av.gastos_totales,
    case
      when v_historial_completo
        and mms.cantidad_declaraciones = mms.cantidad_integrantes
      then dis.monto - av.gastos_totales
      else null
    end,
    av.aplicable,
    av.disponible,
    av.reasons,
    c.constante,
    mo.integrantes,
    mo.total_pagado,
    mo.total_esperado,
    mo.total_diferencias,
    ai.valida
  into
    v_ingresos_declarados,
    v_cantidad_integrantes,
    v_cantidad_declaraciones,
    v_declaraciones_completas,
    v_cantidad_gastos,
    v_gastos_totales,
    v_balance_conjunto,
    v_calculo_aplicable,
    v_calculo_disponible,
    v_reasons,
    v_composicion_constante,
    v_integrantes,
    v_total_pagado,
    v_total_esperado,
    v_total_diferencias,
    v_asignacion_por_gasto_valida
  from declared_income_summary as dis
  cross join month_member_summary as mms
  cross join availability as av
  cross join composition as c
  cross join member_output as mo
  cross join allocation_integrity as ai;

  if not v_asignacion_por_gasto_valida then
    raise exception 'No se pudo verificar la asignación monetaria exacta de un gasto.';
  end if;

  if v_total_pagado is distinct from v_gastos_totales then
    raise exception 'No se pudo verificar la integridad de los pagos reales del balance.';
  end if;

  if v_calculo_disponible then
    if v_total_esperado is distinct from v_gastos_totales
      or v_total_diferencias is distinct from 0::numeric then
      raise exception 'No se pudo verificar la distribución monetaria exacta del balance.';
    end if;
  end if;

  return query
  select
    v_mes,
    v_historial_completo,
    v_ingresos_declarados,
    v_cantidad_integrantes,
    v_cantidad_declaraciones,
    v_declaraciones_completas,
    v_gastos_totales,
    v_balance_conjunto,
    v_calculo_aplicable,
    v_calculo_disponible,
    v_reasons,
    v_composicion_constante,
    v_integrantes;
end;
$$;

revoke execute on function public.get_shared_space_balance_monthly(uuid, date) from public;
revoke execute on function public.get_shared_space_balance_monthly(uuid, date) from anon;
grant execute on function public.get_shared_space_balance_monthly(uuid, date) to authenticated;
