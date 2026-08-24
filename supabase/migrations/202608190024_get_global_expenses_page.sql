create index if not exists gastos_fecha_creacion_id_idx
on public.gastos (
  fecha desc,
  fecha_creacion desc,
  id desc
);

create or replace function public.get_expenses_page(
  p_espacio_id uuid default null,
  p_cursor_fecha date default null,
  p_cursor_fecha_creacion timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  gasto_id uuid,
  espacio_id uuid,
  espacio_nombre text,
  espacio_tipo text,
  espacio_estado text,
  categoria_id uuid,
  categoria_nombre text,
  pagado_por_membresia_id uuid,
  pagado_por_nombre text,
  registrado_por_membresia_id uuid,
  registrado_por_nombre text,
  monto numeric,
  fecha date,
  descripcion text,
  fecha_creacion timestamptz,
  fecha_modificacion timestamptz
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

  if (p_cursor_fecha is null) <> (p_cursor_fecha_creacion is null)
    or (p_cursor_fecha is null) <> (p_cursor_id is null) then
    raise exception 'El cursor de paginación está incompleto.';
  end if;

  if p_espacio_id is not null and not exists (
    select 1
    from public.membresias as acceso
    join public.espacios as espacio on espacio.id = acceso.espacio_id
    where acceso.usuario_id = v_user_id
      and acceso.espacio_id = p_espacio_id
      and acceso.estado = 'ACTIVA'
      and (
        (espacio.tipo = 'PERSONAL' and espacio.estado = 'ACTIVO')
        or (
          espacio.tipo = 'COMPARTIDO'
          and espacio.estado in ('ACTIVO', 'ARCHIVADO')
        )
      )
  ) then
    raise exception 'No tenés acceso al espacio solicitado.';
  end if;

  return query
  select
    gasto.id,
    espacio.id,
    espacio.nombre,
    espacio.tipo,
    espacio.estado,
    categoria.id,
    categoria.nombre,
    gasto.pagado_por_membresia_id,
    pagador.nombre,
    gasto.registrado_por_membresia_id,
    registrador.nombre,
    gasto.monto,
    gasto.fecha,
    gasto.descripcion,
    gasto.fecha_creacion,
    gasto.fecha_modificacion
  from public.gastos as gasto
  join public.espacios as espacio on espacio.id = gasto.espacio_id
  join public.membresias as acceso on acceso.espacio_id = espacio.id
  join public.categorias as categoria on categoria.id = gasto.categoria_id
  join public.membresias as membresia_pagador
    on membresia_pagador.id = gasto.pagado_por_membresia_id
  join public.usuarios as pagador on pagador.id = membresia_pagador.usuario_id
  join public.membresias as membresia_registrador
    on membresia_registrador.id = gasto.registrado_por_membresia_id
  join public.usuarios as registrador on registrador.id = membresia_registrador.usuario_id
  where acceso.usuario_id = v_user_id
    and acceso.estado = 'ACTIVA'
    and (
      (espacio.tipo = 'PERSONAL' and espacio.estado = 'ACTIVO')
      or (
        espacio.tipo = 'COMPARTIDO'
        and espacio.estado in ('ACTIVO', 'ARCHIVADO')
      )
    )
    and (p_espacio_id is null or espacio.id = p_espacio_id)
    and (
      p_cursor_fecha is null
      or (gasto.fecha, gasto.fecha_creacion, gasto.id)
        < (p_cursor_fecha, p_cursor_fecha_creacion, p_cursor_id)
    )
  order by gasto.fecha desc, gasto.fecha_creacion desc, gasto.id desc
  limit 11;
end;
$$;

revoke execute on function public.get_expenses_page(uuid, date, timestamptz, uuid) from public;
revoke execute on function public.get_expenses_page(uuid, date, timestamptz, uuid) from anon;
grant execute on function public.get_expenses_page(uuid, date, timestamptz, uuid) to authenticated;
