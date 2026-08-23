create index if not exists gastos_espacio_fecha_creacion_id_idx
on public.gastos (
  espacio_id,
  fecha desc,
  fecha_creacion desc,
  id desc
);

create or replace function public.get_shared_expenses_page(
  p_espacio_id uuid,
  p_cursor_fecha date default null,
  p_cursor_fecha_creacion timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  gasto_id uuid,
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

  if not exists (
    select 1
    from public.membresias m
    join public.espacios e on e.id = m.espacio_id
    where m.usuario_id = v_user_id
      and m.espacio_id = p_espacio_id
      and m.estado = 'ACTIVA'
      and e.tipo = 'COMPARTIDO'
      and e.estado in ('ACTIVO', 'ARCHIVADO')
  ) then
    raise exception 'No tenés acceso activo a este espacio compartido.';
  end if;

  return query
  select
    g.id,
    g.categoria_id,
    c.nombre,
    g.pagado_por_membresia_id,
    pagador.nombre,
    g.registrado_por_membresia_id,
    registrador.nombre,
    g.monto,
    g.fecha,
    g.descripcion,
    g.fecha_creacion,
    g.fecha_modificacion
  from public.gastos g
  join public.categorias c on c.id = g.categoria_id
  join public.membresias mp on mp.id = g.pagado_por_membresia_id
  join public.usuarios pagador on pagador.id = mp.usuario_id
  join public.membresias mr on mr.id = g.registrado_por_membresia_id
  join public.usuarios registrador on registrador.id = mr.usuario_id
  where g.espacio_id = p_espacio_id
    and (
      p_cursor_fecha is null
      or (g.fecha, g.fecha_creacion, g.id)
        < (p_cursor_fecha, p_cursor_fecha_creacion, p_cursor_id)
    )
  order by g.fecha desc, g.fecha_creacion desc, g.id desc
  limit 11;
end;
$$;

revoke execute on function public.get_shared_expenses_page(uuid, date, timestamptz, uuid) from public;
revoke execute on function public.get_shared_expenses_page(uuid, date, timestamptz, uuid) from anon;
grant execute on function public.get_shared_expenses_page(uuid, date, timestamptz, uuid) to authenticated;
