-- Enable the non-transactional manual cashier request options.
-- These methods only create pending cashier requests; they do not move wallet funds.

update public.cashier_methods
set enabled = true,
    instructions = case method_code
      when 'manual_bank' then 'Manual request only. Confirm the verified bank instructions shown by the cashier team before sending any funds. This form does not move wallet funds automatically.'
      when 'manual_mobile' then 'Manual request only. Confirm the verified mobile-wallet details shown by the cashier team before sending any funds. This form does not move wallet funds automatically.'
      else instructions
    end,
    updated_at = now()
where method_code in ('manual_bank','manual_mobile');
