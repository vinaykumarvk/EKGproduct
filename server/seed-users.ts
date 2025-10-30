import { db } from "./db";
import { users } from "@shared/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

const SAMPLE_USERS = [
  {
    username: "admin",
    password: "Admin@2025",
    fullName: "Admin User",
    team: "admin",
    email: "admin@wealthforce.com",
  },
  {
    username: "presales",
    password: "Presales@2025",
    fullName: "John Smith",
    team: "presales",
    email: "john.smith@wealthforce.com",
  },
  {
    username: "ba_analyst",
    password: "BA@2025",
    fullName: "Sarah Johnson",
    team: "ba",
    email: "sarah.johnson@wealthforce.com",
  },
  {
    username: "manager",
    password: "Manager@2025",
    fullName: "Michael Chen",
    team: "management",
    email: "michael.chen@wealthforce.com",
  },
];

export async function seedUsers() {
  console.log("🌱 Seeding sample users...");
  
  for (const userData of SAMPLE_USERS) {
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, userData.username));
    
    if (existingUser) {
      console.log(`  ⏭️  User "${userData.username}" already exists, skipping...`);
      continue;
    }
    
    // Hash password and create user
    const hashedPassword = await hashPassword(userData.password);
    await db.insert(users).values({
      username: userData.username,
      password: hashedPassword,
      fullName: userData.fullName,
      team: userData.team,
      email: userData.email,
      isActive: true,
    });
    
    console.log(`  ✅ Created user: ${userData.username} (${userData.fullName}) - Team: ${userData.team}`);
  }
  
  console.log("✅ User seeding complete!\n");
  console.log("📋 Sample Accounts:");
  console.log("┌─────────────┬─────────────────┬─────────────┐");
  console.log("│ Username    │ Password        │ Team        │");
  console.log("├─────────────┼─────────────────┼─────────────┤");
  SAMPLE_USERS.forEach(user => {
    console.log(`│ ${user.username.padEnd(11)} │ ${user.password.padEnd(15)} │ ${user.team.padEnd(11)} │`);
  });
  console.log("└─────────────┴─────────────────┴─────────────┘\n");
}
