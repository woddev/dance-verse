
ALTER TABLE deals.contracts ENABLE TRIGGER trg_contract_immutability;
ALTER TABLE deals.contracts ENABLE TRIGGER trg_prevent_contract_delete;
ALTER TABLE deals.offers ENABLE TRIGGER trg_offer_immutability;
