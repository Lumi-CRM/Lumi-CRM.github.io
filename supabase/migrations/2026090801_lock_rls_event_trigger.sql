begin;

-- This SECURITY DEFINER function is invoked by its event trigger. Browser roles
-- never need direct EXECUTE permission on it.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

commit;
