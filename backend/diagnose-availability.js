const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("--- Listing Diagnostic ---");
    const listings = await prisma.listing.findMany({
        include: {
            availabilities: true,
            _count: {
                select: { bookings: true }
            }
        }
    });

    if (listings.length === 0) {
        console.log("No listings found in the database.");
        return;
    }

    listings.forEach(l => {
        console.log(`Listing ID: ${l.id}`);
        console.log(`Title: ${l.title}`);
        console.log(`Availability Records: ${l.availabilities.length}`);
        l.availabilities.forEach(a => {
            console.log(`  - Day ${a.dayOfWeek}: ${a.startTime} - ${a.endTime}`);
        });
        console.log(`Bookings Count: ${l._count.bookings}`);
        console.log('--------------------------');
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
