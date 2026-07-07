import { db } from '/home/runner/workspace/server/db.ts';
import { tenders, offers } from '/home/runner/workspace/shared/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  const companyId = '53c67e77-7690-429f-9586-abf9b4309bc0';
  const myTenders = await db.select({ id: tenders.id, title: tenders.title, status: tenders.status }).from(tenders).where(eq(tenders.companyId, companyId));
  for (const t of myTenders) {
    const os = await db.select({ id: offers.id, status: offers.status }).from(offers).where(eq(offers.tenderId, t.id));
    console.log(`${t.title} | status=${t.status} | offers=${os.length} (${os.map(o => o.status).join(',')})`);
  }
  process.exit(0);
}
main();
