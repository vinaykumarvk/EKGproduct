# Migration Package - Ready to Upload

This folder contains all the files you need to migrate the 5 key features to your AssetIntelligenceDashboard project.

## 📁 What's Inside

```
migration-package/
├── pages/              # 5 main page components
├── components/         # All UI components organized by category
├── lib/               # Utility functions and helpers
├── hooks/             # React hooks (toast, etc.)
├── contexts/          # React contexts (Theme)
├── backend/           # Server-side code
├── schema/            # Database schema
├── styles/            # CSS and Tailwind config
└── README.md          # This file
```

## 🚀 Quick Upload Instructions

### Step 1: Copy to Your New Project

**Option A: Download and Upload**
1. Download this entire `migration-package` folder
2. Upload it to your AssetIntelligenceDashboard project
3. Follow the integration steps below

**Option B: Direct Copy** (if both projects are in Replit)
1. Open both projects side by side
2. Copy files from this package to corresponding locations in your new project

### Step 2: File Placement Guide

Here's where each folder's contents should go in your new project:

| Source Folder | Destination in New Project | Description |
|--------------|----------------------------|-------------|
| `pages/*` | `client/src/pages/` | 5 main pages |
| `components/*` | `client/src/components/` | All components (keep folder structure) |
| `lib/*` | `client/src/lib/` | Query client, utilities |
| `hooks/*` | `client/src/hooks/` | React hooks |
| `contexts/*` | `client/src/contexts/` | Theme context |
| `backend/storage.ts` | `server/storage.ts` | Database interface |
| `backend/routes.ts` | `server/routes.ts` | API routes |
| `backend/middleware/` | `server/middleware/` | Auth middleware |
| `backend/services/` | `server/services/` | OpenAI & other services |
| `schema/schema.ts` | `shared/schema.ts` | Database schema |
| `styles/index.css` | `client/src/index.css` | Global styles |
| `styles/tailwind.config.ts` | `tailwind.config.ts` | Tailwind config |

## ⚙️ Integration Steps

### 1. Database Setup

```bash
# After copying schema.ts
npm run db:push
```

This creates all necessary tables.

### 2. Update App.tsx

Add these routes to `client/src/App.tsx`:

```typescript
import { Dashboard } from './pages/Dashboard';
import { NewInvestment } from './pages/NewInvestment';
import { MyInvestments } from './pages/MyInvestments';
import { MyTasks } from './pages/MyTasks';
import { Templates } from './pages/Templates';

// Inside your Route definitions:
<Route path="/" component={Dashboard} />
<Route path="/new-investment" component={NewInvestment} />
<Route path="/investments" component={MyInvestments} />
<Route path="/my-tasks" component={MyTasks} />
<Route path="/templates" component={Templates} />
```

### 3. Wrap App with Providers

Make sure your app is wrapped with required providers:

```typescript
// In your main.tsx or App.tsx
import { ThemeProvider } from './contexts/ThemeContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from './components/ui/toaster';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <YourRoutes />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

### 4. Authentication Setup

**IMPORTANT**: These pages need to know who the current user is.

**Option A: Simple Single-User (Recommended)**

Edit `lib/auth.ts`:
```typescript
export function useUser() {
  return {
    data: {
      id: 1,
      username: 'analyst',
      email: 'analyst@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'analyst',
    },
    isLoading: false,
  };
}
```

Edit `backend/middleware/auth.ts`:
```typescript
export function authMiddleware(req, res, next) {
  req.user = {
    id: 1,
    username: 'analyst',
    email: 'analyst@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'analyst',
  };
  next();
}
```

Apply middleware in your routes:
```typescript
import { authMiddleware } from './middleware/auth';
app.use('/api', authMiddleware);
```

### 5. Seed Initial Data

Create a seed script or manually add:

**Document Categories:**
```sql
INSERT INTO document_categories (name, description, icon, is_system) VALUES
  ('Financial Statements', 'Balance sheets, income statements', '💰', true),
  ('Legal Documents', 'Contracts, agreements', '⚖️', true),
  ('Market Research', 'Industry analysis, reports', '📊', true),
  ('Other', 'Miscellaneous documents', '📄', true);
```

**User (if needed):**
```sql
INSERT INTO users (username, email, first_name, last_name, role) VALUES
  ('analyst', 'analyst@example.com', 'John', 'Doe', 'analyst');
```

## 📦 Required NPM Packages

Make sure these are installed:

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.x",
    "@radix-ui/react-*": "latest",
    "wouter": "^3.x",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "zod": "^3.x",
    "drizzle-zod": "^0.5.x",
    "date-fns": "^3.x",
    "lucide-react": "^0.x",
    "recharts": "^2.x",
    "jspdf": "^2.x",
    "openai": "^4.x",
    "multer": "^1.x",
    "@types/multer": "^1.x"
  }
}
```

## 🔧 Key Modifications Needed

### 1. Remove Admin Features

In `components/layout/AppLayout.tsx`:
- Remove "Cash Requests" nav item (line ~92)
- Remove entire Admin section (lines ~191-215)

### 2. Simplify Schema (Optional)

In `schema/schema.ts`, you can remove:
- `cashRequests` table
- `approvalWorkflows` table
- `auditLogs` table

### 3. Configure File Uploads

Create `uploads/` folder in your project root:
```bash
mkdir uploads
```

## ✅ Testing Checklist

After uploading and integrating:

- [ ] Dashboard loads and shows stats
- [ ] Can create new investment
- [ ] Can upload documents
- [ ] My Investments list displays
- [ ] Can view investment details
- [ ] My Tasks shows tasks
- [ ] Can approve/reject tasks
- [ ] Templates page works
- [ ] Can create/edit templates
- [ ] Theme toggle works (light/dark)
- [ ] No console errors

## 🐛 Common Issues

### "User is undefined"
- Check `lib/auth.ts` - ensure useUser returns valid user
- Verify authMiddleware is applied to routes

### "Module not found"
- Check imports use correct paths (`@/components/...`)
- Verify all files were copied to correct locations

### "Database error"
- Run `npm run db:push` to create tables
- Check DATABASE_URL is set

### "Charts don't render"
- Verify recharts is installed
- Check data format matches expected structure

## 🎯 What You Get

✅ **Dashboard** - Stats, charts, recent proposals  
✅ **New Investment** - Form with document upload  
✅ **My Investments** - List with filters and details  
✅ **My Tasks** - Task management with approvals  
✅ **Templates** - Rationale template management  
✅ **Dark Mode** - Full theme support  
✅ **AI Features** - Document analysis, search (if API key set)  

## 💡 Pro Tips

1. **Start with Backend First** - Get API routes working before testing frontend
2. **Test Each Page Individually** - Don't try to fix everything at once
3. **Check Browser Console** - Most errors will show here
4. **Use Network Tab** - See which API calls are failing
5. **Read MIGRATION_GUIDE.md** - More detailed info in the main guide

## 📞 Need Help?

1. Check browser console for errors
2. Check backend logs
3. Verify all files copied correctly
4. Review MIGRATION_GUIDE.md for detailed explanations
5. Test API endpoints with curl before testing frontend

---

**Ready to migrate!** Start with Step 1 above and work through systematically. Good luck! 🚀
