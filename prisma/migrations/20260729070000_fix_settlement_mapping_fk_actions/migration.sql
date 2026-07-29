-- DropForeignKey
ALTER TABLE "settlement_transaction_mappings" DROP CONSTRAINT "settlement_transaction_mappings_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "settlement_transaction_mappings" DROP CONSTRAINT "settlement_transaction_mappings_transfer_id_fkey";

-- AddForeignKey
ALTER TABLE "settlement_transaction_mappings" ADD CONSTRAINT "settlement_transaction_mappings_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "settlement_transaction_mappings" ADD CONSTRAINT "settlement_transaction_mappings_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "payout_transfers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
