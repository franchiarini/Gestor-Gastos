grant insert, update on table public.categorias to authenticated;

create policy "categorias_insert_personal_admin"
on public.categorias
for insert
to authenticated
with check (
  exists (
    select 1
    from public.membresias
    join public.espacios on espacios.id = categorias.espacio_id
    where membresias.espacio_id = categorias.espacio_id
      and membresias.usuario_id = auth.uid()
      and membresias.estado = 'ACTIVA'
      and membresias.rol = 'ADMIN'
      and espacios.tipo = 'PERSONAL'
  )
);

create policy "categorias_update_personal_admin"
on public.categorias
for update
to authenticated
using (
  exists (
    select 1
    from public.membresias
    join public.espacios on espacios.id = categorias.espacio_id
    where membresias.espacio_id = categorias.espacio_id
      and membresias.usuario_id = auth.uid()
      and membresias.estado = 'ACTIVA'
      and membresias.rol = 'ADMIN'
      and espacios.tipo = 'PERSONAL'
  )
)
with check (
  exists (
    select 1
    from public.membresias
    join public.espacios on espacios.id = categorias.espacio_id
    where membresias.espacio_id = categorias.espacio_id
      and membresias.usuario_id = auth.uid()
      and membresias.estado = 'ACTIVA'
      and membresias.rol = 'ADMIN'
      and espacios.tipo = 'PERSONAL'
  )
);
