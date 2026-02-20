
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS commission_tiers jsonb NOT NULL DEFAULT '[
  {"min_dancers": 1, "max_dancers": 24, "rate": 0.03},
  {"min_dancers": 25, "max_dancers": 74, "rate": 0.05},
  {"min_dancers": 75, "max_dancers": 149, "rate": 0.07},
  {"min_dancers": 150, "max_dancers": null, "rate": 0.10}
]'::jsonb;
