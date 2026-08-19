create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references public.espacios(id) on delete cascade,
  nombre text not null,
  estado text not null default 'ACTIVA',
  fecha_creacion timestamptz not null default now(),
  constraint categorias_estado_check check (estado in ('ACTIVA', 'ARCHIVADA')),
  constraint categorias_nombre_not_empty_check check (pg_catalog.btrim(nombre) <> '')
);

alter table public.categorias enable row level security;

revoke all on table public.categorias from public, anon, authenticated;
grant select on table public.categorias to authenticated;

create policy "categorias_select_active_membership"
on public.categorias
for select
to authenticated
using (
  exists (
    select 1
    from public.membresias
    where membresias.espacio_id = categorias.espacio_id
      and membresias.usuario_id = auth.uid()
      and membresias.estado = 'ACTIVA'
  )
);

insert into public.categorias (espacio_id, nombre)
select espacios.id, categorias_predeterminadas.nombre
from public.espacios
cross join (
  values
    ('Supermercado'),
    ('Salidas / Delivery'),
    ('Servicios'),
    ('Transporte'),
    ('Suscripciones'),
    ('Salud'),
    ('Entretenimiento'),
    ('Otros')
) as categorias_predeterminadas(nombre)
where not exists (
  select 1
  from public.categorias categorias_existentes
  where categorias_existentes.espacio_id = espacios.id
    and categorias_existentes.nombre = categorias_predeterminadas.nombre
);

create or replace function public.initialize_user_domain()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_auth_user auth.users%rowtype;
  v_nombre text;
  v_email text;
  v_espacio_id uuid;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  select *
  into v_auth_user
  from auth.users
  where id = v_user_id;

  if not found then
    raise exception 'No se encontró la identidad autenticada.';
  end if;

  if v_auth_user.email_confirmed_at is null then
    raise exception 'El email debe estar confirmado antes de inicializar el usuario.';
  end if;

  v_email := v_auth_user.email;
  v_nombre := pg_catalog.btrim(v_auth_user.raw_user_meta_data ->> 'nombre');

  if v_email is null or pg_catalog.btrim(v_email) = '' then
    raise exception 'El usuario autenticado no tiene email.';
  end if;

  if v_nombre is null or v_nombre = '' then
    raise exception 'El usuario autenticado no tiene nombre.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  if exists (
    select 1
    from public.membresias m
    join public.espacios e on e.id = m.espacio_id
    where m.usuario_id = v_user_id
      and e.tipo = 'PERSONAL'
  ) then
    return;
  end if;

  insert into public.usuarios (id, nombre, email)
  values (v_user_id, v_nombre, v_email)
  on conflict (id) do update
    set nombre = excluded.nombre,
        email = excluded.email;

  insert into public.espacios (nombre, tipo, estado, codigo_acceso)
  values ('Mis gastos', 'PERSONAL', 'ACTIVO', null)
  returning id into v_espacio_id;

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
end;
$$;

revoke execute on function public.initialize_user_domain() from public;
revoke execute on function public.initialize_user_domain() from anon;
grant execute on function public.initialize_user_domain() to authenticated;
