create or replace function public.get_expense_evolution(
  p_espacio_id uuid,
  p_hasta_mes date
)
returns table (
  tipo_espacio text,
  desde_mes date,
  hasta_mes date,
  totales jsonb,
  categorias jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tipo_espacio text;
  v_estado_espacio text;
  v_primer_mes date;
  v_desde_mes date;
  v_hasta_mes date;
  v_totales jsonb;
  v_categorias jsonb;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if p_espacio_id is null then
    raise exception 'El espacio es obligatorio.';
  end if;

  if p_hasta_mes is null then
    raise exception 'El mes final es obligatorio.';
  end if;

  v_hasta_mes := pg_catalog.date_trunc('month', p_hasta_mes)::date;

  select e.tipo, e.estado
  into v_tipo_espacio, v_estado_espacio
  from public.espacios as e
  where e.id = p_espacio_id;

  if not found then
    raise exception 'No se encontró el espacio solicitado.';
  end if;

  if v_tipo_espacio = 'PERSONAL' and v_estado_espacio <> 'ACTIVO' then
    raise exception 'El espacio personal no está activo.';
  end if;

  if v_tipo_espacio = 'COMPARTIDO' and v_estado_espacio not in ('ACTIVO', 'ARCHIVADO') then
    raise exception 'El espacio compartido no está disponible.';
  end if;

  if v_tipo_espacio not in ('PERSONAL', 'COMPARTIDO') then
    raise exception 'El tipo de espacio no es válido.';
  end if;

  if not exists (
    select 1
    from public.membresias as m
    where m.espacio_id = p_espacio_id
      and m.usuario_id = v_user_id
      and m.estado = 'ACTIVA'
  ) then
    raise exception 'No tenés una membresía activa en este espacio.';
  end if;

  select pg_catalog.date_trunc('month', pg_catalog.min(g.fecha))::date
  into v_primer_mes
  from public.gastos as g
  where g.espacio_id = p_espacio_id
    and g.fecha < (v_hasta_mes + interval '1 month')::date;

  if v_primer_mes is null then
    return query
    select v_tipo_espacio, null::date, null::date, '[]'::jsonb, '[]'::jsonb;
    return;
  end if;

  v_desde_mes := greatest(
    v_primer_mes,
    (v_hasta_mes - interval '5 months')::date
  );

  with monthly_amounts as (
    select
      months.month::date as month,
      coalesce(pg_catalog.sum(g.monto), 0) as amount
    from pg_catalog.generate_series(v_desde_mes, v_hasta_mes, interval '1 month') as months(month)
    left join public.gastos as g
      on g.espacio_id = p_espacio_id
      and g.fecha >= months.month::date
      and g.fecha < (months.month + interval '1 month')::date
    group by months.month
  ),
  monthly_changes as (
    select
      ma.month,
      ma.amount,
      pg_catalog.lag(ma.amount) over (order by ma.month) as previous_amount
    from monthly_amounts as ma
  )
  select pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'month', mc.month,
      'amount', mc.amount,
      'percentageChange',
        case
          when mc.previous_amount is null or mc.previous_amount = 0 then null
          else pg_catalog.round((mc.amount - mc.previous_amount) * 100 / mc.previous_amount, 2)
        end
    )
    order by mc.month
  )
  into v_totales
  from monthly_changes as mc;

  with category_totals as (
    select
      c.id as category_id,
      c.nombre as category_name,
      pg_catalog.sum(g.monto) as total_amount
    from public.gastos as g
    join public.categorias as c on c.id = g.categoria_id
    where g.espacio_id = p_espacio_id
      and g.fecha >= v_desde_mes
      and g.fecha < (v_hasta_mes + interval '1 month')::date
    group by c.id, c.nombre
  )
  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'categoryId', ct.category_id,
        'name', ct.category_name,
        'total', ct.total_amount,
        'points', (
          select pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'month', category_changes.month,
              'amount', category_changes.amount,
              'percentageChange',
                case
                  when category_changes.previous_amount is null or category_changes.previous_amount = 0 then null
                  else pg_catalog.round(
                    (category_changes.amount - category_changes.previous_amount) * 100
                    / category_changes.previous_amount,
                    2
                  )
                end
            )
            order by category_changes.month
          )
          from (
            select
              category_months.month,
              category_months.amount,
              pg_catalog.lag(category_months.amount) over (order by category_months.month) as previous_amount
            from (
              select
                months.month::date as month,
                coalesce(pg_catalog.sum(g.monto), 0) as amount
              from pg_catalog.generate_series(v_desde_mes, v_hasta_mes, interval '1 month') as months(month)
              left join public.gastos as g
                on g.espacio_id = p_espacio_id
                and g.categoria_id = ct.category_id
                and g.fecha >= months.month::date
                and g.fecha < (months.month + interval '1 month')::date
              group by months.month
            ) as category_months
          ) as category_changes
        )
      )
      order by ct.total_amount desc, ct.category_name asc, ct.category_id asc
    ),
    '[]'::jsonb
  )
  into v_categorias
  from category_totals as ct;

  return query
  select v_tipo_espacio, v_desde_mes, v_hasta_mes, v_totales, v_categorias;
end;
$$;

revoke execute on function public.get_expense_evolution(uuid, date) from public;
revoke execute on function public.get_expense_evolution(uuid, date) from anon;
grant execute on function public.get_expense_evolution(uuid, date) to authenticated;
