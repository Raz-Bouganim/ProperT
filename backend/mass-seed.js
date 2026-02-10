const { PrismaClient, UserRole, PropertyType } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("--- Massive Seeding ---");

    // 1. Create Owner
    const owner = await prisma.user.upsert({
        where: { email: "owner@propert.com" },
        update: {},
        create: {
            email: "owner@propert.com",
            password: "hashedpassword",
            firstName: "James",
            lastName: "Wilson",
            role: "OWNER",
        }
    });

    // 2. Clear existing listings if you want a fresh start, or just add
    // await prisma.listing.deleteMany(); 

    const properties = [
        {
            title: "Luxury Soho Penthouse",
            description: "Experience absolute luxury in this 3-bedroom penthouse with private terrace and panoramic views of Manhattan.",
            price: 12500,
            size: 2200,
            type: "APARTMENT",
            address: "15 Mercer St, New York, NY 10013",
            latitude: 40.7223,
            longitude: -74.0010,
            images: [
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
            ],
            features: ["Private Terrace", "Concierge", "Floor-to-ceiling windows"]
        },
        {
            title: "Modern Loft in Chelsea",
            description: "Fully renovated industrial loft features high ceilings, exposed brick, and gourmet kitchen.",
            price: 7800,
            size: 1500,
            type: "APARTMENT",
            address: "210 W 18th St, New York, NY 10011",
            latitude: 40.7410,
            longitude: -73.9980,
            images: [
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
            ],
            features: ["Exposed Brick", "Chef's Kitchen", "Elevator"]
        }
    ];

    for (const p of properties) {
        const listing = await prisma.listing.create({
            data: {
                ...p,
                ownerId: owner.id,
            }
        });

        console.log(`Created listing: ${listing.title} (${listing.id})`);

        // Soho Penthouse: Mon, Wed, Fri (Morning only)
        const scheduleSoho = [1, 3, 5].map(day => ({
            listingId: listing.id,
            dayOfWeek: day,
            startTime: "08:00",
            endTime: "12:00"
        }));

        // Modern Loft: Tue, Thu (Afternoon only)
        const schedule = p.title.includes("Soho")
            ? scheduleSoho
            : [2, 4].map(day => ({
                listingId: listing.id,
                dayOfWeek: day,
                startTime: "13:00",
                endTime: "19:00"
            }));

        await prisma.availability.createMany({ data: schedule });
    }

    console.log("Seeding complete!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
