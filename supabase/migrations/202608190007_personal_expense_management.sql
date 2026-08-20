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

  if p_monto is null or p_monto <= 0 or p_monto = 'NaN'::numeric then
    raise exception 'El monto debe ser mayor a cero.';
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

create or replace function public.delete_personal_expense(
  p_gasto_id uuid
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

  delete from public.gastos
  where id = p_gasto_id
    and espacio_id = v_espacio_id;

  if not found then
    raise exception 'El gasto no pertenece al espacio personal activo.';
  end if;
end;
$$;

revoke execute on function public.delete_personal_expense(uuid) from public;
revoke execute on function public.delete_personal_expense(uuid) from anon;
grant execute on function public.delete_personal_expense(uuid) to authenticated;

create or replace function public.delete_personal_category(
  p_categoria_id uuid
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
    and m.rol = 'ADMIN'
    and e.tipo = 'PERSONAL'
    and e.estado = 'ACTIVO';

  if not found then
    raise exception 'Se requiere una membresía de administrador activa en el espacio personal.';
  end if;

  if p_categoria_id is null or not exists (
    select 1
    from public.categorias c
    where c.id = p_categoria_id
      and c.espacio_id = v_espacio_id
  ) then
    raise exception 'La categoría no pertenece al espacio personal.';
  end if;

  if exists (
    select 1
    from public.gastos g
    where g.categoria_id = p_categoria_id
  ) then
    raise exception 'No se puede eliminar la categoría porque tiene gastos asociados.';
  end if;

  delete from public.categorias
  where id = p_categoria_id
    and espacio_id = v_espacio_id;
end;
$$;

revoke execute on function public.delete_personal_category(uuid) from public;
revoke execute on function public.delete_personal_category(uuid) from anon;
grant execute on function public.delete_personal_category(uuid) to authenticated;
