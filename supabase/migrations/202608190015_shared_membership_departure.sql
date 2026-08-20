alter table public.membresias
add column motivo_salida text null;

alter table public.membresias
add constraint membresias_motivo_salida_check
check (motivo_salida is null or motivo_salida in ('ABANDONO', 'EXPULSION'));

update public.membresias as m
set motivo_salida = 'ABANDONO'
from public.espacios e
where e.id = m.espacio_id
  and e.tipo = 'COMPARTIDO'
  and m.estado = 'FINALIZADA'
  and m.motivo_salida is null;

create or replace function public.validate_shared_membership_departure()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.espacios e
    where e.id = new.espacio_id
      and e.tipo = 'COMPARTIDO'
  ) then
    if new.estado = 'ACTIVA'
      and (new.motivo_salida is not null or new.fecha_salida is not null) then
      raise exception 'Una membresía compartida activa no puede tener motivo ni fecha de salida.';
    end if;

    if new.estado = 'FINALIZADA'
      and (
        new.motivo_salida not in ('ABANDONO', 'EXPULSION')
        or new.motivo_salida is null
        or new.fecha_salida is null
      ) then
      raise exception 'Una membresía compartida finalizada debe tener motivo y fecha de salida.';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_shared_membership_departure() from public;
revoke execute on function public.validate_shared_membership_departure() from anon;
revoke execute on function public.validate_shared_membership_departure() from authenticated;

create trigger membresias_validate_shared_departure
before insert or update on public.membresias
for each row
execute function public.validate_shared_membership_departure();

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
  v_miembros_activos integer;
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

  select
    pg_catalog.count(*)::integer,
    pg_catalog.count(*) filter (where m.rol = 'ADMIN')::integer
  into v_miembros_activos, v_admins_activos
  from public.membresias m
  where m.espacio_id = p_espacio_id
    and m.estado = 'ACTIVA';

  if v_rol = 'ADMIN' and v_admins_activos = 1 then
    raise exception 'No podés abandonar el espacio siendo el único administrador activo. Promové primero a otro integrante.';
  end if;

  update public.membresias as m
  set estado = 'FINALIZADA',
      fecha_salida = now(),
      motivo_salida = 'ABANDONO'
  where m.id = v_membresia_id;

  if v_miembros_activos = 2 then
    update public.espacios as e
    set estado = 'ARCHIVADO'
    where e.id = p_espacio_id;
  end if;
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

  update public.membresias as m
  set estado = 'FINALIZADA',
      fecha_salida = now(),
      motivo_salida = 'EXPULSION'
  where m.id = p_membresia_id
    and m.espacio_id = p_espacio_id;
end;
$$;

revoke execute on function public.expel_shared_space_member(uuid, uuid) from public;
revoke execute on function public.expel_shared_space_member(uuid, uuid) from anon;
grant execute on function public.expel_shared_space_member(uuid, uuid) to authenticated;

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

drop function if exists public.preview_shared_space_by_code(text);

create or replace function public.preview_shared_space_by_code(p_codigo text)
returns table (
  espacio_id uuid,
  nombre text,
  membresia_estado text,
  motivo_salida text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_codigo text := pg_catalog.upper(pg_catalog.replace(pg_catalog.btrim(p_codigo), '-', ''));
  v_espacio_id uuid;
  v_nombre text;
  v_membresia_estado text;
  v_motivo_salida text;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if not exists (select 1 from public.usuarios u where u.id = v_user_id) then
    raise exception 'El usuario autenticado no existe en el dominio.';
  end if;

  if v_codigo is null or v_codigo !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' then
    raise exception 'El código de acceso no es válido.';
  end if;

  select e.id, e.nombre
  into v_espacio_id, v_nombre
  from public.espacios e
  where e.codigo_acceso = v_codigo
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO';

  if not found then
    raise exception 'El código no corresponde a un espacio compartido activo.';
  end if;

  select m.estado, m.motivo_salida
  into v_membresia_estado, v_motivo_salida
  from public.membresias m
  where m.usuario_id = v_user_id
    and m.espacio_id = v_espacio_id;

  return query select v_espacio_id, v_nombre, v_membresia_estado, v_motivo_salida;
end;
$$;

revoke execute on function public.preview_shared_space_by_code(text) from public;
revoke execute on function public.preview_shared_space_by_code(text) from anon;
grant execute on function public.preview_shared_space_by_code(text) to authenticated;

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

  select m.estado, m.motivo_salida
  into v_membresia_estado, v_motivo_salida
  from public.membresias m
  where m.usuario_id = v_user_id and m.espacio_id = v_espacio_id
  for update;

  if not found then
    insert into public.membresias (usuario_id, espacio_id, rol, estado, fecha_salida, motivo_salida)
    values (v_user_id, v_espacio_id, 'INTEGRANTE', 'ACTIVA', null, null);
    v_resultado := 'JOINED';
  elsif v_membresia_estado = 'FINALIZADA' and v_motivo_salida = 'ABANDONO' then
    update public.membresias as m
    set estado = 'ACTIVA', rol = 'INTEGRANTE', fecha_salida = null, motivo_salida = null
    where m.usuario_id = v_user_id and m.espacio_id = v_espacio_id;
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
