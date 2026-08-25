create index if not exists gastos_pagador_fecha_idx
on public.gastos (
  pagado_por_membresia_id,
  fecha
);

create or replace function public.get_personal_balance_monthly(
  p_mes date
)
returns table (
  mes date,
  ingresos_totales numeric,
  gastos_personales numeric,
  gastos_compartidos_pagados numeric,
  gastos_totales_pagados numeric,
  balance_final numeric
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
  v_ingresos_totales numeric;
  v_gastos_personales numeric;
  v_gastos_compartidos_pagados numeric;
  v_gastos_totales_pagados numeric;
  v_balance_final numeric;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if p_mes is null then
    raise exception 'El mes es obligatorio.';
  end if;

  v_mes := pg_catalog.date_trunc('month', p_mes)::date;
  v_mes_siguiente := (v_mes + interval '1 month')::date;
  v_mes_actual := pg_catalog.date_trunc('month', current_date)::date;

  if v_mes > v_mes_actual then
    raise exception 'No se puede consultar el balance de un mes futuro.';
  end if;

  select coalesce(pg_catalog.sum(i.monto), 0)
  into v_ingresos_totales
  from public.ingresos as i
  where i.usuario_id = v_user_id
    and i.fecha >= v_mes
    and i.fecha < v_mes_siguiente;

  select coalesce(pg_catalog.sum(g.monto), 0)
  into v_gastos_personales
  from public.membresias as m
  join public.espacios as e
    on e.id = m.espacio_id
  join public.gastos as g
    on g.espacio_id = m.espacio_id
    and g.pagado_por_membresia_id = m.id
  where m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
    and e.tipo = 'PERSONAL'
    and e.estado = 'ACTIVO'
    and g.fecha >= v_mes
    and g.fecha < v_mes_siguiente;

  select coalesce(pg_catalog.sum(g.monto), 0)
  into v_gastos_compartidos_pagados
  from public.gastos as g
  join public.membresias as pagador
    on pagador.id = g.pagado_por_membresia_id
    and pagador.espacio_id = g.espacio_id
  join public.espacios as e
    on e.id = g.espacio_id
  where pagador.usuario_id = v_user_id
    and e.tipo = 'COMPARTIDO'
    and g.fecha >= v_mes
    and g.fecha < v_mes_siguiente;

  v_gastos_totales_pagados :=
    v_gastos_personales + v_gastos_compartidos_pagados;
  v_balance_final := v_ingresos_totales - v_gastos_totales_pagados;

  return query
  select
    v_mes,
    v_ingresos_totales,
    v_gastos_personales,
    v_gastos_compartidos_pagados,
    v_gastos_totales_pagados,
    v_balance_final;
end;
$$;

revoke execute on function public.get_personal_balance_monthly(date) from public;
revoke execute on function public.get_personal_balance_monthly(date) from anon;
grant execute on function public.get_personal_balance_monthly(date) to authenticated;
