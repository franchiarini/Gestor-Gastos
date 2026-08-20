create or replace function public.get_shared_space_members(
  p_espacio_id uuid
)
returns table (
  membresia_id uuid,
  nombre text,
  rol text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if not exists (
    select 1
    from public.membresias m
    join public.espacios e on e.id = m.espacio_id
    where m.usuario_id = v_user_id
      and m.espacio_id = p_espacio_id
      and m.estado = 'ACTIVA'
      and e.tipo = 'COMPARTIDO'
      and e.estado = 'ACTIVO'
  ) then
    raise exception 'No tenés acceso activo a este espacio compartido.';
  end if;

  return query
  select m.id, u.nombre, m.rol
  from public.membresias m
  join public.usuarios u on u.id = m.usuario_id
  where m.espacio_id = p_espacio_id
    and m.estado = 'ACTIVA'
  order by u.nombre asc, m.id asc;
end;
$$;

revoke execute on function public.get_shared_space_members(uuid) from public;
revoke execute on function public.get_shared_space_members(uuid) from anon;
grant execute on function public.get_shared_space_members(uuid) to authenticated;

create or replace function public.get_shared_expenses(
  p_espacio_id uuid
)
returns table (
  gasto_id uuid,
  categoria_id uuid,
  categoria_nombre text,
  pagado_por_membresia_id uuid,
  pagado_por_nombre text,
  registrado_por_membresia_id uuid,
  registrado_por_nombre text,
  monto numeric,
  fecha date,
  descripcion text,
  fecha_creacion timestamptz,
  fecha_modificacion timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if not exists (
    select 1
    from public.membresias m
    join public.espacios e on e.id = m.espacio_id
    where m.usuario_id = v_user_id
      and m.espacio_id = p_espacio_id
      and m.estado = 'ACTIVA'
      and e.tipo = 'COMPARTIDO'
      and e.estado = 'ACTIVO'
  ) then
    raise exception 'No tenés acceso activo a este espacio compartido.';
  end if;

  return query
  select
    g.id,
    g.categoria_id,
    c.nombre,
    g.pagado_por_membresia_id,
    pagador.nombre,
    g.registrado_por_membresia_id,
    registrador.nombre,
    g.monto,
    g.fecha,
    g.descripcion,
    g.fecha_creacion,
    g.fecha_modificacion
  from public.gastos g
  join public.categorias c on c.id = g.categoria_id
  join public.membresias membresia_pagador on membresia_pagador.id = g.pagado_por_membresia_id
  join public.usuarios pagador on pagador.id = membresia_pagador.usuario_id
  join public.membresias membresia_registrador on membresia_registrador.id = g.registrado_por_membresia_id
  join public.usuarios registrador on registrador.id = membresia_registrador.usuario_id
  where g.espacio_id = p_espacio_id
  order by g.fecha desc, g.fecha_creacion desc, g.id desc;
end;
$$;

revoke execute on function public.get_shared_expenses(uuid) from public;
revoke execute on function public.get_shared_expenses(uuid) from anon;
grant execute on function public.get_shared_expenses(uuid) to authenticated;

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
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  select m.id
  into v_membresia_id
  from public.membresias m
  join public.espacios e on e.id = m.espacio_id
  where m.usuario_id = v_user_id
    and m.espacio_id = p_espacio_id
    and m.estado = 'ACTIVA'
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO';

  if not found then
    raise exception 'No tenés acceso activo a este espacio compartido.';
  end if;

  if p_categoria_id is null or not exists (
    select 1 from public.categorias c
    where c.id = p_categoria_id
      and c.espacio_id = p_espacio_id
      and c.estado = 'ACTIVA'
  ) then
    raise exception 'La categoría no pertenece al espacio compartido activo o está archivada.';
  end if;

  if p_pagado_por_membresia_id is null or not exists (
    select 1 from public.membresias m
    where m.id = p_pagado_por_membresia_id
      and m.espacio_id = p_espacio_id
      and m.estado = 'ACTIVA'
  ) then
    raise exception 'El pagador debe ser un integrante activo del espacio compartido.';
  end if;

  if p_monto is null or p_monto <= 0 or p_monto = 'NaN'::numeric then
    raise exception 'El monto debe ser mayor a cero.';
  end if;

  if p_monto <> pg_catalog.round(p_monto, 2) then
    raise exception 'El monto no puede tener más de dos decimales.';
  end if;

  if p_fecha is null then
    raise exception 'La fecha es obligatoria.';
  end if;

  insert into public.gastos (
    espacio_id,
    categoria_id,
    pagado_por_membresia_id,
    registrado_por_membresia_id,
    monto,
    fecha,
    descripcion
  ) values (
    p_espacio_id,
    p_categoria_id,
    p_pagado_por_membresia_id,
    v_membresia_id,
    p_monto,
    p_fecha,
    NULLIF(pg_catalog.btrim(p_descripcion), '')
  )
  returning gastos.id into v_gasto_id;

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
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  select g.espacio_id
  into v_espacio_id
  from public.gastos g
  join public.espacios e on e.id = g.espacio_id
  join public.membresias m on m.espacio_id = g.espacio_id
  where g.id = p_gasto_id
    and m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO';

  if not found then
    raise exception 'El gasto no pertenece a un espacio compartido activo al que tengas acceso.';
  end if;

  if p_categoria_id is null or not exists (
    select 1 from public.categorias c
    where c.id = p_categoria_id
      and c.espacio_id = v_espacio_id
      and c.estado = 'ACTIVA'
  ) then
    raise exception 'La categoría no pertenece al espacio compartido activo o está archivada.';
  end if;

  if p_pagado_por_membresia_id is null or not exists (
    select 1 from public.membresias m
    where m.id = p_pagado_por_membresia_id
      and m.espacio_id = v_espacio_id
      and m.estado = 'ACTIVA'
  ) then
    raise exception 'El pagador debe ser un integrante activo del espacio compartido.';
  end if;

  if p_monto is null or p_monto <= 0 or p_monto = 'NaN'::numeric then
    raise exception 'El monto debe ser mayor a cero.';
  end if;

  if p_monto <> pg_catalog.round(p_monto, 2) then
    raise exception 'El monto no puede tener más de dos decimales.';
  end if;

  if p_fecha is null then
    raise exception 'La fecha es obligatoria.';
  end if;

  update public.gastos as g
  set categoria_id = p_categoria_id,
      pagado_por_membresia_id = p_pagado_por_membresia_id,
      monto = p_monto,
      fecha = p_fecha,
      descripcion = NULLIF(pg_catalog.btrim(p_descripcion), ''),
      fecha_modificacion = now()
  where g.id = p_gasto_id
    and g.espacio_id = v_espacio_id;
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
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  select g.espacio_id
  into v_espacio_id
  from public.gastos g
  join public.espacios e on e.id = g.espacio_id
  join public.membresias m on m.espacio_id = g.espacio_id
  where g.id = p_gasto_id
    and m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO';

  if not found then
    raise exception 'El gasto no pertenece a un espacio compartido activo al que tengas acceso.';
  end if;

  delete from public.gastos as g
  where g.id = p_gasto_id
    and g.espacio_id = v_espacio_id;
end;
$$;

revoke execute on function public.delete_shared_expense(uuid) from public;
revoke execute on function public.delete_shared_expense(uuid) from anon;
grant execute on function public.delete_shared_expense(uuid) to authenticated;

create or replace function public.create_shared_category(
  p_espacio_id uuid,
  p_nombre text
)
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
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if not exists (
    select 1
    from public.membresias m
    join public.espacios e on e.id = m.espacio_id
    where m.usuario_id = v_user_id
      and m.espacio_id = p_espacio_id
      and m.estado = 'ACTIVA'
      and e.tipo = 'COMPARTIDO'
      and e.estado = 'ACTIVO'
  ) then
    raise exception 'No tenés acceso activo a este espacio compartido.';
  end if;

  if v_nombre is null or v_nombre = '' then
    raise exception 'El nombre de la categoría no puede estar vacío.';
  end if;

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
  p_archivar boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_estado text;
  v_nombre text;
  v_archivar boolean := coalesce(p_archivar, false);
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  select c.estado
  into v_estado
  from public.categorias c
  join public.espacios e on e.id = c.espacio_id
  join public.membresias m on m.espacio_id = c.espacio_id
  where c.id = p_categoria_id
    and m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO';

  if not found then
    raise exception 'La categoría no pertenece a un espacio compartido activo al que tengas acceso.';
  end if;

  if p_nombre is null and not v_archivar then
    raise exception 'No se indicó ningún cambio para la categoría.';
  end if;

  if p_nombre is not null then
    v_nombre := pg_catalog.btrim(p_nombre);
    if v_nombre = '' then
      raise exception 'El nombre de la categoría no puede estar vacío.';
    end if;
  end if;

  if v_archivar and v_estado <> 'ACTIVA' then
    raise exception 'Sólo se puede archivar una categoría activa.';
  end if;

  update public.categorias as c
  set nombre = coalesce(v_nombre, c.nombre),
      estado = case when v_archivar then 'ARCHIVADA' else c.estado end
  where c.id = p_categoria_id;
end;
$$;

revoke execute on function public.update_shared_category(uuid, text, boolean) from public;
revoke execute on function public.update_shared_category(uuid, text, boolean) from anon;
grant execute on function public.update_shared_category(uuid, text, boolean) to authenticated;

create or replace function public.delete_shared_category(p_categoria_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if not exists (
    select 1
    from public.categorias c
    join public.espacios e on e.id = c.espacio_id
    join public.membresias m on m.espacio_id = c.espacio_id
    where c.id = p_categoria_id
      and m.usuario_id = v_user_id
      and m.estado = 'ACTIVA'
      and e.tipo = 'COMPARTIDO'
      and e.estado = 'ACTIVO'
  ) then
    raise exception 'La categoría no pertenece a un espacio compartido activo al que tengas acceso.';
  end if;

  if exists (
    select 1 from public.gastos g
    where g.categoria_id = p_categoria_id
  ) then
    raise exception 'No se puede eliminar la categoría porque tiene gastos asociados.';
  end if;

  delete from public.categorias as c
  where c.id = p_categoria_id;
end;
$$;

revoke execute on function public.delete_shared_category(uuid) from public;
revoke execute on function public.delete_shared_category(uuid) from anon;
grant execute on function public.delete_shared_category(uuid) to authenticated;
