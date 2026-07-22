import { query } from "./db";

export async function generateContractNumber(): Promise<string> {
  const year = new Date().getFullYear();
  // Find the max existing suffix to avoid collisions
  const result = await query(
    `SELECT MAX(CAST(RIGHT(contract_number, 4) AS INTEGER)) as max_seq
     FROM contracts
     WHERE contract_number LIKE 'MTS-CON-${year}-%'`
  );
  const maxSeq = (result.rows[0]?.max_seq as number) ?? 0;
  const seq = String(maxSeq + 1).padStart(4, "0");
  return `MTS-CON-${year}-${seq}`;
}
