create or replace function public.get_monthly_summary(
  p_espacio_id uuid,
  p_mes date
)
returns table (
  tipo_espacio text,
  mes date,
  total_mensual numeric,
  cantidad_gastos bigint,
  categorias jsonb,
  integrantes jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tipo_espacio text;
  v_estado_espacio text;
  v_mes date;
  v_total numeric;
  v_cantidad bigint;
  v_categorias jsonb;
  v_integrantes jsonb;
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

  v_mes := pg_catalog.date_trunc('month', p_mes)::date;

  select coalesce(pg_catalog.sum(g.monto), 0), pg_catalog.count(*)
  into v_total, v_cantidad
  from public.gastos as g
  where g.espacio_id = p_espacio_id
    and g.fecha >= v_mes
    and g.fecha < (v_mes + interval '1 month')::date;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'categoryId', category_totals.category_id,
        'name', category_totals.category_name,
        'amount', category_totals.amount,
        'percentage', pg_catalog.round(category_totals.amount * 100 / v_total, 2)
      )
      order by category_totals.amount desc, category_totals.category_name asc, category_totals.category_id asc
    ),
    '[]'::jsonb
  )
  into v_categorias
  from (
    select c.id as category_id, c.nombre as category_name, pg_catalog.sum(g.monto) as amount
    from public.gastos as g
    join public.categorias as c on c.id = g.categoria_id
    where g.espacio_id = p_espacio_id
      and g.fecha >= v_mes
      and g.fecha < (v_mes + interval '1 month')::date
    group by c.id, c.nombre
  ) as category_totals;

  if v_tipo_espacio = 'COMPARTIDO' then
    select coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'membershipId', member_totals.membership_id,
          'name', member_totals.member_name,
          'amount', member_totals.amount,
          'percentage', pg_catalog.round(member_totals.amount * 100 / v_total, 2)
        )
        order by member_totals.amount desc, member_totals.member_name asc, member_totals.membership_id asc
      ),
      '[]'::jsonb
    )
    into v_integrantes
    from (
      select m.id as membership_id, u.nombre as member_name, pg_catalog.sum(g.monto) as amount
      from public.gastos as g
      join public.membresias as m on m.id = g.pagado_por_membresia_id
      join public.usuarios as u on u.id = m.usuario_id
      where g.espacio_id = p_espacio_id
        and g.fecha >= v_mes
        and g.fecha < (v_mes + interval '1 month')::date
      group by m.id, u.nombre
    ) as member_totals;
  else
    v_integrantes := '[]'::jsonb;
  end if;

  return query
  select v_tipo_espacio, v_mes, v_total, v_cantidad, v_categorias, v_integrantes;
end;
$$;

revoke execute on function public.get_monthly_summary(uuid, date) from public;
revoke execute on function public.get_monthly_summary(uuid, date) from anon;
grant execute on function public.get_monthly_summary(uuid, date) to authenticated;
