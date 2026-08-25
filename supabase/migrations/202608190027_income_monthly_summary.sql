create or replace function public.get_income_monthly_summary(
  p_mes date
)
returns table (
  mes date,
  total_ingresado numeric,
  cantidad_ingresos bigint,
  categorias jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_mes date;
  v_mes_actual date;
  v_total numeric;
  v_cantidad bigint;
  v_categorias jsonb;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if p_mes is null then
    raise exception 'El mes es obligatorio.';
  end if;

  v_mes := pg_catalog.date_trunc('month', p_mes)::date;
  v_mes_actual := pg_catalog.date_trunc('month', current_date)::date;

  if v_mes > v_mes_actual then
    raise exception 'No se puede consultar un resumen de ingresos de un mes futuro.';
  end if;

  select
    coalesce(pg_catalog.sum(i.monto), 0),
    pg_catalog.count(*)
  into v_total, v_cantidad
  from public.ingresos as i
  where i.usuario_id = v_user_id
    and i.fecha >= v_mes
    and i.fecha < (v_mes + interval '1 month')::date;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'categoryId', category_totals.category_id,
        'name', category_totals.category_name,
        'status', category_totals.category_status,
        'amount', category_totals.amount,
        'incomeCount', category_totals.income_count,
        'percentage', pg_catalog.round(
          category_totals.amount * 100 / NULLIF(v_total, 0),
          2
        )
      )
      order by
        category_totals.amount desc,
        category_totals.category_name asc,
        category_totals.category_id asc
    ),
    '[]'::jsonb
  )
  into v_categorias
  from (
    select
      c.id as category_id,
      c.nombre as category_name,
      c.estado as category_status,
      pg_catalog.sum(i.monto) as amount,
      pg_catalog.count(*) as income_count
    from public.ingresos as i
    join public.categorias_ingreso as c
      on c.id = i.categoria_ingreso_id
      and c.usuario_id = i.usuario_id
    where i.usuario_id = v_user_id
      and i.fecha >= v_mes
      and i.fecha < (v_mes + interval '1 month')::date
    group by c.id, c.nombre, c.estado
  ) as category_totals;

  return query
  select v_mes, v_total, v_cantidad, v_categorias;
end;
$$;

revoke execute on function public.get_income_monthly_summary(date) from public;
revoke execute on function public.get_income_monthly_summary(date) from anon;
grant execute on function public.get_income_monthly_summary(date) to authenticated;
