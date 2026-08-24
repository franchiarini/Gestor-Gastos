create or replace function public.delete_empty_shared_space(p_espacio_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tipo text;
  v_estado text;
  v_membresia_usuario_id uuid;
  v_membresia_rol text;
  v_membresia_estado text;
  v_total_membresias bigint;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if p_espacio_id is null then
    raise exception 'El espacio es obligatorio.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_espacio_id::text, 0)
  );

  select e.tipo, e.estado
  into v_tipo, v_estado
  from public.espacios e
  where e.id = p_espacio_id
  for update;

  if not found then
    raise exception 'El espacio compartido no existe.';
  end if;

  if v_tipo <> 'COMPARTIDO' then
    raise exception 'Sólo se pueden eliminar espacios compartidos.';
  end if;

  if v_estado <> 'ACTIVO' then
    raise exception 'Un espacio archivado no se puede eliminar definitivamente.';
  end if;

  select m.usuario_id, m.rol, m.estado
  into v_membresia_usuario_id, v_membresia_rol, v_membresia_estado
  from public.membresias m
  where m.espacio_id = p_espacio_id
    and m.usuario_id = v_user_id
  for update;

  if not found or v_membresia_estado <> 'ACTIVA' then
    raise exception 'Se requiere una membresía activa en el espacio compartido.';
  end if;

  if v_membresia_rol <> 'ADMIN' then
    raise exception 'Sólo un administrador puede eliminar el espacio compartido.';
  end if;

  select pg_catalog.count(*)
  into v_total_membresias
  from public.membresias m
  where m.espacio_id = p_espacio_id;

  if v_total_membresias <> 1 or v_membresia_usuario_id <> v_user_id then
    raise exception 'El espacio no se puede eliminar porque tuvo otros integrantes.';
  end if;

  if exists (
    select 1
    from public.gastos g
    where g.espacio_id = p_espacio_id
  ) then
    raise exception 'El espacio no se puede eliminar porque tiene gastos asociados.';
  end if;

  delete from public.categorias c
  where c.espacio_id = p_espacio_id;

  delete from public.membresias m
  where m.espacio_id = p_espacio_id
    and m.usuario_id = v_user_id;

  delete from public.espacios e
  where e.id = p_espacio_id;
end;
$$;

revoke execute on function public.delete_empty_shared_space(uuid) from public;
revoke execute on function public.delete_empty_shared_space(uuid) from anon;
grant execute on function public.delete_empty_shared_space(uuid) to authenticated;
