create or replace function public.create_personal_category(
  p_espacio_id uuid,
  p_nombre text
)
returns table (
  categoria_id uuid,
  categoria_nombre text,
  categoria_estado text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_nombre text := pg_catalog.btrim(p_nombre);
  v_categoria_id uuid;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if p_espacio_id is null then
    raise exception 'El espacio es obligatorio.';
  end if;

  if v_nombre is null or v_nombre = '' then
    raise exception 'El nombre de la categoría no puede estar vacío.';
  end if;

  if not exists (
    select 1
    from public.espacios as e
    join public.membresias as m on m.espacio_id = e.id
    where e.id = p_espacio_id
      and e.tipo = 'PERSONAL'
      and e.estado = 'ACTIVO'
      and m.usuario_id = v_user_id
      and m.estado = 'ACTIVA'
      and m.rol = 'ADMIN'
  ) then
    raise exception 'No tenés acceso de administrador al espacio personal activo.';
  end if;

  insert into public.categorias (espacio_id, nombre, estado)
  values (p_espacio_id, v_nombre, 'ACTIVA')
  returning categorias.id into v_categoria_id;

  return query
  select v_categoria_id, v_nombre, 'ACTIVA'::text;
end;
$$;

revoke execute on function public.create_personal_category(uuid, text) from public;
revoke execute on function public.create_personal_category(uuid, text) from anon;
grant execute on function public.create_personal_category(uuid, text) to authenticated;

revoke insert on table public.categorias from authenticated;

create or replace function public.create_shared_expense(
  p_espacio_id uuid,
  p_categoria_id uuid,
  p_pagado_por_membresia_id uuid,
  p_monto numeric,
  p_fecha date,
  p_descripcion text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_membresia_id uuid;
  v_gasto_id uuid;
begin
  if v_user_id is null then raise exception 'Se requiere un usuario autenticado.'; end if;
  if p_espacio_id is null then raise exception 'El espacio es obligatorio.'; end if;
  if p_categoria_id is null then raise exception 'La categoría es obligatoria.'; end if;
  if p_pagado_por_membresia_id is null then raise exception 'El pagador es obligatorio.'; end if;
  if p_monto is null or p_monto <= 0 or p_monto = 'NaN'::numeric then raise exception 'El monto debe ser mayor a cero.'; end if;
  if p_monto <> pg_catalog.round(p_monto, 2) then raise exception 'El monto no puede tener más de dos decimales.'; end if;
  if p_fecha is null then raise exception 'La fecha es obligatoria.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_espacio_id::text, 0)
  );

  select m.id into v_membresia_id
  from public.membresias as m
  join public.espacios as e on e.id = m.espacio_id
  where m.usuario_id = v_user_id
    and m.espacio_id = p_espacio_id
    and m.estado = 'ACTIVA'
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO';
  if not found then raise exception 'No tenés acceso activo a este espacio compartido.'; end if;

  if not exists (
    select 1 from public.categorias as c
    where c.id = p_categoria_id and c.espacio_id = p_espacio_id and c.estado = 'ACTIVA'
  ) then raise exception 'La categoría no pertenece al espacio compartido activo o está archivada.'; end if;

  if not exists (
    select 1 from public.membresias as m
    where m.id = p_pagado_por_membresia_id and m.espacio_id = p_espacio_id and m.estado = 'ACTIVA'
  ) then raise exception 'El pagador debe ser un integrante activo del espacio compartido.'; end if;

  insert into public.gastos (
    espacio_id, categoria_id, pagado_por_membresia_id,
    registrado_por_membresia_id, monto, fecha, descripcion
  ) values (
    p_espacio_id, p_categoria_id, p_pagado_por_membresia_id,
    v_membresia_id, p_monto, p_fecha, NULLIF(pg_catalog.btrim(p_descripcion), '')
  ) returning gastos.id into v_gasto_id;

  return v_gasto_id;
end;
$$;

revoke execute on function public.create_shared_expense(uuid, uuid, uuid, numeric, date, text) from public;
revoke execute on function public.create_shared_expense(uuid, uuid, uuid, numeric, date, text) from anon;
grant execute on function public.create_shared_expense(uuid, uuid, uuid, numeric, date, text) to authenticated;

create or replace function public.update_shared_expense(
  p_gasto_id uuid,
  p_categoria_id uuid,
  p_pagado_por_membresia_id uuid,
  p_monto numeric,
  p_fecha date,
  p_descripcion text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_espacio_id uuid;
begin
  if v_user_id is null then raise exception 'Se requiere un usuario autenticado.'; end if;
  if p_gasto_id is null then raise exception 'El gasto es obligatorio.'; end if;
  if p_categoria_id is null then raise exception 'La categoría es obligatoria.'; end if;
  if p_pagado_por_membresia_id is null then raise exception 'El pagador es obligatorio.'; end if;
  if p_monto is null or p_monto <= 0 or p_monto = 'NaN'::numeric then raise exception 'El monto debe ser mayor a cero.'; end if;
  if p_monto <> pg_catalog.round(p_monto, 2) then raise exception 'El monto no puede tener más de dos decimales.'; end if;
  if p_fecha is null then raise exception 'La fecha es obligatoria.'; end if;

  select g.espacio_id into v_espacio_id from public.gastos as g where g.id = p_gasto_id;
  if not found then raise exception 'El gasto no pertenece a un espacio compartido activo al que tengas acceso.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_espacio_id::text, 0)
  );

  select g.espacio_id into v_espacio_id
  from public.gastos as g
  join public.espacios as e on e.id = g.espacio_id
  join public.membresias as m on m.espacio_id = g.espacio_id
  where g.id = p_gasto_id
    and g.espacio_id = v_espacio_id
    and m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO';
  if not found then raise exception 'El gasto no pertenece a un espacio compartido activo al que tengas acceso.'; end if;

  if not exists (
    select 1 from public.categorias as c
    where c.id = p_categoria_id and c.espacio_id = v_espacio_id and c.estado = 'ACTIVA'
  ) then raise exception 'La categoría no pertenece al espacio compartido activo o está archivada.'; end if;

  if not exists (
    select 1 from public.membresias as m
    where m.id = p_pagado_por_membresia_id and m.espacio_id = v_espacio_id and m.estado = 'ACTIVA'
  ) then raise exception 'El pagador debe ser un integrante activo del espacio compartido.'; end if;

  update public.gastos as g
  set categoria_id = p_categoria_id,
      pagado_por_membresia_id = p_pagado_por_membresia_id,
      monto = p_monto,
      fecha = p_fecha,
      descripcion = NULLIF(pg_catalog.btrim(p_descripcion), ''),
      fecha_modificacion = now()
  where g.id = p_gasto_id and g.espacio_id = v_espacio_id;
end;
$$;

revoke execute on function public.update_shared_expense(uuid, uuid, uuid, numeric, date, text) from public;
revoke execute on function public.update_shared_expense(uuid, uuid, uuid, numeric, date, text) from anon;
grant execute on function public.update_shared_expense(uuid, uuid, uuid, numeric, date, text) to authenticated;

create or replace function public.delete_shared_expense(p_gasto_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_espacio_id uuid;
begin
  if v_user_id is null then raise exception 'Se requiere un usuario autenticado.'; end if;
  if p_gasto_id is null then raise exception 'El gasto es obligatorio.'; end if;

  select g.espacio_id into v_espacio_id from public.gastos as g where g.id = p_gasto_id;
  if not found then raise exception 'El gasto no pertenece a un espacio compartido activo al que tengas acceso.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_espacio_id::text, 0)
  );

  if not exists (
    select 1
    from public.gastos as g
    join public.espacios as e on e.id = g.espacio_id
    join public.membresias as m on m.espacio_id = g.espacio_id
    where g.id = p_gasto_id
      and g.espacio_id = v_espacio_id
      and m.usuario_id = v_user_id
      and m.estado = 'ACTIVA'
      and e.tipo = 'COMPARTIDO'
      and e.estado = 'ACTIVO'
  ) then raise exception 'El gasto no pertenece a un espacio compartido activo al que tengas acceso.'; end if;

  delete from public.gastos as g where g.id = p_gasto_id and g.espacio_id = v_espacio_id;
end;
$$;

revoke execute on function public.delete_shared_expense(uuid) from public;
revoke execute on function public.delete_shared_expense(uuid) from anon;
grant execute on function public.delete_shared_expense(uuid) to authenticated;

create or replace function public.create_shared_category(p_espacio_id uuid, p_nombre text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_nombre text := pg_catalog.btrim(p_nombre);
  v_categoria_id uuid;
begin
  if v_user_id is null then raise exception 'Se requiere un usuario autenticado.'; end if;
  if p_espacio_id is null then raise exception 'El espacio es obligatorio.'; end if;
  if v_nombre is null or v_nombre = '' then raise exception 'El nombre de la categoría no puede estar vacío.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_espacio_id::text, 0)
  );

  if not exists (
    select 1 from public.membresias as m
    join public.espacios as e on e.id = m.espacio_id
    where m.usuario_id = v_user_id and m.espacio_id = p_espacio_id
      and m.estado = 'ACTIVA' and e.tipo = 'COMPARTIDO' and e.estado = 'ACTIVO'
  ) then raise exception 'No tenés acceso activo a este espacio compartido.'; end if;

  insert into public.categorias (espacio_id, nombre, estado)
  values (p_espacio_id, v_nombre, 'ACTIVA')
  returning categorias.id into v_categoria_id;
  return v_categoria_id;
end;
$$;

revoke execute on function public.create_shared_category(uuid, text) from public;
revoke execute on function public.create_shared_category(uuid, text) from anon;
grant execute on function public.create_shared_category(uuid, text) to authenticated;

create or replace function public.update_shared_category(
  p_categoria_id uuid,
  p_nombre text default null,
  p_archivar boolean default false,
  p_restaurar boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_espacio_id uuid;
  v_estado text;
  v_nombre text;
  v_archivar boolean := coalesce(p_archivar, false);
  v_restaurar boolean := coalesce(p_restaurar, false);
begin
  if v_user_id is null then raise exception 'Se requiere un usuario autenticado.'; end if;
  if p_categoria_id is null then raise exception 'La categoría es obligatoria.'; end if;
  if v_archivar and v_restaurar then raise exception 'No se puede archivar y restaurar una categoría simultáneamente.'; end if;
  if p_nombre is null and not v_archivar and not v_restaurar then raise exception 'No se indicó ningún cambio para la categoría.'; end if;
  if p_nombre is not null then
    v_nombre := pg_catalog.btrim(p_nombre);
    if v_nombre = '' then raise exception 'El nombre de la categoría no puede estar vacío.'; end if;
  end if;

  select c.espacio_id into v_espacio_id from public.categorias as c where c.id = p_categoria_id;
  if not found then raise exception 'La categoría no pertenece a un espacio compartido activo al que tengas acceso.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_espacio_id::text, 0)
  );

  select c.estado into v_estado
  from public.categorias as c
  join public.espacios as e on e.id = c.espacio_id
  join public.membresias as m on m.espacio_id = c.espacio_id
  where c.id = p_categoria_id and c.espacio_id = v_espacio_id
    and m.usuario_id = v_user_id and m.estado = 'ACTIVA'
    and e.tipo = 'COMPARTIDO' and e.estado = 'ACTIVO';
  if not found then raise exception 'La categoría no pertenece a un espacio compartido activo al que tengas acceso.'; end if;

  if v_archivar and v_estado <> 'ACTIVA' then raise exception 'Sólo se puede archivar una categoría activa.'; end if;
  if v_restaurar and v_estado <> 'ARCHIVADA' then raise exception 'Sólo se puede restaurar una categoría archivada.'; end if;

  update public.categorias as c
  set nombre = coalesce(v_nombre, c.nombre),
      estado = case when v_archivar then 'ARCHIVADA' when v_restaurar then 'ACTIVA' else c.estado end
  where c.id = p_categoria_id and c.espacio_id = v_espacio_id;
end;
$$;

revoke execute on function public.update_shared_category(uuid, text, boolean, boolean) from public;
revoke execute on function public.update_shared_category(uuid, text, boolean, boolean) from anon;
grant execute on function public.update_shared_category(uuid, text, boolean, boolean) to authenticated;

create or replace function public.delete_shared_category(p_categoria_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_espacio_id uuid;
begin
  if v_user_id is null then raise exception 'Se requiere un usuario autenticado.'; end if;
  if p_categoria_id is null then raise exception 'La categoría es obligatoria.'; end if;

  select c.espacio_id into v_espacio_id from public.categorias as c where c.id = p_categoria_id;
  if not found then raise exception 'La categoría no pertenece a un espacio compartido activo al que tengas acceso.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_espacio_id::text, 0)
  );

  if not exists (
    select 1 from public.categorias as c
    join public.espacios as e on e.id = c.espacio_id
    join public.membresias as m on m.espacio_id = c.espacio_id
    where c.id = p_categoria_id and c.espacio_id = v_espacio_id
      and m.usuario_id = v_user_id and m.estado = 'ACTIVA'
      and e.tipo = 'COMPARTIDO' and e.estado = 'ACTIVO'
  ) then raise exception 'La categoría no pertenece a un espacio compartido activo al que tengas acceso.'; end if;

  if exists (select 1 from public.gastos as g where g.categoria_id = p_categoria_id) then
    raise exception 'No se puede eliminar la categoría porque tiene gastos asociados.';
  end if;

  delete from public.categorias as c where c.id = p_categoria_id and c.espacio_id = v_espacio_id;
end;
$$;

revoke execute on function public.delete_shared_category(uuid) from public;
revoke execute on function public.delete_shared_category(uuid) from anon;
grant execute on function public.delete_shared_category(uuid) to authenticated;

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
  if v_user_id is null then raise exception 'Se requiere un usuario autenticado.'; end if;
  if p_espacio_id is null then raise exception 'El espacio es obligatorio.'; end if;
  if p_mes is null then raise exception 'El mes es obligatorio.'; end if;

  select e.tipo, e.estado
  into v_tipo_espacio, v_estado_espacio
  from public.espacios as e
  join public.membresias as m on m.espacio_id = e.id
  where e.id = p_espacio_id
    and m.usuario_id = v_user_id
    and m.estado = 'ACTIVA';

  if not found then raise exception 'No tenés acceso al espacio solicitado.'; end if;

  if v_tipo_espacio = 'PERSONAL' and v_estado_espacio <> 'ACTIVO' then
    raise exception 'El espacio personal no está activo.';
  end if;
  if v_tipo_espacio = 'COMPARTIDO' and v_estado_espacio not in ('ACTIVO', 'ARCHIVADO') then
    raise exception 'El espacio compartido no está disponible.';
  end if;
  if v_tipo_espacio not in ('PERSONAL', 'COMPARTIDO') then
    raise exception 'El tipo de espacio no es válido.';
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
  if v_user_id is null then raise exception 'Se requiere un usuario autenticado.'; end if;
  if p_espacio_id is null then raise exception 'El espacio es obligatorio.'; end if;
  if p_hasta_mes is null then raise exception 'El mes final es obligatorio.'; end if;

  v_hasta_mes := pg_catalog.date_trunc('month', p_hasta_mes)::date;

  select e.tipo, e.estado
  into v_tipo_espacio, v_estado_espacio
  from public.espacios as e
  join public.membresias as m on m.espacio_id = e.id
  where e.id = p_espacio_id
    and m.usuario_id = v_user_id
    and m.estado = 'ACTIVA';

  if not found then raise exception 'No tenés acceso al espacio solicitado.'; end if;

  if v_tipo_espacio = 'PERSONAL' and v_estado_espacio <> 'ACTIVO' then
    raise exception 'El espacio personal no está activo.';
  end if;
  if v_tipo_espacio = 'COMPARTIDO' and v_estado_espacio not in ('ACTIVO', 'ARCHIVADO') then
    raise exception 'El espacio compartido no está disponible.';
  end if;
  if v_tipo_espacio not in ('PERSONAL', 'COMPARTIDO') then
    raise exception 'El tipo de espacio no es válido.';
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

  v_desde_mes := greatest(v_primer_mes, (v_hasta_mes - interval '5 months')::date);

  with monthly_amounts as (
    select months.month::date as month, coalesce(pg_catalog.sum(g.monto), 0) as amount
    from pg_catalog.generate_series(v_desde_mes, v_hasta_mes, interval '1 month') as months(month)
    left join public.gastos as g
      on g.espacio_id = p_espacio_id
      and g.fecha >= months.month::date
      and g.fecha < (months.month + interval '1 month')::date
    group by months.month
  ),
  monthly_changes as (
    select ma.month, ma.amount,
      pg_catalog.lag(ma.amount) over (order by ma.month) as previous_amount
    from monthly_amounts as ma
  )
  select pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'month', mc.month,
      'amount', mc.amount,
      'percentageChange', case
        when mc.previous_amount is null or mc.previous_amount = 0 then null
        else pg_catalog.round((mc.amount - mc.previous_amount) * 100 / mc.previous_amount, 2)
      end
    ) order by mc.month
  )
  into v_totales
  from monthly_changes as mc;

  with category_totals as (
    select c.id as category_id, c.nombre as category_name,
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
              'percentageChange', case
                when category_changes.previous_amount is null or category_changes.previous_amount = 0 then null
                else pg_catalog.round(
                  (category_changes.amount - category_changes.previous_amount) * 100
                  / category_changes.previous_amount,
                  2
                )
              end
            ) order by category_changes.month
          )
          from (
            select category_months.month, category_months.amount,
              pg_catalog.lag(category_months.amount) over (order by category_months.month) as previous_amount
            from (
              select months.month::date as month,
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
      ) order by ct.total_amount desc, ct.category_name asc, ct.category_id asc
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
