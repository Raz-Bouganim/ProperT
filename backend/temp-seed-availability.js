const { PrismaClient, UserRole, PropertyType } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    let user = await prisma.user.findFirst();
    if (!user) {
        console.log("No user found. Creating dummy owner...");
        user = await prisma.user.create({
            data: {
                email: "owner@example.com",
                password: "hashedpassword", // Not important for demo
                firstName: "John",
                lastName: "Smith",
                role: "OWNER",
            }
        });
    }

    let listing = await prisma.listing.findFirst();
    if (!listing) {
        console.log("No listings found. Creating dummy listing...");
        listing = await prisma.listing.create({
            data: {
                title: "Modern Loft in Soho",
                description: "Stunning loft with high ceilings and industrial feel.",
                price: 3200,
                size: 110,
                type: "APARTMENT",
                address: "Soho, New York",
                latitude: 40.7233,
                longitude: -74.0030,
                ownerId: user.id,
                images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"]
            }
        });
    }

    const listingId = listing.id;
    console.log(`Seeding availability for listing: ${listingId}`);

    // Mon-Fri 09:00 to 17:00
    const schedule = [1, 2, 3, 4, 5].map(day => ({
        listingId,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "17:00"
    }));

    await prisma.availability.deleteMany({ where: { listingId } });
    await prisma.availability.createMany({ data: schedule });

    console.log("Availability seeded successfully!");
    console.log(`Test this listing at: http://localhost:3000/listings/${listingId}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
