-- =============================================================================
-- 035_SERVICE_SUBSCRIPTIONS.SQL
-- =============================================================================
-- Creates the service subscriptions system with pickup/delivery routes.
-- Allows clinics to offer recurring service packages (grooming, checkups, etc.)
-- with optional driver pickup and delivery service.
--
-- NEW TABLES:
-- 1. subscription_plans - Service package templates
-- 2. service_subscriptions - Active customer subscriptions
-- 3. subscription_instances - Scheduled/completed service instances
-- 4. delivery_routes - Driver routes for pickup/delivery
-- 5. route_stops - Individual stops on a route
-- 6. drivers - Driver profiles linked to staff
-- =============================================================================

-- =============================================================================
-- DRIVERS TABLE
-- =============================================================================
-- Links staff profiles to driver capabilities

CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Vehicle info
    vehicle_type TEXT CHECK (vehicle_type IN ('car', 'motorcycle', 'van', 'bicycle')),
    vehicle_plate TEXT,
    license_number TEXT,

    -- Capabilities
    max_pets_per_trip INTEGER DEFAULT 3,
    can_handle_large_pets BOOLEAN DEFAULT true,
    can_handle_anxious_pets BOOLEAN DEFAULT false,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, profile_id)
);

COMMENT ON TABLE public.drivers IS 'Staff members who can perform pickup/delivery services';

-- RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage drivers" ON public.drivers;
CREATE POLICY "Staff manage drivers" ON public.drivers
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drivers_tenant ON public.drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_profile ON public.drivers(profile_id);
CREATE INDEX IF NOT EXISTS idx_drivers_active ON public.drivers(tenant_id) WHERE is_active = true;

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.drivers;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.drivers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- SUBSCRIPTION PLANS TABLE
-- =============================================================================
-- Templates for recurring service packages

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Plan details
    name TEXT NOT NULL,
    description TEXT,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,

    -- Pricing
    price_per_period NUMERIC(10, 2) NOT NULL,
    billing_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly')),

    -- Service frequency
    service_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (service_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
    services_per_period INTEGER NOT NULL DEFAULT 1,

    -- Pickup/Delivery options
    includes_pickup BOOLEAN DEFAULT false,
    includes_delivery BOOLEAN DEFAULT false,
    pickup_fee NUMERIC(10, 2) DEFAULT 0,
    delivery_fee NUMERIC(10, 2) DEFAULT 0,

    -- Discounts
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    first_month_discount NUMERIC(5, 2) DEFAULT 0,

    -- Eligibility
    species_allowed TEXT[] DEFAULT ARRAY['dog', 'cat']::TEXT[],
    max_pet_weight_kg NUMERIC(5, 2), -- NULL means no limit
    min_commitment_months INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_plans IS 'Service subscription plan templates offered by clinics';
COMMENT ON COLUMN public.subscription_plans.services_per_period IS 'Number of services included per billing period';

-- RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans
DROP POLICY IF EXISTS "Public view active plans" ON public.subscription_plans;
CREATE POLICY "Public view active plans" ON public.subscription_plans
    FOR SELECT USING (is_active = true);

-- Staff can manage plans
DROP POLICY IF EXISTS "Staff manage plans" ON public.subscription_plans;
CREATE POLICY "Staff manage plans" ON public.subscription_plans
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tenant ON public.subscription_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_service ON public.subscription_plans(service_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(tenant_id, is_active)
    WHERE is_active = true;

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.subscription_plans;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- SERVICE SUBSCRIPTIONS TABLE
-- =============================================================================
-- Active customer subscriptions

CREATE TABLE IF NOT EXISTS public.service_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,

    -- Customer & Pet
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE RESTRICT,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'paused', 'cancelled', 'expired')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paused_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    expires_at TIMESTAMPTZ, -- For fixed-term subscriptions

    -- Scheduling
    next_service_date DATE,
    preferred_day_of_week INTEGER CHECK (preferred_day_of_week BETWEEN 0 AND 6),
    preferred_time_slot TEXT CHECK (preferred_time_slot IN ('morning', 'afternoon', 'evening')),

    -- Pickup/Delivery
    wants_pickup BOOLEAN DEFAULT false,
    wants_delivery BOOLEAN DEFAULT false,
    pickup_address TEXT,
    pickup_lat NUMERIC(10, 7),
    pickup_lng NUMERIC(10, 7),
    pickup_instructions TEXT,
    delivery_address TEXT, -- NULL means same as pickup
    delivery_lat NUMERIC(10, 7),
    delivery_lng NUMERIC(10, 7),
    delivery_instructions TEXT,

    -- Billing
    current_price NUMERIC(10, 2) NOT NULL,
    next_billing_date DATE,
    payment_method_id UUID, -- Future: link to saved payment methods

    -- Stats
    total_services_used INTEGER DEFAULT 0,
    services_remaining_this_period INTEGER DEFAULT 0,
    total_paid NUMERIC(10, 2) DEFAULT 0,

    -- Notes
    special_instructions TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.service_subscriptions IS 'Active service subscriptions for customers';

-- RLS
ALTER TABLE public.service_subscriptions ENABLE ROW LEVEL SECURITY;

-- Customers can view their own subscriptions
DROP POLICY IF EXISTS "Customers view own subscriptions" ON public.service_subscriptions;
CREATE POLICY "Customers view own subscriptions" ON public.service_subscriptions
    FOR SELECT TO authenticated
    USING (customer_id = auth.uid());

-- Staff can manage subscriptions
DROP POLICY IF EXISTS "Staff manage subscriptions" ON public.service_subscriptions;
CREATE POLICY "Staff manage subscriptions" ON public.service_subscriptions
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_subscriptions_tenant ON public.service_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_subscriptions_customer ON public.service_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_subscriptions_pet ON public.service_subscriptions(pet_id);
CREATE INDEX IF NOT EXISTS idx_service_subscriptions_plan ON public.service_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_service_subscriptions_active ON public.service_subscriptions(tenant_id, status)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_service_subscriptions_next_service ON public.service_subscriptions(tenant_id, next_service_date)
    WHERE status = 'active' AND next_service_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_subscriptions_pickup ON public.service_subscriptions(tenant_id, wants_pickup)
    WHERE status = 'active' AND wants_pickup = true;

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.service_subscriptions;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.service_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- SUBSCRIPTION INSTANCES TABLE
-- =============================================================================
-- Individual service appointments for subscriptions

CREATE TABLE IF NOT EXISTS public.subscription_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.service_subscriptions(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id),

    -- Pickup/Delivery tracking
    pickup_status TEXT CHECK (pickup_status IN ('pending', 'en_route', 'picked_up', 'not_needed')),
    pickup_driver_id UUID REFERENCES public.drivers(id),
    pickup_time TIMESTAMPTZ,
    pickup_notes TEXT,

    delivery_status TEXT CHECK (delivery_status IN ('pending', 'en_route', 'delivered', 'not_needed')),
    delivery_driver_id UUID REFERENCES public.drivers(id),
    delivery_time TIMESTAMPTZ,
    delivery_notes TEXT,

    -- Rating
    customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5),
    customer_feedback TEXT,
    rated_at TIMESTAMPTZ,

    -- Invoice
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_instances IS 'Individual service instances for subscriptions';

-- RLS
ALTER TABLE public.subscription_instances ENABLE ROW LEVEL SECURITY;

-- Customers can view their own instances
DROP POLICY IF EXISTS "Customers view own instances" ON public.subscription_instances;
CREATE POLICY "Customers view own instances" ON public.subscription_instances
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.service_subscriptions s
            WHERE s.id = subscription_id
            AND s.customer_id = auth.uid()
        )
    );

-- Staff can manage instances
DROP POLICY IF EXISTS "Staff manage instances" ON public.subscription_instances;
CREATE POLICY "Staff manage instances" ON public.subscription_instances
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_instances_subscription ON public.subscription_instances(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_instances_tenant ON public.subscription_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_instances_date ON public.subscription_instances(tenant_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_subscription_instances_status ON public.subscription_instances(tenant_id, status)
    WHERE status IN ('scheduled', 'confirmed');
CREATE INDEX IF NOT EXISTS idx_subscription_instances_pickup ON public.subscription_instances(pickup_driver_id, scheduled_date)
    WHERE pickup_status = 'pending';

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.subscription_instances;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.subscription_instances
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- DELIVERY ROUTES TABLE
-- =============================================================================
-- Driver routes for a given day

CREATE TABLE IF NOT EXISTS public.delivery_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Route info
    route_date DATE NOT NULL,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
    route_type TEXT NOT NULL DEFAULT 'mixed' CHECK (route_type IN ('pickup', 'delivery', 'mixed')),

    -- Status
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Stats
    total_stops INTEGER DEFAULT 0,
    completed_stops INTEGER DEFAULT 0,
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, route_date, driver_id)
);

COMMENT ON TABLE public.delivery_routes IS 'Daily pickup/delivery routes for drivers';

-- RLS
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own routes
DROP POLICY IF EXISTS "Drivers view own routes" ON public.delivery_routes;
CREATE POLICY "Drivers view own routes" ON public.delivery_routes
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.drivers d
            WHERE d.id = driver_id
            AND d.profile_id = auth.uid()
        )
    );

-- Staff can manage routes
DROP POLICY IF EXISTS "Staff manage routes" ON public.delivery_routes;
CREATE POLICY "Staff manage routes" ON public.delivery_routes
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_routes_tenant ON public.delivery_routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_driver ON public.delivery_routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_date ON public.delivery_routes(tenant_id, route_date);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_active ON public.delivery_routes(driver_id, route_date)
    WHERE status IN ('planned', 'in_progress');

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.delivery_routes;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.delivery_routes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- ROUTE STOPS TABLE
-- =============================================================================
-- Individual stops on a route

CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.delivery_routes(id) ON DELETE CASCADE,
    instance_id UUID NOT NULL REFERENCES public.subscription_instances(id) ON DELETE CASCADE,

    -- Stop details
    stop_type TEXT NOT NULL CHECK (stop_type IN ('pickup', 'delivery')),
    sequence_order INTEGER NOT NULL,

    -- Address
    address TEXT NOT NULL,
    lat NUMERIC(10, 7),
    lng NUMERIC(10, 7),
    instructions TEXT,

    -- Timing
    scheduled_time TIME,
    estimated_arrival TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'en_route', 'arrived', 'completed', 'failed', 'skipped')),
    failure_reason TEXT,

    -- Pet info (denormalized for driver convenience)
    pet_name TEXT,
    pet_species TEXT,
    pet_notes TEXT,
    customer_phone TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.route_stops IS 'Individual stops on a delivery/pickup route';

-- RLS
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

-- Drivers can view and update their route stops
DROP POLICY IF EXISTS "Drivers manage own stops" ON public.route_stops;
CREATE POLICY "Drivers manage own stops" ON public.route_stops
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.delivery_routes r
            JOIN public.drivers d ON r.driver_id = d.id
            WHERE r.id = route_id
            AND d.profile_id = auth.uid()
        )
    );

-- Staff can manage all stops
DROP POLICY IF EXISTS "Staff manage stops" ON public.route_stops;
CREATE POLICY "Staff manage stops" ON public.route_stops
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.delivery_routes r
            WHERE r.id = route_id
            AND public.is_staff_of(r.tenant_id)
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_route_stops_route ON public.route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_instance ON public.route_stops(instance_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_order ON public.route_stops(route_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_route_stops_status ON public.route_stops(route_id, status)
    WHERE status IN ('pending', 'en_route');

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.route_stops;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.route_stops
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get next service date based on frequency
CREATE OR REPLACE FUNCTION public.calculate_next_service_date(
    p_current_date DATE,
    p_frequency TEXT,
    p_preferred_day INTEGER DEFAULT NULL
)
RETURNS DATE AS $$
DECLARE
    v_next_date DATE;
    v_day_diff INTEGER;
BEGIN
    -- Calculate base next date
    CASE p_frequency
        WHEN 'weekly' THEN v_next_date := p_current_date + INTERVAL '1 week';
        WHEN 'biweekly' THEN v_next_date := p_current_date + INTERVAL '2 weeks';
        WHEN 'monthly' THEN v_next_date := p_current_date + INTERVAL '1 month';
        WHEN 'quarterly' THEN v_next_date := p_current_date + INTERVAL '3 months';
        ELSE v_next_date := p_current_date + INTERVAL '1 month';
    END CASE;

    -- Adjust to preferred day of week if specified
    IF p_preferred_day IS NOT NULL THEN
        v_day_diff := p_preferred_day - EXTRACT(DOW FROM v_next_date)::INTEGER;
        IF v_day_diff < 0 THEN
            v_day_diff := v_day_diff + 7;
        END IF;
        v_next_date := v_next_date + v_day_diff;
    END IF;

    RETURN v_next_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_next_service_date(DATE, TEXT, INTEGER) IS
'Calculate the next service date based on frequency and optional preferred day';

-- Function to schedule next subscription instance
CREATE OR REPLACE FUNCTION public.schedule_subscription_instance(
    p_subscription_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_subscription RECORD;
    v_plan RECORD;
    v_instance_id UUID;
    v_next_date DATE;
BEGIN
    -- Get subscription details
    SELECT * INTO v_subscription
    FROM public.service_subscriptions
    WHERE id = p_subscription_id AND status = 'active';

    IF v_subscription.id IS NULL THEN
        RAISE EXCEPTION 'Subscription not found or not active';
    END IF;

    -- Get plan details
    SELECT * INTO v_plan
    FROM public.subscription_plans
    WHERE id = v_subscription.plan_id;

    -- Calculate next service date
    v_next_date := public.calculate_next_service_date(
        COALESCE(v_subscription.next_service_date, CURRENT_DATE),
        v_plan.service_frequency,
        v_subscription.preferred_day_of_week
    );

    -- Create instance
    INSERT INTO public.subscription_instances (
        subscription_id,
        tenant_id,
        scheduled_date,
        pickup_status,
        delivery_status
    )
    VALUES (
        p_subscription_id,
        v_subscription.tenant_id,
        v_next_date,
        CASE WHEN v_subscription.wants_pickup THEN 'pending' ELSE 'not_needed' END,
        CASE WHEN v_subscription.wants_delivery THEN 'pending' ELSE 'not_needed' END
    )
    RETURNING id INTO v_instance_id;

    -- Update subscription next service date
    UPDATE public.service_subscriptions
    SET next_service_date = v_next_date
    WHERE id = p_subscription_id;

    RETURN v_instance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.schedule_subscription_instance(UUID) IS
'Create the next scheduled instance for a subscription';

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View for upcoming pickups/deliveries
CREATE OR REPLACE VIEW public.v_upcoming_pickups AS
SELECT
    si.id AS instance_id,
    si.scheduled_date,
    si.pickup_status,
    si.delivery_status,
    ss.id AS subscription_id,
    ss.tenant_id,
    ss.customer_id,
    ss.pet_id,
    ss.pickup_address,
    ss.pickup_lat,
    ss.pickup_lng,
    ss.pickup_instructions,
    ss.delivery_address,
    ss.delivery_lat,
    ss.delivery_lng,
    ss.delivery_instructions,
    p.name AS pet_name,
    p.species AS pet_species,
    pr.full_name AS customer_name,
    pr.phone AS customer_phone,
    sp.name AS plan_name,
    s.name AS service_name
FROM public.subscription_instances si
JOIN public.service_subscriptions ss ON si.subscription_id = ss.id
JOIN public.pets p ON ss.pet_id = p.id
JOIN public.profiles pr ON ss.customer_id = pr.id
JOIN public.subscription_plans sp ON ss.plan_id = sp.id
JOIN public.services s ON sp.service_id = s.id
WHERE si.status IN ('scheduled', 'confirmed')
AND si.scheduled_date >= CURRENT_DATE
AND (si.pickup_status = 'pending' OR si.delivery_status = 'pending');

COMMENT ON VIEW public.v_upcoming_pickups IS 'Upcoming pickups and deliveries for route planning';

-- =============================================================================
-- ANALYZE TABLES
-- =============================================================================
ANALYZE public.drivers;
ANALYZE public.subscription_plans;
ANALYZE public.service_subscriptions;
ANALYZE public.subscription_instances;
ANALYZE public.delivery_routes;
ANALYZE public.route_stops;
