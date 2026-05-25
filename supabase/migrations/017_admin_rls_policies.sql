-- ═══════════════════════════════════════════════════
-- RealHub — 017 Admin RLS Policies
-- ═══════════════════════════════════════════════════

-- 1. Policies for properties (select, update, delete for admin users)
CREATE POLICY "Admins can select all properties" ON public.properties
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all properties" ON public.properties
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete all properties" ON public.properties
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Policies for prospects (select, update, delete for admin users)
CREATE POLICY "Admins can select all prospects" ON public.prospects
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all prospects" ON public.prospects
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete all prospects" ON public.prospects
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Policies for feature_requests (select, update for admin users)
CREATE POLICY "Admins can select all feature_requests" ON public.feature_requests
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all feature_requests" ON public.feature_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Policies for agent_profiles (update for admin users)
CREATE POLICY "Admins can update all agent_profiles" ON public.agent_profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agent_profiles WHERE id = auth.uid() AND role = 'admin'));
