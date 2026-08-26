alter table public.membresias
add constraint membresias_id_espacio_unique unique (id, espacio_id);

create table public.membresia_periodos (
  id uuid primary key default gen_random_uuid(),
  membresia_id uuid not null,
  espacio_id uuid not null,
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz null,
  fecha_creacion timestamptz not null default now(),
  fecha_modificacion timestamptz not null default now(),
  constraint membresia_periodos_membresia_espacio_fkey
    foreign key (membresia_id, espacio_id)
    references public.membresias(id, espacio_id)
    on delete cascade,
  constraint membresia_periodos_fechas_check
    check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

create unique index membresia_periodos_abierto_unique_idx
on public.membresia_periodos (membresia_id)
where fecha_fin is null;

create index membresia_periodos_membresia_fecha_inicio_idx
on public.membresia_periodos (
  membresia_id,
  fecha_inicio
);

create index membresia_periodos_espacio_fechas_membresia_idx
on public.membresia_periodos (
  espacio_id,
  fecha_inicio,
  fecha_fin,
  membresia_id
);

alter table public.membresia_periodos enable row level security;

revoke all on table public.membresia_periodos
from public, anon, authenticated;

insert into public.membresia_periodos (
  membresia_id,
  espacio_id,
  fecha_inicio,
  fecha_fin
)
select
  m.id,
  m.espacio_id,
  now(),
  null
from public.membresias as m
join public.espacios as e
  on e.id = m.espacio_id
where m.estado = 'ACTIVA'
  and e.tipo = 'COMPARTIDO';

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
  v_membresia_id uuid;
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
  values (v_user_id, v_espacio_id, 'ADMIN', 'ACTIVA')
  returning membresias.id into v_membresia_id;

  insert into public.membresia_periodos (
    membresia_id,
    espacio_id,
    fecha_inicio,
    fecha_fin
  )
  values (v_membresia_id, v_espacio_id, now(), null);

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

create or replace function public.join_shared_space_by_code(p_codigo text)
returns table (espacio_id uuid, nombre text, resultado text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_codigo text := pg_catalog.upper(pg_catalog.replace(pg_catalog.btrim(p_codigo), '-', ''));
  v_espacio_id uuid;
  v_membresia_id uuid;
  v_nombre text;
  v_membresia_estado text;
  v_motivo_salida text;
  v_resultado text;
begin
  if v_user_id is null then raise exception 'Se requiere un usuario autenticado.'; end if;
  if not exists (select 1 from public.usuarios u where u.id = v_user_id) then
    raise exception 'El usuario autenticado no existe en el dominio.';
  end if;
  if v_codigo is null or v_codigo !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' then
    raise exception 'El código de acceso no es válido.';
  end if;

  select e.id into v_espacio_id
  from public.espacios e
  where e.codigo_acceso = v_codigo
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO';
  if not found then raise exception 'El código no corresponde a un espacio compartido activo.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_espacio_id::text, 0));

  select e.nombre into v_nombre
  from public.espacios e
  where e.id = v_espacio_id
    and e.codigo_acceso = v_codigo
    and e.estado = 'ACTIVO'
  for share;
  if not found then raise exception 'El código no corresponde a un espacio compartido activo.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || v_espacio_id::text, 0)
  );

  select m.id, m.estado, m.motivo_salida
  into v_membresia_id, v_membresia_estado, v_motivo_salida
  from public.membresias m
  where m.usuario_id = v_user_id and m.espacio_id = v_espacio_id
  for update;

  if not found then
    insert into public.membresias (usuario_id, espacio_id, rol, estado, fecha_salida, motivo_salida)
    values (v_user_id, v_espacio_id, 'INTEGRANTE', 'ACTIVA', null, null)
    returning membresias.id into v_membresia_id;

    insert into public.membresia_periodos (
      membresia_id,
      espacio_id,
      fecha_inicio,
      fecha_fin
    )
    values (v_membresia_id, v_espacio_id, now(), null);

    v_resultado := 'JOINED';
  elsif v_membresia_estado = 'FINALIZADA' and v_motivo_salida = 'ABANDONO' then
    update public.membresias as m
    set estado = 'ACTIVA', rol = 'INTEGRANTE', fecha_salida = null, motivo_salida = null
    where m.id = v_membresia_id and m.espacio_id = v_espacio_id;

    insert into public.membresia_periodos (
      membresia_id,
      espacio_id,
      fecha_inicio,
      fecha_fin
    )
    values (v_membresia_id, v_espacio_id, now(), null);

    v_resultado := 'REACTIVATED';
  elsif v_membresia_estado = 'FINALIZADA' and v_motivo_salida = 'EXPULSION' then
    v_resultado := 'EXPELLED';
  else
    v_resultado := 'ALREADY_MEMBER';
  end if;

  return query select v_espacio_id, v_nombre, v_resultado;
end;
$$;

revoke execute on function public.join_shared_space_by_code(text) from public;
revoke execute on function public.join_shared_space_by_code(text) from anon;
grant execute on function public.join_shared_space_by_code(text) to authenticated;

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
  v_fecha_cierre timestamptz := now();
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

  update public.membresia_periodos as mp
  set fecha_fin = v_fecha_cierre,
      fecha_modificacion = v_fecha_cierre
  where mp.membresia_id = v_membresia_id
    and mp.espacio_id = p_espacio_id
    and mp.fecha_fin is null;

  if not found then
    raise exception 'No se encontró un período abierto para la membresía compartida.';
  end if;

  update public.membresias as m
  set estado = 'FINALIZADA',
      fecha_salida = v_fecha_cierre,
      motivo_salida = 'ABANDONO'
  where m.id = v_membresia_id;
end;
$$;

revoke execute on function public.leave_shared_space(uuid) from public;
revoke execute on function public.leave_shared_space(uuid) from anon;
grant execute on function public.leave_shared_space(uuid) to authenticated;

create or replace function public.expel_shared_space_member(
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
  v_membresia_admin_id uuid;
  v_rol_objetivo text;
  v_admins_activos integer;
  v_fecha_cierre timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_espacio_id::text, 0)
  );

  select m.id
  into v_membresia_admin_id
  from public.espacios e
  join public.membresias m on m.espacio_id = e.id
  where e.id = p_espacio_id
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO'
    and m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
    and m.rol = 'ADMIN'
  for update of e, m;

  if not found then
    raise exception 'Se requiere una membresía de administrador activa en el espacio compartido.';
  end if;

  if p_membresia_id = v_membresia_admin_id then
    raise exception 'No podés expulsarte a vos mismo. Usá la acción Abandonar espacio.';
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

  if v_rol_objetivo = 'ADMIN' then
    select pg_catalog.count(*)::integer
    into v_admins_activos
    from public.membresias m
    where m.espacio_id = p_espacio_id
      and m.estado = 'ACTIVA'
      and m.rol = 'ADMIN';

    if v_admins_activos = 1 then
      raise exception 'No se puede expulsar al único administrador activo del espacio.';
    end if;
  end if;

  update public.membresia_periodos as mp
  set fecha_fin = v_fecha_cierre,
      fecha_modificacion = v_fecha_cierre
  where mp.membresia_id = p_membresia_id
    and mp.espacio_id = p_espacio_id
    and mp.fecha_fin is null;

  if not found then
    raise exception 'No se encontró un período abierto para la membresía compartida.';
  end if;

  update public.membresias as m
  set estado = 'FINALIZADA',
      fecha_salida = v_fecha_cierre,
      motivo_salida = 'EXPULSION'
  where m.id = p_membresia_id
    and m.espacio_id = p_espacio_id;
end;
$$;

revoke execute on function public.expel_shared_space_member(uuid, uuid) from public;
revoke execute on function public.expel_shared_space_member(uuid, uuid) from anon;
grant execute on function public.expel_shared_space_member(uuid, uuid) to authenticated;
