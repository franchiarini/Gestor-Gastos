create or replace function public.get_shared_space_management(
  p_espacio_id uuid
)
returns table (
  espacio_id uuid,
  nombre text,
  codigo_acceso text,
  membresia_id uuid,
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

  return query
  select e.id, e.nombre, e.codigo_acceso, m.id, m.rol
  from public.espacios e
  join public.membresias m on m.espacio_id = e.id
  where e.id = p_espacio_id
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO'
    and m.usuario_id = v_user_id
    and m.estado = 'ACTIVA';

  if not found then
    raise exception 'No tenés acceso activo a este espacio compartido.';
  end if;
end;
$$;

revoke execute on function public.get_shared_space_management(uuid) from public;
revoke execute on function public.get_shared_space_management(uuid) from anon;
grant execute on function public.get_shared_space_management(uuid) to authenticated;

create or replace function public.regenerate_shared_space_code(
  p_espacio_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_codigo_actual text;
  v_codigo text;
  v_bytes bytea;
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  select e.codigo_acceso
  into v_codigo_actual
  from public.espacios e
  join public.membresias m on m.espacio_id = e.id
  where e.id = p_espacio_id
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO'
    and m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
    and m.rol = 'ADMIN'
  for update of e;

  if not found then
    raise exception 'Se requiere una membresía de administrador activa en el espacio compartido.';
  end if;

  loop
    v_bytes := extensions.gen_random_bytes(8);
    v_codigo := '';

    for v_indice in 0..7 loop
      v_codigo := v_codigo || pg_catalog.substr(
        v_alfabeto,
        (pg_catalog.get_byte(v_bytes, v_indice) % 32) + 1,
        1
      );
    end loop;

    if v_codigo = v_codigo_actual then
      continue;
    end if;

    begin
      update public.espacios as e
      set codigo_acceso = v_codigo
      where e.id = p_espacio_id;

      exit;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  return v_codigo;
end;
$$;

revoke execute on function public.regenerate_shared_space_code(uuid) from public;
revoke execute on function public.regenerate_shared_space_code(uuid) from anon;
grant execute on function public.regenerate_shared_space_code(uuid) to authenticated;

create or replace function public.promote_shared_space_member(
  p_espacio_id uuid,
  p_membresia_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rol_objetivo text;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

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
    raise exception 'Se requiere una membresía de administrador activa en el espacio compartido.';
  end if;

  select m.rol
  into v_rol_objetivo
  from public.membresias m
  where m.id = p_membresia_id
    and m.espacio_id = p_espacio_id
    and m.estado = 'ACTIVA'
  for update;

  if not found then
    raise exception 'La membresía objetivo no es un integrante activo de este espacio.';
  end if;

  if v_rol_objetivo <> 'INTEGRANTE' then
    raise exception 'La membresía objetivo ya es administradora.';
  end if;

  update public.membresias as m
  set rol = 'ADMIN'
  where m.id = p_membresia_id
    and m.espacio_id = p_espacio_id;
end;
$$;

revoke execute on function public.promote_shared_space_member(uuid, uuid) from public;
revoke execute on function public.promote_shared_space_member(uuid, uuid) from anon;
grant execute on function public.promote_shared_space_member(uuid, uuid) to authenticated;
