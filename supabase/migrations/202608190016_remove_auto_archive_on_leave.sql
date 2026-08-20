create or replace function public.leave_shared_space(p_espacio_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_membresia_id uuid;
  v_rol text;
  v_admins_activos integer;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_espacio_id::text, 0)
  );

  select m.id, m.rol
  into v_membresia_id, v_rol
  from public.espacios e
  join public.membresias m on m.espacio_id = e.id
  where e.id = p_espacio_id
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO'
    and m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
  for update of e, m;

  if not found then
    raise exception 'No tenés una membresía activa en este espacio compartido.';
  end if;

  select pg_catalog.count(*)::integer
  into v_admins_activos
  from public.membresias m
  where m.espacio_id = p_espacio_id
    and m.estado = 'ACTIVA'
    and m.rol = 'ADMIN';

  if v_rol = 'ADMIN' and v_admins_activos = 1 then
    raise exception 'No podés abandonar el espacio siendo el único administrador activo. Promové primero a otro integrante.';
  end if;

  update public.membresias as m
  set estado = 'FINALIZADA',
      fecha_salida = now(),
      motivo_salida = 'ABANDONO'
  where m.id = v_membresia_id;
end;
$$;

revoke execute on function public.leave_shared_space(uuid) from public;
revoke execute on function public.leave_shared_space(uuid) from anon;
grant execute on function public.leave_shared_space(uuid) to authenticated;
