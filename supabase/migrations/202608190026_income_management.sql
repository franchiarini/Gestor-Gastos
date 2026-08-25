create or replace function public.create_income_category(p_nombre text)
returns table (
  categoria_id uuid,
  categoria_nombre text,
  categoria_estado text,
  fecha_creacion timestamptz,
  fecha_modificacion timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_nombre text := pg_catalog.btrim(p_nombre);
  v_categoria_id uuid;
  v_fecha_creacion timestamptz;
  v_fecha_modificacion timestamptz;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if not exists (
    select 1
    from public.usuarios as u
    where u.id = v_user_id
  ) then
    raise exception 'No se encontró el usuario autenticado.';
  end if;

  if v_nombre is null or v_nombre = '' then
    raise exception 'El nombre de la categoría no puede estar vacío.';
  end if;

  if exists (
    select 1
    from public.categorias_ingreso as c
    where c.usuario_id = v_user_id
      and pg_catalog.lower(pg_catalog.btrim(c.nombre))
        = pg_catalog.lower(v_nombre)
  ) then
    raise exception 'Ya existe una categoría de ingreso con ese nombre.';
  end if;

  begin
    insert into public.categorias_ingreso (
      usuario_id,
      nombre,
      estado
    )
    values (
      v_user_id,
      v_nombre,
      'ACTIVA'
    )
    returning
      categorias_ingreso.id,
      categorias_ingreso.fecha_creacion,
      categorias_ingreso.fecha_modificacion
    into
      v_categoria_id,
      v_fecha_creacion,
      v_fecha_modificacion;
  exception
    when unique_violation then
      raise exception 'Ya existe una categoría de ingreso con ese nombre.';
  end;

  return query
  select
    v_categoria_id,
    v_nombre,
    'ACTIVA'::text,
    v_fecha_creacion,
    v_fecha_modificacion;
end;
$$;

revoke execute on function public.create_income_category(text) from public;
revoke execute on function public.create_income_category(text) from anon;
grant execute on function public.create_income_category(text) to authenticated;

create or replace function public.rename_income_category(
  p_categoria_id uuid,
  p_nombre text
)
returns table (
  categoria_id uuid,
  categoria_nombre text,
  categoria_estado text,
  fecha_creacion timestamptz,
  fecha_modificacion timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_nombre text := pg_catalog.btrim(p_nombre);
  v_estado text;
  v_fecha_creacion timestamptz;
  v_fecha_modificacion timestamptz;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if p_categoria_id is null then
    raise exception 'La categoría es obligatoria.';
  end if;

  if v_nombre is null or v_nombre = '' then
    raise exception 'El nombre de la categoría no puede estar vacío.';
  end if;

  select c.estado, c.fecha_creacion
  into v_estado, v_fecha_creacion
  from public.categorias_ingreso as c
  where c.id = p_categoria_id
    and c.usuario_id = v_user_id
  for update;

  if not found then
    raise exception 'La categoría de ingreso no existe o no pertenece al usuario.';
  end if;

  if exists (
    select 1
    from public.categorias_ingreso as c
    where c.usuario_id = v_user_id
      and c.id <> p_categoria_id
      and pg_catalog.lower(pg_catalog.btrim(c.nombre))
        = pg_catalog.lower(v_nombre)
  ) then
    raise exception 'Ya existe otra categoría de ingreso con ese nombre.';
  end if;

  begin
    update public.categorias_ingreso as c
    set nombre = v_nombre,
        fecha_modificacion = now()
    where c.id = p_categoria_id
      and c.usuario_id = v_user_id
    returning c.fecha_modificacion into v_fecha_modificacion;
  exception
    when unique_violation then
      raise exception 'Ya existe otra categoría de ingreso con ese nombre.';
  end;

  return query
  select
    p_categoria_id,
    v_nombre,
    v_estado,
    v_fecha_creacion,
    v_fecha_modificacion;
end;
$$;

revoke execute on function public.rename_income_category(uuid, text) from public;
revoke execute on function public.rename_income_category(uuid, text) from anon;
grant execute on function public.rename_income_category(uuid, text) to authenticated;

create or replace function public.archive_income_category(p_categoria_id uuid)
returns table (
  categoria_id uuid,
  categoria_nombre text,
  categoria_estado text,
  fecha_creacion timestamptz,
  fecha_modificacion timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_nombre text;
  v_estado text;
  v_fecha_creacion timestamptz;
  v_fecha_modificacion timestamptz;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if p_categoria_id is null then
    raise exception 'La categoría es obligatoria.';
  end if;

  select c.nombre, c.estado, c.fecha_creacion
  into v_nombre, v_estado, v_fecha_creacion
  from public.categorias_ingreso as c
  where c.id = p_categoria_id
    and c.usuario_id = v_user_id
  for update;

  if not found then
    raise exception 'La categoría de ingreso no existe o no pertenece al usuario.';
  end if;

  if v_estado <> 'ACTIVA' then
    raise exception 'Sólo se puede archivar una categoría de ingreso activa.';
  end if;

  update public.categorias_ingreso as c
  set estado = 'ARCHIVADA',
      fecha_modificacion = now()
  where c.id = p_categoria_id
    and c.usuario_id = v_user_id
  returning c.fecha_modificacion into v_fecha_modificacion;

  return query
  select
    p_categoria_id,
    v_nombre,
    'ARCHIVADA'::text,
    v_fecha_creacion,
    v_fecha_modificacion;
end;
$$;

revoke execute on function public.archive_income_category(uuid) from public;
revoke execute on function public.archive_income_category(uuid) from anon;
grant execute on function public.archive_income_category(uuid) to authenticated;

create or replace function public.restore_income_category(p_categoria_id uuid)
returns table (
  categoria_id uuid,
  categoria_nombre text,
  categoria_estado text,
  fecha_creacion timestamptz,
  fecha_modificacion timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_nombre text;
  v_estado text;
  v_fecha_creacion timestamptz;
  v_fecha_modificacion timestamptz;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if p_categoria_id is null then
    raise exception 'La categoría es obligatoria.';
  end if;

  select c.nombre, c.estado, c.fecha_creacion
  into v_nombre, v_estado, v_fecha_creacion
  from public.categorias_ingreso as c
  where c.id = p_categoria_id
    and c.usuario_id = v_user_id
  for update;

  if not found then
    raise exception 'La categoría de ingreso no existe o no pertenece al usuario.';
  end if;

  if v_estado <> 'ARCHIVADA' then
    raise exception 'Sólo se puede restaurar una categoría de ingreso archivada.';
  end if;

  if exists (
    select 1
    from public.categorias_ingreso as c
    where c.usuario_id = v_user_id
      and c.id <> p_categoria_id
      and pg_catalog.lower(pg_catalog.btrim(c.nombre))
        = pg_catalog.lower(pg_catalog.btrim(v_nombre))
  ) then
    raise exception 'Ya existe otra categoría de ingreso con ese nombre.';
  end if;

  begin
    update public.categorias_ingreso as c
    set estado = 'ACTIVA',
        fecha_modificacion = now()
    where c.id = p_categoria_id
      and c.usuario_id = v_user_id
    returning c.fecha_modificacion into v_fecha_modificacion;
  exception
    when unique_violation then
      raise exception 'Ya existe otra categoría de ingreso con ese nombre.';
  end;

  return query
  select
    p_categoria_id,
    v_nombre,
    'ACTIVA'::text,
    v_fecha_creacion,
    v_fecha_modificacion;
end;
$$;

revoke execute on function public.restore_income_category(uuid) from public;
revoke execute on function public.restore_income_category(uuid) from anon;
grant execute on function public.restore_income_category(uuid) to authenticated;

create or replace function public.delete_income_category(p_categoria_id uuid)
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

  if p_categoria_id is null then
    raise exception 'La categoría es obligatoria.';
  end if;

  perform 1
  from public.categorias_ingreso as c
  where c.id = p_categoria_id
    and c.usuario_id = v_user_id
  for update;

  if not found then
    raise exception 'La categoría de ingreso no existe o no pertenece al usuario.';
  end if;

  if exists (
    select 1
    from public.ingresos as i
    where i.categoria_ingreso_id = p_categoria_id
      and i.usuario_id = v_user_id
  ) then
    raise exception 'No se puede eliminar la categoría porque tiene ingresos asociados.';
  end if;

  delete from public.categorias_ingreso as c
  where c.id = p_categoria_id
    and c.usuario_id = v_user_id;
end;
$$;

revoke execute on function public.delete_income_category(uuid) from public;
revoke execute on function public.delete_income_category(uuid) from anon;
grant execute on function public.delete_income_category(uuid) to authenticated;

create or replace function public.create_income(
  p_categoria_ingreso_id uuid,
  p_monto numeric,
  p_fecha date default current_date,
  p_descripcion text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_categoria_estado text;
  v_ingreso_id uuid;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if not exists (
    select 1
    from public.usuarios as u
    where u.id = v_user_id
  ) then
    raise exception 'No se encontró el usuario autenticado.';
  end if;

  if p_categoria_ingreso_id is null then
    raise exception 'La categoría de ingreso es obligatoria.';
  end if;

  select c.estado
  into v_categoria_estado
  from public.categorias_ingreso as c
  where c.id = p_categoria_ingreso_id
    and c.usuario_id = v_user_id
  for share;

  if not found then
    raise exception 'La categoría de ingreso no existe o no pertenece al usuario.';
  end if;

  if v_categoria_estado <> 'ACTIVA' then
    raise exception 'No se puede registrar un ingreso en una categoría archivada.';
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

  if p_fecha > current_date then
    raise exception 'La fecha del ingreso no puede ser futura.';
  end if;

  insert into public.ingresos (
    usuario_id,
    categoria_ingreso_id,
    monto,
    fecha,
    descripcion
  )
  values (
    v_user_id,
    p_categoria_ingreso_id,
    p_monto,
    p_fecha,
    NULLIF(pg_catalog.btrim(p_descripcion), '')
  )
  returning ingresos.id into v_ingreso_id;

  return v_ingreso_id;
end;
$$;

revoke execute on function public.create_income(uuid, numeric, date, text) from public;
revoke execute on function public.create_income(uuid, numeric, date, text) from anon;
grant execute on function public.create_income(uuid, numeric, date, text) to authenticated;

create or replace function public.update_income(
  p_ingreso_id uuid,
  p_categoria_ingreso_id uuid,
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
  v_categoria_estado text;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if p_ingreso_id is null then
    raise exception 'El ingreso es obligatorio.';
  end if;

  perform 1
  from public.ingresos as i
  where i.id = p_ingreso_id
    and i.usuario_id = v_user_id
  for update;

  if not found then
    raise exception 'El ingreso no existe o no pertenece al usuario.';
  end if;

  if p_categoria_ingreso_id is null then
    raise exception 'La categoría de ingreso es obligatoria.';
  end if;

  select c.estado
  into v_categoria_estado
  from public.categorias_ingreso as c
  where c.id = p_categoria_ingreso_id
    and c.usuario_id = v_user_id
  for share;

  if not found then
    raise exception 'La categoría de ingreso no existe o no pertenece al usuario.';
  end if;

  if v_categoria_estado <> 'ACTIVA' then
    raise exception 'No se puede usar una categoría de ingreso archivada.';
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

  if p_fecha > current_date then
    raise exception 'La fecha del ingreso no puede ser futura.';
  end if;

  update public.ingresos as i
  set categoria_ingreso_id = p_categoria_ingreso_id,
      monto = p_monto,
      fecha = p_fecha,
      descripcion = NULLIF(pg_catalog.btrim(p_descripcion), ''),
      fecha_modificacion = now()
  where i.id = p_ingreso_id
    and i.usuario_id = v_user_id;
end;
$$;

revoke execute on function public.update_income(uuid, uuid, numeric, date, text) from public;
revoke execute on function public.update_income(uuid, uuid, numeric, date, text) from anon;
grant execute on function public.update_income(uuid, uuid, numeric, date, text) to authenticated;

create or replace function public.delete_income(p_ingreso_id uuid)
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

  if p_ingreso_id is null then
    raise exception 'El ingreso es obligatorio.';
  end if;

  delete from public.ingresos as i
  where i.id = p_ingreso_id
    and i.usuario_id = v_user_id;

  if not found then
    raise exception 'El ingreso no existe o no pertenece al usuario.';
  end if;
end;
$$;

revoke execute on function public.delete_income(uuid) from public;
revoke execute on function public.delete_income(uuid) from anon;
grant execute on function public.delete_income(uuid) to authenticated;

create or replace function public.get_incomes_page(
  p_cursor_fecha date default null,
  p_cursor_fecha_creacion timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  ingreso_id uuid,
  categoria_ingreso_id uuid,
  categoria_nombre text,
  categoria_estado text,
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

  if (p_cursor_fecha is null) <> (p_cursor_fecha_creacion is null)
    or (p_cursor_fecha is null) <> (p_cursor_id is null) then
    raise exception 'El cursor de paginación está incompleto.';
  end if;

  return query
  select
    i.id,
    i.categoria_ingreso_id,
    c.nombre,
    c.estado,
    i.monto,
    i.fecha,
    i.descripcion,
    i.fecha_creacion,
    i.fecha_modificacion
  from public.ingresos as i
  join public.categorias_ingreso as c
    on c.id = i.categoria_ingreso_id
    and c.usuario_id = i.usuario_id
  where i.usuario_id = v_user_id
    and (
      p_cursor_fecha is null
      or (i.fecha, i.fecha_creacion, i.id)
        < (p_cursor_fecha, p_cursor_fecha_creacion, p_cursor_id)
    )
  order by i.fecha desc, i.fecha_creacion desc, i.id desc
  limit 11;
end;
$$;

revoke execute on function public.get_incomes_page(date, timestamptz, uuid) from public;
revoke execute on function public.get_incomes_page(date, timestamptz, uuid) from anon;
grant execute on function public.get_incomes_page(date, timestamptz, uuid) to authenticated;
