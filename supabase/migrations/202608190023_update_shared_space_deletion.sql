create or replace function public.delete_shared_space(p_espacio_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tipo text;
  v_membresia_id uuid;
  v_total_membresias_activas bigint;
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

  select e.tipo
  into v_tipo
  from public.espacios e
  where e.id = p_espacio_id
  for update;

  if not found then
    raise exception 'El espacio compartido no existe.';
  end if;

  if v_tipo <> 'COMPARTIDO' then
    raise exception 'Sólo se pueden eliminar espacios compartidos.';
  end if;

  select m.id
  into v_membresia_id
  from public.membresias m
  where m.espacio_id = p_espacio_id
    and m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
    and m.rol = 'ADMIN'
  for update;

  if not found then
    raise exception 'Se requiere una membresía de administrador activa en el espacio compartido.';
  end if;

  select pg_catalog.count(*)
  into v_total_membresias_activas
  from public.membresias m
  where m.espacio_id = p_espacio_id
    and m.estado = 'ACTIVA';

  if v_total_membresias_activas <> 1 then
    raise exception 'Debés ser el único integrante activo para eliminar definitivamente el espacio.';
  end if;

  delete from public.gastos g
  where g.espacio_id = p_espacio_id;

  delete from public.categorias c
  where c.espacio_id = p_espacio_id;

  delete from public.membresias m
  where m.espacio_id = p_espacio_id;

  delete from public.espacios e
  where e.id = p_espacio_id;
end;
$$;

revoke execute on function public.delete_shared_space(uuid) from public;
revoke execute on function public.delete_shared_space(uuid) from anon;
grant execute on function public.delete_shared_space(uuid) to authenticated;

drop function if exists public.delete_empty_shared_space(uuid);
