import { query } from "./db";

export async function generateContractNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await query(
    "SELECT COUNT(*) as count FROM contracts WHERE contract_number LIKE $1",
    [`MTS-CON-${year}-%`]
  );
  const count = (result.rows[0]?.count as number) ?? 0;
  const seq = String(count + 1).padStart(4, "0");
  return `MTS-CON-${year}-${seq}`;
}
