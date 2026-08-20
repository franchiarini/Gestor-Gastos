drop function public.update_shared_category(uuid, text, boolean);

create or replace function public.update_shared_category(
  p_categoria_id uuid,
  p_nombre text default null,
  p_archivar boolean default false,
  p_restaurar boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_estado text;
  v_nombre text;
  v_archivar boolean := coalesce(p_archivar, false);
  v_restaurar boolean := coalesce(p_restaurar, false);
begin
  if v_user_id is null then
    raise exception 'Se requiere un usuario autenticado.';
  end if;

  select c.estado
  into v_estado
  from public.categorias c
  join public.espacios e on e.id = c.espacio_id
  join public.membresias m on m.espacio_id = c.espacio_id
  where c.id = p_categoria_id
    and m.usuario_id = v_user_id
    and m.estado = 'ACTIVA'
    and e.tipo = 'COMPARTIDO'
    and e.estado = 'ACTIVO';

  if not found then
    raise exception 'La categoría no pertenece a un espacio compartido activo al que tengas acceso.';
  end if;

  if v_archivar and v_restaurar then
    raise exception 'No se puede archivar y restaurar una categoría simultáneamente.';
  end if;

  if p_nombre is null and not v_archivar and not v_restaurar then
    raise exception 'No se indicó ningún cambio para la categoría.';
  end if;

  if p_nombre is not null then
    v_nombre := pg_catalog.btrim(p_nombre);
    if v_nombre = '' then
      raise exception 'El nombre de la categoría no puede estar vacío.';
    end if;
  end if;

  if v_archivar and v_estado <> 'ACTIVA' then
    raise exception 'Sólo se puede archivar una categoría activa.';
  end if;

  if v_restaurar and v_estado <> 'ARCHIVADA' then
    raise exception 'Sólo se puede restaurar una categoría archivada.';
  end if;

  update public.categorias as c
  set nombre = coalesce(v_nombre, c.nombre),
      estado = case
        when v_archivar then 'ARCHIVADA'
        when v_restaurar then 'ACTIVA'
        else c.estado
      end
  where c.id = p_categoria_id;
end;
$$;

revoke execute on function public.update_shared_category(uuid, text, boolean, boolean) from public;
revoke execute on function public.update_shared_category(uuid, text, boolean, boolean) from anon;
grant execute on function public.update_shared_category(uuid, text, boolean, boolean) to authenticated;
