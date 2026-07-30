ALTER TABLE public.payment_authorizations
ADD COLUMN country_code VARCHAR(2);

ALTER TABLE public.payment_authorizations
ADD CONSTRAINT payment_authorizations_country_code_format
CHECK (
  country_code IS NULL
  OR (char_length(country_code) = 2 AND country_code = upper(country_code))
);
