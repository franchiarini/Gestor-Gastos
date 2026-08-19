create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null,
  fecha_creacion timestamptz not null default now()
);

create table public.espacios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null,
  estado text not null,
  codigo_acceso text null,
  fecha_creacion timestamptz not null default now(),
  constraint espacios_tipo_check check (tipo in ('PERSONAL', 'COMPARTIDO')),
  constraint espacios_estado_check check (estado in ('ACTIVO', 'ARCHIVADO'))
);

create table public.membresias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  espacio_id uuid not null references public.espacios(id) on delete cascade,
  rol text not null,
  estado text not null,
  fecha_ingreso timestamptz not null default now(),
  fecha_salida timestamptz null,
  constraint membresias_rol_check check (rol in ('ADMIN', 'INTEGRANTE')),
  constraint membresias_estado_check check (estado in ('ACTIVA', 'FINALIZADA')),
  constraint membresias_usuario_espacio_unique unique (usuario_id, espacio_id)
);

alter table public.usuarios enable row level security;
alter table public.espacios enable row level security;
alter table public.membresias enable row level security;

revoke all on table public.usuarios, public.espacios, public.membresias from public, anon, authenticated;

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
end;
$$;

revoke execute on function public.initialize_user_domain() from public;
revoke execute on function public.initialize_user_domain() from anon;
grant execute on function public.initialize_user_domain() to authenticated;
