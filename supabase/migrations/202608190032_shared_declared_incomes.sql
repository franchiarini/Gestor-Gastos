create table public.ingresos_declarados_espacio (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null,
  membresia_id uuid not null,
  mes date not null,
  monto numeric not null,
  fecha_creacion timestamptz not null default now(),
  fecha_modificacion timestamptz not null default now(),
  constraint ingresos_declarados_espacio_membresia_fkey
    foreign key (membresia_id, espacio_id)
    references public.membresias(id, espacio_id)
    on delete cascade,
  constraint ingresos_declarados_espacio_unique
    unique (espacio_id, mes, membresia_id),
  constraint ingresos_declarados_espacio_mes_check
    check (extract(day from mes) = 1),
  constraint ingresos_declarados_espacio_monto_nonnegative_check
    check (
      monto >= 0
      and monto not in (
        'NaN'::numeric,
        'Infinity'::numeric,
        '-Infinity'::numeric
      )
    ),
  constraint ingresos_declarados_espacio_monto_scale_check
    check (monto = pg_catalog.round(monto, 2))
);

alter table public.ingresos_declarados_espacio enable row level security;

revoke all on table public.ingresos_declarados_espacio
from public, anon, authenticated;

create or replace function public.set_shared_declared_income(
  p_espacio_id uuid,
  p_mes date,
  p_monto numeric
)
returns table (
  declaracion_id uuid,
  espacio_id uuid,
  membresia_id uuid,
  mes date,
  monto numeric,
  fecha_creacion timestamptz,
  fecha_modificacion timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_membresia_id uuid;
  v_mes date;
  v_mes_siguiente date;
  v_mes_actual date;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  if p_espacio_id is null then
    raise exception 'El espacio es obligatorio.';
  end if;

  if p_mes is null then
    raise exception 'El mes es obligatorio.';
  end if;

  if p_monto is null
    or p_monto < 0
    or p_monto in (
      'NaN'::numeric,
      'Infinity'::numeric,
      '-Infinity'::numeric
    )
  then
    raise exception 'El monto declarado debe ser un valor numérico finito no negativo.';
  end if;

  if p_monto <> pg_catalog.round(p_monto, 2) then
    raise exception 'El monto declarado no puede tener más de dos decimales.';
  end if;

  v_mes := pg_catalog.date_trunc('month', p_mes)::date;
  v_mes_siguiente := (v_mes + interval '1 month')::date;
  v_mes_actual := pg_catalog.date_trunc('month', current_date)::date;

  if v_mes > v_mes_actual then
    raise exception 'No se puede declarar un ingreso para un mes futuro.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_espacio_id::text, 0)
  );

  select m.id
  into v_membresia_id
  from public.espacios as e
  join public.membresias as m
    on m.espacio_id = e.id
  where e.id = p_espacio_id
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO'
    and m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
  for update of e, m;

  if not found then
    raise exception 'No tenés una membresía activa en este espacio compartido activo.';
  end if;

  if not exists (
    select 1
    from public.membresia_periodos as mp
    where mp.membresia_id = v_membresia_id
      and mp.espacio_id = p_espacio_id
      and mp.fecha_inicio < v_mes_siguiente::timestamptz
      and (mp.fecha_fin is null or mp.fecha_fin > v_mes::timestamptz)
  ) then
    raise exception 'No existe historial de participación suficiente para declarar ingresos en este período.';
  end if;

  return query
  insert into public.ingresos_declarados_espacio as ide (
    espacio_id,
    membresia_id,
    mes,
    monto
  )
  values (
    p_espacio_id,
    v_membresia_id,
    v_mes,
    p_monto
  )
  on conflict on constraint ingresos_declarados_espacio_unique
  do update
  set monto = excluded.monto,
      fecha_modificacion = now()
  returning
    ide.id,
    ide.espacio_id,
    ide.membresia_id,
    ide.mes,
    ide.monto,
    ide.fecha_creacion,
    ide.fecha_modificacion;
end;
$$;

revoke execute on function public.set_shared_declared_income(uuid, date, numeric) from public;
revoke execute on function public.set_shared_declared_income(uuid, date, numeric) from anon;
grant execute on function public.set_shared_declared_income(uuid, date, numeric) to authenticated;
