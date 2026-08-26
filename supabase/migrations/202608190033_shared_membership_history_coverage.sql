alter table public.espacios
add column historial_membresias_completo_desde date null;

alter table public.espacios
add constraint espacios_historial_membresias_tipo_check
check (
  tipo = 'COMPARTIDO'
  or historial_membresias_completo_desde is null
);

with periodos_por_espacio as (
  select
    e.id as espacio_id,
    pg_catalog.min(mp.fecha_inicio) as primer_periodo_inicio,
    pg_catalog.bool_or(mp.fecha_inicio = e.fecha_creacion) as tiene_periodo_fundador
  from public.espacios as e
  left join public.membresia_periodos as mp
    on mp.espacio_id = e.id
  where e.tipo = 'COMPARTIDO'
  group by e.id
)
update public.espacios as e
set historial_membresias_completo_desde = case
  when p.tiene_periodo_fundador then
    (e.fecha_creacion at time zone 'America/Argentina/Buenos_Aires')::date
  when p.primer_periodo_inicio is not null then
    (p.primer_periodo_inicio at time zone 'America/Argentina/Buenos_Aires')::date + 1
  else null
end
from periodos_por_espacio as p
where e.id = p.espacio_id;

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
      insert into public.espacios (
        nombre,
        tipo,
        estado,
        codigo_acceso,
        historial_membresias_completo_desde
      )
      values (
        v_nombre,
        'COMPARTIDO',
        'ACTIVO',
        v_codigo,
        (now() at time zone 'America/Argentina/Buenos_Aires')::date
      )
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
  v_inicio_mes timestamptz;
  v_inicio_mes_siguiente timestamptz;
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
  v_mes_actual := pg_catalog.date_trunc(
    'month',
    now() at time zone 'America/Argentina/Buenos_Aires'
  )::date;
  v_inicio_mes :=
    v_mes::timestamp at time zone 'America/Argentina/Buenos_Aires';
  v_inicio_mes_siguiente :=
    v_mes_siguiente::timestamp at time zone 'America/Argentina/Buenos_Aires';

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
      and mp.fecha_inicio < v_inicio_mes_siguiente
      and (mp.fecha_fin is null or mp.fecha_fin > v_inicio_mes)
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
