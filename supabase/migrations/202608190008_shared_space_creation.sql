create extension if not exists pgcrypto with schema extensions;

alter table public.espacios
add constraint espacios_codigo_acceso_format_check
check (
  codigo_acceso is null
  or codigo_acceso ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'
);

alter table public.espacios
add constraint espacios_codigo_acceso_unique unique (codigo_acceso);

create or replace function public.create_shared_space(
  p_nombre text
)
returns table (
  id uuid,
  nombre text,
  codigo_acceso text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_nombre text := pg_catalog.btrim(p_nombre);
  v_espacio_id uuid;
  v_codigo text;
  v_bytes bytea;
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

  if v_nombre is null or v_nombre = '' then
    raise exception 'El nombre del espacio no puede estar vacío.';
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

    begin
      insert into public.espacios (nombre, tipo, estado, codigo_acceso)
      values (v_nombre, 'COMPARTIDO', 'ACTIVO', v_codigo)
      returning espacios.id into v_espacio_id;

      exit;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  insert into public.membresias (usuario_id, espacio_id, rol, estado)
  values (v_user_id, v_espacio_id, 'ADMIN', 'ACTIVA');

  insert into public.categorias (espacio_id, nombre)
  values
    (v_espacio_id, 'Supermercado'),
    (v_espacio_id, 'Salidas / Delivery'),
    (v_espacio_id, 'Servicios'),
    (v_espacio_id, 'Transporte'),
    (v_espacio_id, 'Suscripciones'),
    (v_espacio_id, 'Salud'),
    (v_espacio_id, 'Entretenimiento'),
    (v_espacio_id, 'Otros');

  return query
  select v_espacio_id, v_nombre, v_codigo;
end;
$$;

revoke execute on function public.create_shared_space(text) from public;
revoke execute on function public.create_shared_space(text) from anon;
grant execute on function public.create_shared_space(text) to authenticated;
