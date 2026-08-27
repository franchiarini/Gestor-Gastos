do $$
begin
  if exists (
    select 1
    from public.gastos as g
    where g.monto in (
      'NaN'::numeric,
      'Infinity'::numeric,
      '-Infinity'::numeric
    )
  ) then
    raise exception 'Se encontraron gastos con montos no finitos. Revisá y corregí esos datos manualmente antes de aplicar esta migración.';
  end if;

  if exists (
    select 1
    from public.ingresos as i
    where i.monto in (
      'NaN'::numeric,
      'Infinity'::numeric,
      '-Infinity'::numeric
    )
  ) then
    raise exception 'Se encontraron ingresos personales con montos no finitos. Revisá y corregí esos datos manualmente antes de aplicar esta migración.';
  end if;
end;
$$;

alter table public.gastos
drop constraint if exists gastos_monto_positive_check;

alter table public.gastos
add constraint gastos_monto_positive_check
check (
  monto > 0
  and monto not in (
    'NaN'::numeric,
    'Infinity'::numeric,
    '-Infinity'::numeric
  )
);

alter table public.ingresos
drop constraint if exists ingresos_monto_positive_check;

alter table public.ingresos
add constraint ingresos_monto_positive_check
check (
  monto > 0
  and monto not in (
    'NaN'::numeric,
    'Infinity'::numeric,
    '-Infinity'::numeric
  )
);

create or replace function public.create_personal_expense(
  p_categoria_id uuid,
  p_monto numeric,
  p_fecha date default null,
  p_descripcion text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_espacio_id uuid;
  v_membresia_id uuid;
  v_categoria_id uuid;
  v_gasto_id uuid;
  v_descripcion text;
  v_fecha date;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  select m.id, m.espacio_id
  into v_membresia_id, v_espacio_id
  from public.membresias m
  join public.espacios e on e.id = m.espacio_id
  where m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
    and e.tipo = 'PERSONAL'
    and e.estado = 'ACTIVO';

  if not found then
    raise exception 'No se encontró un espacio personal activo para el usuario.';
  end if;

  if p_categoria_id is null then
    raise exception 'La categoría es obligatoria.';
  end if;

  select c.id
  into v_categoria_id
  from public.categorias c
  where c.id = p_categoria_id
    and c.espacio_id = v_espacio_id
    and c.estado = 'ACTIVA';

  if not found then
    raise exception 'La categoría no pertenece al espacio personal activo.';
  end if;

  if p_monto is null
    or p_monto in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
    or p_monto <= 0
  then
    raise exception 'El monto debe ser un valor numérico finito mayor a cero.';
  end if;

  if p_monto <> pg_catalog.round(p_monto, 2) then
    raise exception 'El monto no puede tener más de dos decimales.';
  end if;

  v_fecha := coalesce(p_fecha, current_date);
  v_descripcion := NULLIF(pg_catalog.btrim(p_descripcion), '');

  insert into public.gastos (
    espacio_id,
    categoria_id,
    pagado_por_membresia_id,
    registrado_por_membresia_id,
    monto,
    fecha,
    descripcion
  )
  values (
    v_espacio_id,
    v_categoria_id,
    v_membresia_id,
    v_membresia_id,
    p_monto,
    v_fecha,
    v_descripcion
  )
  returning id into v_gasto_id;

  return v_gasto_id;
end;
$$;

revoke execute on function public.create_personal_expense(uuid, numeric, date, text) from public;
revoke execute on function public.create_personal_expense(uuid, numeric, date, text) from anon;
grant execute on function public.create_personal_expense(uuid, numeric, date, text) to authenticated;

create or replace function public.update_personal_expense(
  p_gasto_id uuid,
  p_categoria_id uuid,
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

  select m.espacio_id
  into v_espacio_id
  from public.membresias m
  join public.espacios e on e.id = m.espacio_id
  where m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
    and e.tipo = 'PERSONAL'
    and e.estado = 'ACTIVO';

  if not found then
    raise exception 'No se encontró un espacio personal activo para el usuario.';
  end if;

  if p_gasto_id is null or not exists (
    select 1
    from public.gastos g
    where g.id = p_gasto_id
      and g.espacio_id = v_espacio_id
  ) then
    raise exception 'El gasto no pertenece al espacio personal activo.';
  end if;

  if p_categoria_id is null or not exists (
    select 1
    from public.categorias c
    where c.id = p_categoria_id
      and c.espacio_id = v_espacio_id
      and c.estado = 'ACTIVA'
  ) then
    raise exception 'La categoría no pertenece al espacio personal activo o está archivada.';
  end if;

  if p_monto is null
    or p_monto in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
    or p_monto <= 0
  then
    raise exception 'El monto debe ser un valor numérico finito mayor a cero.';
  end if;

  if p_monto <> pg_catalog.round(p_monto, 2) then
    raise exception 'El monto no puede tener más de dos decimales.';
  end if;

  if p_fecha is null then
    raise exception 'La fecha es obligatoria.';
  end if;

  update public.gastos
  set categoria_id = p_categoria_id,
      monto = p_monto,
      fecha = p_fecha,
      descripcion = NULLIF(pg_catalog.btrim(p_descripcion), ''),
      fecha_modificacion = now()
  where id = p_gasto_id
    and espacio_id = v_espacio_id;
end;
$$;

revoke execute on function public.update_personal_expense(uuid, uuid, numeric, date, text) from public;
revoke execute on function public.update_personal_expense(uuid, uuid, numeric, date, text) from anon;
grant execute on function public.update_personal_expense(uuid, uuid, numeric, date, text) to authenticated;

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
  if p_monto is null
    or p_monto in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
    or p_monto <= 0
  then raise exception 'El monto debe ser un valor numérico finito mayor a cero.'; end if;
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
  if p_monto is null
    or p_monto in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
    or p_monto <= 0
  then raise exception 'El monto debe ser un valor numérico finito mayor a cero.'; end if;
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

  if p_monto is null
    or p_monto in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
    or p_monto <= 0
  then
    raise exception 'El monto debe ser un valor numérico finito mayor a cero.';
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

  if p_monto is null
    or p_monto in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
    or p_monto <= 0
  then
    raise exception 'El monto debe ser un valor numérico finito mayor a cero.';
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
