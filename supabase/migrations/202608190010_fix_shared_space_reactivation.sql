create or replace function public.join_shared_space_by_code(
  p_codigo text
)
returns table (
  espacio_id uuid,
  nombre text,
  resultado text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_codigo text := pg_catalog.upper(
    pg_catalog.replace(pg_catalog.btrim(p_codigo), '-', '')
  );
  v_espacio_id uuid;
  v_nombre text;
  v_membresia_estado text;
  v_resultado text;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if not exists (
    select 1
    from public.usuarios u
    where u.id = v_user_id
  ) then
    raise exception 'El usuario autenticado no existe en el dominio.';
  end if;

  if v_codigo is null
    or v_codigo !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' then
    raise exception 'El código de acceso no es válido.';
  end if;

  select e.id, e.nombre
  into v_espacio_id, v_nombre
  from public.espacios e
  where e.codigo_acceso = v_codigo
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO'
  for share;

  if not found then
    raise exception 'El código no corresponde a un espacio compartido activo.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || v_espacio_id::text, 0)
  );

  select m.estado
  into v_membresia_estado
  from public.membresias m
  where m.usuario_id = v_user_id
    and m.espacio_id = v_espacio_id
  for update;

  if not found then
    insert into public.membresias (
      usuario_id,
      espacio_id,
      rol,
      estado,
      fecha_salida
    )
    values (v_user_id, v_espacio_id, 'INTEGRANTE', 'ACTIVA', null);

    v_resultado := 'JOINED';
  elsif v_membresia_estado = 'FINALIZADA' then
    update public.membresias as m
    set estado = 'ACTIVA',
        rol = 'INTEGRANTE',
        fecha_salida = null
    where m.usuario_id = v_user_id
      and m.espacio_id = v_espacio_id;

    v_resultado := 'REACTIVATED';
  else
    v_resultado := 'ALREADY_MEMBER';
  end if;

  return query
  select v_espacio_id, v_nombre, v_resultado;
end;
$$;

revoke execute on function public.join_shared_space_by_code(text) from public;
revoke execute on function public.join_shared_space_by_code(text) from anon;
grant execute on function public.join_shared_space_by_code(text) to authenticated;
