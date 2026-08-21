create or replace function public.archive_shared_space(p_espacio_id uuid)
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_espacio_id::text, 0)
  );

  if not exists (
    select 1
    from public.espacios e
    join public.membresias m on m.espacio_id = e.id
    where e.id = p_espacio_id
      and e.tipo = 'COMPARTIDO'
      and e.estado = 'ACTIVO'
      and m.usuario_id = v_user_id
      and m.estado = 'ACTIVA'
      and m.rol = 'ADMIN'
  ) then
    raise exception 'Se requiere una membresía de administrador activa en un espacio compartido activo.';
  end if;

  update public.espacios as e
  set estado = 'ARCHIVADO'
  where e.id = p_espacio_id
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO';
end;
$$;

revoke execute on function public.archive_shared_space(uuid) from public;
revoke execute on function public.archive_shared_space(uuid) from anon;
grant execute on function public.archive_shared_space(uuid) to authenticated;

create or replace function public.reactivate_shared_space(p_espacio_id uuid)
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_espacio_id::text, 0)
  );

  if not exists (
    select 1
    from public.espacios e
    join public.membresias m on m.espacio_id = e.id
    where e.id = p_espacio_id
      and e.tipo = 'COMPARTIDO'
      and e.estado = 'ARCHIVADO'
      and m.usuario_id = v_user_id
      and m.estado = 'ACTIVA'
      and m.rol = 'ADMIN'
  ) then
    raise exception 'Se requiere una membresía de administrador activa en un espacio compartido archivado.';
  end if;

  update public.espacios as e
  set estado = 'ACTIVO'
  where e.id = p_espacio_id
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ARCHIVADO';
end;
$$;

revoke execute on function public.reactivate_shared_space(uuid) from public;
revoke execute on function public.reactivate_shared_space(uuid) from anon;
grant execute on function public.reactivate_shared_space(uuid) to authenticated;

create or replace function public.get_shared_space_members(p_espacio_id uuid)
returns table (membresia_id uuid, nombre text, rol text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Se requiere un usuario autenticado.'; end if;
  if not exists (
    select 1 from public.membresias m
    join public.espacios e on e.id = m.espacio_id
    where m.usuario_id = v_user_id and m.espacio_id = p_espacio_id
      and m.estado = 'ACTIVA' and e.tipo = 'COMPARTIDO'
      and e.estado in ('ACTIVO', 'ARCHIVADO')
  ) then
    raise exception 'No tenés acceso activo a este espacio compartido.';
  end if;
  return query
  select m.id, u.nombre, m.rol
  from public.membresias m
  join public.usuarios u on u.id = m.usuario_id
  where m.espacio_id = p_espacio_id and m.estado = 'ACTIVA'
  order by u.nombre asc, m.id asc;
end;
$$;

revoke execute on function public.get_shared_space_members(uuid) from public;
revoke execute on function public.get_shared_space_members(uuid) from anon;
grant execute on function public.get_shared_space_members(uuid) to authenticated;

create or replace function public.get_shared_expenses(p_espacio_id uuid)
returns table (
  gasto_id uuid, categoria_id uuid, categoria_nombre text,
  pagado_por_membresia_id uuid, pagado_por_nombre text,
  registrado_por_membresia_id uuid, registrado_por_nombre text,
  monto numeric, fecha date, descripcion text,
  fecha_creacion timestamptz, fecha_modificacion timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Se requiere un usuario autenticado.'; end if;
  if not exists (
    select 1 from public.membresias m
    join public.espacios e on e.id = m.espacio_id
    where m.usuario_id = v_user_id and m.espacio_id = p_espacio_id
      and m.estado = 'ACTIVA' and e.tipo = 'COMPARTIDO'
      and e.estado in ('ACTIVO', 'ARCHIVADO')
  ) then
    raise exception 'No tenés acceso activo a este espacio compartido.';
  end if;
  return query
  select g.id, g.categoria_id, c.nombre,
    g.pagado_por_membresia_id, pagador.nombre,
    g.registrado_por_membresia_id, registrador.nombre,
    g.monto, g.fecha, g.descripcion, g.fecha_creacion, g.fecha_modificacion
  from public.gastos g
  join public.categorias c on c.id = g.categoria_id
  join public.membresias mp on mp.id = g.pagado_por_membresia_id
  join public.usuarios pagador on pagador.id = mp.usuario_id
  join public.membresias mr on mr.id = g.registrado_por_membresia_id
  join public.usuarios registrador on registrador.id = mr.usuario_id
  where g.espacio_id = p_espacio_id
  order by g.fecha desc, g.fecha_creacion desc, g.id desc;
end;
$$;

revoke execute on function public.get_shared_expenses(uuid) from public;
revoke execute on function public.get_shared_expenses(uuid) from anon;
grant execute on function public.get_shared_expenses(uuid) to authenticated;

create or replace function public.get_shared_space_management(p_espacio_id uuid)
returns table (espacio_id uuid, nombre text, codigo_acceso text, membresia_id uuid, rol text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Se requiere un usuario autenticado.'; end if;
  return query
  select e.id, e.nombre, e.codigo_acceso, m.id, m.rol
  from public.espacios e
  join public.membresias m on m.espacio_id = e.id
  where e.id = p_espacio_id and e.tipo = 'COMPARTIDO'
    and e.estado in ('ACTIVO', 'ARCHIVADO')
    and m.usuario_id = v_user_id and m.estado = 'ACTIVA';
  if not found then raise exception 'No tenés acceso activo a este espacio compartido.'; end if;
end;
$$;

revoke execute on function public.get_shared_space_management(uuid) from public;
revoke execute on function public.get_shared_space_management(uuid) from anon;
grant execute on function public.get_shared_space_management(uuid) to authenticated;
