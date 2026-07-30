DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payment_authorizations
    GROUP BY provider, signature
    HAVING count(DISTINCT customer_id) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce Paystack authorization ownership: a provider signature is associated with multiple customers. Reconcile payment_authorizations before retrying.';
  END IF;
END $$;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY provider, signature
      ORDER BY
        is_default DESC,
        (status = 'active') DESC,
        verified_at DESC NULLS LAST,
        created_at DESC,
        id
    ) AS position
  FROM public.payment_authorizations
),
duplicates AS (
  SELECT id
  FROM ranked
  WHERE position > 1
)
UPDATE public.payment_authorizations AS pa
SET
  signature = 'inactive:' || pa.id::text || ':' || pa.signature,
  status = 'inactive',
  reusable = false,
  is_default = false,
  deactivated_at = COALESCE(pa.deactivated_at, now()),
  updated_at = now()
FROM duplicates
WHERE pa.id = duplicates.id;

DROP INDEX IF EXISTS public.payment_authorizations_customer_provider_signature_unique;

CREATE UNIQUE INDEX payment_authorizations_provider_signature_unique
ON public.payment_authorizations(provider, signature);
