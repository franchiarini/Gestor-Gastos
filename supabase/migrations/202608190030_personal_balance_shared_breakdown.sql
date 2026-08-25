create or replace function public.get_personal_balance_shared_breakdown(
  p_mes date
)
returns table (
  espacio_id uuid,
  espacio_nombre text,
  estado_membresia text,
  acceso_actual boolean,
  monto_pagado numeric
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
    raise exception 'No se puede consultar el desglose del balance de un mes futuro.';
  end if;

  return query
  select
    e.id,
    e.nombre,
    m.estado,
    m.estado = 'ACTIVA',
    pg_catalog.sum(g.monto)
  from public.gastos as g
  join public.membresias as m
    on m.id = g.pagado_por_membresia_id
    and m.espacio_id = g.espacio_id
  join public.espacios as e
    on e.id = g.espacio_id
  where m.usuario_id = v_user_id
    and e.tipo = 'COMPARTIDO'
    and g.fecha >= v_mes
    and g.fecha < v_mes_siguiente
  group by e.id, e.nombre, m.estado
  order by
    (m.estado = 'ACTIVA') desc,
    pg_catalog.sum(g.monto) desc,
    e.nombre asc,
    e.id asc;
end;
$$;

revoke execute on function public.get_personal_balance_shared_breakdown(date) from public;
revoke execute on function public.get_personal_balance_shared_breakdown(date) from anon;
grant execute on function public.get_personal_balance_shared_breakdown(date) to authenticated;
