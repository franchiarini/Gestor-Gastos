grant select on table public.usuarios, public.membresias, public.espacios to authenticated;

create policy "usuarios_select_own"
on public.usuarios
for select
to authenticated
using (id = auth.uid());

create policy "membresias_select_own"
on public.membresias
for select
to authenticated
using (usuario_id = auth.uid());

create policy "espacios_select_active_membership"
on public.espacios
for select
to authenticated
using (
  exists (
    select 1
    from public.membresias
    where membresias.espacio_id = espacios.id
      and membresias.usuario_id = auth.uid()
      and membresias.estado = 'ACTIVA'
  )
);
