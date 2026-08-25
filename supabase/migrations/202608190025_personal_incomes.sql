create table public.categorias_ingreso (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  nombre text not null,
  estado text not null default 'ACTIVA',
  fecha_creacion timestamptz not null default now(),
  fecha_modificacion timestamptz not null default now(),
  constraint categorias_ingreso_estado_check
    check (estado in ('ACTIVA', 'ARCHIVADA')),
  constraint categorias_ingreso_nombre_not_empty_check
    check (pg_catalog.btrim(nombre) <> ''),
  constraint categorias_ingreso_id_usuario_unique unique (id, usuario_id)
);

create unique index categorias_ingreso_usuario_nombre_normalizado_idx
on public.categorias_ingreso (
  usuario_id,
  pg_catalog.lower(pg_catalog.btrim(nombre))
);

create index categorias_ingreso_usuario_estado_nombre_id_idx
on public.categorias_ingreso (
  usuario_id,
  estado,
  nombre,
  id
);

create table public.ingresos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  categoria_ingreso_id uuid not null,
  monto numeric not null,
  fecha date not null default current_date,
  descripcion text null,
  fecha_creacion timestamptz not null default now(),
  fecha_modificacion timestamptz not null default now(),
  constraint ingresos_usuario_fkey
    foreign key (usuario_id)
    references public.usuarios(id)
    on delete cascade,
  constraint ingresos_categoria_usuario_fkey
    foreign key (categoria_ingreso_id, usuario_id)
    references public.categorias_ingreso(id, usuario_id)
    on delete no action,
  constraint ingresos_monto_positive_check
    check (monto > 0 and monto <> 'NaN'::numeric),
  constraint ingresos_monto_scale_check
    check (monto = pg_catalog.round(monto, 2))
);

create index ingresos_usuario_fecha_creacion_id_idx
on public.ingresos (
  usuario_id,
  fecha desc,
  fecha_creacion desc,
  id desc
);

create index ingresos_categoria_usuario_idx
on public.ingresos (
  categoria_ingreso_id,
  usuario_id
);

alter table public.categorias_ingreso enable row level security;
alter table public.ingresos enable row level security;

revoke all on table public.categorias_ingreso, public.ingresos
from public, anon, authenticated;

grant select on table public.categorias_ingreso, public.ingresos
to authenticated;

create policy "categorias_ingreso_select_own"
on public.categorias_ingreso
for select
to authenticated
using (categorias_ingreso.usuario_id = auth.uid());

create policy "ingresos_select_own"
on public.ingresos
for select
to authenticated
using (ingresos.usuario_id = auth.uid());

insert into public.categorias_ingreso (usuario_id, nombre)
select u.id, categorias_predeterminadas.nombre
from public.usuarios as u
cross join (
  values
    ('Sueldo'),
    ('Trabajo extra'),
    ('Otros')
) as categorias_predeterminadas(nombre)
on conflict do nothing;

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

  insert into public.usuarios (id, nombre, email)
  values (v_user_id, v_nombre, v_email)
  on conflict (id) do update
    set nombre = excluded.nombre,
        email = excluded.email;

  insert into public.categorias_ingreso (usuario_id, nombre)
  values
    (v_user_id, 'Sueldo'),
    (v_user_id, 'Trabajo extra'),
    (v_user_id, 'Otros')
  on conflict do nothing;

  if exists (
    select 1
    from public.membresias m
    join public.espacios e on e.id = m.espacio_id
    where m.usuario_id = v_user_id
      and e.tipo = 'PERSONAL'
  ) then
    return;
  end if;

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
