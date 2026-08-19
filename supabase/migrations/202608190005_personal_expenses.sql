create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references public.espacios(id),
  categoria_id uuid not null references public.categorias(id),
  pagado_por_membresia_id uuid not null references public.membresias(id),
  registrado_por_membresia_id uuid not null references public.membresias(id),
  monto numeric not null,
  fecha date not null default current_date,
  descripcion text null,
  fecha_creacion timestamptz not null default now(),
  fecha_modificacion timestamptz not null default now(),
  constraint gastos_monto_positive_check check (monto > 0 and monto <> 'NaN'::numeric),
  constraint gastos_monto_scale_check check (monto = pg_catalog.round(monto, 2))
);

alter table public.gastos enable row level security;

revoke all on table public.gastos from public, anon, authenticated;
grant select on table public.gastos to authenticated;

create policy "gastos_select_active_membership"
on public.gastos
for select
to authenticated
using (
  exists (
    select 1
    from public.membresias
    where membresias.espacio_id = gastos.espacio_id
      and membresias.usuario_id = auth.uid()
      and membresias.estado = 'ACTIVA'
  )
);

create or replace function public.create_personal_expense(
  p_categoria_id uuid,
  p_monto numeric,
  p_fecha date default null,
  p_descripcion text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_espacio_id uuid;
  v_membresia_id uuid;
  v_categoria_id uuid;
  v_gasto_id uuid;
  v_descripcion text;
  v_fecha date;
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  select m.id, m.espacio_id
  into v_membresia_id, v_espacio_id
  from public.membresias m
  join public.espacios e on e.id = m.espacio_id
  where m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
    and e.tipo = 'PERSONAL'
    and e.estado = 'ACTIVO';

  if not found then
    raise exception 'No se encontró un espacio personal activo para el usuario.';
  end if;

  if p_categoria_id is null then
    raise exception 'La categoría es obligatoria.';
  end if;

  select c.id
  into v_categoria_id
  from public.categorias c
  where c.id = p_categoria_id
    and c.espacio_id = v_espacio_id
    and c.estado = 'ACTIVA';

  if not found then
    raise exception 'La categoría no pertenece al espacio personal activo.';
  end if;

  if p_monto is null or p_monto <= 0 or p_monto = 'NaN'::numeric then
    raise exception 'El monto debe ser mayor a cero.';
  end if;

  if p_monto <> pg_catalog.round(p_monto, 2) then
    raise exception 'El monto no puede tener más de dos decimales.';
  end if;

  v_fecha := coalesce(p_fecha, current_date);
  v_descripcion := pg_catalog.nullif(pg_catalog.btrim(p_descripcion), '');

  insert into public.gastos (
    espacio_id,
    categoria_id,
    pagado_por_membresia_id,
    registrado_por_membresia_id,
    monto,
    fecha,
    descripcion
  )
  values (
    v_espacio_id,
    v_categoria_id,
    v_membresia_id,
    v_membresia_id,
    p_monto,
    v_fecha,
    v_descripcion
  )
  returning id into v_gasto_id;

  return v_gasto_id;
end;
$$;

revoke execute on function public.create_personal_expense(uuid, numeric, date, text) from public;
revoke execute on function public.create_personal_expense(uuid, numeric, date, text) from anon;
grant execute on function public.create_personal_expense(uuid, numeric, date, text) to authenticated;
